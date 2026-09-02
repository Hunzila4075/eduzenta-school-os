import pool from './config/db.js';
import { initializeDatabase } from './config/initDb.js';
import bcrypt from 'bcrypt';

async function diagnose() {
  console.log('=== STARTING DATABASE DIAGNOSTIC FOR ADMIN & TEACHER PERSISTENCE ===');
  await initializeDatabase();
  const conn = await pool.getConnection();

  try {
    // 1. Inspect current users table
    const [allUsers] = await conn.query(
      `SELECT u.id, u.school_id, u.name, u.email, u.role, u.is_active, s.name as school_name
       FROM users u
       LEFT JOIN schools s ON s.id = u.school_id`
    );
    console.log('\n--- ALL CURRENT USERS IN DB (' + allUsers.length + ') ---');
    console.table(allUsers);

    // 2. Inspect current schools table
    const [allSchools] = await conn.query('SELECT * FROM schools');
    console.log('\n--- ALL CURRENT SCHOOLS IN DB (' + allSchools.length + ') ---');
    console.table(allSchools);

    // 3. Test Query: Super Admin fetching schools (same as GET /api/superadmin/schools)
    const [saSchools] = await conn.query(
      `SELECT s.id, s.name, s.status, s.created_at, u.email as admin_email, u.name as admin_name 
       FROM schools s 
       LEFT JOIN users u ON u.school_id = s.id AND (u.role = 'admin' OR u.role = 'school_admin')
       ORDER BY s.id DESC`
    );
    console.log('\n--- SUPER ADMIN SCHOOLS QUERY RESULT (' + saSchools.length + ') ---');
    console.table(saSchools);

    // 4. Test Query: Super Admin fetching users (same as GET /api/admin/users for super_admin)
    const [saUsers] = await conn.query(
      `SELECT u.id, u.school_id, u.name, u.email, u.role, u.avatar_url, u.is_active, u.created_at, s.name as school_name 
       FROM users u 
       LEFT JOIN schools s ON s.id = u.school_id
       ORDER BY u.id DESC`
    );
    console.log('\n--- SUPER ADMIN ALL USERS QUERY RESULT (' + saUsers.length + ') ---');
    console.table(saUsers);

  } catch (err) {
    console.error('DIAGNOSTIC ERROR:', err);
  } finally {
    conn.release();
    await pool.end();
  }
}

diagnose();
