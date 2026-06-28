/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Article, Journalist, Category } from '../types';
import { X, Calendar, FileText, CheckCircle, HelpCircle } from 'lucide-react';

interface ArticleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (articleData: Omit<Article, 'id'> & { id?: string }) => void;
  article: Article | null; // Null if adding new
  journalists: Journalist[];
  categories: Category[];
}

export default function ArticleModal({
  isOpen,
  onClose,
  onSave,
  article,
  journalists,
  categories
}: ArticleModalProps) {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState('');
  const [type, setType] = useState<'Karya Sendiri' | 'Rilis'>('Karya Sendiri');
  const [reporter, setReporter] = useState('');
  const [writer, setWriter] = useState('');
  const [documenter, setDocumenter] = useState('Tidak ada / Admin');
  const [status, setStatus] = useState<'Tayang' | 'Draft'>('Tayang');
  const [views, setViews] = useState(0);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  // Repopulate form fields when modal is opened or article selection changes
  useEffect(() => {
    if (article) {
      setTitle(article.title);
      setDate(article.date);
      setCategory(article.category);
      setType(article.type);
      setReporter(article.reporter);
      setWriter(article.writer);
      setDocumenter(article.documenter || 'Tidak ada / Admin');
      setStatus(article.status);
      setViews(article.views || 0);
      setUrl(article.url || '');
    } else {
      setTitle('');
      setDate(new Date().toISOString().split('T')[0]);
      setCategory(categories[0]?.id || '');
      setType('Karya Sendiri');
      
      // Smart defaults for journalists if available
      const firstRep = journalists.find(j => j.role === 'Reporter')?.name || journalists[0]?.name || '';
      const firstWri = journalists.find(j => j.role === 'Redaktur')?.name || journalists[0]?.name || '';
      
      setReporter(firstRep);
      setWriter(firstWri);
      setDocumenter('Tidak ada / Admin');
      setStatus('Tayang');
      setViews(0);
      setUrl('');
    }
    setError('');
  }, [article, isOpen, journalists, categories]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Judul berita tidak boleh kosong.');
      return;
    }
    if (!category) {
      setError('Kategori berita wajib dipilih.');
      return;
    }
    if (!reporter) {
      setError('Jurnalis yang meliput wajib dipilih.');
      return;
    }
    if (!writer) {
      setError('Penulis berita wajib dipilih.');
      return;
    }

    onSave({
      id: article?.id,
      title: title.trim(),
      date,
      category,
      type,
      reporter,
      writer,
      documenter,
      status,
      views: Number(views) || 0,
      url: url.trim() || undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto" id="article-modal-backdrop">
      <div 
        className="bg-white rounded-2xl border border-slate-100 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        id="article-modal-container"
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-lg font-bold text-slate-900" id="modal-title">
              {article ? 'Edit Data Berita' : 'Tambah Berita Baru'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Kelola data tayang, kategori, dan produktivitas jurnalis Metaranews.
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            id="close-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs font-semibold border border-red-100 flex items-center gap-2" id="modal-error">
              <span className="w-1.5 h-1.5 bg-red-600 rounded-full inline-block shrink-0"></span>
              {error}
            </div>
          )}

          {/* Title input */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-700 block">
              Judul Berita <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Masukkan judul berita lengkap..."
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-hidden focus:border-sky-600 focus:ring-1 focus:ring-sky-600 transition-all text-slate-900 placeholder-slate-400 font-medium"
              id="input-article-title"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block select-none">
                Tanggal Tayang <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 pl-9 text-sm rounded-lg border border-slate-200 focus:outline-hidden focus:border-sky-600 focus:ring-1 focus:ring-sky-600 transition-all text-slate-900 font-medium"
                  id="input-article-date"
                  required
                />
                <Calendar className="w-4 h-4 text-slate-450 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* URL input */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Tautan Berita (URL Metaranews) <span className="text-slate-400 font-normal">(Opsional)</span>
              </label>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://metaranews.co/..."
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 focus:outline-hidden focus:border-sky-600 focus:ring-1 focus:ring-sky-600 transition-all text-slate-900 placeholder-slate-400"
                id="input-article-url"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Category selection */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Kategori Berita <span className="text-red-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-sky-600 focus:ring-1 focus:ring-sky-600 transition-all text-slate-900 font-medium"
                id="input-article-category"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.rubricName ? `[${cat.rubricName}] ${cat.categoryName}` : cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* News Type selection */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Jenis Berita <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType('Karya Sendiri')}
                  className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    type === 'Karya Sendiri'
                      ? 'bg-sky-50 border-sky-500 text-sky-700 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                  id="type-self-btn"
                >
                  <FileText className="w-3.5 h-3.5" />
                  Karya Sendiri
                </button>
                <button
                  type="button"
                  onClick={() => setType('Rilis')}
                  className={`px-3 py-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                    type === 'Rilis'
                      ? 'bg-sky-50 border-sky-500 text-sky-700 shadow-xs'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                  id="type-release-btn"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  Press Rilis
                </button>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 my-4 pt-4">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Peran Jurnalis (Produktivitas)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Meliput (Reporter) */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Liputan / Meliput <span className="text-red-500">*</span>
                </label>
                <select
                  value={reporter}
                  onChange={(e) => setReporter(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-sky-600 focus:ring-1 focus:ring-sky-600 transition-all text-slate-900 font-medium"
                  id="input-article-reporter"
                >
                  <option value="">-- Pilih Jurnalis --</option>
                  {journalists.map((j) => (
                    <option key={j.id} value={j.name}>
                      {j.name} ({j.role})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400">Jurnalis yang meliput di lapangan.</p>
              </div>

              {/* Penulis */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Penulis Naskah <span className="text-red-500">*</span>
                </label>
                <select
                  value={writer}
                  onChange={(e) => setWriter(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:border-sky-600 focus:ring-1 focus:ring-sky-600 transition-all text-slate-900 font-medium"
                  id="input-article-writer"
                >
                  <option value="">-- Pilih Jurnalis --</option>
                  {journalists.map((j) => (
                    <option key={j.id} value={j.name}>
                      {j.name} ({j.role})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400">Jurnalis yang menyusun / menulis berita.</p>
              </div>

              {/* Dokumentasi */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Dokumentasi <span className="text-slate-400 font-normal">(Opsional)</span>
                </label>
                <input
                  type="text"
                  value={documenter}
                  onChange={(e) => setDocumenter(e.target.value)}
                  placeholder="Nama fotografer, kru, atau 'Tidak ada / Admin'..."
                  className="w-full px-3 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-hidden focus:border-sky-600 focus:ring-1 focus:ring-sky-600 transition-all text-slate-900 font-medium"
                  id="input-article-documenter"
                />
                <p className="text-[10px] text-slate-400">Mengambil foto/video liputan.</p>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            {/* Status selection */}
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-700 block">
                Status Publikasi
              </label>
              <div className="flex gap-4 items-center h-9">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={status === 'Tayang'}
                    onChange={() => setStatus('Tayang')}
                    className="text-sky-600 focus:ring-sky-500"
                  />
                  <span>Tayang (Published)</span>
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={status === 'Draft'}
                    onChange={() => setStatus('Draft')}
                    className="text-sky-600 focus:ring-sky-500"
                  />
                  <span>Draft Pendukung</span>
                </label>
              </div>
            </div>
          </div>
        </form>

        {/* Modal Actions Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:border-slate-300 transition-all"
            id="cancel-modal-btn"
          >
            Batal
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-xs focus:ring-2 focus:ring-sky-500/20 transition-all flex items-center gap-1.5"
            id="save-modal-btn"
          >
            <span>Simpan Berita</span>
          </button>
        </div>
      </div>
    </div>
  );
}
