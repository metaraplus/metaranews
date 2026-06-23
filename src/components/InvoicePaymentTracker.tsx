import React, { useState, useEffect } from 'react';
import { 
  Search, 
  RefreshCw, 
  FileCheck, 
  Coins, 
  Calendar, 
  DollarSign, 
  X, 
  Check, 
  TrendingUp, 
  Percent, 
  Settings,
  Clock,
  ArrowRight
} from 'lucide-react';
import { db, collection, getDocs, doc, updateDoc, onSnapshot } from '../firebase';
import { Spj } from '../types';

// Helper to format date in Indonesian style like "05 Jun 2026"
const formatIndonesianStyleDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
    'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'
  ];
  const day = parts[2].padStart(2, '0');
  const monthIdx = parseInt(parts[1], 10) - 1;
  const year = parts[0];
  
  if (monthIdx >= 0 && monthIdx < 12) {
    return `${day} ${months[monthIdx]} ${year}`;
  }
  return dateStr;
};

// Custom formatter for Rupiah Indonesian currency style
const formatRupiah = (num: number): string => {
  return `Rp ${Math.round(num).toLocaleString('id-ID')}`;
};

export default function InvoicePaymentTracker() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);
  const [rawSpjs, setRawSpjs] = useState<Spj[]>([]);
  
  // Filtering & searching states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Editing state for managing payment modal
  const [selectedSpj, setSelectedSpj] = useState<Spj | null>(null);
  const [editPaymentDate, setEditPaymentDate] = useState('');
  const [editIsPaid, setEditIsPaid] = useState(true);
  const [editDanaMasuk, setEditDanaMasuk] = useState<number>(0);
  const [editFeeInsentif, setEditFeeInsentif] = useState<number>(0);

  // Fetch standard receipts data in real-time
  useEffect(() => {
    setLoading(true);
    setErrorMsg('');

    const querySpjs = collection(db, 'spjs');
    const unsubscribe = onSnapshot(querySpjs, (snapshot) => {
      const listData = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      } as Spj));
      setRawSpjs(listData);
      setLoading(false);
    }, (err) => {
      console.error("Error loading SPJ Payments:", err);
      setErrorMsg("Gagal sinkron database dana masuk.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const fetchSpjsForPayments = async (silent = false) => {
    // Legacy support, now snapshot listener is real-time
    setIsRefreshing(false);
  };

  // Compute calculated values per SPJ item
  const invoicesWithValues = rawSpjs.map((spj) => {
    // Total value of the invoice
    const totalValue = (spj.items || []).reduce((acc, item) => {
      const p = item.price || 0;
      const q = item.quantity || 0;
      return acc + (p * q);
    }, 0);

    // If paid is undefined but paymentDate of danaMasuk exists, treat as paid
    const isPaidComputed = spj.isPaid !== undefined 
      ? spj.isPaid 
      : (!!spj.paymentDate || (spj.danaMasuk !== undefined && spj.danaMasuk > 0));

    // Values paid/received
    const danaMasukVal = spj.danaMasuk !== undefined ? spj.danaMasuk : (isPaidComputed ? totalValue * 0.98 : 0);
    const sisaTagihanVal = isPaidComputed ? Math.max(0, totalValue - (spj.danaMasuk || 0)) : totalValue;
    const feeInsentifVal = spj.feeInsentif !== undefined ? spj.feeInsentif : (isPaidComputed ? danaMasukVal * 0.25 : 0);

    return {
      ...spj,
      totalValue,
      isPaidComputed,
      danaMasukVal,
      sisaTagihanVal,
      feeInsentifVal
    };
  });

  // Calculate totals for summary cards
  const totalInvoiceSum = invoicesWithValues.reduce((acc, item) => acc + item.totalValue, 0);
  const totalReceivedSum = invoicesWithValues.reduce((acc, item) => acc + item.danaMasukVal, 0);
  
  // Calculate remaining bills properly: if unpaid, it's the full totalValue. If partially paid, it's the remainder.
  const totalLeftSum = invoicesWithValues.reduce((acc, item) => {
    if (!item.isPaidComputed) return acc + item.totalValue;
    return acc + Math.max(0, item.totalValue - item.danaMasukVal);
  }, 0);
  
  const totalFeeIncentivesSum = invoicesWithValues.reduce((acc, item) => acc + item.feeInsentifVal, 0);

  // Filter list
  const filteredInvoices = invoicesWithValues.filter((spj) => {
    // Status Filter
    if (statusFilter === 'paid' && !spj.isPaidComputed) return false;
    if (statusFilter === 'unpaid' && spj.isPaidComputed) return false;

    // Search Query
    const query = searchQuery.toLowerCase();
    return (
      spj.invoiceNumber.toLowerCase().includes(query) ||
      spj.recipientName.toLowerCase().includes(query) ||
      (spj.paymentDate && spj.paymentDate.includes(query)) ||
      spj.date.includes(query)
    );
  });

  // Trigger manual sync
  const triggerSync = () => {
    setIsRefreshing(true);
    fetchSpjsForPayments(true);
  };

  // Open transaction detail panel
  const handleOpenEdit = (spj: typeof invoicesWithValues[0]) => {
    setSelectedSpj(spj);
    setEditPaymentDate(spj.paymentDate || spj.date || new Date().toISOString().split('T')[0]);
    setEditIsPaid(spj.isPaidComputed);
    setEditDanaMasuk(spj.danaMasuk !== undefined ? spj.danaMasuk : Math.round(spj.totalValue * 0.98));
    setEditFeeInsentif(spj.feeInsentif !== undefined ? spj.feeInsentif : Math.round((spj.danaMasuk || (spj.totalValue * 0.98)) * 0.25));
  };

  // Calculate preset options manually
  const selectDanaMasukPreset = (ratio: number) => {
    if (!selectedSpj) return;
    const baseValue = (selectedSpj as any).totalValue || 0;
    setEditDanaMasuk(Math.round(baseValue * ratio));
    // Re-evaluate incentive based on new value (25% default)
    setEditFeeInsentif(Math.round((baseValue * ratio) * 0.25));
  };

  const selectFeePreset = (pct: number) => {
    setEditFeeInsentif(Math.round(editDanaMasuk * (pct / 100)));
  };

  // Save edits back to Firestore
  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSpj) return;

    setSaveLoading(true);
    try {
      const spjRef = doc(db, 'spjs', selectedSpj.id);
      
      const nowStr = new Date().toISOString();
      const payload = {
        paymentDate: editIsPaid ? editPaymentDate : '',
        isPaid: editIsPaid,
        danaMasuk: editIsPaid ? editDanaMasuk : 0,
        feeInsentif: editIsPaid ? editFeeInsentif : 0,
        updatedAt: nowStr
      };

      await updateDoc(spjRef, payload);

      // Refresh state locally
      setRawSpjs(prev => prev.map(item => {
        if (item.id === selectedSpj.id) {
          return {
            ...item,
            ...payload
          };
        }
        return item;
      }));

      setSelectedSpj(null);
    } catch (error: any) {
      console.error("Error saving payment metrics/dates:", error);
      alert("Gagal melakukan pencatatan pembayaran ke database.");
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="space-y-6" id="invoice-payment-tracker-tab">

      {/* 1. Header component strictly aligned with user's screenshot layout style */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="space-y-1 text-left">
          <h2 className="text-[22px] font-black tracking-tight text-slate-950 font-sans">
            Pembayaran Invoice
          </h2>
          <p className="text-xs text-slate-505 font-medium">
            Pencatatan dana yang masuk dan fee insentif yang diberikan per invoice.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={triggerSync}
            disabled={isRefreshing || loading}
            className="flex items-center gap-1.5 bg-slate-50 border border-slate-205 hover:bg-slate-100 text-slate-700 py-2.5 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-3xs disabled:opacity-50"
            title="Refresh database"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sinkron Buku Kas</span>
          </button>
        </div>
      </div>

      {/* 2. Top Stats Overview layout in exact proportions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="pembayaran-stats-grid">
        {/* Total Nilai Invoice */}
        <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-3xs text-left">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
            Total Nilai Invoice
          </p>
          <p className="text-[22px] font-black text-slate-900 mt-2 font-sans tracking-tight">
            {formatRupiah(totalInvoiceSum)}
          </p>
        </div>

        {/* Total Dana Masuk */}
        <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-3xs text-left">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
            Total Dana Masuk
          </p>
          <p className="text-[22px] font-black text-emerald-600 mt-2 font-sans tracking-tight">
            {formatRupiah(totalReceivedSum)}
          </p>
        </div>

        {/* Sisa Tagihan Belum Dibayar */}
        <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-3xs text-left">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
            Sisa Tagihan Belum Dibayar
          </p>
          <p className="text-[22px] font-black text-red-650 mt-2 font-sans tracking-tight">
            {formatRupiah(totalLeftSum)}
          </p>
        </div>

        {/* Total Fee Insentif */}
        <div className="bg-white border border-slate-200/60 p-5 rounded-2xl shadow-3xs text-left">
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
            Total Fee Insentif
          </p>
          <p className="text-[22px] font-black text-[#2563eb] mt-2 font-sans tracking-tight">
            {formatRupiah(totalFeeIncentivesSum)}
          </p>
        </div>
      </div>

      {/* 3. Filters panel in exact alignment styles */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/70 shadow-3xs flex flex-col sm:flex-row items-center gap-3" id="payment-filter-action-line">
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari no invoice, dinas, instansi, tanggal atau riwayat pembayaran..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs focus:ring-1 focus:ring-sky-600 focus:border-sky-600 outline-hidden font-medium text-slate-800"
          />
        </div>

        <div className="flex gap-1.5 shrink-0 w-full sm:w-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap flex-1 sm:flex-auto ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-505'
            }`}
          >
            Semua ({invoicesWithValues.length})
          </button>
          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap flex-1 sm:flex-auto ${
              statusFilter === 'paid'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-550'
            }`}
          >
            Lunas ({invoicesWithValues.filter(x => x.isPaidComputed).length})
          </button>
          <button
            onClick={() => setStatusFilter('unpaid')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer whitespace-nowrap flex-1 sm:flex-auto ${
              statusFilter === 'unpaid'
                ? 'bg-red-650 text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-550'
            }`}
          >
            Sisa Tagihan ({invoicesWithValues.filter(x => !x.isPaidComputed).length})
          </button>
        </div>
      </div>

      {/* 4. Main Payment List table based on screenshot layout */}
      <div className="bg-white rounded-[20px] overflow-hidden border border-slate-200 shadow-sm" id="payment-table-card">
        {loading ? (
          <div className="py-24 flex flex-col justify-center items-center gap-3">
            <RefreshCw className="w-8 h-8 text-[#C61C23] animate-spin" />
            <p className="text-xs text-slate-500 font-bold">Sinkronisasi pembukuan dana invoice...</p>
          </div>
        ) : errorMsg ? (
          <div className="py-24 text-center">
            <p className="text-xs text-red-600 font-bold mb-2">{errorMsg}</p>
            <button 
              onClick={() => fetchSpjsForPayments()} 
              className="bg-slate-150 hover:bg-slate-200 text-xs font-bold py-1.5 px-4 rounded-xl text-slate-700"
            >
              Ulangi Sinkron
            </button>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-24 text-center space-y-2">
            <Coins className="w-10 h-10 text-slate-200 mx-auto" />
            <p className="text-xs text-slate-500 font-bold">Tidak menemukan catatan pembayaran invoice yang cocok.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-slate-800 font-sans">
              <thead>
                <tr className="bg-white border-b-2 border-slate-900 text-slate-900 font-extrabold text-xs">
                  <th className="py-4 px-6 w-[28%] text-left font-sans">Invoice & Klien</th>
                  <th className="py-4 px-5 w-[16%] text-left font-sans">Tanggal Dana Masuk</th>
                  <th className="py-4 px-5 w-[14%] text-left font-sans">Nilai Invoice</th>
                  <th className="py-4 px-5 w-[14%] text-left font-sans">Dana Masuk</th>
                  <th className="py-4 px-5 w-[14%] text-left font-sans">Sisa Tagihan</th>
                  <th className="py-4 px-5 w-[14%] text-left font-sans">Fee Insentif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredInvoices.map((item) => (
                  <tr 
                    key={item.id} 
                    onClick={() => handleOpenEdit(item)}
                    className="hover:bg-slate-50/50 transition-all align-top cursor-pointer group"
                    title="Klik untuk mengubah pencatatan pembayaran"
                  >
                    {/* Invoice & Klien */}
                    <td className="py-5 px-6">
                      <div className="font-extrabold text-slate-900 text-[11.5px] font-mono tracking-tight group-hover:text-blue-600 transition-colors">
                        {item.invoiceNumber}
                      </div>
                      <div className="text-[11px] font-bold text-slate-550 mt-1">
                        {item.recipientName}
                      </div>
                      <div className="text-[9.5px] font-bold text-slate-400 mt-1">
                        {formatIndonesianStyleDate(item.date)}
                      </div>
                    </td>

                    {/* Tanggal Dana Masuk */}
                    <td className="py-5 px-5 text-[11.5px] font-bold text-slate-700">
                      {item.isPaidComputed ? (
                        <span>{item.paymentDate ? formatIndonesianStyleDate(item.paymentDate) : 'Sudah Terbayar'}</span>
                      ) : (
                        <span className="text-red-500 font-semibold bg-red-50 py-0.5 px-2 rounded-md inline-block">Belum Masuk</span>
                      )}
                    </td>

                    {/* Nilai Invoice */}
                    <td className="py-5 px-5 text-[11.5px] font-extrabold text-slate-900">
                      {formatRupiah(item.totalValue)}
                    </td>

                    {/* Dana Masuk */}
                    <td className="py-5 px-5 text-[11.5px] font-extrabold text-emerald-600">
                      {item.isPaidComputed ? formatRupiah(item.danaMasukVal) : 'Rp 0'}
                    </td>

                    {/* Sisa Tagihan */}
                    <td className="py-5 px-5 text-[11.5px] font-extrabold text-slate-850">
                      <span className={item.sisaTagihanVal > 0 ? "text-red-650" : "text-emerald-650"}>
                        {formatRupiah(item.sisaTagihanVal)}
                      </span>
                    </td>

                    {/* Fee Insentif */}
                    <td className="py-5 px-5 text-[11.5px] font-extrabold text-[#2563eb]">
                      {item.isPaidComputed ? formatRupiah(item.feeInsentifVal) : 'Rp 0'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. MODAL / SLIDE DRAW ER TO EDIT INVOICE metrics */}
      {selectedSpj && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans animate-in fade-in duration-200">
          <div 
            className="bg-white rounded-3xl w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.30)] border border-slate-100 overflow-hidden text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="bg-slate-50 px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-slate-900">Pencatatan Status Pembayaran</h3>
                <p className="text-[11px] font-semibold text-slate-400 mt-1">Invoice No: {selectedSpj.invoiceNumber}</p>
              </div>
              <button 
                onClick={() => setSelectedSpj(null)}
                className="p-1.5 rounded-full hover:bg-slate-200 text-slate-400 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSavePayment} className="p-6 space-y-4">
              <div className="bg-sky-50 rounded-2xl p-4 border border-sky-100/60 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="font-bold text-sky-800">Total Tagihan Klien:</span>
                  <span className="font-mono font-black text-sky-950">{(selectedSpj as any).totalValue ? formatRupiah((selectedSpj as any).totalValue) : 'Rp 0'}</span>
                </div>
                <div className="text-[10px] text-sky-700 leading-relaxed font-medium">
                  Atur apakah dana tagihan telah masuk ke kas instansi Metaranews untuk menghitung otomatis sisa tagihan & potongan insentif.
                </div>
              </div>

              {/* Status Pembayaran */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Status</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditIsPaid(true);
                      if (editDanaMasuk === 0) {
                        setEditDanaMasuk(Math.round(((selectedSpj as any).totalValue || 0) * 0.98));
                        setEditFeeInsentif(Math.round((((selectedSpj as any).totalValue || 0) * 0.98) * 0.25));
                      }
                    }}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      editIsPaid 
                        ? 'bg-emerald-50 border-emerald-300 text-emerald-800 shadow-3xs' 
                        : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                    }`}
                  >
                    <Check className={`w-4 h-4 ${editIsPaid ? 'opacity-100' : 'opacity-0'}`} />
                    Lunas / Ada Dana Masuk
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditIsPaid(false);
                    }}
                    className={`py-2.5 px-4 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      !editIsPaid 
                        ? 'bg-red-50 border-red-200 text-red-800 shadow-3xs' 
                        : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                    }`}
                  >
                    <X className={`w-4 h-4 ${!editIsPaid ? 'opacity-100' : 'opacity-0'}`} />
                    Belum Terbayar
                  </button>
                </div>
              </div>

              {editIsPaid && (
                <div className="space-y-4 animate-in slide-in-from-top-1 duration-150">
                  {/* Tanggal Dana Masuk */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Tanggal Dana Masuk</label>
                    <input
                      type="date"
                      value={editPaymentDate}
                      onChange={(e) => setEditPaymentDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs text-slate-900 focus:outline-hidden focus:border-sky-500 focus:ring-1 focus:ring-sky-500 font-medium"
                      required
                    />
                  </div>

                  {/* Nilai Dana Masuk */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Jumlah Dana Masuk (Nett)</label>
                      <span className="text-[10px] font-extrabold text-[#C61C23] font-mono">
                        Selisih: {formatRupiah(Math.max(0, ((selectedSpj as any).totalValue || 0) - editDanaMasuk))}
                      </span>
                    </div>
                    
                    <div className="relative">
                      <span className="absolute left-4 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                      <input
                        type="number"
                        value={editDanaMasuk || ''}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setEditDanaMasuk(val);
                          setEditFeeInsentif(Math.round(val * 0.25));
                        }}
                        placeholder="Masukkan dana bersih..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 font-black focus:outline-hidden focus:border-sky-500 font-mono"
                        required
                      />
                    </div>

                    {/* Presets buttons for Tax calculations */}
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => selectDanaMasukPreset(0.98)}
                        className="px-2.5 py-1 text-[9.5px] font-bold bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 cursor-pointer"
                      >
                        Potong PPh 2% (98%)
                      </button>
                      <button
                        type="button"
                        onClick={() => selectDanaMasukPreset(0.87)}
                        className="px-2.5 py-1 text-[9.5px] font-bold bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 cursor-pointer"
                      >
                        PPh + PPN (87%)
                      </button>
                      <button
                        type="button"
                        onClick={() => selectDanaMasukPreset(1.0)}
                        className="px-2.5 py-1 text-[9.5px] font-bold bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-700 cursor-pointer"
                      >
                        Nett Penuh (100%)
                      </button>
                    </div>
                  </div>

                  {/* Fee Insentif */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-[11px] font-extrabold text-slate-500 uppercase tracking-wider block">Fee Insentif Tim Humas</label>
                      <span className="text-[10px] font-bold text-slate-400">
                        {editDanaMasuk > 0 ? `${Math.round((editFeeInsentif / editDanaMasuk) * 100)}% dari Dana Masuk` : ''}
                      </span>
                    </div>

                    <div className="relative">
                      <span className="absolute left-4 top-2.5 text-xs font-bold text-slate-400">Rp</span>
                      <input
                        type="number"
                        value={editFeeInsentif || ''}
                        onChange={(e) => setEditFeeInsentif(Number(e.target.value))}
                        placeholder="Masukkan nilai fee..."
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs text-slate-900 font-black focus:outline-hidden focus:border-sky-500 font-mono"
                        required
                      />
                    </div>

                    {/* Presets fee */}
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => selectFeePreset(25)}
                        className="px-2.5 py-1 text-[9.5px] font-bold bg-slate-100 hover:bg-slate-205 rounded-lg text-slate-700 cursor-pointer"
                      >
                        Humas 25%
                      </button>
                      <button
                        type="button"
                        onClick={() => selectFeePreset(30)}
                        className="px-2.5 py-1 text-[9.5px] font-bold bg-slate-100 hover:bg-slate-205 rounded-lg text-slate-700 cursor-pointer"
                      >
                        Humas 30%
                      </button>
                      <button
                        type="button"
                        onClick={() => selectFeePreset(40)}
                        className="px-2.5 py-1 text-[9.5px] font-bold bg-slate-100 hover:bg-slate-205 rounded-lg text-slate-700 cursor-pointer"
                      >
                        Humas 40%
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="border-t border-slate-100 pt-5 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedSpj(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-150 text-slate-650 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saveLoading}
                  className="px-6 py-2 bg-slate-905 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {saveLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Simpan Catatan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
