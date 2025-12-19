import React, { useState } from 'react';
import { FamilyProfile } from '../types';
import { Sparkles, Loader2, AlertCircle, UserPlus, HelpCircle } from 'lucide-react';
import { signInWithGoogle, joinFamily, getFamilyProfile } from '../services/supabaseService';
import { supabase } from '../src/supabaseClient';

interface LoginScreenProps {
  onSetupComplete: (profile: FamilyProfile) => void;
  isSupabaseAuth?: boolean;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onSetupComplete, isSupabaseAuth }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [familyName, setFamilyName] = useState('');
  const [familyIdToJoin, setFamilyIdToJoin] = useState('');
  const [mode, setMode] = useState<'create' | 'join'>('create');
  const [showHelp, setShowHelp] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError("Errore durante il login con Google. Verifica la connessione.");
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
    
    setTimeout(() => {
        onSetupComplete(newProfile);
        setLoading(false);
    }, 500);
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyIdToJoin) return;
    
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Accedi prima con Google per unirti a una famiglia.");

      const profile = await getFamilyProfile(familyIdToJoin.trim());
      if (!profile) throw new Error("Codice famiglia non trovato. Controlla che sia corretto.");

      await joinFamily(user.id, profile.id, user.user_metadata.full_name || 'Nuovo Membro', false);
      onSetupComplete(profile);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (isSupabaseAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-100 text-center animate-in fade-in zoom-in duration-300">
          <div className="bg-emerald-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Configurazione Famiglia</h2>
          <p className="text-gray-500 text-sm mb-6">Crea un nuovo gruppo o unisciti a uno esistente.</p>
          
          <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
            <button 
              onClick={() => setMode('create')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${mode === 'create' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}
            >
              Crea
            </button>
            <button 
              onClick={() => setMode('join')}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${mode === 'join' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}
            >
              Unisciti
            </button>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-xs flex items-center gap-3 mb-4 text-left border border-red-100">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
          )}

          {mode === 'create' ? (
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="text-left">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Nome del gruppo</label>
                <input
                    type="text"
                    value={familyName}
                    onChange={(e) => setFamilyName(e.target.value)}
                    placeholder="Es. Famiglia Rossi"
                    className="w-full rounded-xl border border-gray-300 p-4 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all shadow-sm"
                    required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all"
              >
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Crea Famiglia'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinSubmit} className="space-y-4">
               <div className="text-left">
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Codice Famiglia</label>
                <input
                    type="text"
                    value={familyIdToJoin}
                    onChange={(e) => setFamilyIdToJoin(e.target.value)}
                    placeholder="Incolla il codice ID..."
                    className="w-full rounded-xl border border-gray-300 p-4 outline-none focus:border-emerald-500 font-mono text-sm shadow-sm"
                    required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-all"
              >
                {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <><UserPlus className="w-5 h-5" /> Entra nel gruppo</>}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 text-center">
      <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-md w-full border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-emerald-500 w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl rotate-3">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Spese Famiglia AI</h2>
        <p className="text-gray-500 text-base mt-3 mb-10 leading-relaxed">
            Gestisci gli acquisti quotidiani e sincronizza il bilancio con tutta la famiglia.
        </p>
        
        {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm flex items-center gap-3 mb-6 text-left">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              {error}
            </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-4 bg-white border-2 border-gray-100 hover:border-emerald-500 hover:bg-emerald-50 text-gray-700 font-bold py-4 px-6 rounded-2xl shadow-sm transition-all active:scale-[0.98]"
        >
          {loading ? <Loader2 className="w-6 h-6 animate-spin text-emerald-600" /> : (
            <>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
              Accedi con Google
            </>
          )}
        </button>

        <button 
            onClick={() => setShowHelp(!showHelp)}
            className="mt-8 text-gray-400 hover:text-emerald-600 text-xs flex items-center justify-center gap-1 mx-auto transition-colors"
        >
            <HelpCircle className="w-3.5 h-3.5" /> Serve aiuto con la configurazione?
        </button>

        {showHelp && (
            <div className="mt-4 p-4 bg-emerald-50 rounded-xl text-left text-xs text-emerald-800 leading-relaxed animate-in fade-in slide-in-from-top-2">
                <p className="font-bold mb-1">Se il login fallisce:</p>
                <ol className="list-decimal list-inside space-y-1">
                    <li>Controlla il link in "Site URL" su Supabase.</li>
                    <li>Deve essere: <b>{window.location.origin}</b></li>
                    <li>Verifica che il redirect callback di Google sia attivo.</li>
                </ol>
            </div>
        )}
      </div>
    </div>
  );
};