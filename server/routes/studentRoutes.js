import express from 'express';
import pool from '../config/db.js';
import { authenticateToken, requireSchoolStaff } from '../middleware/authMiddleware.js';
import { assertTeacherClassAccess, teacherClassScope, respondClassForbidden, classExistsInCatalog } from '../middleware/teacherAccess.js';

const router = express.Router();


function resolveRole(req) {
  const role = String(req.user?.role || '').toLowerCase();
  return {
    role,
    isSuper: role === 'super_admin' || role === 'superadmin',
    isTeacher: role === 'teacher'
  };
}

// GET /api/students — Fetch students scoped to authenticated user's school.
// TEACHERS: only students of their ASSIGNED classes are ever returned —
// enforced server-side, so query-parameter manipulation cannot leak
// unassigned-class students.
router.get('/', authenticateToken, requireSchoolStaff, async (req, res) => {
  const { classSection } = req.query;
  const { isSuper, isTeacher } = resolveRole(req);
  const schoolId = req.user.school_id;

  try {
    // CORE RULE 1 — teacher isolation (403 on unassigned class access)
    const access = await assertTeacherClassAccess(req, classSection);
    if (!access.ok) return respondClassForbidden(res, access);

    if (!isSuper) {
      if (!schoolId) {
        return res.status(400).json({ success: false, error: 'No school_id found for authenticated user.' });
      }
    }

    let sql = `
      SELECT id, roll_number, reg_no, name, class_section,
             gender, phone, guardian_name, photo_url, status, created_at
      FROM students WHERE 1=1
    `;
    const params = [];

    // School isolation: students table has no school_id column.
    // Use the teacher_class_assignments relationship (school_id ↔ class_section)
    // to enforce strict tenant isolation.
    if (!isSuper && schoolId) {
      sql += ' AND class_section IN (SELECT class_section FROM teacher_class_assignments WHERE school_id = ?)';
      params.push(schoolId);
    }

    if (isTeacher) {
      // Teacher: hard scope to assigned classes (param already validated above)
      const scope = teacherClassScope(access);
      if (scope.empty) {
        return res.json({ success: true, count: 0, data: [], message: 'No classes assigned yet — contact your administrator.' });
      }
      sql += scope.clause;
      params.push(...scope.params);
    } else if (classSection) {
      sql += ' AND class_section = ?';
      params.push(classSection);
    }

    sql += ' ORDER BY created_at DESC';

    const [rows] = await pool.query(sql, params);
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

// POST /api/students — Enrol a new student, scoped to authenticated user's school
router.post('/', authenticateToken, requireSchoolStaff, async (req, res) => {
  const { rollNo, regNo, name, classSection, gender, phone, guardianName, photo, photoUrl } = req.body;
  if (!name || !rollNo) {
    return res.status(400).json({ success: false, error: 'Student Name and Roll Number are required.' });
  }
  if (!classSection) {
    return res.status(400).json({ success: false, error: 'Validation Error', message: 'A class must be selected for the student.' });
  }

  const { isSuper, isTeacher } = resolveRole(req);
  const schoolId = isSuper ? (req.body.school_id || req.user.school_id) : (req.user.school_id || null);
  const studentId = `std_${Date.now()}`;
  const targetPhoto = photo || photoUrl || null;

  try {
    // CORE RULE 1 — a teacher may only enrol into their own assigned classes
    if (isTeacher) {
      const access = await assertTeacherClassAccess(req, classSection);
      if (!access.ok) return respondClassForbidden(res, access);
    }

    // Class must exist in the school's class catalog (single class source)
    if (schoolId && !(await classExistsInCatalog(schoolId, classSection))) {
      return res.status(400).json({
        success: false,
        error: 'Validation Error',
        message: `"${classSection}" is not a valid class for this school. Create it in the class list first.`
      });
    }

    await pool.query(
      `INSERT INTO students (id, roll_number, reg_no, name, class_section, gender, phone, guardian_name, photo_url, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active')`,
      [studentId, rollNo, regNo || null, name, classSection, gender || 'Male', phone || null, guardianName || null, targetPhoto]
    );
    return res.status(201).json({
      success: true,
      message: 'Student enrolled successfully.',
      data: { id: studentId, schoolId: schoolId || null, rollNo, regNo, name, classSection, gender: gender || 'Male', phone, guardianName, photo: targetPhoto, photoUrl: targetPhoto, status: 'Active' }
    });
  } catch (error) {
    console.error('[STUDENTS API POST ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Database error', message: error.message });
  }
});

// PUT /api/students/:id — Update student record (fixes state-only update data loss bug)
router.put('/:id', authenticateToken, requireSchoolStaff, async (req, res) => {
  const studentId = req.params.id;
  const { name, classSection, rollNo, regNo, gender, phone, guardianName, status, photo, photoUrl } = req.body;
  if (!studentId) return res.status(400).json({ success: false, error: 'Student ID is required.' });

  try {
    const [existing] = await pool.query(
      'SELECT id, roll_number, reg_no, name, class_section, gender, phone, guardian_name, photo_url, status FROM students WHERE id = ?',
      [studentId]
    );
    if (!existing || existing.length === 0) return res.status(404).json({ success: false, error: 'Student not found.' });

    const { isSuper, isTeacher } = resolveRole(req);
    const current = existing[0];

    // School isolation: students table has no school_id column.
    // Use the teacher_class_assignments relationship (school_id ↔ class_section)
    // to enforce strict tenant isolation.
    if (!isSuper && req.user.school_id) {
      const [schoolCheck] = await pool.query(
        'SELECT class_section FROM teacher_class_assignments WHERE school_id = ? AND class_section = ? LIMIT 1',
        [req.user.school_id, current.class_section]
      );
      if (schoolCheck.length === 0) {
        return res.status(403).json({ success: false, error: 'Not authorized to update this student.' });
      }
    }

    // CORE RULE 1 — teacher can only touch students of their assigned classes
    // (covers both the student's current class and any class being moved into)
    if (isTeacher) {
      const access = await assertTeacherClassAccess(req, [current.class_section, classSection].filter(Boolean));
      if (!access.ok) return respondClassForbidden(res, access);
    }

    // Moving a student into a class must target the school's class catalog
    if (classSection && classSection !== current.class_section) {
      const targetSchoolId = isSuper ? (req.body.school_id || req.user.school_id) : req.user.school_id;
      if (targetSchoolId && !(await classExistsInCatalog(targetSchoolId, classSection))) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: `"${classSection}" is not a valid class for this school.`
        });
      }
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
    const targetPhoto = photo || photoUrl || undefined;
    if (targetPhoto !== undefined) { fields.push('photo_url = ?'); values.push(targetPhoto); }

    if (fields.length === 0) return res.status(400).json({ success: false, error: 'No fields to update.' });

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(studentId);
    await pool.query(`UPDATE students SET ${fields.join(', ')} WHERE id = ?`, values);

    // Construct the updated record locally — mirrors the previous re-SELECT
    // without spending another WAN round-trip.
    const r = {
      id: current.id,
      roll_number: rollNo !== undefined ? rollNo : current.roll_number,
      reg_no: regNo !== undefined ? regNo : current.reg_no,
      name: name !== undefined ? name : current.name,
      class_section: classSection !== undefined ? classSection : current.class_section,
      gender: gender !== undefined ? gender : current.gender,
      phone: phone !== undefined ? phone : current.phone,
      guardian_name: guardianName !== undefined ? guardianName : current.guardian_name,
      photo_url: targetPhoto !== undefined ? targetPhoto : current.photo_url,
      status: status !== undefined ? status : current.status
    };
    return res.json({
      success: true, message: 'Student updated successfully.',
      data: { id: r.id, schoolId: req.user.school_id || null, rollNo: r.roll_number, regNo: r.reg_no, name: r.name, classSection: r.class_section, gender: r.gender, phone: r.phone, guardianName: r.guardian_name, photo: r.photo_url, photoUrl: r.photo_url, status: r.status }
    });
  } catch (error) {
    console.error('[STUDENTS API PUT ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Database error', message: error.message });
  }
});

