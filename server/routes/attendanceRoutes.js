import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

// GET /api/attendance — Fetch attendance records by classSection and/or date from MySQL
router.get('/', async (req, res) => {
  const { classSection, date } = req.query;
  try {
    let sql = 'SELECT * FROM attendance WHERE 1=1';
    let params = [];

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

// POST /api/attendance — Record or bulk update class attendance for a specific date in MySQL
router.post('/', async (req, res) => {
  const { classSection, date, records, markedBy } = req.body;
  // records: [{ studentId, status: 'Present' | 'Absent' | 'Late' | 'Excused' }]
  if (!classSection || !date || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ success: false, error: 'ClassSection, date, and non-empty records array are required.' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    for (const rec of records) {
      const sql = `
        INSERT INTO attendance (student_id, class_section, date, status, marked_by)
        VALUES (?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE status = VALUES(status), marked_by = VALUES(marked_by), updated_at = CURRENT_TIMESTAMP
      `;
      await connection.query(sql, [
        rec.studentId,
        classSection,
        date,
        rec.status || 'Present',
        markedBy || 'Teacher'
      ]);
    }

    await connection.commit();
    return res.status(200).json({
      success: true,
      message: `Attendance for ${classSection} on ${date} saved successfully (${records.length} records processed).`,
      count: records.length
    });
  } catch (error) {
    await connection.rollback();
    console.error('[ATTENDANCE API POST ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  } finally {
    connection.release();
  }
});

export default router;
