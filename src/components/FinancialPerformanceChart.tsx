/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { db, collection, getDocs } from '../firebase';
import { Spj, Expenditure } from '../types';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Percent, 
  Info, 
  Calendar,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase
} from 'lucide-react';

interface FinancialPerformanceChartProps {
  selectedMonth: string; // "YYYY-MM" or "all"
}

export default function FinancialPerformanceChart({ selectedMonth }: FinancialPerformanceChartProps) {
  const [spjs, setSpjs] = useState<Spj[]>([]);
  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load both collections on mount / refresh
  const fetchData = async () => {
    try {
      setIsLoading(true);

      // 1. Get cached SPJs and expenditures from localStorage
      const cachedSpjsStr = localStorage.getItem('metara_spjs');
      const cachedExpStr = localStorage.getItem('metara_expenditures');
      
      let localSpjs: Spj[] = [];
      let localExp: Expenditure[] = [];

      if (cachedSpjsStr) {
        try { localSpjs = JSON.parse(cachedSpjsStr); } catch (e) { console.error(e); }
      }
      if (cachedExpStr) {
        try { localExp = JSON.parse(cachedExpStr); } catch (e) { console.error(e); }
      }

      setSpjs(localSpjs);
      setExpenditures(localExp);

      // 2. Fetch from Firestore to sync in background
      try {
        const [spjSnap, expSnap] = await Promise.all([
          getDocs(collection(db, 'spjs')),
          getDocs(collection(db, 'expenditures'))
        ]);

        const remoteSpjs = spjSnap.docs.map(doc => doc.data() as Spj);
        const remoteExp = expSnap.docs.map(doc => doc.data() as Expenditure);

        // Merge SPJs
        const spjMap = new Map<string, Spj>();
        localSpjs.forEach(s => spjMap.set(s.id, s));
        remoteSpjs.forEach(s => { if (s.id) spjMap.set(s.id, s); });
        const mergedSpjs = Array.from(spjMap.values());
        setSpjs(mergedSpjs);
        localStorage.setItem('metara_spjs', JSON.stringify(mergedSpjs));

        // Merge Expenditures
        const expMap = new Map<string, Expenditure>();
        localExp.forEach(e => expMap.set(e.id, e));
        remoteExp.forEach(e => { if (e.id) expMap.set(e.id, e); });
        const mergedExp = Array.from(expMap.values());
        setExpenditures(mergedExp);
        localStorage.setItem('metara_expenditures', JSON.stringify(mergedExp));

      } catch (err) {
        console.warn("Background fetch failed for financial overview, using local state:", err);
      }
    } catch (err) {
      console.error("Gagal sinkronisasi data keuangan:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedMonth]);

  // Format IDR helper
  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  // Label Month Helper
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

  // Financial Calculations
  const finances = useMemo(() => {
    // 1. Calculate incoming funds (Dana Masuk)
    // Filter SPJs that are fully paid (Lunas)
    const paidSpjs = spjs.filter(s => {
      if (s.paymentStatus !== 'Lunas') return false;
      
      if (selectedMonth !== 'all') {
        // If specific month selected, match by paymentDate
        return s.paymentDate && s.paymentDate.startsWith(selectedMonth);
      }
      return true; // If 'all', sum all paid SPJs
    });

    const totalDanaMasuk = paidSpjs.reduce((sum, s) => {
      // Calculate total SPJ items amount
      const spjItemsTotal = s.items?.reduce((sSum, item) => sSum + (item.quantity * item.price), 0) || 0;
      // Prefer receivedAmount, fallback to SPJ items total
      const actualReceived = s.receivedAmount !== undefined ? s.receivedAmount : spjItemsTotal;
      return sum + actualReceived;
    }, 0);

    // 2. Calculate outgoing expenditures (Pengeluaran)
    const filteredExp = expenditures.filter(e => {
      if (selectedMonth !== 'all') {
        return e.date && e.date.startsWith(selectedMonth);
      }
      return true;
    });

    const totalPengeluaran = filteredExp.reduce((sum, e) => sum + e.amount, 0);

    // Net cash flow
    const netCashFlow = totalDanaMasuk - totalPengeluaran;

    // Expenditure categories breakdown
    const categoriesSum: Record<string, number> = {};
    filteredExp.forEach(e => {
      categoriesSum[e.category] = (categoriesSum[e.category] || 0) + e.amount;
    });

    const categoryBreakdown = Object.entries(categoriesSum).map(([name, amount]) => ({
      name,
      amount,
      percentage: totalPengeluaran > 0 ? Math.round((amount / totalPengeluaran) * 100) : 0
    })).sort((a, b) => b.amount - a.amount);

    return {
      totalDanaMasuk,
      totalPengeluaran,
      netCashFlow,
      categoryBreakdown,
      paidSpjsCount: paidSpjs.length,
      expCount: filteredExp.length
    };
  }, [spjs, expenditures, selectedMonth]);

  // Max value for comparative visual chart height scaling
  const maxFinanceValue = Math.max(finances.totalDanaMasuk, finances.totalPengeluaran, 1);
  const percentDanaMasuk = finances.totalDanaMasuk > 0 ? 100 : 0;
  const percentPengeluaran = finances.totalPengeluaran > 0 ? Math.round((finances.totalPengeluaran / maxFinanceValue) * 100) : 0;
  const normalizedDanaMasukHeight = Math.max(Math.round((finances.totalDanaMasuk / maxFinanceValue) * 100), 5);
  const normalizedPengeluaranHeight = Math.max(Math.round((finances.totalPengeluaran / maxFinanceValue) * 100), 5);

  return (
    <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-2xs space-y-6" id="financial-performance-card">
      
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h3 className="font-bold text-slate-900 flex items-center gap-2 text-md">
            <span className="w-2.5 h-5 bg-emerald-600 rounded-xs inline-block"></span>
            Analisis Arus Keuangan (Cash Flow)
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Perbandingan real-time antara Dana Masuk (Pembayaran SPJ Lunas) dan Pengeluaran ({currentMonthLabel}).
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-150 rounded-lg text-xs text-slate-600 font-bold">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>{currentMonthLabel}</span>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 text-center text-xs font-bold text-slate-400 animate-pulse">
          Menganalisis arus keuangan redaksi...
        </div>
      ) : (
        <div className="space-y-6">
          
          {/* THREE COLUMN SUMMARY CARD */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* 1. Dana Masuk Card */}
            <div className="p-4 rounded-xl border border-emerald-100 bg-emerald-50/20 space-y-1 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Total Dana Masuk
                </span>
                <span className="p-1 rounded-md bg-emerald-50 text-emerald-600">
                  <ArrowUpRight className="w-4 h-4" />
                </span>
              </div>
              <h4 className="text-xl font-black text-emerald-700 font-mono">
                {formatRupiah(finances.totalDanaMasuk)}
              </h4>
              <p className="text-[10px] text-slate-500 font-semibold">
                Dari {finances.paidSpjsCount} SPJ/Invoice lunas terbayar
              </p>
            </div>

            {/* 2. Pengeluaran Card */}
            <div className="p-4 rounded-xl border border-rose-100 bg-rose-50/20 space-y-1 relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Total Pengeluaran
                </span>
                <span className="p-1 rounded-md bg-rose-50 text-rose-600">
                  <ArrowDownRight className="w-4 h-4" />
                </span>
              </div>
              <h4 className="text-xl font-black text-rose-700 font-mono">
                {formatRupiah(finances.totalPengeluaran)}
              </h4>
              <p className="text-[10px] text-slate-500 font-semibold">
                Dari {finances.expCount} transaksi pengeluaran terinput
              </p>
            </div>

            {/* 3. Saldo Bersih Card */}
            <div className={`p-4 rounded-xl border space-y-1 ${
              finances.netCashFlow >= 0 
                ? 'border-sky-100 bg-sky-50/20' 
                : 'border-amber-100 bg-amber-50/20'
            }`}>
              <div className="flex justify-between items-start">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Sisa Saldo (Surplus/Defisit)
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider ${
                  finances.netCashFlow >= 0 
                    ? 'bg-sky-100 text-sky-700' 
                    : 'bg-amber-100 text-amber-700'
                }`}>
                  {finances.netCashFlow >= 0 ? 'Surplus' : 'Defisit'}
                </span>
              </div>
              <h4 className={`text-xl font-black font-mono ${
                finances.netCashFlow >= 0 ? 'text-sky-700' : 'text-amber-700'
              }`}>
                {formatRupiah(finances.netCashFlow)}
              </h4>
              <p className="text-[10px] text-slate-500 font-semibold">
                Sisa dana bersih operasional redaksi
              </p>
            </div>

          </div>

          {/* TWO COLUMN DETAILS SECTION */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            
            {/* Visual Column Chart comparison */}
            <div className="lg:col-span-5 bg-slate-50 rounded-2xl border border-slate-100 p-5 flex flex-col justify-between min-h-[250px]">
              <div>
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 mb-2">
                  <Briefcase className="w-4 h-4 text-slate-400" />
                  Visualisasi Perbandingan Kas
                </h4>
                <p className="text-[10px] text-slate-450 font-medium">
                  Rasio perbandingan antara total uang yang masuk dengan beban pengeluaran.
                </p>
              </div>

              {finances.totalDanaMasuk === 0 && finances.totalPengeluaran === 0 ? (
                <div className="text-center py-10 text-[11px] text-slate-400 font-semibold">
                  Tidak ada data transaksi keuangan untuk bulan ini.
                </div>
              ) : (
                <div className="flex items-end justify-center gap-16 h-36 pt-4 pb-2 border-b border-slate-200">
                  
                  {/* Dana Masuk Bar */}
                  <div className="flex flex-col items-center gap-2 group w-20">
                    <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {formatRupiah(finances.totalDanaMasuk)}
                    </div>
                    <div 
                      className="w-12 bg-gradient-to-t from-emerald-500 to-emerald-400 rounded-t-lg shadow-sm transition-all duration-500 ease-out hover:brightness-105"
                      style={{ height: `${normalizedDanaMasukHeight}%` }}
                    />
                    <span className="text-[10px] font-extrabold text-slate-500">Dana Masuk</span>
                  </div>

                  {/* Pengeluaran Bar */}
                  <div className="flex flex-col items-center gap-2 group w-20">
                    <div className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {formatRupiah(finances.totalPengeluaran)}
                    </div>
                    <div 
                      className="w-12 bg-gradient-to-t from-rose-500 to-rose-400 rounded-t-lg shadow-sm transition-all duration-500 ease-out hover:brightness-105"
                      style={{ height: `${normalizedPengeluaranHeight}%` }}
                    />
                    <span className="text-[10px] font-extrabold text-slate-500">Pengeluaran</span>
                  </div>

                </div>
              )}

              <div className="text-[10px] text-slate-400 font-semibold flex items-center justify-between pt-3">
                <span>Rasio Beban Pengeluaran:</span>
                <span className="font-mono text-slate-650">
                  {finances.totalDanaMasuk > 0 
                    ? Math.round((finances.totalPengeluaran / finances.totalDanaMasuk) * 100) 
                    : finances.totalPengeluaran > 0 ? 100 : 0}%
                </span>
              </div>
            </div>

            {/* Expenditure Categories breakdown list */}
            <div className="lg:col-span-7 space-y-4">
              <div>
                <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                  <Percent className="w-4 h-4 text-rose-500" />
                  Alokasi Pengeluaran Terbesar ({currentMonthLabel})
                </h4>
                <p className="text-[10px] text-slate-550 mt-0.5">
                  Rincian porsi pengeluaran per kategori yang terinput di dalam sistem.
                </p>
              </div>

              {finances.categoryBreakdown.length === 0 ? (
                <div className="p-8 text-center text-[11px] text-slate-400 border border-dashed border-slate-100 rounded-xl bg-slate-50/50 font-semibold">
                  Belum ada data rincian pengeluaran untuk ditampilkan.
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[220px] overflow-y-auto pr-1">
                  {finances.categoryBreakdown.map((item, index) => (
                    <div key={item.name} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-700 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-rose-500" />
                          {item.name}
                        </span>
                        <span className="font-mono font-bold text-slate-900">
                          {formatRupiah(item.amount)} <span className="text-[10px] text-slate-400 font-sans">({item.percentage}%)</span>
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-rose-500 rounded-full transition-all duration-500 ease-out"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
