
import React, { useState } from 'react';
import { CategoryDefinition } from '../types';
import { CategoryIcon, AVAILABLE_ICONS } from './CategoryIcons';
import { Plus, X, Check, Edit2, Trash2, Tag } from 'lucide-react';

interface CategoryManagerProps {
  categories: CategoryDefinition[];
  onUpdateCategories: (newCategories: CategoryDefinition[]) => void;
}

const COLORS = [
  'bg-slate-100 text-slate-600',
  'bg-red-100 text-red-600',
  'bg-orange-100 text-orange-600',
  'bg-amber-100 text-amber-600',
  'bg-yellow-100 text-yellow-600',
  'bg-lime-100 text-lime-600',
  'bg-green-100 text-green-600',
  'bg-emerald-100 text-emerald-600',
  'bg-teal-100 text-teal-600',
  'bg-cyan-100 text-cyan-600',
  'bg-sky-100 text-sky-600',
  'bg-blue-100 text-blue-600',
  'bg-indigo-100 text-indigo-600',
  'bg-violet-100 text-violet-600',
  'bg-purple-100 text-purple-600',
  'bg-fuchsia-100 text-fuchsia-600',
  'bg-pink-100 text-pink-600',
  'bg-rose-100 text-rose-600',
];

export const CategoryManager: React.FC<CategoryManagerProps> = ({ categories, onUpdateCategories }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [selectedIcon, setSelectedIcon] = useState('help-circle');
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);

  const resetForm = () => {
    setName('');
    setSelectedIcon('help-circle');
    setSelectedColor(COLORS[0]);
    setIsAdding(false);
    setEditingId(null);
  };

  const startEdit = (cat: CategoryDefinition) => {
    setName(cat.name);
    setSelectedIcon(cat.icon);
    setSelectedColor(cat.color);
    setEditingId(cat.id);
    setIsAdding(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;

    if (editingId) {
      // Edit existing
      const updated = categories.map(c => 
        c.id === editingId ? { ...c, name, icon: selectedIcon, color: selectedColor } : c
      );
      onUpdateCategories(updated);
    } else {
      // Add new
      const newCat: CategoryDefinition = {
        id: crypto.randomUUID(),
        name,
        icon: selectedIcon,
        color: selectedColor
      };
      onUpdateCategories([...categories, newCat]);
    }
    resetForm();
  };

  const handleDelete = (id: string) => {
    if (confirm('Sei sicuro di voler eliminare questa categoria?')) {
      onUpdateCategories(categories.filter(c => c.id !== id));
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="flex justify-between items-center mb-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
             <Tag className="w-7 h-7 text-indigo-600" /> Categorie
           </h2>
           <p className="text-gray-500 text-sm mt-1">Personalizza icone e colori per le tue spese.</p>
        </div>
        {!isAdding && (
          <button 
            onClick={() => setIsAdding(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-bold hover:bg-indigo-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" /> Nuova
          </button>
        )}
      </div>

      {isAdding && (
        <div className="bg-white p-5 rounded-2xl shadow-lg border border-indigo-100 mb-6 animate-in slide-in-from-top-4">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            {editingId ? 'Modifica Categoria' : 'Nuova Categoria'}
          </h3>
          
          <div className="space-y-4">
            {/* Nome */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Categoria</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)}
                placeholder="Es. Palestra"
                className="w-full rounded-xl border border-gray-300 p-3 outline-none focus:border-indigo-500"
              />
            </div>

            {/* Icon Picker Grid */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Scegli Icona</label>
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2 max-h-40 overflow-y-auto p-1">
                {AVAILABLE_ICONS.map((item) => (
                  <button
                    key={item.name}
                    onClick={() => setSelectedIcon(item.name)}
                    className={`p-2 rounded-lg flex items-center justify-center transition-all ${
                      selectedIcon === item.name 
                        ? 'bg-indigo-600 text-white shadow-md scale-110' 
                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                  </button>
                ))}
              </div>
            </div>

            {/* Color Picker */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Scegli Colore</label>
              <div className="flex flex-wrap gap-2">
                {COLORS.map((col) => (
                  <button
                    key={col}
                    onClick={() => setSelectedColor(col)}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${col} ${
                      selectedColor === col ? 'border-gray-900 scale-110' : 'border-transparent'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={resetForm}
                className="flex-1 py-3 border border-gray-300 rounded-xl text-gray-600 font-bold hover:bg-gray-50"
              >
                Annulla
              </button>
              <button 
                onClick={handleSave}
                disabled={!name.trim()}
                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 shadow-md"
              >
                Salva
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {categories.map((cat) => (
          <div key={cat.id} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-full ${cat.color}`}>
                <CategoryIcon iconName={cat.icon} className="w-6 h-6" />
              </div>
              <span className="font-bold text-gray-800 text-lg">{cat.name}</span>
            </div>
            <div className="flex gap-1">
              <button 
                onClick={() => startEdit(cat)}
                className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
              >
                <Edit2 className="w-5 h-5" />
              </button>
              <button 
                onClick={() => handleDelete(cat.id)}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
