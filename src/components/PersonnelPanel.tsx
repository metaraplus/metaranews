import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Key, 
  Trash2, 
  Edit3, 
  Check, 
  X, 
  Mail, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  Sparkles,
  Search,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { 
  db, 
  UserProfile, 
  PREDEFINED_PROFILES 
} from '../firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  deleteDoc 
} from 'firebase/firestore';

interface PersonnelPanelProps {
  currentUser: UserProfile;
  onProfileUpdated?: (updatedProfile: UserProfile) => void;
}

export default function PersonnelPanel({ currentUser, onProfileUpdated }: PersonnelPanelProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isOpenModal, setIsOpenModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  
  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<'ADMIN' | 'MANAGER' | 'STAFF'>('STAFF');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  // Password visibility map
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // Auth access checks
  const canManageAll = currentUser.role === 'ADMIN' || currentUser.role === 'MANAGER';

  // Listen to users collection in real-time
  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
      if (snapshot.empty) {
        // Seed default profiles if firestore users collection is empty
        PREDEFINED_PROFILES.forEach(async (p, idx) => {
          const uid = `u-${Date.now()}-${idx}`;
          await setDoc(doc(db, "users", uid), {
            name: p.name,
            email: p.email.toLowerCase().trim(),
            role: p.role,
            password: p.defaultPassword
          });
        });
      } else {
        const uList: UserProfile[] = [];
        snapshot.forEach((snap) => {
          const data = snap.data();
          uList.push({
            uid: snap.id,
            name: data.name || '',
            email: data.email || '',
            role: data.role || 'STAFF',
            password: data.password || ''
          });
        });
        setUsers(uList);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const togglePasswordVisibility = (uid: string) => {
    setVisiblePasswords(prev => ({
      ...prev,
      [uid]: !prev[uid]
    }));
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormName('');
    setFormEmail('');
    setFormPassword('');
    setFormRole('STAFF');
    setFormError('');
    setFormSuccess('');
    setIsOpenModal(true);
  };

  const handleOpenEdit = (user: UserProfile) => {
    setEditingUser(user);
    setFormName(user.name);
    setFormEmail(user.email);
    setFormPassword(user.password || '');
    setFormRole(user.role);
    setFormError('');
    setFormSuccess('');
    setIsOpenModal(true);
  };

  const handleDeleteUser = async (uid: string, name: string) => {
    if (uid === currentUser.uid) {
      alert("Anda tidak bisa menghapus akun Anda sendiri yang sedang aktif digunakan.");
      return;
    }
    const confirmDelete = window.confirm(`Apakah Anda yakin ingin menghapus personel "${name}"?`);
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "users", uid));
    } catch (e) {
      console.error("Error deleting user:", e);
      alert("Gagal menghapus personel.");
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    const cleanEmail = formEmail.trim().toLowerCase();
    if (!formName.trim() || !cleanEmail || !formPassword.trim()) {
      setFormError('Semua fild (Nama, E-mail, Password) wajib diisi.');
      return;
    }

    // Check email integrity
    if (!cleanEmail.includes('@')) {
      setFormError('Format alamat e-mail tidak valid.');
      return;
    }

    // Check duplicate email
    const exists = users.find(u => u.email.toLowerCase() === cleanEmail && (!editingUser || u.uid !== editingUser.uid));
    if (exists) {
      setFormError('Alamat e-mail / username sudah terdaftar untuk pengguna lain.');
      return;
    }

    try {
      if (editingUser) {
        // Edit mode
        await setDoc(doc(db, "users", editingUser.uid), {
          name: formName.trim(),
          email: cleanEmail,
          password: formPassword.trim(),
          role: formRole
        });
        
        // If updating currently logged in user
        if (editingUser.uid === currentUser.uid && onProfileUpdated) {
          onProfileUpdated({
            uid: currentUser.uid,
            name: formName.trim(),
            email: cleanEmail,
            role: formRole,
            password: formPassword.trim()
          });
        }

        setFormSuccess('Data personel berhasil diperbarui.');
        setTimeout(() => setIsOpenModal(false), 1000);
      } else {
        // Add mode
        const newUid = `u-${Date.now()}`;
        await setDoc(doc(db, "users", newUid), {
          name: formName.trim(),
          email: cleanEmail,
          password: formPassword.trim(),
          role: formRole
        });
        setFormSuccess('Personel baru berhasil ditambahkan.');
        setTimeout(() => setIsOpenModal(false), 1000);
      }
    } catch (err: any) {
      console.error("Error saving user profile:", err);
      setFormError('Terjadi kesalahan saat menyimpan data.');
    }
  };

  // Filter users based on query
  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Statistics
  const adminCount = users.filter(u => u.role === 'ADMIN').length;
  const managerCount = users.filter(u => u.role === 'MANAGER').length;
  const staffCount = users.filter(u => u.role === 'STAFF').length;

  return (
    <div className="space-y-6 animate-in fade-in duration-200" id="personnel-tab-view">
      
      {/* HEADER SECTION */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-sky-600" />
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Manajemen Personil & Hak Akses</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Kelola data penugasan akun redaksi metaranews. Anda dapat mengatur nama, username/e-mail, kata sandi, serta hak akses roles.
          </p>
        </div>

        {canManageAll && (
          <button
            onClick={handleOpenAdd}
            className="bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md shadow-sky-500/15 hover:shadow-sky-500/25 transition-all flex items-center gap-1.5 cursor-pointer self-start md:self-auto"
            id="btn-add-personnel"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tambah Personil</span>
          </button>
        )}
      </div>

      {/* METRICS & OVERVIEW CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4" id="personnel-stats-deck">
        <div className="bg-white rounded-2xl border border-slate-100 p-4 shadow-2xs">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Total Personil</span>
          <h3 className="text-2xl font-black text-slate-900 font-mono mt-1">{users.length}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Akun aktif terdaftar</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-150 p-4 shadow-2xs border-l-4 border-l-rose-500">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">ADMINISTRATOR</span>
          <h3 className="text-2xl font-black text-rose-600 font-mono mt-1">{adminCount}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Hak akses kontrol penuh</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-150 p-4 shadow-2xs border-l-4 border-l-sky-500">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">MANAGER EDITOR</span>
          <h3 className="text-2xl font-black text-sky-600 font-mono mt-1">{managerCount}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Hak edit & rekap redaktur</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-150 p-4 shadow-2xs border-l-4 border-l-emerald-500">
          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">STAFF REDAKSI</span>
          <h3 className="text-2xl font-black text-emerald-600 font-mono mt-1">{staffCount}</h3>
          <p className="text-[10px] text-slate-400 mt-1">Pengimpor rubrik berita</p>
        </div>
      </div>

      {/* SEARCH AND GRID */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Seach input */}
          <div className="relative w-full sm:max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Cari personil atau peran..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all bg-slate-50/55"
            />
          </div>

          <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Login Aktif: <span className="text-sky-600 font-extrabold">{currentUser.name} ({currentUser.role})</span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold">
            Buka basis data personel...
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs font-semibold">
            Tidak ditemukan data personil yang cocok.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">
                  <th className="py-3 px-4">Nama Personil</th>
                  <th className="py-3 px-4">Username / Email</th>
                  <th className="py-3 px-4">Kata Sandi (Password)</th>
                  <th className="py-3 px-4">Hak Akses (Role)</th>
                  <th className="py-3 px-4 text-center">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                {filteredUsers.map((user) => {
                  const isOwnAccount = user.uid === currentUser.uid;
                  return (
                    <tr 
                      key={user.uid} 
                      className={`hover:bg-slate-50/40 transition-colors ${
                        isOwnAccount ? "bg-amber-50/10" : ""
                      }`}
                    >
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border select-none ${
                            user.role === 'ADMIN' 
                              ? 'bg-rose-50 text-rose-600 border-rose-100' 
                              : user.role === 'MANAGER'
                                ? 'bg-sky-50 text-sky-600 border-sky-100'
                                : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          }`}>
                            {user.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-extrabold text-slate-800 flex items-center gap-1.5">
                              {user.name}
                              {isOwnAccount && (
                                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-sm bg-amber-100 text-amber-700 tracking-wider uppercase">
                                  SAYA
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Username Email */}
                      <td className="py-3.5 px-4 text-slate-600 text-[11px] font-mono">
                        {user.email}
                      </td>

                      {/* Password */}
                      <td className="py-3.5 px-4 text-slate-600">
                        <div className="flex items-center gap-2">
                          <input
                            type={visiblePasswords[user.uid] ? 'text' : 'password'}
                            value={user.password || '••••••••'}
                            readOnly
                            className="bg-transparent border-0 p-0 text-[11px] font-mono font-extrabold focus:ring-0 text-slate-800 w-24 outline-hidden"
                          />
                          {(canManageAll || isOwnAccount) && (
                            <button
                              onClick={() => togglePasswordVisibility(user.uid)}
                              className="text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-sm"
                              title="Tampilkan/Sembunyikan Sandi"
                            >
                              {visiblePasswords[user.uid] ? (
                                <EyeOff className="w-3.5 h-3.5" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Access Role Badge */}
                      <td className="py-3.5 px-4">
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider inline-block ${
                          user.role === 'ADMIN' 
                            ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                            : user.role === 'MANAGER'
                              ? 'bg-sky-50 text-sky-600 border border-sky-100'
                              : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        }`}>
                          {user.role}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {(canManageAll || isOwnAccount) ? (
                            <>
                              <button
                                onClick={() => handleOpenEdit(user)}
                                className="px-2 py-1 rounded-lg border border-slate-200 hover:bg-slate-100 active:scale-98 text-slate-600 hover:text-sky-600 transition-all flex items-center gap-1 cursor-pointer font-bold text-[10px]"
                                title="Ubah Pengguna"
                              >
                                <Edit3 className="w-3 h-3" />
                                <span>Edit</span>
                              </button>
                              
                              {canManageAll && !isOwnAccount && (
                                <button
                                  onClick={() => handleDeleteUser(user.uid, user.name)}
                                  className="px-2 py-1 rounded-lg border border-slate-200 hover:bg-rose-50 active:scale-98 text-slate-400 hover:text-rose-600 transition-all flex items-center gap-1 cursor-pointer font-bold text-[10px]"
                                  title="Hapus Pengguna"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Hapus</span>
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-[10px] text-slate-400 font-bold italic">Hanya Baca</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QUICK INSTRUCTION ALERT FOOTER */}
      <div className="bg-amber-50/55 border border-amber-100 rounded-2xl p-4 flex items-start gap-3">
        <Sparkles className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
        <div className="text-[11px] text-slate-600 space-y-1">
          <p className="font-extrabold text-amber-800">PETUNJUK OTORISASI ROLES:</p>
          <ul className="list-disc list-inside space-y-0.5 font-semibold">
            <li><span className="font-extrabold">ADMIN</span>: Akses total ke seluruh sistem, rekap kerja jurnalis, kelola kru jurnalis, edit rubrik, input semua berita, dan edit personil.</li>
            <li><span className="font-extrabold">MANAGER</span>: Akses review kinerja jurnalis, rekap, input berita, serta kelola personil (tambah, edit, ubah password).</li>
            <li><span className="font-extrabold">STAFF</span>: Mengimpor daftar liputan & rubrik berita. Bisa mengubah username & sandi milik akun mereka sendiri dalam tab ini.</li>
          </ul>
        </div>
      </div>

      {/* EDIT/ADD MODAL DIALOG */}
      {isOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in" id="personnel-modal bg">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden flex flex-col text-slate-800 animate-in zoom-in-95 duration-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <h3 className="font-black text-slate-900 tracking-tight text-sm">
                {editingUser ? 'Perbarui Akun & Hak Akses' : 'Tambah Akun Personel Baru'}
              </h3>
              <button
                onClick={() => setIsOpenModal(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-150 text-slate-400 hover:text-slate-700 transition-colors flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              
              {formError && (
                <div className="bg-red-50 border border-red-100 text-red-700 p-3 rounded-xl flex items-start gap-2 text-[11px]">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-semibold">{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="bg-emerald-50 border border-emerald-100 text-emerald-700 p-3 rounded-xl flex items-start gap-2 text-[11px]">
                  <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span className="font-semibold">{formSuccess}</span>
                </div>
              )}

              {/* Name Field */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase block">
                  Nama Lengkap Personel
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Budi Santoso"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all"
                  />
                </div>
              </div>

              {/* Username Email Field */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase block">
                  Username / Email Login
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="Contoh: budi.manager@supplierku.com"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase block">
                  Kata Sandi (Minimum 6 Karakter)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="Ketik kata sandi akun..."
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 focus:outline-hidden focus:ring-1 focus:ring-sky-500 focus:border-sky-500 transition-all font-mono"
                  />
                </div>
              </div>

              {/* Selection Role (Only active for managers and admins) */}
              <div className="space-y-1">
                <label className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase block">
                  Hak Akses Redaksi (Role)
                </label>
                <select
                  disabled={!canManageAll}
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs font-bold rounded-lg border border-slate-200 bg-white"
                >
                  <option value="STAFF">STAFF - Input Karya Berita</option>
                  <option value="MANAGER">MANAGER - Editor Pelaksana</option>
                  <option value="ADMIN">ADMIN - Kontrol Redaksi Penuh</option>
                </select>
                {!canManageAll && (
                  <p className="text-[9px] text-slate-400 font-bold mt-1">
                    * Hanya Admin / Manager yang dapat mengubah level Hak Akses Akun.
                  </p>
                )}
              </div>

              {/* Safe action buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpenModal(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-extrabold text-slate-500 transition-all cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-extrabold shadow-sm transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
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
