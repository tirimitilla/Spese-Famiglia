import React, { useState } from 'react';
import { FamilyProfile } from '../types';
import { Sparkles, Loader2, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  existingProfile: FamilyProfile | null;
  onLogin: () => void;
  onSetupComplete: (profile: FamilyProfile) => void;
  onResetProfile: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ existingProfile, onLogin, onSetupComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Create State
  const [familyName, setFamilyName] = useState('');

  // Se c'è un profilo locale, mostra bentornato
  if (existingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-100 text-center">
            <h1 className="text-2xl font-bold mb-4">Bentornati, {existingProfile.familyName}!</h1>
            <button 
              onClick={onLogin} 
              className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700"
            >
              Accedi alle Spese
            </button>
        </div>
      </div>
    );
  }

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyName) {
      setError('Inserisci il nome della famiglia.');
      return;
    }

    setLoading(true);
    
    // Creazione locale con lista membri vuota (o di default)
    const newProfile: FamilyProfile = {
      id: crypto.randomUUID(), // ID Locale
      familyName,
      members: [], // Nessun membro definito inizialmente
      createdAt: Date.now()
    };
    
    setTimeout(() => {
        onSetupComplete(newProfile);
        setLoading(false);
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-3xl shadow-xl max-w-md w-full border border-gray-100 relative">
        <div className="text-center mb-6 mt-2 space-y-2">
          <div className="bg-gradient-to-tr from-emerald-400 to-teal-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg transform -rotate-3 mb-4">
                <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Crea la tua Famiglia</h2>
          <p className="text-gray-500 text-sm">Inizia a tracciare le spese insieme.</p>
        </div>

        <form onSubmit={handleCreateSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Nome Famiglia</label>
            <input
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="Es. Famiglia Rossi"
              className="w-full rounded-xl border border-gray-300 p-3.5 focus:border-emerald-500 outline-none transition-all"
              required
            />
          </div>

          {error && <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-xl"><AlertCircle className="w-4 h-4" /> {error}</div>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-6 rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? <Loader2 className="animate-spin" /> : 'Inizia Ora'}
          </button>
        </form>
      </div>
    </div>
  );
};