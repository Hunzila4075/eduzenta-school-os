import React from 'react';
import EduzentaLogo from '../common/EduzentaLogo';

export default function AdmitCardTemplate({ student, schoolInfo }) {
  const schoolName = schoolInfo?.name || "Eduzenta School";
  const schoolLogo = schoolInfo?.logoUrl || schoolInfo?.logo_url || "";
  const schoolAddress = schoolInfo?.address || "Education Boulevard, Knowledge City";

  const schedule = [
    { date: "2026-09-01", day: "Monday", subject: "Mathematics", time: "09:00 AM - 12:00 PM", room: "Hall A (Desk 14)" },
    { date: "2026-09-03", day: "Wednesday", subject: "Physics", time: "09:00 AM - 12:00 PM", room: "Hall A (Desk 14)" },
    { date: "2026-09-05", day: "Friday", subject: "Chemistry", time: "09:00 AM - 12:00 PM", room: "Lab 02" },
    { date: "2026-09-08", day: "Monday", subject: "English Literature", time: "09:00 AM - 12:00 PM", room: "Hall A (Desk 14)" },
    { date: "2026-09-10", day: "Wednesday", subject: "Computer Science", time: "09:00 AM - 12:00 PM", room: "CS Lab 01" }
  ];

  return (
    <div className="bg-white p-6 border border-slate-300 rounded-none shadow-none text-slate-900 max-w-4xl mx-auto page-break-card relative font-sans leading-normal select-none">
      {/* Dynamic School Logo Header */}
      <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-4">
        <div className="flex items-center gap-3">
          {schoolLogo ? (
            <img
              src={schoolLogo}
              alt={schoolName}
              className="w-12 h-12 rounded-lg object-cover border border-slate-400 p-0.5 shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-[#5A3193] text-white font-black text-xl flex items-center justify-center border border-purple-400 shrink-0">
              {(schoolName || 'E').charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <h1 className="text-lg font-black uppercase text-[#2d1a4e]">{schoolName}</h1>
            <p className="text-xs text-slate-500 font-medium">{schoolAddress}</p>
          </div>
        </div>
        <div className="text-right">
          <span className="bg-[#5A3193] text-white text-[9px] font-black px-2.5 py-0.5 uppercase tracking-widest">
            EXAMINATION HALL TICKET
          </span>
          <h2 className="text-xs font-black text-slate-900 mt-1 uppercase">ANNUAL EXAMINATION 2026 • {student?.term || "1st Term"}</h2>
        </div>
      </div>

      {/* Student Details Grid & Photo */}
      <div className="flex flex-col md:flex-row gap-4 border border-slate-400 p-3 bg-slate-50/50 mb-4 rounded-xs">
        <div className="w-28 h-32 border-2 border-slate-400 bg-slate-200 flex flex-col items-center justify-center shrink-0 overflow-hidden text-center">
          <img
            src={student?.photo || "https://images.unsplash.com/photo-1544717305-2782549b5136?auto=format&fit=crop&w=200&q=80"}
            alt="Student Photo"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="flex-1 grid grid-cols-2 gap-y-2 text-xs">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Candidate Name</span>
            <span className="font-extrabold text-slate-900 text-sm">{student?.studentName || student?.name || "Aiden Vance"}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Roll Number</span>
            <span className="font-black text-[#5A3193] text-sm">{student?.rollNo || "1001"}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Reg No / Student ID</span>
            <span className="font-bold text-slate-800">{student?.regNo || "REG-1001-A"} ({student?.studentId || student?.id || "SCH-2025-1001"})</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Class & Section</span>
            <span className="font-bold text-slate-900">{student?.classSection || "Class 10-A"}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Father / Guardian</span>
            <span className="font-semibold text-slate-800">{student?.guardianName || "David Vance"}</span>
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Exam Center</span>
            <span className="font-semibold text-slate-800">{student?.examCenter || "Main Campus Block B"}</span>
          </div>
        </div>
      </div>

      {/* Date Sheet Table */}
      <div className="mb-4">
        <h3 className="text-xs font-black uppercase text-slate-900 mb-1">Official Exam Date Sheet</h3>
        <table className="w-full border-collapse text-xs border border-slate-400">
          <thead>
            <tr className="bg-slate-900 text-white font-bold text-[10px] uppercase">
              <th className="p-1.5 border border-slate-400 text-left">Date & Day</th>
              <th className="p-1.5 border border-slate-400 text-left">Subject</th>
              <th className="p-1.5 border border-slate-400 text-center">Timing</th>
              <th className="p-1.5 border border-slate-400 text-left">Assigned Room</th>
              <th className="p-1.5 border border-slate-400 text-center">Invigilator Sign</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300">
            {schedule.map((item, idx) => (
              <tr key={idx} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                <td className="p-1.5 font-bold border border-slate-300">{item.date} ({item.day})</td>
                <td className="p-1.5 font-extrabold text-[#5A3193] border border-slate-300">{item.subject}</td>
                <td className="p-1.5 text-center font-medium border border-slate-300">{item.time}</td>
                <td className="p-1.5 font-semibold text-slate-800 border border-slate-300">{item.room}</td>
                <td className="p-1.5 border border-slate-300"></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-8 text-center border-t border-slate-300 pt-4 mb-3">
        <div>
          <div className="h-8 border-b border-dashed border-slate-400 mb-0.5"></div>
          <p className="text-[10px] font-bold uppercase text-slate-700">Candidate Signature</p>
        </div>

        <div>
          <div className="h-8 border-b border-dashed border-slate-400 mb-0.5 flex items-end justify-center">
            <span className="font-serif italic font-bold text-xs text-[#5A3193]">Dr. R. Sterling</span>
          </div>
          <p className="text-[10px] font-bold uppercase text-slate-700">Controller of Examinations</p>
        </div>
      </div>

      {/* MANDATORY 2-LINE DOCUMENT FOOTER */}
      <div className="border-t border-slate-900 pt-2 text-[9.5px] text-slate-700 leading-tight">
        <div>Noted : Errors/Omissions Expected. Any mistake must be intimated within 30 days of the issuance of this result. official Result Card.</div>
        <div className="font-extrabold text-[#5A3193] mt-0.5">Result generated with Eduzenta</div>
      </div>
    </div>
  );
}
