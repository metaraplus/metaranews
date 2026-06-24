import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Check, 
  X, 
  Save, 
  Filter, 
  RotateCw, 
  ChevronLeft, 
  ChevronRight, 
  Download,
  Calendar,
  DollarSign,
  TrendingUp,
  User,
  CreditCard,
  Edit3,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { Spj } from '../types';
import { db, collection, getDocs, doc, setDoc } from '../firebase';

// Helper to format date in Indonesian long style: "21 Juni 2026"
const formatIndonesianDate = (dateStr: string): string => {
  if (!dateStr) return 'Belum dibayar';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  
  const months = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  const day = parseInt(parts[2], 10);
  const monthIdx = parseInt(parts[1], 10) - 1;
  const year = parts[0];
  
  if (monthIdx >= 0 && monthIdx < 12) {
    return `${day} ${months[monthIdx]} ${year}`;
  }
  return dateStr;
};

// Format currency as IDR
const formatRupiah = (num: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
};

interface PaymentTrackerProps {
  onNavigateToTab: (tab: 'spj') => void;
  selectedMonth?: string;
}

export default function PaymentTracker({ onNavigateToTab, selectedMonth = 'all' }: PaymentTrackerProps) {
  const [spjs, setSpjs] = useState<Spj[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<'Semua' | 'Lunas' | 'Belum Lunas'>('Semua');
  const [selectedYearMonth, setSelectedYearMonth] = useState('Semua');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'fee-desc' | 'payment-desc'>('date-desc');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Editing Spj Payment State (for inline/modal updating)
  const [editingSpj, setEditingSpj] = useState<Spj | null>(null);
  
  // Form fields
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<'Belum Lunas' | 'Lunas'>('Belum Lunas');
  const [marketingFee, setMarketingFee] = useState<number>(0);
  const [marketingName, setMarketingName] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');

  const fetchSpjs = async () => {
    try {
      setIsLoading(true);

      // 1. Get from localStorage first for instant response
      const cachedSpjsStr = localStorage.getItem('metara_spjs');
      let localSpjs: Spj[] = [];
      if (cachedSpjsStr) {
        try { localSpjs = JSON.parse(cachedSpjsStr); } catch (e) { console.error(e); }
      }
      setSpjs(localSpjs);

      // 2. Fetch from Firestore to sync
      try {
        const sSnap = await getDocs(collection(db, 'spjs'));
        const remoteSpjs = sSnap.docs.map(doc => doc.data() as Spj);
        
        // Merge or replace
        const mergedMap = new Map<string, Spj>();
        // local first
        localSpjs.forEach(s => mergedMap.set(s.id, s));
        // remote replaces
        remoteSpjs.forEach(s => {
          if (s.id) {
            mergedMap.set(s.id, s);
          }
        });

        const mergedList = Array.from(mergedMap.values());
        mergedList.sort((a, b) => (b.createdAt || b.id).localeCompare(a.createdAt || a.id));
        setSpjs(mergedList);
        localStorage.setItem('metara_spjs', JSON.stringify(mergedList));
      } catch (err) {
        console.warn("Using local cache for Payment Tracker:", err);
      }
    } catch (error) {
      console.error("Gagal memuat data pembayaran:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSpjs();
  }, []);

  // Set form fields when editing is triggered
  const startEditing = (spj: Spj) => {
    setEditingSpj(spj);
    setPaymentDate(spj.paymentDate || new Date().toISOString().split('T')[0]);
    setPaymentStatus(spj.paymentStatus || 'Belum Lunas');
    setMarketingFee(spj.marketingFee || 0);
    setMarketingName(spj.marketingName || '');
    setPaymentNotes(spj.paymentNotes || '');
  };

  // Close editing modal
  const cancelEditing = () => {
    setEditingSpj(null);
  };

  // Save payment details to state, localStorage, and Firestore
  const handleSavePayment = async () => {
    if (!editingSpj) return;
    setIsSaving(true);

    try {
      const updatedSpj: Spj = {
        ...editingSpj,
        paymentDate: paymentStatus === 'Lunas' ? paymentDate : '',
        paymentStatus,
        marketingFee: Number(marketingFee) || 0,
        marketingName,
        paymentNotes
      };

      // 1. Update list in state & local storage
      const updatedList = spjs.map(s => s.id === editingSpj.id ? updatedSpj : s);
      setSpjs(updatedList);
      localStorage.setItem('metara_spjs', JSON.stringify(updatedList));

      // 2. Update to Firestore
      await setDoc(doc(db, 'spjs', editingSpj.id), updatedSpj);
      
      setEditingSpj(null);
    } catch (error) {
      console.error("Gagal menyimpan rincian pembayaran:", error);
      alert("Gagal sinkronisasi data ke cloud. Data telah disimpan secara lokal.");
    } finally {
      setIsSaving(false);
    }
  };

  // Calculate totals of items inside an SPJ
  const getSpjTotal = (spj: Spj): number => {
    return spj.items?.reduce((sum, item) => sum + (item.quantity * item.price), 0) || 0;
  };

  // Filter options for months
  const yearMonthOptions = useMemo(() => {
    const months = spjs.map(e => e.date.substring(0, 7)).filter(Boolean);
    const unique = Array.from(new Set(months)) as string[];
    return unique.sort((a, b) => b.localeCompare(a));
  }, [spjs]);

  // Filtering Logic
  const filteredSpjs = useMemo(() => {
    return spjs.filter(s => {
      // Search
      const matchSearch = 
        s.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.marketingName && s.marketingName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.paymentNotes && s.paymentNotes.toLowerCase().includes(searchQuery.toLowerCase()));

      // Status
      const statusValue = s.paymentStatus || 'Belum Lunas';
      const matchStatus = selectedStatus === 'Semua' || statusValue === selectedStatus;

      // Date
      let matchDate = true;
      if (selectedMonth && selectedMonth !== 'all') {
        // If selectedMonth is active, filter by paymentDate (tanggal dana masuk)
        matchDate = !!s.paymentDate && s.paymentDate.startsWith(selectedMonth);
      } else {
        matchDate = selectedYearMonth === 'Semua' || s.date.startsWith(selectedYearMonth);
      }

      return matchSearch && matchStatus && matchDate;
    });
  }, [spjs, searchQuery, selectedStatus, selectedYearMonth, selectedMonth]);

  // Sorting Logic
  const sortedSpjs = useMemo(() => {
    const list = [...filteredSpjs];
    switch (sortBy) {
      case 'date-desc':
        return list.sort((a, b) => b.date.localeCompare(a.date));
      case 'date-asc':
        return list.sort((a, b) => a.date.localeCompare(b.date));
      case 'amount-desc':
        return list.sort((a, b) => getSpjTotal(b) - getSpjTotal(a));
      case 'fee-desc':
        return list.sort((a, b) => (b.marketingFee || 0) - (a.marketingFee || 0));
      case 'payment-desc':
        return list.sort((a, b) => {
          const dateA = a.paymentDate || '';
          const dateB = b.paymentDate || '';
          return dateB.localeCompare(dateA);
        });
      default:
        return list;
    }
  }, [filteredSpjs, sortBy]);

  // Statistics Calculation
  const stats = useMemo(() => {
    let totalInvoices = filteredSpjs.length;
    let paidCount = 0;
    let unpaidCount = 0;
    let totalPaidAmount = 0;
    let totalUnpaidAmount = 0;
    let totalMarketingFees = 0;

    filteredSpjs.forEach(s => {
      const amount = getSpjTotal(s);
      const isPaid = s.paymentStatus === 'Lunas';
      if (isPaid) {
        paidCount++;
        totalPaidAmount += amount;
      } else {
        unpaidCount++;
        totalUnpaidAmount += amount;
      }
      totalMarketingFees += s.marketingFee || 0;
    });

    return {
      totalInvoices,
      paidCount,
      unpaidCount,
      totalPaidAmount,
      totalUnpaidAmount,
      totalMarketingFees
    };
  }, [filteredSpjs]);

  // Pagination Calculations
  const paginatedSpjs = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedSpjs.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedSpjs, currentPage]);

  const totalPages = Math.ceil(sortedSpjs.length / itemsPerPage) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatus, selectedYearMonth, sortBy]);

  // Export Payment Report to CSV
  const handleExportCSV = () => {
    const csvRows = [
      ['No', 'Tanggal Terbit SPJ', 'Nomor SPJ/Invoice', 'Nama Instansi Penerima', 'Total Tagihan (IDR)', 'Status Pembayaran', 'Tanggal Lunas', 'Nama Marketing', 'Fee/Insentif Marketing (IDR)', 'Catatan']
    ];

    sortedSpjs.forEach((s, index) => {
      csvRows.push([
        String(index + 1),
        s.date,
        `"${s.invoiceNumber.replace(/"/g, '""')}"`,
        `"${s.recipientName.replace(/"/g, '""')}"`,
        String(getSpjTotal(s)),
        s.paymentStatus || 'Belum Lunas',
        s.paymentDate || '-',
        s.marketingName || '-',
        String(s.marketingFee || 0),
        `"${(s.paymentNotes || '').replace(/"/g, '""')}"`
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.map(row => row.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan_pembayaran_insentif_metara_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="payment-tracker-root">
      
      {/* 1. TOP STATS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="payment-kpi-panel">
        
        {/* KPI 1: Total SPJ */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-row items-center justify-between hover:scale-[1.01] transition-transform">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Total Tagihan SPJ
            </span>
            <h2 className="text-2xl font-black text-slate-900 font-mono">
              {stats.totalInvoices} <span className="text-xs text-slate-400 font-sans font-normal">Invoice</span>
            </h2>
            <p className="text-[10px] text-slate-500">
              Menunggu / Terbayar
            </p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600 shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Total Uang Masuk */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-row items-center justify-between hover:scale-[1.01] transition-transform">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Dana Masuk (Lunas)
            </span>
            <h2 className="text-lg font-black text-emerald-600 font-mono truncate max-w-[160px]" title={formatRupiah(stats.totalPaidAmount)}>
              {formatRupiah(stats.totalPaidAmount)}
            </h2>
            <p className="text-[10px] text-slate-500">
              Dari <strong className="text-slate-700 font-bold">{stats.paidCount}</strong> invoice lunas
            </p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Sisa Piutang */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-row items-center justify-between hover:scale-[1.01] transition-transform">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Piutang Belum Bayar
            </span>
            <h2 className="text-lg font-black text-red-600 font-mono truncate max-w-[160px]" title={formatRupiah(stats.totalUnpaidAmount)}>
              {formatRupiah(stats.totalUnpaidAmount)}
            </h2>
            <p className="text-[10px] text-slate-500">
              Ada <strong className="text-slate-700 font-bold">{stats.unpaidCount}</strong> invoice aktif
            </p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-red-50 flex items-center justify-center text-red-600 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 4: Total Insentif Marketing */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-row items-center justify-between hover:scale-[1.01] transition-transform">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Fee/Insentif Marketing
            </span>
            <h2 className="text-lg font-black text-indigo-600 font-mono truncate max-w-[160px]" title={formatRupiah(stats.totalMarketingFees)}>
              {formatRupiah(stats.totalMarketingFees)}
            </h2>
            <p className="text-[10px] text-slate-500">
              Akumulasi fee terdaftar
            </p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

      </div>

      {/* 2. CONTROLS PANEL */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm space-y-4 text-left">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          {/* Left search */}
          <div className="relative flex-1">
            <span className="absolute left-3 top-2.5 text-slate-400">
              <Search className="w-4 h-4" />
            </span>
            <input
              type="text"
              placeholder="Cari nomor invoice, instansi, nama marketing, atau catatan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none"
            />
          </div>

          {/* Right quick actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchSpjs}
              className="p-2 border border-slate-200 hover:border-slate-350 bg-white text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-xs"
              title="Ekspor laporan pembayaran ke CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Laporan</span>
            </button>
          </div>

        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap gap-3 items-center pt-3 border-t border-slate-100 text-xs">
          
          {/* 1. Status Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl">
            <span className="text-slate-400 font-bold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Status:
            </span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="font-extrabold bg-transparent border-0 p-0 text-slate-700 focus:ring-0 cursor-pointer text-xs"
            >
              <option value="Semua">Semua Status</option>
              <option value="Lunas">Lunas</option>
              <option value="Belum Lunas">Belum Lunas</option>
            </select>
          </div>

          {/* 2. Month Filter */}
          {!selectedMonth || selectedMonth === 'all' ? (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl">
              <span className="text-slate-400 font-bold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                Bulan Terbit:
              </span>
              <select
                value={selectedYearMonth}
                onChange={(e) => setSelectedYearMonth(e.target.value)}
                className="font-extrabold bg-transparent border-0 p-0 text-slate-700 focus:ring-0 cursor-pointer text-xs"
              >
                <option value="Semua">Semua Bulan</option>
                {yearMonthOptions.map(ym => (
                  <option key={ym} value={ym}>{ym}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 bg-sky-50 border border-sky-100 px-3 py-1.5 rounded-xl text-sky-700">
              <Calendar className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
              <span className="text-xs font-bold">
                Bulan Dana Masuk: <strong className="font-extrabold underline decoration-sky-300 decoration-2 underline-offset-2">{selectedMonth}</strong>
              </span>
            </div>
          )}

          {/* 3. Sorting Filter */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl">
            <span className="text-slate-400 font-bold flex items-center gap-1">
              Urutkan:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="font-extrabold bg-transparent border-0 p-0 text-slate-700 focus:ring-0 cursor-pointer text-xs"
            >
              <option value="date-desc">Tanggal Terbit Terkini</option>
              <option value="date-asc">Tanggal Terbit Terlama</option>
              <option value="amount-desc">Tagihan Terbesar</option>
              <option value="fee-desc">Fee Marketing Terbesar</option>
              <option value="payment-desc">Tanggal Bayar Terkini</option>
            </select>
          </div>

          {/* Reset button */}
          {(searchQuery || selectedStatus !== 'Semua' || selectedYearMonth !== 'Semua' || sortBy !== 'date-desc') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedStatus('Semua');
                setSelectedYearMonth('Semua');
                setSortBy('date-desc');
              }}
              className="text-red-500 hover:text-red-700 font-bold ml-1 cursor-pointer transition-colors"
            >
              Reset Filter
            </button>
          )}

          <div className="ml-auto text-slate-400 font-semibold">
            Ditemukan: <strong className="text-slate-700">{filteredSpjs.length}</strong> invoice
          </div>

        </div>

      </div>

      {/* 3. DATA TABLE */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm text-left">
        
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 font-semibold">Memuat data pembayaran...</p>
          </div>
        ) : sortedSpjs.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto">
              <CreditCard className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">Belum Ada Invoice</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Buat dokumen SPJ/Invoice terlebih dahulu di tab "Buat SPJ A4", maka otomatis akan muncul di tab Pembayaran ini.
            </p>
            <button
              onClick={() => onNavigateToTab('spj')}
              className="mt-3 px-4 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <span>Pergi ke Buat SPJ</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4 w-12 text-center">No</th>
                  <th className="py-3.5 px-3 w-44">Nomor SPJ / Penerima</th>
                  <th className="py-3.5 px-3 text-right">Total Tagihan</th>
                  <th className="py-3.5 px-3 text-center">Status</th>
                  <th className="py-3.5 px-3">Tanggal Bayar</th>
                  <th className="py-3.5 px-3">Marketing &amp; Fee</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedSpjs.map((s, index) => {
                  const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
                  const totalAmount = getSpjTotal(s);
                  const status = s.paymentStatus || 'Belum Lunas';
                  
                  return (
                    <tr key={s.id} className="hover:bg-slate-55/35 transition-colors group">
                      
                      {/* 1. NO */}
                      <td className="py-4 px-4 text-center font-mono font-bold text-slate-400">
                        {globalIndex}
                      </td>

                      {/* 2. INVOICE & RECIPIENT */}
                      <td className="py-4 px-3">
                        <div className="font-mono font-bold text-slate-900 truncate max-w-[200px]" title={s.invoiceNumber}>
                          {s.invoiceNumber}
                        </div>
                        <div className="font-bold text-slate-600 line-clamp-1 mt-0.5" title={s.recipientName}>
                          {s.recipientName}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Tgl Terbit: {formatIndonesianDate(s.date)}
                        </div>
                      </td>

                      {/* 3. TOTAL BILL */}
                      <td className="py-4 px-3 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                        {formatRupiah(totalAmount)}
                      </td>

                      {/* 4. STATUS BADGE */}
                      <td className="py-4 px-3 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                          status === 'Lunas'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-150'
                            : 'bg-red-50 text-red-700 border-red-150'
                        }`}>
                          {status === 'Lunas' ? (
                            <>
                              <CheckCircle className="w-2.5 h-2.5" />
                              Lunas
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-2.5 h-2.5" />
                              Belum Lunas
                            </>
                          )}
                        </span>
                      </td>

                      {/* 5. PAYMENT DATE */}
                      <td className="py-4 px-3 text-slate-700 whitespace-nowrap">
                        {status === 'Lunas' ? (
                          <div>
                            <div className="font-semibold text-slate-900">
                              {formatIndonesianDate(s.paymentDate || '')}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono font-bold">
                              {s.paymentDate}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Belum ada</span>
                        )}
                      </td>

                      {/* 6. MARKETING NAME & FEE */}
                      <td className="py-4 px-3">
                        {s.marketingName ? (
                          <div>
                            <div className="font-bold text-slate-850 flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" />
                              {s.marketingName}
                            </div>
                            <div className="font-mono font-black text-indigo-600 mt-0.5" title="Insentif">
                              {formatRupiah(s.marketingFee || 0)}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <span className="text-slate-400 italic block">Tanpa marketing</span>
                            {s.marketingFee ? (
                              <div className="font-mono font-bold text-indigo-600">
                                {formatRupiah(s.marketingFee)}
                              </div>
                            ) : null}
                          </div>
                        )}
                        {s.paymentNotes && (
                          <div className="text-[10px] text-slate-500 bg-slate-50 p-1 rounded mt-1 max-w-[180px] truncate" title={s.paymentNotes}>
                            Ket: {s.paymentNotes}
                          </div>
                        )}
                      </td>

                      {/* 7. ACTIONS */}
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => startEditing(s)}
                            className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 hover:text-sky-800 font-bold rounded-xl text-[10px] flex items-center gap-0.5 transition-colors cursor-pointer whitespace-nowrap"
                            title="Input rincian tanggal bayar dan fee marketing"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Input Bayar</span>
                          </button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        {!isLoading && sortedSpjs.length > 0 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Menampilkan <strong className="text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</strong> hingga{' '}
              <strong className="text-slate-800">
                {Math.min(currentPage * itemsPerPage, sortedSpjs.length)}
              </strong>{' '}
              dari <strong className="text-slate-800">{sortedSpjs.length}</strong> entri invoice
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              
              <span className="text-xs font-bold text-slate-700 bg-white border border-slate-200 px-3 py-1 rounded-lg">
                Halaman {currentPage} dari {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1 rounded-lg border border-slate-200 bg-white text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

      </div>

      {/* 4. MODAL DIALOG INPUT BAYAR & FEE MARKETING */}
      {editingSpj && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-md w-full overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-left font-sans">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-sm font-black text-slate-950 flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-sky-600" />
                  Rincian Pembayaran &amp; Insentif
                </h3>
                <span className="text-[10px] text-slate-400 font-mono block mt-0.5" title={editingSpj.invoiceNumber}>
                  {editingSpj.invoiceNumber.length > 32 ? editingSpj.invoiceNumber.substring(0, 32) + '...' : editingSpj.invoiceNumber}
                </span>
              </div>
              <button
                onClick={cancelEditing}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 cursor-pointer transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body / Form */}
            <div className="p-6 space-y-4 text-xs">
              
              {/* Recipient info box */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">INSTANSI PENERIMA</span>
                <p className="font-bold text-slate-850 mt-0.5 truncate">{editingSpj.recipientName}</p>
                
                <div className="mt-2 pt-2 border-t border-slate-150 flex justify-between items-center text-xs">
                  <span className="text-slate-400 font-bold text-[9px] uppercase tracking-wider">Nilai Tagihan</span>
                  <span className="font-mono font-black text-slate-900">{formatRupiah(getSpjTotal(editingSpj))}</span>
                </div>
              </div>

              {/* Input 1: Status Pembayaran */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  Status Pembayaran
                </label>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentStatus('Belum Lunas');
                    }}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      paymentStatus === 'Belum Lunas'
                        ? 'border-red-200 bg-red-50 text-red-700 shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span>Belum Lunas</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setPaymentStatus('Lunas');
                      if (!paymentDate) {
                        setPaymentDate(new Date().toISOString().split('T')[0]);
                      }
                    }}
                    className={`p-2.5 rounded-xl border text-center font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      paymentStatus === 'Lunas'
                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 shadow-2xs'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Lunas</span>
                  </button>
                </div>
              </div>

              {/* Input 2: Tanggal Lunas (Only if status is Lunas) */}
              {paymentStatus === 'Lunas' && (
                <div className="space-y-1 animate-in slide-in-from-top-1 duration-150">
                  <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Tanggal Pelunasan / Pembayaran
                  </label>
                  <input
                    type="date"
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none font-semibold text-slate-850"
                  />
                </div>
              )}

              {/* Input 3: Nama Marketing */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Nama Marketing (Jika ada)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Budi Prasetyo"
                  value={marketingName}
                  onChange={(e) => setMarketingName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none text-slate-800"
                />
              </div>

              {/* Input 4: Fee / Insentif Marketing */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                  Nominal Fee / Insentif (Rupiah)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-slate-400 font-bold font-mono">Rp</span>
                  <input
                    type="number"
                    placeholder="Contoh: 150000"
                    value={marketingFee === 0 ? '' : marketingFee}
                    onChange={(e) => setMarketingFee(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none font-mono text-slate-800"
                  />
                </div>
                {marketingFee > 0 && (
                  <p className="text-[10px] text-emerald-600 font-bold font-mono text-right pt-0.5">
                    Formatted: {formatRupiah(marketingFee)}
                  </p>
                )}
              </div>

              {/* Input 5: Catatan Tambahan */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider block">
                  Catatan Transaksi / Pembayaran
                </label>
                <textarea
                  placeholder="Tulis rincian tambahan, misal: 'Transfer Bank Jatim', 'Diterima tunai oleh Lutfi', dsb."
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none text-slate-800"
                />
              </div>

            </div>

            {/* Modal Actions Footer */}
            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={cancelEditing}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl cursor-pointer"
                disabled={isSaving}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSavePayment}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Rincian</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
