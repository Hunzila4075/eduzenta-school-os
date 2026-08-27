// Pre-populated QOBE / Eduzenta System Mock Data

export const MOCK_SCHOOLS = [
  {
    id: "sch_01",
    name: "EXCELLENCE INTERNATIONAL SCHOOL",
    logoUrl: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&w=250&q=80",
    adminEmail: "admin@excellence.edu",
    adminName: "Dr. Robert Sterling",
    city: "Knowledge City",
    address: "123 Education Boulevard, Knowledge City",
    studentsCount: 450,
    teachersCount: 32,
    status: "Active",
    monthlyRevenue: 2400,
    createdAt: "2024-01-15",
    ipLogs: ["192.168.1.45 (Current Session)", "172.16.0.12 (Yesterday)"]
  },
  {
    id: "sch_02",
    name: "BEACON HILL ACADEMY",
    logoUrl: "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=250&q=80",
    adminEmail: "lockedadmin@excellence.edu",
    adminName: "Prof. Sarah Jenkins",
    city: "Horizon Park",
    address: "45 West Avenue, Horizon Park",
    studentsCount: 310,
    teachersCount: 20,
    status: "Locked - Pending Payment",
    monthlyRevenue: 0,
    createdAt: "2024-03-10",
    ipLogs: ["10.0.0.55 (3 days ago)"]
  }
];

export const MOCK_USERS = [
  {
    id: "usr_superadmin",
    firstName: "Alex",
    middleName: "D.",
    lastName: "Vance",
    name: "Alex Vance",
    email: "superadmin@eduzenta.com",
    phone: "+1 (555) 999-8877",
    dob: "1985-06-14",
    designation: "Chief SaaS Developer / Super Admin",
    socialLinks: { linkedin: "https://linkedin.com", twitter: "https://twitter.com" },
    role: "superadmin",
    schoolId: null,
    schoolName: "Eduzenta Corporate HQ",
    schoolLogoUrl: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&w=250&q=80",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
    locked: false
  },
  {
    id: "usr_admin_1",
    firstName: "Robert",
    middleName: "M.",
    lastName: "Sterling",
    name: "Dr. Robert Sterling",
    email: "admin@excellence.edu",
    phone: "+1 (555) 234-5678",
    dob: "1978-03-22",
    designation: "Principal & School Administrator",
    socialLinks: { linkedin: "https://linkedin.com" },
    role: "admin",
    schoolId: "sch_01",
    schoolName: "EXCELLENCE INTERNATIONAL SCHOOL",
    schoolLogoUrl: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&w=250&q=80",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=250&q=80",
    locked: false
  },
  {
    id: "usr_admin_2",
    firstName: "Sarah",
    middleName: "L.",
    lastName: "Jenkins",
    name: "Prof. Sarah Jenkins",
    email: "lockedadmin@excellence.edu",
    phone: "+1 (555) 876-1234",
    dob: "1982-11-09",
    designation: "Head Administrator",
    role: "admin",
    schoolId: "sch_02",
    schoolName: "BEACON HILL ACADEMY",
    schoolLogoUrl: "https://images.unsplash.com/photo-1541829070764-84a7d30dd3f3?auto=format&fit=crop&w=250&q=80",
    avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=250&q=80",
    locked: true
  },
  {
    id: "usr_teacher_1",
    firstName: "Marcus",
    middleName: "E.",
    lastName: "Thorne",
    name: "Prof. Marcus Thorne",
    email: "teacher@excellence.edu",
    phone: "+1 (555) 432-8765",
    dob: "1988-09-17",
    designation: "Senior Science Lecturer",
    socialLinks: { linkedin: "https://linkedin.com" },
    role: "teacher",
    schoolId: "sch_01",
    schoolName: "EXCELLENCE INTERNATIONAL SCHOOL",
    schoolLogoUrl: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&w=250&q=80",
    assignedClasses: ["Class 10-A", "Class 9-B"],
    assignedSubjects: ["Physics", "Mathematics", "Chemistry", "Computer Science"],
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=250&q=80",
    locked: false
  }
];

