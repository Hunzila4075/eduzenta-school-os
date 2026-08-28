// Centralized Full-Stack API Client Service for Eduzenta School OS

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || 'https://eduzenta-school-os-production.up.railway.app/api';

// Helper function for unified fetch requests with error handling
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const token = localStorage.getItem('token') || localStorage.getItem('eduzenta_token');

  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  const config = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers
    }
  };

  try {
    const response = await fetch(url, config);
    const isAuthRoute = endpoint.includes('/auth/login') || endpoint.includes('/auth/register');
    
    // Explicit error handling for 401 Unauthorized - Purge session only on 401
    if (!isAuthRoute && response.status === 401) {
      console.warn('[API SERVICE WARNING] Session token invalid or expired (401). Purging local credentials.');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('eduzenta_token');
      localStorage.removeItem('eduzenta_user');
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || data.error || 'Session expired or unauthorized. Please log in again.');
    }

    if (response.status === 401) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || data.error || 'Invalid credentials. Please check your email and password.');
    }

    // 403 Forbidden - Authenticated user lacks permission. DO NOT PURGE TOKEN.
    if (response.status === 403) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || data.error || 'Access forbidden: Insufficient permissions.');
    }

    // Explicit error handling for 504 Gateway / Database Timeout
    if (response.status === 504) {
      throw new Error('Database response timeout. Please try again.');
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || data.error || `HTTP Error ${response.status}`);
    }

    return data;
  } catch (error) {
    console.warn(`[API SERVICE WARNING] ${endpoint} request failed:`, error.message);
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

// 2. Auth: User Login (Super Admin & Staff)
export async function loginUser(email, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  if (data?.token) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('eduzenta_token', data.token);
    if (data.user) {
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('eduzenta_user', JSON.stringify(data.user));
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

// 10. Profile Update
export async function updateProfile(name) {
  return request('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify({ name })
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

// 14. Fetch Attendance Logs (optionally filter by classSection & date)
export async function fetchAttendance(classSection = '', date = '') {
  const params = new URLSearchParams();
  if (classSection) params.append('classSection', classSection);
  if (date) params.append('date', date);
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return request(`/attendance${queryString}`);
}

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
