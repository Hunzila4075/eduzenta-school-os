import pool from '../config/db.js';

// ============================================================
// CORE RULE 1 — TEACHER CLASS ISOLATION (server-side enforcement)
//
// teacher_class_assignments is the SINGLE SOURCE OF TRUTH for what
// classes a teacher may access. Every teacher-facing query in the
// API validates against this table. Admins/Super Admins are scoped
// by school_id only (existing behaviour preserved).
// ============================================================

// Resolve a teacher's assigned classes from the database (never from
// the request payload — request-supplied assignments are ignored).
export async function getTeacherAssignedClasses(teacherUserId) {
  if (!teacherUserId) return [];
  try {
    const [rows] = await pool.query(
      'SELECT class_section FROM teacher_class_assignments WHERE teacher_user_id = ? ORDER BY class_section ASC',
      [teacherUserId]
    );
    return rows.map(r => r.class_section);
  } catch (err) {
    console.error('[TEACHER CLASSES LOOKUP ERROR]:', err.message);
    // Fail CLOSED: if the lookup errors, a teacher gets NO classes.
    return [];
  }
}

// Validate access for the given class section(s). Returns:
//   { ok, isTeacher, assignedClasses, status?, message? }
//   - ok:false → respond with status (403) immediately.
//   - isTeacher && requested empty → caller MUST scope results to assignedClasses.
export async function assertTeacherClassAccess(req, requestedClassSections) {
  const role = String(req.user?.role || '').toLowerCase();
  if (role !== 'teacher') {
    return { ok: true, isTeacher: false, assignedClasses: null };
  }

  const assigned = await getTeacherAssignedClasses(req.user.id);
  const requested = (Array.isArray(requestedClassSections) ? requestedClassSections : [requestedClassSections])
    .filter(c => c !== undefined && c !== null && String(c).trim() !== '');

  if (requested.length > 0) {
    const assignedSet = new Set(assigned);
    const unauthorized = requested.find(c => !assignedSet.has(String(c)));
    if (unauthorized !== undefined) {
      return {
        ok: false,
        isTeacher: true,
        assignedClasses: assigned,
        status: 403,
        message: `Access denied: class "${String(unauthorized)}" is not assigned to you.`
      };
    }
  }

  return { ok: true, isTeacher: true, assignedClasses: assigned };
}

// SQL fragment that scopes a query to the teacher's assigned classes.
// Returns { clause, params, empty } — empty:true means the teacher has no
// assignments and must receive zero rows (never another class's data).
export function teacherClassScope(access) {
  if (!access?.isTeacher) return { clause: '', params: [], empty: false };
  const classes = access.assignedClasses || [];
  if (classes.length === 0) return { clause: ' AND 1=0', params: [], empty: true };
  return {
    clause: ` AND class_section IN (${classes.map(() => '?').join(', ')})`,
    params: classes,
    empty: false
  };
}

// Standard 403 response for unauthorized class access.
export function respondClassForbidden(res, access) {
  const hasAssignments = (access?.assignedClasses || []).length > 0;
  return res.status(403).json({
    success: false,
    error: 'Forbidden',
    message: hasAssignments
      ? (access.message || 'Access denied: this class is not assigned to you.')
      : 'Access denied: no classes are assigned to your account yet. Please contact your administrator.'
  });
}

// Verify a class exists in a school's class catalog.
// The classes table has no school_id column, so we use the
// teacher_class_assignments relationship (school_id ↔ class_section)
// as the single source of truth for what classes belong to a school.
// Accepts the full class_section string, e.g. "Class 10-A" or "Class 6".
export async function classExistsInCatalog(schoolId, classSection) {
  if (!classSection || !schoolId) return false;
  try {
    const [rows] = await pool.query(
      'SELECT class_section FROM teacher_class_assignments WHERE school_id = ? AND class_section = ? LIMIT 1',
      [schoolId, classSection]
    );
    return rows.length > 0;
  } catch (_) {
    return false;
  }
}

// Parse "Class 10-A" → { className: "Class 10", section: "A" }
export function parseClassSection(classSection) {
  const raw = String(classSection || '').trim();
  const dashIdx = raw.indexOf('-');
  if (dashIdx > -1) {
    return { className: raw.slice(0, dashIdx).trim(), section: raw.slice(dashIdx + 1).trim() };
  }
  return { className: raw, section: '' };
}
