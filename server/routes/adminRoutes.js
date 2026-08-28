import express from 'express';
import bcrypt from 'bcryptjs';
import pool from '../config/db.js';
import { authenticateToken, requireSchoolAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// ------------------------------------------------------------
// POST /api/admin/create-user — Create & Assign New User Account
// Protected by School Admin Auth. Automatically scopes user to school_id
// ------------------------------------------------------------
router.post('/create-user', authenticateToken, requireSchoolAdmin, async (req, res) => {
  const { name, email, password, role, school_id } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Name, email, password, and role are required.'
    });
  }

  const validRoles = ['admin', 'teacher', 'student', 'parent'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
    });
  }

  // Automatically attach requesting admin's school_id (or fallback if provided by super_admin)
  const userRole = String(req.user.role || '').toLowerCase();
  const isSuper = userRole === 'super_admin' || userRole === 'superadmin';
  const targetSchoolId = isSuper ? (school_id || req.user.school_id || null) : req.user.school_id;

  const cleanEmail = String(email).trim().toLowerCase();

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE email = ?', [cleanEmail]);
    if (existing && existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Conflict Error',
        message: 'A user with this email address already exists.'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      `INSERT INTO users (school_id, name, email, password, role, is_active) VALUES (?, ?, ?, ?, ?, TRUE)`,
      [targetSchoolId, name.trim(), cleanEmail, hashedPassword, role]
    );

    return res.status(201).json({
      success: true,
      message: 'User account created successfully.',
      user: {
        id: result.insertId,
        school_id: targetSchoolId,
        name: name.trim(),
        email: cleanEmail,
        role,
        is_active: true
      }
    });
  } catch (error) {
    console.error('[CREATE USER ERROR]:', error);
    if (error.code === 'PROTOCOL_CONNECTION_LOST' || error.code === 'ETIMEDOUT') {
      return res.status(504).json({ success: false, error: 'Database Timeout', message: 'Database query timed out.' });
    }
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

// ------------------------------------------------------------
// GET /api/admin/users — List Users Scoped to School ID
// ------------------------------------------------------------
router.get('/users', authenticateToken, requireSchoolAdmin, async (req, res) => {
  try {
    const schoolId = req.user.school_id;
    const userRole = String(req.user.role || '').toLowerCase();
    const isSuper = userRole === 'super_admin' || userRole === 'superadmin';

    let query = 'SELECT id, school_id, name, email, role, is_active, created_at FROM users';
    let params = [];

    if (!isSuper && schoolId) {
      query += ' WHERE school_id = ?';
      params.push(schoolId);
    }

    query += ' ORDER BY id DESC';

    const [users] = await pool.query(query, params);
    return res.json({ success: true, users });
  } catch (error) {
    console.error('[GET USERS ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

export default router;
