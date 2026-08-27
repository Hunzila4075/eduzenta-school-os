// Centralized Full-Stack API Client Service for Eduzenta School OS

const API_BASE_URL = 'http://localhost:5000/api';

// Helper function for unified fetch requests with error handling
async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const defaultHeaders = {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
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
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || `HTTP Error ${response.status}`);
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

// 2. Fetch Students (optionally filter by classSection)
export async function fetchStudents(classSection = '') {
  const query = classSection ? `?classSection=${encodeURIComponent(classSection)}` : '';
  return request(`/students${query}`);
}

// 3. Add / Enrol New Student
export async function addStudent(studentData) {
  return request('/students', {
    method: 'POST',
    body: JSON.stringify(studentData)
  });
}

// 4. Fetch Attendance Logs (optionally filter by classSection & date)
export async function fetchAttendance(classSection = '', date = '') {
  const params = new URLSearchParams();
  if (classSection) params.append('classSection', classSection);
  if (date) params.append('date', date);
  const queryString = params.toString() ? `?${params.toString()}` : '';
  return request(`/attendance${queryString}`);
}

// 5. Save / Record Class Attendance
export async function saveAttendance(attendancePayload) {
  // attendancePayload: { classSection, date, records: [{ studentId, status }], markedBy }
  return request('/attendance', {
    method: 'POST',
    body: JSON.stringify(attendancePayload)
  });
}

// 6. Fetch Broadcast Notes / Directives
export async function fetchBroadcasts(targetSchoolId = 'all') {
  const query = targetSchoolId ? `?targetSchoolId=${encodeURIComponent(targetSchoolId)}` : '';
  return request(`/broadcasts${query}`);
}

// 7. Create / Publish Broadcast Directive
export async function createBroadcast(broadcastPayload) {
  // broadcastPayload: { title, description, imageUrl, videoUrl, targetSchoolId, sender }
  return request('/broadcasts', {
    method: 'POST',
    body: JSON.stringify(broadcastPayload)
  });
}
