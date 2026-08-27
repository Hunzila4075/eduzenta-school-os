import express from 'express';
import pool from '../config/db.js';

const router = express.Router();

// Fallback in-memory data if DB connection fails during development
const mockStudents = [
  { id: 'std_101', rollNo: '101', regNo: 'REG-2026-001', name: 'Zainab Fatima', classSection: 'Class 10-A', gender: 'Female', phone: '+92 300 1234567', guardianName: 'Tariq Mahmood', status: 'Active' },
  { id: 'std_102', rollNo: '102', regNo: 'REG-2026-002', name: 'Muhammad Ali', classSection: 'Class 10-A', gender: 'Male', phone: '+92 300 7654321', guardianName: 'Raza Ali', status: 'Active' },
  { id: 'std_103', rollNo: '103', regNo: 'REG-2026-003', name: 'Ayesha Khan', classSection: 'Class 10-A', gender: 'Female', phone: '+92 301 9876543', guardianName: 'Imran Khan', status: 'Active' },
  { id: 'std_104', rollNo: '104', regNo: 'REG-2026-004', name: 'Bilal Ahmed', classSection: 'Class 9-B', gender: 'Male', phone: '+92 302 4567890', guardianName: 'Shahid Ahmed', status: 'Active' }
];

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
      status: r.status,
      createdAt: r.created_at
    }));

    return res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    console.warn('[STUDENTS API] Database query failed, returning fallback memory data:', error.message);
    let filtered = mockStudents;
    if (classSection) {
      filtered = mockStudents.filter(s => s.classSection === classSection);
    }
    return res.json({ success: true, isMock: true, count: filtered.length, data: filtered });
  }
});

// POST /api/students — Enrol a new student
router.post('/', async (req, res) => {
  const { rollNo, regNo, name, classSection, gender, phone, guardianName } = req.body;
  if (!name || !rollNo) {
    return res.status(400).json({ success: false, error: 'Student Name and Roll Number are required.' });
  }

  const studentId = `std_${Date.now()}`;
  try {
    const sql = `
      INSERT INTO students (id, roll_number, reg_no, name, class_section, gender, phone, guardian_name, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Active')
    `;
    await pool.query(sql, [studentId, rollNo, regNo || null, name, classSection || 'Class 10-A', gender || 'Male', phone || null, guardianName || null]);
    
    const newStudent = {
      id: studentId,
      rollNo,
      regNo,
      name,
      classSection: classSection || 'Class 10-A',
      gender: gender || 'Male',
      phone,
      guardianName,
      status: 'Active'
    };

    return res.status(201).json({ success: true, message: 'Student enrolled successfully.', data: newStudent });
  } catch (error) {
    console.warn('[STUDENTS API] Database insert failed, returning fallback success:', error.message);
    const newStudent = {
      id: studentId,
      rollNo,
      regNo,
      name,
      classSection: classSection || 'Class 10-A',
      gender: gender || 'Male',
      phone,
      guardianName,
      status: 'Active'
    };
    mockStudents.unshift(newStudent);
    return res.status(201).json({ success: true, isMock: true, message: 'Student enrolled locally.', data: newStudent });
  }
});

export default router;
