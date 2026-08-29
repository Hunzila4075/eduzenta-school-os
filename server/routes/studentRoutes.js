import express from 'express';
import pool from '../config/db.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// GET /api/students — Fetch students scoped to authenticated user's school
// Super Admin: all students. School Admin / Teacher: only their school's students.
router.get('/', authenticateToken, async (req, res) => {
  const { classSection } = req.query;
  const userRole = String(req.user.role || '').toLowerCase();
  const isSuper = userRole === 'super_admin' || userRole === 'superadmin';
  const schoolId = req.user.school_id;

  try {
    let sql = `
      SELECT id, school_id, roll_number, reg_no, name, class_section,
             gender, phone, guardian_name, photo_url, status, created_at
      FROM students WHERE 1=1
    `;
    const params = [];

    if (!isSuper) {
      if (!schoolId) {
        return res.status(400).json({ success: false, error: 'No school_id found for authenticated user.' });
      }
      sql += ' AND school_id = ?';
      params.push(schoolId);
    }

    if (classSection) {
      sql += ' AND class_section = ?';
      params.push(classSection);
    }

    sql += ' ORDER BY created_at DESC';

    const [rows] = await pool.query(sql, params);
    const formatted = rows.map(r => ({
      id: r.id,
      schoolId: r.school_id,
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

// POST /api/students — Enrol a new student, scoped to authenticated user's school
router.post('/', authenticateToken, async (req, res) => {
  const { rollNo, regNo, name, classSection, gender, phone, guardianName, photo, photoUrl } = req.body;
  if (!name || !rollNo) {
    return res.status(400).json({ success: false, error: 'Student Name and Roll Number are required.' });
  }

  const userRole = String(req.user.role || '').toLowerCase();
  const isSuper = userRole === 'super_admin' || userRole === 'superadmin';
  const schoolId = isSuper ? (req.body.school_id || req.user.school_id) : (req.user.school_id || null);
  const studentId = `std_${Date.now()}`;
  const targetPhoto = photo || photoUrl || null;

  try {
    await pool.query(
      `INSERT INTO students (id, school_id, roll_number, reg_no, name, class_section, gender, phone, guardian_name, photo_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')`,
      [studentId, schoolId, rollNo, regNo || null, name, classSection || 'Class 10-A', gender || 'Male', phone || null, guardianName || null, targetPhoto]
    );
    return res.status(201).json({
      success: true,
      message: 'Student enrolled successfully.',
      data: { id: studentId, schoolId, rollNo, regNo, name, classSection: classSection || 'Class 10-A', gender: gender || 'Male', phone, guardianName, photo: targetPhoto, photoUrl: targetPhoto, status: 'Active' }
    });
  } catch (error) {
    console.error('[STUDENTS API POST ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Database error', message: error.message });
  }
});

// PUT /api/students/:id — Update student record (fixes state-only update data loss bug)
router.put('/:id', authenticateToken, async (req, res) => {
  const studentId = req.params.id;
  const { name, classSection, rollNo, regNo, gender, phone, guardianName, status } = req.body;
  if (!studentId) return res.status(400).json({ success: false, error: 'Student ID is required.' });

  try {
    const [existing] = await pool.query('SELECT id, school_id FROM students WHERE id = ?', [studentId]);
    if (!existing || existing.length === 0) return res.status(404).json({ success: false, error: 'Student not found.' });

    const userRole = String(req.user.role || '').toLowerCase();
    const isSuper = userRole === 'super_admin' || userRole === 'superadmin';
    if (!isSuper && existing[0].school_id && String(existing[0].school_id) !== String(req.user.school_id)) {
      return res.status(403).json({ success: false, error: 'Not authorized to update this student.' });
    }

    const fields = [];
    const values = [];
    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (classSection !== undefined) { fields.push('class_section = ?'); values.push(classSection); }
    if (rollNo !== undefined) { fields.push('roll_number = ?'); values.push(rollNo); }
    if (regNo !== undefined) { fields.push('reg_no = ?'); values.push(regNo); }
    if (gender !== undefined) { fields.push('gender = ?'); values.push(gender); }
    if (phone !== undefined) { fields.push('phone = ?'); values.push(phone); }
    if (guardianName !== undefined) { fields.push('guardian_name = ?'); values.push(guardianName); }
    if (status !== undefined) { fields.push('status = ?'); values.push(status); }

    if (fields.length === 0) return res.status(400).json({ success: false, error: 'No fields to update.' });

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(studentId);
    await pool.query(`UPDATE students SET ${fields.join(', ')} WHERE id = ?`, values);

    const [updatedRows] = await pool.query(
      'SELECT id, school_id, roll_number, reg_no, name, class_section, gender, phone, guardian_name, photo_url, status FROM students WHERE id = ?',
      [studentId]
    );
    const r = updatedRows[0];
    return res.json({
      success: true, message: 'Student updated successfully.',
      data: { id: r.id, schoolId: r.school_id, rollNo: r.roll_number, regNo: r.reg_no, name: r.name, classSection: r.class_section, gender: r.gender, phone: r.phone, guardianName: r.guardian_name, photo: r.photo_url, photoUrl: r.photo_url, status: r.status }
    });
  } catch (error) {
    console.error('[STUDENTS API PUT ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Database error', message: error.message });
  }
});

// DELETE /api/students/:id — Delete a student record from database
router.delete('/:id', authenticateToken, async (req, res) => {
  const studentId = req.params.id;
  if (!studentId) return res.status(400).json({ success: false, error: 'Student ID is required.' });
  try {
    const [result] = await pool.query('DELETE FROM students WHERE id = ?', [studentId]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'Not Found', message: 'Student not found in database.' });
    return res.json({ success: true, message: 'Student deleted successfully.', deletedId: studentId });
  } catch (error) {
    console.error('[DELETE STUDENT ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Database error', message: error.message });
  }
});

export default router;


