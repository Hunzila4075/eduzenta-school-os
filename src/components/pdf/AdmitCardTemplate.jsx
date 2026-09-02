import React from 'react';

// Deterministic, display-only short code for a subject name (e.g.
// "Mathematics" -> "MATH"). Purely presentational formatting of the
// DB-derived subject — no academic data is invented or stored.
function subjectCode(subjectName, classSection) {
  const letters = String(subjectName || '').replace(/[^A-Za-z]/g, '').toUpperCase();
  const code = letters.slice(0, 4) || '—';
  const numMatch = String(classSection || '').match(/(\d+)/);
  return numMatch ? `${code}-${numMatch[1]}` : code;
}

// "Class 9-B" -> { className: "Class 9", section: "B" } (display parsing only)
function splitClassSection(classSection) {
  const raw = String(classSection || '').trim();
  const dashIdx = raw.indexOf('-');
  if (dashIdx > -1) {
    return { className: raw.slice(0, dashIdx).trim(), section: raw.slice(dashIdx + 1).trim() };
  }
  return { className: raw, section: '' };
}

export default function AdmitCardTemplate({ student, schoolInfo }) {
  // CORE RULE 2 — branding strictly from schoolInfo (currentSchool/db). NO fake fallbacks.
  const schoolName = schoolInfo?.name || "";
  const schoolLogo = schoolInfo?.logoUrl || schoolInfo?.logo_url || "";
  const schoolAddress = schoolInfo?.address || "";

  // Real subjects only — the server attaches examSchedule as the UNION of
  // every subject assigned to the student's class via its teachers
  // (teacher_class_assignments ⋈ users.assigned_subjects) plus subjects
  // already recorded in the marks table. No dates are stored in the DB, so
  // the date/sig areas stay blank for physical signing.
  const subjects = (Array.isArray(student?.examSchedule) ? student.examSchedule : [])
    .map((s) => (typeof s === "string" ? s : s?.subject))
    .filter(Boolean);

  const { className, section } = splitClassSection(student?.classSection);
  const infoRow = (label, value) => (
    <div className="flex items-baseline gap-2">
      <span className="w-[125px] shrink-0 text-[11.5px] font-black text-slate-900 uppercase">{label}</span>
      <span className="text-slate-900 font-bold">:</span>
      <span className="flex-1 border-b border-slate-500 pb-0.5 text-[12px] font-semibold text-slate-800 min-h-[16px]">
        {value || ''}
      </span>
    </div>
  );

  return (
    <div className="bg-white p-5 text-slate-900 max-w-4xl mx-auto page-break-card relative font-sans leading-normal select-none border-2 border-[#1a2f5e]">
      {/* Double-rule frame like the printed sample */}
      <div className="border border-[#1a2f5e] p-4 relative">
        <span className="absolute -top-[1px] -left-[1px] w-4 h-4 border-t-4 border-l-4 border-[#1a2f5e]"></span>
        <span className="absolute -top-[1px] -right-[1px] w-4 h-4 border-t-4 border-r-4 border-[#1a2f5e]"></span>
        <span className="absolute -bottom-[1px] -left-[1px] w-4 h-4 border-b-4 border-l-4 border-[#1a2f5e]"></span>
        <span className="absolute -bottom-[1px] -right-[1px] w-4 h-4 border-b-4 border-r-4 border-[#1a2f5e]"></span>

        {/* School Branding Header — database-backed name/logo/address only */}
        <div className="flex items-center justify-between gap-4 border-b-2 border-[#1a2f5e] pb-3 mb-4">
          <div className="flex items-center gap-3 min-w-0">
            {schoolLogo ? (
              <img
                src={schoolLogo}
                alt={schoolName}
                className="w-16 h-16 object-contain border border-slate-300 p-0.5 shrink-0 bg-white"
              />
            ) : (
              <div className="w-16 h-16 bg-[#1a2f5e] text-white font-black text-2xl flex items-center justify-center shrink-0">
                {(schoolName || 'S').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <h1 className="text-xl md:text-2xl font-black uppercase tracking-tight text-[#1a2f5e] truncate">{schoolName}</h1>
              {schoolAddress ? (
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600 truncate">{schoolAddress}</p>
              ) : null}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] font-bold text-slate-600 uppercase">{student?.term ? `${student.term} Examination` : 'Examination'}</p>
            <p className="text-[10px] font-mono font-bold text-slate-700">{student?.rollNo ? `Roll # ${student.rollNo}` : ''}</p>
          </div>
        </div>

        {/* Title band */}
        <div className="flex justify-center mb-4">
          <span className="bg-[#1a2f5e] text-white font-black tracking-[0.25em] text-lg md:text-xl px-10 py-1.5 uppercase">
            Admit Card
          </span>
        </div>

        {/* Student info (left) + Instructions (right) */}
        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr] gap-4 mb-4">
          <div className="space-y-2.5">
            {infoRow('Name of Student', student?.studentName || student?.name)}
            {infoRow("Father's Name", student?.guardianName)}
            {infoRow('Class', className)}
            {infoRow('Roll No.', student?.rollNo)}
            {infoRow('Registration No.', student?.regNo)}
            {infoRow('Section', section)}
          </div>
          <div className="border-2 border-[#1a2f5e] rounded-sm p-2.5">
            <div className="flex justify-center -mt-5 mb-1.5">
              <span className="bg-[#1a2f5e] text-white text-[10px] font-black uppercase tracking-widest px-3 py-0.5 rounded-sm">
                Instructions
              </span>
            </div>
            <ol className="list-decimal pl-4 space-y-1 text-[10.5px] font-semibold text-slate-800">
              <li>This admit card is mandatory for appearing in the examination.</li>
              <li>Bring your own stationery.</li>
              <li>Mobile phones and electronic devices are not allowed.</li>
              <li>Follow all instructions given by the invigilator.</li>
              <li>Do not indulge in any unfair means.</li>
            </ol>
          </div>
        </div>

        {/* Examination Subjects — exactly the class's DB-assigned subjects */}
        <div className="mb-4">
          <div className="bg-[#1a2f5e] text-white text-center text-xs font-black uppercase tracking-widest py-1.5">
            Examination Subjects
          </div>
          <table className="w-full border-collapse text-[11.5px]">
            <thead>
              <tr className="bg-[#1a2f5e] text-white font-black uppercase text-[10.5px]">
                <th className="border border-[#1a2f5e] px-2 py-1.5 w-[10%]">Sr. No.</th>
                <th className="border border-[#1a2f5e] px-2 py-1.5 text-left">Subject Name</th>
                <th className="border border-[#1a2f5e] px-2 py-1.5 w-[20%]">Subject Code</th>
                <th className="border border-[#1a2f5e] px-2 py-1.5 w-[28%]">Invigilator Signature <span className="block text-[8px] font-bold normal-case">(At the end of each paper)</span></th>
              </tr>
            </thead>
            <tbody>
              {subjects.length > 0 ? (
                subjects.map((sub, idx) => (
                  <tr key={`${sub}-${idx}`} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                    <td className="border border-slate-400 px-2 py-1.5 text-center font-bold">{idx + 1}</td>
                    <td className="border border-slate-400 px-2 py-1.5 font-semibold">{sub}</td>
                    <td className="border border-slate-400 px-2 py-1.5 text-center font-mono font-bold text-[#1a2f5e]">{subjectCode(sub, student?.classSection)}</td>
                    <td className="border border-slate-400 px-2 py-1.5"></td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="border border-slate-400 px-2 py-2 text-center text-slate-500 italic" colSpan={4}>
                    No subjects assigned to this class yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Signature blocks — Invigilator / Principal / Principal (In-Charge) */}
        <div className="grid grid-cols-2 gap-6 mb-5">
          {['Invigilator Signature', 'Principal Signature'].map((label) => (
            <div key={label} className="relative border-2 border-[#1a2f5e] rounded-sm h-24 flex flex-col">
              <div className="flex justify-center -mt-3">
                <span className="bg-[#1a2f5e] text-white text-[9px] font-black uppercase tracking-widest px-3 py-0.5 rounded-sm">
                  {label}
                </span>
              </div>
              <div className="mt-auto px-3 pb-2 text-[10px] font-bold text-slate-800">
                DATE: <span className="inline-block w-32 border-b border-slate-600 align-bottom"></span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-center mb-3">
          <div className="relative border-2 border-[#1a2f5e] rounded-sm h-24 w-full md:w-2/3 flex flex-col">
            <div className="flex justify-center -mt-3">
              <span className="bg-[#1a2f5e] text-white text-[9px] font-black uppercase tracking-widest px-3 py-0.5 rounded-sm">
                Principal (In-Charge) Signature
              </span>
            </div>
            <div className="mt-auto px-3 pb-2 text-[10px] font-bold text-slate-800">
              DATE: <span className="inline-block w-32 border-b border-slate-600 align-bottom"></span>
            </div>
          </div>
        </div>

        {/* Note footer */}
        <div className="border-t border-dotted border-slate-400 pt-2 text-center text-[10px]">
          <span className="font-bold italic text-slate-800">NOTE: This admit card is valid only for the mentioned examination. Keep it safe and in good condition.</span>
          <div className="font-extrabold text-[#1a2f5e] mt-0.5 uppercase text-[9px]">Eduzenta School OS Generated Official Document</div>
        </div>
      </div>
    </div>
  );
}
