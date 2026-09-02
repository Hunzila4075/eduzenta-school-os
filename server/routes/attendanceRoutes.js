import express from 'express';
import pool from '../config/db.js';
import { authenticateToken, requireSchoolStaff } from '../middleware/authMiddleware.js';
import { assertTeacherClassAccess, teacherClassScope, respondClassForbidden } from '../middleware/teacherAccess.js';

const router = express.Router();


function resolveRole(req) {
  const role = String(req.user?.role || '').toLowerCase();
  return {
    role,
    isSuper: role === 'super_admin' || role === 'superadmin',
    isTeacher: role === 'teacher'
  };
}

// Attendance DATE display fix.
// mysql2 (default config) converts MySQL DATE columns into JS Date objects at
// LOCAL midnight (new Date(y, m-1, d)). res.json() then serializes them to UTC
// ISO strings, so in any positive-UTC-offset timezone (e.g. UTC+5) a record
// stored as 2026-09-02 is sent back as "2026-09-01T19:00:00.000Z" — a one-day
// shift that made Attendance History show 01/Sep for a 02/Sep record. This
// helper rebuilds the exact stored YYYY-MM-DD from the LOCAL calendar components
// (or passes an already-string date through), so the API always returns the
// date exactly as stored with no timezone conversion.
function toDateOnlyString(value) {
  if (value == null) return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return String(value).slice(0, 10);
}

