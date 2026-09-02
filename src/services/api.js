const getApiBaseUrl = () => {
  if (typeof window !== 'undefined') {
    // Local dev: always use relative /api so Vite proxy forwards to local Express server on port 5000
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || (typeof import.meta !== 'undefined' && import.meta.env?.DEV)) {
      return '/api';
    }
    // Production browser: use env var if provided, or default to relative /api
    return (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) || '/api';
  }
  return (typeof process !== 'undefined' && process.env?.VITE_API_BASE_URL) || 'https://eduzenta-school-os-production.up.railway.app/api';
};

const API_BASE_URL = getApiBaseUrl();


// Helper function for unified fetch requests with error handling + 10s timeout
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('token') || localStorage.getItem('eduzenta_token');

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

    // AbortController gives us a hard 30 s timeout — prevents infinite pending requests.
  // FIX: increased from 10 s to 30 s so base64 profile-picture uploads of
  // compressed images (≤ 2 MB) have enough headroom without timing out.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  const config = {
    ...options,
    signal: controller.signal,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  };

  try {
    const response = await fetch(url, config);
    clearTimeout(timeoutId);

    const isAuthRoute = endpoint.includes('/auth/login') || endpoint.includes('/auth/register');

    if (!isAuthRoute && response.status === 401) {
      console.warn('[API] Session expired (401). Purging credentials.');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('eduzenta_token');
      localStorage.removeItem('eduzenta_user');
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || data.error || 'Session expired. Please log in again.');
    }

    if (response.status === 401) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || data.error || 'Invalid credentials.');
    }

    if (response.status === 403) {
      const data = await response.json().catch(() => ({}));
      const err = new Error(data.message || data.error || 'Access forbidden.');
      if (data.code) err.code = data.code;
      throw err;
    }

    if (response.status === 504) {
      throw new Error('Database response timeout. Please try again.');
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(data.message || data.error || `HTTP Error ${response.status}`);
      if (data.code) err.code = data.code;
      throw err;
    }

    return data;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out after 30 seconds. Please try again.');
    }
    console.warn(`[API] ${endpoint} failed:`, error.message);
    throw error;
  }
}

// ------------------------------------------------------------
// API HELPER FUNCTIONS
// ------------------------------------------------------------

// 1. Health Check Status
export async function checkHealth() {
  return request('/health');
}

// Safe localStorage helper for authentication & login session (strips large avatar base64 blobs)
export function safeStoreUser(user) {
  if (!user) return;
  const lightweight = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    school_id: user.school_id || user.schoolId || null,
    schoolId: user.school_id || user.schoolId || null,
    school_name: user.school_name || user.schoolName || null,
    schoolName: user.school_name || user.schoolName || null,
    school_logo_url: user.school_logo_url || user.schoolLogoUrl || null,
    schoolLogoUrl: user.school_logo_url || user.schoolLogoUrl || null
  };
  try {
    // Single canonical key — reads fall back to legacy keys for old sessions.
    localStorage.setItem('user', JSON.stringify(lightweight));
  } catch (e) {
    console.warn('[API SAFE STORE] Storage fallback:', e.message);
  }
}

// 2. Auth: User Login (Super Admin & Staff)
export async function loginUser(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  if (data?.token) {
    localStorage.setItem('token', data.token);
    if (data.user) {
      safeStoreUser(data.user);
    }
  }

  return data;
}


// 3. Auth: Fetch Live Profile for Authenticated Session
export async function fetchMe() {
  return request('/auth/me');
}

