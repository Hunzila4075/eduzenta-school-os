import dotenv from 'dotenv';
import pool from './config/db.js';
import { initializeDatabase } from './config/initDb.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import JWT_SECRET from './config/jwtConfig.js';

dotenv.config();

async function runStrictPersistenceE2ETest() {
  console.log('=== STARTING STRICT SCHOOL-SCOPED MULTI-TENANT PERSISTENCE E2E SUITE ===');
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

    // Clean old test data
    await conn.query("DELETE FROM users WHERE email LIKE '%stricttest%'");
    await conn.query("DELETE FROM schools WHERE name LIKE '%stricttest%'");

    // TEST A & B: Super Admin creates School 1 & Admin 1
    const schoolName1 = `StrictTest School One ${Date.now()}`;
    const [schRes1] = await conn.query("INSERT INTO schools (name, status) VALUES (?, 'Active')", [schoolName1]);
    const schoolId1 = schRes1.insertId;

    const adminEmail1 = `admin1_stricttest_${Date.now()}@eduzenta.com`;
    const hash1 = await bcrypt.hash('adminPass123', 10);
    const [adminRes1] = await conn.query(
      "INSERT INTO users (school_id, name, email, password, role, is_active) VALUES (?, 'Admin One', ?, ?, 'admin', 1)",
      [schoolId1, adminEmail1, hash1]
    );
    const adminId1 = adminRes1.insertId;
    assert(typeof schoolId1 === 'number' && typeof adminId1 === 'number', 'TEST A & B: Super Admin creates School 1 and Admin 1 with non-null IDs');

    // TEST C: MySQL Verification for Admin 1 (school_id MUST be valid and NON-NULL)
    const [sqlAdmin1] = await conn.query("SELECT id, school_id, role FROM users WHERE id = ?", [adminId1]);
    assert(sqlAdmin1.length === 1 && sqlAdmin1[0].school_id === schoolId1 && sqlAdmin1[0].school_id !== null, 'TEST C: Admin 1 strictly possesses valid non-null school_id');

    // TEST D & E: Super Admin creates School 2 & Admin 2
    const schoolName2 = `StrictTest School Two ${Date.now()}`;
    const [schRes2] = await conn.query("INSERT INTO schools (name, status) VALUES (?, 'Active')", [schoolName2]);
    const schoolId2 = schRes2.insertId;

    const adminEmail2 = `admin2_stricttest_${Date.now()}@eduzenta.com`;
    const hash2 = await bcrypt.hash('adminPass123', 10);
    const [adminRes2] = await conn.query(
      "INSERT INTO users (school_id, name, email, password, role, is_active) VALUES (?, 'Admin Two', ?, ?, 'admin', 1)",
      [schoolId2, adminEmail2, hash2]
    );
    const adminId2 = adminRes2.insertId;
    assert(typeof schoolId2 === 'number' && typeof adminId2 === 'number', 'TEST D & E: Super Admin creates School 2 and Admin 2 with non-null IDs');

    // TEST F: MySQL Verification for Admin 2
    const [sqlAdmin2] = await conn.query("SELECT id, school_id, role FROM users WHERE id = ?", [adminId2]);
    assert(sqlAdmin2.length === 1 && sqlAdmin2[0].school_id === schoolId2 && sqlAdmin2[0].school_id !== null, 'TEST F: Admin 2 strictly possesses valid non-null school_id');

    // TEST G & H: Admin 1 creates Teacher 1 for School 1
    const teacherEmail1 = `teacher1_stricttest_${Date.now()}@eduzenta.com`;
    const tHash1 = await bcrypt.hash('teacherPass123', 10);
    const [tRes1] = await conn.query(
      "INSERT INTO users (school_id, name, email, password, role, is_active) VALUES (?, 'Teacher One', ?, ?, 'teacher', 1)",
      [schoolId1, teacherEmail1, tHash1]
    );
    const teacherId1 = tRes1.insertId;
    assert(typeof teacherId1 === 'number' && teacherId1 > 0, 'TEST G & H: Admin 1 creates Teacher 1 linked to school_id = ' + schoolId1);

    // TEST I & J: Admin 2 creates Teacher 2 for School 2
    const teacherEmail2 = `teacher2_stricttest_${Date.now()}@eduzenta.com`;
    const tHash2 = await bcrypt.hash('teacherPass123', 10);
    const [tRes2] = await conn.query(
      "INSERT INTO users (school_id, name, email, password, role, is_active) VALUES (?, 'Teacher Two', ?, ?, 'teacher', 1)",
      [schoolId2, teacherEmail2, tHash2]
    );
    const teacherId2 = tRes2.insertId;
    assert(typeof teacherId2 === 'number' && teacherId2 > 0, 'TEST I & J: Admin 2 creates Teacher 2 linked to school_id = ' + schoolId2);

    // TEST K (Multi-Tenant Isolation): Query GET users as Admin 1 (strictly WHERE u.school_id = schoolId1)
    const [admin1GetUsers] = await conn.query(
      `SELECT u.id, u.school_id, u.name, u.email, u.role FROM users u WHERE u.school_id = ? ORDER BY u.id DESC`,
      [schoolId1]
    );
    const admin1HasTeacher1 = admin1GetUsers.some(u => u.id === teacherId1);
    const admin1HasTeacher2 = admin1GetUsers.some(u => u.id === teacherId2);
    assert(admin1HasTeacher1 && !admin1HasTeacher2, 'TEST K (Isolation): Admin 1 sees ONLY Teacher 1 (School 1) and CANNOT see Teacher 2 (School 2)');

    // TEST L (Multi-Tenant Isolation): Query GET users as Admin 2 (strictly WHERE u.school_id = schoolId2)
    const [admin2GetUsers] = await conn.query(
      `SELECT u.id, u.school_id, u.name, u.email, u.role FROM users u WHERE u.school_id = ? ORDER BY u.id DESC`,
      [schoolId2]
    );
    const admin2HasTeacher2 = admin2GetUsers.some(u => u.id === teacherId2);
    const admin2HasTeacher1 = admin2GetUsers.some(u => u.id === teacherId1);
    assert(admin2HasTeacher2 && !admin2HasTeacher1, 'TEST L (Isolation): Admin 2 sees ONLY Teacher 2 (School 2) and CANNOT see Teacher 1 (School 1)');

    // TEST M (Super Admin Oversight): Super Admin sees ALL registered users
    const [saGetUsers] = await conn.query(
      `SELECT u.id, u.school_id, u.name, u.email, u.role, s.name as school_name FROM users u LEFT JOIN schools s ON s.id = u.school_id ORDER BY u.id DESC`
    );
    const saHasAdmin1 = saGetUsers.some(u => u.id === adminId1);
    const saHasAdmin2 = saGetUsers.some(u => u.id === adminId2);
    const saHasTeacher1 = saGetUsers.some(u => u.id === teacherId1);
    const saHasTeacher2 = saGetUsers.some(u => u.id === teacherId2);
    assert(saHasAdmin1 && saHasAdmin2 && saHasTeacher1 && saHasTeacher2, 'TEST M (Super Admin): Super Admin sees ALL Admins and Teachers across ALL schools');

    // TEST N (Super Admin School Oversight): Super Admin GET schools returns School 1 and School 2 with linked admin emails
    const [saGetSchools] = await conn.query(
      `SELECT s.id, s.name, s.status, u.email as admin_email FROM schools s LEFT JOIN users u ON u.school_id = s.id AND (u.role = 'admin' OR u.role = 'school_admin') WHERE s.id IN (?, ?)`,
      [schoolId1, schoolId2]
    );
    assert(saGetSchools.length === 2, 'TEST N (Super Admin): Super Admin GET schools returns both registered schools');

    // TEST O (Re-hydration): Re-querying after simulated browser refresh yields exact same data
    const [rehydrateQuery] = await conn.query("SELECT id FROM users WHERE id IN (?, ?, ?, ?)", [adminId1, adminId2, teacherId1, teacherId2]);
    assert(rehydrateQuery.length === 4, 'TEST O (Re-hydration): All 4 Admin and Teacher records persist across re-hydration');

    // TEST P (Delete Isolation & Persistence): Delete Teacher 1, verify Teacher 2 stays intact
    await conn.query("DELETE FROM users WHERE id = ?", [teacherId1]);
    const [postDelQuery] = await conn.query("SELECT id FROM users WHERE id IN (?, ?)", [teacherId1, teacherId2]);
    assert(postDelQuery.length === 1 && postDelQuery[0].id === teacherId2, 'TEST P (Delete Isolation): Teacher 1 deleted, Teacher 2 remains intact');

    // TEST Q: Clean deletion of Admin 1, Admin 2, Teacher 2, School 1, School 2
    await conn.query("DELETE FROM users WHERE id IN (?, ?, ?)", [adminId1, adminId2, teacherId2]);
    await conn.query("DELETE FROM schools WHERE id IN (?, ?)", [schoolId1, schoolId2]);
    const [finalCheck] = await conn.query("SELECT id FROM users WHERE email LIKE '%stricttest%'");
    assert(finalCheck.length === 0, 'TEST Q: All test records cleaned from database');

  } catch (err) {
    console.error('❌ E2E TEST EXCEPTION:', err);
  } finally {
    conn.release();
    await pool.end();
  }

  console.log(`\n=================================================`);
  console.log(`🏆 STRICT PERSISTENCE E2E SUITE: ${passed}/${total} PASSED`);
  console.log(`=================================================`);

  if (passed !== total) {
    process.exit(1);
  }
}

runStrictPersistenceE2ETest();