// GET /api/attendance — Fetch attendance records scoped to authenticated user's school.
// TEACHERS: hard-scoped to their assigned classes (server-side).
router.get('/', authenticateToken, requireSchoolStaff, async (req, res) => {
  const { classSection, date, from, to } = req.query;
  const { isSuper, isTeacher } = resolveRole(req);
  const schoolId = req.user.school_id;

  try {
    // CORE RULE 1 — teacher isolation (403 on unassigned class access)
    const access = await assertTeacherClassAccess(req, classSection);
    if (!access.ok) return respondClassForbidden(res, access);

    let sql = `SELECT id, student_id, class_section, date, status, marked_by, is_locked, created_at FROM attendance WHERE 1=1`;
    const params = [];

    // School isolation: attendance table has no school_id column.
    // Use the teacher_class_assignments relationship (school_id ↔ class_section).
    if (!isSuper && schoolId) {
      sql += ' AND class_section IN (SELECT class_section FROM teacher_class_assignments WHERE school_id = ?)';
      params.push(schoolId);
    }

    if (isTeacher) {
      const scope = teacherClassScope(access);
      if (scope.empty) {
        return res.json({ success: true, count: 0, data: [], message: 'No classes assigned yet — contact your administrator.' });
      }
      sql += scope.clause;
      params.push(...scope.params);
    }

    if (classSection && !isTeacher) {
      sql += ' AND class_section = ?';
      params.push(classSection);
    }
    if (date) {
      sql += ' AND date = ?';
      params.push(date);
    }
    if (from) {
      sql += ' AND date >= ?';
      params.push(from);
    }
    if (to) {
      sql += ' AND date <= ?';
      params.push(to);
    }

    sql += ' ORDER BY date DESC, student_id ASC';

    const [rows] = await pool.query(sql, params);
    const formatted = rows.map(r => ({
      id: r.id,
      studentId: r.student_id,
      classSection: r.class_section,
      date: toDateOnlyString(r.date),
      status: r.status,
      markedBy: r.marked_by,
      isLocked: r.is_locked === 1 || r.is_locked === true,
      createdAt: r.created_at
    }));

    return res.json({ success: true, count: formatted.length, data: formatted });
  } catch (error) {
    console.error('[ATTENDANCE API ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

// GET /api/attendance/history — Class-based attendance history with filters.
// TEACHERS: classSection is mandatory and must be one of their assigned
// classes (403 otherwise). ADMINS: any class within their own school.
// SUPER ADMIN: any class.
router.get('/history', authenticateToken, requireSchoolStaff, async (req, res) => {
  const { classSection, from, to, status, studentId, q } = req.query;
  const { isSuper, isTeacher } = resolveRole(req);
  const schoolId = req.user.school_id;
  const page = Math.max(1, parseInt(req.query.page, 10) || 1);
  const pageSize = Math.min(200, Math.max(10, parseInt(req.query.pageSize, 10) || 50));

  try {
    // CORE RULE 1 — teachers MUST pass an assigned class
    const access = await assertTeacherClassAccess(req, classSection || null);
    if (!access.ok) return respondClassForbidden(res, access);

    if (isTeacher && !classSection) {
      return res.status(400).json({ success: false, error: 'Validation Error', message: 'Class selection is required.' });
    }
    if (!isTeacher && !isSuper && !schoolId) {
      return res.status(400).json({ success: false, error: 'Validation Error', message: 'No school context for this account.' });
    }

    let where = 'WHERE 1=1';
    const params = [];

    // School isolation: attendance table has no school_id column.
    // Use the teacher_class_assignments relationship (school_id ↔ class_section)
    // to enforce strict tenant isolation.
    if (!isSuper && schoolId) {
      where += ' AND a.class_section IN (SELECT class_section FROM teacher_class_assignments WHERE school_id = ?)';
      params.push(schoolId);
    }
    if (classSection) {
      where += ' AND a.class_section = ?';
      params.push(classSection);
    }
    if (from) {
      where += ' AND a.date >= ?';
      params.push(from);
    }
    if (to) {
      where += ' AND a.date <= ?';
      params.push(to);
    }
    if (status) {
      where += ' AND a.status = ?';
      params.push(status);
    }
    if (studentId) {
      where += ' AND a.student_id = ?';
      params.push(studentId);
    }
    if (q) {
      where += ' AND (s.name LIKE ? OR s.roll_number LIKE ? OR s.reg_no LIKE ?)';
      const like = `%${q}%`;
      params.push(like, like, like);
    }

    // Count first (small response), then one targeted page of rows
    const [countRows] = await pool.query(
      `SELECT COUNT(*) AS total FROM attendance a LEFT JOIN students s ON s.id = a.student_id ${where}`,
      params
    );
    const total = countRows[0]?.total || 0;

    const dataSql = `
      SELECT a.id, a.student_id, a.class_section, a.date, a.status, a.marked_by, a.is_locked,
             s.name AS student_name, s.roll_number, s.reg_no
      FROM attendance a
      LEFT JOIN students s ON s.id = a.student_id
      ${where}
      ORDER BY a.date DESC, s.name ASC
      LIMIT ? OFFSET ?
    `;
    const [rows] = await pool.query(dataSql, [...params, pageSize, (page - 1) * pageSize]);

    const data = rows.map(r => ({
      id: r.id,
      studentId: r.student_id,
      studentName: r.student_name || 'Unknown Student',
      rollNo: r.roll_number || '',
      regNo: r.reg_no || '',
      classSection: r.class_section,
      date: toDateOnlyString(r.date),
      status: r.status,
      markedBy: r.marked_by,
      isLocked: r.is_locked === 1 || r.is_locked === true
    }));

    return res.json({ success: true, page, pageSize, total, count: data.length, data });
  } catch (error) {
    console.error('[ATTENDANCE HISTORY ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

// POST /api/attendance — Bulk upsert class attendance in a SINGLE query (replaces N-query loop)
router.post('/', authenticateToken, requireSchoolStaff, async (req, res) => {
  const { classSection, date, records, markedBy } = req.body;
  if (!classSection || !date || !Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ success: false, error: 'ClassSection, date, and non-empty records array are required.' });
  }

  // Controlled input validation (400 instead of a raw MySQL error / crash):
  //  • date must be a real YYYY-MM-DD value the DATE column accepts
  //  • the batch is bounded to a sane class size to prevent giant queries
  //  • every status must be a valid attendance enum value
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    return res.status(400).json({ success: false, error: 'Validation Error', message: 'date must be a valid YYYY-MM-DD date string.' });
  }
  const MAX_ATTENDANCE_RECORDS = 500;
  if (records.length > MAX_ATTENDANCE_RECORDS) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: `Attendance batch too large (max ${MAX_ATTENDANCE_RECORDS} records per submission).`
    });
  }
  const validStatuses = ['Present', 'Absent', 'Late', 'Excused'];
  const badStatus = records.find(r => r && r.status !== undefined && r.status !== null && String(r.status).trim() !== '' && !validStatuses.includes(String(r.status).trim()));
  if (badStatus) {
    return res.status(400).json({ success: false, error: 'Validation Error', message: `Status must be one of: ${validStatuses.join(', ')}` });
  }

  const { isSuper, isTeacher } = resolveRole(req);
  const schoolId = isSuper ? (req.body.school_id || req.user.school_id) : (req.user.school_id || null);
  const marker = markedBy || req.user.name || 'Teacher';

  let connection = null;
  let attendanceLock = null;
  try {
    // CORE RULE 1 — a teacher may only mark attendance for their assigned classes
    if (isTeacher) {
      const access = await assertTeacherClassAccess(req, classSection);
      if (!access.ok) return respondClassForbidden(res, access);

      // Serialize submissions for the same school/class/date on one MySQL
      // connection. This closes the class-level race while retaining the
      // existing unique student/date key and atomic bulk upsert.
      connection = await pool.getConnection();
      attendanceLock = `attendance:${schoolId}:${date}:${String(classSection).slice(0, 24)}`;
      const [lockRows] = await connection.query('SELECT GET_LOCK(?, 5) AS acquired', [attendanceLock]);
      if (Number(lockRows[0]?.acquired) !== 1) {
        return res.status(409).json({
          success: false,
          error: 'Attendance Busy',
          message: 'Attendance for this class is currently being submitted. Please try again.'
        });
      }
    }
    const db = connection || pool;

    // Hardening: every student in the payload must belong to this school AND
    // this class — a mismatched roster can never be persisted.
    const studentIds = records.map(r => r.studentId).filter(Boolean);
    if (studentIds.length > 0) {
      const placeholders = studentIds.map(() => '?').join(', ');
      const [valid] = await db.query(
        `SELECT id FROM students WHERE id IN (${placeholders}) AND class_section = ?`,
        [...studentIds, classSection]
      );
      if (valid.length !== studentIds.length) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'One or more students do not belong to the selected class. Attendance rejected.'
        });
      }
    }

    // TEACHER LOCK — once attendance for this class+date has been submitted and
    // locked, a teacher can NEVER re-mark it: this is enforced server-side, so
    // refresh, logout/login or direct API calls cannot bypass it. Admins keep
    // their authorized override paths — the bulk admin save may correct locked
    // rows while PRESERVING their locked state, and the single-record
    // PATCH /:id Attendance Override also remains fully functional on locked rows.
    if (isTeacher) {
      const [lockedRows] = await db.query(
        `SELECT id FROM attendance WHERE class_section = ? AND date = ? AND is_locked = 1 LIMIT 1`,
        [classSection, date]
      );
      if (lockedRows.length > 0) {
        return res.status(403).json({
          success: false,
          error: 'Attendance Locked',
          message: 'Attendance for this class and date is already submitted and locked. Only administrators can modify it via Attendance Override.'
        });
      }
    }

    // Teacher submission is atomic: save + lock in the same write (checked = Present,
    // unchecked = Absent). Admin bulk saves keep each row's existing locked state.
    const lockSubmission = isTeacher ? true : Boolean(req.body.lock);

    // Build a SINGLE bulk INSERT...ON DUPLICATE KEY UPDATE — O(1) DB round-trips regardless of class size
    const rowValues = records.map(rec => [
      rec.studentId,
      classSection,
      date,
      rec.status || 'Present',
      marker,
      lockSubmission ? 1 : 0
    ]);

    const placeholders = rowValues.map(() => '(?, ?, ?, ?, ?, ?)').join(', ');
    const flatValues = rowValues.flat();

    // Teacher submissions force is_locked = 1 (atomic save+lock). Admin bulk
    // saves preserve each row's existing lock state — an admin correction must
    // never silently unlock a locked teacher session.
    const lockUpdateExpr = isTeacher ? 'VALUES(is_locked)' : 'attendance.is_locked';

    // CONCURRENCY SAFETY — for teacher submissions, a row that is ALREADY
    // locked (e.g. a concurrent identical submission won the race) can never
    // have its status/marker silently overwritten; the lock pre-check above
    // plus this guard makes double-submit races idempotent instead of
    // destructive. Admins keep the existing correction behaviour.
    const statusExpr = isTeacher ? 'IF(attendance.is_locked = 1, attendance.status, VALUES(status))' : 'VALUES(status)';
    const markerExpr = isTeacher ? 'IF(attendance.is_locked = 1, attendance.marked_by, VALUES(marked_by))' : 'VALUES(marked_by)';

    const sql = `
      INSERT INTO attendance (student_id, class_section, date, status, marked_by, is_locked)
      VALUES ${placeholders}
      ON DUPLICATE KEY UPDATE
        status = ${statusExpr},
        marked_by = ${markerExpr},
        is_locked = ${lockUpdateExpr},
        updated_at = CURRENT_TIMESTAMP
    `;

    await db.query(sql, flatValues);

    return res.status(200).json({
      success: true,
      message: `Attendance for ${classSection} on ${date} saved (${records.length} records in 1 query).`,
      count: records.length
    });
  } catch (error) {
    console.error('[ATTENDANCE API POST ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  } finally {
    if (connection) {
      if (attendanceLock) {
        try { await connection.query('SELECT RELEASE_LOCK(?)', [attendanceLock]); } catch (_) { /* connection close also releases it */ }
      }
      connection.release();
    }
  }
});

