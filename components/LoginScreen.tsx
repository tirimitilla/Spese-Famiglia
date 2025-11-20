import React, { useState } from 'react';
import { FamilyProfile, Member } from '../types';
import { ShieldCheck, Users, ArrowRight, Plus, UserPlus, Lock } from 'lucide-react';

interface LoginScreenProps {
  existingProfile: FamilyProfile | null;
  onLogin: () => void;
  onSetupComplete: (profile: FamilyProfile) => void;
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#6366F1'];

export const LoginScreen: React.FC<LoginScreenProps> = ({ existingProfile, onLogin, onSetupComplete }) => {
  // Setup State
  const [familyName, setFamilyName] = useState('');
  const [pin, setPin] = useState('');
  const [members, setMembers] = useState<Member[]>([
    { id: '1', name: 'Papà', color: COLORS[1] },
    { id: '2', name: 'Mamma', color: COLORS[3] }
  ]);
  const [newMemberName, setNewMemberName] = useState('');

  // Login State
  const [inputPin, setInputPin] = useState('');
  const [error, setError] = useState('');

  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    const color = COLORS[members.length % COLORS.length];
    setMembers([...members, { id: crypto.randomUUID(), name: newMemberName.trim(), color }]);
    setNewMemberName('');
  };

  const handleSetupSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!familyName || pin.length < 4 || members.length === 0) {
      setError('Compila tutti i campi e aggiungi almeno un membro.');
      return;
    }
    
    const newProfile: FamilyProfile = {
      familyName,
      pin,
      members
    };
    onSetupComplete(newProfile);
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPin === existingProfile?.pin) {
      onLogin();
    } else {
      setError('PIN non corretto.');
      setInputPin('');
    }
  };

  // MODE: LOGIN
  if (existingProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
          <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShieldCheck className="w-8 h-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Bentornati!</h1>
          <p className="text-gray-500 mb-6">Famiglia {existingProfile.familyName}</p>
          
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <input
                type="password"
                value={inputPin}
                onChange={(e) => {
                  setInputPin(e.target.value);
                  setError('');
                }}
                placeholder="Inserisci PIN Famiglia"
                className="w-full text-center text-2xl tracking-widest rounded-xl border border-gray-300 p-4 focus:border-emerald-500 focus:ring-emerald-500 outline-none"
                maxLength={6}
                inputMode="numeric"
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            
            <button
              type="submit"
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              Accedi <ArrowRight className="w-5 h-5" />
            </button>
          </form>
        </div>
      </div>
    );
  }

  // MODE: SETUP
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-gray-100">
        <div className="text-center mb-8">
          <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">Crea Spazio Famiglia</h1>
          <p className="text-gray-500 text-sm mt-1">Configura la tua app per condividere le spese.</p>
        </div>

        <form onSubmit={handleSetupSubmit} className="space-y-6">
          {/* Family Name */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Nome Famiglia</label>
            <input
              type="text"
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder="Es. Rossi"
              className="w-full rounded-lg border border-gray-300 p-3 focus:border-indigo-500 outline-none"
              required
            />
          </div>

          {/* PIN */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 flex items-center gap-1">
              <Lock className="w-3 h-3" /> PIN Accesso (per tutti)
            </label>
            <input
              type="number"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="Es. 1234"
              className="w-full rounded-lg border border-gray-300 p-3 focus:border-indigo-500 outline-none"
              required
              minLength={4}
            />
          </div>

          {/* Members */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Membri della Famiglia</label>
            
            <div className="flex flex-wrap gap-2 mb-3">
              {members.map((m) => (
                <span key={m.id} className="px-3 py-1 rounded-full bg-gray-100 text-gray-800 text-sm flex items-center gap-1 border border-gray-200">
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
                placeholder="Nuovo membro..."
                className="flex-1 rounded-lg border border-gray-300 p-2 text-sm focus:border-indigo-500 outline-none"
              />
              <button
                type="button"
                onClick={handleAddMember}
                className="bg-indigo-100 text-indigo-700 p-2 rounded-lg hover:bg-indigo-200"
              >
                <UserPlus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-md hover:shadow-lg"
          >
            Crea Famiglia
          </button>
        </form>
      </div>
    </div>
  );
};
