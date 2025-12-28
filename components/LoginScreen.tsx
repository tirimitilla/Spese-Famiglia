import React, { useState, useEffect } from 'react';
import { FamilyProfile } from '../types';
import { Sparkles, Loader2, Mail, Lock, LogIn, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';
import * as SupabaseService from '../services/supabaseService';
import { supabase } from '../supabaseClient';

interface LoginScreenProps {
  onSetupComplete: (profile: FamilyProfile) => void;
  onUserLogin?: (user: any) => void;
  isSupabaseAuth?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSetupComplete, onUserLogin, isSupabaseAuth }) => {
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
    try {
      const user = await SupabaseService.getCurrentUser();
      if (!user) throw new Error("Utente non autenticato.");
      const familyId = await SupabaseService.createFamilyAndJoin(user.id, familyName, user.email || 'Utente');
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
    try {
      const user = await SupabaseService.getCurrentUser();
      if (!user) throw new Error("Utente non autenticato.");
      const { data: profile } = await supabase.from('families').select('*').eq('id', familyIdToJoin.trim()).single();
      if (!profile) throw new Error("Gruppo non trovato.");
      await SupabaseService.joinFamily(user.id, profile.id, user.email?.split('@')[0] || 'Utente');
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
          <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Configurazione Famiglia</h2>
          <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
            <button onClick={() => setMode('create')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg ${mode === 'create' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}>Crea</button>
            <button onClick={() => setMode('join')} className={`flex-1 py-2.5 text-sm font-bold rounded-lg ${mode === 'join' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}>Unisciti</button>
          </div>
          {error && <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs mb-4">{error}</div>}
          {mode === 'create' ? (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <input type="text" value={familyName} onChange={(e) => setFamilyName(e.target.value)} placeholder="Nome Gruppo (es. Famiglia Rossi)" className="w-full rounded-xl border border-gray-300 p-4 bg-gray-50" required />
              <button type="submit" disabled={loading} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl shadow-md">
                {loading ? <Loader2 className="animate-spin w-5 h-5 mx-auto" /> : 'Crea e Inizia'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <input type="text" value={familyIdToJoin} onChange={(e) => setFamilyIdToJoin(e.target.value)} placeholder="Incolla il codice ID" className="w-full rounded-xl border border-gray-300 p-4 bg-gray-50 font-mono text-sm" required />
              <button type="submit" disabled={loading} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-md">
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
        <h2 className="text-3xl font-extrabold text-gray-900 mb-8">Spese Famiglia AI</h2>

        {authMode === 'google' ? (
          <div className="space-y-4">
            <button onClick={handleGoogleLogin} disabled={loading} className="w-full flex items-center justify-center gap-4 bg-white border-2 border-gray-100 py-4 rounded-2xl font-bold">
              {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="G" className="w-6 h-6" />} Accedi con Google
            </button>
            <button onClick={() => setAuthMode('email')} className="text-emerald-600 font-bold text-sm">Usa Email e Password</button>
          </div>
        ) : (
          <form onSubmit={handleEmailAuth} className="space-y-4 text-left">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-gray-300 p-4" placeholder="Email" required />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-gray-300 p-4" placeholder="Password" minLength={6} required />
            {error && <div className="text-red-500 text-xs">{error}</div>}
            <button type="submit" className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl">
              {isRegistering ? 'Crea Account' : 'Accedi'}
            </button>
            <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="text-xs text-emerald-600 font-bold w-full text-center">
              {isRegistering ? 'Hai un account? Accedi' : 'Nuovo utente? Registrati'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};