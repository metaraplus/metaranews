import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Trash2, 
  FileText, 
  Search, 
  Printer, 
  Save, 
  AlertCircle, 
  Check, 
  RefreshCw,
  CreditCard,
  User,
  MapPin,
  Calendar,
  Layers,
  Facebook,
  Instagram,
  Youtube
} from 'lucide-react';
import { Spj, SpjItem } from '../types';
import { db, collection, getDocs, setDoc, doc, deleteDoc, onSnapshot } from '../firebase';

// Helper to format date in Indonesian long style: "7 April 2026"
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

// Helper to format rupiah currency
const formatRupiah = (num: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'decimal',
    minimumFractionDigits: 0
  }).format(num);
};

// Default preset values closely matching the user-attached image
const dummySpjPreset: Spj = {
  id: 'spj-preset-1',
  invoiceNumber: '210/SPJ/METARA/IV/2026',
  date: '2026-04-07',
  recipientName: 'KEPALA SATPOL PP KABUPATEN KEDIRI',
  recipientAddress: 'Jl. Soekarno-Hatta No. 1, Doko, Ngasem, Kabupaten Kediri, Jawa Timur',
  items: [
    {
      id: 'spj-item-1',
      description: 'Advertorial\nBanner Web\nuk. 300x85',
      quantity: 1,
      period: 'April 2026',
      price: 1500000
    }
  ],
  bankName: 'BANK MANDIRI KC KEDIRI',
  bankAccount: '171-00-1236940-4',
  bankOwner: 'PT. Portal Digital Media Nusantara',
  signerName: 'MOH. MUHSON AGIL SAPUTRA',
  signerTitle: 'DIREKTUR'
};

