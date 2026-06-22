import React, { useState, useEffect } from 'react';
import { 
  Search, 
  RefreshCw, 
  FileText, 
  ExternalLink, 
  SlidersHorizontal,
  ChevronRight,
  BookOpen,
  Calendar,
  Building,
  Tag
} from 'lucide-react';
import { db, collection, getDocs } from '../firebase';
import { Spj, Quotation } from '../types';

interface AgendaRow {
  id: string;
  type: 'Invoice' | 'Penawaran';
  fullNo: string;
  seq: string;
  format: string;
  company: string;
  keteranganText: string;
  keteranganNode: React.ReactNode;
  date: string;
}

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

export default function LetterAgendaBook() {
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [rawSpjs, setRawSpjs] = useState<Spj[]>([]);
  const [rawQuotations, setRawQuotations] = useState<Quotation[]>([]);
  const [agendaRows, setAgendaRows] = useState<AgendaRow[]>([]);
  
  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Invoice' | 'Penawaran'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch from Firestore
  const fetchData = async (silent = false) => {
    if (!silent) setLoading(true);
    setErrorMsg('');
    try {
      const [spjSnap, quoteSnap] = await Promise.all([
        getDocs(collection(db, 'spjs')),
        getDocs(collection(db, 'quotations'))
      ]);

      const spjsData = spjSnap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Spj));

      const quotationsData = quoteSnap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Quotation));

      setRawSpjs(spjsData);
      setRawQuotations(quotationsData);
    } catch (err: any) {
      console.error('Error loading letters agenda:', err);
      setErrorMsg('Gagal memuat data dari database cloud. Silakan coba lagi.');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sync / compile agenda rows whenever raw data updates
  useEffect(() => {
    const combined: AgendaRow[] = [];

    // 1. Process SPJs (Invoices)
    rawSpjs.forEach((spj) => {
      const fullNo = spj.invoiceNumber || '';
      
      // Parse sequence number and format suffix
      // E.g. 210/SPJ/METARA/IV/2026 -> seq: "210", format: "/SPJ/METARA/IV/2026"
      const parts = fullNo.split('/');
      const seq = parts[0] || '';
      const format = parts.slice(1).join('/');

      // Detail keterangan mapping
      const items = spj.items || [];
      const firstDesc = items[0]?.description || '';
      const extraCount = items.length - 1;
      
      const ketText = `Invoice - ${firstDesc}${extraCount > 0 ? ` (+${extraCount} item lainnya)` : ''}`;
      const ketNode = (
        <span className="text-slate-650 text-[11.5px] leading-relaxed">
          <strong className="text-slate-900 font-extrabold font-sans">Invoice</strong> — {firstDesc}
          {extraCount > 0 && (
            <span className="text-slate-400 font-medium"> (+{extraCount} item lainnya)</span>
          )}
        </span>
      );

      combined.push({
        id: spj.id,
        type: 'Invoice',
        fullNo,
        seq,
        format: format ? `/${format}` : '',
        company: spj.recipientName || 'Tanpa Nama Penerima',
        keteranganText: ketText,
        keteranganNode: ketNode,
        date: spj.date || ''
      });
    });

    // 2. Process Quotations (Penawaran)
    rawQuotations.forEach((quote) => {
      const fullNo = quote.letterNumber || '';
      
      // Parse sequence number and format suffix
      // E.g. 085/P-PDMN/M-NEWS/VI/2026 -> seq: "085", format: "/P-PDMN/M-NEWS/VI/2026"
      const parts = fullNo.split('/');
      const seq = parts[0] || '';
      const format = parts.slice(1).join('/');

      // Detail keterangan mapping
      const items = quote.items || [];
      const itemsString = items.map(it => it.name).join(', ');
      const descVal = itemsString || quote.subject || 'Layanan kerjasama publikasi';
      
      const ketText = `Penawaran - ${descVal}`;
      const ketNode = (
        <span className="text-slate-650 text-[11.5px] leading-relaxed">
          <strong className="text-slate-900 font-extrabold font-sans">Penawaran</strong> — {descVal}
        </span>
      );

      combined.push({
        id: quote.id,
        type: 'Penawaran',
        fullNo,
        seq,
        format: format ? `/${format}` : '',
        // Company name is best, fallback to recipient company or name
        company: quote.recipientCompany || quote.recipientName || 'Tanpa Nama Mitra',
        keteranganText: ketText,
        keteranganNode: ketNode,
        date: quote.date || ''
      });
    });

    // Sort descending by sequence number (converted to integer if possible)
    combined.sort((a, b) => {
      const numA = parseInt(a.seq, 10);
      const numB = parseInt(b.seq, 10);
      
      if (!isNaN(numA) && !isNaN(numB)) {
        return numB - numA;
      }
      return b.seq.localeCompare(a.seq);
    });

    setAgendaRows(combined);
  }, [rawSpjs, rawQuotations]);

  // Handle manual pull/refresh
  const handleManualRefresh = () => {
    setIsRefreshing(true);
    fetchData(true);
  };

  // Filter based on search and type select
  const filteredRows = agendaRows.filter((row) => {
    // Type Filter
    if (typeFilter !== 'all' && row.type !== typeFilter) return false;

    // Search Filter
    const searchLower = searchQuery.toLowerCase();
    return (
      row.seq.toLowerCase().includes(searchLower) ||
      row.format.toLowerCase().includes(searchLower) ||
      row.fullNo.toLowerCase().includes(searchLower) ||
      row.company.toLowerCase().includes(searchLower) ||
      row.keteranganText.toLowerCase().includes(searchLower) ||
      row.date.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6" id="digital-agenda-book-container">
      
      {/* 1. COMPACT TOP HEADER AND STATS BANNER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="space-y-1 text-left">
          <h2 className="text-[22px] font-black tracking-tight text-slate-900 font-sans flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-[#C61C23]" />
            Buku Agenda Nomor Surat
          </h2>
          <p className="text-xs text-slate-500 font-medium">
            Daftar riwayat nomor surat yang telah dikeluarkan beserta nama perusahaan dan keterangannya.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing || loading}
            className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 py-2 px-3.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
            title="Refresh database"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>Sinkron data</span>
          </button>
        </div>
      </div>

      {/* 2. STATS OVERVIEW BENTO BOXES */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4" id="agenda-stats-overview">
        <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-2xs text-left hover:scale-[1.01] transition-transform">
          <div className="flex items-center gap-2 text-slate-400">
            <Tag className="w-4 h-4 text-[#C61C23]" />
            <span className="text-[10px] font-extrabold uppercase tracking-wide">Total Surat Keluar</span>
          </div>
          <h3 className="text-2xl font-black text-slate-900 font-mono mt-1">
            {agendaRows.length} <span className="text-xs font-normal text-slate-400 font-sans">Dokumen</span>
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">Gabungan SPJ (Invoice) & Surat Penawaran</p>
        </div>
        
        <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-2xs text-left hover:scale-[1.01] transition-transform">
          <div className="flex items-center gap-2 text-slate-400">
            <FileText className="w-4 h-4 text-emerald-500" />
            <span className="text-[10px] font-extrabold uppercase tracking-wide">Total SPJ / Invoice</span>
          </div>
          <h3 className="text-2xl font-black text-slate-900 font-mono mt-1">
            {rawSpjs.length} <span className="text-xs font-normal text-slate-400 font-sans">Lembar</span>
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">Telah disahkan stempel digital basah</p>
        </div>

        <div className="bg-white border border-slate-100 p-4.5 rounded-2xl shadow-2xs text-left hover:scale-[1.01] transition-transform">
          <div className="flex items-center gap-2 text-slate-400">
            <FileText className="w-4 h-4 text-indigo-500" />
            <span className="text-[10px] font-extrabold uppercase tracking-wide">Surat Penawaran</span>
          </div>
          <h3 className="text-2xl font-black text-slate-900 font-mono mt-1">
            {rawQuotations.length} <span className="text-xs font-normal text-slate-400 font-sans">Berkas</span>
          </h3>
          <p className="text-[10px] text-slate-500 mt-1">Kerjasama diseminasi informasi daerah</p>
        </div>
      </div>

      {/* 3. INPUT FILTER CONTROLS */}
      <div className="bg-white p-4 rounded-xl border border-slate-150/60 shadow-xs flex flex-col sm:flex-row items-center gap-3" id="agenda-filter-row">
        {/* Search input */}
        <div className="relative w-full sm:flex-1">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari format surat, no. urut, perusahaan, nama dinas, keterangan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50/50 border border-slate-200 rounded-xl pl-9 pr-4 py-2.5 text-xs focus:ring-1 focus:ring-[#C61C23] focus:border-[#C61C23] outline-hidden font-medium text-slate-800"
          />
        </div>

        {/* Category Pill Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0">
          <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 hidden lg:block mr-1" />
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              typeFilter === 'all'
                ? 'bg-[#C61C23] text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
          >
            Semua ({agendaRows.length})
          </button>
          <button
            onClick={() => setTypeFilter('Invoice')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              typeFilter === 'Invoice'
                ? 'bg-[#C61C23] text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
          >
            Invoice / SPJ ({rawSpjs.length})
          </button>
          <button
            onClick={() => setTypeFilter('Penawaran')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              typeFilter === 'Penawaran'
                ? 'bg-[#C61C23] text-white shadow-xs'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
          >
            Penawaran / Surat ({rawQuotations.length})
          </button>
        </div>
      </div>

      {/* 4. MAIN AGENDA CONTENT TABLE CARD */}
      <div className="bg-white rounded-[28px] overflow-hidden border border-slate-200/50 shadow-sm">
        {loading ? (
          <div className="py-20 flex flex-col justify-center items-center gap-3">
            <RefreshCw className="w-8 h-8 text-[#C61C23] animate-spin" />
            <p className="text-xs text-slate-500 font-bold">Mengkompilasi registrasi nomor surat...</p>
          </div>
        ) : errorMsg ? (
          <div className="py-20 text-center space-y-2">
            <p className="text-xs text-red-600 font-bold">{errorMsg}</p>
            <button 
              onClick={() => fetchData()} 
              className="bg-slate-100 hover:bg-slate-205 text-[11px] font-bold py-1.5 px-3 rounded-lg text-slate-705"
            >
              Coba Lagi
            </button>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="py-20 text-center space-y-2">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500 font-bold">Tidak menemukan agenda nomor surat yang cocok.</p>
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="text-xs text-[#C61C23] font-bold hover:underline"
              >
                Reset pencarian
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-slate-800 font-sans">
              <thead>
                <tr className="bg-[#FAF9F9] border-b border-slate-200/60 text-slate-505 font-black text-xs uppercase tracking-wider">
                  <th className="py-4.5 px-5 w-[14%] text-center font-black tracking-wide">NO. URUT</th>
                  <th className="py-4.5 px-5 w-[26%] text-left font-black tracking-wide border-l border-slate-200">FORMAT SURAT</th>
                  <th className="py-4.5 px-6 w-[28%] text-left font-black tracking-wide">NAMA PERUSAHAAN</th>
                  <th className="py-4.5 px-6 w-[32%] text-left font-black tracking-wide">KETERANGAN</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRows.map((row) => (
                  <tr 
                    key={row.id} 
                    className="hover:bg-slate-50/40 transition-colors align-top"
                  >
                    {/* Column 1: NO. URUT with clean block centering */}
                    <td className="py-5 px-5 text-center font-black text-slate-900 text-[14px]">
                      {row.seq}
                    </td>

                    {/* Column 2: FORMAT SURAT with stylish link color and right vertical divider */}
                    <td className="py-5 px-5 text-left border-l border-slate-200">
                      <span className="text-[#2563eb] font-bold text-[11.5px] font-mono select-all hover:underline cursor-text">
                        {row.format}
                      </span>
                      <div className="text-[9px] text-slate-400 font-sans mt-1 flex items-center gap-1 font-medium">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        Tanggal: {row.date ? formatIndonesianDate(row.date) : 'Belum diatur'}
                      </div>
                    </td>

                    {/* Column 3: NAMA PERUSAHAAN */}
                    <td className="py-5 px-6 text-left">
                      <div className="font-extrabold text-[#1e293b] text-[11.5px] leading-relaxed">
                        {row.company}
                      </div>
                      <div className="text-[9.5px] font-bold text-slate-400 mt-1 flex items-center gap-1">
                        <Building className="w-3 h-3 text-slate-400" />
                        Pihak Penerima Dokumen
                      </div>
                    </td>

                    {/* Column 4: KETERANGAN */}
                    <td className="py-5 px-6 text-left">
                      {row.keteranganNode}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. USER HELPFUL INSTRUCTION BOX */}
      <div className="bg-sky-50 border border-sky-100 rounded-xl p-4.5 text-left flex gap-3 shadow-xs">
        <FileText className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs font-bold text-sky-900">
            Bagaimana Buku Agenda ini bekerja?
          </p>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            Halaman index ini secara otomatis mengumpulkan, memisahkan rincian dinas, menyusun, dan mengurutkan seluruh nomor surat yang aktif dalam sistem dari dokumen <strong className="text-slate-900 font-semibold">Surat Penawaran (Penawaran)</strong> dan <strong className="text-slate-900 font-semibold">SPJ (Invoice)</strong> secara seketika (realtime). Untuk memperbarui atau mendaftarkan nomor baru, silakan gunakan menu pembuat dokumen bersangkutan.
          </p>
        </div>
      </div>

    </div>
  );
}
