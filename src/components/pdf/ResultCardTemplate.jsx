import React from 'react';

export default function ResultCardTemplate({ student, markData, schoolInfo, hideSignatures = false }) {
  // CORE RULE 2 — branding comes from schoolInfo (currentSchool). NO hardcoded fallbacks.
  const schoolName = schoolInfo?.name || '';
  const schoolLogo = schoolInfo?.logoUrl || schoolInfo?.logo_url || '';
  const schoolAddress = schoolInfo?.address || '';

  // Real persisted subjects only — NO demo/sample data
  const subjects = markData?.subjects || [];

  const totalMax = subjects.reduce((acc, s) => acc + (s.maxMarks || 0), 0);
  const totalObtained = subjects.reduce((acc, s) => acc + (s.obtainedMarks || 0), 0);
  const overallPercentage = (subjects.length > 0 && totalMax > 0)
    ? ((totalObtained / totalMax) * 100).toFixed(1)
    : '0.0';

  let finalGrade = '';
  const pctNum = parseFloat(overallPercentage);
  if (subjects.length > 0) {
    if (pctNum < 50) finalGrade = 'F';
    else if (pctNum < 60) finalGrade = 'C';
    else if (pctNum < 70) finalGrade = 'B';
    else if (pctNum < 80) finalGrade = 'B+';
    else if (pctNum < 90) finalGrade = 'A';
    else finalGrade = 'A+';
  }

  const attendanceDays = student?.attendanceDays || 0;
  const totalWorkingDays = student?.totalWorkingDays || 0;
  const attPct = totalWorkingDays > 0 ? ((attendanceDays / totalWorkingDays) * 100).toFixed(1) : '0.0';
  const promotionStatus = subjects.length > 0 ? (markData?.promotionStatus || (pctNum >= 40 ? 'PROMOTED' : 'NOT PROMOTED')) : '';

  return (
    <div className="bg-white p-8 border border-slate-300 rounded-none shadow-none text-slate-900 max-w-4xl mx-auto page-break-card relative font-sans leading-normal select-none">
      {/* School Logo Header — real branding only */}
      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex items-center gap-4">
          {schoolLogo ? (
            <img src={schoolLogo} alt={schoolName} className="w-16 h-16 rounded-lg object-cover border border-slate-400 p-0.5 shrink-0 bg-white" />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-300 text-slate-400 font-black text-lg flex items-center justify-center shrink-0">
              {(schoolName || 'S').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-blue-900">{schoolName}</h1>
            {schoolAddress ? <p className="text-xs font-semibold text-slate-600">{schoolAddress}</p> : null}
            <p className="text-[10.5px] text-slate-500 font-bold mt-0.5">OFFICIAL PROGRESS REPORT</p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-block px-3 py-1 bg-blue-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xs mb-1">
            OFFICIAL PROGRESS REPORT
          </span>
          <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">STUDENT PROGRESS REPORT</h2>
          <p className="text-xs font-bold text-blue-900">ACADEMIC YEAR {markData?.academicYear || ''} • {markData?.term || '1st Term'}</p>
        </div>
      </div>

            {/* Student Profile Info — real data only */}
      <div className="mb-6 border border-slate-900 bg-slate-50/50 p-4 rounded-xs">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2 border-b border-slate-300 pb-1">
          Student Information
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2.5 gap-x-4 text-xs">
          <div>
            <span className="font-semibold text-slate-500 block text-[10px] uppercase">Student Name</span>
                        <span className="font-extrabold text-slate-900 text-sm">{student?.name || student?.studentName || '—'}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-500 block text-[10px] uppercase">Student ID</span>
                        <span className="font-extrabold text-blue-900">{student?.id || '—'}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-500 block text-[10px] uppercase">Roll / Reg No</span>
                        <span className="font-extrabold text-slate-900">{student?.rollNo || '—'} ({student?.regNo || '—'})</span>
          </div>
          <div>
            <span className="font-semibold text-slate-500 block text-[10px] uppercase">Class & Section</span>
                        <span className="font-bold text-slate-900">{student?.classSection || '—'}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-500 block text-[10px] uppercase">Date of Birth</span>
                        <span className="font-semibold text-slate-900">{student?.dateOfBirth || student?.dob || '—'}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-500 block text-[10px] uppercase">Guardian Name</span>
                        <span className="font-semibold text-slate-900">{student?.guardianName || student?.fatherName || '—'}</span>
          </div>
        </div>
      </div>

      {/* Academic Performance Table */}
      <div className="mb-6">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2">
          Academic Performance Breakdown
        </h3>
        <table className="w-full border-collapse text-xs border border-slate-900">
          <thead>
            <tr className="bg-slate-900 text-white uppercase text-[10px] font-bold tracking-wider">
              <th className="p-2 border border-slate-800 text-left">Subject</th>
              <th className="p-2 border border-slate-800 text-center">Max Marks</th>
              <th className="p-2 border border-slate-800 text-center">Obtained Marks</th>
              <th className="p-2 border border-slate-800 text-center">Percentage</th>
              <th className="p-2 border border-slate-800 text-center">Grade</th>
              <th className="p-2 border border-slate-800 text-left">Remarks</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300">
            {subjects.map((sub, idx) => {
              const max = sub.maxMarks || 100;
              const obt = sub.obtainedMarks || 0;
              const pct = ((obt / max) * 100).toFixed(0);
              return (
                <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                  <td className="p-2.5 font-bold border border-slate-300">{sub.subject || sub.name}</td>
                  <td className="p-2.5 text-center font-semibold border border-slate-300">{max}</td>
                  <td className="p-2.5 text-center font-extrabold text-blue-900 border border-slate-300">{obt}</td>
                  <td className="p-2.5 text-center font-semibold border border-slate-300">{pct}%</td>
                  <td className="p-2 border border-slate-300 text-center font-black text-blue-900">{finalGrade || '—'}</td>
                  <td className="p-2 italic text-slate-700 border border-slate-300">{sub.remarks || (sub.grade || '')}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

            {/* Overall Result Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="border border-slate-900 bg-slate-50 p-4 rounded-xs">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800 border-b border-slate-300 pb-1 mb-2">
            Overall Result Summary
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-500 text-[10px] block">Total Max Marks:</span>
              <span className="font-extrabold text-slate-900 text-sm">{totalMax || 0}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Total Obtained:</span>
              <span className="font-black text-blue-900 text-sm">{totalObtained || 0}</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Overall Percentage:</span>
              <span className="font-black text-slate-900 text-sm">{overallPercentage}%</span>
            </div>
            <div>
              <span className="text-slate-500 text-[10px] block">Final Grade:</span>
              <span className="font-black text-blue-900 text-sm">{finalGrade || '—'}</span>
            </div>
          </div>
        </div>

        <div className="border border-slate-900 bg-slate-50 p-4 rounded-xs flex flex-col justify-between">
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-1">
              Attendance & Promotion Status
            </h4>
            <p className="text-xs text-slate-700 font-medium">
              Attendance: <strong className="text-slate-900">{totalWorkingDays > 0 ? `${attendanceDays} / ${totalWorkingDays} Days (${attPct}%)` : '—'}</strong>
            </p>
          </div>
          {promotionStatus ? (
            <div className="mt-2 p-2 bg-blue-900 text-white text-xs font-black tracking-wide text-center uppercase rounded-xs">
              {promotionStatus}
            </div>
          ) : (
            <div className="mt-2 p-2 bg-slate-200 text-slate-500 text-xs font-black tracking-wide text-center uppercase rounded-xs">
              Result Awaited
            </div>
          )}
        </div>
      </div>

            {/* Signatures — blank lines for physical signing (no fake names) */}
      {!hideSignatures && (
        <div className="grid grid-cols-3 gap-6 text-center border-t border-slate-300 pt-6 mb-6">
          <div>
            <div className="h-10 border-b border-dashed border-slate-400 mb-1"></div>
            <p className="text-[10px] font-bold uppercase text-slate-700">Class Teacher Signature</p>
          </div>

          <div>
            <div className="h-10 border-b border-dashed border-slate-400 mb-1"></div>
            <p className="text-[10px] font-bold uppercase text-slate-700">Principal Signature</p>
          </div>

          <div>
            <div className="h-10 border-b border-dashed border-slate-400 mb-1 flex items-end justify-center pb-1">
              <span className="font-serif italic text-xs font-bold text-slate-700">{new Date().toISOString().split('T')[0]}</span>
            </div>
            <p className="text-[10px] font-bold uppercase text-slate-700">Date of Issue</p>
          </div>
        </div>
      )}

      {/* MANDATORY 2-LINE DOCUMENT FOOTER */}
      <div className="border-t-2 border-slate-900 pt-3 text-[10px] text-slate-700 leading-tight">
        <div>Noted : Errors/Omissions Expected. Any mistake must be intimated within 30 days of the issuance of this result. official Result Card.</div>
        <div className="font-extrabold text-blue-900 mt-0.5">Eduzenta School OS Generated Official Document</div>
      </div>
    </div>
  );
}
