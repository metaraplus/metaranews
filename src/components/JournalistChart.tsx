/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Article, Journalist } from '../types';
import { Award, FileText, Camera, Users, PieChart } from 'lucide-react';

interface DailyDataPoint {
  label: string;
  fullDate: string;
  stacks: { name: string; val: number; color: string }[];
  total: number;
}

interface JournalistChartProps {
  articles: Article[];
  journalists: Journalist[];
  selectedMonth: string; // "YYYY-MM" or "all"
}

export default function JournalistChart({ articles, journalists, selectedMonth }: JournalistChartProps) {
  const [activeMetric, setActiveMetric] = useState<'all' | 'reporter' | 'writer' | 'documenter'>('all');
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [selectedJournalist, setSelectedJournalist] = useState<string | null>(null);

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

  // Stable color map for journalists using specific design palette
  const getJurnColor = (name: string) => {
    const idx = journalists.findIndex(j => j.name === name);
    const colors = [
      '#f43f5e', // Rose
      '#10b981', // Emerald
      '#6366f1', // Indigo
      '#0ea5e9', // Sky blue
      '#f59e0b', // Amber
      '#ec4899', // Pink
      '#8b5cf6', // Violet
      '#14b8a6', // Teal
      '#f97316', // Orange
      '#06b6d4', // Cyan
      '#84cc16', // Lime
      '#64748b'  // Slate
    ];
    if (idx === -1) return '#94a3b8'; // Default grey
    return colors[idx % colors.length];
  };

  // Find all journalists that actually have any contribution in the current filtered list of articles
  const activeJournalists = useMemo(() => {
    return journalists.filter(jurn => {
      return filteredArticles.some(a => {
        if (activeMetric === 'all') {
          return a.reporter === jurn.name || a.writer === jurn.name || a.documenter === jurn.name;
        } else if (activeMetric === 'reporter') {
          return a.reporter === jurn.name;
        } else if (activeMetric === 'writer') {
          return a.writer === jurn.name;
        } else if (activeMetric === 'documenter') {
          return a.documenter === jurn.name;
        }
        return false;
      });
    });
  }, [journalists, filteredArticles, activeMetric]);

  // Compute daily contribution stats stacked per journalist
  const dailyData = useMemo<DailyDataPoint[]>(() => {
    const getMonthData = (monthStr: string, labelStr: string): DailyDataPoint => {
      const monthArticles = filteredArticles.filter(a => a.date.startsWith(monthStr));
      
      // Calculate stacks for each active journalist
      const stacks: { name: string; val: number; color: string }[] = [];
      let monthTotal = 0;

      activeJournalists.forEach(jurn => {
        // If a journalist is selected via legend click, filter out other journalists from this calculation
        if (selectedJournalist && jurn.name !== selectedJournalist) return;

        let val = 0;
        monthArticles.forEach(a => {
          if (activeMetric === 'all') {
            if (a.reporter === jurn.name) val++;
            if (a.writer === jurn.name) val++;
            if (a.documenter === jurn.name) val++;
          } else if (activeMetric === 'reporter') {
            if (a.reporter === jurn.name) val++;
          } else if (activeMetric === 'writer') {
            if (a.writer === jurn.name) val++;
          } else if (activeMetric === 'documenter') {
            if (a.documenter === jurn.name) val++;
          }
        });

        if (val > 0) {
          stacks.push({
            name: jurn.name,
            val: val,
            color: getJurnColor(jurn.name)
          });
          monthTotal += val;
        }
      });

      return {
        label: labelStr,
        fullDate: monthStr,
        stacks,
        total: monthTotal
      };
    };

    const getDayData = (dateStr: string, labelStr: string): DailyDataPoint => {
      const dayArticles = filteredArticles.filter(a => a.date === dateStr);
      
      // Calculate stacks for each active journalist
      const stacks: { name: string; val: number; color: string }[] = [];
      let dayTotal = 0;

      activeJournalists.forEach(jurn => {
        // If a journalist is selected via legend click, filter out other journalists from this calculation
        if (selectedJournalist && jurn.name !== selectedJournalist) return;

        let val = 0;
        dayArticles.forEach(a => {
          if (activeMetric === 'all') {
            if (a.reporter === jurn.name) val++;
            if (a.writer === jurn.name) val++;
            if (a.documenter === jurn.name) val++;
          } else if (activeMetric === 'reporter') {
            if (a.reporter === jurn.name) val++;
          } else if (activeMetric === 'writer') {
            if (a.writer === jurn.name) val++;
          } else if (activeMetric === 'documenter') {
            if (a.documenter === jurn.name) val++;
          }
        });

        if (val > 0) {
          stacks.push({
            name: jurn.name,
            val: val,
            color: getJurnColor(jurn.name)
          });
          dayTotal += val;
        }
      });

      return {
        label: labelStr,
        fullDate: dateStr,
        stacks,
        total: dayTotal
      };
    };

    if (selectedMonth !== 'all') {
      const [yearStr, monthStr] = selectedMonth.split('-');
      const year = parseInt(yearStr, 10);
      const month = parseInt(monthStr, 10);
      const daysInMonth = new Date(year, month, 0).getDate();
      
      const data: DailyDataPoint[] = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const dayStr = day.toString().padStart(2, '0');
        const dateStr = `${selectedMonth}-${dayStr}`;
        data.push(getDayData(dateStr, day.toString()));
      }
      return data;
    } else {
      // Group by month when selectedMonth is 'all'
      const uniqueMonths = Array.from(new Set<string>(filteredArticles.map(a => a.date.substring(0, 7)))).sort();
      const monthsIndo = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
      
      return uniqueMonths.map(monthStr => {
        const [y, m] = monthStr.split('-');
        const monthName = monthsIndo[parseInt(m, 10) - 1] || m;
        const labelStr = `${monthName} ${y}`;
        return getMonthData(monthStr, labelStr);
      });
    }
  }, [filteredArticles, selectedMonth, activeJournalists, activeMetric, journalists, selectedJournalist]);

  // Chart measurements
  const chartHeight = 280;
  const paddingLeft = 32; // Spacing for Y-axis labels
  const paddingRight = 10;
  const paddingTop = 15;
  const paddingBottom = 30; // Spacing for X-axis labels

  const maxVal = useMemo(() => {
    if (dailyData.length === 0) return 5;
    const values = dailyData.map(d => d.total);
    const max = Math.max(...values);
    return max <= 0 ? 5 : max;
  }, [dailyData]);

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
        <div>
          {/* Legend Warna Jurnalis Aktif */}
          <div className="mb-4 flex flex-wrap gap-2 px-3 py-2 bg-slate-50 border border-slate-100 text-[10px] items-center justify-start rounded-lg text-slate-500 font-medium" id="journalist-legend-pills">
            <span className="font-bold self-center uppercase tracking-wider text-[8.5px] mr-1 text-slate-400">
              {selectedJournalist ? 'Filter Aktif (Klik untuk reset):' : 'Klik Legend Jurnalis untuk Memfilter Grafik:'}
            </span>
            {activeJournalists.map(jurn => {
              const isSelected = selectedJournalist === jurn.name;
              const hasFilter = selectedJournalist !== null;
              
              return (
                <button
                  key={jurn.id}
                  onClick={() => {
                    if (isSelected) {
                      setSelectedJournalist(null);
                    } else {
                      setSelectedJournalist(jurn.name);
                    }
                  }}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all border ${
                    isSelected
                      ? 'bg-sky-50 border-sky-300 ring-2 ring-sky-100'
                      : hasFilter
                      ? 'bg-white border-slate-200 opacity-40 hover:opacity-100'
                      : 'bg-white border-slate-200 hover:border-slate-305 hover:bg-slate-50'
                  }`}
                  title={isSelected ? `Sembunyikan filter ${jurn.name}` : `Tampilkan hanya kontribusi ${jurn.name}`}
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: getJurnColor(jurn.name) }}></span>
                  <span className={`font-semibold ${isSelected ? 'text-sky-800' : 'text-slate-700'}`}>{jurn.name}</span>
                </button>
              );
            })}
            {selectedJournalist && (
              <button
                onClick={() => setSelectedJournalist(null)}
                className="ml-auto text-[9.5px] font-bold text-sky-600 hover:text-sky-850 cursor-pointer flex items-center gap-1 self-center underline"
              >
                Tampilkan Semua Jurnalis
              </button>
            )}
            {activeJournalists.length === 0 && (
              <span className="text-slate-400 italic">Tidak ada jurnalis aktif</span>
            )}
          </div>

          <div className="w-full">
          {/* Main vertical Bar Chart (Daily Productivity) */}
          <div className="w-full overflow-x-auto">
            <div className="min-w-[650px] pr-2">
              <svg 
                viewBox={`0 0 760 ${chartHeight}`} 
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
                        x2={760 - paddingRight}
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
                  x2={760 - paddingRight}
                  y2={chartHeight - paddingBottom}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                />

                {/* Legend Warna Jurnalis Aktif */}
                <g className="pointer-events-none">
                  {/* Legend element is rendered outside SVG using standard HTML overlay or inline legend. Let us put it in the HTML section before grid! */}
                </g>

                {/* Vertical Bars for each day */}
                {dailyData.map((d, index) => {
                  const usableWidth = 760 - paddingLeft - paddingRight;
                  const barSpacing = usableWidth / dailyData.length;
                  const barWidth = Math.max(barSpacing * 0.65, 4);
                  const x = paddingLeft + index * barSpacing + (barSpacing - barWidth) / 2;

                  const isHovered = hoveredDate === d.fullDate;
                  const maxTick = Math.max(...ticks);

                  // Keep track of stacking Y offsets
                  let currentYOffset = 0;

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

                      {/* Display the stacked bar layers */}
                      {d.stacks.map((stack, stackIdx) => {
                        const segmentHeight = maxTick > 0 ? ((chartHeight - paddingBottom - paddingTop) * stack.val) / maxTick : 0;
                        const segmentY = chartHeight - paddingBottom - currentYOffset - segmentHeight;
                        
                        // Accumulate the offset for the next segment in the stack
                        currentYOffset += segmentHeight;

                        return (
                          <rect
                            key={`${d.fullDate}-${stack.name}`}
                            x={x}
                            y={segmentY}
                            width={barWidth}
                            height={segmentHeight}
                            fill={stack.color}
                            className="transition-all duration-300 ease-out hover:brightness-105"
                          />
                        );
                      })}

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

                      {/* Floating total value indicator immediately above the accumulated stack */}
                      {isHovered && d.total > 0 && (
                        <text
                          x={x + barWidth / 2}
                          y={Math.max(chartHeight - paddingBottom - currentYOffset - 5, paddingTop + 8)}
                          textAnchor="middle"
                          fill="#1e293b"
                          fontSize="9"
                          fontWeight="800"
                          className="font-mono"
                        >
                          {d.total}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Floating SVG Tooltip element placed at the top coordinate stack */}
                {hoveredDate && (() => {
                  const d = dailyData.find(item => item.fullDate === hoveredDate);
                  if (!d || d.total === 0) return null;
                  const index = dailyData.indexOf(d);
                  const usableWidth = 760 - paddingLeft - paddingRight;
                  const barSpacing = usableWidth / dailyData.length;
                  const barWidth = Math.max(barSpacing * 0.65, 4);
                  const x = paddingLeft + index * barSpacing + (barSpacing - barWidth) / 2;
                  
                  const maxTick = Math.max(...ticks);
                  const totalHeight = maxTick > 0 ? ((chartHeight - paddingBottom - paddingTop) * d.total) / maxTick : 0;
                  const topOfBar = chartHeight - paddingBottom - totalHeight;
                  const tooltipY = Math.max(topOfBar - 15, paddingTop + 10);

                  const parts = d.fullDate.split('-');
                  const monthsIndo = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
                  const monthName = parts[1] ? monthsIndo[parseInt(parts[1], 10) - 1] : '';
                  const dateLabel = parts[2] 
                    ? `${parseInt(parts[2], 10)} ${monthName} ${parts[0]}` 
                    : `${monthName} ${parts[0]}`;

                  // Tooltip box size dynamic based on number of contributors
                  const boxHeight = 22 + (d.stacks.length * 12) + 6;
                  const boxWidth = 150;
                  
                  // Constrain inside parent width boundary
                  let tooltipX = x + barWidth / 2;
                  if (tooltipX - boxWidth / 2 < paddingLeft) {
                    tooltipX = paddingLeft + boxWidth / 2;
                  } else if (tooltipX + boxWidth / 2 > 760 - paddingRight) {
                    tooltipX = 760 - paddingRight - boxWidth / 2;
                  }

                  return (
                    <g className="pointer-events-none transition-all duration-150 z-50">
                      <rect
                        x={tooltipX - boxWidth / 2}
                        y={tooltipY - boxHeight}
                        width={boxWidth}
                        height={boxHeight}
                        rx="6"
                        fill="#0f172a"
                        stroke="#1e293b"
                        strokeWidth="1"
                        opacity="0.95"
                      />
                      <text
                        x={tooltipX}
                        y={tooltipY - boxHeight + 14}
                        textAnchor="middle"
                        fill="#38bdf8"
                        fontSize="9"
                        fontWeight="bold"
                      >
                        {dateLabel}
                      </text>

                      {d.stacks.map((stack, sIdx) => {
                        const yPos = tooltipY - boxHeight + 28 + (sIdx * 12);
                        return (
                          <g key={stack.name}>
                            {/* Color Legend Indicator dot inside tooltip */}
                            <circle
                              cx={tooltipX - boxWidth / 2 + 12}
                              cy={yPos - 3}
                              r="3.5"
                              fill={stack.color}
                            />
                            <text
                              x={tooltipX - boxWidth / 2 + 22}
                              y={yPos}
                              fill="#f8fafc"
                              fontSize="8.5"
                              fontWeight="600"
                              textAnchor="start"
                            >
                              {stack.name.length > 15 ? `${stack.name.slice(0, 14)}..` : stack.name}
                            </text>
                            <text
                              x={tooltipX + boxWidth / 2 - 12}
                              y={yPos}
                              fill="#94a3b8"
                              fontSize="8.5"
                              fontWeight="bold"
                              textAnchor="end"
                            >
                              {stack.val} {activeMetric === 'all' ? 'pnt' : 'karya'}
                            </text>
                          </g>
                        );
                      })}
                      
                      <polygon
                        points={`${tooltipX - 4},${tooltipY} ${tooltipX + 4},${tooltipY} ${tooltipX},${tooltipY + 4}`}
                        fill="#0f172a"
                      />
                    </g>
                  );
                })()}
              </svg>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
}
