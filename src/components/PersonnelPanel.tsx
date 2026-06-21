/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Personnel, Journalist } from '../types';
import { Plus, Trash2, Key, Shield, User, Eye, EyeOff, CheckCircle, Edit3, Save, X } from 'lucide-react';

interface PersonnelPanelProps {
  personnels: Personnel[];
  journalists: Journalist[];
  onAddPersonnel: (fullName: string, username: string, password: string, role: Personnel['role'], jId?: string) => Promise<void>;
  onUpdatePersonnel: (id: string, updated: Partial<Personnel>) => Promise<void>;
  onDeletePersonnel: (id: string) => Promise<void>;
  currentUserId: string;
}

export default function PersonnelPanel({
  personnels,
  journalists,
  onAddPersonnel,
  onUpdatePersonnel,
  onDeletePersonnel,
  currentUserId
}: PersonnelPanelProps) {
  // Add state
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Personnel['role']>('Staff');
  const [selectedJId, setSelectedJId] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  // Edit item state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFullName, setEditFullName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<Personnel['role']>('Staff');
  const [showEditPassword, setShowEditPassword] = useState<Record<string, boolean>>({});
  const [editError, setEditError] = useState('');
  const [editSuccessId, setEditSuccessId] = useState<string | null>(null);

  // Handle personnel registration
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (!fullName.trim()) {
      setError('Nama lengkap wajib diisi.');
      return;
    }
    if (!username.trim() || username.trim().length < 3) {
      setError('Username minimal 3 karakter.');
      return;
    }
    if (!password.trim() || password.trim().length < 4) {
      setError('Password minimal 4 karakter.');
      return;
    }

    // Check unique username
    const usernameExists = personnels.some(p => p.username.toLowerCase() === username.trim().toLowerCase());
    if (usernameExists) {
      setError('Username sudah digunakan oleh personil lain.');
      return;
    }

    try {
      setLoading(true);
      await onAddPersonnel(fullName.trim(), username.trim().toLowerCase(), password, role, selectedJId || undefined);
      setFullName('');
      setUsername('');
      setPassword('');
      setRole('Staff');
      setSelectedJId('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Gagal menyimpan personil.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (p: Personnel) => {
    setEditingId(p.id);
    setEditFullName(p.fullName);
    setEditUsername(p.username);
    setEditPassword(p.password || '');
    setEditRole(p.role);
    setEditError('');
  };

  const handleSaveEdit = async (id: string) => {
    setEditError('');
    if (!editFullName.trim()) {
      setEditError('Nama lengkap tidak boleh kosong.');
      return;
    }
    if (!editUsername.trim() || editUsername.trim().length < 3) {
      setEditError('Username minimal 3 karakter.');
      return;
    }
    if (!editPassword.trim() || editPassword.trim().length < 4) {
      setEditError('Password minimal 4 karakter.');
      return;
    }

    // Check username duplicates
    const dup = personnels.some(p => p.id !== id && p.username.toLowerCase() === editUsername.trim().toLowerCase());
    if (dup) {
      setEditError('Username sudah dipakai.');
      return;
    }

    try {
      setLoading(true);
      const isSelf = id === currentUserId;
      await onUpdatePersonnel(id, {
        fullName: editFullName.trim(),
        username: editUsername.trim().toLowerCase(),
        password: editPassword,
        role: editRole
      });
      setEditingId(null);
      setEditSuccessId(id);
      setTimeout(() => setEditSuccessId(null), 3000);
    } catch (err: any) {
      setEditError(err.message || 'Gagal memperbarui data.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (id === currentUserId) {
      alert('Anda tidak bisa menghapus akun Anda sendiri yang sedang aktif.');
      return;
    }

    if (window.confirm(`Apakah Anda yakin ingin menghapus personil "${name}"?\nMereka tidak akan bisa masuk lagi ke sistem.`)) {
      try {
        setLoading(true);
        await onDeletePersonnel(id);
      } catch (err: any) {
        alert('Gagal menghapus personil: ' + err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleEditPasswordVisibility = (id: string) => {
    setShowEditPassword(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="personnel-management-section">
      {/* LEFT FORM: CREATE NEW ACCOUNT */}
      <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100">
            <Shield className="w-5 h-5 text-sky-600" />
            <h3 className="font-bold text-slate-900 text-sm">Daftarkan Personil Baru</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                Kaitkan dengan Kru Redaksi <span className="text-slate-400 font-normal">(Opsional)</span>
              </label>
              <select
                value={selectedJId}
                onChange={(e) => {
                  setSelectedJId(e.target.value);
                  const found = journalists.find(j => j.id === e.target.value);
                  if (found) {
                    setFullName(found.name);
                  }
                }}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 font-medium focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
              >
                <option value="">-- Buat personil mandiri / non-kru --</option>
                {journalists.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.name} ({j.role})
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">
                Memilih kru jurnalis akan mengisi otomatis nama lengkap untuk akun sistem.
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Nama Lengkap</label>
              <input
                type="text"
                placeholder="Nama Lengkap Personil"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-850 font-medium focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Username</label>
                <input
                  type="text"
                  placeholder="Isi username login..."
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-850 font-medium focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Hak Akses (Role)</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Personnel['role'])}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-800 font-bold focus:ring-1 focus:ring-sky-500 focus:outline-hidden"
                >
                  <option value="Admin">Admin (Kuasa Penuh)</option>
                  <option value="Manager">Manager (Penyelia/Editor)</option>
                  <option value="Staff">Staff (Penulis/Reporter)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Isi password personil..."
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-850 font-medium focus:ring-1 focus:ring-sky-500 focus:outline-hidden pr-8 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {error && <p className="text-xs text-red-600 font-bold">{error}</p>}
            {success && (
              <p className="text-xs text-emerald-600 font-bold flex items-center gap-1.5 animate-bounce">
                <CheckCircle className="w-4 h-4" /> Personil berhasil didaftarkan ke Firestore!
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>Daftarkan Akun</span>
            </button>
          </form>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-4 text-[11px] text-slate-400 leading-relaxed font-medium">
          <span className="font-bold text-slate-500 block mb-1">Definisi Hak Akses Jurnalis:</span>
          <div className="space-y-1">
            <p>🔑 <strong className="text-slate-600">Admin:</strong> Kelola rekap, rubrik jurnalis, kustomisasi portal, & mutasi kredensial personil.</p>
            <p>📝 <strong className="text-slate-600">Manager:</strong> Kelola rubrik dan edit/posting seluruh artikel berita di database.</p>
            <p>✍️ <strong className="text-slate-600">Staff:</strong> Menulis & menyimpan draf berita karya sendiri. Hak edit sebatas draf orisinal atau input biasa.</p>
          </div>
        </div>
      </div>

      {/* RIGHT LIST: CURRENT PERSONNEL ACCOUNTS ACROSS REDAKSI */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-sm">Akun Terdaftar di Cloud</h3>
            </div>
            <span className="text-[10px] font-bold text-indigo-500 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full">
              {personnels.length} Akun Aktif
            </span>
          </div>

          <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
            {personnels.map((p) => {
              const isEditing = editingId === p.id;
              const isCurrent = p.id === currentUserId;

              return (
                <div 
                  key={p.id}
                  className={`p-4 rounded-xl border transition-all ${
                    isCurrent 
                      ? 'bg-sky-50/40 border-sky-250 ring-1 ring-sky-200' 
                      : 'bg-slate-50/40 border-slate-100 hover:border-slate-200'
                  }`}
                >
                  {isEditing ? (
                    <div className="space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-center justify-between pb-1 border-b border-sky-100">
                        <span className="text-[11px] font-extrabold text-sky-800 uppercase tracking-wider">Ubah Kredensial Akun</span>
                        {editError && <span className="text-[10px] text-red-600 font-bold">{editError}</span>}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Nama Lengkap</label>
                          <input
                            type="text"
                            value={editFullName}
                            onChange={(e) => setEditFullName(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Peran Akses</label>
                          <select
                            value={editRole}
                            disabled={isCurrent} // Prevents admin lock-out of self
                            onChange={(e) => setEditRole(e.target.value as Personnel['role'])}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white"
                          >
                            <option value="Admin">Admin</option>
                            <option value="Manager">Manager</option>
                            <option value="Staff">Staff</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Username</label>
                          <input
                            type="text"
                            value={editUsername}
                            onChange={(e) => setEditUsername(e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] font-bold text-slate-500 block mb-1">Password</label>
                          <div className="relative">
                            <input
                              type={showEditPassword[p.id] ? 'text' : 'password'}
                              value={editPassword}
                              onChange={(e) => setEditPassword(e.target.value)}
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white font-mono pr-7"
                            />
                            <button
                              type="button"
                              onClick={() => toggleEditPasswordVisibility(p.id)}
                              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                            >
                              {showEditPassword[p.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end gap-1.5 mt-2">
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs rounded-lg flex items-center gap-1"
                        >
                          <X className="w-3.5 h-3.5" />
                          Batal
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSaveEdit(p.id)}
                          className="px-3 py-1 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-lg flex items-center gap-1"
                        >
                          <Save className="w-3.5 h-3.5" />
                          Simpan
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-800">{p.fullName}</span>
                          {isCurrent && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-150 border border-sky-305 text-sky-800 font-black tracking-tight leading-none">
                              AKTIF SEKARANG
                            </span>
                          )}
                          {editSuccessId === p.id && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-250 text-emerald-850 font-black flex items-center gap-1 leading-none animate-pulse">
                              <CheckCircle className="w-2.5 h-2.5 text-emerald-600" /> TERUPDATE!
                            </span>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                          <span className="flex items-center gap-0.5">
                            <Key className="w-3 h-3 text-amber-500" />
                            <strong className="text-slate-600">User:</strong> <code className="bg-slate-100 px-1 rounded text-red-650 font-mono text-[10px]">{p.username}</code>
                          </span>
                          <span>
                            <strong className="text-slate-600">Pass:</strong> <code className="bg-slate-100 px-1 rounded font-mono text-[10px]">{p.password || '••••'}</code>
                          </span>
                          <span className="flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              p.role === 'Admin' ? 'bg-red-500' :
                              p.role === 'Manager' ? 'bg-amber-550' : 'bg-emerald-500'
                            }`} />
                            Peran: <strong className="text-slate-700">{p.role}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleEditClick(p)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-sky-650 hover:bg-slate-100 transition-colors"
                          title="Edit Kredensial"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id, p.fullName)}
                          disabled={isCurrent}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:pointer-events-none"
                          title="Hapus Personil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
