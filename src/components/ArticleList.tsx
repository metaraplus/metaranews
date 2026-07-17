/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { Article, Category, Journalist } from '../types';
import { Search, Filter, BookOpen, Clock, Edit3, Trash2, ExternalLink, Tag, Briefcase } from 'lucide-react';

interface ArticleListProps {
  articles: Article[];
  categories: Category[];
  journalists: Journalist[];
  selectedMonth: string;
  onEditArticle: (article: Article) => void;
  onDeleteArticle: (id: string) => void;
  currentUserRole?: 'Admin' | 'Manager' | 'Staff';
}

export default function ArticleList({
  articles,
  categories,
  journalists,
  selectedMonth,
  onEditArticle,
  onDeleteArticle,
  currentUserRole = 'Staff'
}: ArticleListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedJurn, setSelectedJurn] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Map category id to full category object
  const categoryMap = useMemo(() => {
    const map: Record<string, Category> = {};
    categories.forEach(c => {
      map[c.id] = c;
    });
    return map;
  }, [categories]);

  // Color mapper helper for badges
  const getBadgeStyleAndClass = (catId: string) => {
    const cat = categoryMap[catId];
    if (!cat) return { className: 'bg-slate-100 text-slate-700 border border-slate-200' };
    const color = cat.color;

    if (color && color.startsWith('#')) {
      return {
        style: {
          backgroundColor: `${color}15`,
          color: color,
          borderColor: `${color}35`,
        },
        className: 'border'
      };
    }

    switch (color) {
      case 'red': return { className: 'bg-red-50 text-red-700 border border-red-100' };
      case 'emerald': return { className: 'bg-emerald-50 text-emerald-700 border border-emerald-100' };
      case 'blue': return { className: 'bg-blue-50 text-blue-700 border border-blue-100' };
      case 'purple': return { className: 'bg-purple-50 text-purple-700 border border-purple-100' };
      case 'pink': return { className: 'bg-pink-50 text-pink-700 border border-pink-100' };
      case 'orange': return { className: 'bg-orange-50 text-orange-700 border border-orange-100' };
      case 'rose': return { className: 'bg-rose-50 text-rose-700 border border-rose-100' };
      case 'cyan': return { className: 'bg-cyan-50 text-cyan-700 border border-cyan-100' };
      default: return { className: 'bg-slate-50 text-slate-700 border border-slate-105' };
    }
  };

  // Filter and Search logic
  const filteredArticles = useMemo(() => {
    let result = articles;

    // 1. Month filter
    if (selectedMonth !== 'all') {
      result = result.filter(a => a.date.startsWith(selectedMonth));
    }

    // 2. Search query filter (search by title or journalists name)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        a =>
          a.title.toLowerCase().includes(query) ||
          a.reporter.toLowerCase().includes(query) ||
          a.writer.toLowerCase().includes(query) ||
          a.documenter.toLowerCase().includes(query)
      );
    }

    // 3. Category Filter
    if (selectedCat !== 'all') {
      result = result.filter(a => {
        if (!a.category) return false;
        return a.category.split(',').includes(selectedCat);
      });
    }

    // 4. Type Filter ("Karya Sendiri" vs "Rilis")
    if (selectedType !== 'all') {
      result = result.filter(a => a.type === selectedType);
    }

    // 5. Specialist Journalist Filter
    if (selectedJurn !== 'all') {
      result = result.filter(
        a =>
          a.reporter === selectedJurn ||
          a.writer === selectedJurn ||
          a.documenter === selectedJurn
      );
    }

    // Sort by Date descending
    return [...result].sort((a, b) => b.date.localeCompare(a.date));
  }, [articles, selectedMonth, searchQuery, selectedCat, selectedType, selectedJurn]);

  // Pagination bounds
  const paginatedArticles = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredArticles.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredArticles, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredArticles.length / itemsPerPage));

  // Reset page if filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCat, selectedType, selectedMonth, selectedJurn]);

  const triggerDelete = (id: string, title: string) => {
    if (window.confirm(`Apakah Anda yakin ingin menghapus berita:\n"${title}"?`)) {
      onDeleteArticle(id);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs" id="articles-table-panel">
      {/* Search & Filters Bar */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/45">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row gap-2">
            {/* Real Search bar */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Cari judul berita, jurnalis..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 focus:outline-hidden focus:border-sky-500 focus:ring-1 focus:ring-sky-500 bg-white placeholder-slate-400 text-slate-800"
                id="article-search-input"
              />
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            </div>

            {/* Quick counters */}
            <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 bg-slate-100/60 px-3 py-1.5 rounded-lg border border-slate-200/50">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" />
              <span>Ditemukan: {filteredArticles.length} berita</span>
            </div>
          </div>

          {/* Inline filters dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400 flex items-center gap-1 mr-1">
              <Filter className="w-3 h-3" /> Filter:
            </span>

            {/* Category Select */}
            <select
              value={selectedCat}
              onChange={(e) => setSelectedCat(e.target.value)}
              className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg border border-slate-200 bg-white text-slate-650 focus:outline-hidden"
              id="filter-category"
            >
              <option value="all">Semua Kategori</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            {/* Type Select */}
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg border border-slate-200 bg-white text-slate-650 focus:outline-hidden"
              id="filter-type"
            >
              <option value="all">Semua Jenis Karya</option>
              <option value="Karya Sendiri">Karya Sendiri</option>
              <option value="Rilis">Press Rilis</option>
            </select>

            {/* Specialist Journalist Select */}
            <select
              value={selectedJurn}
              onChange={(e) => setSelectedJurn(e.target.value)}
              className="px-2.5 py-1.5 text-[11px] font-bold rounded-lg border border-slate-200 bg-white text-slate-650 focus:outline-hidden"
              id="filter-journalist"
            >
              <option value="all">Semua Jurnalis</option>
              {journalists.map(j => (
                <option key={j.id} value={j.name}>{j.name} ({j.role})</option>
              ))}
            </select>

            {/* Reset filters button if any active */}
            {(selectedCat !== 'all' || selectedType !== 'all' || selectedJurn !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCat('all');
                  setSelectedType('all');
                  setSelectedJurn('all');
                }}
                className="text-[10px] font-extrabold text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-2 py-1 rounded-md transition-colors border border-sky-100"
                id="reset-filters"
              >
                Hapus Filter
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Articles Table Grid */}
      <div className="overflow-x-auto">
        {paginatedArticles.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center">
            <Briefcase className="w-10 h-10 text-slate-300 mb-2" />
            <p className="text-sm font-semibold text-slate-600">Tidak ada berita yang sesuai dengan kriteria</p>
            <p className="text-xs text-slate-400 mt-1">Coba sesuaikan pencarian atau filter Anda.</p>
          </div>
        ) : (
          <table className="w-full text-left border-collapse" id="articles-datatable">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase bg-slate-50/50">
                <th className="px-5 py-3.5 select-none">Berita & Tanggal</th>
                <th className="px-4 py-3.5">Kategori</th>
                <th className="px-4 py-3.5">Jenis</th>
                <th className="px-4 py-3.5 text-center">Liputan</th>
                <th className="px-4 py-3.5 text-center">Penulis</th>
                <th className="px-4 py-3.5 text-center">Dokumentasi</th>
                <th className="px-5 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedArticles.map((article) => {
                const categoryObj = categoryMap[article.category];
                return (
                  <tr 
                    key={article.id} 
                    className="hover:bg-slate-50/40 transition-colors group"
                  >
                    {/* Title and Date Column */}
                    <td className="px-5 py-4 max-w-sm">
                      <div className="font-bold text-slate-900 group-hover:text-sky-655 transition-colors line-clamp-2">
                        {article.title}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1.5 text-[10px] font-semibold text-slate-400">
                        <Clock className="w-3 h-3 block shrink-0" />
                        <span>{article.date}</span>
                        {article.url && (
                          <a 
                            href={article.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-sky-600 hover:underline hover:text-sky-700 ml-1.5 font-bold"
                          >
                            <span>Live</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                        {article.status === 'Draft' && (
                          <span className="ml-2 px-1.5 py-0.2 bg-amber-50 text-amber-700 border border-amber-100 rounded text-[9px] font-bold uppercase leading-none">
                            Draft
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Category column */}
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1 max-w-[180px]">
                        {article.category ? article.category.split(',').map((catId, idx) => {
                          const catObj = categoryMap[catId];
                          const styleInfo = getBadgeStyleAndClass(catId);
                          return (
                            <span 
                              key={`${catId}-${idx}`}
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold inline-block whitespace-nowrap ${styleInfo.className}`}
                              style={styleInfo.style}
                              title={catObj ? (catObj.rubricName ? `[${catObj.rubricName}] ${catObj.categoryName}` : catObj.name) : catId}
                            >
                              {catObj 
                                ? (catObj.categoryName || catObj.name)
                                : catId
                              }
                            </span>
                          );
                        }) : (
                          <span className="text-[10px] text-slate-400 font-semibold italic">Tidak ada</span>
                        )}
                      </div>
                    </td>

                    {/* News Type column */}
                    <td className="px-4 py-4 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-sm text-[10px] font-semibold ${
                        article.type === 'Karya Sendiri'
                          ? 'bg-slate-100 text-slate-700 border border-slate-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                      }`}>
                        {article.type}
                      </span>
                    </td>

                    {/* Liputan Role */}
                    <td className="px-4 py-4 text-center">
                      <div className="font-bold text-slate-800 text-[11px]" title="Jurnalis Peliput Lapangan">
                        {article.reporter}
                      </div>
                      <div className="text-[9px] text-slate-400 font-medium">Meliput</div>
                    </td>

                    {/* Penulis Role */}
                    <td className="px-4 py-4 text-center">
                      <div className="font-bold text-slate-800 text-[11px]" title="Jurnalis Penyusun Berita">
                        {article.writer}
                      </div>
                      <div className="text-[9px] text-slate-400 font-medium">Menulis</div>
                    </td>

                    {/* Dokumentasi Role */}
                    <td className="px-4 py-4 text-center">
                      <div className={`text-[11px] ${
                        article.documenter === 'Tidak ada / Admin' 
                          ? 'text-slate-400 font-normal italic' 
                          : 'font-bold text-slate-800'
                      }`} title="Fotografer / Dokumentasi">
                        {article.documenter}
                      </div>
                      <div className="text-[9px] text-slate-400 font-medium">Dokumentasi</div>
                    </td>

                    {/* Actions Column */}
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEditArticle(article)}
                          className="p-1 rounded-md text-slate-500 hover:text-slate-850 hover:bg-slate-100 transition-colors"
                          title="Ubah Berita"
                          id={`edit-btn-${article.id}`}
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {currentUserRole !== 'Staff' ? (
                          <button
                            onClick={() => triggerDelete(article.id, article.title)}
                            className="p-1 rounded-md text-slate-400 hover:text-red-650 hover:bg-red-50 transition-colors"
                            title="Hapus Berita"
                            id={`del-btn-${article.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <span
                            className="p-1 rounded-md text-slate-200 cursor-not-allowed"
                            title="Akses terbatas: Staff tidak berhak menghapus berita"
                          >
                            <Trash2 className="w-4 h-4" />
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Table Pagination Footer */}
      {totalPages > 1 && (
        <div className="px-5 py-3.5 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
          <span className="text-xs text-slate-500 font-medium">
            Halaman <strong className="text-slate-700">{currentPage}</strong> dari <strong className="text-slate-700">{totalPages}</strong>
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1.5 text-[11px] font-bold rounded-md border border-slate-205 text-slate-600 bg-white disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 transition-all select-none"
              id="prev-page-btn"
            >
              Sebelumnya
            </button>
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1.5 text-[11px] font-bold rounded-md border border-slate-205 text-slate-600 bg-white disabled:opacity-40 disabled:pointer-events-none hover:bg-slate-50 transition-all select-none"
              id="next-page-btn"
            >
              Selanjutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
