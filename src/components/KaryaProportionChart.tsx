import React, { useMemo } from 'react';
import { PieChart, Download } from 'lucide-react';
import { Article } from '../types';

interface KaryaProportionChartProps {
  articles: Article[];
  selectedMonth: string;
  onExportReport?: () => void;
}

export default function KaryaProportionChart({ articles, selectedMonth, onExportReport }: KaryaProportionChartProps) {
  // Filter articles based on selected month
  const filteredArticles = useMemo(() => {
    if (selectedMonth === 'all') return articles;
    return articles.filter(art => art.date.startsWith(selectedMonth));
  }, [articles, selectedMonth]);

  // Compute proportion counts for Karya Sendiri vs Rilis
  const karyaSendiri = useMemo(() => {
    return filteredArticles.filter(a => a.type === 'Karya Sendiri').length;
  }, [filteredArticles]);

  const rilis = useMemo(() => {
    return filteredArticles.filter(a => a.type === 'Rilis').length;
  }, [filteredArticles]);

  const totalType = karyaSendiri + rilis;
  const percentKarya = totalType > 0 ? Math.round((karyaSendiri / totalType) * 100) : 0;
  const percentRilis = totalType > 0 ? Math.round((rilis / totalType) * 100) : 0;

  const currentMonthLabel = useMemo(() => {
    if (selectedMonth === 'all') return 'Semua Bulan';
    const monthMap: Record<string, string> = {
      '2026-06': 'Juni 2026',
      '2026-05': 'Mei 2026',
      '2026-04': 'April 2026',
      '2026-03': 'Maret 2026',
      '2026-02': 'Februari 2026',
      '2026-01': 'Januari 2026',
    };
    return monthMap[selectedMonth] || selectedMonth;
  }, [selectedMonth]);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between h-full min-h-[350px]">
      <div>
        <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
          <PieChart className="w-4 h-4 text-sky-650" />
          Proporsi Karya Sendiri vs Rilis ({currentMonthLabel})
        </h3>

        {totalType === 0 ? (
          <div className="py-16 text-center text-xs text-slate-400 italic">
            Tidak ada data artikel pada periode ini.
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center my-4">
            {/* Modern Donut Chart SVG */}
            <div className="relative w-36 h-36 my-2">
              <svg width="100%" height="100%" viewBox="0 0 140 140" className="-rotate-90 select-none">
                <defs>
                  <linearGradient id="skyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#0284c7" />
                  </linearGradient>
                  <linearGradient id="indigoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                </defs>

                {/* Background circle */}
                <circle cx="70" cy="70" r="45" fill="transparent" stroke="#f1f5f9" strokeWidth="14" />

                {/* Karya Sendiri Segment */}
                {percentKarya > 0 && (
                  <circle
                    cx="70"
                    cy="70"
                    r="45"
                    fill="transparent"
                    stroke="url(#skyGrad)"
                    strokeWidth="14"
                    strokeDasharray="282.74"
                    strokeDashoffset={282.74 - (percentKarya / 100) * 282.74}
                    strokeLinecap={percentRilis > 0 ? "butt" : "round"}
                  />
                )}

                {/* Rilis Segment */}
                {percentRilis > 0 && (
                  <circle
                    cx="70"
                    cy="70"
                    r="45"
                    fill="transparent"
                    stroke="url(#indigoGrad)"
                    strokeWidth="14"
                    strokeDasharray="282.74"
                    strokeDashoffset={282.74 - (percentRilis / 100) * 282.74}
                    transform={`rotate(${(percentKarya / 100) * 360} 70 70)`}
                    strokeLinecap={percentKarya > 0 ? "butt" : "round"}
                  />
                )}
              </svg>

              {/* Donut Center Display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase leading-none">TOTAL</span>
                <span className="text-xl font-black text-slate-800 font-mono mt-0.5">{totalType}</span>
                <span className="text-[8px] text-slate-400 font-bold uppercase leading-none">Berita</span>
              </div>
            </div>

            {/* Interactive Legends */}
            <div className="w-full mt-4 space-y-2">
              <div className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0"></span>
                  <span className="text-xs font-bold text-slate-700">Karya Sendiri</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-slate-900 font-mono">{karyaSendiri}</span>
                  <span className="text-[9.5px] text-slate-400 ml-1 font-semibold">({percentKarya}%)</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-slate-50/50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0"></span>
                  <span className="text-xs font-bold text-slate-700">Rilis Redaksi</span>
                </div>
                <div className="text-right">
                  <span className="text-xs font-extrabold text-slate-900 font-mono">{rilis}</span>
                  <span className="text-[9.5px] text-slate-400 ml-1 font-semibold">({percentRilis}%)</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Analysis & optional export */}
      <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-3">
        <div>
          <span className="font-bold text-slate-800 block mb-1 uppercase tracking-wider text-[9px]">Analisis Jenis Karya:</span>
          <p className="leading-relaxed text-[11px] text-slate-500">
            {totalType > 0 ? (
              <>
                Kanal berita didominasi oleh{' '}
                <strong className="text-slate-700 font-bold">
                  {karyaSendiri >= rilis ? 'Karya Sendiri (Orisinal)' : 'Rilis Redaksi (Humas)'}
                </strong>{' '}
                sebesar{' '}
                <strong className="text-sky-600 font-extrabold">
                  {Math.max(percentKarya, percentRilis)}%
                </strong>{' '}
                pada {currentMonthLabel}.
              </>
            ) : (
              'Belum ada data karya diunggah pada filter tanggal ini.'
            )}
          </p>
        </div>

        {onExportReport && (
          <button
            type="button"
            onClick={onExportReport}
            disabled={filteredArticles.length === 0}
            className="w-full mt-1 py-2 text-[10.5px] font-bold bg-slate-900 hover:bg-slate-850 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Ekspor Semua Berita (.CSV)</span>
          </button>
        )}
      </div>
    </div>
  );
}
