import pool from './config/db.js';
import { initializeDatabase } from './config/initDb.js';
import bcrypt from 'bcryptjs';

async function testFullFlow() {
  console.log('=== TESTING FULL API FLOW FOR CREATION & RE-HYDRATION ===');
  await initializeDatabase();
  const conn = await pool.getConnection();

  try {
    // 1. Clean test data
    await conn.query("DELETE FROM users WHERE email LIKE '%flowtest%'");
    await conn.query("DELETE FROM schools WHERE name LIKE '%flowtest%'");

    // 2. Super Admin creates School Admin
    const adminEmail = `admin_flowtest_${Date.now()}@gmail.com`;
    const schoolName = `FlowTest School ${Date.now()}`;
    const adminPass = 'adminPass123';
    const hash = await bcrypt.hash(adminPass, 10);

    const [sRes] = await conn.query("INSERT INTO schools (name, status) VALUES (?, 'Active')", [schoolName]);
    const schoolId = sRes.insertId;

    const [uRes] = await conn.query(
      "INSERT INTO users (school_id, name, email, password, role, is_active) VALUES (?, 'FlowTest Admin', ?, ?, 'admin', TRUE)",
      [schoolId, adminEmail, hash]
    );
    const adminId = uRes.insertId;
    console.log(`\n[STEP 1] Created School (id=${schoolId}) and Admin (id=${adminId}, email=${adminEmail})`);

    // 3. Admin creates Teacher
    const teacherEmail = `teacher_flowtest_${Date.now()}@gmail.com`;
    const teacherHash = await bcrypt.hash('teacherPass123', 10);

    const [tRes] = await conn.query(
      "INSERT INTO users (school_id, name, email, password, role, is_active) VALUES (?, 'FlowTest Teacher', ?, ?, 'teacher', TRUE)",
      [schoolId, teacherEmail, teacherHash]
    );
    const teacherId = tRes.insertId;
    console.log(`[STEP 2] Created Teacher (id=${teacherId}, email=${teacherEmail}) linked to school_id=${schoolId}`);

    // 4. Query GET /api/admin/users as Super Admin (no school_id filter)
    const [saGetUsers] = await conn.query(
      `SELECT u.id, u.school_id, u.name, u.email, u.role, u.avatar_url, u.is_active, u.created_at, s.name as school_name 
       FROM users u 
       LEFT JOIN schools s ON s.id = u.school_id
       ORDER BY u.id DESC`
    );
    console.log('\n[STEP 3] Super Admin GET /api/admin/users returns:');
    console.table(saGetUsers.map(u => ({ id: u.id, name: u.name, role: u.role, school_id: u.school_id, school_name: u.school_name })));

    // 5. Query GET /api/admin/users as School Admin (scoped to school_id = schoolId)
    const [adminGetUsers] = await conn.query(
      `SELECT u.id, u.school_id, u.name, u.email, u.role, u.avatar_url, u.is_active, u.created_at, s.name as school_name 
       FROM users u 
       LEFT JOIN schools s ON s.id = u.school_id
       WHERE u.school_id = ?
       ORDER BY u.id DESC`,
      [schoolId]
    );
    console.log(`\n[STEP 4] Admin (school_id=${schoolId}) GET /api/admin/users returns:`);
    console.table(adminGetUsers.map(u => ({ id: u.id, name: u.name, role: u.role, school_id: u.school_id, school_name: u.school_name })));

    // 6. Query GET /api/superadmin/schools as Super Admin
    const [saGetSchools] = await conn.query(
      `SELECT s.id, s.name, s.status, s.created_at, u.email as admin_email, u.name as admin_name 
       FROM schools s 
       LEFT JOIN users u ON u.school_id = s.id AND (u.role = 'admin' OR u.role = 'school_admin')
       ORDER BY s.id DESC`
    );
    console.log('\n[STEP 5] Super Admin GET /api/superadmin/schools returns:');
    console.table(saGetSchools);

    // Clean up
    await conn.query("DELETE FROM users WHERE email LIKE '%flowtest%'");
    await conn.query("DELETE FROM schools WHERE name LIKE '%flowtest%'");

  } catch (err) {
    console.error('TEST ERROR:', err);
  } finally {
    conn.release();
    await pool.end();
  }
}

testFullFlow();
