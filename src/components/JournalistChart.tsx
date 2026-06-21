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
  const [hoveredBarId, setHoveredBarId] = useState<string | null>(null);

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

  // Compute stats for each journalist
  const productivityData = useMemo(() => {
    return journalists.map(jurn => {
      const reporterCount = filteredArticles.filter(a => a.reporter === jurn.name).length;
      const writerCount = filteredArticles.filter(a => a.writer === jurn.name).length;
      const documenterCount = filteredArticles.filter(a => a.documenter === jurn.name).length;
      const total = reporterCount + writerCount + documenterCount;

      return {
        id: jurn.id,
        name: jurn.name,
        role: jurn.role,
        reporter: reporterCount,
        writer: writerCount,
        documenter: documenterCount,
        total: total
      };
    })
    .filter(item => item.total > 0) // Only show journalists with active work in this timeframe
    .sort((a, b) => {
      if (activeMetric === 'all') return b.total - a.total;
      return b[activeMetric] - a[activeMetric];
    });
  }, [journalists, filteredArticles, activeMetric]);

  // Chart measurements
  const chartHeight = 280;
  const paddingLeft = 140; // Spacing for names
  const paddingRight = 40;
  const paddingTop = 20;
  const paddingBottom = 20;

  const maxVal = useMemo(() => {
    if (productivityData.length === 0) return 10;
    const values = productivityData.map(d => {
      if (activeMetric === 'all') return d.total;
      return d[activeMetric];
    });
    const max = Math.max(...values);
    return max === 0 ? 10 : max;
  }, [productivityData, activeMetric]);

  // Rounded grid ticks based on max value
  const ticks = useMemo(() => {
    const calculatedTicks = [];
    const count = 4;
    const interval = Math.ceil(maxVal / count);
    for (let i = 0; i <= count; i++) {
      calculatedTicks.push(i * interval);
    }
    return calculatedTicks;
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

      {productivityData.length === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-slate-100 rounded-xl bg-slate-50/50">
          <Users className="w-8 h-8 text-slate-300 mb-2" />
          <p className="text-sm font-medium text-slate-600">Tidak ada kontribusi jurnalis bulan ini</p>
          <p className="text-xs text-slate-400 mt-1">Silakan tambahkan berita baru atau pilih bulan lain.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Main Horizontal Bar Chart */}
          <div className="lg:col-span-8 overflow-x-auto">
            <div className="min-w-[400px]">
              <svg 
                viewBox={`0 0 540 ${chartHeight}`} 
                className="w-full h-auto overflow-visible select-none"
                aria-label="Journalist productivity chart"
              >
                {/* Grid Lines & Ticks */}
                {ticks.map((tick, index) => {
                  const x = paddingLeft + ((540 - paddingLeft - paddingRight) * tick) / maxVal;
                  return (
                    <g key={index} className="opacity-60">
                      <line
                        x1={x}
                        y1={paddingTop}
                        x2={x}
                        y2={chartHeight - paddingBottom}
                        stroke="#e2e8f0"
                        strokeDasharray="4 4"
                        strokeWidth="1"
                      />
                      <text
                        x={x}
                        y={chartHeight - 4}
                        fill="#64748b"
                        fontSize="10"
                        textAnchor="middle"
                        className="font-mono"
                      >
                        {tick}
                      </text>
                    </g>
                  );
                })}

                {/* Sub-Bars per Journalist */}
                {productivityData.map((data, index) => {
                  const barSpacing = (chartHeight - paddingTop - paddingBottom) / productivityData.length;
                  const y = paddingTop + index * barSpacing + (barSpacing - 18) / 2;
                  const maxBarWidth = 540 - paddingLeft - paddingRight;

                  // Values
                  const wReporter = (maxBarWidth * data.reporter) / maxVal;
                  const wWriter = (maxBarWidth * data.writer) / maxVal;
                  const wDoc = (maxBarWidth * data.documenter) / maxVal;
                  const wTotal = (maxBarWidth * data.total) / maxVal;

                  const isHovered = hoveredBarId === data.id;

                  return (
                    <g
                      key={data.id}
                      onMouseEnter={() => setHoveredBarId(data.id)}
                      onMouseLeave={() => setHoveredBarId(null)}
                      className="cursor-pointer group"
                    >
                      {/* Name Label */}
                      <text
                        x={paddingLeft - 12}
                        y={y + 11}
                        textAnchor="end"
                        fontSize="11"
                        fontWeight="500"
                        fill={isHovered ? '#0f172a' : '#475569'}
                        className="transition-colors duration-200"
                      >
                        {data.name}
                      </text>

                      {/* Ghost Background bar container to help hover */}
                      <rect
                        x={paddingLeft}
                        y={y - 4}
                        width={maxBarWidth}
                        height={24}
                        fill="transparent"
                        rx="4"
                      />

                      {/* Drawing the active metric bars */}
                      {activeMetric === 'all' ? (
                        /* Stacked or Segmented Bar representing contribution blend */
                        <g>
                          {/* Liputan Portion (Rose) */}
                          <rect
                            x={paddingLeft}
                            y={y}
                            width={Math.max(wReporter, 2)}
                            height={12}
                            fill="#f43f5e"
                            rx={data.writer === 0 && data.documenter === 0 ? 3 : 0}
                            className="transition-all duration-500 ease-out"
                          />
                          {/* Penulis Portion (Emerald) */}
                          <rect
                            x={paddingLeft + wReporter}
                            y={y}
                            width={Math.max(wWriter, 2)}
                            height={12}
                            fill="#10b981"
                            rx={data.documenter === 0 && wReporter === 0 ? 3 : 0}
                            className="transition-all duration-500 ease-out"
                          />
                          {/* Dokumentasi Portion (Indigo) */}
                          <rect
                            x={paddingLeft + wReporter + wWriter}
                            y={y}
                            width={Math.max(wDoc, 2)}
                            height={12}
                            fill="#6366f1"
                            rx={3}
                            className="transition-all duration-500 ease-out"
                          />
                          {/* Total Indicator label (visible on hover) */}
                          <text
                            x={paddingLeft + wTotal + 8}
                            y={y + 10}
                            fontSize="10"
                            fontWeight="600"
                            fill="#1e293b"
                            className={`transition-opacity duration-200 ${
                              isHovered ? 'opacity-100' : 'opacity-85'
                            } font-mono`}
                          >
                            {data.total}
                          </text>
                        </g>
                      ) : (
                        /* Single colored bar representing selected metric */
                        <g>
                          <rect
                            x={paddingLeft}
                            y={y}
                            width={Math.max(
                              activeMetric === 'reporter' ? wReporter :
                              activeMetric === 'writer' ? wWriter : wDoc,
                              1
                            )}
                            height={12}
                            fill={
                              activeMetric === 'reporter' ? '#f43f5e' :
                              activeMetric === 'writer' ? '#10b981' : '#6366f1'
                            }
                            rx={3}
                            className="transition-all duration-500 ease-out"
                          />
                          <text
                            x={
                              paddingLeft + (
                                activeMetric === 'reporter' ? wReporter :
                                activeMetric === 'writer' ? wWriter : wDoc
                              ) + 8
                            }
                            y={y + 10}
                            fontSize="10"
                            fontWeight="600"
                            fill="#1e293b"
                            className="font-mono"
                          >
                            {activeMetric === 'reporter' ? data.reporter :
                             activeMetric === 'writer' ? data.writer : data.documenter}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
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
