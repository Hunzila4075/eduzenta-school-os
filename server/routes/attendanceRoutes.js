import express from 'express';
import pool from '../config/db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/attendance — Fetch attendance records scoped to authenticated user's school
router.get('/', authenticateToken, async (req, res) => {
  const { classSection, date } = req.query;
  const userRole = String(req.user.role || '').toLowerCase();
  const isSuper = userRole === 'super_admin' || userRole === 'superadmin';
  const schoolId = req.user.school_id;

  try {
    let sql = 'SELECT * FROM attendance WHERE 1=1';
    const params = [];

    // Scope to school unless super admin
    if (!isSuper && schoolId) {
      sql += ' AND school_id = ?';
      params.push(schoolId);
    }

    if (classSection) {
      sql += ' AND class_section = ?';
      params.push(classSection);
    }
    if (date) {
      sql += ' AND date = ?';
      params.push(date);
    }

    sql += ' ORDER BY date DESC, student_id ASC';

    const [rows] = await pool.query(sql, params);
    const formatted = rows.map(r => ({
      id: r.id,
      studentId: r.student_id,
      classSection: r.class_section,
      date: r.date,
      status: r.status,
      markedBy: r.marked_by,
      createdAt: r.created_at
    }));

    return res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    console.error('[ATTENDANCE API ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

// POST /api/attendance — Bulk upsert class attendance in a SINGLE query (replaces N-query loop)
router.post('/', authenticateToken, async (req, res) => {
  const { classSection, date, records, markedBy } = req.body;
  if (!classSection || !date || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ success: false, error: 'ClassSection, date, and non-empty records array are required.' });
  }

  const userRole = String(req.user.role || '').toLowerCase();
  const isSuper = userRole === 'super_admin' || userRole === 'superadmin';
  const schoolId = isSuper ? (req.body.school_id || req.user.school_id) : (req.user.school_id || null);
  const marker = markedBy || req.user.name || 'Teacher';

  try {
    // Build a SINGLE bulk INSERT...ON DUPLICATE KEY UPDATE — O(1) DB round-trips regardless of class size
    // Each row: (student_id, school_id, class_section, date, status, marked_by)
    const rowValues = records.map(rec => [
      rec.studentId,
      schoolId,
      classSection,
      date,
      rec.status || 'Present',
      marker
    ]);

    const placeholders = rowValues.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
    const flatValues = rowValues.flat();

    const sql = `
      INSERT INTO attendance (student_id, school_id, class_section, date, status, marked_by)
      VALUES ${placeholders}
      ON DUPLICATE KEY UPDATE
        status = VALUES(status),
        marked_by = VALUES(marked_by),
        school_id = VALUES(school_id),
        updated_at = CURRENT_TIMESTAMP
    `;

    await pool.query(sql, flatValues);

    return res.status(200).json({
      success: true,
      message: `Attendance for ${classSection} on ${date} saved (${records.length} records in 1 query).`,
      count: records.length
    });
  } catch (error) {
    console.error('[ATTENDANCE API POST ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

export default router;


