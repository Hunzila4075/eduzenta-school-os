import React from 'react';
import EduzentaLogo from '../common/EduzentaLogo';
import { Scissors, CreditCard, Building2, Smartphone, CheckCircle2 } from 'lucide-react';

export default function FeeChalanTemplate({ chalan, schoolInfo }) {
  const schoolName = schoolInfo?.name || chalan?.schoolName || "EXCELLENCE INTERNATIONAL SCHOOL";
  const schoolLogo = schoolInfo?.logoUrl || "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?auto=format&fit=crop&w=250&q=80";

  const isPaid = chalan?.status === 'Paid';

  const parts = [
    { title: "STUDENT COPY", bg: "bg-[#5A3193]", borderStyle: "border-r-2 border-dashed border-slate-400 pr-4" },
    { title: "INSTITUTE COPY", bg: "bg-slate-900", borderStyle: "pl-4" }
  ];

  const items = [
    { sr: 1, desc: "Tuition Fee", amount: chalan?.tuitionFee || 8000 },
    { sr: 2, desc: "Development Fee", amount: chalan?.developmentFee || 1500 },
    { sr: 3, desc: "Examination Fee", amount: chalan?.examFee || 1000 },
    { sr: 4, desc: "Library Fee", amount: chalan?.libraryFee || 500 },
    { sr: 5, desc: "Computer Lab Fee", amount: chalan?.computerFee || 500 },
    { sr: 6, desc: "Co-Curricular Activity Fee", amount: chalan?.activityFee || 500 },
  ];

  if (chalan?.prevBalance > 0) {
    items.push({ sr: 7, desc: "Previous Arrears", amount: chalan.prevBalance });
  }
  if (chalan?.lateFee > 0) {
    items.push({ sr: items.length + 1, desc: "Late Payment Fine", amount: chalan.lateFee });
  }
  if (chalan?.discounts > 0) {
    items.push({ sr: items.length + 1, desc: "Scholarship Concession", amount: -chalan.discounts });
  }

  const totalPayable = chalan?.totalAmount || 12000;

  return (
    <div className="bg-white p-4 text-slate-900 w-full max-w-[1100px] mx-auto page-break-card font-sans select-none leading-tight border border-slate-300 shadow-none">
      {/* 2-Part A4 Landscape Split Layout */}
      <div className="grid grid-cols-2 gap-4">
        {parts.map((part, pIdx) => (
          <div key={pIdx} className={`flex flex-col justify-between min-h-[580px] ${part.borderStyle}`}>
            <div>
              {/* Top Branding Bar */}
              <div className="flex items-center justify-between border-b-2 border-[#5A3193] pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <img
                    src={schoolLogo}
                    alt={schoolName}
                    className="w-10 h-10 rounded-md object-cover border border-slate-300 p-0.5 shrink-0 bg-white"
                  />
                  <div>
                    <h2 className="text-xs font-black uppercase text-[#2d1a4e] tracking-tight truncate max-w-[200px]">{schoolName}</h2>
                    <p className="text-[9px] font-extrabold text-[#5A3193] uppercase">FEE CHALLAN • {chalan?.term || "1st Term"}</p>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`px-2 py-0.5 ${part.bg} text-white text-[9px] font-black uppercase tracking-wider rounded-xs`}>
                    {part.title}
                  </span>
                  <p className="text-[9.5px] font-mono font-bold text-slate-800 mt-0.5">
                    No: <strong className="text-[#5A3193]">{chalan?.chalanId || "CHL-2025-08-1001"}</strong>
                  </p>
                </div>
              </div>

              {/* Row 1 - Student Info Box */}
              <div className="border border-slate-800 bg-slate-50/80 p-2 text-[10px] rounded-xs mb-2">
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  <div><span className="text-slate-500 font-semibold">Student Name:</span> <strong className="text-slate-900">{chalan?.studentName || "Aiden Vance"}</strong></div>
                  <div><span className="text-slate-500 font-semibold">Admission / Reg No:</span> <strong className="text-slate-800">{chalan?.regNo || "REG-1001-A"}</strong></div>
                  <div><span className="text-slate-500 font-semibold">Class / Section:</span> <strong className="text-slate-900">{chalan?.classSection || "Class 10-A"}</strong></div>
                  <div><span className="text-slate-500 font-semibold">Roll No:</span> <strong className="text-slate-900">{chalan?.rollNo || "1001"}</strong></div>
                  <div><span className="text-slate-500 font-semibold">Father's Name:</span> <span className="font-semibold text-slate-800">David Vance</span></div>
                  <div><span className="text-slate-500 font-semibold">Contact No:</span> <span className="font-mono text-slate-800">+1 (555) 234-5678</span></div>
                </div>
              </div>

              {/* Row 2 - Academic Info Box & Due Date Badge */}
              <div className="border border-slate-800 bg-purple-50/50 p-2 text-[10px] rounded-xs mb-2 flex items-center justify-between">
                <div>
                  <span className="text-slate-600 font-semibold">Academic Session:</span> <strong className="text-slate-900">2024–2025</strong>
                  <span className="ml-3 text-slate-600 font-semibold">Fee Month:</span> <strong className="text-[#5A3193]">{chalan?.monthYear || "August 2025"}</strong>
                </div>
                <div className="flex items-center gap-1.5 bg-rose-600 text-white px-2.5 py-0.5 rounded-full text-[9.5px] font-black uppercase shadow-xs">
                  <span>PAYMENT DUE DATE:</span>
                  <span className="font-mono">{chalan?.dueDate || "2025-08-10"}</span>
                </div>
              </div>

              {/* Row 3 - Itemized Fee Breakdown Table */}
              <table className="w-full text-[9.5px] border border-slate-900 mb-2">
                <thead>
                  <tr className="bg-slate-900 text-white font-bold uppercase">
                    <th className="p-1 border-r border-slate-800 text-center w-8">Sr.</th>
                    <th className="p-1 border-r border-slate-800 text-left">Fee Description Particulars</th>
                    <th className="p-1 text-right w-24">Amount (Rs.)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {items.map((it) => (
                    <tr key={it.sr} className={it.amount < 0 ? "text-emerald-700 bg-emerald-50/50" : ""}>
                      <td className="p-1 border-r border-slate-300 text-center font-semibold">{it.sr}</td>
                      <td className="p-1 border-r border-slate-300 font-medium">{it.desc}</td>
                      <td className="p-1 text-right font-bold font-mono">
                        {it.amount < 0 ? `-Rs. ${Math.abs(it.amount).toLocaleString()}` : `Rs. ${it.amount.toLocaleString()}`}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-[#5A3193] text-white font-black">
                    <td colSpan={2} className="p-1.5 border-r border-purple-800 text-right uppercase">
                      TOTAL NET PAYABLE AMOUNT:
                    </td>
                    <td className="p-1.5 text-right font-mono text-[11px] text-amber-300">
                      Rs. {totalPayable.toLocaleString()}.00
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Row 4 & 5 - Payment Instructions, Methods Bar & Footer */}
            <div>
              {/* Row 4 - Payment Instructions & Signature Box */}
              <div className="grid grid-cols-2 gap-2 border border-slate-300 p-2 rounded-xs bg-slate-50/40 text-[8.5px] mb-2">
                <div>
                  <h4 className="font-extrabold uppercase text-[#2d1a4e] mb-0.5">Payment Instructions:</h4>
                  <ol className="list-decimal pl-3 space-y-0.5 text-slate-700">
                    <li>Pay on or before due date to avoid late surcharge fine.</li>
                    <li>Fee once paid is non-refundable and non-transferable.</li>
                    <li>Retain Student Copy for administrative verification.</li>
                  </ol>
                </div>

                <div className="text-center flex flex-col justify-between border-l border-slate-300 pl-2">
                  <div className="flex justify-center mb-1">
                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded border ${
                      isPaid ? 'bg-emerald-100 text-emerald-800 border-emerald-500' : 'bg-rose-100 text-rose-800 border-rose-500'
                    }`}>
                      {chalan?.status || "Unpaid"} STAMP
                    </span>
                  </div>
                  <div>
                    <div className="h-5 border-b border-slate-900 mb-0.5"></div>
                    <p className="font-extrabold text-[8px] uppercase text-slate-800">Accounts Officer Signature</p>
                  </div>
                </div>
              </div>

              {/* Row 5 - Payment Methods Bar */}
              <div className="bg-slate-900 text-white p-1.5 rounded-xs flex items-center justify-between text-[8px] mb-2">
                <div className="flex items-center gap-1 font-bold">
                  <Building2 className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>Bank Transfer</span>
                </div>
                <div className="flex items-center gap-1 font-bold">
                  <Smartphone className="w-3 h-3 text-teal-400 shrink-0" />
                  <span>JazzCash / EasyPaisa</span>
                </div>
                <div className="flex items-center gap-1 font-bold">
                  <CreditCard className="w-3 h-3 text-purple-400 shrink-0" />
                  <span>Pay at Campus Counter</span>
                </div>
              </div>

              {/* Tagline Strip */}
              <div className="bg-[#5A3193] text-white p-1 text-center text-[7.5px] font-bold tracking-wide rounded-xs mb-1">
                Thank you for being a part of Eduzenta. • This is a computer generated challan and does not require any signature.
              </div>

              {/* MANDATORY 2-LINE DOCUMENT FOOTER */}
              <div className="border-t border-slate-300 pt-1 text-[7.5px] text-slate-600 leading-tight">
                <div>Noted : Errors/Omissions Expected. Any mistake must be intimated within 30 days of the issuance of this result. official Result Card.</div>
                <div className="font-extrabold text-[#5A3193] mt-0.5">Result generated with Eduzenta</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
