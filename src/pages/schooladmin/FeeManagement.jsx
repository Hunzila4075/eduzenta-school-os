import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import AppSidebar from '../../components/sidebar/AppSidebar';
import DataTable from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import FeeChalanTemplate from '../../components/pdf/FeeChalanTemplate';
import { exportElementToPdf, triggerPrint } from '../../utils/pdfGenerator';
import { CreditCard, Plus, RefreshCw, Download, Printer, Trash2, Edit3, CheckCircle2 } from 'lucide-react';

export default function FeeManagement() {
  const {
    chalans,
    students,
    currentUser,
    schools,
    createFeeChalan,
    deleteFeeChalan,
    updateFeeStatus,
    updateFeeChalan,
    autoGenerateMonthlyChalans
  } = useApp();

  const currentSchool = schools.find(s => String(s.id) === String(currentUser?.schoolId || currentUser?.school_id)) || schools[0];

  const schoolInfo = {
    name: currentSchool?.name || currentUser?.schoolName || currentUser?.school_name || "Eduzenta School",
    logoUrl: currentSchool?.logoUrl || currentSchool?.logo_url || currentUser?.schoolLogoUrl || currentUser?.school_logo_url || "",
    address: currentSchool?.address || "Education Boulevard, Knowledge City"
  };

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPreviewBulkModalOpen, setIsPreviewBulkModalOpen] = useState(false);
  const [singleChalanPreview, setSingleChalanPreview] = useState(null);

  // Edit Fee Slip state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editChalan, setEditChalan] = useState(null);
  const [editForm, setEditForm] = useState({
    term: '1st Term',
    monthYear: 'August 2025',
    tuitionFee: 0,
    developmentFee: 0,
    examFee: 0,
    libraryFee: 0,
    computerFee: 0,
    activityFee: 0,
    prevBalance: 0,
    lateFee: 0,
    discounts: 0,
    dueDate: '',
    status: 'Unpaid'
  });

  const handleOpenEditModal = (chalan) => {
    setEditChalan(chalan);
    setEditForm({
      term: chalan.term || '1st Term',
      monthYear: chalan.monthYear || 'August 2025',
      tuitionFee: chalan.tuitionFee || 0,
      developmentFee: chalan.developmentFee || 0,
      examFee: chalan.examFee || 0,
      libraryFee: chalan.libraryFee || 0,
      computerFee: chalan.computerFee || 0,
      activityFee: chalan.activityFee || 0,
      prevBalance: chalan.prevBalance || 0,
      lateFee: chalan.lateFee || 0,
      discounts: chalan.discounts || 0,
      dueDate: chalan.dueDate || '2025-08-10',
      status: chalan.status || 'Unpaid'
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    if (!editChalan) return;
    updateFeeChalan(editChalan.chalanId, editForm);
    setIsEditModalOpen(false);
  };

  // Form Fields matching exact sample
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [term, setTerm] = useState('1st Term');
  const [monthYear, setMonthYear] = useState('August 2025');
  const [session, setSession] = useState('2024–2025');
  const [tuitionFee, setTuitionFee] = useState(8000);
  const [developmentFee, setDevelopmentFee] = useState(1500);
  const [examFee, setExamFee] = useState(1000);
  const [libraryFee, setLibraryFee] = useState(500);
  const [computerFee, setComputerFee] = useState(500);
  const [activityFee, setActivityFee] = useState(500);
  const [prevBalance, setPrevBalance] = useState(0);
  const [lateFee, setLateFee] = useState(0);
  const [discounts, setDiscounts] = useState(0);
  const [dueDate, setDueDate] = useState('2025-08-10');

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    const std = students.find(s => s.id === selectedStudentId);
    if (!std) return;

    createFeeChalan({
      studentId: std.id,
      studentName: std.name,
      rollNo: std.rollNo,
      regNo: std.regNo || 'REG-1001-A',
      classSection: std.classSection,
      term,
      monthYear,
      session,
      tuitionFee,
      developmentFee,
      examFee,
      libraryFee,
      computerFee,
      activityFee,
      prevBalance,
      lateFee,
      discounts,
      dueDate,
      status: 'Unpaid'
    });
    setIsCreateModalOpen(false);
  };

  const handleDownloadSingleChalan = (chalan) => {
    setSingleChalanPreview(chalan);
  };

  const handleExportSinglePdf = () => {
    if (!singleChalanPreview) return;
    exportElementToPdf('single-chalan-2part-pdf', `Eduzenta_Chalan_${singleChalanPreview.chalanId}.pdf`);
  };

  const handleExportBulkPdf = () => {
    exportElementToPdf('bulk-fee-pdf-container', `Eduzenta_Bulk_Chalans_${Date.now()}.pdf`);
  };

  const columns = [
    {
      label: 'Chalan ID & Student',
      accessor: 'chalanId',
      render: (row) => (
        <div>
          <div className="font-extrabold text-slate-900">{row.chalanId}</div>
          <div className="text-[11px] text-slate-500 font-medium">{row.studentName} ({row.classSection})</div>
        </div>
      )
    },
    { label: 'Term / Month', accessor: 'term', render: (row) => <span className="font-semibold text-slate-800">{row.term} ({row.monthYear})</span> },
    {
      label: 'Total Net Payable',
      accessor: 'totalAmount',
      render: (row) => <span className="font-extrabold text-[#5A3193]">Rs. {row.totalAmount?.toLocaleString()}</span>
    },
    { label: 'Due Date', accessor: 'dueDate font-mono text-[11px]' },
    {
      label: 'Status Stamp',
      accessor: 'status',
      render: (row) => {
        const isPaid = row.status === 'Paid';
        const isPending = row.status === 'Pending';
        return (
          <select
            value={row.status}
            onChange={(e) => updateFeeStatus(row.chalanId, e.target.value)}
            className={`py-1 px-2.5 rounded-full text-[10px] font-black uppercase tracking-wider border cursor-pointer focus:outline-none ${
              isPaid
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : isPending
                ? 'bg-amber-50 text-amber-800 border-amber-300'
                : 'bg-rose-50 text-rose-700 border-rose-300'
            }`}
          >
            <option value="Paid">Paid</option>
            <option value="Unpaid">Unpaid</option>
            <option value="Pending">Pending</option>
          </select>
        );
      }
    },
    {
      label: 'Actions',
      sortable: false,
      render: (row) => (
        <div className="flex items-center gap-2">
          {/* Edit / Update Fee Slip */}
          <button
            onClick={() => handleOpenEditModal(row)}
            className="p-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 transition-colors flex items-center gap-1 text-xs font-bold"
            title="Update Fee Slip"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Update</span>
          </button>

          {/* Individual Row Download */}
          <button
            onClick={() => handleDownloadSingleChalan(row)}
            className="px-2.5 py-1 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-[#5A3193] text-xs font-bold transition-colors flex items-center gap-1"
            title="Download / Print Single Chalan (A4 Landscape 2-Part Split)"
          >
            <Download className="w-3.5 h-3.5" />
            <span>2-Part PDF</span>
          </button>

          {/* Delete Action */}
          <button
            onClick={() => deleteFeeChalan(row.chalanId)}
            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
            title="Delete Chalan Record"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="flex min-h-screen min-h-[100dvh] bg-slate-100 font-sans overflow-x-hidden w-full max-w-full">
      <AppSidebar />

      <main className="flex-1 w-full min-w-0 overflow-x-hidden p-4 md:p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Fee Chalan Engine (A4 Landscape 2-Part Split)</h1>
            <p className="text-xs text-slate-500 font-medium">Create/delete chalans, download A4 landscape 2-part split PDFs (Student Copy + Institute Copy), and bulk generate for terms.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => autoGenerateMonthlyChalans('August 2025', '2025-08-10', '1st Term')}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-sm transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5 text-purple-400" />
              <span>Auto Bulk Generate (1st Term)</span>
            </button>

            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl qobe-btn-primary text-xs font-bold shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add New Fee Chalan</span>
            </button>

            <button
              onClick={() => setIsPreviewBulkModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-purple-900 hover:bg-purple-800 text-white text-xs font-bold shadow-sm transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Bulk Class 2-Part PDF</span>
            </button>
          </div>
        </div>

        <DataTable
          title="School Fee Chalans Roster"
          subtitle="Click '2-Part PDF' to print/download an A4 Landscape split fee chalan"
          columns={columns}
          data={chalans}
          filterKey="status"
          filterOptions={["Paid", "Unpaid", "Pending"]}
          searchPlaceholder="Search Chalan ID, Student Name, Roll No..."
          onPdfExport={() => setIsPreviewBulkModalOpen(true)}
        />

        {/* Create Chalan Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create New Student Fee Chalan (Exact Sample Breakdown)"
        >
          <form onSubmit={handleCreateSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Select Student</label>
              <select
                value={selectedStudentId}
                onChange={e => setSelectedStudentId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 bg-white font-medium"
              >
                {students.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Roll: {s.rollNo} - {s.classSection})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Academic Term</label>
                <select
                  value={term}
                  onChange={e => setTerm(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 bg-white font-bold"
                >
                  <option value="1st Term">1st Term</option>
                  <option value="2nd Term">2nd Term</option>
                  <option value="3rd Term">3rd Term</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Fee Month</label>
                <input
                  type="text"
                  value={monthYear}
                  onChange={e => setMonthYear(e.target.value)}
                  placeholder="e.g. August 2025"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Tuition Fee (Rs.)</label>
                <input
                  type="number"
                  value={tuitionFee}
                  onChange={e => setTuitionFee(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Development (Rs.)</label>
                <input
                  type="number"
                  value={developmentFee}
                  onChange={e => setDevelopmentFee(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Exam Fee (Rs.)</label>
                <input
                  type="number"
                  value={examFee}
                  onChange={e => setExamFee(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Library Fee (Rs.)</label>
                <input
                  type="number"
                  value={libraryFee}
                  onChange={e => setLibraryFee(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Computer Lab (Rs.)</label>
                <input
                  type="number"
                  value={computerFee}
                  onChange={e => setComputerFee(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Co-Curricular (Rs.)</label>
                <input
                  type="number"
                  value={activityFee}
                  onChange={e => setActivityFee(Number(e.target.value))}
                  className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-300 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Previous Arrears (Rs.)</label>
                <input
                  type="number"
                  value={prevBalance}
                  onChange={e => setPrevBalance(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Late Fine (Rs.)</label>
                <input
                  type="number"
                  value={lateFee}
                  onChange={e => setLateFee(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Discount (Rs.)</label>
                <input
                  type="number"
                  value={discounts}
                  onChange={e => setDiscounts(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl qobe-btn-primary text-xs font-bold shadow-sm"
              >
                Generate A4 Landscape Chalan
              </button>
            </div>
          </form>
        </Modal>

        {/* Single Student Chalan Download Modal (A4 Landscape 2-Part Split) */}
        <Modal
          isOpen={!!singleChalanPreview}
          onClose={() => setSingleChalanPreview(null)}
          title={`Printable A4 Landscape Fee Chalan: ${singleChalanPreview?.chalanId}`}
          maxWidth="max-w-6xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700">A4 Landscape Split: Student Copy (Left) & Institute Copy (Right)</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={triggerPrint}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
                >
                  Window Print
                </button>
                <button
                  onClick={handleExportSinglePdf}
                  className="px-3.5 py-1.5 rounded-xl qobe-btn-primary text-xs font-bold"
                >
                  Download PDF
                </button>
              </div>
            </div>

            <div id="single-chalan-2part-pdf">
              <FeeChalanTemplate chalan={singleChalanPreview} schoolInfo={schoolInfo} />
            </div>
          </div>
        </Modal>

        {/* Update Fee Slip Modal */}
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title={`Update Fee Slip: ${editChalan?.chalanId} (${editChalan?.studentName})`}
          maxWidth="max-w-3xl"
        >
          <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Term</label>
                <select
                  value={editForm.term}
                  onChange={(e) => setEditForm(prev => ({ ...prev, term: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold focus:outline-none focus:border-purple-500"
                >
                  <option value="1st Term">1st Term</option>
                  <option value="2nd Term">2nd Term</option>
                  <option value="3rd Term">3rd Term</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Month / Year</label>
                <input
                  type="text"
                  value={editForm.monthYear}
                  onChange={(e) => setEditForm(prev => ({ ...prev, monthYear: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Due Date</label>
                <input
                  type="date"
                  value={editForm.dueDate}
                  onChange={(e) => setEditForm(prev => ({ ...prev, dueDate: e.target.value }))}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <h4 className="font-extrabold text-slate-900 uppercase tracking-wide text-[10px] mb-3">Fee Breakdown Breakdown (Rs.)</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600">Tuition Fee</label>
                  <input
                    type="number"
                    value={editForm.tuitionFee}
                    onChange={(e) => setEditForm(prev => ({ ...prev, tuitionFee: e.target.value }))}
                    className="w-full p-2 rounded-lg border border-slate-200 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600">Development Fee</label>
                  <input
                    type="number"
                    value={editForm.developmentFee}
                    onChange={(e) => setEditForm(prev => ({ ...prev, developmentFee: e.target.value }))}
                    className="w-full p-2 rounded-lg border border-slate-200 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600">Exam Fee</label>
                  <input
                    type="number"
                    value={editForm.examFee}
                    onChange={(e) => setEditForm(prev => ({ ...prev, examFee: e.target.value }))}
                    className="w-full p-2 rounded-lg border border-slate-200 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600">Library Fee</label>
                  <input
                    type="number"
                    value={editForm.libraryFee}
                    onChange={(e) => setEditForm(prev => ({ ...prev, libraryFee: e.target.value }))}
                    className="w-full p-2 rounded-lg border border-slate-200 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600">Computer Fee</label>
                  <input
                    type="number"
                    value={editForm.computerFee}
                    onChange={(e) => setEditForm(prev => ({ ...prev, computerFee: e.target.value }))}
                    className="w-full p-2 rounded-lg border border-slate-200 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600">Activity Fee</label>
                  <input
                    type="number"
                    value={editForm.activityFee}
                    onChange={(e) => setEditForm(prev => ({ ...prev, activityFee: e.target.value }))}
                    className="w-full p-2 rounded-lg border border-slate-200 bg-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600">Previous Arrears</label>
                  <input
                    type="number"
                    value={editForm.prevBalance}
                    onChange={(e) => setEditForm(prev => ({ ...prev, prevBalance: e.target.value }))}
                    className="w-full p-2 rounded-lg border border-slate-200 bg-white font-mono text-amber-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600">Late Fee Fine</label>
                  <input
                    type="number"
                    value={editForm.lateFee}
                    onChange={(e) => setEditForm(prev => ({ ...prev, lateFee: e.target.value }))}
                    className="w-full p-2 rounded-lg border border-slate-200 bg-white font-mono text-rose-700"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600">Concession / Discount</label>
                  <input
                    type="number"
                    value={editForm.discounts}
                    onChange={(e) => setEditForm(prev => ({ ...prev, discounts: e.target.value }))}
                    className="w-full p-2 rounded-lg border border-slate-200 bg-white font-mono text-emerald-700"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Status</label>
              <select
                value={editForm.status}
                onChange={(e) => setEditForm(prev => ({ ...prev, status: e.target.value }))}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-slate-900 font-semibold focus:outline-none focus:border-purple-500"
              >
                <option value="Unpaid">Unpaid</option>
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-purple-600 text-white font-bold hover:bg-purple-700 shadow-md transition-colors"
              >
                Save Fee Slip Updates
              </button>
            </div>
          </form>
        </Modal>

        {/* Bulk Printable Fee Chalans PDF Modal */}
        <Modal
          isOpen={isPreviewBulkModalOpen}
          onClose={() => setIsPreviewBulkModalOpen(false)}
          title="Printable Class Bulk Fee Chalans (A4 Landscape Split Layout)"
          maxWidth="max-w-6xl"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
              <span className="text-xs font-bold text-slate-700">Multi-Page Bulk A4 Landscape Chalans</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={triggerPrint}
                  className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
                >
                  Window Print
                </button>
                <button
                  onClick={handleExportBulkPdf}
                  className="px-3.5 py-1.5 rounded-xl qobe-btn-primary text-xs font-bold"
                >
                  Download Bulk PDF
                </button>
              </div>
            </div>

            <div id="bulk-fee-pdf-container" className="space-y-6">
              {chalans.map(ch => (
                <FeeChalanTemplate key={ch.chalanId} chalan={ch} schoolInfo={schoolInfo} />
              ))}
            </div>
          </div>
        </Modal>
      </main>
    </div>
  );
}
