import pool from './config/db.js';
import { initializeDatabase } from './config/initDb.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import JWT_SECRET from './config/jwtConfig.js';

const BASE_URL = 'http://localhost:5000/api';

async function runE2ETests() {
  console.log('================================================================');
  console.log('🚀 STARTING COMPREHENSIVE SUPER ADMIN & AUTH E2E TEST SUITE');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    await initializeDatabase();

    // 1. Health Check
    console.log('--- TEST 1: Health Check Endpoint ---');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthData = await healthRes.json();
    assert(healthRes.status === 200, 'Health check returned 200 OK');
    assert(healthData.database?.connected === true, 'Database is connected');

    // 2. Super Admin Login
    console.log('\n--- TEST 2: Super Admin Login ---');
    const saEmail = process.env.SUPER_ADMIN_EMAIL || 'developerwithkhan804@gmail.com';
    const saPassword = process.env.SUPER_ADMIN_PASSWORD || 'admin123';

    const saLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: saEmail, password: saPassword })
    });
    const saLoginData = await saLoginRes.json();
    assert(saLoginRes.status === 200, 'Super Admin login returned 200 OK');
    assert(!!saLoginData.token, 'Super Admin received valid JWT token');
    assert(saLoginData.user?.role === 'super_admin' || saLoginData.user?.role === 'superadmin', 'Super Admin role verified');

    const saToken = saLoginData.token;
    const authHeader = { 'Authorization': `Bearer ${saToken}`, 'Content-Type': 'application/json' };

    // 3. Create School & School Admin
    console.log('\n--- TEST 3: Create School & School Admin ---');
    const testSchoolName = `E2E Test Academy ${Date.now()}`;
    const testAdminEmail = `testadmin_${Date.now()}@e2e.test`;
    const initialAdminPassword = 'initialPassword123';

    const createAdminRes = await fetch(`${BASE_URL}/superadmin/create-school-admin`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({
        school_name: testSchoolName,
        admin_name: 'E2E Test Admin',
        admin_email: testAdminEmail,
        admin_password: initialAdminPassword
      })
    });
    const createAdminData = await createAdminRes.json();
    assert(createAdminRes.status === 201, 'Create School Admin returned 201 Created');
    assert(typeof createAdminData.school?.id === 'number', 'School has valid numeric ID');
    assert(typeof createAdminData.admin?.id === 'number', 'Admin user has valid numeric ID');
    assert(createAdminData.admin?.school_id === createAdminData.school?.id, 'Admin user has non-null matching school_id');

    const createdSchoolId = createAdminData.school.id;
    const createdAdminUserId = createAdminData.admin.id;

    // 4. Verify School and Admin in GET APIs
    console.log('\n--- TEST 4: Verify School & Admin in Super Admin Lists ---');
    const schoolsRes = await fetch(`${BASE_URL}/superadmin/schools`, { headers: authHeader });
    const schoolsData = await schoolsRes.json();
    assert(schoolsRes.status === 200, 'GET /superadmin/schools returned 200 OK');
    const foundSchool = schoolsData.schools?.find(s => s.id === createdSchoolId);
    assert(!!foundSchool, 'Created school appears in Super Admin schools list');

    const usersRes = await fetch(`${BASE_URL}/admin/users`, { headers: authHeader });
    const usersData = await usersRes.json();
    assert(usersRes.status === 200, 'GET /admin/users returned 200 OK');
    const foundAdmin = usersData.users?.find(u => u.id === createdAdminUserId);
    assert(!!foundAdmin, 'Created Admin appears in users list');

    // 5. Initial Admin Login
    console.log('\n--- TEST 5: School Admin Initial Login ---');
    const adminLogin1 = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testAdminEmail, password: initialAdminPassword })
    });
    const adminLogin1Data = await adminLogin1.json();
    assert(adminLogin1.status === 200, 'School Admin initial login succeeded');
    const adminToken = adminLogin1Data.token;
    const adminAuthHeader = { 'Authorization': `Bearer ${adminToken}`, 'Content-Type': 'application/json' };

    // 6. Reset Admin Password
    console.log('\n--- TEST 6: Super Admin Reset Admin Password ---');
    const newAdminPassword = 'newSecretPassword456!';
    const resetPwdRes = await fetch(`${BASE_URL}/admin/users/${createdAdminUserId}`, {
      method: 'PUT',
      headers: authHeader,
      body: JSON.stringify({ password: newAdminPassword })
    });
    const resetPwdData = await resetPwdRes.json();
    assert(resetPwdRes.status === 200, 'Reset password endpoint returned 200 OK');

    // 7. Verify Old Password Fails and New Password Succeeds
    console.log('\n--- TEST 7: Verify Old Password Fails & New Password Works ---');
    const oldPwdLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testAdminEmail, password: initialAdminPassword })
    });
    assert(oldPwdLoginRes.status === 401, 'Old password rejected (401 Unauthorized)');

    const newPwdLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testAdminEmail, password: newAdminPassword })
    });
    assert(newPwdLoginRes.status === 200, 'New password accepted (200 OK)');

    // 8. Create Teacher Account Under School
    console.log('\n--- TEST 8: Create Teacher Account ---');
    const testTeacherEmail = `teacher_${Date.now()}@e2e.test`;
    const teacherPassword = 'teacherPassword123';

    const createTeacherRes = await fetch(`${BASE_URL}/admin/create-user`, {
      method: 'POST',
      headers: adminAuthHeader,
      body: JSON.stringify({
        name: 'E2E Test Teacher',
        email: testTeacherEmail,
        password: teacherPassword,
        role: 'teacher'
      })
    });
    const createTeacherData = await createTeacherRes.json();
    assert(createTeacherRes.status === 201, 'Create Teacher returned 201 Created');
    assert(createTeacherData.user?.school_id === createdSchoolId, 'Teacher has correct non-null school_id');
    const createdTeacherUserId = createTeacherData.user?.id;

    // 9. Teacher Login Works
    console.log('\n--- TEST 9: Teacher Login ---');
    const teacherLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testTeacherEmail, password: teacherPassword })
    });
    assert(teacherLoginRes.status === 200, 'Teacher login succeeded (200 OK)');

    // 10. Lock School Account
    console.log('\n--- TEST 10: Super Admin Locks School Account ---');
    const lockRes = await fetch(`${BASE_URL}/superadmin/schools/${createdSchoolId}/status`, {
      method: 'PUT',
      headers: authHeader,
      body: JSON.stringify({ status: 'Locked - Pending Payment' })
    });
    const lockData = await lockRes.json();
    assert(lockRes.status === 200, 'Lock school status endpoint returned 200 OK');
    assert(lockData.school?.status.includes('Locked'), 'School status updated to Locked');

    // 11 & 12. Locked Admin & Teacher Login Attempt
    console.log('\n--- TEST 11 & 12: Locked Admin & Teacher Login (Must Return 403 ACCOUNT_LOCKED) ---');
    const lockedAdminLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testAdminEmail, password: newAdminPassword })
    });
    const lockedAdminData = await lockedAdminLogin.json();
    assert(lockedAdminLogin.status === 403, 'Locked Admin login returned HTTP 403 Forbidden');
    assert(lockedAdminData.code === 'ACCOUNT_LOCKED', 'Response contains structured error code ACCOUNT_LOCKED');

    const lockedTeacherLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testTeacherEmail, password: teacherPassword })
    });
    const lockedTeacherData = await lockedTeacherLogin.json();
    assert(lockedTeacherLogin.status === 403, 'Locked Teacher login returned HTTP 403 Forbidden');
    assert(lockedTeacherData.code === 'ACCOUNT_LOCKED', 'Teacher response contains code ACCOUNT_LOCKED');

    // 13. Super Admin remains unblocked during lockout
    console.log('\n--- TEST 13: Super Admin Login Remains Accessible ---');
    const saLoginCheck = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: saEmail, password: saPassword })
    });
    assert(saLoginCheck.status === 200, 'Super Admin login succeeds while school is locked');

    // 14. Unlock School Account
    console.log('\n--- TEST 14: Unlock School Account ---');
    const unlockRes = await fetch(`${BASE_URL}/superadmin/schools/${createdSchoolId}/status`, {
      method: 'PUT',
      headers: authHeader,
      body: JSON.stringify({ status: 'Active' })
    });
    assert(unlockRes.status === 200, 'Unlock school endpoint returned 200 OK');

    // 15. Verify Login Works Again After Unlock
    console.log('\n--- TEST 15: Verify Login Restored After Unlock ---');
    const unlockedAdminLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testAdminEmail, password: newAdminPassword })
    });
    assert(unlockedAdminLogin.status === 200, 'Admin login restored (200 OK)');

    const unlockedTeacherLogin = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testTeacherEmail, password: teacherPassword })
    });
    assert(unlockedTeacherLogin.status === 200, 'Teacher login restored (200 OK)');

    // 16, 17, 18. Broadcast CRUD Operations
    console.log('\n--- TEST 16, 17 & 18: Broadcast Directives CRUD ---');
    const broadcastTitle = `E2E Broadcast Directive ${Date.now()}`;
    const createBcastRes = await fetch(`${BASE_URL}/broadcasts`, {
      method: 'POST',
      headers: authHeader,
      body: JSON.stringify({
        title: broadcastTitle,
        description: 'Mandatory system compliance check.',
        targetSchoolId: 'all',
        sender: 'Super Admin HQ'
      })
    });
    const createBcastData = await createBcastRes.json();
    assert(createBcastRes.status === 201, 'POST /broadcasts returned 201 Created');
    const createdBcastId = createBcastData.data?.id;
    assert(typeof createdBcastId === 'number' || typeof createdBcastId === 'string', 'Broadcast has valid ID');

    const fetchBcastRes = await fetch(`${BASE_URL}/broadcasts?targetSchoolId=all`);
    const fetchBcastData = await fetchBcastRes.json();
    assert(fetchBcastRes.status === 200, 'GET /broadcasts returned 200 OK');
    const bcastExists = fetchBcastData.data?.some(b => b.title === broadcastTitle);
    assert(bcastExists === true, 'Created broadcast directive exists in DB list');

    const deleteBcastRes = await fetch(`${BASE_URL}/broadcasts/${createdBcastId}`, {
      method: 'DELETE',
      headers: authHeader
    });
    assert(deleteBcastRes.status === 200, 'DELETE /broadcasts/:id returned 200 OK');

    const fetchBcastAfterDel = await fetch(`${BASE_URL}/broadcasts?targetSchoolId=all`);
    const fetchBcastAfterDelData = await fetchBcastAfterDel.json();
    const bcastStillExists = fetchBcastAfterDelData.data?.some(b => b.id === createdBcastId);
    assert(!bcastStillExists, 'Deleted broadcast directive does not return after deletion');

    // 19 & 20. Profile Avatar Update & Re-hydration
    console.log('\n--- TEST 19 & 20: Profile Picture Persistence & GET /me ---');
    const avatarSample = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80';
    const updateProfileRes = await fetch(`${BASE_URL}/auth/profile`, {
      method: 'PUT',
      headers: authHeader,
      body: JSON.stringify({ name: 'Eduzenta Super Admin', avatar: avatarSample })
    });
    assert(updateProfileRes.status === 200, 'PUT /auth/profile returned 200 OK');

    const getMeRes = await fetch(`${BASE_URL}/auth/me`, { headers: authHeader });
    const getMeData = await getMeRes.json();
    assert(getMeRes.status === 200, 'GET /auth/me re-hydrated user from MySQL');
    assert(getMeData.user?.avatar_url === avatarSample || getMeData.user?.avatar === avatarSample, 'Avatar URL persisted in MySQL');

    // 21 & 22. Permanent Deletion of Teacher & Admin
    console.log('\n--- TEST 21 & 22: Permanent Deletion of Users ---');
    const delTeacherRes = await fetch(`${BASE_URL}/admin/users/${createdTeacherUserId}`, {
      method: 'DELETE',
      headers: authHeader
    });
    assert(delTeacherRes.status === 200, 'DELETE teacher user returned 200 OK');

    const delAdminRes = await fetch(`${BASE_URL}/admin/users/${createdAdminUserId}`, {
      method: 'DELETE',
      headers: authHeader
    });
    assert(delAdminRes.status === 200, 'DELETE school admin user returned 200 OK');

    // 23. Cleanup Test Data
    console.log('\n--- TEST 23: Clean Test Records from Database ---');
    const conn = await pool.getConnection();
    try {
      await conn.query('DELETE FROM users WHERE email IN (?, ?)', [testAdminEmail, testTeacherEmail]);
      await conn.query('DELETE FROM schools WHERE id = ?', [createdSchoolId]);
      console.log('  ✅ PASS: Test database records cleaned up successfully.');
      passed++;
    } finally {
      conn.release();
    }

  } catch (error) {
    console.error('FATAL TEST EXCEPTION:', error);
    failed++;
  } finally {
    await pool.end();
  }

  console.log('\n================================================================');
  console.log(`📊 FINAL TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runE2ETests();