// 4. Super Admin: Onboard New School & Assign School Admin
export async function createSchoolAdmin(payload) {
  // payload: { school_name, admin_name, admin_email, admin_password }
  return request('/superadmin/create-school-admin', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

// 5. Super Admin: Fetch Schools
export async function fetchSchools() {
  return request('/superadmin/schools');
}

// 5b. Super Admin: Update an existing School Admin account
export async function updateSchoolAdmin(id, payload) {
  return request(`/superadmin/school-admins/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

// 6. User Management: Create User Account (School Admin / Super Admin)
export async function createUser(userData) {
  // userData: { name, email, password, role }
  return request('/admin/create-user', {
    method: 'POST',
    body: JSON.stringify(userData)
  });
}

// 7. User Management: Fetch Users Scoped to School ID
export async function fetchUsers() {
  return request('/admin/users');
}

// 8. User Management: Update User Account Record by Database ID
export async function updateUser(id, userData) {
  return request(`/admin/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(userData)
  });
}

// 9. User Management: Delete User Account by Database ID
export async function deleteUser(id) {
  return request(`/admin/users/${id}`, {
    method: 'DELETE'
  });
}

// 10. Profile Update (Name, Profile Picture & optional profile details)
// `extra` carries optional fields (phone, dob, designation, socialLinks) that
// the existing PUT /auth/profile endpoint persists when provided.
export async function updateProfile(name, avatar, extra = {}) {
  return request('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify({ name, avatar, avatar_url: avatar, ...extra })
  });
}

// 11. Password Update
export async function updatePassword(currentPassword, newPassword) {
  return request('/auth/change-password', {
    method: 'PUT',
    body: JSON.stringify({ currentPassword, newPassword })
  });
}

// 12. Fetch Students (optionally filter by classSection)
export async function fetchStudents(classSection = '') {
  const query = classSection ? `?classSection=${encodeURIComponent(classSection)}` : '';
  return request(`/students${query}`);
}

// 13. Add / Enrol New Student
export async function addStudent(studentData) {
  return request('/students', {
    method: 'POST',
    body: JSON.stringify(studentData)
  });
}

