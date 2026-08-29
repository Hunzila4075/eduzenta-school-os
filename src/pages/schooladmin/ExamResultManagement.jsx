import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import AppSidebar from '../../components/sidebar/AppSidebar';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import ResultCardTemplate from '../../components/pdf/ResultCardTemplate';
import { exportElementToPdf, triggerPrint } from '../../utils/pdfGenerator';
import { FileCheck2, Download, Printer, Edit3, Eye, Award, Search, Sparkles } from 'lucide-react';

export default function ExamResultManagement() {
  const {
    students,
    marks,
    currentUser,
    schools,
    uploadStudentMarks
  } = useApp();

  const currentSchool = schools.find(s => String(s.id) === String(currentUser?.schoolId || currentUser?.school_id)) || schools[0];

  const schoolInfo = {
    name: currentSchool?.name || currentUser?.schoolName || currentUser?.school_name || "Eduzenta School",
    logoUrl: currentSchool?.logoUrl || currentSchool?.logo_url || currentUser?.schoolLogoUrl || currentUser?.school_logo_url || "",
    address: currentSchool?.address || "Education Boulevard, Knowledge City"
  };

  const [selectedClass, setSelectedClass] = useState('Class 10-A');
  const [selectedTerm, setSelectedTerm] = useState('1st Term');
  const [rollSearch, setRollSearch] = useState('');

  const [isPreviewPdfModalOpen, setIsPreviewPdfModalOpen] = useState(false);
  const [singleStudentPreview, setSingleStudentPreview] = useState(null);
  const [isMarksEditModalOpen, setIsMarksEditModalOpen] = useState(false);

  const [targetStudentId, setTargetStudentId] = useState('');
  const [editSubjectName, setEditSubjectName] = useState('Mathematics');
  const [editMaxMarks, setEditMaxMarks] = useState(100);
  const [editObtainedMarks, setEditObtainedMarks] = useState(95);

  // Filter students by class and roll no / reg no / name live search
  const classStudents = students.filter(s => {
    const matchesClass = s.classSection === selectedClass;
    if (!matchesClass) return false;
    if (!rollSearch.trim()) return true;
    const query = rollSearch.toLowerCase().trim();
    return (
      (s.rollNo && s.rollNo.toLowerCase().includes(query)) ||
      (s.regNo && s.regNo.toLowerCase().includes(query)) ||
      (s.name && s.name.toLowerCase().includes(query)) ||
      (s.id && s.id.toLowerCase().includes(query))
    );
  });

  const handleBulkPdfExport = () => {
    exportElementToPdf('bulk-result-pdf-container', `Eduzenta_Term_Results_${selectedTerm.replace(/\s+/g, '_')}_${selectedClass.replace(/\s+/g, '_')}.pdf`);
  };

  const handleSinglePdfExport = () => {
    if (!singleStudentPreview) return;
    exportElementToPdf('single-result-pdf-container', `Result_Card_${singleStudentPreview.rollNo}_${singleStudentPreview.name.replace(/\s+/g, '_')}.pdf`);
  };

  const handleSaveMarksSubmit = (e) => {
    e.preventDefault();
    if (!targetStudentId) return;
    uploadStudentMarks(targetStudentId, editSubjectName, editMaxMarks, editObtainedMarks, "Updated by School Admin");
    setIsMarksEditModalOpen(false);
  };

  const columns = [
    {
      label: 'Student Name & ID',
      accessor: 'name',
      render: (row) => (
        <div>
          <div className="font-extrabold text-slate-900">{row.name}</div>
          <div className="text-[11px] text-slate-500 font-mono">ID: {row.id} | Roll: {row.rollNo}</div>
        </div>
      )
    },
    { label: 'Class & Section', accessor: 'classSection' },
    {
      label: `${selectedTerm} Status`,
      accessor: 'id',
      render: (row) => {
        const m = marks.find(mk => mk.studentId === row.id && (mk.term === selectedTerm || !mk.term));
        if (!m || !m.subjects || m.subjects.length === 0) {
          return <span className="text-slate-400 text-xs italic">Marks Pending</span>;
        }
        const totalMax = m.subjects.reduce((a, s) => a + (s.maxMarks || 100), 0);
        const totalObt = m.subjects.reduce((a, s) => a + (s.obtainedMarks || 0), 0);
        const pct = totalMax > 0 ? ((totalObt / totalMax) * 100).toFixed(1) : 0;
        return (
          <div>
            <span className="font-black text-purple-900">{pct}%</span>
            <span className="ml-2 px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
              Rank #{m.overallRank || 1}
            </span>
          </div>
        );
      }
    },
    {
      label: 'Actions',
      sortable: false,
      render: (row) => (
        <div className="flex items-center gap-2">
          {/* Individual Export Result Card */}
          <button
            onClick={() => setSingleStudentPreview(row)}
            className="px-2.5 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-bold hover:bg-emerald-100 transition-colors flex items-center gap-1"
            title="Export / Download Individual Result Card"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Result Card</span>
          </button>

          {/* Update Marks */}
          <button
            onClick={() => {
              setTargetStudentId(row.id);
              setIsMarksEditModalOpen(true);
            }}
            className="px-2.5 py-1.5 rounded-xl bg-purple-50 border border-purple-200 text-purple-700 text-xs font-bold hover:bg-purple-100 transition-colors flex items-center gap-1"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Update Marks</span>
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans">
      <AppSidebar />

      <main className="flex-1 p-6 md:p-8 overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Printable Result Cards & Academic Reports</h1>
            <p className="text-xs text-slate-500 font-medium">Select Term results, search by Roll/Reg No, and export individual or class-wide PDF result cards.</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedClass}
              onChange={e => setSelectedClass(e.target.value)}
              className="py-2.5 px-4 rounded-xl border border-slate-300 bg-white text-xs font-bold text-slate-800 shadow-xs focus:ring-2 focus:ring-blue-500"
            >
              <option value="Class 10-A">Class 10-A</option>
              <option value="Class 9-B">Class 9-B</option>
            </select>

            <button
              onClick={() => setIsPreviewPdfModalOpen(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white text-xs font-black shadow-lg shadow-purple-600/20 transition-all transform hover:-translate-y-0.5"
            >
              <Download className="w-4 h-4" />
              <span>Export {selectedTerm} Class Results PDF</span>
            </button>
          </div>
        </div>

        {/* Term Selection & Live Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* 3 Term Selector Tabs */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wide mr-1">Term:</span>
            {['1st Term', '2nd Term', '3rd Term'].map(t => (
              <button
                key={t}
                onClick={() => setSelectedTerm(t)}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  selectedTerm === t
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Roll Number / Reg No Search Box */}
          <div className="relative min-w-[280px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={rollSearch}
              onChange={e => setRollSearch(e.target.value)}
              placeholder="Search by Roll No, Reg No, or Name..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-300 font-medium focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Feature Specs Reminder Banner */}
        <div className="mb-6 p-4 rounded-2xl bg-purple-900 text-white border border-purple-800 shadow-sm flex items-start justify-between">
          <div>
            <h4 className="font-extrabold text-sm flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-400" />
              Result Card Printable PDF Engine Specifications
            </h4>
            <p className="text-xs text-purple-200 mt-1 leading-normal max-w-3xl">
              Includes Eduzenta logo, editable school header, student info table, subject performance, auto-calculated percentage, attendance ratio, teacher remarks, signature lines, and mandatory watermark disclaimer footers.
            </p>
          </div>
        </div>

        <DataTable
          title={`Class Academic Records: ${selectedClass} (${selectedTerm})`}
          subtitle="Compile class results into continuous multi-page PDF"
          columns={columns}
          data={classStudents}
          searchPlaceholder="Search student name or ID..."
          onPdfExport={() => setIsPreviewPdfModalOpen(true)}
        />

        {/* Edit Marks Modal */}
        <Modal
          isOpen={isMarksEditModalOpen}
          onClose={() => setIsMarksEditModalOpen(false)}
          title="Update Subject Marks & Evaluation"
        >
          <form onSubmit={handleSaveMarksSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Subject Name</label>
              <select
                value={editSubjectName}
                onChange={e => setEditSubjectName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 bg-white font-medium"
              >
                <option value="Mathematics">Mathematics</option>
                <option value="Physics">Physics</option>
                <option value="Chemistry">Chemistry</option>
                <option value="English Literature">English Literature</option>
                <option value="Computer Science">Computer Science</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Max Marks</label>
                <input
                  type="number"
                  value={editMaxMarks}
                  onChange={e => setEditMaxMarks(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Obtained Marks</label>
                <input
                  type="number"
                  value={editObtainedMarks}
                  onChange={e => setEditObtainedMarks(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsMarksEditModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-sm"
              >
                Save Subject Evaluation
              </button>
            </div>
          </form>
        </Modal>

        {/* Individual Student Result Card Modal */}
        <Modal
          isOpen={!!singleStudentPreview}
          onClose={() => setSingleStudentPreview(null)}
          title={`Individual Result Card: ${singleStudentPreview?.name} (${singleStudentPreview?.rollNo}) - ${selectedTerm}`}
          maxWidth="max-w-4xl"
        >
          {singleStudentPreview && (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-xs font-bold text-slate-700">Official Eduzenta Student Result Card</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={triggerPrint}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print</span>
                  </button>
                  <button
                    onClick={handleSinglePdfExport}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1 shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download PDF</span>
                  </button>
                </div>
              </div>

              <div id="single-result-pdf-container">
                <ResultCardTemplate
                  student={singleStudentPreview}
                  markData={marks.find(m => m.studentId === singleStudentPreview.id && (m.term === selectedTerm || !m.term))}
                  schoolInfo={schoolInfo}
                />
              </div>
            </div>
          )}
        </Modal>

        {/* Bulk Class PDF Preview Modal */}
        <Modal
          isOpen={isPreviewPdfModalOpen}
          onClose={() => setIsPreviewPdfModalOpen(false)}
          title={`Printable Bulk ${selectedTerm} Result Cards: ${selectedClass}`}
          maxWidth="max-w-5xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700">Continuous Multi-Page Result Cards ({selectedTerm})</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={triggerPrint}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors flex items-center gap-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Window Print</span>
                </button>
                <button
                  onClick={handleBulkPdfExport}
                  className="px-3.5 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-bold hover:bg-purple-700 transition-colors flex items-center gap-1 shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Bulk PDF</span>
                </button>
              </div>
            </div>

            {/* Container for html2canvas */}
            <div id="bulk-result-pdf-container" className="space-y-8 bg-slate-200 p-4 rounded-xl">
              {classStudents.map(std => {
                const stdMark = marks.find(m => m.studentId === std.id && (m.term === selectedTerm || !m.term));
                return (
                  <ResultCardTemplate
                    key={std.id}
                    student={std}
                    markData={stdMark}
                    schoolInfo={schoolInfo}
                  />
                );
              })}
            </div>
          </div>
        </Modal>
      </main>
    </div>
  );
}
