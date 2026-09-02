import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import pool, { query } from '../config/db.js';
import JWT_SECRET from '../config/jwtConfig.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Parse the users.social_links JSON TEXT column into an object (null-safe)
const parseSocial = (raw) => {
  if (!raw) return null;
  try { return JSON.parse(raw); } catch (_) { return null; }
};

// ------------------------------------------------------------
// POST /api/auth/login — Authenticate User / Super Admin
// ------------------------------------------------------------
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Email and password are required.'
    });
  }

  const cleanEmail = String(email).trim().toLowerCase();

  try {
    const [rows] = await query(
      `SELECT u.id, u.school_id, u.name, u.email, u.password, u.role, u.is_active,
              u.phone, DATE_FORMAT(u.dob, '%Y-%m-%d') AS dob, u.designation, u.social_links,
              s.name as school_name, s.logo_url as school_logo_url, s.status as school_status
       FROM users u
       LEFT JOIN schools s ON s.id = u.school_id
       WHERE u.email = ?`,
      [cleanEmail]
    );

    const user = rows[0];

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Error',
        message: 'Invalid email or password.'
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Account Locked',
        message: 'This account has been deactivated.'
      });
    }

    // Enforce strict bcrypt password validation
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Authentication Error',
        message: 'Invalid email or password.'
      });
    }

    // School Account Lock Check (only affects non-superadmin users)
    const userRoleStr = String(user.role || '').toLowerCase();
    if (userRoleStr !== 'super_admin' && userRoleStr !== 'superadmin' && user.school_id) {
      if (user.school_status && String(user.school_status).toLowerCase().includes('lock')) {
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_LOCKED',
          error: 'Account Locked',
          message: 'Account locked due to pending payment'
        });
      }
    }

    const token = jwt.sign(
      {
        id: user.id,
        school_id: user.school_id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // CORE RULE 1 — teachers always receive their live DB assignments on login
    let assignedClasses = [];
    let assignedSubjects = [];
    if (userRoleStr === 'teacher') {
      try {
        const [tcaRows] = await pool.query(
          'SELECT class_section FROM teacher_class_assignments WHERE teacher_user_id = ? ORDER BY class_section ASC',
          [user.id]
        );
        assignedClasses = tcaRows.map(r => r.class_section);
        const [subjRows] = await pool.query('SELECT assigned_subjects FROM users WHERE id = ?', [user.id]);
        const rawSubjects = subjRows[0]?.assigned_subjects;
        assignedSubjects = rawSubjects ? String(rawSubjects).split(',').map(s => s.trim()).filter(Boolean) : [];
      } catch (_) { /* assignments lookup is best-effort; empty = unassigned */ }
    }

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        school_id: user.school_id,
        schoolId: user.school_id,
        school_name: user.school_name,
        schoolName: user.school_name,
        school_logo_url: user.school_logo_url,
        schoolLogoUrl: user.school_logo_url,
        name: user.name,
        email: user.email,
        role: user.role,
        // Avatar intentionally excluded from login response to reduce payload
        // (~2-2.5 MB per user). The frontend lazy-loads it via GET /auth/me.
        phone: user.phone || null,
        dob: user.dob || null,
        designation: user.designation || null,
        socialLinks: parseSocial(user.social_links),
        assignedClasses,
        assignedSubjects
      }
    });
  } catch (error) {
    console.error('[AUTH LOGIN ERROR]:', error);
    if (error.code === 'PROTOCOL_CONNECTION_LOST' || error.code === 'ETIMEDOUT') {
      return res.status(504).json({
        success: false,
        error: 'Database Timeout',
        message: 'Database query timed out. Please try again.'
      });
    }
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// ------------------------------------------------------------
// GET /api/auth/me — Re-hydrate Live Authenticated User Profile from Database
// ------------------------------------------------------------
router.get('/me', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.school_id, u.name, u.email, u.role, u.avatar_url, u.is_active, u.created_at, u.updated_at, u.assigned_subjects,
              u.phone, DATE_FORMAT(u.dob, '%Y-%m-%d') AS dob, u.designation, u.social_links,
              s.name as school_name, s.logo_url as school_logo_url, s.status as school_status
       FROM users u
       LEFT JOIN schools s ON s.id = u.school_id
       WHERE u.id = ?`,
      [userId]
    );
    const user = rows[0];
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User account not found.'
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: 'Account Locked',
        message: 'This account has been deactivated.'
      });
    }

    const userRoleStr = String(user.role || '').toLowerCase();
    if (userRoleStr !== 'super_admin' && userRoleStr !== 'superadmin' && user.school_id) {
      if (user.school_status && String(user.school_status).toLowerCase().includes('lock')) {
        return res.status(403).json({
          success: false,
          code: 'ACCOUNT_LOCKED',
          error: 'Account Locked',
          message: 'Account locked due to pending payment'
        });
      }
    }

    // CORE RULE 1 — live teacher assignments on every session re-hydration
    let assignedClasses = [];
    let assignedSubjects = [];
    if (userRoleStr === 'teacher') {
      try {
        const [tcaRows] = await pool.query(
          'SELECT class_section FROM teacher_class_assignments WHERE teacher_user_id = ? ORDER BY class_section ASC',
          [user.id]
        );
        assignedClasses = tcaRows.map(r => r.class_section);
        const rawSubjects = user.assigned_subjects;
        assignedSubjects = rawSubjects ? String(rawSubjects).split(',').map(s => s.trim()).filter(Boolean) : [];
      } catch (_) { /* best-effort; empty = unassigned */ }
    }

    return res.json({
      success: true,
      user: {
        ...user,
        schoolId: user.school_id,
        schoolName: user.school_name,
        schoolLogoUrl: user.school_logo_url,
        avatar: user.avatar_url,
        phone: user.phone || null,
        dob: user.dob || null,
        designation: user.designation || null,
        socialLinks: parseSocial(user.social_links),
        assignedClasses,
        assignedSubjects
      }
    });
  } catch (error) {
    console.error('[GET AUTH ME ERROR]:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// ------------------------------------------------------------
// PUT /api/auth/profile — Persistent Profile Update (Name & Profile Picture)
// ------------------------------------------------------------
router.put('/profile', authenticateToken, async (req, res) => {
  const { name, avatar, avatar_url, phone, dob, designation, socialLinks } = req.body;
  const userId = req.user.id;

  if (!name || !name.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Name is required.'
    });
  }

  const targetAvatar = avatar || avatar_url || null;

  // Single dynamic UPDATE: name always; avatar + optional profile details only
  // when provided (keeps existing callers 100% backward compatible).
  const profileFields = ['name = ?'];
  const profileValues = [name.trim()];
  if (targetAvatar) { profileFields.push('avatar_url = ?'); profileValues.push(targetAvatar); }
  if (phone !== undefined) { profileFields.push('phone = ?'); profileValues.push(phone ? String(phone).trim() : null); }
  if (dob !== undefined) { profileFields.push('dob = ?'); profileValues.push(dob ? String(dob).trim() : null); }
  if (designation !== undefined) { profileFields.push('designation = ?'); profileValues.push(designation ? String(designation).trim() : null); }
  if (socialLinks !== undefined) { profileFields.push('social_links = ?'); profileValues.push(socialLinks ? JSON.stringify(socialLinks) : null); }
  profileFields.push('updated_at = CURRENT_TIMESTAMP');

  try {
    await pool.query(
      `UPDATE users SET ${profileFields.join(', ')} WHERE id = ?`,
      [...profileValues, userId]
    );

    const [rows] = await pool.query(
      'SELECT id, school_id, name, email, role, avatar_url, phone, DATE_FORMAT(dob, \'%Y-%m-%d\') AS dob, designation, social_links, is_active FROM users WHERE id = ?',
      [userId]
    );
    const updatedUser = rows[0];

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: {
        ...updatedUser,
        avatar: updatedUser.avatar_url,
        socialLinks: parseSocial(updatedUser.social_links)
      }
    });
  } catch (error) {
    console.error('[PROFILE UPDATE ERROR]:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

// ------------------------------------------------------------
// PUT /api/auth/change-password — Persistent Password Update
// ------------------------------------------------------------
router.put('/change-password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const userId = req.user.id;

  if (!newPassword || newPassword.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'New password must be at least 6 characters.'
    });
  }

  try {
    const [rows] = await pool.query('SELECT password FROM users WHERE id = ?', [userId]);
    const user = rows[0];

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User not found.'
      });
    }

    if (currentPassword) {
      const isValid = await bcrypt.compare(currentPassword, user.password);
      if (!isValid) {
        return res.status(401).json({
          success: false,
          error: 'Authentication Error',
          message: 'Current password is incorrect.'
        });
      }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [hashedPassword, userId]);

    return res.json({
      success: true,
      message: 'Password updated successfully.'
    });
  } catch (error) {
    console.error('[CHANGE PASSWORD ERROR]:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  }
});

export default router;
