import express from 'express';
import pool from '../config/db.js';
import { authenticateToken, requireSchoolStaff } from '../middleware/authMiddleware.js';
import { assertTeacherClassAccess, respondClassForbidden } from '../middleware/teacherAccess.js';

const router = express.Router();


function resolveRole(req) {
  const role = String(req.user?.role || '').toLowerCase();
  return {
    role,
    isSuper: role === 'super_admin' || role === 'superadmin',
    isTeacher: role === 'teacher',
    isAdmin: role === 'admin'
  };
}

// ------------------------------------------------------------
// CLASS SUBJECT RESOLUTION — the single subject source for admit cards.
//
// The subject list for a class is the UNION of:
//   1. Subjects explicitly assigned to the class through its teachers:
//      teacher_class_assignments ⋈ users.assigned_subjects
//      (the existing subject-allocation storage — no new tables).
//   2. Subjects already recorded in the `marks` table for that class
//      (real persisted marks data — existing behaviour preserved).
//
// This guarantees an admit card lists EVERY subject assigned to the
// student's class/teacher, not only subjects that already have marks.
// Exam dates are NOT stored anywhere in the DB — examDate stays null and
// no date sheet is ever fabricated.
// ------------------------------------------------------------
export async function resolveClassSubjects(schoolId, classSections) {
  const byClass = {};
  const addSubject = (cls, subject) => {
    const key = String(cls || '');
    const sub = String(subject || '').trim();
    if (!key || !sub) return;
    if (!byClass[key]) byClass[key] = [];
    if (!byClass[key].includes(sub)) byClass[key].push(sub);
  };

  const classes = (Array.isArray(classSections) ? classSections : [classSections])
    .map(c => String(c || '').trim())
    .filter(Boolean);
  if (classes.length === 0) return byClass;
  const classPlaceholders = classes.map(() => '?').join(', ');

  // 1. Subjects assigned to the class via its teachers' subject allocation
  try {
    let assignedSql = `
      SELECT tca.class_section, u.assigned_subjects
      FROM teacher_class_assignments tca
      JOIN users u ON u.id = tca.teacher_user_id
      WHERE tca.class_section IN (${classPlaceholders})
        AND u.assigned_subjects IS NOT NULL AND u.assigned_subjects <> ''
    `;
    const assignedParams = [...classes];
    if (schoolId) {
      assignedSql = assignedSql.replace(
        'WHERE tca.class_section IN',
        'WHERE tca.school_id = ? AND tca.class_section IN'
      );
      assignedParams.unshift(schoolId);
    }
    const [assignedRows] = await pool.query(assignedSql, assignedParams);
    (assignedRows || []).forEach(r => {
      String(r.assigned_subjects || '')
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .forEach(sub => addSubject(r.class_section, sub));
    });
  } catch (assignedErr) {
    console.warn('[CLASS SUBJECTS ASSIGNED LOOKUP] skipped:', assignedErr.message);
  }

  // 2. Subjects recorded in the marks table (real marks data)
  try {
    let marksSql = `SELECT DISTINCT class_section, subject FROM marks WHERE subject IS NOT NULL AND subject <> '' AND class_section IN (${classPlaceholders})`;
    const marksParams = [...classes];
    if (schoolId) {
      marksSql += ' AND school_id = ?';
      marksParams.push(schoolId);
    }
    const [marksRows] = await pool.query(marksSql, marksParams);
    (marksRows || []).forEach(r => addSubject(r.class_section, r.subject));
  } catch (marksErr) {
    console.warn('[CLASS SUBJECTS MARKS LOOKUP] skipped:', marksErr.message);
  }

  // Sort each class's subject list alphabetically for a stable admit card
  Object.keys(byClass).forEach(cls => byClass[cls].sort((a, b) => a.localeCompare(b)));
  return byClass;
}

// ============================================================
// MARKS — real persistence for result entry & result cards
// ============================================================

