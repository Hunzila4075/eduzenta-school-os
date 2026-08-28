import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import pool from '../config/db.js';
import JWT_SECRET from '../config/jwtConfig.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

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
    const [rows] = await pool.query(
      'SELECT id, school_id, name, email, password, role, is_active FROM users WHERE email = ?',
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

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        school_id: user.school_id,
        name: user.name,
        email: user.email,
        role: user.role
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
      'SELECT id, school_id, name, email, role, is_active, created_at, updated_at FROM users WHERE id = ?',
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

    return res.json({
      success: true,
      user
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
// PUT /api/auth/profile — Persistent Profile Update
// ------------------------------------------------------------
router.put('/profile', authenticateToken, async (req, res) => {
  const { name } = req.body;
  const userId = req.user.id;

  if (!name || !name.trim()) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Name is required.'
    });
  }

  try {
    await pool.query('UPDATE users SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [name.trim(), userId]);
    const [rows] = await pool.query('SELECT id, school_id, name, email, role, is_active FROM users WHERE id = ?', [userId]);
    const updatedUser = rows[0];

    return res.json({
      success: true,
      message: 'Profile updated successfully.',
      user: updatedUser
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
