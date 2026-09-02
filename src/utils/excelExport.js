import * as XLSX from 'xlsx';

/**
 * Export activity marks to an Excel file.
 * @param {string} activityId - The ID of the activity to export.
 * @param {Array} activities - Activities array from context.
 * @param {Array} students - Students array from context.
 * @param {Array} marks - Marks array from context.
 */
export function exportActivityToExcel(activityId, activities, students, marks) {
  const activity = activities.find((a) => a.id === activityId);
  if (!activity) {
    console.warn('Activity not found for export');
    return;
  }
  // Gather student rows for this activity's class and term
  const classStudents = students.filter((s) => s.classSection === activity.classSection);
  const rows = classStudents.map((student) => {
    const existing = marks.find((m) => m.studentId === student.id && m.term === activity.term);
    const subjectEntry = existing?.subjects?.find((sub) => (sub.subject || sub.name) === activity.subject);
    return {
      StudentId: student.id,
      StudentName: student.name,
      ClassSection: student.classSection,
      ObtainedMarks: subjectEntry?.obtainedMarks ?? 0,
      Remarks: subjectEntry?.remarks ?? ''
    };
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, activity.name.replace(/\s+/g, '_'));
  const filename = `${activity.name.replace(/\s+/g, '_')}_Marks.xlsx`;
  XLSX.writeFile(wb, filename);
}
