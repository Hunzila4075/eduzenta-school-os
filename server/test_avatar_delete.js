import dotenv from 'dotenv';
import pool from './config/db.js';
import { initializeDatabase } from './config/initDb.js';

dotenv.config();

async function runTest() {
  await initializeDatabase();
  const conn = await pool.getConnection();
  let passed = 0, total = 0;

  function check(condition, label) {
    total++;
    if (condition) { console.log(`[PASS] Test ${total}: ${label}`); passed++; }
    else { console.error(`[FAIL] Test ${total}: ${label}`); }
  }

  // TEST 1: avatar_url column exists
  const [cols] = await conn.query("SHOW COLUMNS FROM users LIKE 'avatar_url'");
  check(cols.length > 0, 'avatar_url column exists in users table');

  // TEST 2: Profile picture save to MySQL
  const [su] = await conn.query("SELECT id FROM users WHERE role='super_admin' LIMIT 1");
  const uid = su[0]?.id;
  const testAvatar = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  await conn.query('UPDATE users SET avatar_url = ? WHERE id = ?', [testAvatar, uid]);
  const [saved] = await conn.query('SELECT avatar_url FROM users WHERE id = ?', [uid]);
  check(saved[0]?.avatar_url === testAvatar, 'avatar_url saved correctly to MySQL');

  // TEST 3: GET /me SQL returns avatar_url
  const [meFetch] = await conn.query('SELECT id, name, email, role, avatar_url FROM users WHERE id = ?', [uid]);
  check(meFetch[0]?.avatar_url === testAvatar, 'GET me SQL returns avatar_url from DB');

  // Cleanup avatar
  await conn.query('UPDATE users SET avatar_url = NULL WHERE id = ?', [uid]);
  const [afterClean] = await conn.query('SELECT avatar_url FROM users WHERE id = ?', [uid]);
  check(afterClean[0]?.avatar_url === null, 'avatar_url cleanup successful');

  // TEST 5: Student DELETE from MySQL
  const testStudentId = `test_std_del_${Date.now()}`;
  await conn.query(
    "INSERT INTO students (id, roll_number, name, class_section, status) VALUES (?, '9999', 'Delete Test Student', 'Class 10-A', 'Active')",
    [testStudentId]
  );
  const [beforeDel] = await conn.query('SELECT id FROM students WHERE id = ?', [testStudentId]);
  check(beforeDel.length === 1, 'Test student inserted to DB');

  await conn.query('DELETE FROM students WHERE id = ?', [testStudentId]);
  const [afterDel] = await conn.query('SELECT id FROM students WHERE id = ?', [testStudentId]);
  check(afterDel.length === 0, 'Student DELETE MySQL persistence (gone from DB)');

  // TEST 7: Admin/Teacher DELETE from MySQL
  const testEmail = `test_del_${Date.now()}@eduzenta.test`;
  const bcrypt = (await import('bcrypt')).default;
  const hashedPass = await bcrypt.hash('testpass123', 10);
  const [uRes] = await conn.query(
    "INSERT INTO users (name, email, password, role, is_active) VALUES ('Delete Test Teacher', ?, ?, 'teacher', 1)",
    [testEmail, hashedPass]
  );
  const teacherDbId = uRes.insertId;
  const [beforeTeacherDel] = await conn.query('SELECT id FROM users WHERE id = ?', [teacherDbId]);
  check(beforeTeacherDel.length === 1, 'Test teacher inserted to DB');

  await conn.query('DELETE FROM users WHERE id = ?', [teacherDbId]);
  const [afterTeacherDel] = await conn.query('SELECT id FROM users WHERE id = ?', [teacherDbId]);
  check(afterTeacherDel.length === 0, 'Teacher DELETE MySQL persistence (gone from DB)');

  conn.release();
  console.log(`\n=== VERIFICATION COMPLETE: ${passed}/${total} TESTS PASSED ===\n`);
  await pool.end();
}

runTest().catch(err => {
  console.error('TEST SCRIPT FAILED:', err.message);
  process.exit(1);
});
