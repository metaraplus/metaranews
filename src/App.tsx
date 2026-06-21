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
import { Article, Journalist, Category } from './types';
import JournalistChart from './components/JournalistChart';
import ArticleList from './components/ArticleList';
import ArticleModal from './components/ArticleModal';
import ManagementPanel from './components/ManagementPanel';
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
  Download
} from 'lucide-react';

export default function App() {
  // --- Persistent State Initialization ---
  const [articles, setArticles] = useState<Article[]>(() => {
    const local = localStorage.getItem('metaranews_articles');
    return local ? JSON.parse(local) : INITIAL_ARTICLES;
  });

  const [journalists, setJournalists] = useState<Journalist[]>(() => {
    const local = localStorage.getItem('metaranews_journalists');
    return local ? JSON.parse(local) : INITIAL_JOURNALISTS;
  });

  const [categories, setCategories] = useState<Category[]>(() => {
    const local = localStorage.getItem('metaranews_categories');
    return local ? JSON.parse(local) : INITIAL_CATEGORIES;
  });

  // --- Active State ---
  const [selectedMonth, setSelectedMonth] = useState('2026-06'); // Default to current mock month
  const [activeTab, setActiveTab] = useState<'laporan' | 'berita' | 'sistem'>('laporan');
  const [isArticleModalOpen, setIsArticleModalOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Article | null>(null);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('metaranews_articles', JSON.stringify(articles));
  }, [articles]);

  useEffect(() => {
    localStorage.setItem('metaranews_journalists', JSON.stringify(journalists));
  }, [journalists]);

  useEffect(() => {
    localStorage.setItem('metaranews_categories', JSON.stringify(categories));
  }, [categories]);

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
  const handleSaveArticle = (articleData: Omit<Article, 'id'> & { id?: string }) => {
    if (articleData.id) {
      // Edit mode
      setArticles(prev => prev.map(art => art.id === articleData.id ? { ...art, ...articleData } as Article : art));
    } else {
      // Add mode
      const newArticle: Article = {
        ...articleData,
        id: `a-${Date.now()}`
      } as Article;
      setArticles(prev => [newArticle, ...prev]);
    }
    setEditingArticle(null);
  };

  const handleDeleteArticle = (id: string) => {
    setArticles(prev => prev.filter(a => a.id !== id));
  };

  const handleEditArticleTrigger = (article: Article) => {
    setEditingArticle(article);
    setIsArticleModalOpen(true);
  };

  // Add a new journalist to roster
  const handleAddJournalist = (name: string, role: Journalist['role']) => {
    const newJurn: Journalist = {
      id: `j-${Date.now()}`,
      name,
      role
    };
    setJournalists(prev => [...prev, newJurn]);
  };

  const handleDeleteJournalist = (id: string) => {
    setJournalists(prev => prev.filter(j => j.id !== id));
  };

  const handleEditJournalist = (id: string, name: string, role: Journalist['role']) => {
    const oldJurn = journalists.find(j => j.id === id);
    const oldName = oldJurn ? oldJurn.name : '';

    setJournalists(prev => prev.map(j => j.id === id ? { ...j, name, role } : j));

    if (oldName && oldName !== name) {
      setArticles(prev => prev.map(art => {
        const updated = { ...art };
        if (updated.reporter === oldName) updated.reporter = name;
        if (updated.writer === oldName) updated.writer = name;
        if (updated.documenter === oldName) updated.documenter = name;
        return updated;
      }));
    }
  };

  // Add a new news category
  const handleAddCategory = (name: string, color: string) => {
    const newCat: Category = {
      id: name.trim().toLowerCase().replace(/\s+/g, '-'),
      name,
      color
    };
    setCategories(prev => [...prev, newCat]);
  };

  const handleDeleteCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
  };

  const handleEditCategory = (id: string, name: string, color: string) => {
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name, color } : c));
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

            {/* Quick Profile context info */}
            <div className="hidden sm:flex items-center gap-3 border-l border-slate-150 pl-4 py-1">
              <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs border border-slate-200 select-none">
                RD
              </div>
              <div className="text-left">
                <div className="text-xs font-semibold text-slate-850">Redaktur Pelaksana</div>
                <div className="text-[9px] text-slate-400 font-bold">metaranews.co</div>
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
    </div>
  );
}
