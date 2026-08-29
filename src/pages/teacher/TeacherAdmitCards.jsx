import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import AppSidebar from '../../components/sidebar/AppSidebar';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import AdmitCardTemplate from '../../components/pdf/AdmitCardTemplate';
import { exportElementToPdf, triggerPrint } from '../../utils/pdfGenerator';
import { Ticket, Plus, Download, Printer, Edit3, Trash2 } from 'lucide-react';

export default function TeacherAdmitCards() {
  const {
    admitCards,
    students,
    currentUser,
    schools,
    addAdmitCard,
    updateAdmitCard,
    deleteAdmitCard
  } = useApp();

  const currentSchool = schools.find(s => String(s.id) === String(currentUser?.schoolId || currentUser?.school_id)) || schools[0];

  const schoolInfo = {
    name: currentSchool?.name || currentUser?.schoolName || currentUser?.school_name || "Eduzenta School",
    logoUrl: currentSchool?.logoUrl || currentSchool?.logo_url || currentUser?.schoolLogoUrl || currentUser?.school_logo_url || "",
    address: currentSchool?.address || "Education Boulevard, Knowledge City"
  };

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState(null);
  const [singlePreviewCard, setSinglePreviewCard] = useState(null);
  const [isBulkPreviewModalOpen, setIsBulkPreviewModalOpen] = useState(false);

  // Form Fields
  const [studentId, setStudentId] = useState(students[0]?.id || '');
  const [term, setTerm] = useState('1st Term');
  const [examCenter, setExamCenter] = useState('Main Campus Block B (Hall A)');

  const handleAddSubmit = (e) => {
    e.preventDefault();
    const std = students.find(s => s.id === studentId);
    if (!std) return;

    addAdmitCard({
      studentId: std.id,
      studentName: std.name,
      rollNo: std.rollNo,
      regNo: std.regNo || 'REG-1001-A',
      classSection: std.classSection,
      term,
      examCenter
    });
    setIsAddModalOpen(false);
  };

  const handleEditOpen = (card) => {
    setEditingCardId(card.id);
    setTerm(card.term || '1st Term');
    setExamCenter(card.examCenter || 'Main Campus Block B (Hall A)');
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    updateAdmitCard(editingCardId, { term, examCenter });
    setIsEditModalOpen(false);
  };

  const columns = [
    {
      label: 'Roll & Reg No',
      accessor: 'rollNo',
      render: (row) => (
        <div>
          <div className="font-extrabold text-[#5A3193]">{row.rollNo}</div>
          <div className="text-[11px] text-slate-500 font-mono">{row.regNo || 'REG-1001-A'}</div>
        </div>
      )
    },
    { label: 'Student Name', accessor: 'studentName font-black text-slate-900' },
    { label: 'Class', accessor: 'classSection' },
    { label: 'Exam Term', accessor: 'term font-bold text-slate-800' },
    { label: 'Hall & Center', accessor: 'examCenter font-mono text-[11px]' },
    {
      label: 'Faculty CRUD Actions',
      sortable: false,
      render: (row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSinglePreviewCard(row)}
            className="px-2.5 py-1 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-[#5A3193] text-xs font-bold transition-colors flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>PDF</span>
          </button>
          <button
            onClick={() => handleEditOpen(row)}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => deleteAdmitCard(row.id)}
            className="p-1.5 rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
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
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Class Admit Cards (Faculty Management)</h1>
            <p className="text-xs text-slate-500 font-medium">Issue, edit, delete, and download exam hall tickets for your assigned classes.</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl qobe-btn-primary text-xs font-bold shadow-md transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Issue Admit Card</span>
            </button>

            <button
              onClick={() => setIsBulkPreviewModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-900 hover:bg-purple-800 text-white text-xs font-bold shadow-md transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>Bulk Print Class Tickets</span>
            </button>
          </div>
        </div>

        <DataTable
          title="Assigned Class Hall Tickets"
          subtitle="Full CRUD permissions granted for faculty members"
          columns={columns}
          data={admitCards}
          searchPlaceholder="Search student, roll number, term..."
          onPdfExport={() => setIsBulkPreviewModalOpen(true)}
        />

        {/* Add Modal */}
        <Modal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          title="Issue New Class Admit Card"
        >
          <form onSubmit={handleAddSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Student</label>
              <select
                value={studentId}
                onChange={e => setStudentId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 bg-white font-medium"
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.name} (Roll: {s.rollNo} - {s.classSection})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Examination Term</label>
              <select
                value={term}
                onChange={e => setTerm(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 bg-white font-bold"
              >
                <option value="1st Term">1st Term Examination</option>
                <option value="2nd Term">2nd Term Examination</option>
                <option value="3rd Term">3rd Term Examination</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Assigned Exam Center / Hall</label>
              <input
                type="text"
                value={examCenter}
                onChange={e => setExamCenter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl qobe-btn-primary text-xs font-bold"
              >
                Issue Hall Ticket
              </button>
            </div>
          </form>
        </Modal>

        {/* Edit Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Update Class Admit Card"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Examination Term</label>
              <select
                value={term}
                onChange={e => setTerm(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 bg-white font-bold"
              >
                <option value="1st Term">1st Term Examination</option>
                <option value="2nd Term">2nd Term Examination</option>
                <option value="3rd Term">3rd Term Examination</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Exam Center & Hall</label>
              <input
                type="text"
                value={examCenter}
                onChange={e => setExamCenter(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl qobe-btn-primary text-xs font-bold"
              >
                Save Ticket Details
              </button>
            </div>
          </form>
        </Modal>

        {/* Single Download Modal */}
        <Modal
          isOpen={!!singlePreviewCard}
          onClose={() => setSinglePreviewCard(null)}
          title={`Admit Card: ${singlePreviewCard?.studentName}`}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-end gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <button
                onClick={triggerPrint}
                className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold"
              >
                Window Print
              </button>
              <button
                onClick={() => exportElementToPdf('single-admit-pdf', `Eduzenta_AdmitCard_${singlePreviewCard?.rollNo}.pdf`)}
                className="px-3.5 py-1.5 rounded-xl qobe-btn-primary text-xs font-bold"
              >
                Download PDF
              </button>
            </div>

            <div id="single-admit-pdf">
              <AdmitCardTemplate student={singlePreviewCard} schoolInfo={schoolInfo} />
            </div>
          </div>
        </Modal>

        {/* Bulk Printable Modal */}
        <Modal
          isOpen={isBulkPreviewModalOpen}
          onClose={() => setIsBulkPreviewModalOpen(false)}
          title="Printable Bulk Class Admit Cards PDF"
          maxWidth="max-w-4xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-end gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <button
                onClick={triggerPrint}
                className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold"
              >
                Window Print
              </button>
              <button
                onClick={() => exportElementToPdf('bulk-admit-pdf-container', `Eduzenta_Bulk_AdmitCards_${Date.now()}.pdf`)}
                className="px-3.5 py-1.5 rounded-xl qobe-btn-primary text-xs font-bold"
              >
                Download Bulk PDF
              </button>
            </div>

            <div id="bulk-admit-pdf-container" className="space-y-6">
              {admitCards.map(c => (
                <AdmitCardTemplate key={c.id} student={c} schoolInfo={schoolInfo} />
              ))}
            </div>
          </div>
        </Modal>
      </main>
    </div>
  );
}
