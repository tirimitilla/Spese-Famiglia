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
    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError("Errore durante il login con Google.");
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

      const profile = await getFamilyProfile(familyIdToJoin);
      if (!profile) throw new Error("Codice famiglia non trovato.");

      await joinFamily(user.id, familyIdToJoin, user.user_metadata.full_name || 'Nuovo Membro', false);
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
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-100 text-center">
          <div className="bg-emerald-100 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Configurazione Famiglia</h2>
          
          <div className="flex p-1 bg-gray-100 rounded-xl mb-6">
            <button 
              onClick={() => setMode('create')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'create' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}
            >
              Crea
            </button>
            <button 
              onClick={() => setMode('join')}
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${mode === 'join' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500'}`}
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
                placeholder="Nome Famiglia (es. Rossi)"
                className="w-full rounded-xl border border-gray-300 p-3.5 outline-none focus:border-emerald-500"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : 'Inizia Ora'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleJoinSubmit} className="space-y-4">
              <input
                type="text"
                value={familyIdToJoin}
                onChange={(e) => setFamilyIdToJoin(e.target.value)}
                placeholder="Incolla Codice Famiglia"
                className="w-full rounded-xl border border-gray-300 p-3.5 outline-none focus:border-emerald-500 font-mono text-sm"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : <><UserPlus className="w-5 h-5" /> Entra</>}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 text-center">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-100">
        <div className="bg-emerald-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg rotate-3">
          <Sparkles className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">Spese Familiari AI</h2>
        <p className="text-gray-500 text-sm mt-2 mb-8">Sincronizza le tue spese con tutta la famiglia in tempo reale.</p>
        
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-bold py-4 px-6 rounded-2xl shadow-sm transition-all"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
              Accedi con Google
            </>
          )}
        </button>
      </div>
    </div>
  );
};