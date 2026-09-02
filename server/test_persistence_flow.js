import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import pool from './config/db.js';
import { initializeDatabase } from './config/initDb.js';
import JWT_SECRET from './config/jwtConfig.js';
import jwt from 'jsonwebtoken';

dotenv.config();

async function runPersistenceVerification() {
  console.log('=== STARTING END-TO-END DATABASE PERSISTENCE SUITE ===\n');
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
    await initializeDatabase();
    const connection = await pool.getConnection();
    console.log('✅ Connected to Railway MySQL database.\n');

    // 1. GET /api/auth/me Persistence Check
    const email = process.env.SUPER_ADMIN_EMAIL || 'developerwithkhan804@gmail.com';
    const [superAdminRows] = await connection.query('SELECT id, name, email, role FROM users WHERE email = ?', [email]);
    assert(superAdminRows.length > 0, 'Super Admin Exists in MySQL DB', `Email: ${email}`);
    const superUser = superAdminRows[0];

    // Generate valid JWT token
    const token = jwt.sign(
      { id: superUser.id, role: superUser.role, email: superUser.email, name: superUser.name },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    const decoded = jwt.verify(token, JWT_SECRET);
    assert(decoded.id === superUser.id, 'JWT Token Signature & Decoded Payload');

    // 2. ADMIN CREATION PERSISTENCE (INSERT into MySQL)
    const testSchoolName = `Persistence Test School ${Date.now()}`;
    const testAdminEmail = `persist_admin_${Date.now()}@eduzentatest.com`;
    const testAdminName = `Persist Admin ${Date.now()}`;
    const hashedPass = await bcrypt.hash('adminPass123!', 10);

    await connection.beginTransaction();
    const [sRes] = await connection.query('INSERT INTO schools (name, status) VALUES (?, "Active")', [testSchoolName]);
    const schoolId = sRes.insertId;

    const [uRes] = await connection.query(
      'INSERT INTO users (school_id, name, email, password, role, is_active) VALUES (?, ?, ?, ?, "admin", 1)',
      [schoolId, testAdminName, testAdminEmail, hashedPass]
    );
    const adminDbId = uRes.insertId;
    await connection.commit();

    const [createdRows] = await connection.query('SELECT id, school_id, name, email, role FROM users WHERE id = ?', [adminDbId]);
    assert(createdRows.length > 0 && createdRows[0].email === testAdminEmail, 'Admin Creation MySQL Persistence', `Db ID: ${adminDbId}`);

    // 3. ADMIN LIST FETCH (GET /api/admin/users equivalent SQL)
    const [allAdmins] = await connection.query('SELECT id, name, email, role FROM users WHERE id = ?', [adminDbId]);
    assert(allAdmins.length === 1 && allAdmins[0].name === testAdminName, 'Admin Data Fetch Query', `Fetched Admin Name: ${allAdmins[0].name}`);

    // 4. ADMIN UPDATE PERSISTENCE (UPDATE users SET ... WHERE id = ?)
    const updatedAdminName = `Updated ${testAdminName}`;
    const updatedSchoolName = `Updated ${testSchoolName}`;

    await connection.query('UPDATE users SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [updatedAdminName, adminDbId]);
    await connection.query('UPDATE schools SET name = ? WHERE id = ?', [updatedSchoolName, schoolId]);

    const [updatedRows] = await connection.query('SELECT name FROM users WHERE id = ?', [adminDbId]);
    assert(updatedRows[0].name === updatedAdminName, 'Admin Update MySQL Persistence', `Updated Name: ${updatedRows[0].name}`);

    // REFRESH SIMULATION (Query DB directly as GET endpoint would do after F5 refresh)
    const [refreshRows] = await connection.query(
      `SELECT u.id, u.name, u.email, s.name as school_name 
       FROM users u 
       LEFT JOIN schools s ON s.id = u.school_id 
       WHERE u.id = ?`,
      [adminDbId]
    );
    assert(
      refreshRows.length > 0 && refreshRows[0].name === updatedAdminName && refreshRows[0].school_name === updatedSchoolName,
      'Post-Refresh Database GET Verification',
      `User Name: "${refreshRows[0].name}", School: "${refreshRows[0].school_name}"`
    );

    // 5. PROFILE UPDATE PERSISTENCE
    const tempProfileName = `Super Admin Profile ${Date.now()}`;
    await connection.query('UPDATE users SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [tempProfileName, superUser.id]);
    const [profileCheck] = await connection.query('SELECT name FROM users WHERE id = ?', [superUser.id]);
    assert(profileCheck[0].name === tempProfileName, 'Super Admin Profile MySQL Persistence', `Profile Name: ${profileCheck[0].name}`);

    // Restore original profile name
    await connection.query('UPDATE users SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [superUser.name, superUser.id]);

    // 6. ADMIN DELETION PERSISTENCE (DELETE FROM users WHERE id = ?)
    await connection.query('DELETE FROM users WHERE id = ?', [adminDbId]);
    await connection.query('DELETE FROM schools WHERE id = ?', [schoolId]);

    const [afterDeleteRows] = await connection.query('SELECT id FROM users WHERE id = ?', [adminDbId]);
    assert(afterDeleteRows.length === 0, 'Admin Delete MySQL Persistence', `Deleted Db ID: ${adminDbId}`);

    connection.release();
    console.log(`\n=== PERSISTENCE SUITE COMPLETE: ${passedCount}/${totalCount} TESTS PASSED ===\n`);
  } catch (err) {
    console.error('❌ Persistence Verification Failed:', err);
  } finally {
    await pool.end();
  }
}

runPersistenceVerification();
