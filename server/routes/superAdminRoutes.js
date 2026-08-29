import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { authenticateToken, requireSuperAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// ------------------------------------------------------------
// POST /api/superadmin/create-school-admin
// Creates new School and assigns School Admin credentials
// Protected strictly by Super Admin Auth
// ------------------------------------------------------------
router.post('/create-school-admin', authenticateToken, requireSuperAdmin, async (req, res) => {
  const { school_name, school_logo_url, schoolLogoUrl, logo_url, logoUrl, admin_name, admin_email, admin_password } = req.body;

  if (!school_name || !admin_email || !admin_password) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'school_name, admin_email, and admin_password are required.'
    });
  }

  const cleanEmail = String(admin_email).trim().toLowerCase();
  const cleanSchoolName = String(school_name).trim();
  const cleanSchoolLogo = (school_logo_url || schoolLogoUrl || logo_url || logoUrl) ? String(school_logo_url || schoolLogoUrl || logo_url || logoUrl) : null;
  const displayName = admin_name ? String(admin_name).trim() : `${cleanSchoolName} Admin`;

  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Check if email already exists
    const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing && existing.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        success: false,
        error: 'Conflict Error',
        message: 'A user account with this email address already exists.'
      });
    }

    // 1. Create School
    const [schoolRes] = await connection.query(
      `INSERT INTO schools (name, logo_url, status) VALUES (?, ?, 'Active')`,
      [cleanSchoolName, cleanSchoolLogo]
    );

    const schoolId = schoolRes.insertId;

    // 2. Create School Admin User
    const hashedPassword = await bcrypt.hash(admin_password, 10);
    const [userRes] = await connection.query(
      `INSERT INTO users (school_id, name, email, password, role, is_active) VALUES (?, ?, ?, ?, 'admin', TRUE)`,
      [schoolId, displayName, cleanEmail, hashedPassword]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: 'School and School Admin created successfully.',
      school: {
        id: schoolId,
        name: cleanSchoolName,
        logo_url: cleanSchoolLogo,
        logoUrl: cleanSchoolLogo,
        status: 'Active'
      },
      admin: {
        id: userRes.insertId,
        school_id: schoolId,
        schoolId: schoolId,
        name: displayName,
        email: cleanEmail,
        role: 'admin'
      }
    });

  } catch (error) {
    await connection.rollback();
    console.error('[CREATE SCHOOL ADMIN ERROR]:', error);
    if (error.code === 'PROTOCOL_CONNECTION_LOST' || error.code === 'ETIMEDOUT') {
      return res.status(504).json({ success: false, error: 'Database Timeout', message: 'Database query timed out.' });
    }
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  } finally {
    connection.release();
  }
});

// ------------------------------------------------------------
// GET /api/superadmin/schools — List All Registered Schools
// ------------------------------------------------------------
router.get('/schools', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const [schools] = await pool.query(
      `SELECT s.id, s.name, s.logo_url, s.logo_url as logoUrl, s.status, s.created_at, u.email as admin_email, u.name as admin_name 
       FROM schools s 
       LEFT JOIN users u ON u.school_id = s.id AND (u.role = 'admin' OR u.role = 'school_admin')
       ORDER BY s.id DESC`
    );
    return res.json({ success: true, schools });
  } catch (error) {
    console.error('[GET SCHOOLS ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

// ------------------------------------------------------------
// PUT /api/superadmin/schools/:id — Update School Branding & Info
// ------------------------------------------------------------
router.put('/schools/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  const schoolId = parseInt(req.params.id);
  const { name, school_name, schoolName, logo_url, logoUrl, schoolLogoUrl, status } = req.body;

  if (isNaN(schoolId)) {
    return res.status(400).json({ success: false, error: 'Validation Error', message: 'Invalid school ID.' });
  }

  const targetName = (name || school_name || schoolName) ? String(name || school_name || schoolName).trim() : null;
  const targetLogo = (logo_url || logoUrl || schoolLogoUrl) ? String(logo_url || logoUrl || schoolLogoUrl) : null;

  try {
    const [existing] = await pool.query('SELECT id FROM schools WHERE id = ?', [schoolId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Not Found', message: 'School record not found.' });
    }

    if (targetName && targetLogo) {
      await pool.query('UPDATE schools SET name = ?, logo_url = ? WHERE id = ?', [targetName, targetLogo, schoolId]);
    } else if (targetName) {
      await pool.query('UPDATE schools SET name = ? WHERE id = ?', [targetName, schoolId]);
    } else if (targetLogo) {
      await pool.query('UPDATE schools SET logo_url = ? WHERE id = ?', [targetLogo, schoolId]);
    }

    if (status) {
      await pool.query('UPDATE schools SET status = ? WHERE id = ?', [status, schoolId]);
    }

    const [updatedRows] = await pool.query('SELECT id, name, logo_url, status, created_at FROM schools WHERE id = ?', [schoolId]);
    const updatedSchool = updatedRows[0];

    return res.json({
      success: true,
      message: 'School branding updated successfully in database.',
      school: {
        ...updatedSchool,
        logoUrl: updatedSchool.logo_url
      }
    });
  } catch (error) {
    console.error('[UPDATE SCHOOL ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

// ------------------------------------------------------------
// PUT /api/superadmin/schools/:id/status — Toggle/Update School Status (Lock/Unlock)
// ------------------------------------------------------------
router.put('/schools/:id/status', authenticateToken, requireSuperAdmin, async (req, res) => {
  const schoolId = parseInt(req.params.id);
  const { status } = req.body;

  if (isNaN(schoolId)) {
    return res.status(400).json({ success: false, error: 'Validation Error', message: 'Invalid school ID.' });
  }

  if (!status) {
    return res.status(400).json({ success: false, error: 'Validation Error', message: 'Status is required.' });
  }

  try {
    const [existing] = await pool.query('SELECT id, name, status FROM schools WHERE id = ?', [schoolId]);
    if (!existing || existing.length === 0) {
      return res.status(404).json({ success: false, error: 'Not Found', message: 'School record not found.' });
    }

    await pool.query('UPDATE schools SET status = ? WHERE id = ?', [status, schoolId]);

    const [updatedRows] = await pool.query('SELECT id, name, logo_url, status, created_at FROM schools WHERE id = ?', [schoolId]);
    const updatedSchool = updatedRows[0];

    return res.json({
      success: true,
      message: `School status updated to ${status} in MySQL database.`,
      school: {
        ...updatedSchool,
        logoUrl: updatedSchool.logo_url
      }
    });
  } catch (error) {
    console.error('[UPDATE SCHOOL STATUS ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

export default router;
