import React, { useState } from 'react';
import { FamilyProfile } from '../types';
import { Sparkles, Loader2, AlertCircle, UserPlus } from 'lucide-react';
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

  const handleGoogleLogin = async () => {
    setLoading(true);
    await signInWithGoogle();
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyName) {
      setError('Inserisci il nome della famiglia.');
      return;
    }
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
    if (!familyIdToJoin) {
      setError('Inserisci il codice famiglia.');
      return;
    }
    
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Utente non autenticato");

      const profile = await getFamilyProfile(familyIdToJoin);
      if (!profile) {
        throw new Error("Nessuna famiglia trovata con questo codice.");
      }

      await joinFamily(user.id, familyIdToJoin, user.user_metadata.full_name || 'Nuovo Membro', false);
      
      onSetupComplete(profile);
    } catch (err: any) {
      setError(err.message || "Errore durante l'adesione alla famiglia.");
    } finally {
      setLoading(false);
    }
  };

  if (isSupabaseAuth) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-100 text-center">
            <div className="bg-emerald-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Benvenuto!</h2>
            <p className="text-gray-500 text-sm mb-6">Scegli come iniziare a gestire le tue spese.</p>
            
            <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
                <button 
                    onClick={() => setMode('create')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'create' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-50'}`}
                >
                    Crea Nuova
                </button>
                <button 
                    onClick={() => setMode('join')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'join' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-50'}`}
                >
                    Unisciti
                </button>
            </div>

            {error && (
                <div className="bg-red-50 text-red-600 p-3 rounded-xl text-xs flex items-center gap-2 mb-4">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                </div>
            )}

            {mode === 'create' ? (
                <form onSubmit={handleCreateSubmit} className="space-y-4">
                    <input
                        type="text"
                        value={familyName}
                        onChange={(e) => setFamilyName(e.target.value)}
                        placeholder="Es. Famiglia Rossi"
                        className="w-full rounded-xl border border-gray-300 p-3.5 focus:border-emerald-500 outline-none transition-all"
                        required
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-xl shadow-md flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : 'Crea Famiglia'}
                    </button>
                </form>
            ) : (
                <form onSubmit={handleJoinSubmit} className="space-y-4">
                    <input
                        type="text"
                        value={familyIdToJoin}
                        onChange={(e) => setFamilyIdToJoin(e.target.value)}
                        placeholder="Incolla il Codice Famiglia"
                        className="w-full rounded-xl border border-gray-300 p-3.5 focus:border-emerald-500 outline-none transition-all font-mono text-sm"
                        required
                    />
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-md flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" /> : <><UserPlus className="w-5 h-5" /> Unisciti ora</>}
                    </button>
                </form>
            )}
          </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-100 relative text-center">
        <div className="mb-8 mt-2 space-y-2">
          <div className="bg-gradient-to-tr from-emerald-400 to-teal-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg transform -rotate-3 mb-4">
                <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Spese Familiari AI</h2>
          <p className="text-gray-500 text-sm">Gestisci il bilancio di casa in modo intelligente.</p>
        </div>

        <div className="space-y-4">
            <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-4 px-6 rounded-2xl transition-all shadow-sm disabled:opacity-70"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                    <>
                        <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                        Accedi con Google
                    </>
                )}
            </button>
            <p className="text-center text-xs text-gray-400 px-4 mt-6">
                L'accesso con Google permette di sincronizzare i dati su tutti i tuoi dispositivi in tempo reale.
            </p>
        </div>
      </div>
    </div>
  );
};