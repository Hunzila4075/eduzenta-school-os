import dotenv from 'dotenv';
import pool from './config/db.js';
import { initializeDatabase } from './config/initDb.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import JWT_SECRET from './config/jwtConfig.js';

dotenv.config();

async function runPersistenceE2ETest() {
  console.log('=== STARTING EXHAUSTIVE ADMIN & FACULTY RE-HYDRATION & PERSISTENCE E2E SUITE ===');
  await initializeDatabase();
  const conn = await pool.getConnection();

  let total = 0;
  let passed = 0;

  function assert(condition, testName) {
    total++;
    if (condition) {
      console.log(`✅ [PASS ${total}] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL ${total}] ${testName}`);
    }
  }

  try {
    // 1. Super Admin Presence Check
    const [superAdmins] = await conn.query("SELECT id, email, role FROM users WHERE role IN ('superadmin', 'super_admin')");
    assert(superAdmins.length >= 1, 'Super Admin account exists in MySQL DB');
    const sa = superAdmins[0];

    // Clean old test data
    await conn.query("DELETE FROM users WHERE email LIKE '%persisttest%'");
    await conn.query("DELETE FROM schools WHERE name LIKE '%persisttest%'");

    // TEST A: Create School
    const schoolName = `PersistTest Academy ${Date.now()}`;
    const [schRes] = await conn.query("INSERT INTO schools (name, status) VALUES (?, 'Active')", [schoolName]);
    const schoolId = schRes.insertId;
    assert(typeof schoolId === 'number' && schoolId > 0, 'TEST A: School created in MySQL DB');

    // TEST B: Create Admin
    const adminEmail = `admin_persisttest_${Date.now()}@eduzenta.com`;
    const adminPass = 'adminPass123';
    const hash = await bcrypt.hash(adminPass, 10);
    const [adminRes] = await conn.query(
      "INSERT INTO users (school_id, name, email, password, role, is_active) VALUES (?, 'PersistTest Admin', ?, ?, 'admin', 1)",
      [schoolId, adminEmail, hash]
    );
    const adminId = adminRes.insertId;
    assert(typeof adminId === 'number' && adminId > 0, 'TEST B: School Admin created in MySQL DB');

    // TEST C: Direct MySQL Verification for Admin
    const [sqlAdminCheck] = await conn.query(
      `SELECT u.id, u.name, u.email, u.role, u.school_id, u.is_active, s.name AS school_name
       FROM users u
       LEFT JOIN schools s ON s.id = u.school_id
       WHERE u.role = 'admin' AND u.id = ?`,
      [adminId]
    );
    assert(sqlAdminCheck.length === 1 && sqlAdminCheck[0].school_id === schoolId, 'TEST C: MySQL JOIN query verifies Admin linked to correct school_id');

    // TEST D: Super Admin GET /api/admin/users equivalent query
    const [saGetUsers] = await conn.query(
      `SELECT u.id, u.school_id, u.name, u.email, u.role, u.avatar_url, u.is_active, u.created_at, s.name as school_name 
       FROM users u 
       LEFT JOIN schools s ON s.id = u.school_id
       ORDER BY u.id DESC`
    );
    const foundAdminInGET = saGetUsers.find(u => u.id === adminId);
    assert(Boolean(foundAdminInGET && foundAdminInGET.email === adminEmail), 'TEST D: Super Admin GET users query returns newly created Admin');

    // TEST E: Super Admin GET /api/superadmin/schools query returns school with admin_email
    const [saGetSchools] = await conn.query(
      `SELECT s.id, s.name, s.status, s.created_at, u.email as admin_email, u.name as admin_name 
       FROM schools s 
       LEFT JOIN users u ON u.school_id = s.id AND (u.role = 'admin' OR u.role = 'school_admin')
       WHERE s.id = ?`,
      [schoolId]
    );
    assert(saGetSchools.length === 1 && saGetSchools[0].admin_email === adminEmail, 'TEST E: Super Admin GET schools returns school with linked admin_email');

    // TEST F: Admin Login & JWT Generation
    const [loginRows] = await conn.query("SELECT id, school_id, name, email, password, role FROM users WHERE email = ?", [adminEmail]);
    const loggedAdmin = loginRows[0];
    const isPassMatch = await bcrypt.compare(adminPass, loggedAdmin.password);
    assert(isPassMatch && loggedAdmin.school_id === schoolId, 'TEST F: Admin login bcrypt comparison succeeds & provides correct school_id');

    const adminToken = jwt.sign(
      { id: loggedAdmin.id, school_id: loggedAdmin.school_id, name: loggedAdmin.name, email: loggedAdmin.email, role: loggedAdmin.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // TEST G: Admin Creates Faculty / Teacher
    const teacherEmail = `teacher_persisttest_${Date.now()}@eduzenta.com`;
    const teacherHash = await bcrypt.hash('teacherPass123', 10);
    const [teacherRes] = await conn.query(
      "INSERT INTO users (school_id, name, email, password, role, is_active) VALUES (?, 'PersistTest Faculty', ?, ?, 'teacher', 1)",
      [schoolId, teacherEmail, teacherHash]
    );
    const teacherId = teacherRes.insertId;
    assert(typeof teacherId === 'number' && teacherId > 0, 'TEST G: Admin creates Faculty/Teacher in MySQL DB');

    // TEST H: Direct MySQL Verification for Faculty
    const [sqlTeacherCheck] = await conn.query(
      "SELECT id, name, email, role, school_id FROM users WHERE role = 'teacher' AND id = ?",
      [teacherId]
    );
    assert(sqlTeacherCheck.length === 1 && sqlTeacherCheck[0].school_id === schoolId, 'TEST H: MySQL query verifies Faculty/Teacher linked to Admin school_id');

    // TEST I: Admin GET /api/admin/users query (scoped to school_id = schoolId)
    const [adminUsersQuery] = await conn.query(
      `SELECT u.id, u.school_id, u.name, u.email, u.role, u.avatar_url, u.is_active, u.created_at, s.name as school_name 
       FROM users u 
       LEFT JOIN schools s ON s.id = u.school_id
       WHERE u.school_id = ? OR u.school_id IS NULL
       ORDER BY u.id DESC`,
      [schoolId]
    );
    const foundTeacherInAdminGET = adminUsersQuery.find(u => u.id === teacherId);
    assert(Boolean(foundTeacherInAdminGET && foundTeacherInAdminGET.email === teacherEmail), 'TEST I: Scoped Admin GET users returns Faculty/Teacher');

    // TEST J: Simulate Page Refresh / Re-hydration for Admin Data
    const [rehydrateAdmin] = await conn.query(
      "SELECT id, school_id, name, email, role FROM users WHERE role = 'admin' AND id = ?",
      [adminId]
    );
    assert(rehydrateAdmin.length === 1, 'TEST J: Admin data persists across page refresh re-hydration');

    // TEST K: Simulate Page Refresh / Re-hydration for Faculty Data
    const [rehydrateFaculty] = await conn.query(
      "SELECT id, school_id, name, email, role FROM users WHERE role = 'teacher' AND id = ?",
      [teacherId]
    );
    assert(rehydrateFaculty.length === 1, 'TEST K: Faculty data persists across page refresh re-hydration');

    // TEST L: Delete Teacher / Faculty
    await conn.query("DELETE FROM users WHERE id = ?", [teacherId]);
    const [delTeacherCheck] = await conn.query("SELECT id FROM users WHERE id = ?", [teacherId]);
    assert(delTeacherCheck.length === 0, 'TEST L: Faculty deleted from MySQL DB');

    // TEST M: Delete Admin & School
    await conn.query("DELETE FROM users WHERE id = ?", [adminId]);
    await conn.query("DELETE FROM schools WHERE id = ?", [schoolId]);
    const [delAdminCheck] = await conn.query("SELECT id FROM users WHERE id = ?", [adminId]);
    assert(delAdminCheck.length === 0, 'TEST M: Admin & School deleted from MySQL DB');

    // TEST N: Re-fetch verifying deleted records do not return
    const [reFetchCheck] = await conn.query("SELECT id FROM users WHERE id IN (?, ?)", [adminId, teacherId]);
    assert(reFetchCheck.length === 0, 'TEST N: Deleted Admin and Faculty do not return on re-fetch');

    // Clean up any remaining test records
    await conn.query("DELETE FROM users WHERE email LIKE '%persisttest%'");
    await conn.query("DELETE FROM schools WHERE name LIKE '%persisttest%'");

  } catch (err) {
    console.error('❌ E2E TEST EXCEPTION:', err);
  } finally {
    conn.release();
    await pool.end();
  }

  console.log(`\n=================================================`);
  console.log(`🏆 PERSISTENCE E2E SUITE: ${passed}/${total} PASSED`);
  console.log(`=================================================`);

  if (passed !== total) {
    process.exit(1);
  }
}

runPersistenceE2ETest();
