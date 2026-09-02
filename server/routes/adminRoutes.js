import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../config/db.js';
import { authenticateToken, requireSchoolAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// ------------------------------------------------------------
// POST /api/admin/create-user — Create & Assign New User Account
// Protected by School Admin Auth. Automatically scopes user to school_id
// ------------------------------------------------------------
router.post('/create-user', authenticateToken, requireSchoolAdmin, async (req, res) => {
  const { name, email, password, role, school_id, avatar, avatar_url } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Name, email, password, and role are required.'
    });
  }

  const validRoles = ['admin', 'teacher', 'student', 'parent'];
  if (!validRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
    });
  }

  // Automatically attach requesting admin's school_id (or fallback if provided by super_admin)
  const userRole = String(req.user.role || '').toLowerCase();
  const isSuper = userRole === 'super_admin' || userRole === 'superadmin';
  let targetSchoolId = isSuper ? (school_id || req.user.school_id || null) : (req.user.school_id || school_id || null);

  // DB fallback lookup for creator's school_id if missing in token
  if (!isSuper && !targetSchoolId && req.user.id) {
    try {
      const [creatorRows] = await pool.query('SELECT school_id FROM users WHERE id = ?', [req.user.id]);
      if (creatorRows[0]?.school_id) {
        targetSchoolId = creatorRows[0].school_id;
      }
    } catch (_) { /* fallback ignored */ }
  }

  // Strict Validation: Every non-SuperAdmin user MUST have a valid non-null school_id
  const targetRoleClean = String(role || '').toLowerCase();
  if (!targetSchoolId && targetRoleClean !== 'super_admin' && targetRoleClean !== 'superadmin') {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Creation Failed: Every Admin and Teacher account strictly requires a valid, non-null school_id.'
    });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const targetAvatar = avatar || avatar_url || null;

  try {
    // Hash first, then run INSERT and school-name lookup concurrently — the email
    // UNIQUE index catches duplicates, replacing the pre-SELECT round-trip.
    const hashedPassword = await bcrypt.hash(password, 10);

    const [insertResult, schoolRows] = await Promise.all([
      pool.query(
        `INSERT INTO users (school_id, name, email, password, role, avatar_url, is_active) VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [targetSchoolId, name.trim(), cleanEmail, hashedPassword, role, targetAvatar]
      ),
      targetSchoolId
        ? pool.query('SELECT name FROM schools WHERE id = ?', [targetSchoolId])
        : Promise.resolve([[]])
    ]);
    const schoolName = targetSchoolId ? (schoolRows[0][0]?.name || null) : null;

    return res.status(201).json({
      success: true,
      message: 'User account created successfully.',
      user: {
        id: insertResult[0].insertId,
        school_id: targetSchoolId,
        school_name: schoolName,
        name: name.trim(),
        email: cleanEmail,
        role,
        avatar_url: targetAvatar,
        avatar: targetAvatar,
        is_active: true
      }
    });
  } catch (error) {
    console.error('[CREATE USER ERROR]:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        error: 'Conflict Error',
        message: 'A user with this email address already exists.'
      });
    }
    if (error.code === 'PROTOCOL_CONNECTION_LOST' || error.code === 'ETIMEDOUT') {
      return res.status(504).json({ success: false, error: 'Database Timeout', message: 'Database query timed out.' });
    }
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

// ------------------------------------------------------------
// GET /api/admin/users — List Users Scoped strictly to School ID
// ------------------------------------------------------------
router.get('/users', authenticateToken, requireSchoolAdmin, async (req, res) => {
  try {
    let schoolId = req.user.school_id;
    const userRole = String(req.user.role || '').toLowerCase();
    const isSuper = userRole === 'super_admin' || userRole === 'superadmin';

    if (!isSuper && !schoolId && req.user.id) {
      const [uRows] = await pool.query('SELECT school_id FROM users WHERE id = ?', [req.user.id]);
      if (uRows[0]?.school_id) {
        schoolId = uRows[0].school_id;
      }
    }

    let query = `
      SELECT u.id, u.school_id, u.name, u.email, u.role, u.assigned_subjects,
             CASE WHEN u.avatar_url LIKE 'data:%' THEN NULL ELSE u.avatar_url END AS avatar_url,
             u.is_active, u.created_at, s.name as school_name
      FROM users u
      LEFT JOIN schools s ON s.id = u.school_id
    `;
    let params = [];

    if (!isSuper) {
      if (!schoolId) {
        return res.status(400).json({
          success: false,
          error: 'Validation Error',
          message: 'School Administrator must be linked to a valid school_id.'
        });
      }
      query += ' WHERE u.school_id = ?';
      params.push(schoolId);
    }

    query += ' ORDER BY u.id DESC';

    const [users] = await pool.query(query, params);
    const formattedUsers = users.map(u => ({
      ...u,
      avatar: u.avatar_url
    }));

    // CORE RULE 1 — attach each teacher's live DB-assigned classes (single
    // batched lookup, NOT N+1 — one query for all teachers)
    const teacherIds = formattedUsers.filter(u => String(u.role || '').toLowerCase() === 'teacher').map(u => u.id);
    if (teacherIds.length > 0) {
      const tph = teacherIds.map(() => '?').join(', ');
      const [assignments] = await pool.query(
        `SELECT teacher_user_id, class_section FROM teacher_class_assignments WHERE teacher_user_id IN (${tph}) ORDER BY class_section ASC`,
        teacherIds
      );
      const classMap = {};
      assignments.forEach(a => {
        if (!classMap[a.teacher_user_id]) classMap[a.teacher_user_id] = [];
        classMap[a.teacher_user_id].push(a.class_section);
      });
      formattedUsers.forEach(u => {
        if (classMap[u.id]) {
          u.assignedClasses = classMap[u.id];
          u.assignedSubjects = u.assigned_subjects ? String(u.assigned_subjects).split(',').map(s => s.trim()).filter(Boolean) : [];
        } else if (String(u.role || '').toLowerCase() === 'teacher') {
          u.assignedClasses = [];
          u.assignedSubjects = [];
        }
      });
    }
    return res.json({ success: true, users: formattedUsers });
  } catch (error) {
    console.error('[GET USERS ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

// ------------------------------------------------------------
// GET /api/admin/users/:id/avatar — On-demand avatar fetch.
// Kept out of list payloads (base64 avatars made GET /admin/users a multi-MB response).
// ------------------------------------------------------------
router.get('/users/:id/avatar', authenticateToken, requireSchoolAdmin, async (req, res) => {
  const userId = parseInt(req.params.id);
  if (isNaN(userId)) {
    return res.status(400).json({ success: false, error: 'Validation Error', message: 'Invalid database user ID.' });
  }
  try {
    const role = String(req.user?.role || '').toLowerCase();
    const isSuper = role === 'super_admin' || role === 'superadmin';
    const [rows] = await pool.query('SELECT avatar_url, school_id FROM users WHERE id = ?', [userId]);
    if (!rows[0]) {
      return res.status(404).json({ success: false, error: 'Not Found', message: 'User not found.' });
    }
    // IDOR HARDENING — non-super administrators may only read avatars of users
    // in their own school.
    if (!isSuper && rows[0].school_id && String(rows[0].school_id) !== String(req.user.school_id)) {
      return res.status(403).json({ success: false, error: 'Forbidden', message: 'You can only view users of your own school.' });
    }
    return res.json({ success: true, avatar: rows[0]?.avatar_url || null });
  } catch (error) {
    console.error('[GET USER AVATAR ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});




// ------------------------------------------------------------
// PUT /api/admin/users/:id — Update User / Admin Record by Database ID
// ------------------------------------------------------------
router.put('/users/:id', authenticateToken, requireSchoolAdmin, async (req, res) => {
  const userId = parseInt(req.params.id);
    const { name, email, school_name, schoolName, school_logo_url, schoolLogoUrl, schoolLogo, logo_url, logoUrl, avatar, avatar_url, password, new_password, newPassword, is_active, isActive, assigned_subjects, assignedSubjects } = req.body;

  if (isNaN(userId)) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Invalid database user ID.'
    });
  }

  const cleanName = name ? String(name).trim() : null;
  const cleanEmail = email ? String(email).trim().toLowerCase() : null;
  const targetSchoolName = (school_name || schoolName) ? String(school_name || schoolName).trim() : null;
  const targetSchoolLogo = (school_logo_url || schoolLogoUrl || schoolLogo || logo_url || logoUrl) ? String(school_logo_url || schoolLogoUrl || schoolLogo || logo_url || logoUrl) : null;
  const targetAvatar = avatar || avatar_url || null;
  const targetPassword = password || new_password || newPassword || null;

  try {
    const [existing] = await pool.query(
      'SELECT id, school_id, name, email, role, avatar_url, is_active FROM users WHERE id = ?',
      [userId]
    );
    const user = existing[0];

    if (!user) {
      return res.status(404).json({ success: false, error: 'Not Found', message: 'User record not found.' });
    }

    // IDOR HARDENING — a non-super caller may only manage users of their own
    // school (the target user's school_id must match the caller's), and the
    // Super Admin account can never be modified through this endpoint.
    const callerRoleStr = String(req.user.role || '').toLowerCase();
    const callerIsSuper = callerRoleStr === 'super_admin' || callerRoleStr === 'superadmin';
    const targetRoleStr = String(user.role || '').toLowerCase();
    if (targetRoleStr === 'super_admin' || targetRoleStr === 'superadmin') {
      return res.status(403).json({ success: false, error: 'Forbidden', message: 'Super Admin accounts cannot be modified through this endpoint.' });
    }
    if (!callerIsSuper && user.school_id && String(user.school_id) !== String(req.user.school_id)) {
      return res.status(403).json({ success: false, error: 'Forbidden', message: 'You can only manage accounts belonging to your own school.' });
    }

    // Check email uniqueness if email is being updated
    if (cleanEmail && cleanEmail !== user.email) {
      const [emailConflict] = await pool.query('SELECT id FROM users WHERE email = ? AND id != ?', [cleanEmail, userId]);
      if (emailConflict && emailConflict.length > 0) {
        return res.status(409).json({ success: false, error: 'Conflict Error', message: 'This email address is already in use by another user.' });
      }
    }

    // Build a SINGLE dynamic UPDATE for users table — eliminates 5 serial round-trips
    const userFields = [];
    const userValues = [];

    if (cleanName) { userFields.push('name = ?'); userValues.push(cleanName); }
    if (cleanEmail && cleanEmail !== user.email) { userFields.push('email = ?'); userValues.push(cleanEmail); }
    if (targetAvatar) { userFields.push('avatar_url = ?'); userValues.push(targetAvatar); }
    if (is_active !== undefined || isActive !== undefined) {
      const activeState = (is_active !== undefined) ? (is_active ? 1 : 0) : (isActive ? 1 : 0);
      userFields.push('is_active = ?');
      userValues.push(activeState);
    }
        if (targetPassword) {
      if (String(targetPassword).length < 6) {
        return res.status(400).json({ success: false, error: 'Validation Error', message: 'Password must be at least 6 characters.' });
      }
      const hashedPassword = await bcrypt.hash(String(targetPassword), 10);
      userFields.push('password = ?');
      userValues.push(hashedPassword);
    }
    // FIX: Persist teacher assigned subjects to the users table (issue #4)
    const targetSubjects = assigned_subjects !== undefined ? assigned_subjects
      : (assignedSubjects !== undefined ? assignedSubjects : null);
    if (targetSubjects !== null) {
      const subjectStr = Array.isArray(targetSubjects)
        ? targetSubjects.join(',')
        : String(targetSubjects);
      userFields.push('assigned_subjects = ?');
      userValues.push(subjectStr);
    }

    // Always touch updated_at in the same single query
    userFields.push('updated_at = CURRENT_TIMESTAMP');
    userValues.push(userId);

    const willUpdateUsers = userFields.length > 1;

    // School stage: read current branding, apply the optional branding UPDATE, and
    // return the post-update values — runs CONCURRENTLY with the users UPDATE so the
    // WAN round-trips overlap instead of stacking.
    const schoolStage = (async () => {
      if (!user.school_id) return { name: null, logo_url: null };
      const [sRows] = await pool.query('SELECT name, logo_url FROM schools WHERE id = ?', [user.school_id]);
      const currentSchool = sRows[0] || { name: null, logo_url: null };
      if (!targetSchoolName && !targetSchoolLogo) return currentSchool;

      const schoolFields = [];
      const schoolValues = [];
      if (targetSchoolName) { schoolFields.push('name = ?'); schoolValues.push(targetSchoolName); }
      if (targetSchoolLogo) { schoolFields.push('logo_url = ?'); schoolValues.push(targetSchoolLogo); }
      schoolValues.push(user.school_id);
      await pool.query(`UPDATE schools SET ${schoolFields.join(', ')} WHERE id = ?`, schoolValues);
      return {
        name: targetSchoolName || currentSchool.name,
        logo_url: targetSchoolLogo || currentSchool.logo_url
      };
    })();

    if (willUpdateUsers) {
      await pool.query(`UPDATE users SET ${userFields.join(', ')} WHERE id = ?`, userValues);
    }
    const schoolRow = await schoolStage;

    // Construct the updated user record locally — mirrors the previous joined
    // re-SELECT without spending another WAN round-trip.
    const updatedUser = {
      id: user.id,
      school_id: user.school_id,
      name: cleanName || user.name,
      email: (cleanEmail && cleanEmail !== user.email) ? cleanEmail : user.email,
      role: user.role,
      avatar_url: targetAvatar || user.avatar_url,
      is_active: (is_active !== undefined)
        ? (is_active ? 1 : 0)
        : (isActive !== undefined) ? (isActive ? 1 : 0) : user.is_active,
      school_name: schoolRow?.name ?? null,
            school_logo_url: schoolRow?.logo_url ?? null,
      // FIX: include assigned_subjects so the frontend stays in sync
      assigned_subjects: targetSubjects !== null
        ? (Array.isArray(targetSubjects) ? targetSubjects.join(',') : String(targetSubjects))
        : (user.assigned_subjects || null)
    };

    return res.json({
      success: true,
      message: 'User record updated successfully.',
      user: { ...updatedUser, avatar: updatedUser.avatar_url }
    });
  } catch (error) {
    console.error('[UPDATE USER ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

// ------------------------------------------------------------
// GET /api/admin/classes — List the school's class catalog
// (single source of truth for every class dropdown in the app)
//
// NOTE: The `classes` table has NO `school_id` column.
// The intended design (see initDb.js catalog sync) uses
// `teacher_class_assignments` as the school↔class link.
// We join through it to enforce tenant isolation.
// ------------------------------------------------------------
router.get('/classes', authenticateToken, requireSchoolAdmin, async (req, res) => {
  const role = String(req.user?.role || '').toLowerCase();
  const isSuper = role === 'super_admin' || role === 'superadmin';
  const schoolId = req.user.school_id;

  try {
    let sql;
    const params = [];

    if (isSuper) {
      // Super Admin: global access — return all classes
      sql = `SELECT c.id, c.class_name, c.section, c.created_at
             FROM classes c
             ORDER BY c.class_name ASC, c.section ASC`;
    } else {
      // Admin/Teacher: only classes linked to their school via teacher_class_assignments.
      // Use TCA as the base (LEFT JOIN to classes) so we return all assigned class_sections
      // even if they don't exist in the classes table yet.
      // initDb.js catalog sync (line 493) proves TCA is the intended school↔class link.
      sql = `SELECT DISTINCT
                tca.class_section,
                c.id,
                COALESCE(c.class_name, TRIM(SUBSTRING_INDEX(tca.class_section, '-', 1))) AS class_name,
                COALESCE(c.section, CASE WHEN LOCATE('-', tca.class_section) > 0
                                    THEN TRIM(SUBSTRING_INDEX(tca.class_section, '-', -1))
                                    ELSE NULL END) AS section
             FROM teacher_class_assignments tca
             LEFT JOIN classes c
               ON tca.class_section = CONCAT(c.class_name, '-', c.section)
                  OR tca.class_section = c.class_name
             WHERE tca.school_id = ?
             ORDER BY class_name ASC, section ASC`;
      params.push(schoolId);
    }

    const [rows] = await pool.query(sql, params);
    const data = rows.map(r => ({
      id: r.id || null, // null if class doesn't exist in classes table yet
      schoolId: schoolId || null,
      className: r.class_name,
      section: r.section,
      classSection: r.class_section || `${r.class_name}${r.section ? `-${r.section}` : ''}`
    }));
    return res.json({ success: true, count: data.length, data });
  } catch (error) {
    console.error('[GET CLASSES ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  }
});

// ------------------------------------------------------------
// POST /api/admin/classes — Create a class in the school's catalog
// ------------------------------------------------------------
router.post('/classes', authenticateToken, requireSchoolAdmin, async (req, res) => {
  const { class_name, className, section, classSection } = req.body;
  const role = String(req.user?.role || '').toLowerCase();
  const isSuper = role === 'super_admin' || role === 'superadmin';
  const schoolId = isSuper ? (req.body.school_id || req.user.school_id) : (req.user.school_id || null);

  let parsedSection = String(section || '').trim();
  let parsedClassName = String(class_name || className || '').trim();
  if (!parsedClassName && classSection) {
    const dashIdx = String(classSection).indexOf('-');
    if (dashIdx > -1) {
      parsedClassName = String(classSection).slice(0, dashIdx).trim();
      parsedSection = String(classSection).slice(dashIdx + 1).trim();
    } else {
      parsedClassName = String(classSection).trim();
    }
  }

  if (!parsedClassName) {
    return res.status(400).json({ success: false, error: 'Validation Error', message: 'Class name is required.' });
  }
  if (!schoolId) {
    return res.status(400).json({ success: false, error: 'Validation Error', message: 'A school is required to create a class.' });
  }
  parsedSection = parsedSection.toUpperCase();

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // classes table has no school_id column — school linkage is via teacher_class_assignments
    const [result] = await connection.query(
      `INSERT INTO classes (class_name, section) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE class_name = VALUES(class_name), section = VALUES(section)`,
      [parsedClassName, parsedSection]
    );
    // Also create a TCA entry so the class appears in the admin's class dropdown.
    // TCA is the authoritative school↔class link (see initDb.js catalog sync, line 493).
    // Use INSERT IGNORE to avoid duplicates if a TCA already exists for this class_section+school.
    await connection.query(
      `INSERT IGNORE INTO teacher_class_assignments (school_id, teacher_user_id, class_section)
       VALUES (?, NULL, ?)`,
      [schoolId, `${parsedClassName}${parsedSection ? `-${parsedSection}` : ''}`]
    );
    await connection.commit();
    const classSectionStr = `${parsedClassName}${parsedSection ? `-${parsedSection}` : ''}`;
    return res.status(201).json({
      success: true,
      message: `Class "${classSectionStr}" added to the school catalog.`,
      data: { id: result.insertId, schoolId, className: parsedClassName, section: parsedSection, classSection: classSectionStr }
    });
  } catch (error) {
    await connection.rollback();
    console.error('[CREATE CLASS ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  } finally {
    connection.release();
  }
});

// ------------------------------------------------------------
// PUT /api/admin/teachers/:id/classes — Replace a teacher's
// assigned classes (single source of truth for teacher isolation).
// Admin-only. Returns the updated teacher with fresh assignments.
// ------------------------------------------------------------
router.put('/teachers/:id/classes', authenticateToken, requireSchoolAdmin, async (req, res) => {
  const teacherId = parseInt(req.params.id, 10);
  const { classes } = req.body;
  if (isNaN(teacherId)) {
    return res.status(400).json({ success: false, error: 'Validation Error', message: 'Invalid teacher ID.' });
  }
  if (!Array.isArray(classes)) {
    return res.status(400).json({ success: false, error: 'Validation Error', message: 'classes must be an array of class_section strings.' });
  }

  const role = String(req.user?.role || '').toLowerCase();
  const isSuper = role === 'super_admin' || role === 'superadmin';
  const schoolId = req.user.school_id;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [teacherRows] = await connection.query('SELECT id, school_id, role FROM users WHERE id = ?', [teacherId]);
    const teacher = teacherRows[0];
    if (!teacher) {
      await connection.rollback();
      return res.status(404).json({ success: false, error: 'Not Found', message: 'Teacher account not found.' });
    }
    if (String(teacher.role || '').toLowerCase() !== 'teacher') {
      await connection.rollback();
      return res.status(400).json({ success: false, error: 'Validation Error', message: 'Target user is not a teacher.' });
    }
    if (!isSuper && String(teacher.school_id) !== String(schoolId)) {
      await connection.rollback();
      return res.status(403).json({ success: false, error: 'Forbidden', message: 'You may only assign classes to teachers in your own school.' });
    }

    const teacherSchoolId = teacher.school_id || schoolId;
    // Manual/free-form assignment: the admin may type ANY class name.
    // Stored exactly as entered in teacher_class_assignments.class_section
    // (VARCHAR, no FK) — the single source of truth used by every
    // teacher-facing query for isolation.
    const cleanClasses = [...new Set(classes.map(c => String(c).trim()).filter(Boolean))];

    // Replace assignments (the UI sends the FULL intended set)
    await connection.query('DELETE FROM teacher_class_assignments WHERE teacher_user_id = ?', [teacherId]);
    if (cleanClasses.length > 0) {
      const insertValues = cleanClasses.map(cls => [teacherSchoolId, teacherId, cls]);
      await connection.query(
        'INSERT INTO teacher_class_assignments (school_id, teacher_user_id, class_section) VALUES ?',
        [insertValues]
      );

      // Manual assignment → keep the school class catalog in sync so every
      // manually typed class is a first-class class everywhere (enrollment
      // validation, rosters, class dropdowns). INSERT IGNORE = idempotent.
      try {
        const catalogRows = cleanClasses.map(cls => {
          const raw = String(cls).trim();
          const dashIdx = raw.indexOf('-');
          const className = dashIdx > -1 ? raw.slice(0, dashIdx).trim() : raw;
          const section = dashIdx > -1 ? raw.slice(dashIdx + 1).trim() : '';
          return [teacherSchoolId, className || raw, section];
        });
        await connection.query(
          'INSERT IGNORE INTO classes (school_id, class_name, section) VALUES ?',
          [catalogRows]
        );
      } catch (catErr) {
        // Best-effort: teacher_class_assignments remains the single source of
        // truth for access control; catalog sync must never block assignment.
        console.error('[CLASS CATALOG SYNC WARNING]:', catErr.message);
      }
    }

    await connection.commit();

    const [assignments] = await pool.query(
      'SELECT class_section FROM teacher_class_assignments WHERE teacher_user_id = ? ORDER BY class_section ASC',
      [teacherId]
    );
    return res.json({
      success: true,
      message: cleanClasses.length
        ? `Teacher assigned to: ${cleanClasses.join(', ')}`
        : 'Teacher has no assigned classes. They will see a "no classes assigned" state.',
      teacher: {
        id: teacherId,
        assignedClasses: assignments.map(a => a.class_section)
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('[ASSIGN TEACHER CLASSES ERROR]:', error);
    return res.status(500).json({ success: false, error: 'Internal Server Error', message: error.message });
  } finally {
    connection.release();
  }
});

// ------------------------------------------------------------
// DELETE /api/admin/users/:id — Delete User Account by Database ID
//
// SAFETY RULES:
//   • A super_admin account can NEVER be deleted through this endpoint.
//   • A non-super caller may only delete users inside their own school.
//   • Deleting a TEACHER removes the user + their teacher_class_assignments.
//   • Deleting a SCHOOL ADMIN (role='admin' with a school_id) permanently
//     deletes ALL data belonging exclusively to that school, inside ONE
//     transaction, in FK-safe dependency order, with a post-delete orphan
//     verification that rolls everything back if any residue remains.
//     Every DELETE is strictly scoped by school_id, so data belonging to
//     any other school (or the Super Admin, school_id NULL) is untouched.
// ------------------------------------------------------------
router.delete('/users/:id', authenticateToken, requireSchoolAdmin, async (req, res) => {
  const userId = parseInt(req.params.id);

  if (isNaN(userId)) {
    return res.status(400).json({
      success: false,
      error: 'Validation Error',
      message: 'Invalid database user ID.'
    });
  }

  const callerRole = String(req.user.role || '').toLowerCase();
  const callerIsSuper = callerRole === 'super_admin' || callerRole === 'superadmin';
  const connection = await pool.getConnection();

  try {
    const [existing] = await connection.query('SELECT id, school_id, role, name FROM users WHERE id = ?', [userId]);
    const user = existing[0];

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Not Found',
        message: 'User record not found.'
      });
    }

    // NEVER delete or modify a Super Admin account.
    const targetRole = String(user.role || '').toLowerCase();
    if (targetRole === 'super_admin' || targetRole === 'superadmin') {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Super Admin accounts cannot be deleted.'
      });
    }

    // A school admin (non-super caller) may only delete users of its own school.
    if (!callerIsSuper && req.user.school_id && user.school_id && String(user.school_id) !== String(req.user.school_id)) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You can only delete accounts belonging to your own school.'
      });
    }

    // ------------------------------------------------------------
    // SCHOOL ADMIN → full transactional cascade of the entire school
    // ------------------------------------------------------------
    if (targetRole === 'admin' && user.school_id) {
      const schoolId = user.school_id;

      const [schoolRows] = await connection.query('SELECT id, name FROM schools WHERE id = ?', [schoolId]);
      if (!schoolRows[0]) {
        // School already gone — just remove the stray admin account.
        await connection.query('DELETE FROM users WHERE id = ?', [userId]);
        return res.json({ success: true, message: 'User account deleted successfully.' });
      }

      await connection.beginTransaction();

      try {
        // Child tables first (FK-safe order: attendance references students).
        // Every statement is scoped strictly to this school_id.
        // Capture class_ids BEFORE any deletions (classes has no school_id column;
        // school linkage is students.class_section → teacher_class_assignments).
        const [classIdRows] = await connection.query(
          'SELECT DISTINCT class_id FROM students WHERE class_section IN (SELECT class_section FROM teacher_class_assignments WHERE school_id = ?)',
          [schoolId]
        );
        const classIdsToDelete = classIdRows.map(r => r.class_id).filter(Boolean);
        const [tcaRows] = await connection.query(
          'SELECT class_section FROM teacher_class_assignments WHERE school_id = ?',
          [schoolId]
        );
        const schoolClassSections = tcaRows.map(r => r.class_section);

        const cascadeSteps = [
          // attendance, students, classes have NO school_id column — use the
          // teacher_class_assignments relationship (school_id ↔ class_section).
          ['attendance', 'DELETE FROM attendance WHERE class_section IN (SELECT class_section FROM teacher_class_assignments WHERE school_id = ?)', [schoolId]],
          ['marks', 'DELETE FROM marks WHERE school_id = ?', [schoolId]],
          ['fee_challans', 'DELETE FROM fee_challans WHERE school_id = ?', [schoolId]],
          ['admit_cards', 'DELETE FROM admit_cards WHERE school_id = ?', [schoolId]],
          ['teacher_class_assignments', 'DELETE FROM teacher_class_assignments WHERE school_id = ?', [schoolId]],
          ['activities', 'DELETE FROM activities WHERE school_id = ?', [schoolId]],
          ['students', 'DELETE FROM students WHERE class_section IN (SELECT class_section FROM teacher_class_assignments WHERE school_id = ?)', [schoolId]],
          // classes linked via students.class_id (captured before student deletion)
          classIdsToDelete.length > 0 ? ['classes', `DELETE FROM classes WHERE id IN (${classIdsToDelete.map(() => '?').join(',')})`, classIdsToDelete] : null
        ].filter(Boolean);
        const deleted = {};

        for (const [table, sql, params] of cascadeSteps) {
          const [stepResult] = await connection.query(sql, params || [schoolId]);
          deleted[table] = stepResult.affectedRows;
        }

        // Broadcasts targeted exclusively to this school ('all' broadcasts are
        // shared and must survive). target_school_id is VARCHAR — match as string.
        const [bcResult] = await connection.query(
          'DELETE FROM broadcasts WHERE target_school_id = ?',
          [String(schoolId)]
        );
        deleted.broadcasts = bcResult.affectedRows;

        // ALL remaining users of the school (school admin(s), teachers, staff).
        const [usersResult] = await connection.query(
          'DELETE FROM users WHERE school_id = ?',
          [schoolId]
        );
        deleted.users = usersResult.affectedRows;

        // The school itself (last — every child row is already gone).
        const [schoolResult] = await connection.query(
          'DELETE FROM schools WHERE id = ?',
          [schoolId]
        );
        deleted.schools = schoolResult.affectedRows;

        // ------------------------------------------------------------
        // ORPHAN VERIFICATION — every school-owned table MUST be empty for
        // this school_id before commit; otherwise roll the whole thing back.
        // ------------------------------------------------------------
        // Orphan verification: users, marks, fee_challans, admit_cards,
        // teacher_class_assignments, activities have school_id column.
        // students, attendance, classes have no school_id — use captured
        // class_sections and class_ids from the pre-deletion snapshot.
        const orphanTables = [
          'users', 'marks', 'fee_challans',
          'admit_cards', 'teacher_class_assignments', 'activities'
        ];
        const residues = {};
        for (const table of orphanTables) {
          const [orphanRows] = await connection.query(
            `SELECT COUNT(*) AS c FROM \`${table}\` WHERE school_id = ?`,
            [schoolId]
          );
          if (Number(orphanRows[0]?.c) > 0) residues[table] = Number(orphanRows[0].c);
        }
        // Verify students and attendance via captured class_sections
        if (schoolClassSections.length > 0) {
          const csPlaceholders = schoolClassSections.map(() => '?').join(',');
          const [studentResidue] = await connection.query(
            `SELECT COUNT(*) AS c FROM students WHERE class_section IN (${csPlaceholders})`,
            schoolClassSections
          );
          if (Number(studentResidue[0]?.c) > 0) residues.students = Number(studentResidue[0].c);
          const [attendanceResidue] = await connection.query(
            `SELECT COUNT(*) AS c FROM attendance WHERE class_section IN (${csPlaceholders})`,
            schoolClassSections
          );
          if (Number(attendanceResidue[0]?.c) > 0) residues.attendance = Number(attendanceResidue[0].c);
        }
        // Verify classes via captured class_ids
        if (classIdsToDelete.length > 0) {
          const ciPlaceholders = classIdsToDelete.map(() => '?').join(',');
          const [classResidue] = await connection.query(
            `SELECT COUNT(*) AS c FROM classes WHERE id IN (${ciPlaceholders})`,
            classIdsToDelete
          );
          if (Number(classResidue[0]?.c) > 0) residues.classes = Number(classResidue[0].c);
        }
        const [bcLeft] = await connection.query(
          'SELECT COUNT(*) AS c FROM broadcasts WHERE target_school_id = ?',
          [String(schoolId)]
        );
        if (Number(bcLeft[0]?.c) > 0) residues.broadcasts = Number(bcLeft[0].c);

        if (Object.keys(residues).length > 0) {
          throw new Error(`Orphan verification failed for school ${schoolId}: ${JSON.stringify(residues)}`);
        }

        await connection.commit();

        console.log(`[SCHOOL CASCADE DELETE] School "${schoolRows[0].name}" (id=${schoolId}) and ALL its data permanently deleted by ${req.user.email}. Counts: ${JSON.stringify(deleted)}`);

        return res.json({
          success: true,
          message: `School Admin deleted. School "${schoolRows[0].name}" and ALL its data (teachers, students, attendance, results, exams, fee records and assignments) were permanently removed.`,
          deletedCounts: deleted
        });
      } catch (cascadeError) {
        await connection.rollback();
        console.error('[SCHOOL CASCADE DELETE ERROR]:', cascadeError);
        return res.status(500).json({
          success: false,
          error: 'Internal Server Error',
          message: 'School deletion failed and was rolled back. No data was changed.'
        });
      }
    }

    // ------------------------------------------------------------
    // TEACHER / OTHER USER → delete the account + their class assignments
    // (prevents orphaned teacher_class_assignments rows).
    // ------------------------------------------------------------
    await connection.beginTransaction();
    try {
      await connection.query('DELETE FROM teacher_class_assignments WHERE teacher_user_id = ?', [userId]);
      await connection.query('DELETE FROM users WHERE id = ?', [userId]);
      await connection.commit();
    } catch (userDeleteError) {
      await connection.rollback();
      throw userDeleteError;
    }

    return res.json({
      success: true,
      message: 'User account deleted successfully.'
    });
  } catch (error) {
    console.error('[DELETE USER ERROR]:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal Server Error',
      message: error.message
    });
  } finally {
    connection.release();
  }
});

export default router;
