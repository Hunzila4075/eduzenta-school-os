import React from 'react';

export default function StatCard({ title, value, icon: Icon, trend, trendLabel, color = "blue" }) {
  const colorMap = {
    blue: "bg-blue-50 border-blue-100 text-blue-600",
    emerald: "bg-emerald-50 border-emerald-100 text-emerald-600",
    purple: "bg-purple-50 border-purple-100 text-purple-600",
    amber: "bg-amber-50 border-amber-100 text-amber-600",
    rose: "bg-rose-50 border-rose-100 text-rose-600"
  };

  const currentStyle = colorMap[color] || colorMap.blue;

  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow flex items-start justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
        <h3 className="text-2xl font-black text-slate-900 mt-1">{value}</h3>
        {trend && (
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
              {trend}
            </span>
            <span className="text-[11px] text-slate-500">{trendLabel}</span>
          </div>
        )}
      </div>

      <div className={`p-3 rounded-xl border ${currentStyle}`}>
        <Icon className="w-6 h-6" />
      </div>
    </div>
  );
}
