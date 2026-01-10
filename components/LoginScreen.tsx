
import React, { useState, useEffect } from 'react';
import { FamilyProfile } from '../types';
import { Sparkles, Loader2, Mail, Lock, LogIn, UserPlus, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import * as SupabaseService from '../services/supabaseService';
import { supabase } from '../supabaseClient';

interface LoginScreenProps {
  user?: any;
  onSetupComplete: (profile: FamilyProfile) => void;
  onUserLogin?: (user: any) => void;
  isSupabaseAuth?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ user, onSetupComplete, onUserLogin, isSupabaseAuth }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
        const { data, error: signUpErr } = await SupabaseService.signUpWithEmail(email, password);
        if (signUpErr) throw signUpErr;
        setSuccess("Account creato! Verifica la tua email.");
        setIsRegistering(false);
      } else {
        const { data, error: signInErr } = await SupabaseService.signInWithEmail(email, password);
        if (signInErr) throw signInErr;
        if (data.user && onUserLogin) onUserLogin(data.user);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await SupabaseService.signInWithGoogle();
    } catch (err) {
      setError("Errore login Google");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const activeUser = user || await SupabaseService.getCurrentUser();
      if (!activeUser) throw new Error("Utente non autenticato.");
      const familyId = await SupabaseService.createFamilyAndJoin(activeUser.id, familyName, activeUser.email || 'Utente');
      onSetupComplete({ id: familyId, familyName, members: [] });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const activeUser = user || await SupabaseService.getCurrentUser();
      if (!activeUser) throw new Error("Utente non autenticato.");
      const { data: profile } = await supabase.from('families').select('*').eq('id', familyIdToJoin.trim()).single();
      if (!profile) throw new Error("Gruppo non trovato. Controlla il codice.");
      await SupabaseService.joinFamily(activeUser.id, profile.id, activeUser.email?.split('@')[0] || 'Utente');
      onSetupComplete({ id: profile.id, familyName: profile.family_name, members: [] });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isSupabaseAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-100">
          <div className="flex justify-center mb-4">
             <div className="bg-emerald-100 p-3 rounded-2xl">
                <ShieldCheck className="w-8 h-8 text-emerald-600" />
             </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Spazio Riservato</h2>
          <p className="text-gray-500 text-xs text-center mb-6">Crea un nuovo gruppo privato o unisciti a uno esistente con un codice.</p>
          
          <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
            <button onClick={() => setMode('create')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg ${mode === 'create' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}>Nuovo Gruppo</button>
            <button onClick={() => setMode('join')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg ${mode === 'join' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}>Unisciti</button>
          </div>
          
          {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {error}</div>}
          
          {mode === 'create' ? (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Nome dello Spazio</label>
                <input type="text" value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="Es. Casa Mia, Ufficio..." className="w-full rounded-xl border border-gray-300 p-4 bg-gray-50 focus:ring-2 focus:ring-emerald-100 outline-none" required />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-md hover:bg-emerald-700 transition-colors">
                {loading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : 'Inizia Ora'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1 ml-1">Codice Invito</label>
                <input type="text" value={familyIdToJoin} onChange={(e) => setFamilyIdToJoin(e.target.value)} placeholder="Incolla l'ID ricevuto" className="w-full rounded-xl border border-gray-300 p-4 bg-gray-50 font-mono text-sm focus:ring-2 focus:ring-blue-100 outline-none" required />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-md hover:bg-blue-700 transition-colors">
                {loading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : 'Entra nel Gruppo'}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full text-center">
        <div className="bg-emerald-500 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Spese Famiglia AI</h2>
        <p className="text-gray-500 text-sm mb-8">Gestione spese intelligente e 100% privata.</p>

        {success && <div className="bg-emerald-50 text-emerald-700 p-4 rounded-xl text-xs mb-4 flex items-center gap-2 justify-center font-bold"><CheckCircle2 className="w-4 h-4" /> {success}</div>}

        {authMode === 'google' ? (
          <div className="space-y-4">
            <button onClick={handleGoogleLogin} disabled={loading} className="w-full flex items-center justify-center gap-4 bg-white border-2 border-gray-100 py-4 rounded-2xl font-bold hover:bg-gray-50 transition-all shadow-sm">
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-6 h-6" />} Accedi con Google
            </button>
            <button onClick={() => setAuthMode('email')} className="text-emerald-600 font-bold text-sm">Oppure usa Email</button>
          </div>
        ) : (
          <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-gray-300 p-4 bg-gray-50" placeholder="La tua Email" required />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-gray-300 p-4 bg-gray-50" placeholder="Scegli una Password" minLength={6} required />
            {error && <div className="text-red-500 text-xs font-bold text-center">{error}</div>}
            <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl hover:bg-emerald-700 transition-colors shadow-md">
              {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (isRegistering ? 'Crea Account Gratuito' : 'Entra')}
            </button>
            <div className="flex flex-col gap-2">
              <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="text-xs text-emerald-600 font-bold w-full text-center">
                {isRegistering ? 'Hai già un account? Accedi' : 'Nuovo utente? Registrati qui'}
              </button>
              <button type="button" onClick={() => setAuthMode('google')} className="text-xs text-gray-400 w-full text-center">Torna al login Google</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
