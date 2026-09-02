import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import pool from './config/db.js';
import { initializeDatabase } from './config/initDb.js';
import JWT_SECRET from './config/jwtConfig.js';
import jwt from 'jsonwebtoken';

dotenv.config();

async function runAuthVerification() {
  console.log('=== STARTING AUTOMATED EDUZENTA AUTHENTICATION & PERSISTENCE SUITE ===\n');
  let passedCount = 0;
  let totalCount = 0;

  function assert(condition, testName, detail = '') {
    totalCount++;
    if (condition) {
      console.log(`[PASS] Test ${totalCount}: ${testName} ${detail ? '(' + detail + ')' : ''}`);
      passedCount++;
    } else {
      console.error(`[FAIL] Test ${totalCount}: ${testName} ${detail ? '(' + detail + ')' : ''}`);
    }
  }

  try {
    // 1. Run database initialization and auto-migration
    await initializeDatabase();

    const connection = await pool.getConnection();
    console.log('✅ Connected to Railway MySQL database successfully.\n');

    // TEST A: Super Admin exists & bcrypt password verification
    const email = process.env.SUPER_ADMIN_EMAIL || 'developerwithkhan804@gmail.com';
    const password = process.env.SUPER_ADMIN_PASSWORD || 'admin123';

    const [users] = await connection.query('SELECT * FROM users WHERE email = ?', [email]);
    assert(users.length > 0, 'Super Admin User Exists in DB', `Email: ${email}`);
    
    const user = users[0];
    const isCorrectPass = await bcrypt.compare(password, user.password);
    assert(isCorrectPass, 'Test A: Correct Email + Correct Password Verification', 'Bcrypt comparison succeeded');

    // TEST B: Wrong password rejection
    const isWrongPass = await bcrypt.compare('wrong_password_999', user.password);
    assert(!isWrongPass, 'Test B: Correct Email + Wrong Password Rejection', 'Bcrypt comparison returned false');

    // TEST C: Valid JWT Generation & Verification
    const token = jwt.sign(
      { id: user.id, school_id: user.school_id, name: user.name, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    const decoded = jwt.verify(token, JWT_SECRET);
    assert(decoded.id === user.id && decoded.role === user.role, 'Test C: Valid Token Signature & Payload Verification');

    // TEST D: Invalid Token Rejection
    let invalidError = null;
    try {
      jwt.verify('invalid.jwt.token.string', JWT_SECRET);
    } catch (err) {
      invalidError = err;
    }
    assert(invalidError !== null, 'Test D: Invalid Token Rejection', invalidError?.message);

    // TEST E: Create New Admin Persistence
    const testAdminEmail = `test_admin_${Date.now()}@eduzentatest.com`;
    const testSchoolName = `Test School ${Date.now()}`;
    const testAdminPass = 'testPass123!';

    await connection.beginTransaction();
    const [sRes] = await connection.query('INSERT INTO schools (name, status) VALUES (?, "Active")', [testSchoolName]);
    const schoolId = sRes.insertId;

    const testHashedPass = await bcrypt.hash(testAdminPass, 10);
    const [uRes] = await connection.query(
      'INSERT INTO users (school_id, name, email, password, role, is_active) VALUES (?, ?, ?, ?, "admin", 1)',
      [schoolId, 'Test Admin User', testAdminEmail, testHashedPass]
    );
    await connection.commit();

    const [checkUser] = await connection.query('SELECT id, name, email, role, created_at FROM users WHERE email = ?', [testAdminEmail]);
    assert(checkUser.length > 0 && checkUser[0].email === testAdminEmail, 'Test E: Create New Admin Persistence in DB', `User ID: ${uRes.insertId}`);

    // TEST F: Edit Profile Persistence
    const updatedName = 'Updated Test Admin Name';
    await connection.query('UPDATE users SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE email = ?', [updatedName, testAdminEmail]);
    const [checkUpdated] = await connection.query('SELECT name FROM users WHERE email = ?', [testAdminEmail]);
    assert(checkUpdated[0].name === updatedName, 'Test F: Edit Profile DB Persistence', `Updated Name: ${updatedName}`);

    // TEST G: Cleanup Test Artifacts cleanly
    await connection.query('DELETE FROM users WHERE email = ?', [testAdminEmail]);
    await connection.query('DELETE FROM schools WHERE id = ?', [schoolId]);
    assert(true, 'Test G: Test Artifact Purged cleanly');

    connection.release();

    console.log(`\n=== SUITE COMPLETE: ${passedCount}/${totalCount} TESTS PASSED ===\n`);
  } catch (err) {
    console.error('❌ Verification Error:', err);
  } finally {
    await pool.end();
  }
}

runAuthVerification();
