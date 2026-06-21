import React, { useState, useEffect } from 'react';
import { Mail, Lock, LogIn, Users, Sparkles, AlertCircle, Loader2, Newspaper } from 'lucide-react';
import { PREDEFINED_PROFILES, secureLogin, UserProfile, db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

interface LoginScreenProps {
  onLoginSuccess: (profile: UserProfile) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [dbUsers, setDbUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snap = await getDocs(collection(db, "users"));
        const list: UserProfile[] = [];
        snap.forEach((docSnap) => {
          list.push({ uid: docSnap.id, ...docSnap.data() } as UserProfile);
        });
        if (list.length > 0) {
          setDbUsers(list);
        } else {
          // Initialize fallback UI list
          const fallback = PREDEFINED_PROFILES.map((p, idx) => ({
            uid: `predefined-${idx}`,
            name: p.name,
            email: p.email,
            role: p.role,
            password: p.defaultPassword
          }));
          setDbUsers(fallback);
        }
      } catch (e) {
        console.error("Error fetching profiles:", e);
        const fallback = PREDEFINED_PROFILES.map((p, idx) => ({
          uid: `predefined-${idx}`,
          name: p.name,
          email: p.email,
          role: p.role,
          password: p.defaultPassword
        }));
        setDbUsers(fallback);
      }
    };
    fetchUsers();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Harap masukkan email dan password.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const profile = await secureLogin(email, password);
      onLoginSuccess(profile);
    } catch (err: any) {
      setError(err.message || 'Kredensial salah atau tidak dapat memproses masuk.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProfile = async (profileEmail: string, pass: string) => {
    setEmail(profileEmail);
    setPassword(pass);
    setError('');
    setLoading(true);
    try {
      const profile = await secureLogin(profileEmail, pass);
      onLoginSuccess(profile);
    } catch (err: any) {
      setError(err.message || 'Kredensial salah atau tidak dapat memproses masuk.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 font-sans" id="login-container">
      {/* Upper Header Logo Brand */}
      <div className="flex items-center gap-3.5 mb-8 text-left max-w-sm sm:max-w-md w-full px-2" id="login-brand-header">
        {/* Garuda / Redaksi Emblem Frame */}
        <div className="w-12 h-12 bg-sky-600 rounded-xl flex items-center justify-center shadow-md shadow-sky-600/20 shrink-0">
          <Newspaper className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="font-extrabold text-slate-900 text-sm tracking-wide leading-tight uppercase font-sans">
            SISTEM REDAKSI METARANEWS
          </h1>
          <p className="text-[11px] font-bold text-slate-400 tracking-normal">
            Portal Kinerja & Manajemen Rubrik Berita v2.0
          </p>
        </div>
      </div>

      {/* Main Login Card */}
      <div 
        className="max-w-md w-full bg-white shadow-xl shadow-slate-100/80 rounded-3xl border border-slate-100 p-6 sm:p-8 flex flex-col text-slate-800 animate-in fade-in slide-in-from-bottom-4 duration-300"
        id="login-card"
      >
        <div className="text-center mb-6">
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight" id="login-title">
            Kredensial Port Kontrol
          </h2>
          <p className="text-xs font-semibold text-slate-500 mt-1.5 leading-relaxed">
            Masuk menggunakan alamat email dan kata sandi Anda.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 p-3 rounded-xl mb-4 flex items-start gap-2 text-xs">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase block">
              ALAMAT E-MAIL
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contoh: budi.admin@supplierku.com"
                className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500 focus:ring-1 focus:focus:ring-sky-500 bg-white placeholder-slate-400 text-slate-800 transition-all"
                id="login-email-input"
                required
                disabled={loading}
              />
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-extrabold text-slate-400 tracking-wider uppercase block">
              KATA SANDI (PASSWORD)
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Masukkan kata sandi Anda"
                className="w-full pl-10 pr-4 py-2.5 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-hidden focus:border-sky-500 focus:ring-1 focus:focus:ring-sky-500 bg-white placeholder-slate-400 text-slate-800 transition-all"
                id="login-password-input"
                required
                disabled={loading}
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl font-extrabold text-xs text-sky-950 bg-[#bce4ec] hover:bg-[#a9d9e4] active:scale-98 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            id="login-submit-button"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-sky-900" />
                <span>Mengecek Kredensial...</span>
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4 text-sky-900" />
                <span>Verifikasi Masuk</span>
              </>
            )}
          </button>
        </form>

        <div className="my-5 border-t border-slate-100 flex items-center justify-center">
          <span className="bg-white px-3 text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
            Atau Pilih Akun
          </span>
        </div>

        {/* PROFILE CHOOOSER LIST */}
        <div className="space-y-2.5" id="profile-chooser-section">
          <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-slate-400 tracking-wider uppercase">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            PILIH PROFIL
          </div>

          <div className="space-y-2">
            {dbUsers.map((prof) => (
              <button
                key={prof.uid}
                type="button"
                onClick={() => !loading && handleSelectProfile(prof.email, prof.password || '')}
                disabled={loading}
                className="w-full flex items-center justify-between p-3.5 bg-white hover:bg-slate-50/50 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all text-left shadow-2xs group cursor-pointer"
              >
                <div>
                  <span className="text-xs font-black text-slate-800 block group-hover:text-sky-600 transition-colors">
                    {prof.name}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400 block mt-0.5">
                    {prof.email}
                  </span>
                </div>
                <div>
                  <span className={`text-[9px] font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                    prof.role === 'ADMIN' 
                      ? 'bg-rose-50 text-rose-600 border border-rose-100' 
                      : prof.role === 'MANAGER'
                        ? 'bg-sky-50 text-sky-600 border border-sky-100'
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                  }`}>
                    {prof.role}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer Sparkles Cookie Note */}
        <div className="mt-6 pt-4 border-t border-slate-50 flex items-center justify-center gap-1.5 text-[10px] font-semibold text-slate-400" id="login-cookies-footer">
          <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
          <span>Sesi multi-user disimpan berdasarkan cookies/state lokal</span>
        </div>
      </div>
    </div>
  );
}
