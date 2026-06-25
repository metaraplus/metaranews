/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { db, collection, getDocs, setDoc, doc, deleteDoc } from '../firebase';
import { Expenditure } from '../types';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit3, 
  DollarSign, 
  Calendar, 
  FileText, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  X,
  TrendingDown,
  Info
} from 'lucide-react';

interface ExpenditureTrackerProps {
  selectedMonth?: string;
}

const CATEGORIES = [
  'Gaji & Insentif',
  'Operasional Kantor',
  'Perjalanan Dinas',
  'Uang Makan',
  'Perlengkapan',
  'Lain-lain'
];

export default function ExpenditureTracker({ selectedMonth = 'all' }: ExpenditureTrackerProps) {
  const [expenditures, setExpenditures] = useState<Expenditure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>('Semua');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc'>('date-desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Form State for Add / Edit (inline or modular modal)
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  const fetchExpenditures = async () => {
    try {
      setIsLoading(true);

      // 1. Instantly load from localStorage for speed
      const cached = localStorage.getItem('metara_expenditures');
      let localExp: Expenditure[] = [];
      if (cached) {
        try { localExp = JSON.parse(cached); } catch (e) { console.error(e); }
      }
      setExpenditures(localExp);

      // 2. Fetch from Firestore to sync
      try {
        const querySnapshot = await getDocs(collection(db, 'expenditures'));
        const remoteExp = querySnapshot.docs.map(doc => doc.data() as Expenditure);

        // Merge
        const mergedMap = new Map<string, Expenditure>();
        localExp.forEach(e => mergedMap.set(e.id, e));
        remoteExp.forEach(e => {
          if (e.id) mergedMap.set(e.id, e);
        });

        const mergedList = Array.from(mergedMap.values());
        mergedList.sort((a, b) => b.date.localeCompare(a.date));
        
        setExpenditures(mergedList);
        localStorage.setItem('metara_expenditures', JSON.stringify(mergedList));
      } catch (err) {
        console.warn("Using local cache for Expenditures:", err);
      }
    } catch (err) {
      console.error("Gagal mengambil data pengeluaran:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenditures();
  }, []);

  // Sync state year-month filter option when selectedMonth changes
  useEffect(() => {
    if (selectedMonth !== 'all') {
      setSelectedYearMonth(selectedMonth);
    } else {
      setSelectedYearMonth('Semua');
    }
    setCurrentPage(1);
  }, [selectedMonth]);

  // Unique list of Year-Months available in expenditures
  const availableMonths = React.useMemo(() => {
    const monthsSet = new Set<string>();
    expenditures.forEach(e => {
      if (e.date && e.date.length >= 7) {
        monthsSet.add(e.date.substring(0, 7));
      }
    });
    const sorted = Array.from(monthsSet).sort((a, b) => b.localeCompare(a));
    return sorted;
  }, [expenditures]);

  // Form submit (Create or Update)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !category || !amount || !description) {
      alert("Harap lengkapi semua field yang wajib diisi.");
      return;
    }

    setIsSaving(true);
    const numericAmount = Number(amount) || 0;
    
    try {
      const id = editingId || 'exp_' + Math.random().toString(36).substring(2, 15);
      const payload: Expenditure = {
        id,
        date,
        category,
        amount: numericAmount,
        description,
        notes: notes || '',
        createdAt: editingId 
          ? (expenditures.find(item => item.id === editingId)?.createdAt || new Date().toISOString())
          : new Date().toISOString()
      };

      // 1. Update state & local storage
      const newList = editingId 
        ? expenditures.map(item => item.id === editingId ? payload : item)
        : [payload, ...expenditures];

      setExpenditures(newList);
      localStorage.setItem('metara_expenditures', JSON.stringify(newList));

      // 2. Save to Firestore
      await setDoc(doc(db, 'expenditures', id), payload);

      // Reset form
      resetForm();
    } catch (err) {
      console.error("Gagal menyimpan pengeluaran:", err);
      alert("Gagal menyimpan ke cloud, data disimpan secara lokal.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (exp: Expenditure) => {
    setEditingId(exp.id);
    setDate(exp.date);
    setCategory(exp.category);
    setAmount(exp.amount.toString());
    setDescription(exp.description);
    setNotes(exp.notes || '');
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus data pengeluaran ini?")) {
      return;
    }

    try {
      const newList = expenditures.filter(e => e.id !== id);
      setExpenditures(newList);
      localStorage.setItem('metara_expenditures', JSON.stringify(newList));

      await deleteDoc(doc(db, 'expenditures', id));
    } catch (err) {
      console.error("Gagal menghapus pengeluaran:", err);
      alert("Gagal menghapus dari cloud, data diperbarui secara lokal.");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setDate(new Date().toISOString().split('T')[0]);
    setCategory(CATEGORIES[0]);
    setAmount('');
    setDescription('');
    setNotes('');
    setShowForm(false);
  };

  // Filter and Sort Logic
  const filteredList = React.useMemo(() => {
    let result = [...expenditures];

    // Filter by year-month
    if (selectedYearMonth !== 'Semua') {
      result = result.filter(e => e.date && e.date.startsWith(selectedYearMonth));
    }

    // Filter by category
    if (selectedCategory !== 'Semua') {
      result = result.filter(e => e.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      result = result.filter(e => 
        (e.description && e.description.toLowerCase().includes(q)) || 
        (e.notes && e.notes.toLowerCase().includes(q)) ||
        (e.category && e.category.toLowerCase().includes(q))
      );
    }

    // Sorting
    result.sort((a, b) => {
      if (sortBy === 'date-desc') return b.date.localeCompare(a.date);
      if (sortBy === 'date-asc') return a.date.localeCompare(b.date);
      if (sortBy === 'amount-desc') return b.amount - a.amount;
      if (sortBy === 'amount-asc') return a.amount - b.amount;
      return 0;
    });

    return result;
  }, [expenditures, selectedYearMonth, selectedCategory, searchQuery, sortBy]);

  // Total calculation for current filters
  const totalAmount = React.useMemo(() => {
    return filteredList.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredList]);

  // Pagination logic
  const totalPages = Math.ceil(filteredList.length / itemsPerPage);
  const paginatedList = React.useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredList.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredList, currentPage]);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(num);
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* HEADER SECTION WITH STATS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-row items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Total Pengeluaran Sesuai Filter
            </span>
            <h2 className="text-2xl font-black text-rose-600 font-mono">
              {formatRupiah(totalAmount)}
            </h2>
            <p className="text-[10px] text-slate-500">
              Dari {filteredList.length} transaksi tercatat
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-row items-center justify-end">
          <button
            onClick={() => {
              if (showForm) {
                resetForm();
              } else {
                setShowForm(true);
              }
            }}
            className="w-full md:w-auto bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-5 py-3 rounded-xl shadow-md shadow-rose-500/10 hover:shadow-rose-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            <span>{showForm ? 'Batal / Tutup Form' : 'Input Pengeluaran Baru'}</span>
          </button>
        </div>
      </div>

      {/* INPUT FORM */}
      {showForm && (
        <div className="bg-white rounded-2xl border-2 border-rose-100 p-6 shadow-sm space-y-4 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-rose-500" />
              {editingId ? 'Edit Data Pengeluaran' : 'Form Pengeluaran Baru'}
            </h3>
            <button 
              onClick={resetForm}
              className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4">
            <div className="md:col-span-3 space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Tanggal Pengeluaran <span className="text-red-500">*</span></label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  required
                />
              </div>
            </div>

            <div className="md:col-span-3 space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Kategori Pengeluaran <span className="text-red-500">*</span></label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                required
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="md:col-span-6 space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Jumlah Pengeluaran (IDR) <span className="text-red-500">*</span></label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs font-extrabold text-slate-400 pointer-events-none">Rp</span>
                <input
                  type="number"
                  placeholder="Contoh: 1500000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-mono font-bold focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                  required
                  min="1"
                />
              </div>
            </div>

            <div className="md:col-span-12 space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Keterangan / Deskripsi <span className="text-red-500">*</span></label>
              <input
                type="text"
                placeholder="Deskripsi keperluan pengeluaran..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                required
              />
            </div>

            <div className="md:col-span-12 space-y-1">
              <label className="text-xs font-bold text-slate-700 block">Catatan Tambahan (Opsional)</label>
              <input
                type="text"
                placeholder="Catatan pelengkap, nomor bukti transfer, dsb..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-medium focus:outline-hidden focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="md:col-span-12 pt-2 flex justify-end gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg cursor-pointer transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Menyimpan...' : 'Simpan Data'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FILTER PANEL */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <h4 className="font-bold text-slate-700 text-xs">Filter Data Pengeluaran</h4>
          </div>
          <div className="flex flex-wrap gap-2 text-[10px] text-slate-400">
            <span>Menampilkan <strong>{filteredList.length}</strong> baris pengeluaran</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {/* 1. Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari keterangan..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 placeholder-slate-450 focus:outline-hidden focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* 2. Category selection */}
          <div>
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold focus:outline-hidden focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="Semua">Semua Kategori</option>
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* 3. Year Month filter */}
          <div>
            <select
              value={selectedYearMonth}
              onChange={(e) => { setSelectedYearMonth(e.target.value); setCurrentPage(1); }}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold focus:outline-hidden focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="Semua">Semua Bulan</option>
              {availableMonths.map(m => {
                const parts = m.split('-');
                const names = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
                const label = `${names[parseInt(parts[1]) - 1]} ${parts[0]}`;
                return <option key={m} value={m}>{label}</option>;
              })}
            </select>
          </div>

          {/* 4. Sorting */}
          <div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-800 font-semibold focus:outline-hidden focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            >
              <option value="date-desc">Tanggal Baru &rarr; Lama</option>
              <option value="date-asc">Tanggal Lama &rarr; Baru</option>
              <option value="amount-desc">Jumlah Besar &rarr; Kecil</option>
              <option value="amount-asc">Jumlah Kecil &rarr; Besar</option>
            </select>
          </div>
        </div>
      </div>

      {/* DATA TABLE */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-xs font-bold text-slate-400 animate-pulse">
            Memuat data pengeluaran redaksi...
          </div>
        ) : filteredList.length === 0 ? (
          <div className="p-12 text-center text-xs text-slate-400 space-y-2">
            <Info className="w-8 h-8 text-slate-350 mx-auto" />
            <p className="font-bold">Tidak ada data pengeluaran ditemukan</p>
            <p className="text-[10px]">Coba ubah filter pencarian Anda atau tambahkan data pengeluaran baru.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="py-4 px-6 w-16 text-center">No</th>
                  <th className="py-4 px-4 w-32">Tanggal</th>
                  <th className="py-4 px-4 w-44">Kategori</th>
                  <th className="py-4 px-4">Keterangan</th>
                  <th className="py-4 px-4">Catatan</th>
                  <th className="py-4 px-4 w-40 text-right">Jumlah</th>
                  <th className="py-4 px-6 w-24 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700">
                {paginatedList.map((e, index) => {
                  const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-6 text-center font-mono text-slate-400">{globalIndex}</td>
                      <td className="py-3 px-4 font-mono">
                        {e.date ? (
                          (() => {
                            try {
                              const dObj = new Date(e.date);
                              const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
                              const months = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Ags", "Sep", "Okt", "Nov", "Des"];
                              return `${days[dObj.getDay()]}, ${dObj.getDate()} ${months[dObj.getMonth()]} ${dObj.getFullYear()}`;
                            } catch {
                              return e.date;
                            }
                          })()
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                          e.category === 'Gaji & Insentif' ? 'bg-sky-50 text-sky-600' :
                          e.category === 'Operasional Kantor' ? 'bg-indigo-50 text-indigo-600' :
                          e.category === 'Perjalanan Dinas' ? 'bg-amber-50 text-amber-600' :
                          e.category === 'Uang Makan' ? 'bg-orange-50 text-orange-600' :
                          e.category === 'Perlengkapan' ? 'bg-emerald-50 text-emerald-600' :
                          'bg-slate-50 text-slate-600'
                        }`}>
                          {e.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-800 font-bold">{e.description}</td>
                      <td className="py-3 px-4 text-[11px] text-slate-400 max-w-xs truncate" title={e.notes}>
                        {e.notes || '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-950">
                        {formatRupiah(e.amount)}
                      </td>
                      <td className="py-3 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEdit(e)}
                            className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(e.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

        {/* PAGINATION PANEL */}
        {totalPages > 1 && (
          <div className="bg-slate-50/50 px-6 py-4 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-slate-500">
            <span>Halaman {currentPage} dari {totalPages}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 cursor-pointer text-slate-600"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 cursor-pointer text-slate-600"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
