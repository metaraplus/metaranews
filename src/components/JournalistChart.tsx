/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Article, Journalist } from '../types';
import { Award, FileText, Camera, Users, PieChart } from 'lucide-react';

interface JournalistChartProps {
  articles: Article[];
  journalists: Journalist[];
  selectedMonth: string; // "YYYY-MM" or "all"
}

export default function JournalistChart({ articles, journalists, selectedMonth }: JournalistChartProps) {
  const [activeMetric, setActiveMetric] = useState<'all' | 'reporter' | 'writer' | 'documenter'>('all');
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

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

  // Compute daily contribution stats
  const dailyData = useMemo(() => {
    if (selectedMonth !== 'all') {
      const [yearStr, monthStr] = selectedMonth.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const daysInMonth = new Date(year, month, 0).getDate();
      
      const data = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = day.toString().padStart(2, '0');
        const dateStr = `${selectedMonth}-${dayStr}`;
        
        const dayArticles = filteredArticles.filter(a => a.date === dateStr);
        const reporterCount = dayArticles.filter(a => a.reporter && a.reporter !== 'Tidak ada / Admin').length;
        const writerCount = dayArticles.filter(a => a.writer && a.writer !== 'Tidak ada / Admin').length;
        const documenterCount = dayArticles.filter(a => a.documenter && a.documenter !== 'Tidak ada / Admin').length;
        const total = dayArticles.length;
        
        data.push({
          label: day.toString(),
          fullDate: dateStr,
          reporter: reporterCount,
          writer: writerCount,
          documenter: documenterCount,
          total: total
        });
      }
      return data;
    } else {
      // Group by date, fallback for 'all'
      const datesMap: Record<string, { reporter: number; writer: number; documenter: number; total: number }> = {};
      filteredArticles.forEach(a => {
        if (!datesMap[a.date]) {
          datesMap[a.date] = { reporter: 0, writer: 0, documenter: 0, total: 0 };
        }
        datesMap[a.date].total += 1;
        if (a.reporter && a.reporter !== 'Tidak ada / Admin') datesMap[a.date].reporter += 1;
        if (a.writer && a.writer !== 'Tidak ada / Admin') datesMap[a.date].writer += 1;
        if (a.documenter && a.documenter !== 'Tidak ada / Admin') datesMap[a.date].documenter += 1;
      });

      const uniqueDates = Object.keys(datesMap).sort();
      const limitDates = uniqueDates.slice(-15); // Show last 15 active dates
      
      return limitDates.map(dateStr => {
        const stats = datesMap[dateStr];
        const [, m, d] = dateStr.split('-');
        return {
          label: `${d}/${m}`,
          fullDate: dateStr,
          reporter: stats.reporter,
          writer: stats.writer,
          documenter: stats.documenter,
          total: stats.total
        };
      });
    }
  }, [filteredArticles, selectedMonth]);

  // Chart measurements
  const chartHeight = 280;
  const paddingLeft = 32; // Spacing for Y-axis labels
  const paddingRight = 10;
  const paddingTop = 15;
  const paddingBottom = 30; // Spacing for X-axis labels

  const maxVal = useMemo(() => {
    if (dailyData.length === 0) return 5;
    const values = dailyData.map(d => {
      if (activeMetric === 'all') return d.total;
      return d[activeMetric] || 0;
    });
    const max = Math.max(...values);
    return max <= 0 ? 5 : max;
  }, [dailyData, activeMetric]);

  // Rounded grid ticks based on max value
  const ticks = useMemo(() => {
    const calculatedTicks = [];
    const count = 4;
    const interval = Math.ceil(maxVal / count) || 1;
    for (let i = 0; i <= count; i++) {
      calculatedTicks.push(i * interval);
    }
    return Array.from(new Set(calculatedTicks)).sort((a, b) => a - b);
  }, [maxVal]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs" id="productivity-panel">
      {/* Chart Headers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-md">
            <span className="w-2.5 h-5 bg-sky-600 rounded-xs inline-block"></span>
            Grafik Produktivitas Jurnalis
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Menampilkan volume kontribusi real-time berdasarkan peran penugasan.
          </p>
        </div>

        {/* Metric Selector Buttons */}
        <div className="flex flex-wrap gap-1.5 p-1 bg-slate-50 rounded-lg border border-slate-100 self-start sm:self-center">
          <button
            onClick={() => setActiveMetric('all')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
              activeMetric === 'all'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-100/50'
                : 'text-slate-500 hover:text-slate-900'
            }`}
            id="metric-all-btn"
          >
            Semua Peran
          </button>
          <button
            onClick={() => setActiveMetric('reporter')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
              activeMetric === 'reporter'
                ? 'bg-rose-50 text-rose-700 shadow-xs border border-rose-100'
                : 'text-slate-500 hover:text-slate-900'
            }`}
            id="metric-reporter-btn"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Meliput
          </button>
          <button
            onClick={() => setActiveMetric('writer')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
              activeMetric === 'writer'
                ? 'bg-emerald-50 text-emerald-700 shadow-xs border border-emerald-100'
                : 'text-slate-500 hover:text-slate-900'
            }`}
            id="metric-writer-btn"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            Menulis
          </button>
          <button
            onClick={() => setActiveMetric('documenter')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1 ${
              activeMetric === 'documenter'
                ? 'bg-indigo-50 text-indigo-700 shadow-xs border border-indigo-100'
                : 'text-slate-500 hover:text-slate-900'
            }`}
            id="metric-doc-btn"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
            Dokumentasi
          </button>
        </div>
      </div>

      {filteredArticles.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-100 rounded-xl bg-slate-50/50">
          <Users className="w-8 h-8 text-slate-300 mb-2" />
          <p className="text-sm font-medium text-slate-600">Tidak ada kontribusi jurnalis bulan ini</p>
          <p className="text-xs text-slate-400 mt-1">Silakan tambahkan berita baru atau pilih bulan lain.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main vertical Bar Chart (Daily Productivity) */}
          <div className="lg:col-span-8 overflow-x-auto">
            <div className="min-w-[400px]">
              <svg 
                viewBox={`0 0 540 ${chartHeight}`} 
                className="w-full h-auto overflow-visible select-none h-[280px]"
                aria-label="Journalist productivity chart"
              >
                {/* Horizontal Grid lines (Ticks) */}
                {ticks.map((tick, index) => {
                  const maxTick = Math.max(...ticks);
                  const y = chartHeight - paddingBottom - ((chartHeight - paddingBottom - paddingTop) * tick) / maxTick;
                  return (
                    <g key={index} className="opacity-60">
                      <line
                        x1={paddingLeft}
                        y1={y}
                        x2={540 - paddingRight}
                        y2={y}
                        stroke="#e2e8f0"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      <text
                        x={paddingLeft - 8}
                        y={y + 3}
                        fill="#64748b"
                        fontSize="9"
                        textAnchor="end"
                        className="font-mono"
                      >
                        {tick}
                      </text>
                    </g>
                  );
                })}

                {/* X-Axis bottom baseline line */}
                <line
                  x1={paddingLeft}
                  y1={chartHeight - paddingBottom}
                  x2={540 - paddingRight}
                  y2={chartHeight - paddingBottom}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />

                {/* Vertical Bars for each day */}
                {dailyData.map((d, index) => {
                  const usableWidth = 540 - paddingLeft - paddingRight;
                  const barSpacing = usableWidth / dailyData.length;
                  const barWidth = Math.max(barSpacing * 0.65, 4);
                  const x = paddingLeft + index * barSpacing + (barSpacing - barWidth) / 2;

                  const val = activeMetric === 'all' ? d.total : d[activeMetric] || 0;
                  const maxTick = Math.max(...ticks);
                  const height = maxTick > 0 ? ((chartHeight - paddingBottom - paddingTop) * val) / maxTick : 0;
                  const y = chartHeight - paddingBottom - height;

                  const isHovered = hoveredDate === d.fullDate;

                  // Choose custom colors based on metric selection
                  let barColor = "#0ea5e9"; // All (Sky blue)
                  if (activeMetric === 'reporter') barColor = "#f43f5e"; // Rose
                  if (activeMetric === 'writer') barColor = "#10b981"; // Emerald
                  if (activeMetric === 'documenter') barColor = "#6366f1"; // Indigo

                  return (
                    <g
                      key={d.fullDate}
                      onMouseEnter={() => setHoveredDate(d.fullDate)}
                      onMouseLeave={() => setHoveredDate(null)}
                      className="cursor-pointer group"
                    >
                      {/* Hover background interactive column trigger */}
                      <rect
                        x={paddingLeft + index * barSpacing}
                        y={paddingTop}
                        width={barSpacing}
                        height={chartHeight - paddingTop - paddingBottom}
                        fill="#f8fafc"
                        opacity={isHovered ? 0.75 : 0}
                        className="transition-opacity duration-150"
                      />

                      {/* Display the actual bar */}
                      {val > 0 && (
                        <rect
                          x={x}
                          y={y}
                          width={barWidth}
                          height={height}
                          fill={barColor}
                          rx={Math.min(barWidth / 2, 4)}
                          className="transition-all duration-300 ease-out hover:brightness-105"
                        />
                      )}

                      {/* Day number x-axis text labels */}
                      {(dailyData.length <= 15 || index % 2 === 0 || isHovered) && (
                        <text
                          x={x + barWidth / 2}
                          y={chartHeight - paddingBottom + 14}
                          textAnchor="middle"
                          fill={isHovered ? "#0f172a" : "#94a3b8"}
                          fontSize={isHovered ? "10" : "8"}
                          fontWeight={isHovered ? "700" : "500"}
                          className="transition-all font-mono duration-150"
                        >
                          {d.label}
                        </text>
                      )}

                      {/* Floating value indicator immediately above the bar */}
                      {isHovered && val > 0 && (
                        <text
                          x={x + barWidth / 2}
                          y={Math.max(y - 5, paddingTop + 8)}
                          textAnchor="middle"
                          fill="#1e293b"
                          fontSize="9"
                          fontWeight="800"
                          className="font-mono"
                        >
                          {val}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Floating SVG Tooltip element placed at the top coordinate stack */}
                {hoveredDate && (() => {
                  const d = dailyData.find(item => item.fullDate === hoveredDate);
                  if (!d) return null;
                  const index = dailyData.indexOf(d);
                  const usableWidth = 540 - paddingLeft - paddingRight;
                  const barSpacing = usableWidth / dailyData.length;
                  const barWidth = Math.max(barSpacing * 0.65, 4);
                  const x = paddingLeft + index * barSpacing + (barSpacing - barWidth) / 2;
                  const val = activeMetric === 'all' ? d.total : d[activeMetric] || 0;
                  const maxTick = Math.max(...ticks);
                  const height = maxTick > 0 ? ((chartHeight - paddingBottom - paddingTop) * val) / maxTick : 0;
                  const y = chartHeight - paddingBottom - height;

                  const tooltipX = x + barWidth / 2;
                  const tooltipY = Math.max(y - 32, paddingTop + 24);

                  const parts = d.fullDate.split('-');
                  const monthsIndo = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                  const monthName = parts[1] ? monthsIndo[parseInt(parts[1], 10) - 1] : '';
                  const dateLabel = parts[2] ? `${parseInt(parts[2], 10)} ${monthName} ${parts[0]}` : d.fullDate;

                  return (
                    <g className="pointer-events-none transition-all duration-150 z-50">
                      <rect
                        x={tooltipX - 70}
                        y={tooltipY - 42}
                        width="140"
                        height="50"
                        rx="6"
                        fill="#0f172a"
                        stroke="#1e293b"
                        strokeWidth="1"
                      />
                      <text
                        x={tooltipX}
                        y={tooltipY - 28}
                        textAnchor="middle"
                        fill="#94a3b8"
                        fontSize="8"
                        fontWeight="bold"
                      >
                        {dateLabel}
                      </text>
                      <text
                        x={tooltipX}
                        y={tooltipY - 12}
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="10"
                        fontWeight="800"
                      >
                        {activeMetric === 'all' ? `${d.total} Berita` : ''}
                        {activeMetric === 'reporter' ? `${d.reporter} Liputan` : ''}
                        {activeMetric === 'writer' ? `${d.writer} Rubrikasi` : ''}
                        {activeMetric === 'documenter' ? `${d.documenter} Dokumentasi` : ''}
                      </text>
                      {activeMetric === 'all' && (
                        <text
                          x={tooltipX}
                          y={tooltipY - 4}
                          textAnchor="middle"
                          fill="#38bdf8"
                          fontSize="7"
                          fontWeight="medium"
                        >
                          {`L: ${d.reporter} | W: ${d.writer} | D: ${d.documenter}`}
                        </text>
                      )}
                      <polygon
                        points={`${tooltipX - 4},${tooltipY + 8} ${tooltipX + 4},${tooltipY + 8} ${tooltipX},${tooltipY + 13}`}
                        fill="#0f172a"
                      />
                    </g>
                  );
                })()}
              </svg>
            </div>
          </div>

          {/* Pie Chart: Karya Sendiri vs Rilis */}
          <div className="lg:col-span-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200 flex flex-col justify-between h-full min-h-[300px]">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-1.5 font-sans">
                <PieChart className="w-3.5 h-3.5 text-sky-600" />
                Proporsi Karya Sendiri vs Rilis
              </h4>

              {totalType === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400 italic">
                  Tidak ada data artikel pada periode ini.
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center my-2">
                  {/* Modern Donut Chart SVG */}
                  <div className="relative w-32 h-32 my-2">
                    <svg width="100%" height="100%" viewBox="0 0 140 140" className="-rotate-90">
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
                      <span className="text-lg font-black text-slate-800 font-mono mt-0.5">{totalType}</span>
                      <span className="text-[8px] text-slate-400 font-bold uppercase leading-none -mt-0.5">Berita</span>
                    </div>
                  </div>

                  {/* Interactive Dashboard Legends */}
                  <div className="w-full mt-3 space-y-2">
                    <div className="flex items-center justify-between p-2 pb-2.5 bg-white rounded-lg border border-slate-100 hover:border-slate-205 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-sky-500 shrink-0"></span>
                        <span className="text-xs font-bold text-slate-700">Karya Sendiri</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-slate-905 font-mono">{karyaSendiri}</span>
                        <span className="text-[9px] text-slate-400 ml-1 font-semibold">({percentKarya}%)</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-2 pb-2.5 bg-white rounded-lg border border-slate-100 hover:border-slate-205 transition-colors">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 shrink-0"></span>
                        <span className="text-xs font-bold text-slate-700">Rilis Redaksi</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-extrabold text-slate-905 font-mono">{rilis}</span>
                        <span className="text-[9px] text-slate-400 ml-1 font-semibold">({percentRilis}%)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Custom Summarization */}
            <div className="mt-4 pt-3.5 border-t border-slate-200 text-xs text-slate-500">
              <span className="font-bold text-slate-800 block mb-1 uppercase tracking-wider text-[9px]">Analisis Jenis Karya:</span>
              <p className="leading-relaxed text-[11px]">
                {totalType > 0 ? (
                  <>
                    Rubrikasi saat ini didominasi oleh{' '}
                    <strong className="text-slate-700 font-bold">
                      {karyaSendiri >= rilis ? 'Karya Sendiri (Orisinal)' : 'Rilis Redaksi (Humas)'}
                    </strong>{' '}
                    yang mencapai persentase{' '}
                    <strong className="text-sky-600 font-extrabold">
                      {Math.max(percentKarya, percentRilis)}%
                    </strong>{' '}
                    dari keseluruhan publikasi aktif ({currentMonthLabel}).
                  </>
                ) : (
                  'Belum ada data karya diunggah untuk rentang tanggal terpilih.'
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
