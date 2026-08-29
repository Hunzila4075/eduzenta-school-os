import React from 'react';
import EduzentaLogo from '../common/EduzentaLogo';

export default function ResultCardTemplate({ student, markData, schoolInfo, hideSignatures = false }) {
  const schoolName = schoolInfo?.name || "Eduzenta School";
  const schoolLogo = schoolInfo?.logoUrl || schoolInfo?.logo_url || "";
  const schoolAddress = schoolInfo?.address || "Education Boulevard, Knowledge City";

  const subjects = markData?.subjects || [
    { name: "Physics", maxMarks: 100, obtainedMarks: 100, grade: "A+", remarks: "Excellent mechanics" },
    { name: "Mathematics", maxMarks: 100, obtainedMarks: 98, grade: "A+", remarks: "Top analytical solver" },
    { name: "Chemistry", maxMarks: 100, obtainedMarks: 93, grade: "A+", remarks: "Strong lab skills" },
    { name: "Computer Science", maxMarks: 100, obtainedMarks: 100, grade: "A+", remarks: "Flawless code" }
  ];

  const totalMax = subjects.reduce((acc, s) => acc + (s.maxMarks || 100), 0);
  const totalObtained = subjects.reduce((acc, s) => acc + (s.obtainedMarks || 0), 0);
  const overallPercentage = ((totalObtained / totalMax) * 100).toFixed(1);

  let finalGrade = "A+";
  if (overallPercentage < 50) finalGrade = "F";
  else if (overallPercentage < 60) finalGrade = "C";
  else if (overallPercentage < 70) finalGrade = "B";
  else if (overallPercentage < 80) finalGrade = "B+";
  else if (overallPercentage < 90) finalGrade = "A";

  const attendanceDays = student?.attendanceDays || 13;
  const totalWorkingDays = student?.totalWorkingDays || 16;
  const attPct = ((attendanceDays / totalWorkingDays) * 100).toFixed(1);

  return (
    <div className="bg-white p-8 border border-slate-300 rounded-none shadow-none text-slate-900 max-w-4xl mx-auto page-break-card relative font-sans leading-normal select-none">
      {/* Dynamic School Logo Header */}
      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4 mb-6">
        <div className="flex items-center gap-4">
          {schoolLogo ? (
            <img
              src={schoolLogo}
              alt={schoolName}
              className="w-16 h-16 rounded-lg object-cover border border-slate-400 p-0.5 shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-[#5A3193] text-white font-black text-2xl flex items-center justify-center border border-purple-400 shrink-0">
              {(schoolName || 'E').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-xl font-black uppercase tracking-tight text-[#2d1a4e]">{schoolName}</h1>
            <p className="text-xs font-semibold text-slate-600">{schoolAddress}</p>
            <p className="text-[10.5px] text-slate-500 font-bold mt-0.5">Eduzenta Certified Academic Transcript</p>
          </div>
        </div>
        <div className="text-right">
          <span className="inline-block px-3 py-1 bg-[#5A3193] text-white text-[10px] font-black uppercase tracking-widest rounded-xs mb-1">
            OFFICIAL PROGRESS REPORT
          </span>
          <h2 className="text-sm font-extrabold text-slate-900 tracking-tight">STUDENT PROGRESS REPORT</h2>
          <p className="text-xs font-bold text-[#5A3193]">ACADEMIC YEAR 2025–2026 • {markData?.term || "1st Term"}</p>
        </div>
      </div>

      {/* Student Profile Info */}
      <div className="mb-6 border border-slate-900 bg-slate-50/50 p-4 rounded-xs">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 mb-2 border-b border-slate-300 pb-1">
          Student Information
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-2.5 gap-x-4 text-xs">
          <div>
            <span className="font-semibold text-slate-500 block text-[10px] uppercase">Student Name</span>
            <span className="font-extrabold text-slate-900 text-sm">{student?.name || "Aiden Vance"}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-500 block text-[10px] uppercase">Student ID</span>
            <span className="font-extrabold text-[#5A3193]">{student?.id || "SCH-2025-1001"}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-500 block text-[10px] uppercase">Roll / Reg No</span>
            <span className="font-extrabold text-slate-900">{student?.rollNo || "1001"} ({student?.regNo || "REG-1001-A"})</span>
          </div>
          <div>
            <span className="font-semibold text-slate-500 block text-[10px] uppercase">Class & Section</span>
            <span className="font-bold text-slate-900">{student?.classSection || "Class 10-A"}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-500 block text-[10px] uppercase">Date of Birth</span>
            <span className="font-semibold text-slate-900">{student?.dob || "2009-04-12"}</span>
          </div>
          <div>
            <span className="font-semibold text-slate-500 block text-[10px] uppercase">Guardian Name</span>
            <span className="font-semibold text-slate-900">{student?.guardianName || "David Vance"}</span>
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
                  <td className="p-2.5 font-bold border border-slate-300">{sub.name}</td>
                  <td className="p-2.5 text-center font-semibold border border-slate-300">{max}</td>
                  <td className="p-2.5 text-center font-extrabold text-[#5A3193] border border-slate-300">{obt}</td>
                  <td className="p-2.5 text-center font-semibold border border-slate-300">{pct}%</td>
                  <td className="p-2.5 text-center font-black border border-slate-300">{sub.grade || "A+"}</td>
                  <td className="p-2.5 text-slate-700 italic border border-slate-300">{sub.remarks || "Good progress"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Box */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="border border-slate-900 bg-slate-900 text-white p-4 rounded-xs">
          <h4 className="text-[10px] font-black uppercase tracking-widest text-purple-300 mb-2 border-b border-slate-700 pb-1">
            Overall Result Summary
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-slate-400 text-[10px] block">Total Max Marks:</span>
              <span className="font-extrabold text-white text-sm">{totalMax}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Total Obtained:</span>
              <span className="font-black text-emerald-400 text-sm">{totalObtained}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Overall Percentage:</span>
              <span className="font-black text-amber-300 text-sm">{overallPercentage}%</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] block">Final Grade & Rank:</span>
              <span className="font-black text-white text-sm">{finalGrade} (Rank {markData?.overallRank || 1})</span>
            </div>
          </div>
        </div>

        <div className="border border-slate-900 bg-purple-50/60 p-4 rounded-xs flex flex-col justify-between">
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-widest text-[#2d1a4e] mb-1">
              Attendance & Promotion Status
            </h4>
            <p className="text-xs text-slate-700 font-medium">
              Attendance Days: <strong className="text-slate-900">{attendanceDays} / {totalWorkingDays} Days ({attPct}%)</strong>
            </p>
          </div>
          <div className="mt-2 p-2 bg-[#5A3193] text-white text-xs font-black tracking-wide text-center uppercase rounded-xs">
            {markData?.promotionStatus || "PROMOTED TO CLASS 11"}
          </div>
        </div>
      </div>

      {/* Signatures Section */}
      {!hideSignatures && (
        <div className="grid grid-cols-3 gap-6 text-center border-t border-slate-300 pt-6 mb-6">
          <div>
            <div className="h-10 border-b border-dashed border-slate-400 mb-1 flex items-end justify-center pb-1">
              <span className="font-serif italic text-xs font-bold text-slate-700">M. Thorne</span>
            </div>
            <p className="text-[10px] font-bold uppercase text-slate-700">Class Teacher Signature</p>
          </div>

          <div>
            <div className="h-10 border-b border-dashed border-slate-400 mb-1 flex items-end justify-center pb-1">
              <span className="font-serif italic text-xs font-bold text-[#5A3193]">Dr. R. Sterling</span>
            </div>
            <p className="text-[10px] font-bold uppercase text-slate-700">Principal Signature & Seal</p>
          </div>

          <div>
            <div className="h-10 border-b border-dashed border-slate-400 mb-1 flex items-end justify-center pb-1">
              <span className="text-xs font-bold text-slate-800">{new Date().toISOString().split('T')[0]}</span>
            </div>
            <p className="text-[10px] font-bold uppercase text-slate-700">Date of Issue</p>
          </div>
        </div>
      )}

      {/* MANDATORY 2-LINE DOCUMENT FOOTER */}
      <div className="border-t-2 border-slate-900 pt-3 text-[10px] text-slate-700 leading-tight">
        <div>Noted : Errors/Omissions Expected. Any mistake must be intimated within 30 days of the issuance of this result. official Result Card.</div>
        <div className="font-extrabold text-[#5A3193] mt-0.5">Result generated with Eduzenta</div>
      </div>
    </div>
  );
}