export const MOCK_STUDENTS = [
  {
    id: "SCH-2025-1001",
    rollNo: "1001",
    regNo: "REG-1001-A",
    name: "Aiden Vance",
    classSection: "Class 10-A",
    guardianName: "David Vance",
    dob: "2009-04-12",
    gender: "Male",
    phone: "+1 (555) 234-5678",
    address: "742 Evergreen Terrace, Knowledge City",
    photo: "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=250&q=80",
    status: "Active",
    attendanceDays: 13,
    totalWorkingDays: 16
  },
  {
    id: "SCH-2025-1002",
    rollNo: "1002",
    regNo: "REG-1002-B",
    name: "Sophia Martinez",
    classSection: "Class 10-A",
    guardianName: "Carlos Martinez",
    dob: "2009-08-25",
    gender: "Female",
    phone: "+1 (555) 876-5432",
    address: "128 Beacon Street, Knowledge City",
    photo: "https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=250&q=80",
    status: "Active",
    attendanceDays: 15,
    totalWorkingDays: 16
  },
  {
    id: "SCH-2025-1003",
    rollNo: "1003",
    regNo: "REG-1003-C",
    name: "Liam O'Connor",
    classSection: "Class 10-A",
    guardianName: "Patrick O'Connor",
    dob: "2009-01-30",
    gender: "Male",
    phone: "+1 (555) 345-6789",
    address: "59 Highland Way, Knowledge City",
    photo: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=250&q=80",
    status: "Active",
    attendanceDays: 12,
    totalWorkingDays: 16
  }
];

// Single Student All-Subject Marks Grid data structure
export const MOCK_MARKS = [
  {
    studentId: "SCH-2025-1001",
    studentName: "Aiden Vance",
    classSection: "Class 10-A",
    rollNo: "1001",
    subjects: [
      { name: "Physics", midTerm: 28, finalExam: 48, assignment: 10, practical: 14, maxMarks: 100, obtainedMarks: 100, grade: "A+", remarks: "Excellent mechanics" },
      { name: "Mathematics", midTerm: 29, finalExam: 49, assignment: 10, practical: 10, maxMarks: 100, obtainedMarks: 98, grade: "A+", remarks: "Top analytical solver" },
      { name: "Chemistry", midTerm: 26, finalExam: 45, assignment: 9, practical: 13, maxMarks: 100, obtainedMarks: 93, grade: "A+", remarks: "Strong lab skills" },
      { name: "Computer Science", midTerm: 30, finalExam: 50, assignment: 10, practical: 10, maxMarks: 100, obtainedMarks: 100, grade: "A+", remarks: "Flawless code" }
    ],
    overallRank: 1,
    promotionStatus: "PROMOTED TO CLASS 11",
    teacherRemarks: "Aiden has demonstrated phenomenal academic discipline and leadership qualities throughout the session."
  },
  {
    studentId: "SCH-2025-1002",
    studentName: "Sophia Martinez",
    classSection: "Class 10-A",
    rollNo: "1002",
    subjects: [
      { name: "Physics", midTerm: 25, finalExam: 44, assignment: 9, practical: 12, maxMarks: 100, obtainedMarks: 90, grade: "A+", remarks: "Solid work" },
      { name: "Mathematics", midTerm: 27, finalExam: 46, assignment: 9, practical: 9, maxMarks: 100, obtainedMarks: 91, grade: "A+", remarks: "Very diligent" },
      { name: "Chemistry", midTerm: 24, finalExam: 42, assignment: 8, practical: 12, maxMarks: 100, obtainedMarks: 86, grade: "A", remarks: "Good effort" },
      { name: "Computer Science", midTerm: 28, finalExam: 47, assignment: 10, practical: 10, maxMarks: 100, obtainedMarks: 95, grade: "A+", remarks: "Great logic" }
    ],
    overallRank: 2,
    promotionStatus: "PROMOTED TO CLASS 11",
    teacherRemarks: "Sophia is an exemplary student with high attendance and active participation."
  }
];

export const MOCK_CHALANS = [
  {
    chalanId: "CHL-2025-08-1001",
    studentId: "SCH-2025-1001",
    studentName: "Aiden Vance",
    rollNo: "1001",
    classSection: "Class 10-A",
    monthYear: "August 2025",
    tuitionFee: 350,
    examFee: 50,
    transportFee: 40,
    otherFee: 20,
    prevBalance: 0,
    lateFee: 0,
    discounts: 20,
    totalAmount: 440,
    dueDate: "2025-08-10",
    status: "Paid",
    issuedDate: "2025-08-01"
  },
  {
    chalanId: "CHL-2025-08-1002",
    studentId: "SCH-2025-1002",
    studentName: "Sophia Martinez",
    rollNo: "1002",
    classSection: "Class 10-A",
    monthYear: "August 2025",
    tuitionFee: 350,
    examFee: 50,
    transportFee: 0,
    otherFee: 15,
    prevBalance: 0,
    lateFee: 0,
    discounts: 0,
    totalAmount: 415,
    dueDate: "2025-08-10",
    status: "Unpaid",
    issuedDate: "2025-08-01"
  }
];

export const MOCK_REMINDERS = [
  {
    id: "rem_01",
    title: "Mid-Term Exam Marks Deadline",
    content: "All faculty members must finalize and upload mid-term marks for Class 9 and 10 by Friday 5:00 PM.",
    sender: "Dr. Robert Sterling (School Admin)",
    date: "2026-08-25",
    priority: "High"
  }
];

// Horizontal Lecture Register initial data
export const MOCK_LECTURE_REGISTER = [];
