import express from 'express';
import bcrypt from 'bcrypt';
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

    // 1. Create School
    // (duplicate admin emails are caught by the users.email UNIQUE index → rollback + 409)
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
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: 'Conflict Error',
        message: 'A user account with this email address already exists.'
      });
    }
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
    const [existingRows] = await pool.query(
      'SELECT id, name, logo_url, status, created_at FROM schools WHERE id = ?',
      [schoolId]
    );
    const existing = existingRows[0];
    if (!existing) {
      return res.status(404).json({ success: false, error: 'Not Found', message: 'School record not found.' });
    }

    // ONE merged dynamic UPDATE replaces up to 2 UPDATE statements + the re-SELECT
    const fields = [];
    const values = [];
    if (targetName) { fields.push('name = ?'); values.push(targetName); }
    if (targetLogo) { fields.push('logo_url = ?'); values.push(targetLogo); }
    if (status) { fields.push('status = ?'); values.push(status); }

    if (fields.length > 0) {
      values.push(schoolId);
      await pool.query(`UPDATE schools SET ${fields.join(', ')} WHERE id = ?`, values);
    }

    // Construct the updated school record locally (created_at never changes)
    const updatedSchool = {
      id: existing.id,
      name: targetName || existing.name,
      logo_url: targetLogo || existing.logo_url,
      status: status || existing.status,
      created_at: existing.created_at
    };

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
    // UPDATE-first: affectedRows doubles as the existence check (saves one round-trip)
    const [updateResult] = await pool.query('UPDATE schools SET status = ? WHERE id = ?', [status, schoolId]);
    if (!updateResult.affectedRows) {
      return res.status(404).json({ success: false, error: 'Not Found', message: 'School record not found.' });
    }

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