// 13b. Update Student Record by ID (fixes state-only update data loss)
export async function updateStudent(id, data) {
  return request(`/students/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  });
}

// 14. Delete Student Record by ID
export async function deleteStudent(id) {
  return request(`/students/${id}`, {
    method: 'DELETE'
  });
}

// 14. Fetch Attendance Logs (optionally filter by classSection & date)
export async function fetchAttendance(classSection = '', date = '') {
  const params = new URLSearchParams();
  if (classSection) params.append('classSection', classSection);
  if (date) params.append('date', date);
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return request(`/attendance${queryString}`);
}

// 14b. Attendance History is defined below (§25) with the full filter set.

// 15. Save / Record Class Attendance
export async function saveAttendance(attendancePayload) {
  return request('/attendance', {
    method: 'POST',
    body: JSON.stringify(attendancePayload)
  });
}

// 16. Fetch Broadcast Notes / Directives
export async function fetchBroadcasts(targetSchoolId = 'all') {
  const query = targetSchoolId ? `?targetSchoolId=${encodeURIComponent(targetSchoolId)}` : '';
  return request(`/broadcasts${query}`);
}

// 17. Create / Publish Broadcast Directive
export async function createBroadcast(broadcastPayload) {
  return request('/broadcasts', {
    method: 'POST',
    body: JSON.stringify(broadcastPayload)
  });
}

// 18. Delete Broadcast Directive
export async function deleteBroadcast(id) {
  return request(`/broadcasts/${id}`, {
    method: 'DELETE'
  });
}

// 19. Super Admin: Toggle School Status (Active / Locked)
export async function toggleSchoolStatus(schoolId, status) {
  return request(`/superadmin/schools/${schoolId}/status`, {
    method: 'PUT',
    body: JSON.stringify({ status })
  });
}

// 20. Super Admin / Admin: Update School Branding (Name & Logo)
export async function updateSchoolBranding(schoolId, payload) {
  return request(`/superadmin/schools/${schoolId}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}
// ------------------------------------------------------------
// 21. CLASS CATALOG — single source of truth for all class dropdowns
// ------------------------------------------------------------
export async function fetchClasses() {
  return request('/admin/classes');
}

export async function createClass(classSection) {
  return request('/admin/classes', {
    method: 'POST',
    body: JSON.stringify(typeof classSection === 'string' ? { classSection } : classSection)
  });
}

// Teacher gets ONLY their own assigned classes (server-enforced)
export async function fetchTeacherClasses() {
  return request('/teacher/classes');
}

// Admin assigns the FULL intended class set to a teacher (replaces)
export async function assignTeacherClasses(teacherId, classes) {
  return request(`/admin/teachers/${teacherId}/classes`, {
    method: 'PUT',
    body: JSON.stringify({ classes })
  });
}

// ------------------------------------------------------------
// 22. MARKS — real persistence for result entry & result cards
// ------------------------------------------------------------
export async function fetchMarks(classSection = '', term = '') {
  const params = new URLSearchParams();
  if (classSection) params.append('classSection', classSection);
  if (term) params.append('term', term);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return request(`/marks${qs}`);
}

export async function saveMarks(payload) {
  return request('/marks', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

// Bulk marks upsert — MANY students for ONE class+term in a SINGLE request.
// Used by the Activity outcome save so a whole class persists in one
// round-trip instead of one POST /marks per student.
export async function saveMarksBulk(payload) {
  return request('/marks/bulk', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

// ------------------------------------------------------------
// ACTIVITIES — real persistence (activities table, migration v4)
// ------------------------------------------------------------
export async function fetchActivities(classSection = '', term = '') {
  const params = new URLSearchParams();
  if (classSection) params.append('classSection', classSection);
  if (term) params.append('term', term);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return request(`/activities${qs}`);
}

export async function createActivity(payload) {
  return request('/activities', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateActivity(id, payload) {
  return request(`/activities/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
}

export async function deleteActivity(id) {
  return request(`/activities/${id}`, { method: 'DELETE' });
}

// ------------------------------------------------------------
// 23. FEE CHALLANS — real persistence
// ------------------------------------------------------------
export async function fetchChallans(classSection = '', term = '') {
  const params = new URLSearchParams();
  if (classSection) params.append('classSection', classSection);
  if (term) params.append('term', term);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return request(`/challans${qs}`);
}

export async function createChallan(payload) {
  return request('/challans', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateChallanStatus(id, status) {
  return request(`/challans/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

// FIX: Full challan update endpoint — PATCH /api/challans/:id supports
// status, term, monthYear, and all fee fields. Used by the Edit Fee Slip modal.
export async function updateChallan(id, payload) {
  return request(`/challans/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function deleteChallan(id) {
  return request(`/challans/${id}`, { method: 'DELETE' });
}

// ------------------------------------------------------------
// 24. ADMIT CARDS — real persistence
// ------------------------------------------------------------
export async function fetchAdmitCards(classSection = '', term = '') {
  const params = new URLSearchParams();
  if (classSection) params.append('classSection', classSection);
  if (term) params.append('term', term);
  const qs = params.toString() ? `?${params.toString()}` : '';
  return request(`/admit-cards${qs}`);
}

export async function createAdmitCard(payload) {
  return request('/admit-cards', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateAdmitCardApi(id, payload) {
  return request(`/admit-cards/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function deleteAdmitCardApi(id) {
  return request(`/admit-cards/${id}`, { method: 'DELETE' });
}

// ------------------------------------------------------------
// 25. ATTENDANCE HISTORY — paged class-based history w/ filters
// ------------------------------------------------------------
export async function fetchAttendanceHistory({ classSection, from = '', to = '', status = '', studentId = '', q = '', page = 1, pageSize = 50 } = {}) {
  const params = new URLSearchParams();
  if (classSection) params.append('classSection', classSection);
  if (from) params.append('from', from);
  if (to) params.append('to', to);
  if (status) params.append('status', status);
  if (studentId) params.append('studentId', studentId);
  if (q) params.append('q', q);
  params.append('page', String(page));
  params.append('pageSize', String(pageSize));
  return request(`/attendance/history?${params.toString()}`);
}

// Attendance admin override endpoints
export async function overrideAttendance(id, status) {
  return request(`/attendance/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  });
}

export async function deleteAttendanceRecord(id) {
  return request(`/attendance/${id}`, { method: 'DELETE' });
}
