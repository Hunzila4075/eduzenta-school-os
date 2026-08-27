import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'eduzenta-super-secret-key-2026';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Access token missing or invalid.' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'TokenExpired', message: 'Session expired. Please log in again.' });
    }
    return res.status(403).json({ error: 'Forbidden', message: 'Invalid token.' });
  }
}

export function requireSuperAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
  }

  if (req.user.role === 'super_admin' || req.user.email === 'developerwithkhan804@gmail.com') {
    return next();
  }

  return res.status(403).json({ error: 'Forbidden', message: 'Super Admin privileges required.' });
}

export function requireSchoolAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Authentication required.' });
  }

  if (req.user.role === 'admin' || req.user.role === 'super_admin' || req.user.email === 'developerwithkhan804@gmail.com') {
    return next();
  }

  return res.status(403).json({ error: 'Forbidden', message: 'School Admin privileges required.' });
}
