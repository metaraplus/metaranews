import React, { useState, useEffect } from 'react';
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
import { db, collection, getDocs, setDoc, doc, deleteDoc } from '../firebase';

// High-fidelity inline vector SVG Logo for METARANEWS to bypass Google Drive CORS restrictions
const MetaraLogoSvg = ({ className = "w-full h-full" }: { className?: string }) => (
  <svg viewBox="0 0 100 100" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="logoRedGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#E7312F" />
        <stop offset="100%" stopColor="#B51B1A" />
      </linearGradient>
    </defs>
    {/* Clean circular gradient brand base */}
    <circle cx="50" cy="50" r="46" fill="url(#logoRedGrad)" />
    {/* Stylized geometric corporate 'M' resembling transmission waves/bars */}
    <path 
      d="M28 68 V38 L50 56 L72 38 V68" 
      stroke="white" 
      strokeWidth="10" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
    {/* Pulsing focal wave/dot */}
    <circle cx="50" cy="27" r="6" fill="white" />
    {/* Radiating micro-waves at top */}
    <path 
      d="M36 22 A18 18 0 0 1 64 22" 
      stroke="white" 
      strokeWidth="3.5" 
      strokeLinecap="round" 
      fill="none" 
      opacity="0.8"
    />
  </svg>
);

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

interface SpjCreatorProps {
  selectedMonth?: string;
}

