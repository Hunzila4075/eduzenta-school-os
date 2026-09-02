import express from 'express';
import pool from '../config/db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { getTeacherAssignedClasses } from '../middleware/teacherAccess.js';

const router = express.Router();

// GET /api/teacher/classes — A teacher's OWN assigned classes only.
// Single source of truth: teacher_class_assignments (read live from DB).
router.get('/classes', authenticateToken, async (req, res) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (role !== 'teacher') {
    return res.status(403).json({ success: false, error: 'Forbidden', message: 'Teacher access required.' });
  }

  try {
    const assignedClasses = await getTeacherAssignedClasses(req.user.id);
    return res.json({
      success: true,
      assignedClasses,
      count: assignedClasses.length
    });
  } catch (error) {
    console.error('[GET TEACHER CLASSES ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

export default router;