export default function SpjCreator() {
  const [spjs, setSpjs] = useState<Spj[]>([]);
  const [selectedSpj, setSelectedSpj] = useState<Spj | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Ref to hold the auto-save debounce timer
  const saveTimeoutRef = useRef<any>(null);

  // Custom interactive features
  const [showSignatureStamp, setShowSignatureStamp] = useState(true);

  // Safe fetch from Firestore with initial local render and real-time subscription
  useEffect(() => {
    // 1. Instantly load from localStorage for speed
    const stored = localStorage.getItem('metara_spjs');
    let localList: Spj[] = [];
    if (stored) {
      try {
        localList = JSON.parse(stored) as Spj[];
      } catch (e) {
        console.error("Failed parsing stored SPJs:", e);
      }
    }

    // If local list is empty, start with dummy preset
    if (localList.length === 0) {
      localList = [{ ...dummySpjPreset, createdAt: new Date().toISOString() }];
    }

    // Pre-populate state immediately from cache
    setSpjs(localList);
    setSelectedSpj(prevSelected => {
      if (prevSelected) return prevSelected;
      return localList[0] || null;
    });

    // 2. Setup real-time listener for "spjs" collection
    const unsubscribe = onSnapshot(collection(db, 'spjs'), (snap) => {
      const remoteList = snap.docs.map(docSnap => docSnap.data() as Spj);
      
      if (remoteList.length > 0) {
        // Master truth comes directly from Cloud DB
        remoteList.sort((a, b) => (b.createdAt || b.id).localeCompare(a.createdAt || a.id));
        setSpjs(remoteList);
        localStorage.setItem('metara_spjs', JSON.stringify(remoteList));
        
        setSelectedSpj(current => {
          if (!current) return remoteList[0];
          const matched = remoteList.find(item => item.id === current.id);
          return matched || remoteList[0];
        });
      } else {
        // If Firestore is completely empty, register the initial default dummy preset
        const defaultSample = { ...dummySpjPreset, createdAt: new Date().toISOString() };
        setDoc(doc(db, 'spjs', defaultSample.id), defaultSample).catch(err => {
          console.error("Gagal meluncurkan preset sampel ke Firestore:", err);
        });
      }
    }, (err) => {
      console.warn("Real-time listener on spjs failed, using offline cache:", err);
    });

    return () => unsubscribe();
  }, []);

  // Save to local storage whenever list modifications happen
  const persistList = (updated: Spj[]) => {
    localStorage.setItem('metara_spjs', JSON.stringify(updated));
    setSpjs(updated);
  };

  // Create a brand new empty SPJ (Invoice)
  const handleCreateNew = async () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newId = `spj-${Date.now()}`;
    const newSpj: Spj = {
      id: newId,
      invoiceNumber: `${Math.floor(Math.random() * 300 + 100)}/SPJ/METARA/${todayStr.substring(5, 7)}/${todayStr.substring(0, 4)}`,
      date: todayStr,
      recipientName: 'NAMA INSTANSI PENERIMA',
      recipientAddress: 'Alamat lengkap instansi penerima...',
      items: [
        {
          id: `spj-item-${Date.now()}`,
          description: 'Publikasi Banner Web Interaktif',
          quantity: 1,
          period: todayStr.substring(0, 7),
          price: 1500000
        }
      ],
      bankName: 'BANK MANDIRI KC KEDIRI',
      bankAccount: '171-00-1236940-4',
      bankOwner: 'PT. Portal Digital Media Nusantara',
      signerName: 'MOH. MUHSON AGIL SAPUTRA',
      signerTitle: 'DIREKTUR',
      createdAt: new Date().toISOString()
    };

    const updated = [newSpj, ...spjs];
    persistList(updated);
    setSelectedSpj(newSpj);

    // Save immediately to Firestore
    try {
      await setDoc(doc(db, 'spjs', newId), newSpj);
    } catch (err) {
      console.error("Gagal menyimpan SPJ baru ke Firestore secara otomatis:", err);
    }
  };

  // Delete SPJ
  const handleDeleteSpj = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus dokumen SPJ ini secara permanen?')) return;
    
    try {
      const updated = spjs.filter(s => s.id !== id);
      persistList(updated);
      
      if (selectedSpj && selectedSpj.id === id) {
        setSelectedSpj(updated[0] || null);
      }
      
      // Sync cloud
      await deleteDoc(doc(db, 'spjs', id));
    } catch (err) {
      console.error("Gagal menghapus SPJ dari firestore:", err);
    }
  };

  // Save changes to local and sync to cloud
  const handleSaveSpj = async () => {
    if (!selectedSpj) return;
    setIsSaving(true);
    setErrorMsg('');
    setSaveSuccess(false);

    try {
      const nowStr = new Date().toISOString();
      const updatedSpj = {
        ...selectedSpj,
        updatedAt: nowStr,
        createdAt: selectedSpj.createdAt || nowStr
      };

      const updatedList = spjs.map(s => s.id === updatedSpj.id ? updatedSpj : s);
      persistList(updatedList);
      setSelectedSpj(updatedSpj);

      setSaveSuccess(true);
      setIsSaving(false);
      setTimeout(() => setSaveSuccess(false), 3000);

      // Cloud Sync - await so that it's guaranteed to be in Firestore
      await setDoc(doc(db, 'spjs', updatedSpj.id), updatedSpj);
    } catch (err: any) {
      console.error("Error saving SPJ:", err);
      setErrorMsg('Gagal menyimpan perubahan.');
      setIsSaving(false);
    }
  };

  // Reset to original preset sample
  const handleLoadSamplePreset = () => {
    if (!selectedSpj) return;
    if (window.confirm('Muat ulang isi dokumen SPJ ini dengan preset contoh instan? Rincian saat ini akan diganti.')) {
      const resetSpj: Spj = {
        ...dummySpjPreset,
        id: selectedSpj.id
      };
      setSelectedSpj(resetSpj);
      const updated = spjs.map(s => s.id === selectedSpj.id ? resetSpj : s);
      persistList(updated);
    }
  };

  // Handle updates to selectedSpj fields
  const updateField = (key: keyof Spj, val: any) => {
    if (!selectedSpj) return;
    const nowStr = new Date().toISOString();
    const updated = { 
      ...selectedSpj, 
      [key]: val,
      updatedAt: nowStr
    };
    setSelectedSpj(updated);
    
    // Instantly update local list and localStorage so local operations/searches are lightning fast
    const updatedList = spjs.map(s => s.id === selectedSpj.id ? updated : s);
    persistList(updatedList);

    // Cancel previous background save timer
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new save timer (auto-save to Firestore in background after 500ms of user typing idle)
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await setDoc(doc(db, 'spjs', updated.id), updated);
      } catch (err) {
        console.warn("Gagal menyimpan perubahan ke Firestore otomatis:", err);
      }
    }, 500);
  };

  // Table items editor helpers
  const addSpjItem = () => {
    if (!selectedSpj) return;
    const newItem: SpjItem = {
      id: `spj-item-${Date.now()}`,
      description: 'Layanan Baru',
      quantity: 1,
      period: 'Bulan / Tahun',
      price: 1000000
    };
    updateField('items', [...selectedSpj.items, newItem]);
  };

  const updateSpjItem = (itemId: string, field: keyof SpjItem, val: any) => {
    if (!selectedSpj) return;
    const updatedItems = selectedSpj.items.map(item => {
      if (item.id === itemId) {
        if (field === 'price' || field === 'quantity') {
          return { ...item, [field]: Number(val) };
        }
        return { ...item, [field]: val };
      }
      return item;
    });
    updateField('items', updatedItems);
  };

  const removeSpjItem = (itemId: string) => {
    if (!selectedSpj) return;
    updateField('items', selectedSpj.items.filter(item => item.id !== itemId));
  };

  // Calculate calculations
  const getGrandTotal = () => {
    if (!selectedSpj) return 0;
    return selectedSpj.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  };

  // Print trigger
  const handlePrint = () => {
    if (!selectedSpj) return;
    window.print();
  };

  const renderKopSurat = () => (
    <div className="flex justify-between items-start border-b-2 border-[#C61C23] pb-4 relative z-10 w-full text-left">
      {/* Top Left: METARA LOGO */}
      <div className="flex items-start gap-4">
        <div className="flex flex-col items-start shrink-0">
          <span className="text-[5.5px] font-black text-slate-400 uppercase tracking-wider block mb-0.5">
            a part of Media Nusantara Network
          </span>
          <div className="flex items-center gap-2.5">
            {/* emblem */}
            <div className="w-[52px] h-[52px] rounded-full bg-white border border-slate-100 flex items-center justify-center relative overflow-hidden shadow-sm shrink-0">
              <img 
                src="https://lh3.googleusercontent.com/d/1kwvd_i_n0IWw59fxQEnVD36mqEp7n1iA" 
                alt="Metaranews Logo" 
                className="w-full h-full object-contain p-1"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.style.display = 'none';
                  const fb = e.currentTarget.parentElement?.querySelector('.fallback-svg');
                  if (fb) fb.classList.remove('hidden');
                }}
              />
              <div className="fallback-svg hidden w-full h-full flex items-center justify-center bg-[#C61C23] text-white">
                <svg viewBox="0 0 100 100" className="w-[82%] h-[82%] fill-none stroke-white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15,80 L15,35 C15,25 30,15 50,45 C70,15 85,25 85,35 L85,80" />
                  <path d="M50,45 L50,80" />
                </svg>
              </div>
            </div>
            
            <div className="leading-none flex flex-col justify-center">
              <span className="font-black text-[#C61C23] text-[22px] tracking-tight uppercase font-sans">Metara</span>
              <span className="text-slate-500 font-extrabold text-[8px] uppercase tracking-widest block mt-0.5">Setara Bercerita</span>
            </div>
          </div>
        </div>
      </div>

      {/* Top Right: PT PORTAL DIGITAL MEDIA NUSANTARA */}
      <div className="text-right flex-1 pl-4 mt-1.5 pr-2">
        <h2 className="text-[#C61C23] font-black text-[16px] leading-[1.1] uppercase font-sans tracking-tight">
          PT. PORTAL DIGITAL MEDIA
        </h2>
        <h2 className="text-[#C61C23] font-black text-[17px] leading-[1.1] uppercase font-sans tracking-wide">
          NUSANTARA
        </h2>
        <div className="text-slate-600 text-[8.5px] space-y-0.5 mt-2 font-medium leading-normal">
          <p>Jl. Raya Kediri - Pare No. 30</p>
          <p>Dsn. Ngrancangan Ds. Wonojoyo Kec. Gurah Kab. Kediri</p>
          <p className="text-slate-900 font-extrabold">Telp. 0354-4545845 - +62 811-3500-466</p>
        </div>
      </div>
      
      {/* Red corner aesthetic tab (vertical rounded bar overflowing exactly as on image) */}
      <div className="absolute top-[-18mm] right-[-18mm] w-[35px] h-[135px] bg-[#C61C23] rounded-bl-[20px] shadow-sm pointer-events-none"></div>
    </div>
  );

  const renderFooterStripping = () => (
    <div className="relative overflow-visible w-full text-left">
      {/* Floating red antenna-signal emblem on bottom right - resting beautifully directly on top of the red bar */}
      <div className="absolute right-[10mm] bottom-[20px] w-[46px] h-[46px] flex items-center justify-center select-none overflow-hidden z-20 rounded-full bg-white border border-slate-200 shadow-sm pointer-events-none">
        <img
          src="https://lh3.googleusercontent.com/d/1kwvd_i_n0IWw59fxQEnVD36mqEp7n1iA"
          alt="Metaranews Logo Mini"
          className="w-full h-full object-contain p-1"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.style.display = 'none';
            const fb = e.currentTarget.parentElement?.querySelector('.fallback-footer-svg');
            if (fb) fb.classList.remove('hidden');
          }}
        />
        <div className="fallback-footer-svg hidden w-full h-full flex items-center justify-center bg-[#C61C23] text-white">
          <svg viewBox="0 0 100 100" className="w-[70%] h-[70%] fill-none stroke-white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15,80 L15,35 C15,25 30,15 50,45 C70,15 85,25 85,35 L85,80" />
            <path d="M50,45 L50,80" />
          </svg>
        </div>
      </div>

      {/* Solid bottom Red strip bar */}
      <div className="w-full h-9 bg-[#C61C23] flex items-center justify-start px-[18mm] relative z-10 text-white font-sans text-[8.5px] tracking-wider font-semibold">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Instagram className="w-3.5 h-3.5 stroke-[2.2]" />
            <Facebook className="w-3.5 h-3.5 stroke-[2.2]" />
            <Youtube className="w-3.5 h-3.5 stroke-[2.2]" />
            {/* Custom SVG TikTok Icon */}
            <svg className="w-3 h-3 fill-white stroke-none" viewBox="0 0 24 24">
              <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08.86.37 1.7.9 2.4 1.13 1.43 2.87 2.23 4.67 2.37v3.91c-1.12-.04-2.22-.38-3.18-1-.5-.32-.93-.72-1.3-1.18-.04 2.84-.01 5.69-.02 8.53-.06 2-.6 4-1.78 5.6-1.8 2.5-4.8 3.82-7.85 3.32-2.8-.45-5.2-2.43-5.94-5.18-.84-3.1.5-6.55 3.3-7.98 1.16-.6 2.48-.84 3.78-.69v4.03c-.8-.23-1.68-.08-2.35.43-.88.66-1.25 1.81-1.12 2.89.14 1.18.99 2.22 2.12 2.5a3.1 3.1 0 0 0 3.83-2.1c.14-.52.16-1.07.15-1.61V0h.08z" />
            </svg>
          </div>
          <span className="font-black uppercase tracking-widest text-[8.5px]">METARANEWS</span>
        </div>
      </div>
    </div>
  );

  // Filter list by recipient name or invoice number
  const filteredSpjs = spjs.filter(s => {
    const term = searchQuery.toLowerCase();
    return s.recipientName.toLowerCase().includes(term) || s.invoiceNumber.toLowerCase().includes(term);
  });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start" id="spj-tabs-container">
      
      {/* 1. LEFT SIDEBAR: LIST OF DOCUMENTS */}
      <div className="xl:col-span-4 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4 no-print-element" id="spj-sidebar-panel col-span-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-black text-slate-800 text-sm uppercase tracking-wider">Arsip SPJ A4</h3>
            <p className="text-[10px] text-slate-400">Total {spjs.length} dokumen tersimpan</p>
          </div>
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-1 bg-[#C61C23] hover:bg-red-800 text-white py-1.5 px-3 rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
            id="create-new-spj-btn"
          >
            <Plus className="w-3.5 h-3.5" />
            Buat Baru
          </button>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari penerima atau nomor SPJ..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs focus:ring-1 focus:ring-[#C61C23] focus:border-[#C61C23] outline-none"
          />
        </div>

        {/* SPJ List Container */}
        <div className="space-y-1.5 max-h-[480px] overflow-y-auto pr-1" id="spj-list-scroll">
          {filteredSpjs.map(s => {
            const isSelected = selectedSpj && selectedSpj.id === s.id;
            const total = s.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
            return (
              <div
                key={s.id}
                className={`p-3 rounded-xl border transition-all text-left flex justify-between items-start cursor-pointer relative group ${
                  isSelected 
                    ? 'border-[#C61C23] bg-red-50/40 shadow-xs' 
                    : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50/50'
                }`}
                onClick={() => setSelectedSpj(s)}
              >
                <div className="space-y-1 max-w-[80%]">
                  <div className="font-black text-xs text-slate-800 line-clamp-1 uppercase leading-none">
                    {s.recipientName || 'Draft SPJ'}
                  </div>
                  <div className="text-[9.5px] text-slate-500 font-mono line-clamp-1">
                    {s.invoiceNumber}
                  </div>
                  <div className="text-[9.5px] text-[#C61C23] font-black font-mono">
                    Rp {formatRupiah(total)}
                  </div>
                </div>

                <div className="flex flex-col items-end justify-between h-full space-y-3">
                  <span className="text-[9px] text-slate-400 font-medium whitespace-nowrap">
                    {formatIndonesianDate(s.date)}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSpj(s.id);
                    }}
                    className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    title="Hapus Dokumen"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredSpjs.length === 0 && (
            <div className="p-8 text-center text-xs text-slate-400 italic">
              {searchQuery ? 'Tidak ada hasil pencarian.' : 'Belum ada dokumen SPJ.'}
            </div>
          )}
        </div>
      </div>

      {/* 2. RIGHT COLUMN: WORKSPACE LAYOUT (xl:col-span-8) */}
      <div className="xl:col-span-8 space-y-6" id="spj-editor-preview-grid">
        
         {/* EDIT FILE FORM PANEL */}
        {selectedSpj ? (
          <div className="w-full space-y-4 text-left no-print-element" id="spj-editor-inputs-panel">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <h3 className="font-black text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-[#C61C23]" />
                  Pengaturan SPJ
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={handleLoadSamplePreset}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-wide py-1 px-2.5 rounded transition-colors cursor-pointer"
                    title="Isi dengan contoh format asli"
                  >
                    Reset Contoh
                  </button>
                </div>
              </div>

              {/* Input Fields */}
              <div className="space-y-3 text-xs">
                {/* Invoice Number */}
                <div className="space-y-1">
                  <label className="font-bold text-slate-600">Nomor Invoice #</label>
                  <input
                    type="text"
                    value={selectedSpj.invoiceNumber}
                    onChange={(e) => updateField('invoiceNumber', e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-[#C61C23]"
                    placeholder="Contoh: 210/SPJ/METARA/IV/2026"
                  />
                </div>

                {/* Date */}
                <div className="grid grid-cols-1 gap-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-600">Tanggal Terbit</label>
                    <input
                      type="date"
                      value={selectedSpj.date}
                      onChange={(e) => updateField('date', e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-[#C61C23] font-mono"
                    />
                  </div>
                </div>

                <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-2">
                  <p className="font-black text-slate-700 text-[10px] uppercase tracking-wide flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#C61C23]" />
                    Pihak Penerima (Kepada Yth)
                  </p>
                  
                  {/* Recipient Name */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500 text-[10px]">Nama / Jabatan / Lembaga</label>
                    <input
                      type="text"
                      value={selectedSpj.recipientName}
                      onChange={(e) => updateField('recipientName', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#C61C23] font-bold"
                      placeholder="Contoh: KEPALA SATPOL PP KABUPATEN KEDIRI"
                    />
                  </div>

                  {/* Recipient Address */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500 text-[10px]">Alamat Lengkap</label>
                    <textarea
                      value={selectedSpj.recipientAddress}
                      onChange={(e) => updateField('recipientAddress', e.target.value)}
                      rows={2}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#C61C23] font-medium leading-relaxed resize-none"
                      placeholder="Contoh: Jl. Soekarno-Hatta No. 1, Doko..."
                    />
                  </div>
                </div>
                
                {/* Table Items */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="font-black text-slate-700 uppercase tracking-wide text-[10px] flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-[#C61C23]" />
                      Rincian Layanan / Program
                    </label>
                    <button
                      type="button"
                      onClick={addSpjItem}
                      className="text-[#C61C23] hover:text-red-850 font-bold text-[10px] flex items-center gap-0.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Tambah Baris
                    </button>
                  </div>

                  <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                    {selectedSpj.items.map((item, index) => (
                      <div key={item.id} className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 space-y-2 relative">
                        <div className="absolute right-2 top-2">
                          <button
                            type="button"
                            onClick={() => removeSpjItem(item.id)}
                            className="text-slate-400 hover:text-red-600 p-1 rounded"
                            disabled={selectedSpj.items.length <= 1}
                            title="Hapus baris"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <p className="text-[10px] font-bold text-slate-400">Baris {index + 1}</p>
                        
                        <div className="space-y-1.5">
                          <div>
                            <label className="text-[9px] text-slate-500 block font-semibold">Deskripsi Layanan</label>
                            <textarea
                              value={item.description}
                              onChange={(e) => updateSpjItem(item.id, 'description', e.target.value)}
                              rows={2}
                              className="w-full bg-white border border-slate-200 rounded px-2 py-1 outline-none text-xs focus:border-[#C61C23] leading-snug resize-none font-sans"
                              placeholder="Deskripsi Program / Publikasi"
                            />
                          </div>

                          <div className="grid grid-cols-3 gap-1.5">
                            <div>
                              <label className="text-[9px] text-slate-500 block font-semibold">Qty</label>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updateSpjItem(item.id, 'quantity', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-[#C61C23] text-center"
                                min={1}
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-500 block font-semibold">Periode</label>
                              <input
                                type="text"
                                value={item.period}
                                onChange={(e) => updateSpjItem(item.id, 'period', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-[#C61C23] text-center font-bold"
                                placeholder="April 2026"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-500 block font-semibold">Harga (Rp)</label>
                              <input
                                type="number"
                                value={item.price}
                                onChange={(e) => updateSpjItem(item.id, 'price', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-[#C61C23] text-right font-mono"
                                min={0}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Bank details input */}
                <div className="bg-slate-50/55 p-3 rounded-xl border border-slate-100 space-y-2">
                  <p className="font-black text-slate-700 text-[10px] uppercase tracking-wide flex items-center gap-1">
                    <CreditCard className="w-3.5 h-3.5 text-[#C61C23]" />
                    Informasi Pembayaran (Bank)
                  </p>
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={selectedSpj.bankName}
                      onChange={(e) => updateField('bankName', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#C61C23] font-bold"
                      placeholder="Nama Bank"
                    />
                  </div>
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={selectedSpj.bankAccount}
                      onChange={(e) => updateField('bankAccount', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#C61C23] font-mono"
                      placeholder="Nomor Rekening"
                    />
                  </div>
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={selectedSpj.bankOwner}
                      onChange={(e) => updateField('bankOwner', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#C61C23] font-semibold"
                      placeholder="Pemilik Rekening"
                    />
                  </div>
                </div>

                {/* Signer settings input */}
                <div className="bg-slate-50/55 p-3 rounded-xl border border-slate-100 space-y-2">
                  <p className="font-black text-slate-700 text-[10px] uppercase tracking-wide flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#C61C23]" />
                    Tanda Tangan & Pengesahan
                  </p>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="showSignStampSpj"
                      checked={showSignatureStamp}
                      onChange={(e) => setShowSignatureStamp(e.target.checked)}
                      className="rounded border-slate-300 focus:ring-[#C61C23] text-[#C61C23] cursor-pointer"
                    />
                    <label htmlFor="showSignStampSpj" className="font-bold text-slate-600 text-[10px] cursor-pointer">
                      Sertakan Stempel Basah & Tanda Tangan
                    </label>
                  </div>

                  <div className="space-y-1.5">
                    <input
                      type="text"
                      value={selectedSpj.signerName}
                      onChange={(e) => updateField('signerName', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#C61C23] font-bold"
                      placeholder="Nama Penandatangan"
                    />
                    <input
                      type="text"
                      value={selectedSpj.signerTitle}
                      onChange={(e) => updateField('signerTitle', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#C61C23]"
                      placeholder="Jabatan"
                    />
                  </div>
                </div>

              </div>

              {/* Status and Action keys */}
              <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                {errorMsg && (
                  <div className="flex items-center gap-1 bg-red-50 text-red-700 p-2.5 rounded-xl text-xs font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span className="line-clamp-2">{errorMsg}</span>
                  </div>
                )}

                {saveSuccess && (
                  <div className="flex items-center gap-1.5 bg-green-50 text-green-700 p-2.5 rounded-xl text-xs font-bold animate-pulse">
                    <Check className="w-4 h-4 shrink-0" />
                    SPJ berhasil disinkronkan ke cloud & lokal!
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleSaveSpj}
                    disabled={isSaving}
                    className="flex justify-center items-center gap-1.5 bg-[#C61C23] hover:bg-red-800 text-white rounded-lg py-2.5 px-4 font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {isSaving ? 'Menyimpan...' : 'Simpan SPJ'}
                  </button>

                  <button
                    onClick={handlePrint}
                    className="flex justify-center items-center gap-1.5 border border-[#C61C23] text-[#C61C23] hover:bg-red-50/50 rounded-lg py-2.5 px-4 font-bold text-xs transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    Cetak / Simpan PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* 3. RIGHT PANEL: LIVE PREVIEW LAYOUT WITH PRINT SIMULATION */}
        <div className="space-y-4 no-print-element text-left w-full" id="spj-live-preview-box">
          <span className="text-xs font-black uppercase tracking-widest text-slate-400 text-left block">
            Pratinjau Hasil Cetak Lembar A4 (Live Preview)
          </span>
          <div className="flex flex-col items-center justify-start bg-slate-200/50 rounded-2xl border border-slate-250 p-4 md:p-8 overflow-x-auto min-h-[700px] w-full" id="spj-live-preview-container">
          <div className="mb-4 bg-white px-3 py-1.5 rounded-full border border-slate-200 text-[10px] text-slate-500 font-extrabold shadow-3xs flex items-center gap-1.5 select-none print:hidden">
            <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-ping"></span>
            TAMPILAN NYATA STANDAR KERTAS A4
          </div>

          {selectedSpj ? (
            <div className="relative shadow-2xl overflow-visible mb-6 shrink-0 bg-white">
              {/* Actual paper dimensions structured in CSS */}
              <div 
                id="print-section"
                className="w-[210mm] min-h-[297mm] bg-white text-slate-800 font-sans leading-relaxed tracking-normal select-text border border-white text-left flex flex-col justify-between print:block shrink-0 p-[18mm] relative"
                style={{ contentVisibility: 'auto' }}
              >
                
                {/* --- REPEATING PRINT HEADER (Only visible on physical print pages, fixed top) --- */}
                <div className="hidden print:block fixed top-0 left-0 right-0 h-[140px] pt-[18mm] px-[18mm] bg-white z-[100] pointer-events-none">
                  {renderKopSurat()}
                </div>

                {/* --- REPEATING PRINT FOOTER (Only visible on physical print pages, fixed bottom) --- */}
                <div className="hidden print:block fixed bottom-0 left-0 right-0 h-[60px] bg-white z-[100] pointer-events-none">
                  {renderFooterStripping()}
                </div>

                {/* --- MAIN PAGE TABULAR CONTAINER --- */}
                <table className="w-full border-collapse border-none m-0 p-0 relative z-10">
                  {/* Table Header Space Reservation */}
                  <thead>
                    <tr className="border-none m-0 p-0">
                      <td className="p-0 border-none m-0">
                        <div className="hidden print:block h-[120px] w-full" />
                      </td>
                    </tr>
                  </thead>

                  {/* Core Invoice Body flow */}
                  <tbody>
                    <tr className="border-none m-0 p-0">
                      <td className="p-0 border-none m-0 text-left">
                        <div className="relative">
                          
                          {/* SCREEN-ONLY (Live Preview Mode) HEADER LOGO & KOP SURAT */}
                          <div className="print:hidden">
                            {renderKopSurat()}
                          </div>

                          {/* INVOICE Title Row */}
                          <div className="mt-8 flex justify-between items-start">
                            {/* Left Side: To Recipient */}
                            <div className="text-xs text-slate-800 mt-[10px] space-y-1 pr-6 max-w-[55%]">
                              <p className="font-extrabold text-slate-400 text-[10px] uppercase tracking-wider">KEPADA YTH:</p>
                              <p className="font-black text-slate-900 text-[13px] leading-tight uppercase font-sans tracking-tight">
                                {selectedSpj.recipientName}
                              </p>
                              <p className="text-slate-500 font-medium leading-relaxed font-sans text-[10.5px]">
                                {selectedSpj.recipientAddress}
                              </p>
                            </div>

                            {/* Right Side: Invoice Number as in the screenshot */}
                            <div className="text-right">
                              <h1 className="text-black font-black italic text-[35px] leading-none uppercase select-none tracking-tight">
                                INVOICE
                              </h1>
                              
                              <div className="text-[10px] text-slate-800 font-sans space-y-1.5 mt-4">
                                <div>
                                  <span className="text-slate-400 font-black block uppercase text-[8px] tracking-wider">INVOICE #:</span>
                                  <span className="font-black text-slate-800 font-mono text-xs block">{selectedSpj.invoiceNumber}</span>
                                </div>
                                <div className="mt-2.5">
                                  <span className="text-slate-400 font-black block uppercase text-[8px] tracking-wider">TANGGAL:</span>
                                  <span className="font-black text-slate-850 text-xs block uppercase">
                                    {formatIndonesianDate(selectedSpj.date)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* --- LARGE MAIN TABLE WITH DETAILED BILLING ROWS (ROUNDED CARD GRID) --- */}
                          <div className="mt-9 rounded-[28px] overflow-hidden border border-slate-200/50 shadow-xs relative">
                            <table className="w-full border-none border-collapse text-xs text-left text-slate-800 font-sans">
                              <thead>
                                <tr className="bg-[#6B1315] text-white font-black text-center text-[10.5px] uppercase tracking-wider">
                                  <th className="py-4.5 px-5 w-[42%] text-left font-black tracking-wide border-none">DESKRIPSI</th>
                                  <th className="py-4.5 px-3 w-[10%] text-center font-black tracking-wide border-none">QTY</th>
                                  <th className="py-4.5 px-3 w-[18%] text-center font-black tracking-wide border-none">PERIODE TAYANG</th>
                                  <th className="py-4.5 px-4 w-[15%] text-center font-black tracking-wide border-none">HARGA</th>
                                  <th className="py-4.5 px-5 w-[15%] text-right font-black tracking-wide border-none">TOTAL</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedSpj.items.map((item, idx) => (
                                  <tr key={item.id} className="align-top border-none font-sans">
                                    <td className="bg-[#F4F4F4] p-4 text-left font-bold text-slate-800 leading-relaxed whitespace-pre-line text-[11px] border-none">
                                      {item.description}
                                    </td>
                                    <td className="bg-[#EDEDED] p-4 text-center font-extrabold text-slate-800 text-[11px] border-none">
                                      {item.quantity}
                                    </td>
                                    <td className="bg-[#F4F4F4] p-4 text-center font-bold text-slate-700 text-[11px] border-none">
                                      {item.period}
                                    </td>
                                    <td className="bg-[#EDEDED] p-4 text-center font-bold text-slate-700 font-sans text-[11px] whitespace-nowrap border-none">
                                      Rp. {formatRupiah(item.price)},-
                                    </td>
                                    <td className="bg-[#F4F4F4] px-5 py-4 text-right font-black text-slate-950 font-sans text-[11.5px] whitespace-nowrap border-none">
                                      Rp. {formatRupiah(item.quantity * item.price)},-
                                    </td>
                                  </tr>
                                ))}
                                
                                {/* Dynamic vertical color filling bars for remaining visual space */}
                                {Array.from({ length: Math.max(0, 3 - selectedSpj.items.length) }).map((_, spacerIdx) => (
                                  <tr key={`spacer-${spacerIdx}`} className="h-20 border-none">
                                    <td className="bg-[#F4F4F4] px-4 py-3 border-none"></td>
                                    <td className="bg-[#EDEDED] px-4 py-3 border-none"></td>
                                    <td className="bg-[#F4F4F4] px-4 py-3 border-none"></td>
                                    <td className="bg-[#EDEDED] px-4 py-3 border-none"></td>
                                    <td className="bg-[#F4F4F4] px-5 py-3 border-none"></td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* --- PAYMENT METHOD & GRAND TOTAL BOX ROW --- */}
                          <div className="mt-4 grid grid-cols-12 gap-4 items-end">
                            {/* Left: BANK DETAILS */}
                            <div className="col-span-6 text-left">
                              <p className="font-extrabold text-[9px] text-slate-400 uppercase tracking-widest leading-none">PAYMENT:</p>
                              <div className="mt-1.5 font-sans leading-snug">
                                <p className="font-black text-slate-900 text-[11px] uppercase">{selectedSpj.bankName}</p>
                                <p className="font-medium text-slate-750 text-[10.5px]">Account No.: <span className="font-mono font-bold text-slate-900">{selectedSpj.bankAccount}</span></p>
                                <p className="font-semibold text-slate-650 text-[10px] mt-0.5">{selectedSpj.bankOwner}</p>
                              </div>
                            </div>

                            {/* Right: SUB-TOTAL AND THE HUGE RED TOTAL BOX */}
                            <div className="col-span-6 text-right space-y-2">
                              <div className="flex justify-end items-center gap-1.5 text-[11.5px] font-sans font-bold text-slate-700 pr-1 select-none">
                                <span>SUB-TOTAL</span>
                                <span>:</span>
                                <span className="font-mono text-slate-900 font-extrabold">Rp. {formatRupiah(getGrandTotal())},-</span>
                              </div>

                              {/* Big Bright Red highlight block for Grand Total */}
                              <div className="w-full bg-[#C61C23] py-3.5 px-6 rounded-md select-all text-white font-black text-center flex items-center justify-center shadow-sm relative overflow-hidden shrink-0">
                                <span className="text-[17px] mr-1 font-sans text-white font-black">RP.</span>
                                <span className="text-[25px] leading-none font-sans text-white font-extrabold tracking-tight">
                                  {formatRupiah(getGrandTotal())}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* --- SIGNATURE PANEL --- */}
                          <div className="mt-12 text-center flex flex-col items-center justify-center relative z-10">
                            <p className="font-extrabold text-slate-500 uppercase tracking-wide text-[10px] leading-tight">Hormat Kami,</p>
                            <p className="font-black text-slate-900 text-[10.5px] uppercase block leading-normal mt-0.5">
                              PT. PORTAL DIGITAL MEDIA NUSANTARA
                            </p>
                            
                            {/* Reserved white space for manual signature and actual physical wet stamp */}
                            <div className="h-28 w-60 relative flex items-center justify-center select-none shrink-0 overflow-visible my-1 mx-auto">
                              
                              {/* AUTHENTIC RED WATERMARK CIRCULAR WET STAMP STYLED IN DIGITAL VECTOR SVG */}
                              {showSignatureStamp && (
                                <div className="absolute -left-3 top-[-3px] w-[130px] h-[130px] opacity-[0.88] select-none pointer-events-none rotate-[-4deg] z-20" id="recreated-red-wet-stamp">
                                  <svg viewBox="0 0 100 100" className="w-full h-full text-red-600 fill-none stroke-red-600/90" strokeWidth="2.5">
                                    {/* Double concentric circle borders resembling local company stamp */}
                                    <circle cx="50" cy="50" r="42" strokeWidth="2" strokeDasharray="320" />
                                    <circle cx="50" cy="50" r="38" strokeWidth="0.8" />
                                    
                                    {/* Curved header and footer text using SVG textPath */}
                                    <defs>
                                      <path id="stampHeaderPath" d="M 18 50 A 32 32 0 1 1 82 50" />
                                      <path id="stampFooterPath" d="M 82 50 A 32 32 0 0 1 18 50" />
                                    </defs>
                                    
                                    <text fontFamily="sans-serif" fontWeight="950" fontSize="6.2px" fill="currentColor" letterSpacing="0.3">
                                      <textPath href="#stampHeaderPath" startOffset="50%" textAnchor="middle">
                                        PT. PORTAL DIGITAL MEDIA NUSANTARA
                                      </textPath>
                                    </text>

                                    <text fontFamily="sans-serif" fontWeight="950" fontSize="6.8px" fill="currentColor">
                                      <textPath href="#stampFooterPath" startOffset="50%" textAnchor="middle">
                                        * KABUPATEN KEDIRI *
                                      </textPath>
                                    </text>

                                    {/* Center red signal emblem in stamp */}
                                    <g transform="translate(37.5, 30) scale(0.25)" strokeWidth="8" fill="none" stroke="currentColor">
                                      <path d="M15,80 L15,35 C15,25 30,15 50,45 C70,15 85,25 85,35 L85,80" />
                                      <path d="M50,45 L50,80" />
                                      <circle cx="50" cy="50" r="12" strokeDasharray="3" />
                                    </g>
                                    
                                    {/* Division cross name block */}
                                    <text x="50" y="65" fontFamily="sans-serif" fontWeight="950" fontSize="6px" fill="currentColor" textAnchor="middle" letterSpacing="0.5">
                                      METARANEWS
                                    </text>
                                  </svg>
                                </div>
                              )}

                              {/* AUTHENTIC BLACK SIGNATURE VECTOR SVG OVERLAY SPANNED ON TOP OF STAMP */}
                              {showSignatureStamp && (
                                <div className="absolute right-[10px] top-[15px] w-[150px] h-[80px] opacity-[0.95] select-none pointer-events-none rotate-[2deg] z-10" id="recreated-black-signature">
                                  <svg viewBox="0 0 200 100" className="w-full h-full text-blue-900 stroke-blue-900 fill-none" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round">
                                    {/* Graceful flowing director loop signature as shown in screenshot */}
                                    <path d="M 30 55 C 50 35, 65 65, 75 25 C 80 15, 85, 30, 81 50 C 76 75, 45 80, 50 40 C 55 10, 100, 20, 110, 45 C 115 55, 120, 25, 118 65" />
                                    {/* Center artistic slash lines */}
                                    <path d="M 72 25 L 88 85" strokeWidth="4.8" />
                                    <path d="M 60 70 L 115 72" strokeWidth="2.8" />
                                    <path d="M 108 50 Q 140 10, 155 45 T 185 30" strokeWidth="3" />
                                  </svg>
                                </div>
                              )}

                            </div>

                            {/* Line Name and title */}
                            <div className="space-y-0.5">
                              <strong className="text-slate-900 font-extrabold text-[12px] block uppercase leading-none">
                                {selectedSpj.signerName}
                              </strong>
                              <span className="text-slate-500 font-extrabold block text-[10px] leading-tight mt-0.5">
                                {selectedSpj.signerTitle}
                              </span>
                            </div>
                          </div>

                          {/* SCREEN-ONLY (Live Preview Mode) BOTTOM BRANDING STRIP (A4 red bar bottom edge) */}
                          <div className="print:hidden mt-14 relative overflow-visible -mx-[18mm]">
                            {renderFooterStripping()}
                          </div>

                        </div>
                      </td>
                    </tr>
                  </tbody>

                  {/* Table Footer Space Reservation */}
                  <tfoot>
                    <tr className="border-none m-0 p-0">
                      <td className="p-0 border-none m-0">
                        <div className="hidden print:block h-[50px] w-full" />
                      </td>
                    </tr>
                  </tfoot>
                </table>

              </div>
              
              {/* Scale corner dimensions ruler borders matching absolute A4 width */}
              <div className="absolute top-0 bottom-0 left-[-6px] w-[2px] bg-slate-350/50 print:hidden select-none mb-10" />
              <div className="absolute top-0 bottom-0 right-[-6px] w-[2px] bg-slate-350/50 print:hidden select-none mb-10" />
            </div>
          ) : (
            <div className="py-20 text-center bg-white rounded-2xl border border-slate-100 italic text-sm text-slate-400 w-full" id="spj-no-selected-placeholder">
              Silakan pilih salah satu dokumen SPJ dari panel kiri, atau buat baru.
            </div>
          )}
          </div>
        </div>

      </div>
    </div>
  );
}
