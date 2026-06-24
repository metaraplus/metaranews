import React, { useState, useEffect, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Printer, 
  Copy, 
  Check, 
  ArrowRight, 
  Filter, 
  RotateCw, 
  ChevronLeft, 
  ChevronRight, 
  Download,
  Calendar,
  Layers,
  TrendingUp,
  ExternalLink,
  BookOpen
} from 'lucide-react';
import { Quotation, Spj } from '../types';
import { db, collection, getDocs } from '../firebase';

// Helper to format date in Indonesian long style: "21 Juni 2026"
const formatIndonesianDate = (dateStr: string): string => {
  if (!dateStr) return '';
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

// Format currency as Rupiah
const formatRupiah = (num: number): string => {
  const formatted = new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
  return `Rp ${formatted}`;
};

export interface AgendaEntry {
  id: string;
  date: string;
  letterNumber: string;
  type: 'Surat Penawaran' | 'SPJ/Invoice';
  recipient: string;
  recipientSub?: string;
  subject: string;
  amount: number;
  signer: string;
  raw: Quotation | Spj;
}

interface LetterAgendaBookProps {
  onNavigateToTab: (tab: 'surat' | 'spj') => void;
}

export default function LetterAgendaBook({ onNavigateToTab }: LetterAgendaBookProps) {
  const [entries, setEntries] = useState<AgendaEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'Semua' | 'Surat Penawaran' | 'SPJ/Invoice'>('Semua');
  const [selectedYearMonth, setSelectedYearMonth] = useState('Semua');
  const [sortBy, setSortBy] = useState<'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc' | 'number-asc' | 'number-desc'>('date-desc');
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Selected Entry for Detail Modal
  const [selectedEntry, setSelectedEntry] = useState<AgendaEntry | null>(null);

  const fetchAndCombineLetters = async () => {
    try {
      setIsLoading(true);

      // 1. Get from localStorage first for instant UI response
      const cachedQuotesStr = localStorage.getItem('metara_quotations');
      const cachedSpjsStr = localStorage.getItem('metara_spjs');

      let localQuotes: Quotation[] = [];
      let localSpjs: Spj[] = [];

      if (cachedQuotesStr) {
        try { localQuotes = JSON.parse(cachedQuotesStr); } catch (e) { console.error(e); }
      }
      if (cachedSpjsStr) {
        try { localSpjs = JSON.parse(cachedSpjsStr); } catch (e) { console.error(e); }
      }

      const combineData = (quotes: Quotation[], spjs: Spj[]): AgendaEntry[] => {
        const quoteEntries: AgendaEntry[] = quotes.map(q => {
          const subtotal = q.items?.reduce((sum, item) => sum + (item.quantity * item.price), 0) || 0;
          const tax = q.showVat ? Math.round((subtotal * (q.vatPercent || 11)) / 100) : 0;
          const total = subtotal + tax;

          return {
            id: q.id,
            date: q.date,
            letterNumber: q.letterNumber || 'TIDAK ADA NOMOR',
            type: 'Surat Penawaran',
            recipient: q.recipientCompany || 'Satu Instansi',
            recipientSub: q.recipientName ? `Up: ${q.recipientName}` : '',
            subject: q.subject || 'Penawaran Kerjasama Publikasi',
            amount: total,
            signer: q.signerName || 'Lutfi Mahmud, S.Sos.',
            raw: q
          };
        });

        const spjEntries: AgendaEntry[] = spjs.map(s => {
          const total = s.items?.reduce((sum, item) => sum + (item.quantity * item.price), 0) || 0;
          const desc = s.items && s.items.length > 0 
            ? s.items[0].description.split('\n').join(' / ') 
            : 'Publikasi Layanan Berita';

          return {
            id: s.id,
            date: s.date,
            letterNumber: s.invoiceNumber || 'TIDAK ADA NOMOR',
            type: 'SPJ/Invoice',
            recipient: s.recipientName || 'Draft SPJ',
            recipientSub: s.recipientAddress ? s.recipientAddress.substring(0, 45) + (s.recipientAddress.length > 45 ? '...' : '') : '',
            subject: desc,
            amount: total,
            signer: s.signerName || 'MOH. MUHSON AGIL SAPUTRA',
            raw: s
          };
        });

        return [...quoteEntries, ...spjEntries].sort((a, b) => b.date.localeCompare(a.date));
      };

      setEntries(combineData(localQuotes, localSpjs));

      // 2. Fetch from Firestore to sync newest data
      try {
        const [qSnap, sSnap] = await Promise.all([
          getDocs(collection(db, 'quotations')),
          getDocs(collection(db, 'spjs'))
        ]);

        const remoteQuotes = qSnap.docs.map(doc => doc.data() as Quotation);
        const remoteSpjs = sSnap.docs.map(doc => doc.data() as Spj);

        // If Firestore yields data, merge with local or use remote as truth if newer
        const quotesMerged = remoteQuotes.length > 0 ? remoteQuotes : localQuotes;
        const spjsMerged = remoteSpjs.length > 0 ? remoteSpjs : localSpjs;

        setEntries(combineData(quotesMerged, spjsMerged));
      } catch (err) {
        console.warn("Gagal sinkronisasi data cloud untuk buku agenda, menggunakan data lokal:", err);
      }
    } catch (error) {
      console.error("Gagal memproses data buku agenda:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAndCombineLetters();
  }, []);

  // Filter year-months options dynamically from entries
  const yearMonthOptions = useMemo(() => {
    const months = entries.map(e => e.date.substring(0, 7)).filter(Boolean);
    const unique = Array.from(new Set(months)) as string[];
    return unique.sort((a, b) => b.localeCompare(a));
  }, [entries]);

  // Copy letter number to clipboard helper
  const handleCopy = (num: string, id: string) => {
    navigator.clipboard.writeText(num);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Open letter inside original creator tab
  const handleOpenInEditor = (entry: AgendaEntry) => {
    if (entry.type === 'Surat Penawaran') {
      localStorage.setItem('metara_active_quotation_id', entry.id);
      onNavigateToTab('surat');
    } else {
      localStorage.setItem('metara_active_spj_id', entry.id);
      onNavigateToTab('spj');
    }
  };

  // Filters logic
  const filteredEntries = useMemo(() => {
    return entries.filter(e => {
      // 1. Search Query
      const matchSearch = 
        e.letterNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (e.recipientSub && e.recipientSub.toLowerCase().includes(searchQuery.toLowerCase())) ||
        e.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.signer.toLowerCase().includes(searchQuery.toLowerCase());

      // 2. Type Filter
      const matchType = selectedType === 'Semua' || e.type === selectedType;

      // 3. Date YearMonth Filter
      const matchDate = selectedYearMonth === 'Semua' || e.date.startsWith(selectedYearMonth);

      return matchSearch && matchType && matchDate;
    });
  }, [entries, searchQuery, selectedType, selectedYearMonth]);

  // Sorting logic
  const sortedEntries = useMemo(() => {
    const list = [...filteredEntries];
    switch (sortBy) {
      case 'date-desc':
        return list.sort((a, b) => b.date.localeCompare(a.date));
      case 'date-asc':
        return list.sort((a, b) => a.date.localeCompare(b.date));
      case 'amount-desc':
        return list.sort((a, b) => b.amount - a.amount);
      case 'amount-asc':
        return list.sort((a, b) => a.amount - b.amount);
      case 'number-asc':
        return list.sort((a, b) => a.letterNumber.localeCompare(b.letterNumber));
      case 'number-desc':
        return list.sort((a, b) => b.letterNumber.localeCompare(a.letterNumber));
      default:
        return list;
    }
  }, [filteredEntries, sortBy]);

  // Statistics
  const stats = useMemo(() => {
    const total = entries.length;
    const countQuotes = entries.filter(e => e.type === 'Surat Penawaran').length;
    const countSpjs = entries.filter(e => e.type === 'SPJ/Invoice').length;
    const totalAmount = entries.reduce((sum, e) => sum + e.amount, 0);

    return {
      total,
      countQuotes,
      countSpjs,
      totalAmount
    };
  }, [entries]);

  // Pagination calculation
  const paginatedEntries = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedEntries.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedEntries, currentPage]);

  const totalPages = Math.ceil(sortedEntries.length / itemsPerPage) || 1;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedType, selectedYearMonth, sortBy]);

  // Export Agenda Book to CSV
  const handleExportCSV = () => {
    const csvRows = [
      ['No', 'Tanggal Diterbitkan', 'Tipe Surat', 'Nomor Surat', 'Penerima Surat / Instansi', 'Perihal / Rincian Singkat', 'Nominal Anggaran (IDR)', 'Pejabat Penandatangan']
    ];

    sortedEntries.forEach((e, index) => {
      csvRows.push([
        String(index + 1),
        e.date,
        e.type,
        `"${e.letterNumber.replace(/"/g, '""')}"`,
        `"${e.recipient.replace(/"/g, '""')} ${e.recipientSub ? e.recipientSub.replace(/"/g, '""') : ''}"`,
        `"${e.subject.replace(/"/g, '""')}"`,
        String(e.amount),
        `"${e.signer.replace(/"/g, '""')}"`
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + csvRows.map(row => row.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `agenda_buku_nomor_surat_metaranews_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6" id="letter-agenda-book-root">
      
      {/* 1. TOP STATS BENTO CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="agenda-kpi-panel">
        
        {/* KPI 1: Total Surat */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-row items-center justify-between hover:scale-[1.01] transition-transform">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Total Surat Resmi
            </span>
            <h2 className="text-2xl font-black text-slate-900 font-mono">
              {stats.total} <span className="text-xs text-slate-400 font-sans font-normal">Surat</span>
            </h2>
            <p className="text-[10px] text-slate-500">
              Terdaftar di Buku Agenda
            </p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600 shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 2: Total Surat Penawaran */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-row items-center justify-between hover:scale-[1.01] transition-transform">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Surat Penawaran
            </span>
            <h2 className="text-2xl font-black text-slate-900 font-mono">
              {stats.countQuotes} <span className="text-xs text-slate-400 font-sans font-normal">Berkas</span>
            </h2>
            <p className="text-[10px] text-slate-500">
              Proposal Penawaran Harga
            </p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        {/* KPI 3: Total SPJ/Invoice */}
        <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-row items-center justify-between hover:scale-[1.01] transition-transform">
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              SPJ &amp; Invoice Iklan
            </span>
            <h2 className="text-2xl font-black text-slate-900 font-mono">
              {stats.countSpjs} <span className="text-xs text-slate-400 font-sans font-normal">Invoice</span>
            </h2>
            <p className="text-[10px] text-slate-500">
              Penagihan Resmi Publikasi
            </p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-red-50 flex items-center justify-center text-red-600 shrink-0">
            <FileText className="w-5 h-5" />
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
              placeholder="Cari berdasarkan nomor surat, penerima, perihal, atau penandatangan..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:ring-1 focus:ring-sky-500 focus:border-sky-500 outline-none"
            />
          </div>

          {/* Right quick action */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={fetchAndCombineLetters}
              className="p-2 border border-slate-200 hover:border-slate-350 bg-white text-slate-700 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0"
              title="Refresh data dari database"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Refresh</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="p-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-xs"
              title="Ekspor seluruh rekor yang difilter ke file Excel/CSV"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor Agenda</span>
            </button>
          </div>

        </div>

        {/* Filters Selectors Row */}
        <div className="flex flex-wrap gap-3 items-center pt-3 border-t border-slate-100 text-xs">
          
          {/* 1. Tipe Surat */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl">
            <span className="text-slate-400 font-bold flex items-center gap-1">
              <Filter className="w-3.5 h-3.5" />
              Tipe:
            </span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as any)}
              className="font-extrabold bg-transparent border-0 p-0 text-slate-700 focus:ring-0 cursor-pointer text-xs"
            >
              <option value="Semua">Semua Tipe</option>
              <option value="Surat Penawaran">Surat Penawaran</option>
              <option value="SPJ/Invoice">SPJ / Invoice</option>
            </select>
          </div>

          {/* 2. Tahun / Bulan */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl">
            <span className="text-slate-400 font-bold flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Bulan:
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

          {/* 3. Urutan Sorting */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl">
            <span className="text-slate-400 font-bold flex items-center gap-1">
              Urutkan:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="font-extrabold bg-transparent border-0 p-0 text-slate-700 focus:ring-0 cursor-pointer text-xs"
            >
              <option value="date-desc">Tanggal Terkini</option>
              <option value="date-asc">Tanggal Terlama</option>
              <option value="amount-desc">Anggaran Terbesar</option>
              <option value="amount-asc">Anggaran Terkecil</option>
              <option value="number-asc">Nomor Surat (A-Z)</option>
              <option value="number-desc">Nomor Surat (Z-A)</option>
            </select>
          </div>

          {/* Reset Filters Trigger */}
          {(searchQuery || selectedType !== 'Semua' || selectedYearMonth !== 'Semua' || sortBy !== 'date-desc') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedType('Semua');
                setSelectedYearMonth('Semua');
                setSortBy('date-desc');
              }}
              className="text-red-500 hover:text-red-700 font-bold ml-1 transition-colors cursor-pointer"
            >
              Reset Filter
            </button>
          )}

          <div className="ml-auto text-slate-400 font-semibold">
            Ditemukan: <strong className="text-slate-700">{filteredEntries.length}</strong> entri
          </div>

        </div>

      </div>

      {/* 3. DATA TABLE CONTAINER */}
      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm text-left">
        
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-8 border-3 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-slate-400 font-semibold">Memuat rekaman buku agenda...</p>
          </div>
        ) : sortedEntries.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-800 text-sm">Buku Agenda Kosong</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Tidak ada dokumen surat penawaran atau SPJ yang sesuai dengan filter pencarian Anda saat ini.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <th className="py-3.5 px-4 w-12 text-center">No</th>
                  <th className="py-3.5 px-3 w-32">Tanggal</th>
                  <th className="py-3.5 px-3 w-36">Tipe Surat</th>
                  <th className="py-3.5 px-3 w-[25%]">Nomor Surat resmi</th>
                  <th className="py-3.5 px-4 w-[25%]">Penerima / Instansi</th>
                  <th className="py-3.5 px-3 text-right">Nominal Anggaran</th>
                  <th className="py-3.5 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {paginatedEntries.map((e, index) => {
                  const globalIndex = (currentPage - 1) * itemsPerPage + index + 1;
                  const isCopied = copiedId === e.id;
                  
                  return (
                    <tr key={e.id} className="hover:bg-slate-55/35 transition-colors group">
                      {/* 1. NO */}
                      <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-400">
                        {globalIndex}
                      </td>

                      {/* 2. TANGGAL */}
                      <td className="py-3.5 px-3 text-slate-700 whitespace-nowrap">
                        <div className="font-semibold">{formatIndonesianDate(e.date)}</div>
                        <div className="text-[10px] text-slate-400 font-mono font-bold">{e.date}</div>
                      </td>

                      {/* 3. TIPE SURAT BADGE */}
                      <td className="py-3.5 px-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold uppercase border shadow-2xs ${
                          e.type === 'Surat Penawaran'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-150'
                            : 'bg-red-50/70 text-red-700 border-red-150'
                        }`}>
                          {e.type}
                        </span>
                      </td>

                      {/* 4. NOMOR SURAT */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 max-w-full">
                          <span className="font-mono font-bold text-slate-900 select-all truncate text-xs" title={e.letterNumber}>
                            {e.letterNumber.length > 60 ? e.letterNumber.substring(0, 60) + '...' : e.letterNumber}
                          </span>
                          <button
                            onClick={() => handleCopy(e.letterNumber, e.id)}
                            className={`p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-all cursor-pointer shrink-0 ${
                              isCopied ? 'text-emerald-600 bg-emerald-50 hover:bg-emerald-50' : ''
                            }`}
                            title="Salin nomor surat ke clipboard"
                          >
                            {isCopied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </div>
                        <div className="text-[10px] text-slate-400 line-clamp-1 truncate" title={e.subject}>
                          Perihal: {e.subject}
                        </div>
                      </td>

                      {/* 5. PENERIMA */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-850 line-clamp-1" title={e.recipient}>
                          {e.recipient}
                        </div>
                        {e.recipientSub && (
                          <div className="text-[10px] text-slate-450 truncate" title={e.recipientSub}>
                            {e.recipientSub}
                          </div>
                        )}
                      </td>

                      {/* 6. NOMINAL */}
                      <td className="py-3.5 px-3 text-right font-mono font-black text-slate-900 whitespace-nowrap">
                        {formatRupiah(e.amount)}
                      </td>

                      {/* 7. ACTIONS */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setSelectedEntry(e)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded text-[10px] transition-colors cursor-pointer whitespace-nowrap"
                            title="Tampilkan detail rincian surat"
                          >
                            Rincian
                          </button>
                          <button
                            onClick={() => handleOpenInEditor(e)}
                            className="px-2 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 hover:text-sky-800 font-bold rounded text-[10px] flex items-center gap-0.5 transition-all cursor-pointer whitespace-nowrap"
                            title="Buka dokumen ini di editor pembuat untuk diedit/cetak"
                          >
                            <span>Edit</span>
                            <ArrowRight className="w-2.5 h-2.5" />
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
        {!isLoading && sortedEntries.length > 0 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs text-slate-500 font-medium">
              Menampilkan <strong className="text-slate-800">{(currentPage - 1) * itemsPerPage + 1}</strong> hingga{' '}
              <strong className="text-slate-800">
                {Math.min(currentPage * itemsPerPage, sortedEntries.length)}
              </strong>{' '}
              dari <strong className="text-slate-800">{sortedEntries.length}</strong> entri terdaftar
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

      {/* 4. DETAIL POPUP MODAL */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-lg w-full overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150 text-left font-sans">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h3 className="text-sm font-black text-slate-950 flex items-center gap-1.5">
                  <FileText className={`w-4 h-4 ${selectedEntry.type === 'Surat Penawaran' ? 'text-indigo-600' : 'text-red-600'}`} />
                  Rincian Dokumen Resmi
                </h3>
                <span className="text-[10px] text-slate-400 font-mono block mt-0.5">ID: {selectedEntry.id}</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border ${
                selectedEntry.type === 'Surat Penawaran' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-red-50 text-red-700 border-red-200'
              }`}>
                {selectedEntry.type}
              </span>
            </div>

            {/* Modal Body Info details */}
            <div className="p-6 space-y-4 max-h-[460px] overflow-y-auto text-xs">
              
              {/* Box 1: Number & Date */}
              <div className="grid grid-cols-2 gap-4 border-b border-slate-100 pb-3">
                <div>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">NOMOR REGISTRASI</span>
                  <span className="font-mono font-black text-slate-900 block select-all text-sm leading-tight">
                    {selectedEntry.letterNumber}
                  </span>
                </div>
                <div>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">TANGGAL TERBIT</span>
                  <span className="font-bold text-slate-800 block text-xs">
                    {formatIndonesianDate(selectedEntry.date)}
                  </span>
                </div>
              </div>

              {/* Box 2: Recipient Details */}
              <div className="space-y-1 bg-slate-50/50 p-3.5 rounded-xl border border-slate-100">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">KEPADA / TUJUAN SURAT:</span>
                <p className="font-black text-slate-900 text-xs uppercase font-sans tracking-tight leading-tight pt-1">
                  {selectedEntry.recipient}
                </p>
                {selectedEntry.recipientSub && (
                  <p className="text-slate-550 font-medium leading-relaxed font-sans pt-0.5">
                    {selectedEntry.recipientSub}
                  </p>
                )}
                {selectedEntry.type === 'SPJ/Invoice' && (selectedEntry.raw as Spj).recipientAddress && (
                  <p className="text-slate-500 font-medium leading-normal pt-1 border-t border-slate-150 mt-1">
                    {(selectedEntry.raw as Spj).recipientAddress}
                  </p>
                )}
              </div>

              {/* Box 3: Subject detail */}
              <div className="space-y-1">
                <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block">
                  {selectedEntry.type === 'Surat Penawaran' ? 'HAL / SUBJEK SURAT' : 'LAYANAN UTAMA INVOICE'}
                </span>
                <p className="font-bold text-slate-800 text-xs bg-slate-50/20 p-2.5 rounded-lg border border-slate-100 leading-relaxed font-sans italic text-slate-650">
                  "{selectedEntry.subject}"
                </p>
              </div>

              {/* Box 4: Financial breakdown */}
              <div className="border border-slate-150 rounded-xl overflow-hidden shadow-2xs">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-150 text-[9px] font-extrabold uppercase tracking-wider text-slate-500 flex justify-between">
                  <span>Rincian Item Anggaran</span>
                  <span>Anggaran Rupiah</span>
                </div>
                <div className="divide-y divide-slate-100 max-h-[140px] overflow-y-auto bg-white">
                  {selectedEntry.type === 'Surat Penawaran' ? (
                    (selectedEntry.raw as Quotation).items?.map((item, idx) => (
                      <div key={item.id} className="p-2.5 flex justify-between items-start hover:bg-slate-50/30 transition-all">
                        <div className="max-w-[65%] leading-tight">
                          <span className="font-extrabold text-slate-800 block text-[11px]">{item.name}</span>
                          <span className="text-[9.5px] text-slate-400 block mt-0.5">{item.quantity} {item.unit} &times; {formatRupiah(item.price)}</span>
                        </div>
                        <span className="font-bold text-slate-800 font-mono">{formatRupiah(item.quantity * item.price)}</span>
                      </div>
                    ))
                  ) : (
                    (selectedEntry.raw as Spj).items?.map((item, idx) => (
                      <div key={item.id} className="p-2.5 flex justify-between items-start hover:bg-slate-50/30 transition-all">
                        <div className="max-w-[65%] leading-tight">
                          <span className="font-extrabold text-slate-800 block text-[11px] whitespace-pre-line">{item.description.split('\n').join(', ')}</span>
                          <span className="text-[9.5px] text-slate-400 block mt-0.5">{item.quantity} &times; {item.period}</span>
                        </div>
                        <span className="font-bold text-slate-850 font-mono">{formatRupiah(item.quantity * item.price)}</span>
                      </div>
                    ))
                  )}
                </div>
                {/* Total box inside breakdown */}
                <div className="bg-slate-55/40 px-3 py-2.5 border-t border-slate-150 flex justify-between items-center text-xs font-semibold">
                  <span className="text-slate-500 font-bold uppercase tracking-wider text-[9.5px]">Total Anggaran (Grand Total)</span>
                  <span className="text-emerald-700 font-black font-mono text-sm leading-none">{formatRupiah(selectedEntry.amount)}</span>
                </div>
              </div>

              {/* Box 5: Signer / Authenticator */}
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                <div>
                  <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">PEJABAT PENANDATANGAN</span>
                  <span className="font-black text-slate-800 block text-[11px]">
                    {selectedEntry.signer}
                  </span>
                </div>
                {selectedEntry.type === 'SPJ/Invoice' && (
                  <div>
                    <span className="text-[9px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">METODE PEMBAYARAN</span>
                    <span className="text-slate-600 block text-[10.5px] leading-tight truncate font-medium">
                      {(selectedEntry.raw as Spj).bankName}
                    </span>
                  </div>
                )}
              </div>

            </div>

            {/* Modal Actions Footer */}
            <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-2 text-xs font-bold">
              <button
                onClick={() => setSelectedEntry(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl cursor-pointer"
              >
                Tutup Detail
              </button>
              <button
                onClick={() => {
                  setSelectedEntry(null);
                  handleOpenInEditor(selectedEntry);
                }}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <span>Buka di Tab Editor</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
