/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  INITIAL_ARTICLES, 
  INITIAL_JOURNALISTS, 
  INITIAL_CATEGORIES, 
  MONTHS 
} from './data';
import { Article, Journalist, Category, Personnel } from './types';
import JournalistChart from './components/JournalistChart';
import ArticleList from './components/ArticleList';
import ArticleModal from './components/ArticleModal';
import ManagementPanel from './components/ManagementPanel';
import PersonnelPanel from './components/PersonnelPanel';
import { db, collection, getDocs, setDoc, doc, deleteDoc, updateDoc } from './firebase';
import { 
  LayoutDashboard, 
  Newspaper, 
  Award, 
  Settings, 
  Plus, 
  Calendar, 
  TrendingUp, 
  FileText, 
  CheckCircle, 
  Layers, 
  Users, 
  Sparkles,
  Download,
  Lock,
  Eye,
  EyeOff,
  Edit3,
  X,
  Save
} from 'lucide-react';

export default function App() {
  // --- Firebase Loading State & Synchronized States ---
  const [articles, setArticles] = useState<Article[]>([]);
  const [journalists, setJournalists] = useState<Journalist[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [personnels, setPersonnels] = useState<Personnel[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- Login / Profile Session State ---
  const [currentUser, setCurrentUser] = useState<Personnel | null>(() => {
    const saved = localStorage.getItem('metaranews_current_user');
    return saved ? JSON.parse(saved) : null;
  });

  // --- Login Form State ---
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // --- Active Tab State ---
  const [selectedMonth, setSelectedMonth] = useState('2026-06'); // Default to current mock month
  const [activeTab, setActiveTab] = useState<'laporan' | 'berita' | 'sistem' | 'personil'>('laporan');
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);

  // --- Profile Settings Modal State ---
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileFullName, setProfileFullName] = useState('');
  const [profileUsername, setProfileUsername] = useState('');
  const [profilePassword, setProfilePassword] = useState('');
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  // Fetch all collections from Firestore on mount
  useEffect(() => {
    let active = true;
    let fallbackTriggered = false;

    // Timeout: if connection or query takes more than 5 seconds, switch to local storage fallback
    const timeoutId = setTimeout(() => {
      if (active) {
        console.warn("Koneksi Firebase lambat atau gagal. Menggunakan penyimpanan lokal sebagai cadangan.");
        fallbackTriggered = true;
        loadLocalFallback();
      }
    }, 5000);

    function loadLocalFallback() {
      const localArticles = localStorage.getItem('metaranews_articles');
      const localJournalists = localStorage.getItem('metaranews_journalists');
      const localCategories = localStorage.getItem('metaranews_categories');
      const localPersonnels = localStorage.getItem('metaranews_personnels');

      setArticles(localArticles ? JSON.parse(localArticles) : INITIAL_ARTICLES);
      setJournalists(localJournalists ? JSON.parse(localJournalists) : INITIAL_JOURNALISTS);
      setCategories(localCategories ? JSON.parse(localCategories) : INITIAL_CATEGORIES);

      const defaultPersonnels: Personnel[] = [
        { id: 'p1', username: 'admin', password: 'admin123', role: 'Admin', fullName: 'Admin Redaksi', journalistId: 'j9' },
        { id: 'p2', username: 'manager', password: 'manager123', role: 'Manager', fullName: 'Siti Aminah', journalistId: 'j2' },
        { id: 'p3', username: 'staff', password: 'staff123', role: 'Staff', fullName: 'Budi Santoso', journalistId: 'j1' }
      ];
      setPersonnels(localPersonnels ? JSON.parse(localPersonnels) : defaultPersonnels);
      setIsLoading(false);
    }
    
    async function loadData() {
      try {
        setIsLoading(true);
        
        // Fetch journalists
        const jSnap = await getDocs(collection(db, 'journalists'));
        if (fallbackTriggered) return;
        let jList = jSnap.docs.map(docSnap => docSnap.data() as Journalist);
        
        // Fetch categories
        const cSnap = await getDocs(collection(db, 'categories'));
        if (fallbackTriggered) return;
        let cList = cSnap.docs.map(docSnap => docSnap.data() as Category);
        
        // Fetch articles
        const aSnap = await getDocs(collection(db, 'articles'));
        if (fallbackTriggered) return;
        let aList = aSnap.docs.map(docSnap => docSnap.data() as Article);

        // Fetch personnels
        const pSnap = await getDocs(collection(db, 'personnels'));
        if (fallbackTriggered) return;
        let pList = pSnap.docs.map(docSnap => docSnap.data() as Personnel);

        // --- SEED SECTIONS INDEPENDENTLY IF EMPTY IN FIRESTORE ---
        if (jList.length === 0) {
          console.log("Seeding INITIAL_JOURNALISTS to Firebase...");
          for (const j of INITIAL_JOURNALISTS) {
            await setDoc(doc(db, 'journalists', j.id), j);
          }
          jList = INITIAL_JOURNALISTS;
        }

        if (cList.length === 0) {
          console.log("Seeding INITIAL_CATEGORIES to Firebase...");
          for (const c of INITIAL_CATEGORIES) {
            await setDoc(doc(db, 'categories', c.id), c);
          }
          cList = INITIAL_CATEGORIES;
        }

        if (aList.length === 0) {
          console.log("Seeding INITIAL_ARTICLES to Firebase...");
          for (const a of INITIAL_ARTICLES) {
            await setDoc(doc(db, 'articles', a.id), a);
          }
          aList = INITIAL_ARTICLES;
        }

        if (pList.length === 0) {
          console.log("Seeding default personnels to Firebase...");
          const defaultPersonnels: Personnel[] = [
            { id: 'p1', username: 'admin', password: 'admin123', role: 'Admin', fullName: 'Admin Redaksi', journalistId: 'j9' },
            { id: 'p2', username: 'manager', password: 'manager123', role: 'Manager', fullName: 'Siti Aminah', journalistId: 'j2' },
            { id: 'p3', username: 'staff', password: 'staff123', role: 'Staff', fullName: 'Budi Santoso', journalistId: 'j1' }
          ];
          for (const p of defaultPersonnels) {
            await setDoc(doc(db, 'personnels', p.id), p);
          }
          pList = defaultPersonnels;
        }

        if (active && !fallbackTriggered) {
          clearTimeout(timeoutId);
          setJournalists(jList);
          setCategories(cList);
          setArticles(aList);
          setPersonnels(pList);
          
          // Save a localized copy in case of future network interruption
          localStorage.setItem('metaranews_articles', JSON.stringify(aList));
          localStorage.setItem('metaranews_journalists', JSON.stringify(jList));
          localStorage.setItem('metaranews_categories', JSON.stringify(cList));
          localStorage.setItem('metaranews_personnels', JSON.stringify(pList));
          
          setIsLoading(false);
        }
      } catch (err) {
        console.error("Gagal memuat data dari Firebase Firestore:", err);
        if (active && !fallbackTriggered) {
          clearTimeout(timeoutId);
          loadLocalFallback();
        }
      }
    }
    
    loadData();
    
    return () => {
      active = false;
      clearTimeout(timeoutId);
    };
  }, []);

  // Save changes to localStorage as a redundant backup layer
  useEffect(() => {
    if (articles.length > 0) {
      localStorage.setItem('metaranews_articles', JSON.stringify(articles));
    }
  }, [articles]);

  useEffect(() => {
    if (journalists.length > 0) {
      localStorage.setItem('metaranews_journalists', JSON.stringify(journalists));
    }
  }, [journalists]);

  useEffect(() => {
    if (categories.length > 0) {
      localStorage.setItem('metaranews_categories', JSON.stringify(categories));
    }
  }, [categories]);

  useEffect(() => {
    if (personnels.length > 0) {
      localStorage.setItem('metaranews_personnels', JSON.stringify(personnels));
    }
  }, [personnels]);

  // Enforce access rights tab limits
  useEffect(() => {
    if (!currentUser) return;
    
    // Staff cannot view 'sistem' or 'personil' tabs
    if (currentUser.role === 'Staff' && (activeTab === 'sistem' || activeTab === 'personil')) {
      setActiveTab('laporan');
    }
    // Manager cannot view 'personil' tab
    if (currentUser.role === 'Manager' && activeTab === 'personil') {
      setActiveTab('laporan');
    }
  }, [currentUser, activeTab]);

  // --- Calculations for Selected Month ---
  const filteredArticles = useMemo(() => {
    if (selectedMonth === 'all') return articles;
    return articles.filter((a) => a.date.startsWith(selectedMonth));
  }, [articles, selectedMonth]);

  const stats = useMemo(() => {
    const total = filteredArticles.length;
    const karyaSendiri = filteredArticles.filter(a => a.type === 'Karya Sendiri').length;
    const rilis = filteredArticles.filter(a => a.type === 'Rilis').length;
    const views = filteredArticles.reduce((sum, a) => sum + (a.views || 0), 0);
    
    // Collaboration Ratio: % of news that involved more than 1 journalist or specialized photographer
    const collaborated = filteredArticles.filter(
      a => (a.reporter !== a.writer) || (a.documenter !== 'Tidak ada / Admin' && a.documenter !== a.reporter)
    ).length;
    const collabRatio = total > 0 ? Math.round((collaborated / total) * 100) : 0;

    return {
      total,
      karyaSendiri,
      rilis,
      views,
      collabRatio
    };
  }, [filteredArticles]);

  // --- Actions ---
  const handleSaveArticle = async (articleData: Omit<Article, 'id'> & { id?: string }) => {
    try {
      if (articleData.id) {
        // Edit mode
        const updated = articles.map(art => art.id === articleData.id ? { ...art, ...articleData } as Article : art);
        setArticles(updated);
        localStorage.setItem('metaranews_articles', JSON.stringify(updated));
        try {
          await setDoc(doc(db, 'articles', articleData.id), { ...articleData } as Article);
        } catch (dbErr) {
          console.warn("Sinkronisasi Firestore gagal, data disimpan secara lokal:", dbErr);
        }
      } else {
        // Add mode
        const newId = `a-${Date.now()}`;
        const newArticle: Article = {
          ...articleData,
          id: newId
        } as Article;
        const updated = [newArticle, ...articles];
        setArticles(updated);
        localStorage.setItem('metaranews_articles', JSON.stringify(updated));
        try {
          await setDoc(doc(db, 'articles', newId), newArticle);
        } catch (dbErr) {
          console.warn("Sinkronisasi Firestore gagal, data disimpan secara lokal:", dbErr);
        }
      }
    } catch (err) {
      console.error("Gagal menyimpan artikel:", err);
    }
    setEditingArticle(null);
  };

  const handleDeleteArticle = async (id: string) => {
    try {
      const updated = articles.filter(a => a.id !== id);
      setArticles(updated);
      localStorage.setItem('metaranews_articles', JSON.stringify(updated));
      try {
        await deleteDoc(doc(db, 'articles', id));
      } catch (dbErr) {
        console.warn("Gagal menghapus item dari Firestore, perubahan tetap disimpan di browser:", dbErr);
      }
    } catch (err) {
      console.error("Gagal menghapus artikel:", err);
    }
  };

  const handleEditArticleTrigger = (article: Article) => {
    setEditingArticle(article);
    setIsArticleModalOpen(true);
  };

  // Add a new journalist to roster
  const handleAddJournalist = async (name: string, role: Journalist['role'], coverage: string) => {
    try {
      const newJurn: Journalist = {
        id: `j-${Date.now()}`,
        name,
        role,
        coverage
      };
      const updated = [...journalists, newJurn];
      setJournalists(updated);
      localStorage.setItem('metaranews_journalists', JSON.stringify(updated));
      try {
        await setDoc(doc(db, 'journalists', newJurn.id), newJurn);
      } catch (dbErr) {
        console.warn("Gagal mengunggah jurnalis ke Firestore, tersimpan lokal:", dbErr);
      }
    } catch (err) {
      console.error("Gagal menyimpan jurnalis:", err);
    }
  };

  const handleDeleteJournalist = async (id: string) => {
    try {
      const updated = journalists.filter(j => j.id !== id);
      setJournalists(updated);
      localStorage.setItem('metaranews_journalists', JSON.stringify(updated));
      try {
        await deleteDoc(doc(db, 'journalists', id));
      } catch (dbErr) {
        console.warn("Gagal menghapus jurnalis di Firestore, tersimpan lokal:", dbErr);
      }
    } catch (err) {
      console.error("Gagal menghapus jurnalis:", err);
    }
  };

  const handleEditJournalist = async (id: string, name: string, role: Journalist['role'], coverage: string) => {
    try {
      const oldJurn = journalists.find(j => j.id === id);
      const oldName = oldJurn ? oldJurn.name : '';

      const updatedJs = journalists.map(j => j.id === id ? { ...j, name, role, coverage } : j);
      setJournalists(updatedJs);
      localStorage.setItem('metaranews_journalists', JSON.stringify(updatedJs));
      try {
        await setDoc(doc(db, 'journalists', id), { id, name, role, coverage });
      } catch (dbErr) {
        console.warn("Gagal memperbarui jurnalis di Firestore, tersimpan lokal:", dbErr);
      }

      if (oldName && oldName !== name) {
        const updatedArticles = articles.map(art => {
          const updated = { ...art };
          let changed = false;
          if (updated.reporter === oldName) { updated.reporter = name; changed = true; }
          if (updated.writer === oldName) { updated.writer = name; changed = true; }
          if (updated.documenter === oldName) { updated.documenter = name; changed = true; }
          return { updated, changed };
        });

        const newArticles = articles.map((art, index) => updatedArticles[index].changed ? updatedArticles[index].updated : art);
        setArticles(newArticles);
        localStorage.setItem('metaranews_articles', JSON.stringify(newArticles));

        // Sync renamed references in Firestore non-blockingly
        for (const item of updatedArticles) {
          if (item.changed) {
            try {
              await setDoc(doc(db, 'articles', item.updated.id), item.updated);
            } catch (dbErr) {
              console.warn("Gagal menyelaraskan referensi jurnalis di artikel:", dbErr);
            }
          }
        }
      }
    } catch (err) {
      console.error("Gagal memperbarui jurnalis:", err);
    }
  };

  // Add a new news category
  const handleAddCategory = async (name: string, color: string) => {
    try {
      const newCat: Category = {
        id: name.trim().toLowerCase().replace(/\s+/g, '-'),
        name,
        color
      };
      const updated = [...categories, newCat];
      setCategories(updated);
      localStorage.setItem('metaranews_categories', JSON.stringify(updated));
      try {
        await setDoc(doc(db, 'categories', newCat.id), newCat);
      } catch (dbErr) {
        console.warn("Gagal menyimpan kategori ke Firestore, tersimpan lokal:", dbErr);
      }
    } catch (err) {
      console.error("Gagal menyimpan kategori:", err);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    try {
      const updated = categories.filter(c => c.id !== id);
      setCategories(updated);
      localStorage.setItem('metaranews_categories', JSON.stringify(updated));
      try {
        await deleteDoc(doc(db, 'categories', id));
      } catch (dbErr) {
        console.warn("Gagal menghapus kategori dari Firestore, tersimpan lokal:", dbErr);
      }
    } catch (err) {
      console.error("Gagal menghapus kategori:", err);
    }
  };

  const handleEditCategory = async (id: string, name: string, color: string) => {
    try {
      const updatedCat = { id, name, color };
      const updated = categories.map(c => c.id === id ? updatedCat : c);
      setCategories(updated);
      localStorage.setItem('metaranews_categories', JSON.stringify(updated));
      try {
        await setDoc(doc(db, 'categories', id), updatedCat);
      } catch (dbErr) {
        console.warn("Gagal memperbarui kategori di Firestore, tersimpan lokal:", dbErr);
      }
    } catch (err) {
      console.error("Gagal memperbarui kategori:", err);
    }
  };

  // --- Personnel Credentials Operations ---
  const handleAddPersonnel = async (fullName: string, username: string, password: string, role: Personnel['role'], jId?: string) => {
    try {
      const newPers: Personnel = {
        id: `p-${Date.now()}`,
        username,
        password,
        role,
        fullName,
        journalistId: jId
      };
      const updated = [...personnels, newPers];
      setPersonnels(updated);
      localStorage.setItem('metaranews_personnels', JSON.stringify(updated));
      try {
        await setDoc(doc(db, 'personnels', newPers.id), newPers);
      } catch (dbErr) {
        console.warn("Gagal mengunggah personil ke Firestore, tersimpan lokal:", dbErr);
      }
    } catch (err) {
      console.error("Gagal menyimpan personil:", err);
    }
  };

  const handleUpdatePersonnel = async (id: string, updated: Partial<Personnel>) => {
    try {
      setPersonnels(prev => {
        const exists = prev.some(p => p.id === id);
        let updatedList: Personnel[];
        if (exists) {
          updatedList = prev.map(p => p.id === id ? { ...p, ...updated } as Personnel : p);
        } else {
          const base: Personnel = (currentUser && currentUser.id === id)
            ? currentUser
            : { id, username: '', password: '', fullName: '', role: 'Staff' };
          const newItem = { ...base, ...updated } as Personnel;
          updatedList = [...prev, newItem];
        }
        localStorage.setItem('metaranews_personnels', JSON.stringify(updatedList));
        return updatedList;
      });

      // Directly sync target state from local storage write to avoid state closure delay
      const localUpdatedList = JSON.parse(localStorage.getItem('metaranews_personnels') || '[]');
      const targetDoc = localUpdatedList.find((p: Personnel) => p.id === id);
      if (targetDoc) {
        try {
          await setDoc(doc(db, 'personnels', id), targetDoc);
        } catch (dbErr) {
          console.warn("Gagal memutasi personil di Firestore, disimpan lokal:", dbErr);
        }
      }

      if (currentUser && currentUser.id === id) {
        const refreshed = { ...currentUser, ...updated } as Personnel;
        setCurrentUser(refreshed);
        localStorage.setItem('metaranews_current_user', JSON.stringify(refreshed));
      }
    } catch (err) {
      console.error("Gagal memperbarui personil:", err);
      throw err;
    }
  };

  const handleDeletePersonnel = async (id: string) => {
    try {
      const updated = personnels.filter(p => p.id !== id);
      setPersonnels(updated);
      localStorage.setItem('metaranews_personnels', JSON.stringify(updated));
      try {
        await deleteDoc(doc(db, 'personnels', id));
      } catch (dbErr) {
        console.warn("Gagal menghapus personil di Firestore, tersimpan lokal:", dbErr);
      }
    } catch (err) {
      console.error("Gagal menghapus personil:", err);
    }
  };

  // --- Current User Profile Save Operation ---
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess(false);

    if (!currentUser) return;
    if (!profileFullName.trim()) {
      setProfileError('Nama lengkap tidak boleh kosong.');
      return;
    }
    if (!profileUsername.trim() || profileUsername.trim().length < 3) {
      setProfileError('Username minimal 3 karakter.');
      return;
    }
    if (!profilePassword.trim() || profilePassword.trim().length < 4) {
      setProfileError('Password minimal 4 karakter.');
      return;
    }

    // Check duplicate username
    const dup = personnels.some(p => p.id !== currentUser.id && p.username.toLowerCase() === profileUsername.trim().toLowerCase());
    if (dup) {
      setProfileError('Username sudah dipakai oleh personil lain.');
      return;
    }

    try {
      setProfileLoading(true);
      await handleUpdatePersonnel(currentUser.id, {
        fullName: profileFullName.trim(),
        username: profileUsername.trim().toLowerCase(),
        password: profilePassword
      });
      setProfileSuccess(true);
      setTimeout(() => {
        setIsProfileModalOpen(false);
        setProfileSuccess(false);
      }, 1500);
    } catch (err: any) {
      setProfileError(err.message || 'Gagal menyimpan profil.');
    } finally {
      setProfileLoading(false);
    }
  };

  // --- Dynamic Authentication Handlers ---
  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    if (!loginUsername.trim()) {
      setLoginError('Username tidak boleh kosong.');
      return;
    }
    if (!loginPassword.trim()) {
      setLoginError('Password tidak boleh kosong.');
      return;
    }

    const found = personnels.find(
      p => p.username.toLowerCase() === loginUsername.trim().toLowerCase() && p.password === loginPassword
    );

    if (found) {
      setCurrentUser(found);
      localStorage.setItem('metaranews_current_user', JSON.stringify(found));
      setLoginUsername('');
      setLoginPassword('');
    } else {
      setLoginError('Username atau password salah.');
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('metaranews_current_user');
    setActiveTab('laporan');
  };

  // Helper for Month labels formatting
  const currentMonthLabel = useMemo(() => {
    const found = MONTHS.find(m => m.value === selectedMonth);
    return found ? found.label : 'Semua Bulan';
  }, [selectedMonth]);

  // --- Export Report to CSV/Excel ---
  const handleExportReport = () => {
    const csvRows = [
      ['ID', 'Judul Berita', 'Tanggal', 'Kategori', 'Jenis Karya', 'Liputan (Reporter)', 'Penulis', 'Dokumentasi', 'Status', 'Views']
    ];

    filteredArticles.forEach(a => {
      csvRows.push([
        a.id,
        `"${a.title.replace(/"/g, '""')}"`,
        a.date,
        a.category,
        a.type,
        a.reporter,
        a.writer,
        a.documenter,
        a.status,
        String(a.views)
      ]);
    });

    const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `laporan_produksi_metaranews_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-6 animate-pulse" id="loading-spinner">
        <div className="flex flex-col items-center gap-4 bg-white p-8 rounded-2xl border border-slate-100 shadow-xl max-w-sm w-full text-center">
          <div className="w-10 h-10 border-4 border-sky-600 border-t-transparent rounded-full animate-spin"></div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Menghubungkan ke Firebase...</h3>
            <p className="text-[11px] text-slate-400 mt-1">Mengunduh data performa jurnalistik dan sinkronisasi hak masuk real-time.</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8" id="login-layout">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-sky-500/20 animate-bounce">
            M
          </div>
          <div>
            <span className="font-extrabold text-slate-900 text-lg tracking-tight block leading-none">metaranews<strong className="text-sky-600">.co</strong></span>
            <span className="text-[9px] text-slate-400 font-extrabold uppercase tracking-widest block mt-0.5">Sistem Ruang Redaksi & Hak Akses</span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-xl max-w-md w-full space-y-6">
          <div className="space-y-1">
            <h2 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-sky-600" />
              Sign In Akun Redaksi
            </h2>
            <p className="text-[11px] text-slate-500 font-medium">Masuk untuk mengelola slip berita, rubrik dan personil.</p>
          </div>

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Username</label>
              <input
                type="text"
                placeholder="Masukkan username Anda..."
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-sky-505 text-slate-850 font-semibold"
                id="login-username"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Password</label>
              <div className="relative">
                <input
                  type={showLoginPassword ? 'text' : 'password'}
                  placeholder="Masukkan password Anda..."
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-sky-505 text-slate-855 font-mono"
                  id="login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowLoginPassword(!showLoginPassword)}
                  className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showLoginPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {loginError && <p className="text-xs text-red-600 font-bold mt-1">{loginError}</p>}

            <button
              type="submit"
              className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center font-semibold"
              id="login-btn-submit"
            >
              Sign In Sekarang
            </button>
          </form>

          {/* TESTING PRESETS HELPER */}
          <div className="border-t border-slate-100 pt-4 space-y-2">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">PRESET INSTAN UNTUK PENGUJI (TESTER):</span>
            <div className="grid grid-cols-1 gap-1.5 text-[11px] leading-tight text-slate-600 font-medium font-sans">
              <button 
                type="button"
                onClick={() => { setLoginUsername('admin'); setLoginPassword('admin123'); }}
                className="text-left p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-150 transition-all flex justify-between items-center cursor-pointer"
              >
                <div>
                  <strong className="text-slate-750 block font-bold">🧙‍♂️ Akun Admin (Full Akses)</strong>
                  <span className="text-[10px] text-slate-400 font-mono">user: <strong>admin</strong> | pass: <strong>admin123</strong></span>
                </div>
                <span className="text-[9px] bg-red-105 text-red-700 bg-red-50 font-extrabold px-1.5 py-0.5 rounded uppercase border border-red-200 shadow-2xs">Admin</span>
              </button>

              <button 
                type="button"
                onClick={() => { setLoginUsername('manager'); setLoginPassword('manager123'); }}
                className="text-left p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-150 transition-all flex justify-between items-center cursor-pointer"
              >
                <div>
                  <strong className="text-slate-755 block font-bold">🕵️‍♂️ Akun Manager (Editor)</strong>
                  <span className="text-[10px] text-slate-400 font-mono">user: <strong>manager</strong> | pass: <strong>manager123</strong></span>
                </div>
                <span className="text-[9px] bg-amber-105 text-amber-700 bg-amber-50 font-extrabold px-1.5 py-0.5 rounded uppercase border border-amber-200 shadow-2xs">Manager</span>
              </button>

              <button 
                type="button"
                onClick={() => { setLoginUsername('staff'); setLoginPassword('staff123'); }}
                className="text-left p-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-155 transition-all flex justify-between items-center cursor-pointer"
              >
                <div>
                  <strong className="text-slate-755 block font-bold">✍️ Akun Staff (Reporter)</strong>
                  <span className="text-[10px] text-slate-400 font-mono">user: <strong>staff</strong> | pass: <strong>staff123</strong></span>
                </div>
                <span className="text-[9px] bg-emerald-105 text-emerald-700 bg-emerald-50 font-extrabold px-1.5 py-0.5 rounded uppercase border border-emerald-200 shadow-2xs">Staff</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased font-sans flex flex-col justify-between" id="applet-viewport">
      {/* --- UPPER DECK: NAVIGATION MASTHEAD --- */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-xs" id="nav-masthead">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Branding Logo metaranews */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-sky-600 flex items-center justify-center text-white font-extrabold text-lg tracking-tighter shadow-md shadow-sky-500/20">
                M
              </div>
              <div>
                <div className="flex items-center gap-1.5 leading-none">
                  <span className="font-extrabold text-slate-900 text-md tracking-tight">metaranews</span>
                  <span className="text-sky-600 font-extrabold text-[9px] px-1.5 py-0.5 rounded-sm bg-sky-50 border border-sky-200">ADMIN</span>
                </div>
                <span className="text-[10px] text-slate-400 font-semibold tracking-wide">Sistem Kinerja & Produktivitas Jurnalis</span>
              </div>
            </div>

            {/* Quick Profile context info (Clickable to change credentials) */}
            <div 
              className="flex items-center gap-3 border-l border-slate-150 pl-4 py-1 hover:bg-slate-50/80 cursor-pointer rounded-lg px-2 transition-all group"
              onClick={() => {
                if (currentUser) {
                  setProfileFullName(currentUser.fullName);
                  setProfileUsername(currentUser.username);
                  setProfilePassword(currentUser.password || '');
                  setProfileError('');
                  setProfileSuccess(false);
                  setIsProfileModalOpen(true);
                }
              }}
              title="Klik untuk ubah kredensial akun Anda"
              id="header-profile-selector"
            >
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 group-hover:bg-sky-50 group-hover:text-sky-700 group-hover:border-sky-305 font-extrabold text-xs border border-slate-200 select-none transition-all">
                {currentUser.fullName ? currentUser.fullName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'US'}
              </div>
              <div className="text-left">
                <div className="text-xs font-bold text-slate-850 leading-tight group-hover:text-sky-750 group-hover:underline flex items-center gap-1 transition-all">
                  {currentUser.fullName}
                  <Edit3 className="w-2.5 h-2.5 text-slate-400 group-hover:text-sky-600 inline opacity-60" />
                </div>
                <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1 mt-0.5">
                  <span className={`px-1.5 py-0.2 rounded-sm text-[8px] font-black uppercase ${
                    currentUser.role === 'Admin' ? 'bg-red-50 text-red-650 border border-red-200' :
                    currentUser.role === 'Manager' ? 'bg-amber-50 text-amber-650 border border-amber-200' :
                    'bg-emerald-50 text-emerald-650 border border-emerald-200'
                  }`}>{currentUser.role}</span>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLogout();
                    }}
                    className="text-[10px] text-red-500 hover:text-red-700 font-extrabold ml-1.5 cursor-pointer underline hover:no-underline"
                  >
                    Logout
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* --- DASHBOARD HERO HEADER & TIME CONTROL --- */}
      <section className="bg-white border-b border-slate-100 py-6" id="dashboard-controls-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            
            {/* Context Welcomer */}
            <div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-emerald-500 fill-emerald-50" />
                <span className="text-xs font-bold text-sky-600 uppercase tracking-widest leading-none">Dashboard Redaksi</span>
              </div>
              <h1 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight mt-1">
                Laporan Kinerja Jurnalis
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Sistem real-time terintegrasi untuk melacak liputan, karya rilis, dokumentasi, dan grafik produktivitas.
              </p>
            </div>

            {/* Controls Filter Month & Add Button */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Select Month and Year Dropdown */}
              <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl border border-slate-150 shrink-0">
                <span className="text-xs font-bold text-slate-500 pl-2.5 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  Bulan Laporan:
                </span>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-3 py-1.5 text-xs font-extrabold rounded-lg border-0 bg-white text-slate-900 focus:ring-0 cursor-pointer shadow-2xs"
                  id="month-and-year-select"
                >
                  <option value="all">Semua Bulan</option>
                  {MONTHS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Add News Button */}
              <button
                type="button"
                onClick={() => {
                  setEditingArticle(null);
                  setIsArticleModalOpen(true);
                }}
                className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-sky-500/15 hover:shadow-sky-500/25 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                id="add-new-news-action"
              >
                <Plus className="w-4 h-4" />
                <span>Input Berita Baru</span>
              </button>
            </div>

          </div>
        </div>
      </section>

      {/* --- MAIN PAGE TABS SELECTOR --- */}
      <section className="bg-slate-50 flex-1 py-8" id="dashboard-content-tabs-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
          
          {/* Elegant tab pill buttons */}
          <div className="flex border-b border-slate-200">
            <nav className="flex gap-6 -mb-px" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('laporan')}
                className={`py-3.5 px-1 border-b-2 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'laporan'
                    ? 'border-sky-600 text-sky-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
                id="tab-laporan-btn"
              >
                <LayoutDashboard className="w-4 h-4" />
                Laporan & Grafik Kinerja
              </button>
              <button
                onClick={() => setActiveTab('berita')}
                className={`py-3.5 px-1 border-b-2 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                  activeTab === 'berita'
                    ? 'border-sky-600 text-sky-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
                id="tab-berita-btn"
              >
                <Newspaper className="w-4 h-4" />
                Semua Daftar Berita ({articles.length})
              </button>
              
              {/* Only Admin and Manager can see Wartawan & Rubrics settings */}
              {currentUser.role !== 'Staff' && (
                <button
                  onClick={() => setActiveTab('sistem')}
                  className={`py-3.5 px-1 border-b-2 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'sistem'
                      ? 'border-sky-600 text-sky-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                  }`}
                  id="tab-sistem-btn"
                >
                  <Settings className="w-4 h-4" />
                  Kru Jurnalis & Rubrik
                </button>
              )}

              {/* Only Admin can manage Personnel credentials */}
              {currentUser.role === 'Admin' && (
                <button
                  onClick={() => setActiveTab('personil')}
                  className={`py-3.5 px-1 border-b-2 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer ${
                    activeTab === 'personil'
                      ? 'border-sky-600 text-sky-600'
                      : 'border-transparent text-slate-500 hover:text-slate-805 hover:border-slate-300'
                  }`}
                  id="tab-personil-btn"
                >
                  <Lock className="w-4 h-4" />
                  Manajemen Personil & Hak Akses
                </button>
              )}
            </nav>
          </div>

          {/* --- TAB CONTENT 1: LAPORAN & GRAFIK KINERJA --- */}
          {activeTab === 'laporan' && (
            <div className="space-y-6 animate-in fade-in duration-200" id="laporan-tab-view">
              
              {/* METRIC BENTO CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="kpi-panel">
                
                {/* Metric Card 1: Total Berita Tayang Satu Bulan */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-row items-center justify-between hover:scale-[1.01] transition-transform">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Berita Tayang ({currentMonthLabel})
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 font-mono">
                      {stats.total} <span className="text-xs text-slate-400 font-sans font-normal">Karya</span>
                    </h2>
                    <p className="text-[10px] text-slate-500">
                      Total tayang pada rubrik aktif
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-lg bg-sky-50 flex items-center justify-center text-sky-600 shrink-0">
                    <Newspaper className="w-5 h-5" />
                  </div>
                </div>

                {/* Metric Card 2: Jumlah Karya Sendiri */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-row items-center justify-between hover:scale-[1.01] transition-transform">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Karya Sendiri (Original)
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 font-mono">
                      {stats.karyaSendiri} <span className="text-xs text-slate-400 font-sans font-normal">Karya</span>
                    </h2>
                    <p className="text-[10px] text-slate-500">
                      {stats.total > 0 ? Math.round((stats.karyaSendiri / stats.total) * 100) : 0}% Terbitan Orisinal
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                </div>

                {/* Metric Card 3: Jumlah Press Rilis */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-row items-center justify-between hover:scale-[1.01] transition-transform">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Press Rilis (Kemitraan)
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 font-mono">
                      {stats.rilis} <span className="text-xs text-slate-400 font-sans font-normal">Rilisan</span>
                    </h2>
                    <p className="text-[10px] text-slate-500">
                      {stats.total > 0 ? Math.round((stats.rilis / stats.total) * 100) : 0}% Kerja sama institusi
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                </div>

                {/* Metric Card 4: Synergy Ratio / Collaboration */}
                <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs flex flex-row items-center justify-between hover:scale-[1.01] transition-transform">
                  <div className="space-y-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                      Rasio Kolaborasi Kru
                    </span>
                    <h2 className="text-2xl font-black text-slate-900 font-mono">
                      {stats.collabRatio}%
                    </h2>
                    <p className="text-[10px] text-slate-500">
                      Melibatkan peran tim terpisah
                    </p>
                  </div>
                  <div className="w-11 h-11 rounded-lg bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                </div>

              </div>

              {/* REAL-TIME PRODUCTIVITY CHARTS */}
              <JournalistChart 
                articles={articles} 
                journalists={journalists} 
                selectedMonth={selectedMonth} 
              />

              {/* TWO COLUMN SUMMARY: HIGHEST CONTRIBUTORS & RUBRIC BREAKDOWN */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* Column 1: Rubric Breakdown (Kategori Berita Terpopuler) */}
                <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-100 p-6 shadow-xs">
                  <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
                    <Layers className="w-4 h-4 text-rose-500" />
                    Penyebaran Rubrik Berita ({currentMonthLabel})
                  </h3>
                  
                  <div className="space-y-4">
                    {categories.map((cat) => {
                      const count = filteredArticles.filter(a => a.category === cat.id).length;
                      const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                      
                      return (
                        <div key={cat.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-bold text-slate-700 flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${
                                cat.color === 'red' ? 'bg-red-500' :
                                cat.color === 'emerald' ? 'bg-emerald-500' :
                                cat.color === 'blue' ? 'bg-blue-500' :
                                cat.color === 'purple' ? 'bg-purple-500' :
                                cat.color === 'pink' ? 'bg-pink-500' :
                                cat.color === 'orange' ? 'bg-orange-500' :
                                cat.color === 'rose' ? 'bg-rose-500' :
                                cat.color === 'cyan' ? 'bg-cyan-500' : 'bg-slate-500'
                              }`} />
                              {cat.name}
                            </span>
                            <span className="font-mono font-semibold text-slate-500">
                              {count} berita ({percentage}%)
                            </span>
                          </div>
                          
                          {/* Visual Progress Bar */}
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ease-out ${
                                cat.color === 'red' ? 'bg-red-500' :
                                cat.color === 'emerald' ? 'bg-emerald-500' :
                                cat.color === 'blue' ? 'bg-blue-500' :
                                cat.color === 'purple' ? 'bg-purple-500' :
                                cat.color === 'pink' ? 'bg-pink-500' :
                                cat.color === 'orange' ? 'bg-orange-500' :
                                cat.color === 'rose' ? 'bg-rose-500' :
                                cat.color === 'cyan' ? 'bg-cyan-500' : 'bg-slate-500'
                              }`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Column 2: Quick Audit Logs & CSV Export */}
                <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900 text-sm flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
                      <Award className="w-4 h-4 text-amber-500 animate-pulse" />
                      Statistik Pembaca & Eksport Laporan
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-100 text-xs text-slate-650 leading-relaxed">
                        Data pemantau produktivitas ini menunjukkan efisiensi pembagian tugas antara jurnalis <strong>meliput di lapangan</strong>, <strong>menulis draf</strong>, dan tim <strong>dokumentasi grafis</strong>.
                        <div className="mt-3 grid grid-cols-2 gap-4">
                          <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold block uppercase leading-none">Estimasi Impresi</span>
                            <span className="text-sm font-black font-mono text-slate-800 tracking-tight block mt-1">
                              {stats.views.toLocaleString('id-ID')} views
                            </span>
                          </div>
                          <div className="bg-white p-2.5 rounded-lg border border-slate-100">
                            <span className="text-[10px] text-slate-400 font-bold block uppercase leading-none">Rata-rata/Berita</span>
                            <span className="text-sm font-black font-mono text-slate-800 tracking-tight block mt-1">
                              {stats.total > 0 ? Math.round(stats.views / stats.total).toLocaleString('id-ID') : '0'} views
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <span className="text-xs font-bold text-slate-700 block">Butuh Rekapitulasi Rinci?</span>
                        <p className="text-[11px] text-slate-500">
                          Eksport seluruh daftar berita bulan {currentMonthLabel} dalam bentuk file Spreadsheet (.CSV) untuk verifikasi pembayaran atau akuntansi redaksi.
                        </p>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleExportReport}
                    disabled={filteredArticles.length === 0}
                    className="mt-6 w-full py-2.5 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 shadow-xs cursor-pointer disabled:opacity-40 disabled:pointer-events-none disabled:bg-slate-200 disabled:text-slate-400"
                    id="export-csv-btn"
                  >
                    <Download className="w-4 h-4" />
                    <span>Unduh Laporan CSV ({currentMonthLabel})</span>
                  </button>
                </div>

              </div>

            </div>
          )}

          {/* --- TAB CONTENT 2: DAFTAR BERITA (DATATABLE) --- */}
          {activeTab === 'berita' && (
            <div className="space-y-6 animate-in fade-in duration-200" id="berita-tab-view">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-md flex items-center gap-2">
                    <Newspaper className="w-5 h-5 text-sky-600" />
                    Dataset Berita metaranews.co
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Tayangan pada {currentMonthLabel !== 'Semua Bulan' ? `Bulan ${currentMonthLabel}` : 'Semua Bulan Terdaftar'}.
                  </p>
                </div>
              </div>

              {/* Stateful article table filters */}
              <ArticleList 
                articles={articles}
                categories={categories}
                journalists={journalists}
                selectedMonth={selectedMonth}
                onEditArticle={handleEditArticleTrigger}
                onDeleteArticle={handleDeleteArticle}
                currentUserRole={currentUser.role}
              />
            </div>
          )}

          {/* --- TAB CONTENT 3: TIM KRU JURNALIS & RUBRIK SETTINGS --- */}
          {activeTab === 'sistem' && (
            <div className="space-y-6 animate-in fade-in duration-200" id="sistem-tab-view">
              <div>
                <h3 className="font-bold text-slate-900 text-md flex items-center gap-2">
                  <Settings className="w-5 h-5 text-sky-600" />
                  Konfigurasi Redaksi & Rubrikasi
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daftarkan wartawan baru, ubah kategori berita, dan siapkan parameter untuk formulir input berita.
                </p>
              </div>

              <ManagementPanel 
                journalists={journalists}
                categories={categories}
                onAddJournalist={handleAddJournalist}
                onDeleteJournalist={handleDeleteJournalist}
                onEditJournalist={handleEditJournalist}
                onAddCategory={handleAddCategory}
                onDeleteCategory={handleDeleteCategory}
                onEditCategory={handleEditCategory}
              />
            </div>
          )}

          {/* --- TAB CONTENT 4: MANAJEMEN PERSONIL & HAK AKSES --- */}
          {activeTab === 'personil' && (
            <div className="space-y-6 animate-in fade-in duration-200" id="personil-tab-view">
              <div>
                <h3 className="font-bold text-slate-900 text-md flex items-center gap-2">
                  <Lock className="w-5 h-5 text-sky-600" />
                  Manajemen Personil & Hak Akses (Credentials)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Daftarkan login kru, kelola nama lengkap, ubah password, dan tetapkan tingkatan akses (Admin/Manager/Staff) yang tersimpan secara real-time di Cloud Firestore.
                </p>
              </div>

              <PersonnelPanel
                personnels={personnels}
                journalists={journalists}
                onAddPersonnel={handleAddPersonnel}
                onUpdatePersonnel={handleUpdatePersonnel}
                onDeletePersonnel={handleDeletePersonnel}
                currentUserId={currentUser.id}
              />
            </div>
          )}

        </div>
      </section>

      {/* --- FOOTER BANNER --- */}
      <footer className="bg-white border-t border-slate-100 py-6 mt-12 text-center" id="dashboard-footer">
        <div className="max-w-7xl mx-auto px-4 text-xs text-slate-400 font-semibold flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            &copy; 2026 Admin metaranews.co. Seluruh hak cipta dilindungi.
          </div>
          <div className="flex gap-4">
            <span className="hover:text-slate-650 transition-colors">v2.4.1 Production</span>
            <span>&bull;</span>
            <span className="hover:text-slate-650 transition-colors">Pusat Bantuan Redaksi</span>
          </div>
        </div>
      </footer>

      {/* --- EDIT / ADD ARTICLE MODAL DIALOG --- */}
      <ArticleModal
        isOpen={isArticleModalOpen}
        onClose={() => {
          setIsArticleModalOpen(false);
          setEditingArticle(null);
        }}
        onSave={handleSaveArticle}
        article={editingArticle}
        journalists={journalists}
        categories={categories}
      />

      {/* --- EDIT CURRENT USER PROFILE MODAL --- */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto font-sans" id="profile-modal-backdrop">
          <div className="bg-white rounded-2xl border border-slate-100 max-w-md w-full overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Pengaturan Kredensial Akun</h2>
                <p className="text-[10px] text-slate-500 mt-0.5">Ubah sandi masuk dan kredensial personil Anda.</p>
              </div>
              <button 
                type="button" 
                onClick={() => setIsProfileModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="p-6 space-y-4">
              {profileError && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-[11px] font-semibold text-red-650">
                  {profileError}
                </div>
              )}
              {profileSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-[11px] font-semibold text-emerald-650 flex items-center gap-1.5 animate-bounce">
                  <CheckCircle className="w-3.5 h-3.5" /> Kredensial berhasil diperbarui secara instan!
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Nama Lengkap</label>
                <input
                  type="text"
                  value={profileFullName}
                  onChange={(e) => setProfileFullName(e.target.value)}
                  placeholder="Nama Lengkap..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 font-semibold focus:outline-hidden focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Username Login</label>
                <input
                  type="text"
                  value={profileUsername}
                  onChange={(e) => setProfileUsername(e.target.value)}
                  placeholder="Username login..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-205 bg-white text-slate-800 font-mono focus:outline-hidden focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Sandi Masuk (Password)</label>
                <input
                  type="text"
                  value={profilePassword}
                  onChange={(e) => setProfilePassword(e.target.value)}
                  placeholder="Password masuk..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-205 bg-white text-slate-800 font-mono focus:outline-hidden focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
