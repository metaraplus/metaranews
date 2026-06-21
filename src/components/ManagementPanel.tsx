/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Journalist, Category } from '../types';
import { Plus, Trash2, Users, Tag, CheckCircle, Pencil } from 'lucide-react';

interface ManagementPanelProps {
  journalists: Journalist[];
  categories: Category[];
  onAddJournalist: (name: string, role: Journalist['role'], coverage: string) => void;
  onDeleteJournalist: (id: string) => void;
  onEditJournalist: (id: string, name: string, role: Journalist['role'], coverage: string) => void;
  onAddCategory: (name: string, color: string) => void;
  onDeleteCategory: (id: string) => void;
  onEditCategory: (id: string, name: string, color: string) => void;
}

export default function ManagementPanel({
  journalists,
  categories,
  onAddJournalist,
  onDeleteJournalist,
  onEditJournalist,
  onAddCategory,
  onDeleteCategory,
  onEditCategory
}: ManagementPanelProps) {
  // States for Journalist Form
  const [jName, setJName] = useState('');
  const [jRole, setJRole] = useState<Journalist['role']>('Reporter');
  const [jCoverage, setJCoverage] = useState('Tidak Ada');
  const [jError, setJError] = useState('');
  const [jSuccess, setJSuccess] = useState(false);

  // States for Category Form
  const [cName, setCName] = useState('');
  const [cColor, setCColor] = useState('red');
  const [cError, setCError] = useState('');
  const [cSuccess, setCSuccess] = useState(false);

  // States for Inline Editing
  const [editingJId, setEditingJId] = useState<string | null>(null);
  const [editingJName, setEditingJName] = useState('');
  const [editingJRole, setEditingJRole] = useState<Journalist['role']>('Reporter');
  const [editingJCoverage, setEditingJCoverage] = useState('Tidak Ada');
  const [editingJError, setEditingJError] = useState('');

  const [editingCId, setEditingCId] = useState<string | null>(null);
  const [editingCName, setEditingCName] = useState('');
  const [editingCColor, setEditingCColor] = useState('red');
  const [editingCError, setEditingCError] = useState('');

  // Color options for categories mapping
  const COLOR_OPTIONS = [
    { value: 'red', label: 'Merah (Politik)', bg: 'bg-red-500' },
    { value: 'emerald', label: 'Hijau (Ekonomi)', bg: 'bg-emerald-500' },
    { value: 'blue', label: 'Biru (Jatim)', bg: 'bg-blue-500' },
    { value: 'purple', label: 'Ungu (Lokal)', bg: 'bg-purple-500' },
    { value: 'pink', label: 'Merah Jambu (Gaya Hidup)', bg: 'bg-pink-500' },
    { value: 'orange', label: 'Jingga (Olahraga)', bg: 'bg-orange-500' },
    { value: 'rose', label: 'Rose (Kriminal)', bg: 'bg-rose-500' },
    { value: 'cyan', label: 'Sian (Teknologi)', bg: 'bg-cyan-500' },
    { value: 'slate', label: 'Abu-Abu (Nasional)', bg: 'bg-slate-500' }
  ];

  const handleJournalistSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setJError('');
    setJSuccess(false);

    if (!jName.trim()) {
      setJError('Nama jurnalis tidak boleh kosong.');
      return;
    }

    // Check duplicate
    if (journalists.some(j => j.name.toLowerCase() === jName.trim().toLowerCase())) {
      setJError('Nama jurnalis sudah terdaftar.');
      return;
    }

    onAddJournalist(jName.trim(), jRole, jCoverage);
    setJName('');
    setJCoverage('Tidak Ada');
    setJSuccess(true);
    setTimeout(() => setJSuccess(false), 3000);
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCError('');
    setCSuccess(false);

    if (!cName.trim()) {
      setCError('Nama kategori wajib diisi.');
      return;
    }

    // Check duplicate
    const catId = cName.trim().toLowerCase().replace(/\s+/g, '-');
    if (categories.some(c => c.id === catId || c.name.toLowerCase() === cName.trim().toLowerCase())) {
      setCError('Kategori sudah ada.');
      return;
    }

    onAddCategory(cName.trim(), cColor);
    setCName('');
    setCSuccess(true);
    setTimeout(() => setCSuccess(false), 3000);
  };

  const handleEditJournalistSave = (id: string) => {
    setEditingJError('');
    if (!editingJName.trim()) {
      setEditingJError('Nama jurnalis tidak boleh kosong.');
      return;
    }
    // check duplicate on other journalists
    if (journalists.some(j => j.id !== id && j.name.toLowerCase() === editingJName.trim().toLowerCase())) {
      setEditingJError('Nama jurnalis sudah terdaftar.');
      return;
    }

    onEditJournalist(id, editingJName.trim(), editingJRole, editingJCoverage);
    setEditingJId(null);
  };

  const startEditJournalist = (jurn: Journalist) => {
    setEditingJId(jurn.id);
    setEditingJName(jurn.name);
    setEditingJRole(jurn.role);
    setEditingJCoverage(jurn.coverage || 'Tidak Ada');
    setEditingJError('');
  };

  const handleEditCategorySave = (id: string) => {
    setEditingCError('');
    if (!editingCName.trim()) {
      setEditingCError('Nama rubrik tidak boleh kosong.');
      return;
    }
    const newId = editingCName.trim().toLowerCase().replace(/\s+/g, '-');
    if (categories.some(c => c.id !== id && (c.id === newId || c.name.toLowerCase() === editingCName.trim().toLowerCase()))) {
      setEditingCError('Kategori rubrik sudah ada.');
      return;
    }

    onEditCategory(id, editingCName.trim(), editingCColor);
    setEditingCId(null);
  };

  const startEditCategory = (cat: Category) => {
    setEditingCId(cat.id);
    setEditingCName(cat.name);
    setEditingCColor(cat.color);
    setEditingCError('');
  };

  const confirmDeleteJournalist = (id: string, name: string) => {
    if (window.confirm(`Hapus jurnalis "${name}" dari redaksi?\n\nCatatan: Berita lama yang mencantumkan nama jurnalis ini akan tetap aman.`)) {
      onDeleteJournalist(id);
    }
  };

  const confirmDeleteCategory = (id: string, name: string) => {
    if (window.confirm(`Hapus kategori "${name}"?\n\nCatatan: Berita lama dengan kategori ini akan tetap aman.`)) {
      onDeleteCategory(id);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" id="settings-management-panel">
      {/* LEFT COL: JOURNALIST MANAGEMENT */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-md">
              <Users className="w-4 h-4 text-sky-600" />
              Kelola Tim Jurnalis / Kru Redaksi
            </h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {journalists.length} Orang
            </span>
          </div>

          {/* Mini form to add journalist */}
          <form onSubmit={handleJournalistSubmit} className="mb-6 bg-slate-50/55 p-4 rounded-xl border border-slate-100 space-y-3">
            <span className="text-xs font-bold text-slate-800 block">Daftarkan Kru Baru</span>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Nama Lengkap Jurnalis..."
                value={jName}
                onChange={(e) => setJName(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-sky-500 text-slate-800 font-medium"
                id="add-journalist-name"
              />
              <select
                value={jRole}
                onChange={(e) => setJRole(e.target.value as Journalist['role'])}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 font-medium animate-none"
                id="add-journalist-role"
              >
                <option value="Reporter">Reporter (Lapangan)</option>
                <option value="Redaktur">Redaktur (Editor)</option>
                <option value="Fotografer">Fotografer (Dokumentasi)</option>
                <option value="Kontributor">Kontributor (Eksternal)</option>
                <option value="Magang">Magang (Intern)</option>
              </select>
              <select
                value={jCoverage}
                onChange={(e) => setJCoverage(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-705 font-medium"
                id="add-journalist-coverage"
                title="Sektor Liputan / Penugasan Khusus"
              >
                <option value="Tidak Ada">Cover: Tidak Ada / Semua</option>
                {categories.map(c => (
                  <option key={c.id} value={c.name}>Cover: {c.name}</option>
                ))}
              </select>
              <button
                type="submit"
                className="bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 shrink-0"
                id="submit-new-journalist"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah
              </button>
            </div>

            {jError && <p className="text-[10px] font-bold text-red-600">{jError}</p>}
            {jSuccess && (
              <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Berhasil menambahkan jurnalis baru!
              </p>
            )}
          </form>

          {/* Roster list */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {journalists.map((jurn) => (
              <div key={jurn.id}>
                {editingJId === jurn.id ? (
                  <div className="p-3 bg-sky-50/50 border border-sky-100 rounded-lg space-y-2.5 animate-in fade-in duration-200">
                    <span className="text-[10px] font-bold text-sky-850 block uppercase tracking-wider">Ubah Data Kru: {jurn.name}</span>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={editingJName}
                        onChange={(e) => setEditingJName(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-20 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                      />
                      <select
                        value={editingJRole}
                        onChange={(e) => setEditingJRole(e.target.value as Journalist['role'])}
                        className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-20 bg-white text-slate-800 font-medium"
                      >
                        <option value="Reporter">Reporter</option>
                        <option value="Redaktur">Redaktur (Editor)</option>
                        <option value="Fotografer">Fotografer</option>
                        <option value="Kontributor">Kontributor</option>
                        <option value="Magang">Magang</option>
                      </select>
                      <select
                        value={editingJCoverage}
                        onChange={(e) => setEditingJCoverage(e.target.value)}
                        className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-20 bg-white text-slate-800 font-medium"
                      >
                        <option value="Tidak Ada">Cover: Tidak Ada / Semua</option>
                        {categories.map(c => (
                          <option key={c.id} value={c.name}>Cover: {c.name}</option>
                        ))}
                      </select>
                    </div>
                    {editingJError && <p className="text-[10px] font-bold text-red-600 mt-1">{editingJError}</p>}
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingJId(null)}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-205 text-slate-600 font-bold text-[10px]"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditJournalistSave(jurn.id)}
                        className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10px]"
                      >
                        Simpan
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2.5 bg-slate-50/40 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-800 block leading-tight">{jurn.name}</span>
                        {jurn.coverage && jurn.coverage !== 'Tidak Ada' && (
                          <span className="px-1.5 py-0.2 text-[8px] font-black uppercase text-sky-700 bg-sky-50 border border-sky-200 rounded">
                            {jurn.coverage}
                          </span>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">{jurn.role}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEditJournalist(jurn)}
                        className="p-1 rounded text-slate-400 hover:text-sky-600 hover:bg-sky-50 transition-colors"
                        title="Ubah Rincian"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmDeleteJournalist(jurn.id, jurn.name)}
                        className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Hapus Kru"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT COL: CATEGORY MANAGEMENT */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 flex items-center gap-2 text-md">
              <Tag className="w-4 h-4 text-emerald-650" />
              Kelola Katagori Rubrik Berita
            </h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
              {categories.length} Rubrik
            </span>
          </div>

          {/* Mini form to add category */}
          <form onSubmit={handleCategorySubmit} className="mb-6 bg-slate-50/55 p-4 rounded-xl border border-slate-100 space-y-3">
            <span className="text-xs font-bold text-slate-800 block">Buat Rubrik Rubrik Baru</span>
            
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Nama Rubrik (Kategori)..."
                value={cName}
                onChange={(e) => setCName(e.target.value)}
                className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:outline-hidden focus:ring-1 focus:ring-emerald-500 text-slate-800 font-medium"
                id="add-category-name"
              />
              <select
                value={cColor}
                onChange={(e) => setCColor(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 font-medium"
                id="add-category-color"
              >
                {COLOR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 shrink-0"
                id="submit-new-category"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah
              </button>
            </div>

            {cError && <p className="text-[10px] font-bold text-red-600">{cError}</p>}
            {cSuccess && (
              <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> Berhasil menambahkan rubrik baru!
              </p>
            )}
          </form>

          {/* Category list */}
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {categories.map((cat) => (
              <div key={cat.id}>
                {editingCId === cat.id ? (
                  <div className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-lg space-y-2.5 animate-in fade-in duration-200">
                    <span className="text-[10px] font-bold text-emerald-850 block uppercase tracking-wider">Ubah Rubrik: {cat.name}</span>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        value={editingCName}
                        onChange={(e) => setEditingCName(e.target.value)}
                        className="flex-1 px-2.5 py-1.5 text-xs rounded-lg border border-slate-20 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                      />
                      <select
                        value={editingCColor}
                        onChange={(e) => setEditingCColor(e.target.value)}
                        className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-20 bg-white text-slate-800 font-medium"
                      >
                        {COLOR_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {editingCError && <p className="text-[10px] font-bold text-red-600 mt-1">{editingCError}</p>}
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingCId(null)}
                        className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-205 text-slate-600 font-bold text-[10px]"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => handleEditCategorySave(cat.id)}
                        className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px]"
                      >
                        Simpan
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between p-2.5 bg-slate-50/40 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full shrink-0 ${
                        cat.color === 'red' ? 'bg-red-500' :
                        cat.color === 'emerald' ? 'bg-emerald-500' :
                        cat.color === 'blue' ? 'bg-blue-500' :
                        cat.color === 'purple' ? 'bg-purple-500' :
                        cat.color === 'pink' ? 'bg-pink-500' :
                        cat.color === 'orange' ? 'bg-orange-500' :
                        cat.color === 'rose' ? 'bg-rose-500' :
                        cat.color === 'cyan' ? 'bg-cyan-500' : 'bg-slate-500'
                      }`} />
                      <span className="text-xs font-bold text-slate-800">{cat.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => startEditCategory(cat)}
                        className="p-1 rounded text-slate-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                        title="Ubah Rubrik"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => confirmDeleteCategory(cat.id, cat.name)}
                        className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Hapus Rubrik"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
