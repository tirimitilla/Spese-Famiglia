import React, { useState } from 'react';
import { FamilyProfile } from '../types';
import { Sparkles, Loader2, Mail, Lock, LogIn, UserPlus } from 'lucide-react';
import { signInWithGoogle, signInWithEmail, signUpWithEmail } from '../services/supabaseService';
import { supabase } from '../src/supabaseClient';

interface LoginScreenProps {
  onSetupComplete: (profile: FamilyProfile) => void;
  isSupabaseAuth?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSetupComplete, isSupabaseAuth }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [familyIdToJoin, setFamilyIdToJoin] = useState('');
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [authMode, setAuthMode] = useState<'google' | 'email'>('google');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isRegistering) {
        const { data, error: signUpErr } = await signUpWithEmail(email, password);
        if (signUpErr) throw signUpErr;
        if (data.user) {
          alert("Registrazione completata! Controlla la tua email per confermare l'account.");
        }
      } else {
        const { error: signInErr } = await signInWithEmail(email, password);
        if (signInErr) throw signInErr;
      }
    } catch (err: any) {
      setError(err.message || "Errore durante l'autenticazione.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError("Errore login Google. Verifica la configurazione.");
      setLoading(false);
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyName) return;
    setLoading(true);
    const newProfile: FamilyProfile = {
      id: crypto.randomUUID(),
      familyName,
      members: [],
      createdAt: Date.now()
    };
    onSetupComplete(newProfile);
    setLoading(false);
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyIdToJoin) return;
    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Accedi prima per unirti a una famiglia.");
      
      const { data: profile, error: fetchErr } = await supabase
        .from('families')
        .select('*')
        .eq('id', familyIdToJoin.trim())
        .single();

      if (fetchErr || !profile) throw new Error("Codice famiglia non trovato.");

      onSetupComplete({
        id: profile.id,
        familyName: profile.family_name,
        members: profile.members || [],
        createdAt: new Date(profile.created_at).getTime()
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isSupabaseAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-100 animate-in fade-in zoom-in">
          <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Configurazione Famiglia</h2>
          <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
            <button onClick={() => setMode('create')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${mode === 'create' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}>Crea</button>
            <button onClick={() => setMode('join')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${mode === 'join' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}>Unisciti</button>
          </div>
          {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs mb-4 border border-red-100">{error}</div>}
          {mode === 'create' ? (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <input type="text" value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="Nome del gruppo (es. Famiglia Rossi)" className="w-full rounded-xl border border-gray-300 p-4 outline-none focus:border-emerald-500" required />
              <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-md">{loading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : 'Crea Famiglia'}</button>
            </form>
          ) : (
            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <input type="text" value={familyIdToJoin} onChange={(e) => setFamilyIdToJoin(e.target.value)} placeholder="Incolla il codice ID ricevuto..." className="w-full rounded-xl border border-gray-300 p-4 outline-none focus:border-emerald-500 font-mono text-sm" required />
              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-md">{loading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : 'Entra nel gruppo'}</button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full border border-gray-100 text-center">
        <div className="bg-emerald-500 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Spese Famiglia AI</h2>
        <p className="text-gray-500 mb-8">Gestione bilancio sicura con RLS.</p>

        {authMode === 'google' ? (
          <div className="space-y-4">
            <button onClick={handleGoogleLogin} disabled={loading} className="w-full flex items-center justify-center gap-4 bg-white border-2 border-gray-100 hover:border-emerald-500 py-4 px-6 rounded-2xl font-bold transition-all">
              {loading ? <Loader2 className="w-6 h-6 animate-spin text-emerald-600" /> : <><img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" /> Accedi con Google</>}
            </button>
            <div className="relative py-4">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-100"></span></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">Oppure</span></div>
            </div>
            <button onClick={() => setAuthMode('email')} className="w-full flex items-center justify-center gap-2 text-emerald-600 font-bold text-sm bg-emerald-50 py-3 rounded-xl hover:bg-emerald-100 transition-colors">
              <Mail className="w-4 h-4" /> Usa Email e Password
            </button>
          </div>
        ) : (
          <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-12 w-full rounded-xl border border-gray-300 p-4 outline-none focus:border-emerald-500" placeholder="tua@email.com" required />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-12 w-full rounded-xl border border-gray-300 p-4 outline-none focus:border-emerald-500" placeholder="••••••••" required />
              </div>
            </div>
            {error && <p className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-lg border border-red-100">{error}</p>}
            <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-md flex items-center justify-center gap-2">
              {loading ? <Loader2 className="animate-spin w-5 h-5" /> : (isRegistering ? <><UserPlus className="w-5 h-5" /> Registrati</> : <><LogIn className="w-5 h-5" /> Accedi</>)}
            </button>
            <div className="flex justify-between items-center mt-4">
              <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="text-emerald-600 font-bold text-xs hover:underline">
                {isRegistering ? "Hai già un account? Accedi" : "Non hai un account? Registrati"}
              </button>
              <button type="button" onClick={() => setAuthMode('google')} className="text-gray-400 font-bold text-xs">Torna indietro</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};