// PATCH /api/attendance/:id — Admin override of a single attendance record
router.patch('/:id', authenticateToken, requireSchoolStaff, async (req, res) => {
  const recordId = parseInt(req.params.id, 10);
  const { status } = req.body;
  const role = String(req.user?.role || '').toLowerCase();
  const isPrivileged = role === 'admin' || role === 'super_admin' || role === 'superadmin';

  if (!isPrivileged) {
    return res.status(403).json({ success: false, error: 'Forbidden', message: 'Only administrators can override attendance records.' });
  }
  if (isNaN(recordId)) {
    return res.status(400).json({ success: false, error: 'Validation Error', message: 'Invalid attendance record ID.' });
  }

  const validStatuses = ['Present', 'Absent', 'Late', 'Excused'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: 'Validation Error', message: `Status must be one of: ${validStatuses.join(', ')}` });
  }

  try {
    const params = [status, req.user.name || 'Admin Override'];
    // School isolation: attendance table has no school_id column.
    // Use the teacher_class_assignments relationship (school_id ↔ class_section)
    // to enforce strict tenant isolation.
    let schoolClause = '';
    if (role !== 'super_admin' && role !== 'superadmin') {
      schoolClause = ' AND class_section IN (SELECT class_section FROM teacher_class_assignments WHERE school_id = ?)';
    }
    // SQL placeholder order: status, marked_by, id, school_id — params MUST match
    params.push(recordId);
    if (schoolClause) params.push(req.user.school_id);

    const [result] = await pool.query(
      `UPDATE attendance SET status = ?, marked_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?${schoolClause}`,
      params
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Not Found', message: 'Attendance record not found in your school.' });
    }
    return res.json({ success: true, message: `Attendance record #${recordId} updated to ${status}.` });
  } catch (error) {
    console.error('[ATTENDANCE OVERRIDE ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

// DELETE /api/attendance/:id — Admin removal of a single attendance record
router.delete('/:id', authenticateToken, requireSchoolStaff, async (req, res) => {
  const recordId = parseInt(req.params.id, 10);
  const role = String(req.user?.role || '').toLowerCase();
  const isPrivileged = role === 'admin' || role === 'super_admin' || role === 'superadmin';

  if (!isPrivileged) {
    return res.status(403).json({ success: false, error: 'Forbidden', message: 'Only administrators can delete attendance records.' });
  }
  if (isNaN(recordId)) {
    return res.status(400).json({ success: false, error: 'Validation Error', message: 'Invalid attendance record ID.' });
  }

  try {
    const params = [recordId];
    // School isolation: attendance table has no school_id column.
    // Use the teacher_class_assignments relationship (school_id ↔ class_section)
    // to enforce strict tenant isolation.
    let schoolClause = '';
    if (role !== 'super_admin' && role !== 'superadmin') {
      schoolClause = ' AND class_section IN (SELECT class_section FROM teacher_class_assignments WHERE school_id = ?)';
      params.push(req.user.school_id);
    }

    const [result] = await pool.query(`DELETE FROM attendance WHERE id = ?${schoolClause}`, params);
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, error: 'Not Found', message: 'Attendance record not found in your school.' });
    }
    return res.json({ success: true, message: `Attendance record #${recordId} deleted.` });
  } catch (error) {
    console.error('[ATTENDANCE DELETE ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

export default router;


