
import React, { useState } from 'react';
import { PlusCircle, Store as StoreIcon } from 'lucide-react';

interface StoreManagerProps {
  onAddStore: (name: string) => void;
}

export const StoreManager: React.FC<StoreManagerProps> = ({ onAddStore }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [newStore, setNewStore] = useState('');

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newStore.trim()) {
      onAddStore(newStore.trim());
      setNewStore('');
      setIsOpen(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
        <div 
            className="flex justify-between items-center cursor-pointer select-none"
            onClick={() => setIsOpen(!isOpen)}
        >
             <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <StoreIcon className="w-4 h-4 text-emerald-600" />
                Gestione Negozi
             </h3>
             <button className="text-emerald-600 hover:text-emerald-700 text-xs font-medium">
                 {isOpen ? 'Chiudi' : 'Aggiungi Negozio'}
             </button>
        </div>

        {isOpen && (
            <form onSubmit={handleAdd} className="mt-4 flex gap-2">
                <input 
                    type="text" 
                    value={newStore}
                    onChange={(e) => setNewStore(e.target.value)}
                    placeholder="Nome nuovo negozio..."
                    className="flex-1 rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm focus:border-emerald-500 focus:ring-emerald-500 outline-none"
                />
                <button 
                    type="submit"
                    disabled={!newStore.trim()}
                    className="bg-emerald-600 text-white p-2 rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                    <PlusCircle className="w-5 h-5" />
                </button>
            </form>
        )}
    </div>
  );
};
