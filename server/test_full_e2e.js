import dotenv from 'dotenv';
import pool from './config/db.js';
import { initializeDatabase } from './config/initDb.js';
import bcrypt from 'bcrypt';

dotenv.config();

async function runExhaustiveTests() {
  console.log('=== STARTING EXHAUSTIVE E2E PERSISTENCE & DATA INTEGRITY TESTS ===');
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
    // 1. Super Admin Presence & Clean State
    const [superAdmins] = await conn.query("SELECT id, email, role FROM users WHERE role IN ('superadmin', 'super_admin')");
    assert(superAdmins.length >= 1, 'Required Super Admin account exists in DB');
    const sa = superAdmins[0];

    // Clean up any old leftover test data from previous runs
    await conn.query("DELETE FROM users WHERE email LIKE '%test%' OR email LIKE '%demo%'");
    await conn.query("DELETE FROM schools WHERE name LIKE '%test%' OR name LIKE '%demo%'");
    await conn.query("DELETE FROM students WHERE name LIKE '%test%' OR name LIKE '%demo%'");

    // 2. Initial DB state count check
    const [initialSchools] = await conn.query("SELECT COUNT(*) as count FROM schools");
    const [initialUsers] = await conn.query("SELECT COUNT(*) as count FROM users WHERE role != 'super_admin' AND role != 'superadmin'");
    const [initialStudents] = await conn.query("SELECT COUNT(*) as count FROM students");

    console.log(`📊 DB Counts before CRUD: Schools=${initialSchools[0].count}, Users=${initialUsers[0].count}, Students=${initialStudents[0].count}`);

    // 3. Test Admin Creation & DB Persistence
    const testAdminEmail = `test_admin_${Date.now()}@eduzentatest.com`;
    const hashedPassword = await bcrypt.hash('admin123', 10);
    
    // Create School
    const [schRes] = await conn.query("INSERT INTO schools (name, status) VALUES ('Test Autonomous Academy', 'Active')");
    const testSchoolId = schRes.insertId;
    
    // Create Admin User linked to School
    const [adminRes] = await conn.query(
      "INSERT INTO users (school_id, name, email, password, role, is_active) VALUES (?, 'Test Admin User', ?, ?, 'admin', 1)",
      [testSchoolId, testAdminEmail, hashedPassword]
    );
    const testAdminId = adminRes.insertId;
    assert(typeof testAdminId === 'number' && testAdminId > 0, 'Admin created in MySQL with numeric ID');

    // 4. Test Teacher Creation & DB Persistence
    const testTeacherEmail = `test_teacher_${Date.now()}@eduzentatest.com`;
    const [teacherRes] = await conn.query(
      "INSERT INTO users (school_id, name, email, password, role, is_active) VALUES (?, 'Test Teacher User', ?, ?, 'teacher', 1)",
      [testSchoolId, testTeacherEmail, hashedPassword]
    );
    const testTeacherId = teacherRes.insertId;
    assert(typeof testTeacherId === 'number' && testTeacherId > 0, 'Teacher created in MySQL users table with numeric ID');

    // 5. Test Student Creation & DB Persistence
    const testStudentId = `std_e2e_${Date.now()}`;
    await conn.query(
      "INSERT INTO students (id, roll_number, reg_no, name, class_section, status) VALUES (?, '9901', 'REG-9901', 'Test E2E Student', 'Class 10-A', 'Active')",
      [testStudentId]
    );
    const [stdCheck] = await conn.query("SELECT id FROM students WHERE id = ?", [testStudentId]);
    assert(stdCheck.length === 1 && stdCheck[0].id === testStudentId, 'Student created in MySQL students table');

    // 6. Test Avatar Persistence in DB (LONGTEXT avatar_url)
    const base64Avatar = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    await conn.query("UPDATE users SET avatar_url = ? WHERE id = ?", [base64Avatar, testAdminId]);
    const [avatarCheck] = await conn.query("SELECT avatar_url FROM users WHERE id = ?", [testAdminId]);
    assert(avatarCheck[0].avatar_url === base64Avatar, 'Avatar saved to users.avatar_url in MySQL');

    // 7. Test Student Permanent Deletion
    await conn.query("DELETE FROM students WHERE id = ?", [testStudentId]);
    const [stdDelCheck] = await conn.query("SELECT id FROM students WHERE id = ?", [testStudentId]);
    assert(stdDelCheck.length === 0, 'Student permanently deleted from MySQL DB');

    // 8. Test Teacher Permanent Deletion
    await conn.query("DELETE FROM users WHERE id = ?", [testTeacherId]);
    const [teacherDelCheck] = await conn.query("SELECT id FROM users WHERE id = ?", [testTeacherId]);
    assert(teacherDelCheck.length === 0, 'Teacher permanently deleted from MySQL DB');

    // 9. Test Admin & School Deletion
    await conn.query("DELETE FROM users WHERE id = ?", [testAdminId]);
    await conn.query("DELETE FROM schools WHERE id = ?", [testSchoolId]);
    const [adminDelCheck] = await conn.query("SELECT id FROM users WHERE id = ?", [testAdminId]);
    const [schDelCheck] = await conn.query("SELECT id FROM schools WHERE id = ?", [testSchoolId]);
    assert(adminDelCheck.length === 0 && schDelCheck.length === 0, 'Admin & School permanently deleted from MySQL DB');

    // 10. Clean DB Final Count Verification
    const [finalSchools] = await conn.query("SELECT COUNT(*) as count FROM schools");
    const [finalUsers] = await conn.query("SELECT COUNT(*) as count FROM users WHERE role != 'super_admin' AND role != 'superadmin'");
    const [finalStudents] = await conn.query("SELECT COUNT(*) as count FROM students");

    console.log(`📊 DB Counts after Clean Deletion: Schools=${finalSchools[0].count}, Users=${finalUsers[0].count}, Students=${finalStudents[0].count}`);
    assert(finalSchools[0].count === 0 && finalUsers[0].count === 0 && finalStudents[0].count === 0, 'Database contains 0 demo/test schools, users, or students');

  } catch (err) {
    console.error('❌ E2E TEST EXCEPTION:', err);
  } finally {
    conn.release();
    await pool.end();
  }

  console.log(`\n=================================================`);
  console.log(`🏆 E2E VERIFICATION COMPLETE: ${passed}/${total} PASSED`);
  console.log(`=================================================`);

  if (passed !== total) {
    process.exit(1);
  }
}

runExhaustiveTests();
