
import React, { useState, useEffect } from 'react';
import { Member, FamilyProfile } from '../types';
import { Users, UserPlus, Copy, CheckCircle, Shield, User, Loader2, Lock } from 'lucide-react';
import { fetchFamilyMembers } from '../services/supabaseService';

interface FamilyManagerProps {
  familyProfile: FamilyProfile;
}

export const FamilyManager: React.FC<FamilyManagerProps> = ({ familyProfile }) => {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadMembers = async () => {
      setLoading(true);
      const data = await fetchFamilyMembers(familyProfile.id);
      setMembers(data);
      setLoading(false);
    };
    loadMembers();
  }, [familyProfile.id]);

  const handleCopyId = () => {
    navigator.clipboard.writeText(familyProfile.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      {/* Intestazione */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 text-center relative overflow-hidden">
        <div className="absolute top-4 right-4 bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-bold flex items-center gap-1">
          <Lock className="w-3 h-3" /> SPAZIO PRIVATO
        </div>
        <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Users className="w-8 h-8 text-emerald-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800">{familyProfile.familyName}</h2>
        <p className="text-gray-500 text-sm mt-1">Questo spazio è visibile solo ai membri del gruppo.</p>
      </div>

      {/* Sezione Invito */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 p-6 rounded-2xl shadow-lg text-white">
        <div className="flex items-center gap-3 mb-4">
          <UserPlus className="w-6 h-6 text-emerald-200" />
          <h3 className="text-lg font-bold">Invita un Familiare</h3>
        </div>
        <p className="text-emerald-50 text-sm mb-4">
          Condividi questo codice con le persone che vuoi far entrare in <strong>questo specifico spazio</strong>.
        </p>
        <div className="bg-white/20 p-4 rounded-xl flex items-center justify-between gap-3 backdrop-blur-sm border border-white/20">
          <code className="text-sm font-mono break-all flex-1">{familyProfile.id}</code>
          <button 
            onClick={handleCopyId}
            className="bg-white text-emerald-700 p-2.5 rounded-lg hover:bg-emerald-50 transition-colors shadow-sm flex-shrink-0"
          >
            {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
          </button>
        </div>
        {copied && <p className="text-xs text-center mt-2 font-medium animate-pulse">Codice copiato negli appunti!</p>}
      </div>

      {/* Lista Membri */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-50">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            Membri del Gruppo ({members.length})
          </h3>
        </div>
        <div className="divide-y divide-gray-50">
          {loading ? (
            <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 text-emerald-600 animate-spin" /></div>
          ) : (
            members.map((member) => (
              <div key={member.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="w-6 h-6 text-gray-400" />
                  </div>
                  <div>
                    <div className="font-bold text-gray-800">{member.name}</div>
                    <div className="text-xs text-gray-500">{member.isAdmin ? 'Amministratore' : 'Membro'}</div>
                  </div>
                </div>
                {member.isAdmin && (
                  <div className="bg-emerald-50 p-2 rounded-lg" title="Amministratore">
                    <Shield className="w-4 h-4 text-emerald-600" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <div className="p-4 bg-gray-100 rounded-xl text-center">
        <p className="text-[10px] text-gray-400 uppercase font-bold leading-tight">
          Protezione Dati: Le tue spese sono criptate e isolate tramite Family ID.<br/>
          Nessun utente esterno a questo gruppo può accedere alle tue informazioni.
        </p>
      </div>
    </div>
  );
};