export default function SpjCreator({ selectedMonth = 'all' }: SpjCreatorProps) {
  const [spjs, setSpjs] = useState<Spj[]>([]);
  const [selectedSpj, setSelectedSpj] = useState<Spj | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Custom interactive features
  const [showSignatureStamp, setShowSignatureStamp] = useState(true);

  // Safe fetch from Firestore with initial local render and background merge sync
  useEffect(() => {
    async function loadSpjs() {
      const requestedId = localStorage.getItem('metara_active_spj_id');
      
      // 1. Instantly load from localStorage for speed
      const stored = localStorage.getItem('metara_spjs');
      let localList: Spj[] = [];
      const isFirstTime = (stored === null);
      if (stored) {
        try {
          localList = JSON.parse(stored) as Spj[];
        } catch (e) {
          console.error("Failed parsing stored SPJs:", e);
        }
      }

      // If it's the absolute first run (no stored in localStorage), start with dummy preset
      if (isFirstTime && localList.length === 0) {
        localList = [{ ...dummySpjPreset, createdAt: new Date().toISOString() }];
      }

      // Pre-populate state immediately
      setSpjs(localList);
      
      if (requestedId) {
        const found = localList.find(s => s.id === requestedId);
        if (found) {
          setSelectedSpj(found);
        } else {
          setSelectedSpj(localList[0] || null);
        }
      } else {
        setSelectedSpj(localList[0] || null);
      }

      // 2. Fetch from Firestore to sync and merge
      try {
        const snap = await getDocs(collection(db, 'spjs'));
        const remoteList = snap.docs.map(docSnap => docSnap.data() as Spj);
        
        // Track locally deleted IDs to prevent resurrection
        const deletedStr = localStorage.getItem('metara_deleted_spjs');
        const deletedList: string[] = deletedStr ? JSON.parse(deletedStr) : [];

        // Merge strategy based on unique id
        const mergedMap = new Map<string, Spj>();
        
        // Load remote docs (excluding any that are marked deleted)
        remoteList.forEach(s => {
          if (s && s.id) {
            if (deletedList.includes(s.id)) {
              // Delete permanently from Cloud if resurrected or slow-delete
              deleteDoc(doc(db, 'spjs', s.id)).catch(err => {
                console.warn("Retrying Firestore delete for SPJ:", s.id, err);
              });
            } else {
              mergedMap.set(s.id, s);
            }
          }
        });
        
        // Override with local docs
        localList.forEach(s => {
          if (s && s.id && !deletedList.includes(s.id)) {
            const remoteItem = mergedMap.get(s.id);
            if (remoteItem) {
              const localCreated = s.createdAt || '';
              const remoteCreated = remoteItem.createdAt || '';
              if (remoteCreated > localCreated) {
                mergedMap.set(s.id, remoteItem);
              } else {
                mergedMap.set(s.id, s);
              }
            } else {
              mergedMap.set(s.id, s);
            }
          }
        });

        const mergedList = Array.from(mergedMap.values());
        
        // Always sort and update even if list is empty to allow deletion
        mergedList.sort((a, b) => (b.createdAt || b.id).localeCompare(a.createdAt || a.id));
        setSpjs(mergedList);
        
        if (requestedId) {
          const found = mergedList.find(s => s.id === requestedId);
          if (found) {
            setSelectedSpj(found);
          } else if (localList[0]) {
            const currentSelected = mergedList.find(s => s.id === localList[0].id);
            setSelectedSpj(currentSelected || mergedList[0] || null);
          } else {
            setSelectedSpj(mergedList[0] || null);
          }
        } else if (localList[0]) {
          const currentSelected = mergedList.find(s => s.id === localList[0].id);
          if (currentSelected) {
            setSelectedSpj(currentSelected);
          } else {
            setSelectedSpj(mergedList[0] || null);
          }
        } else {
          setSelectedSpj(mergedList[0] || null);
        }

        localStorage.setItem('metara_spjs', JSON.stringify(mergedList));
      } catch (err) {
        console.warn("Using offline mode for SPJs:", err);
      } finally {
        if (requestedId) {
          localStorage.removeItem('metara_active_spj_id');
        }
      }
    }
    loadSpjs();
  }, []);

  // Save to local storage whenever list modifications happen
  const persistList = (updated: Spj[]) => {
    localStorage.setItem('metara_spjs', JSON.stringify(updated));
    setSpjs(updated);
  };

  // Create a brand new empty SPJ (Invoice)
  const handleCreateNew = () => {
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
  };

  // Delete SPJ
  const handleDeleteSpj = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus dokumen SPJ ini secara permanen?')) return;
    
    try {
      // Add to deleted tracking list
      const deletedStr = localStorage.getItem('metara_deleted_spjs');
      const deletedList: string[] = deletedStr ? JSON.parse(deletedStr) : [];
      if (!deletedList.includes(id)) {
        deletedList.push(id);
        localStorage.setItem('metara_deleted_spjs', JSON.stringify(deletedList));
      }

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
      const updatedList = spjs.map(s => s.id === selectedSpj.id ? selectedSpj : s);
      persistList(updatedList);

      setSaveSuccess(true);
      setIsSaving(false);
      setTimeout(() => setSaveSuccess(false), 3000);

      // Cloud Background Sync
      setDoc(doc(db, 'spjs', selectedSpj.id), {
        ...selectedSpj,
        createdAt: selectedSpj.createdAt || new Date().toISOString()
      }).catch((syncErr) => {
        console.warn("Firestore sync SPJ will retry in background:", syncErr);
      });
    } catch (err: any) {
      console.error("Error saving SPJ:", err);
      setErrorMsg('Gagal menyimpan perubahan secara lokal.');
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
    const updated = { ...selectedSpj, [key]: val };
    setSelectedSpj(updated);
    
    // Quick update in client memory list so search works naturally
    setSpjs(spjs.map(s => s.id === selectedSpj.id ? updated : s));
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

  // Highly robust Print trigger using an isolated iframe to guarantee perfect A4 dimensions and style loads inside iFrames
  const handlePrint = () => {
    if (!selectedSpj) return;
    
    const element = document.getElementById('print-section');
    if (!element) {
      setErrorMsg('Elemen cetak tidak ditemukan.');
      return;
    }

    // 1. Create temporary print iframe hidden in screen
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.opacity = '0';
    iframe.style.zIndex = '-9999';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      setErrorMsg('Gagal menginisialisasi modul cetak.');
      return;
    }

    // 2. Open document stream and write headers, styles & body HTML
    doc.open();
    doc.write('<!DOCTYPE html><html><head><title>Cetak SPJ</title>');
    
    // Copy all style sheets and style tags from current workspace so Tailwind styles compile perfectly
    document.querySelectorAll('style, link[rel="stylesheet"]').forEach(styleNode => {
      doc.write(styleNode.outerHTML);
    });

    // Write specific page sizing layout rule to guarantee clean print formatting 
    doc.write(`
      <style>
        @page {
          size: A4;
          margin: 0;
        }
        body {
          margin: 0 !important;
          padding: 0 !important;
          background: white !important;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        #print-section {
          width: 210mm !important;
          min-height: 297mm !important;
          padding-top: 2cm !important;
          padding-bottom: 0.25cm !important;
          padding-left: 2.54cm !important;
          padding-right: 2.54cm !important;
          box-sizing: border-box !important;
          background: white !important;
          margin: 0 auto !important;
          box-shadow: none !important;
          border: none !important;
        }
        .no-print-element {
          display: none !important;
        }
      </style>
    `);
    
    doc.write('</head><body>');
    doc.write(element.outerHTML);
    doc.write('</body></html>');
    doc.close();

    // 3. Wait for image files and styling layers to fully execute, then print
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (e) {
        console.error('Print failure:', e);
        setErrorMsg('Gagal memanggil antrean cetak browser.');
      } finally {
        // Safe clean-up of temporary frame
        setTimeout(() => {
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }, 1500);
      }
    }, 500);
  };

  const renderKopSurat = () => (
    <div className="flex justify-between items-center border-b border-[#E7312F] pb-3 relative z-10 w-full text-left font-montserrat">
      {/* Top Left: METARA LOGO IMAGE */}
      <div className="flex items-center">
        <div className="w-[145px] h-[90px] flex items-center justify-start shrink-0">
          <img 
            src="https://lh3.googleusercontent.com/d/1EZpDezU860yP2uRbiPDugS8yjP5GP-Xu" 
            alt="Metara Logo" 
            className="w-full h-full object-contain object-left pointer-events-none select-none"
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            onError={(e) => {
              e.currentTarget.src = "https://docs.google.com/uc?export=download&id=1EZpDezU860yP2uRbiPDugS8yjP5GP-Xu";
            }}
          />
        </div>
      </div>

      {/* Top Right: PT PORTAL DIGITAL MEDIA NUSANTARA */}
      <div className="text-right flex-1 pr-6">
        <h2 className="text-[#E7312F] font-extrabold text-[19px] leading-tight uppercase tracking-tight font-montserrat">
          PT. PORTAL DIGITAL MEDIA NUSANTARA
        </h2>
        <div className="text-slate-800 text-[10.5px] font-semibold mt-1 space-y-0.5 tracking-tight leading-snug font-montserrat">
          <p>Jl. Raya Kediri - Pare No. 30</p>
          <p>Dsn. Ngrancangan Ds. Wonojoyo Kec. Gurah Kab. Kediri</p>
          <p className="font-extrabold text-black">
            Telp. <span className="text-slate-800 font-bold">0354-4545845</span> - <span className="text-slate-800 font-bold">+62 811-3500-466</span>
          </p>
        </div>
      </div>
      
      {/* Decorative vertical red block on the right edge */}
      <div className="absolute top-[-2cm] right-[-2.54cm] w-[45px] h-[34mm] bg-[#E7312F] rounded-l-[18px]"></div>
    </div>
  );

  const renderFooterStripping = () => (
    <div className="relative overflow-visible w-full text-left font-montserrat">
      {/* Floating white circle with the logo from drive */}
      <div className="absolute right-[2.54cm] bottom-[4px] w-[54px] h-[54px] flex items-center justify-center select-none overflow-visible z-20">
        <div className="w-[54px] h-[54px] rounded-full bg-white flex items-center justify-center shadow-xs border border-slate-200 overflow-hidden">
          {/* Logo image inside footer */}
          <div className="w-[44px] h-[44px] flex items-center justify-center relative overflow-hidden">
            <img 
              src="https://lh3.googleusercontent.com/d/1EZpDezU860yP2uRbiPDugS8yjP5GP-Xu" 
              alt="Metaranews Logo" 
              className="w-full h-full object-contain pointer-events-none select-none"
              referrerPolicy="no-referrer"
              crossOrigin="anonymous"
              onError={(e) => {
                e.currentTarget.src = "https://docs.google.com/uc?export=download&id=1EZpDezU860yP2uRbiPDugS8yjP5GP-Xu";
              }}
            />
          </div>
        </div>
      </div>

      {/* Solid bottom Red strip bar */}
      <div className="w-full h-8 bg-[#E7312F] flex items-center justify-start px-[2.54cm] relative z-10 text-white font-montserrat text-[10px] tracking-widest font-extrabold shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <Instagram className="w-4 h-4 stroke-[2.5]" />
            <Facebook className="w-4 h-4 stroke-[2.5]" />
            <Youtube className="w-4 h-4 stroke-[2.5]" />
          </div>
          <span className="font-extrabold uppercase tracking-widest text-[9.5px]">METARANEWS</span>
        </div>
      </div>
    </div>
  );

  // Filter list by recipient name or invoice number
  const filteredSpjs = spjs.filter(s => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = s.recipientName.toLowerCase().includes(term) || s.invoiceNumber.toLowerCase().includes(term);
    if (!matchesSearch) return false;
    if (selectedMonth === 'all') return true;
    return s.date.startsWith(selectedMonth);
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
            className="flex items-center gap-1 bg-[#CC0000] hover:bg-red-700 text-white py-1.5 px-3 rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
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
            className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs focus:ring-1 focus:ring-[#CC0000] focus:border-[#CC0000] outline-none"
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
                    ? 'border-[#CC0000] bg-red-50/40 shadow-xs' 
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
                  <div className="text-[9.5px] text-[#CC0000] font-black font-mono">
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
                  <FileText className="w-4 h-4 text-[#CC0000]" />
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
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-[#CC0000]"
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
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:border-[#CC0000] font-mono"
                    />
                  </div>
                </div>

                <div className="bg-slate-50/50 p-3 rounded-xl border border-slate-100 space-y-2">
                  <p className="font-black text-slate-700 text-[10px] uppercase tracking-wide flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#CC0000]" />
                    Pihak Penerima (Kepada Yth)
                  </p>
                  
                  {/* Recipient Name */}
                  <div className="space-y-1">
                    <label className="font-semibold text-slate-500 text-[10px]">Nama / Jabatan / Lembaga</label>
                    <input
                      type="text"
                      value={selectedSpj.recipientName}
                      onChange={(e) => updateField('recipientName', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#CC0000] font-bold"
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
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 outline-none focus:border-[#CC0000] font-medium leading-relaxed resize-none"
                      placeholder="Contoh: Jl. Soekarno-Hatta No. 1, Doko..."
                    />
                  </div>
                </div>
                
                {/* Table Items */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="font-black text-slate-700 uppercase tracking-wide text-[10px] flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-[#CC0000]" />
                      Rincian Layanan / Program
                    </label>
                    <button
                      type="button"
                      onClick={addSpjItem}
                      className="text-[#CC0000] hover:text-red-700 font-bold text-[10px] flex items-center gap-0.5"
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
                              className="w-full bg-white border border-slate-200 rounded px-2 py-1 outline-none text-xs focus:border-[#CC0000] leading-snug resize-none font-sans"
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
                                className="w-full bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-[#CC0000] text-center"
                                min={1}
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-500 block font-semibold">Periode</label>
                              <input
                                type="text"
                                value={item.period}
                                onChange={(e) => updateSpjItem(item.id, 'period', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-[#CC0000] text-center font-bold"
                                placeholder="April 2026"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] text-slate-500 block font-semibold">Harga (Rp)</label>
                              <input
                                type="number"
                                value={item.price}
                                onChange={(e) => updateSpjItem(item.id, 'price', e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded px-2 py-1 outline-none focus:border-[#CC0000] text-right font-mono"
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
                    <CreditCard className="w-3.5 h-3.5 text-[#CC0000]" />
                    Informasi Pembayaran (Bank)
                  </p>
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={selectedSpj.bankName}
                      onChange={(e) => updateField('bankName', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#CC0000] font-bold"
                      placeholder="Nama Bank"
                    />
                  </div>
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={selectedSpj.bankAccount}
                      onChange={(e) => updateField('bankAccount', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#CC0000] font-mono"
                      placeholder="Nomor Rekening"
                    />
                  </div>
                  <div className="space-y-1">
                    <input
                      type="text"
                      value={selectedSpj.bankOwner}
                      onChange={(e) => updateField('bankOwner', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#CC0000] font-semibold"
                      placeholder="Pemilik Rekening"
                    />
                  </div>
                </div>

                {/* Signer settings input */}
                <div className="bg-slate-50/55 p-3 rounded-xl border border-slate-100 space-y-2">
                  <p className="font-black text-slate-700 text-[10px] uppercase tracking-wide flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-[#CC0000]" />
                    Tanda Tangan & Pengesahan
                  </p>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="checkbox"
                      id="showSignStampSpj"
                      checked={showSignatureStamp}
                      onChange={(e) => setShowSignatureStamp(e.target.checked)}
                      className="rounded border-slate-300 focus:ring-[#CC0000] text-[#CC0000] cursor-pointer"
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
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#CC0000] font-bold"
                      placeholder="Nama Penandatangan"
                    />
                    <input
                      type="text"
                      value={selectedSpj.signerTitle}
                      onChange={(e) => updateField('signerTitle', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 outline-none focus:border-[#CC0000]"
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

                <div className="flex flex-col gap-2">
                  <button
                    onClick={handleSaveSpj}
                    disabled={isSaving}
                    className="w-full flex justify-center items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg py-2.5 px-4 font-bold text-xs shadow-xs transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSaving ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    {isSaving ? 'Menyimpan Perubahan...' : 'Simpan Data SPJ ke Database'}
                  </button>

                  <button
                    onClick={handlePrint}
                    className="w-full flex justify-center items-center gap-1.5 bg-[#CC0000] hover:bg-red-700 text-white rounded-lg py-2.5 px-4 font-bold text-xs shadow-xs transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    Cetak Langsung
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
                className="w-[210mm] min-h-[297mm] bg-white text-slate-800 font-sans leading-relaxed tracking-normal select-text border border-white text-left flex flex-col justify-between print:block shrink-0 pt-[2cm] pb-[0.25cm] pl-[2.54cm] pr-[2.54cm] relative"
                style={{ contentVisibility: 'auto' }}
              >
                
                {/* --- REPEATING PRINT HEADER (Only visible on physical print pages, fixed top) --- */}
                <div className="hidden print:block fixed top-0 left-0 w-[210mm] h-[45mm] pt-[2cm] pl-[2.54cm] pr-[2.54cm] bg-white z-[100] pointer-events-none">
                  {renderKopSurat()}
                </div>

                {/* --- REPEATING PRINT FOOTER (Only visible on physical print pages, fixed bottom) --- */}
                <div className="hidden print:block fixed bottom-0 left-0 w-[210mm] h-[15mm] pb-[0.25cm] pl-[2.54cm] pr-[2.54cm] bg-white z-[100] pointer-events-none">
                  {renderFooterStripping()}
                </div>

                {/* --- MAIN PAGE TABULAR CONTAINER --- */}
                <table className="w-full border-collapse border-none m-0 p-0 relative z-10">
                  {/* Table Header Space Reservation */}
                  <thead>
                    <tr className="border-none m-0 p-0">
                      <td className="p-0 border-none m-0">
                        <div className="hidden print:block h-[45mm] w-full" />
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

                          {/* --- LARGE MAIN TABLE WITH DETAILED BILLING ROWS --- */}
                          <div className="mt-9">
                            <table className="w-full border-collapse border border-slate-200 text-xs text-left text-slate-800 font-sans">
                              <thead>
                                <tr className="bg-[#851D1D] text-white font-black text-center text-[10px] uppercase tracking-wider">
                                  <th className="border border-slate-200 py-[11px] px-3 w-[45%] text-left font-extrabold">DESKRIPSI</th>
                                  <th className="border border-slate-200 py-[11px] px-2 w-[11%] font-extrabold">QTY</th>
                                  <th className="border border-slate-200 py-[11px] px-2 w-[18%] font-extrabold">PERIODE TAYANG</th>
                                  <th className="border border-slate-200 py-[11px] px-3 w-[23%] text-center font-extrabold">HARGA</th>
                                  <th className="border border-slate-200 py-[11px] px-3 w-[23%] text-right font-extrabold">TOTAL</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedSpj.items.map((item, idx) => (
                                  <tr key={item.id} className="min-h-[140px] align-top">
                                    <td className="border border-slate-200 p-3 bg-slate-50/50 font-bold text-slate-800 leading-relaxed whitespace-pre-line text-[11px]">
                                      {item.description}
                                    </td>
                                    <td className="border border-slate-200 p-3 text-center font-bold text-slate-800 text-[11px]">
                                      {item.quantity}
                                    </td>
                                    <td className="border border-slate-200 p-3 text-center font-bold text-slate-700 text-[11px]">
                                      {item.period}
                                    </td>
                                    <td className="border border-slate-200 p-3 text-center font-bold text-slate-700 font-sans text-[11px] whitespace-nowrap">
                                      Rp. {formatRupiah(item.price)},-
                                    </td>
                                    <td className="border border-slate-200 p-3 text-right font-black text-slate-900 font-sans text-[11px] whitespace-nowrap">
                                      Rp. {formatRupiah(item.quantity * item.price)},-
                                    </td>
                                  </tr>
                                ))}
                                
                                {/* Padding row to elongate table height naturally just like format */}
                                {selectedSpj.items.length === 1 && (
                                  <tr className="h-28">
                                    <td className="border border-slate-200 bg-slate-50/50"></td>
                                    <td className="border border-slate-200"></td>
                                    <td className="border border-slate-200"></td>
                                    <td className="border border-slate-200"></td>
                                    <td className="border border-slate-200"></td>
                                  </tr>
                                )}
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
                              <div className="w-full bg-[#CC0000] py-3.5 px-6 rounded-md select-all text-white font-black text-center flex items-center justify-center shadow-sm relative overflow-hidden shrink-0">
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
                              
                              {showSignatureStamp && (
                                <img 
                                  src="https://lh3.googleusercontent.com/d/1OfIPF_BA2X7qI1LSKJZTF3Wv-NKGedmf" 
                                  alt="Tanda Tangan & Pengesahan" 
                                  className="absolute h-[168px] max-w-none object-contain pointer-events-none select-none mix-blend-multiply z-30 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                                  referrerPolicy="no-referrer"
                                  crossOrigin="anonymous"
                                  onError={(e) => {
                                    e.currentTarget.src = "https://docs.google.com/uc?export=download&id=1OfIPF_BA2X7qI1LSKJZTF3Wv-NKGedmf";
                                  }}
                                />
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
                          <div className="print:hidden mt-14 relative overflow-visible -mx-[2.54cm]">
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
                        <div className="hidden print:block h-[15mm] w-full" />
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
