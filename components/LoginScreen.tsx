import React, { useState } from 'react';
import { FamilyProfile } from '../types';
import { 
  Sparkles, Loader2, AlertCircle, CheckCircle2, ShieldCheck, 
  Users, Mail, LogIn, UserPlus 
} from 'lucide-react';
import * as FirebaseService from '../services/firebaseService';

interface LoginScreenProps {
  user?: any;
  onSetupComplete: (profile: FamilyProfile) => void;
  onUserLogin?: (user: any) => void;
  isFirebaseAuth?: boolean;
  onEnterLocalMode?: () => void;
  connectionError?: boolean;
  onReconnect?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ 
  user, 
  onSetupComplete, 
  onUserLogin, 
  isFirebaseAuth,
  onEnterLocalMode,
  connectionError,
  onReconnect
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [familyIdToJoin, setFamilyIdToJoin] = useState('');
  const [customFamilyCode, setCustomFamilyCode] = useState('');
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [authMode, setAuthMode] = useState<'google' | 'email'>('google');
  const [isRegistering, setIsRegistering] = useState(false);

  const formatError = (err: any): string => {
    if (!err) return "Errore sconosciuto";
    const msg = err.message || (typeof err === 'string' ? err : JSON.stringify(err));
    if (msg.includes('auth/popup-closed-by-user')) {
      return "Accesso annullato dalla finestra di login.";
    }
    if (msg.includes('auth/user-not-found') || msg.includes('auth/wrong-password') || msg.includes('auth/invalid-credential')) {
      return "Credenziali non valide. Verifica email e password o usa l'accesso Google.";
    }
    if (msg.includes('auth/email-already-in-use')) {
      return "Questa email è già registrata. Effettua l'accesso.";
    }
    if (msg.includes('Gruppo famiglia non trovato') || msg.includes('Codice gruppo non trovato')) {
      return "Gruppo famiglia non trovato. Verifica il codice inserito o creane uno nuovo.";
    }
    if (msg.includes('già in uso')) {
      return "Questo codice gruppo è già utilizzato da un'altra famiglia. Scegline un altro.";
    }
    if (msg.includes('Missing or insufficient permissions')) {
      return "Codice non trovato o permessi non autorizzati. Se il gruppo non esiste ancora, puoi crearlo nella scheda 'Nuovo Gruppo'.";
    }
    return msg;
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (isRegistering) {
        const cred = await FirebaseService.signUpWithEmail(email, password);
        setSuccess("Account creato con successo!");
        if (cred.user && onUserLogin) onUserLogin(cred.user);
      } else {
        const cred = await FirebaseService.signInWithEmail(email, password);
        if (cred.user && onUserLogin) onUserLogin(cred.user);
      }
    } catch (err: any) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await FirebaseService.signInWithGoogle();
      if (res.user && onUserLogin) {
        onUserLogin(res.user);
      }
    } catch (err: any) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyName.trim()) {
      setError("Inserisci il nome del gruppo.");
      return;
    }
    setLoading(true);
    setError('');
    try {
      const activeUser = user || FirebaseService.getCurrentUser();
      if (!activeUser) throw new Error("Utente non autenticato.");
      const familyId = await FirebaseService.createFamilyAndJoin(
        activeUser.uid, 
        familyName.trim(), 
        activeUser.email || 'Utente',
        customFamilyCode.trim() || undefined
      );
      onSetupComplete({ id: familyId, familyName: familyName.trim(), members: [] });
    } catch (err: any) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyIdToJoin.trim()) {
      setError("Inserisci il codice del gruppo.");
      return;
    }
    setLoading(true);
    setError('');
    try {
      const activeUser = user || FirebaseService.getCurrentUser();
      if (!activeUser) throw new Error("Utente non autenticato.");
      const result = await FirebaseService.joinFamily(
        activeUser.uid, 
        familyIdToJoin.trim(), 
        activeUser.displayName || activeUser.email?.split('@')[0] || 'Utente'
      );
      const famData = result.family as any;
      onSetupComplete({ 
        id: familyIdToJoin.trim(), 
        familyName: famData?.familyName || 'Famiglia', 
        members: [] 
      });
    } catch (err: any) {
      setError(formatError(err));
    } finally {
      setLoading(false);
    }
  };

  // Se l'utente è loggato con Firebase ma non appartiene ancora a un gruppo famiglia
  if (isFirebaseAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 relative">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-100">
          <div className="flex justify-center mb-4">
             <div className="bg-emerald-100 p-3 rounded-2xl">
                <ShieldCheck className="w-8 h-8 text-emerald-600" />
             </div>
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2 text-center">Spazio Riservato</h2>
          <p className="text-gray-500 text-xs text-center mb-6">Crea un nuovo spazio famiglia o unisciti con un codice condiviso.</p>
          
          <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
            <button 
              onClick={() => { setMode('create'); setError(''); }} 
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${mode === 'create' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}
            >
              Nuovo Gruppo
            </button>
            <button 
              onClick={() => { setMode('join'); setError(''); }} 
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${mode === 'join' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}
            >
              Unisciti
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs mb-4 space-y-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
              {mode === 'join' && familyIdToJoin.trim() && (
                <div className="pt-2 border-t border-red-200/60 flex items-center justify-between">
                  <span className="text-[11px] text-red-600">Vuoi crearlo tu con questo codice?</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomFamilyCode(familyIdToJoin.trim());
                      setFamilyName(`Famiglia ${familyIdToJoin.trim()}`);
                      setMode('create');
                      setError('');
                    }}
                    className="text-[11px] font-bold text-emerald-700 bg-white px-2.5 py-1 rounded-lg border border-emerald-300 hover:bg-emerald-50 transition shadow-xs"
                  >
                    Crea con codice {familyIdToJoin.trim()}
                  </button>
                </div>
              )}
            </div>
          )}

          {mode === 'create' ? (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Nome Famiglia / Gruppo</label>
                <input 
                  type="text" 
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="Es. Famiglia Rossi"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">
                  Codice Gruppo <span className="text-gray-400 font-normal">(Opzionale)</span>
                </label>
                <input 
                  type="text" 
                  value={customFamilyCode}
                  onChange={(e) => setCustomFamilyCode(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ''))}
                  placeholder="Es. 1234 oppure lascia vuoto per codice auto"
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-mono"
                />
                <p className="text-[11px] text-gray-400 mt-1">
                  Puoi inserire un codice a scelta (es. 1234) da comunicare agli altri membri.
                </p>
              </div>

              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Crea Spazio Famiglia"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1">Codice Spazio Famiglia</label>
                <input 
                  type="text" 
                  value={familyIdToJoin}
                  onChange={(e) => setFamilyIdToJoin(e.target.value)}
                  placeholder="Es. 1234 o fam_abc123456"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white font-mono"
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Unisciti al Gruppo"}
              </button>
            </form>
          )}

          <div className="mt-6 pt-4 border-t border-gray-100 flex justify-between items-center text-xs text-gray-400">
            <span>Accesso come: <strong className="text-gray-600">{user?.email || 'Utente'}</strong></span>
            <button 
              onClick={async () => {
                await FirebaseService.signOut();
                window.location.reload();
              }}
              className="text-red-500 hover:underline font-semibold"
            >
              Disconnetti
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-100">
        <div className="flex justify-center mb-4">
           <div className="bg-emerald-600 p-3.5 rounded-2xl shadow-lg shadow-emerald-200 text-white">
              <Sparkles className="w-7 h-7" />
           </div>
        </div>
        <h2 className="text-2xl font-black text-gray-800 tracking-tight text-center mb-1">Spese Familiari AI</h2>
        <p className="text-gray-400 text-xs text-center mb-6">Sincronizzazione Cloud in tempo reale con Firebase</p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-xs mb-4 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 p-3 rounded-xl text-xs mb-4 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Accesso Rapido Google */}
        <div className="space-y-3 mb-6">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 py-3.5 px-4 rounded-2xl font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>Accedi con Google</span>
          </button>
        </div>

        <div className="relative flex py-2 items-center mb-6">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="flex-shrink mx-4 text-gray-400 text-xs uppercase tracking-wider font-semibold">oppure email</span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        <form onSubmit={handleEmailAuth} className="space-y-3.5">
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Email</label>
            <input 
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tuonome@esempio.com"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">Password</label>
            <input 
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              required
            />
          </div>
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-sm hover:bg-emerald-700 transition shadow-lg shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              isRegistering ? (
                <>
                  <UserPlus className="w-4 h-4" /> Registrati
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" /> Accedi
                </>
              )
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            onClick={() => { setIsRegistering(!isRegistering); setError(''); setSuccess(''); }}
            className="text-xs text-emerald-600 hover:underline font-semibold"
          >
            {isRegistering ? "Hai già un account? Accedi qui" : "Non hai un account? Registrati"}
          </button>
        </div>

        {onEnterLocalMode && (
          <div className="mt-6 pt-5 border-t border-gray-100 text-center">
            <button
              onClick={onEnterLocalMode}
              className="text-xs text-gray-400 hover:text-gray-600 font-semibold transition"
            >
              Continua offline (Modalità Locale)
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
