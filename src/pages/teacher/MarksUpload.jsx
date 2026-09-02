import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import AppSidebar from '../../components/sidebar/AppSidebar';
import { FileCheck2, Save, Sparkles, CheckCircle2 } from 'lucide-react';
import CreateActivityModal from '../../components/common/CreateActivityModal';
import ActivityOutcomeModal from '../../components/common/ActivityOutcomeModal';

export default function MarksUpload() {
  const { currentUser, students, marks, myClasses, saveSingleStudentAllSubjectMarks, activities, createActivity, updateStudentMarksForActivity } = useApp();

  // Modal state
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [selectedActivityId, setSelectedActivityId] = useState(null);
  const [isOutcomeModalOpen, setOutcomeModalOpen] = useState(false);

  const assignedClasses = Array.isArray(myClasses) && myClasses.length ? myClasses : [];
  const assignedSubjects = currentUser?.assignedSubjects || [];

  const [selectedClass, setSelectedClass] = useState(assignedClasses[0] || '');
  const [selectedTerm, setSelectedTerm] = useState('1st Term');
  const classStudents = students.filter(s => s.classSection === selectedClass);
  const [selectedStudentId, setSelectedStudentId] = useState('');

  // Selected student mark data or default subject grid
  const currentStudentMarkObj = marks.find(m => m.studentId === selectedStudentId && (m.term === selectedTerm || !m.term));

  const [subjectGrid, setSubjectGrid] = useState(() => {
    return assignedSubjects.map(subName => {
      const existingSub = currentStudentMarkObj?.subjects.find(s => (s.subject || s.name) === subName);
      return {
        name: subName,
        theoryMarks: existingSub?.obtainedMarks ?? '',
        maxMarks: existingSub?.maxMarks || 100,
        remarks: existingSub?.remarks || ''
      };
    });
  });

  const [teacherRemarks, setTeacherRemarks] = useState(currentStudentMarkObj?.teacherRemarks || '');

  const handleStudentSelect = (stdId, termVal = selectedTerm) => {
    setSelectedStudentId(stdId);
    const markObj = marks.find(m => m.studentId === stdId && (m.term === termVal || !m.term));
    if (markObj) {
      setSubjectGrid(assignedSubjects.map(subName => {
        const existingSub = markObj.subjects.find(s => (s.subject || s.name) === subName);
        return {
          name: subName,
          theoryMarks: existingSub?.obtainedMarks ?? '',
          maxMarks: existingSub?.maxMarks || 100,
          remarks: existingSub?.remarks || ''
        };
      }));
      setTeacherRemarks(markObj.teacherRemarks || '');
    }
  };

  const handleTermChange = (newTerm) => {
    setSelectedTerm(newTerm);
    handleStudentSelect(selectedStudentId, newTerm);
  };

  const handleGridChange = (index, value) => {
    setSubjectGrid(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], theoryMarks: Number(value) };
      return copy;
    });
  };

  const handleRemarksChange = (index, remarks) => {
    setSubjectGrid(prev => {
      const copy = [...prev];
      copy[index] = { ...copy[index], remarks };
      return copy;
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedStudentId) return;

    // Calculate totals for each subject (Max Marks 100)
    const compiledSubjects = subjectGrid.map(sub => {
      const obt = sub.theoryMarks || 0;
      const pct = (obt / (sub.maxMarks || 100)) * 100;
      let grade = 'F';
      if (pct >= 90) grade = 'A+';
      else if (pct >= 80) grade = 'A';
      else if (pct >= 70) grade = 'B+';
      else if (pct >= 60) grade = 'B';
      else if (pct >= 50) grade = 'C';

      return {
        subject: sub.name,
        maxMarks: sub.maxMarks || 100,
        obtainedMarks: obt,
        grade,
        remarks: sub.remarks
      };
    });

    saveSingleStudentAllSubjectMarks(selectedStudentId, compiledSubjects, teacherRemarks, selectedTerm);
  };

  const selectedStudentObj = students.find(s => s.id === selectedStudentId);

  return (
    <div className="flex flex-col md:flex-row min-h-screen min-h-[100dvh] bg-slate-100 font-sans overflow-x-hidden w-full max-w-full">
      <AppSidebar />

      <main className="flex-1 w-full min-w-0 overflow-x-hidden p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">K-12 Term Marks Entry Engine</h1>
            <p className="text-xs text-slate-500 font-medium">Select student and term (1st, 2nd, 3rd Term) to update marks for all subjects simultaneously (100 Max Marks per subject).</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 transition text-xs min-h-[44px] flex items-center gap-1.5 shadow-sm"
            >
              Add Subject / Create Activity
            </button>
            <select
              value={selectedTerm}
              onChange={e => handleTermChange(e.target.value)}
              className="py-2.5 px-4 rounded-xl border border-purple-300 bg-purple-50 text-xs font-black text-[#5A3193] shadow-xs cursor-pointer"
            >
              <option value="1st Term">1st Term Examination</option>
              <option value="2nd Term">2nd Term Examination</option>
              <option value="3rd Term">3rd Term Examination</option>
            </select>

            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="py-2.5 px-4 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 shadow-xs"
            >
              {assignedClasses.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Activities List */}
        {activities && activities.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 mb-6">
            <h2 className="text-lg font-bold text-slate-800 mb-3">Activities</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse border border-slate-200">
                <thead>
                  <tr className="bg-slate-900 text-white text-[11px] font-extrabold uppercase tracking-wider">
                    <th className="p-3 border border-slate-800">Name</th>
                    <th className="p-3 border border-slate-800">Subject</th>
                    <th className="p-3 border border-slate-800">Class</th>
                    <th className="p-3 border border-slate-800">Term</th>
                    <th className="p-3 border border-slate-800">Max Marks</th>
                    <th className="p-3 border border-slate-800 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-xs">
                  {activities.map(act => (
                    <tr key={act.id} className="bg-white">
                      <td className="p-3 border border-slate-200 font-medium text-slate-900">{act.name}</td>
                      <td className="p-3 border border-slate-200">{act.subject}</td>
                      <td className="p-3 border border-slate-200">{act.classSection}</td>
                      <td className="p-3 border border-slate-200">{act.term}</td>
                      <td className="p-3 border border-slate-200 text-center">{act.maxMarks}</td>
                      <td className="p-3 border border-slate-200 text-center">
                        <button
                          onClick={() => {
                            setSelectedActivityId(act.id);
                            setOutcomeModalOpen(true);
                          }}
                          className="px-3 py-1 rounded-md bg-indigo-600 text-white text-xs hover:bg-indigo-700 transition"
                        >
                          View Activity Outcome
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Student Selector Row */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#5A3193] to-pink-500 flex items-center justify-center text-white font-black text-sm border-2 border-[#5A3193] shadow-xs shrink-0">
              {(selectedStudentObj?.name || 'S').split(' ').filter(Boolean).map(p => p[0]).slice(0, 2).join('').toUpperCase() || 'S'}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">{selectedStudentObj?.name}</h3>
              <p className="text-xs text-slate-500 font-mono">Roll: {selectedStudentObj?.rollNo} | ID: {selectedStudentObj?.id} | Reg: {selectedStudentObj?.regNo || '—'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600">Switch Student:</span>
            <select
              value={selectedStudentId}
              onChange={e => handleStudentSelect(e.target.value)}
              className="py-2 px-3 text-xs rounded-xl border border-purple-300 bg-purple-50 font-extrabold text-[#5A3193] focus:outline-none"
            >
              {classStudents.map(std => (
                <option key={std.id} value={std.id}>{std.name} ({std.rollNo})</option>
              ))}
            </select>
          </div>
        </div>

        {/* Single Student All-Subject Marks Entry Grid */}
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <h3 className="text-base font-black text-slate-900">
              {selectedTerm} Marks Grid ({selectedStudentObj?.name})
            </h3>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl qobe-btn-primary text-xs font-black shadow-md flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Submit & Save All-Subject Marks</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-slate-200">
              <thead>
                <tr className="bg-slate-900 text-white text-[11px] font-extrabold uppercase tracking-wider">
                  <th className="p-3 border border-slate-800">Assigned Subject</th>
                  <th className="p-3 border border-slate-800 text-center w-36">Max Marks</th>
                  <th className="p-3 border border-slate-800 text-center w-48">Obtained Marks</th>
                  <th className="p-3 border border-slate-800 text-center w-28">Grade</th>
                  <th className="p-3 border border-slate-800">Subject Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {subjectGrid.map((sub, idx) => {
                  const obt = sub.theoryMarks || 0;
                  const pct = (obt / 100) * 100;
                  let grade = 'F';
                  if (pct >= 90) grade = 'A+';
                  else if (pct >= 80) grade = 'A';
                  else if (pct >= 70) grade = 'B+';
                  else if (pct >= 60) grade = 'B';
                  else if (pct >= 50) grade = 'C';

                  return (
                    <tr key={sub.name} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"}>
                      <td className="p-3 font-extrabold text-slate-900 border border-slate-200">{sub.name}</td>
                      <td className="p-3 text-center border border-slate-200 font-bold text-slate-700">100</td>
                      <td className="p-2 border border-slate-200 text-center">
                        <input
                          type="number"
                          max={100}
                          value={sub.theoryMarks}
                          onChange={e => handleGridChange(idx, e.target.value)}
                          className="w-full text-center py-2 px-3 rounded-xl border border-slate-300 font-mono font-extrabold text-[#5A3193] focus:ring-2 focus:ring-purple-500 bg-purple-50/30"
                        />
                      </td>
                      <td className="p-3 text-center border border-slate-200 font-black text-sm text-[#5A3193]">
                        {grade}
                      </td>
                      <td className="p-2 border border-slate-200">
                        <input
                          type="text"
                          value={sub.remarks}
                          onChange={e => handleRemarksChange(idx, e.target.value)}
                          className="w-full py-1.5 px-2.5 rounded-xl border border-slate-300 text-slate-700 italic"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Class Teacher Remarks for Term Progress Report</label>
            <textarea
              rows={3}
              value={teacherRemarks}
              onChange={e => setTeacherRemarks(e.target.value)}
              placeholder="Write general remarks for student term progress report..."
              className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500"
            ></textarea>
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              className="px-6 py-3 rounded-xl qobe-btn-primary text-xs font-black shadow-md flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>Submit & Compile Term Progress Report</span>
            </button>
          </div>
        </form>

        {/* Modals */}
        <CreateActivityModal
          isOpen={isCreateModalOpen}
          onClose={() => setCreateModalOpen(false)}
        />
        {selectedActivityId && (
          <ActivityOutcomeModal
            isOpen={isOutcomeModalOpen}
            onClose={() => setOutcomeModalOpen(false)}
            activityId={selectedActivityId}
          />
        )}
      </main>
    </div>
  );
}