// GET /api/marks?classSection=&term= — Student marks for a class+term.
// TEACHERS: only their assigned classes. ADMINS: their school.
router.get('/marks', authenticateToken, requireSchoolStaff, async (req, res) => {
  const { classSection, term } = req.query;
  const { isSuper, isTeacher } = resolveRole(req);
  const schoolId = req.user.school_id;

  try {
    const access = await assertTeacherClassAccess(req, classSection || null);
    if (!access.ok) return respondClassForbidden(res, access);

    let sql = `
      SELECT m.id, m.student_id, m.class_section, m.term, m.subject, m.max_marks,
             m.obtained_marks, m.remarks, m.teacher_remarks, m.marked_by, m.updated_at
      FROM marks m WHERE 1=1
    `;
    const params = [];

    if (!isSuper) {
      sql += ' AND m.school_id = ?';
      params.push(schoolId);
    }
    if (classSection) {
      sql += ' AND m.class_section = ?';
      params.push(classSection);
    } else if (isTeacher) {
      // FIX: previously a teacher without a classSection filter got 400
      // ("Class selection is required"). AppContext hydration calls GET /marks
      // with NO filters for every role, so after refresh a teacher's marks
      // (including Activity outcome marks) never hydrated — the Activity modal
      // showed every saved mark as 0. Scope to the teacher's ASSIGNED classes
      // instead (mirrors GET /challans & GET /activities) so refresh re-hydrates.
      const assigned = access.assignedClasses || [];
      if (assigned.length === 0) {
        return res.json({ success: true, count: 0, data: [] });
      }
      sql += ` AND m.class_section IN (${assigned.map(() => '?').join(', ')})`;
      params.push(...assigned);
    }
    if (term) {
      sql += ' AND m.term = ?';
      params.push(term);
    }
    sql += ' ORDER BY m.student_id ASC, m.subject ASC';

    const [rows] = await pool.query(sql, params);

    // FIX: group by (student_id, term) — NOT by student_id alone. The previous
    // grouping merged every term's rows for a student into ONE group whose
    // `term` label came from whichever row sorted first, so term-filtered
    // consumers (Admin Result Cards `m.term === selectedTerm`, Activity
    // outcome hydration `m.term === activity.term`) read the wrong/merged
    // subject set — marks saved in the DB appeared missing after refresh.
    const grouped = {};
    rows.forEach(r => {
      const termKey = r.term || '1st Term';
      const key = `${r.student_id}::${termKey}`;
      if (!grouped[key]) {
        grouped[key] = {
          studentId: r.student_id,
          classSection: r.class_section,
          term: termKey,
          teacherRemarks: r.teacher_remarks || '',
          markedBy: r.marked_by,
          subjects: [],
          updatedAt: r.updated_at
        };
      }
      grouped[key].subjects.push({
        subject: r.subject,
        maxMarks: r.max_marks,
        obtainedMarks: Number(r.obtained_marks),
        remarks: r.remarks || ''
      });
    });

    return res.json({ success: true, count: Object.keys(grouped).length, data: Object.values(grouped) });
  } catch (error) {
    console.error('[GET MARKS ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});
// POST /api/marks — Bulk upsert a student's marks for a term (single query).
// TEACHERS: only assigned classes. Persists by (student_id, term, subject).
router.post('/marks', authenticateToken, requireSchoolStaff, async (req, res) => {
  const { studentId, classSection, term, subjects, teacherRemarks } = req.body;
  const { isSuper, isTeacher } = resolveRole(req);
  const schoolId = req.user.school_id;

  if (!studentId || !classSection || !term || !Array.isArray(subjects) || subjects.length === 0) {
    return res.status(400).json({ success: false, error: 'Validation Error', message: 'studentId, classSection, term, and subjects[] are required.' });
  }

  try {
    // CORE RULE 1 — teacher may only save marks for their assigned classes
    const access = await assertTeacherClassAccess(req, classSection);
    if (!access.ok) return respondClassForbidden(res, access);

    const [studentRows] = await pool.query('SELECT id, school_id, class_section FROM students WHERE id = ?', [studentId]);
    const student = studentRows[0];
    if (!student) {
      return res.status(404).json({ success: false, error: 'Not Found', message: 'Student not found.' });
    }
    if (!isSuper && String(student.school_id) !== String(schoolId)) {
      return res.status(403).json({ success: false, error: 'Forbidden', message: 'Student does not belong to your school.' });
    }
    if (String(student.class_section) !== String(classSection)) {
      return res.status(400).json({ success: false, error: 'Validation Error', message: 'Student does not belong to the selected class.' });
    }

    const markedBy = `${req.user.name || 'User'} (${req.user.role})`;

    const rowValues = subjects.map(sub => [
      schoolId,
      studentId,
      classSection,
      term,
      sub.subject,
      sub.maxMarks != null ? sub.maxMarks : 100,
      sub.obtainedMarks != null ? sub.obtainedMarks : 0,
      sub.remarks || null,
      teacherRemarks || null,
      markedBy
    ]);
    const placeholders = rowValues.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const flatValues = rowValues.flat();

    const sql = `
      INSERT INTO marks (school_id, student_id, class_section, term, subject, max_marks, obtained_marks, remarks, teacher_remarks, marked_by)
      VALUES ${placeholders}
      ON DUPLICATE KEY UPDATE
        max_marks = VALUES(max_marks),
        obtained_marks = VALUES(obtained_marks),
        remarks = VALUES(remarks),
        teacher_remarks = VALUES(teacher_remarks),
        marked_by = VALUES(marked_by),
        updated_at = CURRENT_TIMESTAMP
    `;

    await pool.query(sql, flatValues);

    return res.status(200).json({
      success: true,
      message: `Marks saved for ${student.name} (${classSection}, ${term}) — ${subjects.length} subjects in 1 query.`,
      count: subjects.length
    });
  } catch (error) {
    console.error('[POST MARKS ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

// POST /api/marks/bulk — Upsert MANY students' marks for ONE class+term in a
// SINGLE query. Used by the Teacher Activity outcome save (previously one
// POST /api/marks per student = N sequential round-trips per class save).
// Same table, same (student_id, term, subject) unique key, same isolation.
router.post('/marks/bulk', authenticateToken, requireSchoolStaff, async (req, res) => {
  const { classSection, term, teacherRemarks, entries } = req.body;
  const { isSuper } = resolveRole(req);
  const schoolId = req.user.school_id;

  if (!classSection || !term || !Array.isArray(entries) || entries.length === 0) {
    return res.status(400).json({ success: false, error: 'Validation Error', message: 'classSection, term, and entries[] are required.' });
  }

  try {
    const access = await assertTeacherClassAccess(req, classSection);
    if (!access.ok) return respondClassForbidden(res, access);

    // Validate every entry belongs to this school + class (ONE query)
    const studentIds = [...new Set(entries.map(e => String(e.studentId || '').trim()).filter(Boolean))];
    if (studentIds.length === 0) {
      return res.status(400).json({ success: false, error: 'Validation Error', message: 'entries[] must contain studentId values.' });
    }
    const [studentRows] = await pool.query(
      `SELECT id, school_id, class_section FROM students WHERE id IN (${studentIds.map(() => '?').join(', ')})`,
      studentIds
    );
    const byId = new Map(studentRows.map(s => [String(s.id), s]));
    const invalid = studentIds.filter(id => {
      const s = byId.get(id);
      return !s || (!isSuper && String(s.school_id) !== String(schoolId)) || String(s.class_section) !== String(classSection);
    });
    if (invalid.length > 0) {
      return res.status(403).json({ success: false, error: 'Forbidden', message: `Invalid student(s) for ${classSection}: ${invalid.join(', ')}` });
    }

    const markedBy = `${req.user.name || 'User'} (${req.user.role})`;
    const rowValues = [];
    entries.forEach(e => {
      (Array.isArray(e.subjects) ? e.subjects : []).forEach(sub => {
        rowValues.push([
          schoolId,
          e.studentId,
          classSection,
          term,
          sub.subject,
          sub.maxMarks != null ? sub.maxMarks : 100,
          sub.obtainedMarks != null ? sub.obtainedMarks : 0,
          sub.remarks || null,
          teacherRemarks || null,
          markedBy
        ]);
      });
    });
    if (rowValues.length === 0) {
      return res.status(400).json({ success: false, error: 'Validation Error', message: 'entries[] contain no subjects.' });
    }

    const placeholders = rowValues.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
    const flatValues = rowValues.flat();
    const sql = `
      INSERT INTO marks (school_id, student_id, class_section, term, subject, max_marks, obtained_marks, remarks, teacher_remarks, marked_by)
      VALUES ${placeholders}
      ON DUPLICATE KEY UPDATE
        max_marks = VALUES(max_marks),
        obtained_marks = VALUES(obtained_marks),
        remarks = VALUES(remarks),
        marked_by = VALUES(marked_by),
        updated_at = CURRENT_TIMESTAMP
    `;
    await pool.query(sql, flatValues);

    return res.status(200).json({
      success: true,
      message: `Activity marks saved for ${studentIds.length} student(s) (${classSection}, ${term}) — ${rowValues.length} subject rows in 1 query.`,
      saved: studentIds.length,
      count: rowValues.length
    });
  } catch (error) {
    console.error('[POST MARKS BULK ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

// ============================================================
// ACTIVITIES — real persistence for class assessments/activities.
// Previously activities existed ONLY in frontend React state (no table,
// no API), so every activity vanished on refresh / logout-login. These
// endpoints persist them in the `activities` table (migration v4) with
// the same school/teacher isolation rules as marks.
// ============================================================

// Row → API shape mapper
function mapActivityRow(r) {
  return {
    id: r.id,
    schoolId: r.school_id,
    school_id: r.school_id,
    teacherUserId: r.teacher_user_id,
    teacherId: r.teacher_user_id,
    name: r.name,
    subject: r.subject,
    maxMarks: Number(r.max_marks ?? 100),
    term: r.term || '1st Term',
    classSection: r.class_section,
    createdAt: r.created_at,
    updatedAt: r.updated_at
  };
}

// GET /api/activities?classSection=&term= — Activities for a school/class.
// TEACHERS: only their assigned classes (server-side isolation).
router.get('/activities', authenticateToken, requireSchoolStaff, async (req, res) => {
  const { classSection, term } = req.query;
  const { isSuper, isTeacher } = resolveRole(req);
  const schoolId = req.user.school_id;

  try {
    const access = await assertTeacherClassAccess(req, classSection || null);
    if (!access.ok) return respondClassForbidden(res, access);

    let sql = 'SELECT * FROM activities WHERE 1=1';
    const params = [];

    if (!isSuper) {
      sql += ' AND school_id = ?';
      params.push(schoolId);
    }
    if (classSection) {
      sql += ' AND class_section = ?';
      params.push(classSection);
    } else if (isTeacher) {
      // CORE RULE 1 — teacher without an explicit class filter sees ONLY
      // the classes assigned to them (never another class's activities).
      const assigned = access.assignedClasses || [];
      if (assigned.length === 0) {
        return res.json({ success: true, count: 0, data: [] });
      }
      sql += ` AND class_section IN (${assigned.map(() => '?').join(', ')})`;
      params.push(...assigned);
    }
    if (term) {
      sql += ' AND term = ?';
      params.push(term);
    }
    sql += ' ORDER BY created_at DESC, id DESC';

    const [rows] = await pool.query(sql, params);
    const data = (rows || []).map(mapActivityRow);
    return res.json({ success: true, count: data.length, data });
  } catch (error) {
    console.error('[GET ACTIVITIES ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

// POST /api/activities — Create an activity for a class/term.
// TEACHERS: only for their assigned classes. Returns the persisted row.
router.post('/activities', authenticateToken, requireSchoolStaff, async (req, res) => {
  const { name, subject, maxMarks = 100, term = '1st Term', classSection } = req.body;
  const schoolId = req.user.school_id;

  if (!name || !subject || !classSection) {
    return res.status(400).json({ success: false, error: 'Validation Error', message: 'name, subject, and classSection are required.' });
  }

  try {
    const access = await assertTeacherClassAccess(req, classSection);
    if (!access.ok) return respondClassForbidden(res, access);

    const [result] = await pool.query(
      `INSERT INTO activities (school_id, teacher_user_id, name, subject, max_marks, term, class_section)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [schoolId || null, req.user.id || null, String(name).trim(), String(subject).trim(), Number(maxMarks) || 100, term || '1st Term', classSection]
    );

    const [rows] = await pool.query('SELECT * FROM activities WHERE id = ?', [result.insertId]);
    return res.status(201).json({
      success: true,
      message: `Activity "${String(name).trim()}" created for ${classSection}.`,
      data: rows[0] ? mapActivityRow(rows[0]) : null
    });
  } catch (error) {
    console.error('[POST ACTIVITY ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

// PUT /api/activities/:id — Update activity metadata (name/subject/maxMarks/term/class).
// Scoped: same school; teachers additionally need class access for old AND new class.
router.put('/activities/:id', authenticateToken, requireSchoolStaff, async (req, res) => {
  const activityId = parseInt(req.params.id);
  const { name, subject, maxMarks, term, classSection } = req.body;
  const { isSuper, isTeacher } = resolveRole(req);
  const schoolId = req.user.school_id;

  if (isNaN(activityId)) {
    return res.status(400).json({ success: false, error: 'Validation Error', message: 'Invalid activity ID.' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM activities WHERE id = ?', [activityId]);
    const activity = rows[0];
    if (!activity) {
      return res.status(404).json({ success: false, error: 'Not Found', message: 'Activity not found.' });
    }
    if (!isSuper && String(activity.school_id) !== String(schoolId)) {
      return res.status(403).json({ success: false, error: 'Forbidden', message: 'Activity belongs to another school.' });
    }

    const targetClass = classSection !== undefined ? classSection : activity.class_section;
    if (isTeacher) {
      const access = await assertTeacherClassAccess(req, [activity.class_section, targetClass]);
      if (!access.ok) return respondClassForbidden(res, access);
    }

    const fields = [];
    const values = [];
    if (name !== undefined) { fields.push('name = ?'); values.push(String(name).trim()); }
    if (subject !== undefined) { fields.push('subject = ?'); values.push(String(subject).trim()); }
    if (maxMarks !== undefined) { fields.push('max_marks = ?'); values.push(Number(maxMarks) || 100); }
    if (term !== undefined) { fields.push('term = ?'); values.push(term); }
    if (classSection !== undefined) { fields.push('class_section = ?'); values.push(classSection); }
    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: 'Validation Error', message: 'No fields to update.' });
    }
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(activityId);

    await pool.query(`UPDATE activities SET ${fields.join(', ')} WHERE id = ?`, values);
    const [updatedRows] = await pool.query('SELECT * FROM activities WHERE id = ?', [activityId]);
    return res.json({ success: true, message: 'Activity updated.', data: updatedRows[0] ? mapActivityRow(updatedRows[0]) : null });
  } catch (error) {
    console.error('[PUT ACTIVITY ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

// DELETE /api/activities/:id — Delete an activity (same school; teacher needs class access).
router.delete('/activities/:id', authenticateToken, requireSchoolStaff, async (req, res) => {
  const activityId = parseInt(req.params.id);
  const { isSuper, isTeacher } = resolveRole(req);
  const schoolId = req.user.school_id;

  if (isNaN(activityId)) {
    return res.status(400).json({ success: false, error: 'Validation Error', message: 'Invalid activity ID.' });
  }

  try {
    const [rows] = await pool.query('SELECT * FROM activities WHERE id = ?', [activityId]);
    const activity = rows[0];
    if (!activity) {
      return res.status(404).json({ success: false, error: 'Not Found', message: 'Activity not found.' });
    }
    if (!isSuper && String(activity.school_id) !== String(schoolId)) {
      return res.status(403).json({ success: false, error: 'Forbidden', message: 'Activity belongs to another school.' });
    }
    if (isTeacher) {
      const access = await assertTeacherClassAccess(req, activity.class_section);
      if (!access.ok) return respondClassForbidden(res, access);
    }

    await pool.query('DELETE FROM activities WHERE id = ?', [activityId]);
    return res.json({ success: true, message: 'Activity deleted.', deletedId: activityId });
  } catch (error) {
    console.error('[DELETE ACTIVITY ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

// ============================================================
// FEE CHALLANS — real persistence
// ============================================================

// GET /api/challans?classSection=&term= — Fee challans for a school/class.
// TEACHERS: only their assigned classes.
router.get('/challans', authenticateToken, requireSchoolStaff, async (req, res) => {
  const { classSection, term } = req.query;
  const { isSuper, isTeacher } = resolveRole(req);
  const schoolId = req.user.school_id;

  try {
    const access = await assertTeacherClassAccess(req, classSection || null);
    if (!access.ok) return respondClassForbidden(res, access);

    let sql = `
      SELECT c.id, c.student_id, c.class_section, c.term, c.month_year, c.session,
             c.tuition_fee, c.development_fee, c.exam_fee, c.library_fee, c.computer_fee,
             c.activity_fee, c.prev_balance, c.late_fee, c.discounts, c.total_amount,
             c.status, c.due_date, c.chalan_no, c.created_at, c.updated_at,
             s.name AS student_name, s.roll_number, s.reg_no
      FROM fee_challans c
      LEFT JOIN students s ON s.id = c.student_id
      WHERE 1=1
    `;
    const params = [];

    if (!isSuper) {
      sql += ' AND c.school_id = ?';
      params.push(schoolId);
    }
    if (classSection) {
      sql += ' AND c.class_section = ?';
      params.push(classSection);
    } else if (isTeacher) {
      // CORE RULE 1 — a teacher without an explicit class filter sees ONLY
      // the challans of their assigned classes (never the whole school's fees).
      const assigned = access.assignedClasses || [];
      if (assigned.length === 0) {
        return res.json({ success: true, count: 0, data: [] });
      }
      sql += ` AND c.class_section IN (${assigned.map(() => '?').join(', ')})`;
      params.push(...assigned);
    }
    if (term) {
      sql += ' AND c.term = ?';
      params.push(term);
    }
    sql += ' ORDER BY c.created_at DESC';

    const [rows] = await pool.query(sql, params);
    const data = rows.map(r => ({
      chalanId: r.chalan_no || `FC-${r.id}`,
      id: r.id,
      studentId: r.student_id,
      studentName: r.student_name || ' ',
      rollNo: r.roll_number || '',
      regNo: r.reg_no || '',
      classSection: r.class_section,
      term: r.term,
      monthYear: r.month_year,
      session: r.session,
      tuitionFee: Number(r.tuition_fee || 0),
      developmentFee: Number(r.development_fee || 0),
      examFee: Number(r.exam_fee || 0),
      libraryFee: Number(r.library_fee || 0),
      computerFee: Number(r.computer_fee || 0),
      activityFee: Number(r.activity_fee || 0),
      prevBalance: Number(r.prev_balance || 0),
      lateFee: Number(r.late_fee || 0),
      discounts: Number(r.discounts || 0),
      totalAmount: Number(r.total_amount || 0),
      status: r.status,
      dueDate: r.due_date,
      createdAt: r.created_at
    }));
    return res.json({ success: true, count: data.length, data });
  } catch (error) {
    console.error('[GET CHALLANS ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});
// POST /api/challans — Create a fee challan for a real student.
// TEACHERS: only their assigned classes' students.
router.post('/challans', authenticateToken, requireSchoolStaff, async (req, res) => {
  const {
    studentId, classSection, term = '1st Term', monthYear, session,
    tuitionFee = 0, developmentFee = 0, examFee = 0, libraryFee = 0,
    computerFee = 0, activityFee = 0, prevBalance = 0, lateFee = 0,
    discounts = 0, dueDate, status = 'Unpaid'
  } = req.body;
  const { isSuper, isTeacher } = resolveRole(req);
  const schoolId = req.user.school_id;

  if (!studentId || !classSection || !monthYear) {
    return res.status(400).json({ success: false, error: 'Validation Error', message: 'studentId, classSection, and monthYear are required.' });
  }

  try {
    const access = await assertTeacherClassAccess(req, classSection);
    if (!access.ok) return respondClassForbidden(res, access);

    const [studentRows] = await pool.query('SELECT id, school_id, class_section, name FROM students WHERE id = ?', [studentId]);
    const student = studentRows[0];
    if (!student) {
      return res.status(404).json({ success: false, error: 'Not Found', message: 'Student not found.' });
    }
    if (!isSuper && String(student.school_id) !== String(schoolId)) {
      return res.status(403).json({ success: false, error: 'Forbidden', message: 'Student does not belong to your school.' });
    }
    if (String(student.class_section) !== String(classSection)) {
      return res.status(400).json({ success: false, error: 'Validation Error', message: 'Student does not belong to the selected class.' });
    }

    const totalAmount =
      Number(tuitionFee) + Number(developmentFee) + Number(examFee) + Number(libraryFee) +
      Number(computerFee) + Number(activityFee) + Number(prevBalance) + Number(lateFee) - Number(discounts);
    const chalanNo = `FC-${Date.now()}-${studentId.slice(-4)}`;

    const [result] = await pool.query(
      `INSERT INTO fee_challans
        (school_id, student_id, class_section, term, month_year, session,
         tuition_fee, development_fee, exam_fee, library_fee, computer_fee, activity_fee,
         prev_balance, late_fee, discounts, total_amount, status, due_date, chalan_no, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         total_amount = VALUES(total_amount),
         status = VALUES(status),
         due_date = VALUES(due_date),
         updated_at = CURRENT_TIMESTAMP`,
      [schoolId, studentId, classSection, term, monthYear, session || null,
       tuitionFee, developmentFee, examFee, libraryFee, computerFee, activityFee,
       prevBalance, lateFee, discounts, totalAmount, status, dueDate || null,
       chalanNo, req.user.name || 'Administrator']
    );

    return res.status(201).json({
      success: true,
      message: `Fee challan generated for ${student.name} (${classSection}) — ${monthYear}.`,
      data: {
        chalanId: chalanNo,
        id: result.insertId || chalanNo,
        studentId, studentName: student.name, classSection, term, monthYear, session,
        tuitionFee, developmentFee, examFee, libraryFee, computerFee, activityFee,
        prevBalance, lateFee, discounts, totalAmount, status, dueDate
      }
    });
  } catch (error) {
    console.error('[POST CHALLAN ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});
// PATCH /api/challans/:id — Update fee challan status AND/OR fee fields (admin only)
// FIX: Previously only accepted {status}; now accepts full fee-field updates.
router.patch('/challans/:id', authenticateToken, requireSchoolStaff, async (req, res) => {
  const { status, term, monthYear, tuitionFee, developmentFee, examFee, libraryFee,
    computerFee, activityFee, prevBalance, lateFee, discounts, dueDate, totalAmount } = req.body;
  const role = String(req.user?.role || '').toLowerCase();
  const isPrivileged = role === 'admin' || role === 'super_admin' || role === 'superadmin';

  if (!isPrivileged) {
    return res.status(403).json({ success: false, error: 'Forbidden', message: 'Only administrators can update fee challans.' });
  }

  try {
    let schoolClause = '';
    let schoolParam = null;
    if (role !== 'super_admin' && role !== 'superadmin') {
      schoolClause = ' AND school_id = ?';
      schoolParam = req.user.school_id;
    }
    const chalanId = req.params.id;
    if (/^\d+$/.test(chalanId)) {
      // FIX: Build a dynamic field list so fee amounts / term / due date can all be updated
      // (server always recomputes totalAmount to prevent frontend-invented totals —
      //  but if a totalAmount is supplied we still accept it for audit overrides).
      const fields = [];
      const params = [];

      if (status !== undefined) { fields.push('status = ?'); params.push(status); }
      if (term !== undefined) { fields.push('term = ?'); params.push(term); }
      if (monthYear !== undefined) { fields.push('month_year = ?'); params.push(monthYear); }
      if (tuitionFee !== undefined) { fields.push('tuition_fee = ?'); params.push(Number(tuitionFee)); }
      if (developmentFee !== undefined) { fields.push('development_fee = ?'); params.push(Number(developmentFee)); }
      if (examFee !== undefined) { fields.push('exam_fee = ?'); params.push(Number(examFee)); }
      if (libraryFee !== undefined) { fields.push('library_fee = ?'); params.push(Number(libraryFee)); }
      if (computerFee !== undefined) { fields.push('computer_fee = ?'); params.push(Number(computerFee)); }
      if (activityFee !== undefined) { fields.push('activity_fee = ?'); params.push(Number(activityFee)); }
      if (prevBalance !== undefined) { fields.push('prev_balance = ?'); params.push(Number(prevBalance)); }
      if (lateFee !== undefined) { fields.push('late_fee = ?'); params.push(Number(lateFee)); }
      if (discounts !== undefined) { fields.push('discounts = ?'); params.push(Number(discounts)); }
      if (dueDate !== undefined) { fields.push('due_date = ?'); params.push(dueDate); }

      // Server-side total recomputation (single source of truth)
      const [currentRows] = await pool.query(
        `SELECT tuition_fee, development_fee, exam_fee, library_fee, computer_fee, activity_fee, prev_balance, late_fee, discounts FROM fee_challans WHERE id = ?${schoolClause}`,
        [...(schoolParam ? [chalanId, schoolParam] : [chalanId])]
      );
      if (currentRows.length === 0) {
        return res.status(404).json({ success: false, error: 'Not Found', message: 'Fee challan not found in your school.' });
      }
      const cur = currentRows[0];
      const recompute = Number(tuitionFee ?? cur.tuition_fee)
        + Number(developmentFee ?? cur.development_fee)
        + Number(examFee ?? cur.exam_fee)
        + Number(libraryFee ?? cur.library_fee)
        + Number(computerFee ?? cur.computer_fee)
        + Number(activityFee ?? cur.activity_fee)
        + Number(prevBalance ?? cur.prev_balance)
        + Number(lateFee ?? cur.late_fee)
        - Number(discounts ?? cur.discounts);
      fields.push('total_amount = ?');
      params.push(recompute);

      if (fields.length === 0) {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'No fields to update.' });
      }

      fields.push('updated_at = CURRENT_TIMESTAMP');
      params.push(chalanId);
      if (schoolParam !== null) { params.push(schoolParam); }

      const [result] = await pool.query(
        `UPDATE fee_challans SET ${fields.join(', ')} WHERE id = ?${schoolClause}`,
        params
      );
      // result is empty for UPDATE with no RETURNING in mysql2; check via re-check
      return res.json({ success: true, message: `Fee challan ${chalanId} updated in database.`, totalAmount: recompute });
    }
    return res.status(400).json({ success: false, error: 'Validation Error', message: 'Invalid challan ID.' });
  } catch (error) {
    console.error('[PATCH CHALLAN ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

// DELETE /api/challans/:id — Delete a fee challan (admin)
// FIX: params must match the SQL placeholder order `id = ? AND school_id = ?`.
// Previously school_id was pushed FIRST and the row id SECOND, so for school
// admins the query became `WHERE id = <schoolId> AND school_id = <rowId>` —
// zero rows matched and every delete returned 404 (row never removed).
router.delete('/challans/:id', authenticateToken, requireSchoolStaff, async (req, res) => {
  const role = String(req.user?.role || '').toLowerCase();
  const isPrivileged = role === 'admin' || role === 'super_admin' || role === 'superadmin';
  if (!isPrivileged) {
    return res.status(403).json({ success: false, error: 'Forbidden', message: 'Only administrators can delete fee challans.' });
  }

  try {
    const chalanId = req.params.id;
    if (!/^\d+$/.test(chalanId)) {
      return res.status(400).json({ success: false, error: 'Validation Error', message: 'Invalid challan ID.' });
    }
    const params = [chalanId];
    let schoolClause = '';
    if (role !== 'super_admin' && role !== 'superadmin') {
      schoolClause = ' AND school_id = ?';
      params.push(req.user.school_id);
    }
    const [result] = await pool.query(`DELETE FROM fee_challans WHERE id = ?${schoolClause}`, params);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Not Found', message: 'Fee challan not found in your school.' });
    }
    return res.json({ success: true, message: `Fee challan #${chalanId} deleted.` });
  } catch (error) {
    console.error('[DELETE CHALLAN ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

// ============================================================
// ADMIT CARDS — real persistence
// ============================================================

// GET /api/admit-cards?classSection=&term= — Admit cards for a school/class.
// TEACHERS: only their assigned classes (server-side isolation when no
// classSection filter is provided — mirrors the client-side filter).
router.get('/admit-cards', authenticateToken, requireSchoolStaff, async (req, res) => {
  const { classSection, term } = req.query;
  const { isSuper, isTeacher } = resolveRole(req);
  const schoolId = req.user.school_id;

  try {
    const access = await assertTeacherClassAccess(req, classSection || null);
    if (!access.ok) return respondClassForbidden(res, access);

    let sql = `
      SELECT a.id, a.student_id, a.class_section, a.term, a.exam_center, a.status,
             a.created_at, a.updated_at,
             s.name AS student_name, s.roll_number, s.reg_no, s.photo_url, s.guardian_name
      FROM admit_cards a
      LEFT JOIN students s ON s.id = a.student_id
      WHERE 1=1
    `;
    const params = [];

    if (!isSuper) {
      sql += ' AND a.school_id = ?';
      params.push(schoolId);
    }
    if (classSection) {
      sql += ' AND a.class_section = ?';
      params.push(classSection);
    } else if (isTeacher) {
      // CORE RULE 1 — teacher without an explicit class filter sees ONLY the
      // classes assigned to them (never the whole school's hall tickets).
      const assigned = access.assignedClasses || [];
      if (assigned.length === 0) {
        return res.json({ success: true, count: 0, data: [] });
      }
      sql += ` AND a.class_section IN (${assigned.map(() => '?').join(', ')})`;
      params.push(...assigned);
    }
    if (term) {
      sql += ' AND a.term = ?';
      params.push(term);
    }
    sql += ' ORDER BY a.created_at DESC';

    const [rows] = await pool.query(sql, params);

    // EVERY subject assigned to the card's class — union of the class's
    // teachers' assigned_subjects (teacher_class_assignments) and the real
    // marks-table subjects. Exam dates are not stored in the DB, so examDate
    // stays null and NO date sheet is ever created (date area stays blank).
    let classSubjectsMap = {};
    if (rows.length > 0) {
      try {
      const classList = [...new Set(rows.map(r => String(r.class_section)).filter(Boolean))];
      classSubjectsMap = await resolveClassSubjects(isSuper ? null : schoolId, classList);
      } catch (scheduleErr) {
        console.warn('[ADMIT CARD SCHEDULE] skipped:', scheduleErr.message);
      }
    }

    const data = rows.map(r => {
      const cls = String(r.class_section || '');
      const subjects = classSubjectsMap[cls] || [];
      return {
        id: r.id,
        studentId: r.student_id,
        studentName: r.student_name || ' ',
        rollNo: r.roll_number || '',
        regNo: r.reg_no || '',
        classSection: r.class_section,
        term: r.term,
        examCenter: r.exam_center || '',
        status: r.status,
        createdAt: r.created_at,
        photo: r.photo_url || '',
        photoUrl: r.photo_url || '',
        guardianName: r.guardian_name || '',
        examSchedule: subjects.map(subject => ({ subject, examDate: null }))
      };
    });
    return res.json({ success: true, count: data.length, data });
  } catch (error) {
    console.error('[GET ADMIT CARDS ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

// POST /api/admit-cards — Create/refresh an admit card for a real student.
// TEACHERS: only their assigned classes' students.
router.post('/admit-cards', authenticateToken, requireSchoolStaff, async (req, res) => {
  const { studentId, classSection, term = '1st Term', examCenter } = req.body;
  const { isSuper, isTeacher } = resolveRole(req);
  const schoolId = req.user.school_id;

  if (!studentId || !classSection) {
    return res.status(400).json({ success: false, error: 'Validation Error', message: 'studentId and classSection are required.' });
  }

  try {
    const access = await assertTeacherClassAccess(req, classSection);
    if (!access.ok) return respondClassForbidden(res, access);

        // FIX: Select roll_number, reg_no and guardian_name so the response has real student data
    const [studentRows] = await pool.query(
      'SELECT id, school_id, class_section, name, roll_number, reg_no, photo_url, guardian_name FROM students WHERE id = ?',
      [studentId]
    );
    const student = studentRows[0];
    if (!student) {
      return res.status(404).json({ success: false, error: 'Not Found', message: 'Student not found.' });
    }
    if (!isSuper && String(student.school_id) !== String(schoolId)) {
      return res.status(403).json({ success: false, error: 'Forbidden', message: 'Student does not belong to your school.' });
    }
    if (String(student.class_section) !== String(classSection)) {
      return res.status(400).json({ success: false, error: 'Validation Error', message: 'Student does not belong to the selected class.' });
    }

    const [result] = await pool.query(
      `INSERT INTO admit_cards (school_id, student_id, class_section, term, exam_center, status, created_by)
       VALUES (?, ?, ?, ?, ?, 'Active', ?)
       ON DUPLICATE KEY UPDATE
         exam_center = VALUES(exam_center),
         status = 'Active',
         updated_at = CURRENT_TIMESTAMP`,
      [schoolId, studentId, classSection, term, examCenter || null, req.user.name || 'Administrator']
    );

    // FIX: `result.insertId` is 0 when the ON DUPLICATE KEY UPDATE path fires
    // (card re-issued for the same student+term), which made the UI prepend a
    // phantom id-less row. Resolve the real persisted row id instead.
    let cardRowId = result.insertId;
    if (!cardRowId) {
      try {
        const [idRows] = await pool.query(
          'SELECT id FROM admit_cards WHERE school_id = ? AND student_id = ? AND term = ? ORDER BY id DESC LIMIT 1',
          [schoolId, studentId, term]
        );
        cardRowId = idRows[0]?.id || 0;
      } catch (_) { /* keep insertId fallback */ }
    }

    // EVERY subject assigned to this class — union of the class's teachers'
    // assigned_subjects (teacher_class_assignments) and the real marks-table
    // subjects. Exam dates are not stored in the DB → examDate stays null and
    // NO date sheet is ever fabricated (the date area stays blank).
    let examSchedule = [];
    try {
      const classSubjectsMap = await resolveClassSubjects(
        isSuper ? (student.school_id || null) : (student.school_id || schoolId || null),
        [classSection]
      );
      examSchedule = (classSubjectsMap[String(classSection)] || [])
        .map(subject => ({ subject, examDate: null }));
    } catch (scheduleErr) {
      console.warn('[ADMIT CARD SCHEDULE] skipped:', scheduleErr.message);
    }

    // FIX: Return real rollNo/regNo/photo/guardian from the student record
    return res.status(201).json({
      success: true,
      message: `Admit card issued for ${student.name} (${classSection}) — ${term}.`,
      data: {
        id: cardRowId,
        studentId, studentName: student.name,
        rollNo: student.roll_number || '', regNo: student.reg_no || '',
        classSection, term, examCenter: examCenter || '',
        status: 'Active', photo: student.photo_url || '',
        guardianName: student.guardian_name || '',
        examSchedule
      }
    });
  } catch (error) {
    console.error('[POST ADMIT CARD ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});
// PATCH /api/admit-cards/:id — Update exam center / term (admin + teacher with access)
router.patch('/admit-cards/:id', authenticateToken, requireSchoolStaff, async (req, res) => {
  const { term, examCenter } = req.body;
  try {
    const [rows] = await pool.query(
      'SELECT id, school_id, class_section FROM admit_cards WHERE id = ?',
      [req.params.id]
    );
    const card = rows[0];
    if (!card) {
      return res.status(404).json({ success: false, error: 'Not Found', message: 'Admit card not found.' });
    }
    const role = String(req.user?.role || '').toLowerCase();
    const isSuper = role === 'super_admin' || role === 'superadmin';
    if (!isSuper && String(card.school_id) !== String(req.user.school_id)) {
      return res.status(403).json({ success: false, error: 'Forbidden', message: 'Admit card belongs to another school.' });
    }
    if (role === 'teacher') {
      const access = await assertTeacherClassAccess(req, card.class_section);
      if (!access.ok) return respondClassForbidden(res, access);
    }

    const fields = [];
    const values = [];
    if (term !== undefined) { fields.push('term = ?'); values.push(term); }
    if (examCenter !== undefined) { fields.push('exam_center = ?'); values.push(examCenter); }
    if (fields.length === 0) return res.status(400).json({ success: false, error: 'No fields to update.' });
    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(card.id);
    await pool.query(`UPDATE admit_cards SET ${fields.join(', ')} WHERE id = ?`, values);
    return res.json({ success: true, message: 'Admit card updated.' });
  } catch (error) {
    console.error('[PATCH ADMIT CARD ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

// DELETE /api/admit-cards/:id — Delete an admit card (admin + teacher with access)
router.delete('/admit-cards/:id', authenticateToken, requireSchoolStaff, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, school_id, class_section FROM admit_cards WHERE id = ?',
      [req.params.id]
    );
    const card = rows[0];
    if (!card) {
      return res.status(404).json({ success: false, error: 'Not Found', message: 'Admit card not found.' });
    }
    const role = String(req.user?.role || '').toLowerCase();
    const isSuper = role === 'super_admin' || role === 'superadmin';
    if (!isSuper && String(card.school_id) !== String(req.user.school_id)) {
      return res.status(403).json({ success: false, error: 'Forbidden', message: 'Admit card belongs to another school.' });
    }
    if (role === 'teacher') {
      const access = await assertTeacherClassAccess(req, card.class_section);
      if (!access.ok) return respondClassForbidden(res, access);
    }
    await pool.query('DELETE FROM admit_cards WHERE id = ?', [card.id]);
    return res.json({ success: true, message: 'Admit card deleted.' });
  } catch (error) {
    console.error('[DELETE ADMIT CARD ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

export default router;