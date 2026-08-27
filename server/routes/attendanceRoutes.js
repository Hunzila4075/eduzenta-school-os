import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

// Fallback memory state for attendance records
const mockAttendance = [];

// GET /api/attendance — Fetch attendance records by classSection and/or date
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
    console.warn('[ATTENDANCE API] Database query failed, returning fallback memory data:', error.message);
    let filtered = mockAttendance;
    if (classSection) {
      filtered = filtered.filter(a => a.classSection === classSection);
    }
    if (date) {
      filtered = filtered.filter(a => a.date === date);
    }
    return res.json({ success: true, isMock: true, count: filtered.length, data: filtered });
  }
});

// POST /api/attendance — Record or bulk update class attendance for a specific date
router.post('/', async (req, res) => {
  const { classSection, date, records, markedBy } = req.body;
  // records: [{ studentId, status: 'Present' | 'Absent' | 'Late' | 'Excused' }]
  if (!classSection || !date || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ success: false, error: 'ClassSection, date, and non-empty records array are required.' });
  }

  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();

    try {
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
      connection.release();

      return res.status(200).json({
        success: true,
        message: `Attendance for ${classSection} on ${date} saved successfully (${records.length} records processed).`,
        count: records.length
      });
    } catch (txErr) {
      await connection.rollback();
      connection.release();
      throw txErr;
    }
  } catch (error) {
    console.warn('[ATTENDANCE API] Database transaction failed, saving locally:', error.message);
    
    // Save to memory fallback
    records.forEach(rec => {
      const existingIdx = mockAttendance.findIndex(a => a.studentId === rec.studentId && a.date === date);
      const entryObj = {
        id: `att_${Date.now()}_${rec.studentId}`,
        studentId: rec.studentId,
        classSection,
        date,
        status: rec.status || 'Present',
        markedBy: markedBy || 'Teacher'
      };

      if (existingIdx >= 0) {
        mockAttendance[existingIdx] = entryObj;
      } else {
        mockAttendance.push(entryObj);
      }
    });

    return res.status(200).json({
      success: true,
      isMock: true,
      message: `Attendance for ${classSection} on ${date} saved locally (${records.length} records).`,
      count: records.length
    });
  }
});

export default router;
