import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Printer, 
  Save, 
  Search, 
  CreditCard, 
  User, 
  MapPin, 
  FileEdit, 
  Coins, 
  AlertCircle, 
  Check, 
  RefreshCw,
  Instagram,
  Facebook,
  Youtube
} from 'lucide-react';
import { Quotation, QuotationItem } from '../types';
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

interface QuotationLetterCreatorProps {
  selectedMonth?: string;
}

export default function QuotationLetterCreator({ selectedMonth = 'all' }: QuotationLetterCreatorProps) {
  const [quotations, setQuotations] = useState<Quotation[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quotation | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showSignatureStamp, setShowSignatureStamp] = useState(true);

  // Sample Preset to load if empty or requested
  const dummyQuotationPreset: Quotation = {
    id: `q-sample-preset`,
    letterNumber: '085/P-PDMN/M-NEWS/VI/2026',
    date: '2026-06-21',
    attachments: '1 Berkas Proposal Penawaran',
    subject: 'Penawaran Kerjasama Publikasi Berita Berbayar & Rubrikasi Premium di Portal metaranews.co',
    recipientName: 'Imam Subejo, S.Kom., M.M.',
    recipientTitle: 'Kepala Bidang Humas & Komunikasi Publik',
    recipientCompany: 'Dinas Komunikasi dan Informatika Kota Kediri',
    recipientAddress: 'Jl. Jenderal Basuki Rahmat No. 15, Kediri, Jawa Timur',
    bodyOpening: 'Dengan hormat,\n\nSehubungan dengan komitmen berkelanjutan dalam melakukan diseminasi informasi pembangunan serta penyampaian berita positif, kredibel, dan inspiratif di wilayah Kediri Raya, kami dari PT. Portal Digital Media Nusantara yang menaungi media online metaranews (Metara - Setara Bercerita) bermaksud untuk mengajukan penawaran kerjasama publikasi berita, advetorial, dan rubrikasi khusus.\n\nSegenap program ini dirancang agar instansi Bapak dapat menyasar pembaca digital yang masif di Kediri Raya secara efektif, ramah SEO, dan didukung visualisasi tim redaksi profesional kami. Berikut adalah rincian paket kerjasama penawaran yang kami sediakan:',
    items: [
      {
        id: 'item-1',
        name: 'Paket Advetorial Premium (Full-Pack)',
        description: 'Penulisan draf wartawan, peliputan jurnalis foto di lapangan, penerbitan naskah, sebar media sosial Instagram, & optimasi pencarian Google (SEO)',
        quantity: 10,
        unit: 'Berita',
        price: 1500000
      },
      {
        id: 'item-2',
        name: 'Rubrikasi Kolom Komunitas Instansi',
        description: 'Pembuatan sub-kolom eksklusif mandiri di portal utama selama periode kontrak, diperbarui 3x per minggu',
        quantity: 3,
        unit: 'Bulan',
        price: 4500000
      },
      {
        id: 'item-3',
        name: 'Sponsor Banner Utama Sidebar',
        description: 'Pemasangan display banner berukuran 300x250px pada laman kompartemen berita regional Kediri',
        quantity: 1,
        unit: 'Paket',
        price: 3000000
      }
    ],
    bodyClosing: 'Demikian surat penawaran kerjasama publikasi ini kami sampaikan dengan harapan dapat terjalin kemitraan sinergis yang produktif demi kemajuan daerah. Atas perhatian, penerimaan, serta kerjasama Bapak, kami sampaikan terima kasih yang sebesar-besarnya.',
    signerName: 'Lutfi Mahmud, S.Sos.',
    signerTitle: 'Direktur Utama PT. Portal Digital Media Nusantara',
    vatPercent: 11,
    showVat: true
  };

  // Safe fetch from Firestore with initial local render and background merge sync
  useEffect(() => {
    async function loadQuotations() {
      const requestedId = localStorage.getItem('metara_active_quotation_id');
      
      // 1. Instantly load from localStorage so the UI is immediately populated and responsive
      const stored = localStorage.getItem('metara_quotations');
      let localList: Quotation[] = [];
      const isFirstTime = (stored === null);
      if (stored) {
        try {
          localList = JSON.parse(stored) as Quotation[];
        } catch (e) {
          console.error("Failed parsing stored quotations:", e);
        }
      }

      // If it's the absolute first run (no stored in localStorage), start with dummy preset
      if (isFirstTime && localList.length === 0) {
        localList = [{ ...dummyQuotationPreset, createdAt: new Date().toISOString() }];
      }

      // Pre-populate state immediately
      setQuotations(localList);
      
      if (requestedId) {
        const found = localList.find(q => q.id === requestedId);
        if (found) {
          setSelectedQuote(found);
        } else {
          setSelectedQuote(localList[0] || null);
        }
      } else {
        setSelectedQuote(localList[0] || null);
      }

      // 2. Fetch from Firestore to sync and merge any remote documents
      try {
        const snap = await getDocs(collection(db, 'quotations'));
        const remoteList = snap.docs.map(docSnap => docSnap.data() as Quotation);
        
        // Track locally deleted IDs to prevent them from being resurrected from remote Firestore
        const deletedStr = localStorage.getItem('metara_deleted_quotations');
        const deletedList: string[] = deletedStr ? JSON.parse(deletedStr) : [];

        // Merge strategy based on unique id
        const mergedMap = new Map<string, Quotation>();
        
        // Load remote docs first (excluding any that are marked deleted)
        remoteList.forEach(q => {
          if (q && q.id) {
            if (deletedList.includes(q.id)) {
              // Delete permanently from Cloud if it was somehow resurrected or not deleted yet
              deleteDoc(doc(db, 'quotations', q.id)).catch(err => {
                console.warn("Retrying Firestore delete for:", q.id, err);
              });
            } else {
              mergedMap.set(q.id, q);
            }
          }
        });
        
        // Override with local docs
        localList.forEach(q => {
          if (q && q.id && !deletedList.includes(q.id)) {
            const remoteItem = mergedMap.get(q.id);
            if (remoteItem) {
              // Both exist, let's keep the one with newer createdAt or just prefer the local one if isSaving was pending
              const localCreated = q.createdAt || '';
              const remoteCreated = remoteItem.createdAt || '';
              if (remoteCreated > localCreated) {
                mergedMap.set(q.id, remoteItem);
              } else {
                mergedMap.set(q.id, q);
              }
            } else {
              mergedMap.set(q.id, q);
            }
          }
        });

        const mergedList = Array.from(mergedMap.values());
        
        // Always sort and update even if list is empty to allow deletion
        mergedList.sort((a, b) => (b.createdAt || b.id).localeCompare(a.createdAt || a.id));
        setQuotations(mergedList);
        
        // Try to retain the current selection if it still exists
        if (requestedId) {
          const found = mergedList.find(q => q.id === requestedId);
          if (found) {
            setSelectedQuote(found);
          } else if (localList[0]) {
            const currentSelected = mergedList.find(q => q.id === localList[0].id);
            setSelectedQuote(currentSelected || mergedList[0] || null);
          } else {
            setSelectedQuote(mergedList[0] || null);
          }
        } else if (localList[0]) {
          const currentSelected = mergedList.find(q => q.id === localList[0].id);
          if (currentSelected) {
            setSelectedQuote(currentSelected);
          } else {
            setSelectedQuote(mergedList[0] || null);
          }
        } else {
          setSelectedQuote(mergedList[0] || null);
        }

        localStorage.setItem('metara_quotations', JSON.stringify(mergedList));
      } catch (err) {
        console.warn("Using offline mode as Firestore is unreachable during startup:", err);
      } finally {
        if (requestedId) {
          localStorage.removeItem('metara_active_quotation_id');
        }
      }
    }
    loadQuotations();
  }, []);

  // Save to local storage whenever list modifications happen
  const persistList = (updated: Quotation[]) => {
    localStorage.setItem('metara_quotations', JSON.stringify(updated));
    setQuotations(updated);
  };

  // Create a brand new empty quotation letter
  const handleCreateNew = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    const newId = `q-${Date.now()}`;
    const newLetter: Quotation = {
      id: newId,
      letterNumber: `.../P-PDMN/M-NEWS/${todayStr.substring(5, 7)}/${todayStr.substring(0, 4)}`,
      date: todayStr,
      attachments: '1 Berkas Proposal',
      subject: 'Penawaran Jasa Publikasi & Kerjasama Redaksi',
      recipientName: 'Nama Penerima',
      recipientTitle: 'Jabatan Penerima',
      recipientCompany: 'Instansi / Perusahaan',
      recipientAddress: 'Alamat lengkap instansi...',
      bodyOpening: 'Dengan hormat,\n\nKami dari PT. Portal Digital Media Nusantara selaku penanggung jawab media online metaranews (Metara - Setara Bercerita) menawarkan kerjasama publikasi berita...',
      items: [
        {
          id: `item-${Date.now()}`,
          name: 'Paket Advetorial Lapangan',
          description: 'Meliput kegiatan lapangan dan publikasi artikel berita',
          quantity: 1,
          unit: 'Paket',
          price: 1500004
        }
      ],
      bodyClosing: 'Demikian penawaran ini kami ajukan. Atas perhatian dan kerjasamanya kami haturkan terima kasih.',
      signerName: 'Lutfi Mahmud, S.Sos.',
      signerTitle: 'Direktur Utama PT. Portal Digital Media Nusantara',
      vatPercent: 11,
      showVat: false,
      createdAt: new Date().toISOString()
    };

    const updated = [newLetter, ...quotations];
    persistList(updated);
    setSelectedQuote(newLetter);
  };

  // Delete quotation
  const handleDelete = async (id: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus surat penawaran ini secara permanen?')) return;
    
    try {
      // Add to deleted tracking list
      const deletedStr = localStorage.getItem('metara_deleted_quotations');
      const deletedList: string[] = deletedStr ? JSON.parse(deletedStr) : [];
      if (!deletedList.includes(id)) {
        deletedList.push(id);
        localStorage.setItem('metara_deleted_quotations', JSON.stringify(deletedList));
      }

      const updated = quotations.filter(q => q.id !== id);
      persistList(updated);
      
      if (selectedQuote && selectedQuote.id === id) {
        setSelectedQuote(updated[0] || null);
      }
      
      // Sync cloud
      await deleteDoc(doc(db, 'quotations', id));
    } catch (err) {
      console.error("Gagal menghapus dari firestore:", err);
    }
  };

  // Save current selected quotation to DB
  const handleSaveQuotation = async () => {
    if (!selectedQuote) return;
    setIsSaving(true);
    setErrorMsg('');
    setSaveSuccess(false);

    try {
      // 1. Instantly write to LocalState & LocalStorage
      const updatedList = quotations.map(q => q.id === selectedQuote.id ? selectedQuote : q);
      persistList(updatedList);

      // 2. Clear loading and trigger success toast instantly so the UI is lightning-fast!
      setSaveSuccess(true);
      setIsSaving(false);
      setTimeout(() => setSaveSuccess(false), 3000);

      // 3. Sync to Cloud Firestore in the background without blocking the UI rendering cycle
      setDoc(doc(db, 'quotations', selectedQuote.id), {
        ...selectedQuote,
        createdAt: selectedQuote.createdAt || new Date().toISOString()
      }).catch((syncErr) => {
        console.warn("Firestore sync will retry in background:", syncErr);
      });
    } catch (err: any) {
      console.error("Error saving quotation:", err);
      setErrorMsg('Gagal menyimpan perubahan secara lokal.');
      setIsSaving(false);
    }
  };

  // Handle nested updates for selectedQuote
  const updateField = (key: keyof Quotation, val: any) => {
    if (!selectedQuote) return;
    const updated = { ...selectedQuote, [key]: val };
    setSelectedQuote(updated);
    
    // Update temporary in memory list without force savings in firebase immediately (user clicks Save)
    setQuotations(quotations.map(q => q.id === selectedQuote.id ? updated : q));
  };

  // Handle items inside pricing table
  const addPricingItem = () => {
    if (!selectedQuote) return;
    const newItem: QuotationItem = {
      id: `item-${Date.now()}`,
      name: 'Layanan Tambahan Baru',
      description: 'Deskripsi singkat layanan...',
      quantity: 1,
      unit: 'Kali',
      price: 1000000
    };
    updateField('items', [...selectedQuote.items, newItem]);
  };

  const updatePricingItem = (itemId: string, field: keyof QuotationItem, val: any) => {
    if (!selectedQuote) return;
    const updatedItems = selectedQuote.items.map(item => {
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

  const removePricingItem = (itemId: string) => {
    if (!selectedQuote) return;
    updateField('items', selectedQuote.items.filter(item => item.id !== itemId));
  };

  // Calculate pricing metrics
  const getSubtotal = () => {
    if (!selectedQuote) return 0;
    return selectedQuote.items.reduce((sum, item) => sum + (item.quantity * item.price), 0);
  };

  const getTax = () => {
    if (!selectedQuote || !selectedQuote.showVat) return 0;
    return Math.round((getSubtotal() * (selectedQuote.vatPercent || 11)) / 100);
  };

  const getGrandTotal = () => {
    return getSubtotal() + getTax();
  };

  // Trigger Print to PDF
  const handlePrint = () => {
    if (!selectedQuote) return;
    window.print();
  };

  const renderKopSurat = () => (
    <div className="flex justify-between items-center border-b-2 border-[#E7312F] pb-4 relative z-10 w-full font-montserrat">
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
      
      {/* Top Right: PT PORTAL DIGITAL MEDIA NUSANTARA and contact head */}
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

  // Filter list by recipient or reference query
  const filteredQuotations = quotations.filter(q => {
    const term = searchQuery.toLowerCase();
    const matchesSearch = (
      q.recipientCompany.toLowerCase().includes(term) ||
      q.recipientName.toLowerCase().includes(term) ||
      q.letterNumber.toLowerCase().includes(term) ||
      q.subject.toLowerCase().includes(term)
    );
    if (!matchesSearch) return false;
    if (selectedMonth === 'all') return true;
    return q.date.startsWith(selectedMonth);
  });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6" id="surat-penawaran-creator-root">
      
      {/* LEFT COLUMN: LIST TEMPLATE & CONTROL BUTTONS (xl:col-span-4) */}
      <div className="xl:col-span-4 space-y-4 no-print-element" id="quotations-side-manager">
        
        {/* Creation Header & Actions */}
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-3xs">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider block">Daftar Dokumen</h3>
              <span className="text-sm font-black text-slate-900">Surat Penawaran</span>
            </div>
            <button
              onClick={handleCreateNew}
              className="bg-sky-600 hover:bg-sky-700 text-white p-2 md:px-3 md:py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer select-none"
              title="Buat Surat Penawaran Baru"
              id="new-offer-letter-btn"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Surat Baru</span>
            </button>
          </div>

          {/* Search box for templates */}
          <div className="relative">
            <span className="absolute left-3 top-2.5 text-slate-400">
              <Search className="w-3.5 h-3.5" />
            </span>
            <input
              type="text"
              placeholder="Cari penerima, instansi atau nomor surat..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-150 bg-slate-50 focus:outline-hidden focus:bg-white focus:ring-1 focus:ring-sky-500 text-slate-800 placeholder-slate-400"
            />
          </div>
        </div>

        {/* Scrollable list of quotes */}
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-3xs">
          <div className="max-h-[360px] overflow-y-auto divide-y divide-slate-100">
            {filteredQuotations.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 italic">
                {searchQuery ? 'Tidak ada hasil pencarian.' : 'Belum ada formulir surat penawaran.'}
              </div>
            ) : (
              filteredQuotations.map((q) => {
                const isSelected = selectedQuote?.id === q.id;
                const totalItemAmount = q.items.reduce((acc, item) => acc + (item.quantity * item.price), 0);
                const vatAmount = q.showVat ? Math.round((totalItemAmount * q.vatPercent) / 100) : 0;
                
                return (
                  <div
                    key={q.id}
                    onClick={() => setSelectedQuote(q)}
                    className={`p-3.5 transition-all cursor-pointer text-left relative ${
                      isSelected 
                        ? 'bg-sky-50/70 border-l-4 border-sky-600' 
                        : 'hover:bg-slate-50/50 border-l-4 border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <div className="space-y-0.5 max-w-[80%]">
                        <span className="text-[9px] font-black font-mono text-slate-400 tracking-wider">
                          {q.letterNumber || 'TIDAK ADA NOMOR'}
                        </span>
                        <h4 className="text-xs font-bold text-slate-800 truncate block">
                          {q.recipientCompany || 'Satu Instansi'}
                        </h4>
                        <p className="text-[10px] text-slate-500 font-medium truncate block">
                          Up: {q.recipientName || 'Penerima Surat'}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(q.id);
                        }}
                        className="text-slate-300 hover:text-red-500 p-1 rounded-sm transition-colors cursor-pointer shrink-0"
                        title="Hapus surat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
                    <div className="mt-2.5 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-medium">{formatIndonesianDate(q.date)}</span>
                      <span className="text-slate-700 font-bold font-mono">
                        {formatRupiah(totalItemAmount + vatAmount)}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Quick Help box */}
        <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4 text-xs text-slate-500 leading-relaxed block">
          <span className="font-bold text-slate-800 block mb-1 text-[10px] uppercase tracking-wider">💡 Petunjuk Cetak (Print):</span>
          Lakukan pengisian data surat pada kolom input sebelah kanan, kemudian klik tombol <strong className="text-slate-700">Cetak A4 / Simpan PDF</strong>. Untuk hasil cetakan yang rapi, pastikan opsi <strong className="text-slate-700">"Header & Footers"</strong> dinonaktifkan di pengaturan browser Anda pada saat mencetak.
        </div>
      </div>

      {/* RIGHT COLUMN: WORKSPACE LAYOUT (xl:col-span-8) */}
      <div className="xl:col-span-8 space-y-6" id="quotations-inputs-preview-workspace">
        
        {/* Dynamic Editor Panel */}
        {selectedQuote ? (
          <div className="bg-white rounded-2xl border border-slate-150 p-6 shadow-xs space-y-6 no-print-element" id="quote-editor-form-panel">
            
            {/* Top Toolbar Action */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                <strong className="text-xs font-bold text-slate-800">Workspace Editor Aktif</strong>
                <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md font-mono">ID: {selectedQuote.id}</span>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleSaveQuotation}
                  disabled={isSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl shadow-xs hover:shadow-md transition-all flex items-center gap-1 select-none cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-1.5 rounded-xl shadow-xs transition-all flex items-center gap-1 select-none cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak A4 / PDF</span>
                </button>
              </div>
            </div>

            {/* Error or Success Toast notifications */}
            {saveSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Dokumen Surat Penawaran berhasil disimpan ke Cloud database dan cadangan lokal Anda!</span>
              </div>
            )}
            {errorMsg && (
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-3 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Editor Sections Accordion Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              
              {/* Section 1: Detail Surathead */}
              <div className="border border-slate-100 rounded-xl p-4 space-y-3.5 bg-slate-50/40">
                <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-sky-600" />
                  Regulasi & No. Dokumen
                </h4>
                
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Nomor Surat</label>
                    <input
                      type="text"
                      value={selectedQuote.letterNumber}
                      onChange={(e) => updateField('letterNumber', e.target.value)}
                      placeholder="Masukkan Nomor Surat Resmi..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-sky-500 text-slate-800 font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Tanggal Surat</label>
                      <input
                        type="date"
                        value={selectedQuote.date}
                        onChange={(e) => updateField('date', e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Lampiran</label>
                      <input
                        type="text"
                        value={selectedQuote.attachments}
                        onChange={(e) => updateField('attachments', e.target.value)}
                        placeholder="Contoh: 1 Bundel Proposal"
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Perihal / Subjek</label>
                    <input
                      type="text"
                      value={selectedQuote.subject}
                      onChange={(e) => updateField('subject', e.target.value)}
                      placeholder="Hal surat yang ditawarkan..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Recipient Details */}
              <div className="border border-slate-100 rounded-xl p-4 space-y-3.5 bg-slate-50/40">
                <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-sky-600" />
                  Kepada Siapa Ditujukan
                </h4>
                
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Nama Penerima</label>
                      <input
                        type="text"
                        value={selectedQuote.recipientName}
                        onChange={(e) => updateField('recipientName', e.target.value)}
                        placeholder="Nama dan Gelar Lengkap..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 font-medium"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Jabatan Penerima</label>
                      <input
                        type="text"
                        value={selectedQuote.recipientTitle}
                        onChange={(e) => updateField('recipientTitle', e.target.value)}
                        placeholder="Misal: Plt. Kepala Dinas, Humas..."
                        className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Nama Instansi / Perusahaan</label>
                    <input
                      type="text"
                      value={selectedQuote.recipientCompany}
                      onChange={(e) => updateField('recipientCompany', e.target.value)}
                      placeholder="Nama Kantor Dinas / Swasta..."
                      className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Alamat Instansi</label>
                    <textarea
                      value={selectedQuote.recipientAddress}
                      onChange={(e) => updateField('recipientAddress', e.target.value)}
                      placeholder="Alamat kantor lengkap, Kota..."
                      rows={2}
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 resize-y"
                    />
                  </div>
                </div>
              </div>

            </div>

            {/* Paragraph Text Content for Opening & Closing */}
            <div className="space-y-4 text-left">
              <div>
                <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Draf Paragraf Pembuka (Body Opening)</label>
                <textarea
                  value={selectedQuote.bodyOpening}
                  onChange={(e) => updateField('bodyOpening', e.target.value)}
                  placeholder="Ketik salam pembuka & pengantar surat..."
                  rows={4}
                  className="w-full px-4 py-2.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 leading-relaxed font-sans"
                />
              </div>
            </div>

            {/* Pricing Offer Items List - The Core of Quotation */}
            <div className="border border-slate-150 rounded-xl p-4 bg-slate-50/35 space-y-4 text-left">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider flex items-center gap-1.5">
                  <Coins className="w-3.5 h-3.5 text-sky-600" />
                  Rincian Penawaran & Anggaran Biaya
                </h4>
                <button
                  type="button"
                  onClick={addPricingItem}
                  className="text-xs text-sky-600 hover:text-sky-850 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Tambah Item Penawaran
                </button>
              </div>

              {selectedQuote.items.length === 0 ? (
                <div className="py-8 bg-white rounded-lg border border-dashed border-slate-200 text-center text-xs text-slate-400 italic">
                  Belum ada baris anggaran. Klik tombol "Tambah Item Penawaran" untuk menyisipkan baris harga baru.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedQuote.items.map((item, idx) => (
                    <div 
                      key={item.id}
                      className="bg-white p-3.5 rounded-lg border border-slate-200 relative group flex flex-col md:flex-row md:items-center gap-3"
                    >
                      {/* Form item row */}
                      <div className="flex-1 space-y-2">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-2">
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => updatePricingItem(item.id, 'name', e.target.value)}
                            placeholder="Nama Layanan / Paket Berita..."
                            className="md:col-span-5 px-2.5 py-1.5 text-xs rounded bg-slate-50 border border-slate-200 font-bold text-slate-800"
                          />
                          <input
                            type="text"
                            value={item.description}
                            onChange={(e) => updatePricingItem(item.id, 'description', e.target.value)}
                            placeholder="Detail / Manfaat layanan..."
                            className="md:col-span-7 px-2.5 py-1.5 text-xs rounded bg-slate-50 border border-slate-200 text-slate-600"
                          />
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div>
                            <span className="text-[9px] text-slate-400 block mb-0.5">Kuantitas</span>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updatePricingItem(item.id, 'quantity', e.target.value)}
                              className="w-full px-2 py-1 text-xs rounded bg-slate-50 border border-slate-200 font-mono text-center"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 block mb-0.5">Satuan</span>
                            <input
                              type="text"
                              value={item.unit}
                              onChange={(e) => updatePricingItem(item.id, 'unit', e.target.value)}
                              placeholder="e.g. Berita / Bln"
                              className="w-full px-2 py-1 text-xs rounded bg-slate-50 border border-slate-200 text-center"
                            />
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-400 block mb-0.5">Harga Satuan (Rp)</span>
                            <input
                              type="number"
                              step="10000"
                              value={item.price}
                              onChange={(e) => updatePricingItem(item.id, 'price', e.target.value)}
                              className="w-full px-2 py-1 text-xs rounded bg-slate-50 border border-slate-200 font-mono text-right"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Remove item action */}
                      <button
                        onClick={() => removePricingItem(item.id)}
                        className="text-slate-300 hover:text-red-500 self-end md:self-center transition-colors cursor-pointer p-1 rounded hover:bg-red-50 shrink-0"
                        title="Hapus baris harga ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}

                  {/* VAT control & visual calculation */}
                  <div className="mt-4 p-3 bg-white rounded-lg border border-slate-100 flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={selectedQuote.showVat}
                          onChange={(e) => updateField('showVat', e.target.checked)}
                          className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                        />
                        <span>Terapkan Pajak PPN</span>
                      </label>
                      {selectedQuote.showVat && (
                        <div className="flex items-center gap-1.5 bg-slate-100 px-2 py-1 rounded">
                          <input
                            type="number"
                            min="0"
                            max="100"
                            value={selectedQuote.vatPercent}
                            onChange={(e) => updateField('vatPercent', Number(e.target.value))}
                            className="w-11 px-1 text-center font-mono font-bold bg-white text-xs border border-slate-200 rounded"
                          />
                          <span className="text-xs text-slate-500 font-bold">%</span>
                        </div>
                      )}
                    </div>
                    <div className="text-right space-y-0.5 text-xs font-semibold">
                      <div className="text-slate-400">Subtotal: <span className="text-slate-700 font-mono">{formatRupiah(getSubtotal())}</span></div>
                      {selectedQuote.showVat && (
                        <span className="text-slate-400 block">PPN ({selectedQuote.vatPercent}%): <span className="text-slate-700 font-mono">{formatRupiah(getTax())}</span></span>
                      )}
                      <span className="text-slate-900 font-black block">Grand Total: <span className="text-sky-600 font-mono text-sm">{formatRupiah(getGrandTotal())}</span></span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Closing text & Signer config */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
              
              <div className="md:col-span-2">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase block mb-1">Draf Paragraf Penutup (Closing Wordings)</label>
                <textarea
                  value={selectedQuote.bodyClosing}
                  onChange={(e) => updateField('bodyClosing', e.target.value)}
                  placeholder="Ketik salam penutup surat..."
                  rows={3}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 leading-relaxed font-sans"
                />
              </div>

              <div className="space-y-3.5 bg-slate-50/40 p-4 border border-slate-100 rounded-xl">
                <h5 className="text-[10.5px] font-extrabold uppercase text-slate-400 tracking-wider block">Otorisasi Penandatangan</h5>
                
                <div className="flex items-center gap-2 py-1 bg-white px-2.5 rounded-lg border border-slate-200/60 shadow-2xs">
                  <input
                    type="checkbox"
                    id="showSignStampQuote"
                    checked={showSignatureStamp}
                    onChange={(e) => setShowSignatureStamp(e.target.checked)}
                    className="rounded border-slate-300 focus:ring-[#CC0000] text-[#CC0000] cursor-pointer"
                  />
                  <label htmlFor="showSignStampQuote" className="font-bold text-slate-600 text-[10px] cursor-pointer select-none">
                    Sertakan Tanda Tangan & Stempel
                  </label>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-0.5">Nama Pejabat</label>
                    <input
                      type="text"
                      value={selectedQuote.signerName}
                      onChange={(e) => updateField('signerName', e.target.value)}
                      placeholder="Nama Terang & Gelar..."
                      className="w-full px-2 py-1.5 text-xs rounded bg-white border border-slate-200 text-slate-805 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-slate-500 block mb-0.5">Jabatan Resmi</label>
                    <input
                      type="text"
                      value={selectedQuote.signerTitle}
                      onChange={(e) => updateField('signerTitle', e.target.value)}
                      placeholder="Direktur Utama..."
                      className="w-full px-2 py-1.5 text-xs rounded bg-white border border-slate-200 text-slate-800"
                    />
                  </div>
                </div>
              </div>

            </div>

          </div>
        ) : null}

        {/* --- HIGH FIDELITY PAPER DESIGN PREVIEW GRID (CENTRED SHEET STYLE) --- */}
        {selectedQuote ? (
          <div className="space-y-3">
            <span className="text-xs font-black uppercase tracking-widest text-slate-400 text-left block no-print-element">
              Pratinjau Hasil Cetak Lembar A4 (Live Preview)
            </span>
            
            {/* Centered A4 Letter Canvas Wrapper */}
            <div className="flex justify-center bg-slate-200/50 p-4 sm:p-8 rounded-2xl border border-slate-250 shadow-inner overflow-x-auto no-scrollbar">
              
              {/* Actual paper dimensions structured in CSS */}
              <div 
                id="print-section"
                className="w-[210mm] min-h-[297mm] bg-white shadow-2xl pt-[2cm] pb-[0.25cm] pl-[2.54cm] pr-[2.54cm] relative text-slate-800 font-sans leading-relaxed tracking-normal select-text border border-white text-left flex flex-col justify-between print:block shrink-0"
                style={{ contentVisibility: 'auto' }}
              >
                
                {/* --- REPEATING PRINT HEADER (Only visible on physical print pages, fixed top) --- */}
                <div className="hidden print:block fixed top-[1.25cm] left-0 w-[210mm] h-[37.5mm] pl-[2.54cm] pr-[2.54cm] bg-white z-[100] pointer-events-none">
                  {renderKopSurat()}
                </div>

                {/* --- REPEATING PRINT FOOTER (Only visible on physical print pages, fixed bottom) --- */}
                <div className="hidden print:block fixed bottom-[1.25cm] left-0 w-[210mm] h-[15mm] pl-[2.54cm] pr-[2.54cm] bg-white z-[100] pointer-events-none">
                  {renderFooterStripping()}
                </div>

                {/* --- MAIN PAGE TABULAR CONTAINER --- */}
                <table className="w-full border-collapse border-none m-0 p-0 relative z-10">
                  {/* Table Header Space Reservation */}
                  <thead>
                    <tr className="border-none m-0 p-0">
                      <td className="p-0 border-none m-0">
                        <div className="hidden print:block h-[37.5mm] w-full" />
                      </td>
                    </tr>
                  </thead>

                  {/* Core Letter Body flow */}
                  <tbody>
                    <tr className="border-none m-0 p-0">
                      <td className="p-0 border-none m-0 text-left">
                        <div className="relative">
                          
                          {/* SCREEN-ONLY (Live Preview Mode) HEADER LOGO & KOP SURAT */}
                          <div className="print:hidden">
                            {renderKopSurat()}
                          </div>

                          {/* --- SUBTLE CENTER WATERMARK BACKGROUND --- */}
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 overflow-hidden">
                            <div className="w-[420px] h-[420px] rounded-full bg-[#E7312F]/[0.025] border-2 border-[#E7312F]/[0.02] flex items-center justify-center relative scale-110">
                              {/* Stylized M inside watermark */}
                              <svg viewBox="0 0 100 100" className="w-[75%] h-[75%] fill-none stroke-[#E7312F]/[0.015]" strokeWidth="6" strokeLinecap="round">
                                <path d="M15,80 L15,35 C15,25 30,15 50,45 C70,15 85,25 85,35 L85,80" />
                                <path d="M50,45 L50,80" />
                              </svg>
                              {/* Antenna circles */}
                              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[60%] w-16 h-16 rounded-full border-2 border-dashed border-[#E7312F]/[0.015]"></div>
                            </div>
                          </div>

                          {/* --- DOCUMENT INFORMATION HEADER (No Surat, Lampiran, Hal) --- */}
                          <div className="mt-8 grid grid-cols-12 gap-2 text-xs relative z-10 text-slate-800">
                            <div className="col-span-8 space-y-1">
                              <div className="flex">
                                <span className="w-20 font-bold block shrink-0 text-slate-600">Nomor</span>
                                <span className="w-4 text-center">:</span>
                                <strong className="font-mono text-slate-850 font-semibold">{selectedQuote.letterNumber}</strong>
                              </div>
                              <div className="flex">
                                <span className="w-20 font-bold block shrink-0 text-slate-600">Lampiran</span>
                                <span className="w-4 text-center">:</span>
                                <span className="text-slate-800">{selectedQuote.attachments || '-'}</span>
                              </div>
                              <div className="flex align-top">
                                <span className="w-20 font-bold block shrink-0 text-slate-600">Perihal</span>
                                <span className="w-4 text-center shrink-0">:</span>
                                <u className="font-extrabold text-slate-900 leading-tight block">{selectedQuote.subject}</u>
                              </div>
                            </div>

                            <div className="col-span-4 text-right">
                              <span className="text-slate-800 font-bold whitespace-nowrap block">
                                Kediri, {formatIndonesianDate(selectedQuote.date)}
                              </span>
                            </div>
                          </div>

                          {/* --- RECIPIENT BLOCK (Kepada Yth.) --- */}
                          <div className="mt-7 text-xs space-y-1 text-slate-800 relative z-10 leading-relaxed max-w-[80%]">
                            <p className="font-semibold text-slate-500">Kepada Yang Terhormat,</p>
                            <p className="font-black text-slate-900 text-[13px]">{selectedQuote.recipientName}</p>
                            <p className="font-semibold text-slate-700">{selectedQuote.recipientTitle}</p>
                            <p className="font-black text-slate-800 uppercase text-[11px] font-sans">{selectedQuote.recipientCompany}</p>
                            <p className="text-slate-600 italic leading-snug">{selectedQuote.recipientAddress}</p>
                          </div>

                          {/* --- BODY OPENING --- */}
                          <div className="mt-7 text-xs text-slate-800 text-justify relative z-10 leading-relaxed whitespace-pre-line font-sans">
                            {selectedQuote.bodyOpening}
                          </div>

                          {/* --- PRICE PROPOSAL TABLE --- */}
                          {selectedQuote.items.length > 0 && (
                            <div className="mt-6 relative z-10">
                              <table className="w-full border-collapse border border-slate-300 text-[11px] leading-relaxed shadow-3xs rounded-md overflow-hidden text-slate-800 font-sans">
                                <thead>
                                  <tr className="bg-[#E7312F] text-white text-center font-extrabold uppercase tracking-wide">
                                    <th className="border border-slate-300 py-2.5 px-2 w-[5%]">No</th>
                                    <th className="border border-slate-300 py-2.5 px-3 w-[40%] text-left">Nama Program / Paket Layanan</th>
                                    <th className="border border-slate-300 py-2.5 px-2 w-[15%]">Volume</th>
                                    <th className="border border-slate-300 py-2.5 px-3 w-[18%] text-right">Harga Satuan</th>
                                    <th className="border border-slate-300 py-2.5 px-3 w-[22%] text-right">Jumlah Total (Rp)</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {selectedQuote.items.map((item, index) => (
                                    <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                                      <td className="border border-slate-200 py-2.5 text-center font-bold font-mono">{index + 1}</td>
                                      <td className="border border-slate-200 py-2.5 px-3 text-left">
                                        <div className="font-black text-slate-900 text-xs">{item.name}</div>
                                        {item.description && (
                                          <div className="text-[10px] text-slate-500 font-medium leading-snug mt-0.5">{item.description}</div>
                                        )}
                                      </td>
                                      <td className="border border-slate-200 py-2.5 text-center font-semibold font-mono">
                                        {item.quantity} {item.unit}
                                      </td>
                                      <td className="border border-slate-200 py-2.5 px-3 text-right font-mono font-medium">
                                        {formatRupiah(item.price)}
                                      </td>
                                      <td className="border border-slate-200 py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                                        {formatRupiah(item.quantity * item.price)}
                                      </td>
                                    </tr>
                                  ))}
                                  
                                  {/* Financial Summaries layout inside table */}
                                  <tr className="bg-slate-100 font-bold">
                                    <td colSpan={4} className="border border-slate-200 py-2 px-3 text-right text-slate-600 uppercase tracking-wider text-[10px] font-extrabold">Subtotal Biaya Penawaran</td>
                                    <td className="border border-slate-200 py-2 px-3 text-right font-mono text-slate-900 text-xs">{formatRupiah(getSubtotal())}</td>
                                  </tr>
                                  {selectedQuote.showVat && (
                                    <tr className="bg-slate-100 font-bold">
                                      <td colSpan={4} className="border border-slate-200 py-2 px-3 text-right text-slate-600 uppercase tracking-wider text-[10px] font-extrabold">Pajak PPN ({selectedQuote.vatPercent}%)</td>
                                      <td className="border border-slate-200 py-2 px-3 text-right font-mono text-slate-900 text-xs">{formatRupiah(getTax())}</td>
                                    </tr>
                                  )}
                                  <tr className="bg-slate-200/80 font-black text-slate-900">
                                    <td colSpan={4} className="border border-slate-200 py-2.5 px-3 text-right uppercase tracking-wider text-[10.5px]">Total Penawaran Akhir (Nett)</td>
                                    <td className="border border-slate-200 py-2.5 px-3 text-right font-mono text-[#E7312F] text-sm">{formatRupiah(getGrandTotal())}</td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          )}

                          {/* --- BODY CLOSING --- */}
                          <div className="mt-6 text-xs text-slate-800 text-justify relative z-10 leading-relaxed whitespace-pre-line font-sans">
                            {selectedQuote.bodyClosing}
                          </div>

                          {/* --- FOOTER BLOCK: SIGNATURE PANEL --- */}
                          <div className="mt-12 relative z-10">
                            <div className="grid grid-cols-12 gap-4 text-xs font-sans text-slate-800">
                              <div className="col-span-7">
                                {/* Optional notes area */}
                                <p className="text-[10px] text-slate-400 font-medium italic block mt-1 leading-normal max-w-[85%]">
                                  * Penawaran ini bersifat mengikat selama 30 hari kalender sejak diterbitkan dan dapat diturunkan ke perjanjian nota kesepahaman (MOU).
                                </p>
                              </div>

                              <div className="col-span-5 text-center flex flex-col justify-end space-y-1">
                                <p className="font-extrabold text-slate-900 uppercase tracking-wide leading-none">Hormat Kami,</p>
                                <p className="font-bold text-slate-700 block leading-none">PT. Portal Digital Media Nusantara</p>
                                
                                {/* Reserved space for manual signature and actual physical wet stamp */}
                                <div className="h-20 w-44 mx-auto relative flex items-center justify-center select-none shrink-0 overflow-visible">
                                  {showSignatureStamp && (
                                    <img 
                                      src="https://lh3.googleusercontent.com/d/1OfIPF_BA2X7qI1LSKJZTF3Wv-NKGedmf" 
                                      alt="Tanda Tangan & Pengesahan" 
                                      className="absolute h-[120px] max-w-none object-contain pointer-events-none select-none mix-blend-multiply z-30 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
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
                                  <strong className="text-slate-900 font-black text-xs block uppercase underline leading-none">
                                    {selectedQuote.signerName}
                                  </strong>
                                  <span className="text-slate-500 font-bold block text-[10px] leading-tight mt-0.5">
                                    {selectedQuote.signerTitle}
                                  </span>
                                </div>
                              </div>
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
                        <div className="hidden print:block h-[25mm] w-full" />
                      </td>
                    </tr>
                  </tfoot>
                </table>

              </div>

            </div>

          </div>
        ) : (
          <div className="py-20 text-center bg-white rounded-2xl border border-slate-100 italic text-sm text-slate-400" id="quote-no-selected-placeholder">
            Silakan pilih salah satu surat penawaran dari panel kiri, atau buat surat penawaran baru.
          </div>
        )}

      </div>

    </div>
  );
}