// DELETE /api/students/:id — Delete a student record from database
router.delete('/:id', authenticateToken, requireSchoolStaff, async (req, res) => {
  const studentId = req.params.id;
  if (!studentId) return res.status(400).json({ success: false, error: 'Student ID is required.' });
  const { isSuper, isTeacher } = resolveRole(req);

  try {
    const [rows] = await pool.query('SELECT class_section FROM students WHERE id = ?', [studentId]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Not Found', message: 'Student not found in database.' });
    }
    const studentClassSection = rows[0].class_section;
    // IDOR HARDENING — non-super callers (admins/teachers) may only delete
    // students of their own school. Use the teacher_class_assignments
    // relationship (school_id ↔ class_section) for tenant isolation.
    if (!isSuper && req.user.school_id) {
      const [schoolCheck] = await pool.query(
        'SELECT class_section FROM teacher_class_assignments WHERE school_id = ? AND class_section = ? LIMIT 1',
        [req.user.school_id, studentClassSection]
      );
      if (schoolCheck.length === 0) {
        return res.status(403).json({ success: false, error: 'Forbidden', message: 'Not authorized to delete this student.' });
      }
    }
    // CORE RULE 1 — teacher may only delete students of their assigned classes
    if (isTeacher) {
      const access = await assertTeacherClassAccess(req, studentClassSection);
      if (!access.ok) return respondClassForbidden(res, access);
    }

    const [result] = await pool.query('DELETE FROM students WHERE id = ?', [studentId]);
    if (result.affectedRows === 0) return res.status(404).json({ success: false, error: 'Not Found', message: 'Student not found in database.' });
    return res.json({ success: true, message: 'Student deleted successfully.', deletedId: studentId });
  } catch (error) {
    console.error('[DELETE STUDENT ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Database error', message: error.message });
  }
});

export default router;


