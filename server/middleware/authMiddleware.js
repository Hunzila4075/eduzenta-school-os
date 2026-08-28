import jwt from 'jsonwebtoken';
import JWT_SECRET from '../config/jwtConfig.js';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  
  if (!authHeader) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Access token missing.'
    });
  }

  const parts = authHeader.trim().split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid authorization header format. Expected Bearer <token>.'
    });
  }

  const token = parts[1].trim();
  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Token string is empty.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Session expired. Please log in again.'
      });
    }
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Invalid access token.'
    });
  }
}

export function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required.'
    });
  }

  const role = String(req.user.role || '').toLowerCase();
  if (role === 'super_admin' || role === 'superadmin') {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Forbidden',
    message: 'Super Admin privileges required.'
  });
}

export function requireSchoolAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required.'
    });
  }

  const role = String(req.user.role || '').toLowerCase();
  if (role === 'admin' || role === 'super_admin' || role === 'superadmin') {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'Forbidden',
    message: 'School Admin privileges required.'
  });
}
