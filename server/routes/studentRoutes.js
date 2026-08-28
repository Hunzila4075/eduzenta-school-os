import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

// GET /api/students — Fetch all student records (or filter by classSection)
router.get('/', async (req, res) => {
  const { classSection } = req.query;
  try {
    let sql = 'SELECT * FROM students ORDER BY created_at DESC';
    let params = [];
    if (classSection) {
      sql = 'SELECT * FROM students WHERE class_section = ? ORDER BY roll_number ASC';
      params = [classSection];
    }
    const [rows] = await pool.query(sql, params);

    // Map snake_case DB columns to camelCase JSON props
    const formatted = rows.map(r => ({
      id: r.id,
      rollNo: r.roll_number,
      regNo: r.reg_no,
      name: r.name,
      classSection: r.class_section,
      gender: r.gender,
      phone: r.phone,
      guardianName: r.guardian_name,
      photo: r.photo_url,
      photoUrl: r.photo_url,
      status: r.status,
      createdAt: r.created_at
    }));

    return res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    console.error('[STUDENTS API GET ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Database error', message: error.message });
  }
});

// POST /api/students — Enrol a new student
router.post('/', async (req, res) => {
  const { rollNo, regNo, name, classSection, gender, phone, guardianName, photo, photoUrl } = req.body;
  if (!name || !rollNo) {
    return res.status(400).json({ success: false, error: 'Student Name and Roll Number are required.' });
  }

  const studentId = `std_${Date.now()}`;
  const targetPhoto = photo || photoUrl || null;

  try {
    const sql = `
      INSERT INTO students (id, roll_number, reg_no, name, class_section, gender, phone, guardian_name, photo_url, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')
    `;
    await pool.query(sql, [studentId, rollNo, regNo || null, name, classSection || 'Class 10-A', gender || 'Male', phone || null, guardianName || null, targetPhoto]);

    const newStudent = {
      id: studentId,
      rollNo,
      regNo,
      name,
      classSection: classSection || 'Class 10-A',
      gender: gender || 'Male',
      phone,
      guardianName,
      photo: targetPhoto,
      photoUrl: targetPhoto,
      status: 'Active'
    };

    return res.status(201).json({ success: true, message: 'Student enrolled successfully.', data: newStudent });
  } catch (error) {
    console.error('[STUDENTS API POST ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Database error', message: error.message });
  }
});

// DELETE /api/students/:id — Delete a student record from database
router.delete('/:id', async (req, res) => {
  const studentId = req.params.id;

  if (!studentId) {
    return res.status(400).json({ success: false, error: 'Student ID is required.' });
  }

  try {
    const [result] = await pool.query('DELETE FROM students WHERE id = ?', [studentId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Not Found', message: 'Student record not found in database.' });
    }
    return res.json({ success: true, message: 'Student deleted successfully.', deletedId: studentId });
  } catch (error) {
    console.error('[DELETE STUDENT ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Database error', message: error.message });
  }
});

export default router;
