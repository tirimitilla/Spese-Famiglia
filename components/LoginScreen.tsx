
import React, { useState } from 'react';
import { FamilyProfile, Member } from '../types';
import { UserPlus, Sparkles, Loader2, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  existingProfile: FamilyProfile | null;
  onLogin: () => void;
  onSetupComplete: (profile: FamilyProfile) => void;
  onResetProfile: () => void;
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#6366F1'];

export const LoginScreen: React.FC<LoginScreenProps> = ({ existingProfile, onLogin, onSetupComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Create State
  const [familyName, setFamilyName] = useState('');
  const [members, setMembers] = useState<Member[]>([
    { id: '1', name: 'Papà', color: COLORS[1] },
    { id: '2', name: 'Mamma', color: COLORS[3] }
  ]);
  const [newMemberName, setNewMemberName] = useState('');

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

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    const color = COLORS[members.length % COLORS.length];
    setMembers([...members, { id: crypto.randomUUID(), name: newMemberName.trim(), color }]);
    setNewMemberName('');
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyName || members.length === 0) {
      setError('Inserisci il nome della famiglia e almeno un membro.');
      return;
    }

    setLoading(true);
    
    // Creazione locale
    const newProfile: FamilyProfile = {
      id: crypto.randomUUID(), // ID Locale
      familyName,
      members,
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
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Cognome Famiglia</label>
            <input
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="Es. Famiglia Rossi"
              className="w-full rounded-xl border border-gray-300 p-3.5 focus:border-emerald-500 outline-none transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Chi ne fa parte?</label>
            <div className="flex flex-wrap gap-2 mb-3">
              {members.map((m) => (
                <span key={m.id} className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-sm flex items-center gap-1 border border-emerald-100">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }}></span>
                    {m.name}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="Nome membro..."
                className="flex-1 rounded-xl border border-gray-300 p-2.5 text-sm focus:border-emerald-500 outline-none"
              />
              <button
                type="button"
                onClick={handleAddMember}
                className="bg-emerald-100 text-emerald-700 p-2.5 rounded-xl hover:bg-emerald-200"
              >
                <UserPlus className="w-5 h-5" />
              </button>
            </div>
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
