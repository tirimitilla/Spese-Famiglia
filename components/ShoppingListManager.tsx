
import React, { useState, useMemo } from 'react';
import { ShoppingItem, Store } from '../types';
import { ShoppingCart, Plus, Trash2, CheckSquare, Square, History, X, Store as StoreIcon } from 'lucide-react';

interface ShoppingListManagerProps {
  items: ShoppingItem[];
  stores: Store[];
  productHistory: Record<string, string>; // Map: Product Name -> Last Store Name
  onAddItem: (product: string, store: string) => void;
  onToggleItem: (id: string) => void;
  onDeleteItem: (id: string) => void;
}

export const ShoppingListManager: React.FC<ShoppingListManagerProps> = ({
  items,
  stores,
  productHistory,
  onAddItem,
  onToggleItem,
  onDeleteItem
}) => {
  const [isOpen, setIsOpen] = useState(true); // Default open as it's useful
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  const [newItemProduct, setNewItemProduct] = useState('');
  const [newItemStore, setNewItemStore] = useState(stores[0]?.name || '');

  // Group items by store
  const groupedItems = useMemo(() => {
    const groups: Record<string, ShoppingItem[]> = {};
    items.forEach(item => {
      if (!groups[item.store]) groups[item.store] = [];
      groups[item.store].push(item);
    });
    return groups;
  }, [items]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemProduct.trim() && newItemStore) {
      onAddItem(newItemProduct.trim(), newItemStore);
      setNewItemProduct('');
      // Keep store selected for rapid entry
    }
  };

  const handleHistorySelect = (product: string, defaultStore: string) => {
    onAddItem(product, defaultStore);
    setShowHistoryModal(false);
  };

  // Unique products for history modal list
  const historyList = useMemo(() => {
    return Object.entries(productHistory).sort((a, b) => a[0].localeCompare(b[0]));
  }, [productHistory]);

  const activeCount = items.filter(i => !i.completed).length;

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
      
      {/* Header */}
      <div 
        className="flex justify-between items-center cursor-pointer select-none mb-4"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-orange-500" />
          Lista della Spesa
          {activeCount > 0 && (
            <span className="bg-orange-100 text-orange-700 text-[10px] px-2 py-0.5 rounded-full">
              {activeCount} da prendere
            </span>
          )}
        </h3>
        <button className="text-orange-500 hover:text-orange-700 text-xs font-medium">
          {isOpen ? 'Chiudi' : 'Apri'}
        </button>
      </div>

      {isOpen && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Add Form */}
          <form onSubmit={handleAdd} className="flex flex-col gap-2 mb-4">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={newItemProduct}
                    onChange={(e) => setNewItemProduct(e.target.value)}
                    placeholder="Cosa serve?"
                    className="flex-1 rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm focus:border-orange-500 outline-none"
                />
                <button
                    type="button"
                    onClick={() => setShowHistoryModal(true)}
                    className="bg-orange-100 text-orange-600 p-2 rounded-lg hover:bg-orange-200 transition-colors"
                    title="Scegli dai prodotti acquistati in passato"
                >
                    <History className="w-5 h-5" />
                </button>
            </div>
            <div className="flex gap-2">
                <select
                    value={newItemStore}
                    onChange={(e) => setNewItemStore(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm focus:border-orange-500 outline-none"
                >
                    {stores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
                <button
                    type="submit"
                    disabled={!newItemProduct.trim()}
                    className="bg-orange-500 text-white p-2 rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>
          </form>

          {/* List */}
          <div className="space-y-4">
            {Object.keys(groupedItems).length === 0 && (
                <p className="text-xs text-gray-400 text-center italic py-2">La lista è vuota.</p>
            )}

            {Object.entries(groupedItems).map(([storeName, storeItems]) => (
              <div key={storeName} className="bg-orange-50/50 rounded-lg border border-orange-100 overflow-hidden">
                <div className="bg-orange-100/50 px-3 py-1.5 text-xs font-bold text-orange-800 flex items-center gap-1">
                  <StoreIcon className="w-3 h-3" /> {storeName}
                </div>
                <div className="divide-y divide-orange-100">
                    {(storeItems as ShoppingItem[]).map(item => (
                        <div key={item.id} className="flex items-center justify-between p-2 hover:bg-white transition-colors">
                            <div 
                                className="flex items-center gap-2 cursor-pointer flex-1"
                                onClick={() => onToggleItem(item.id)}
                            >
                                {item.completed ? (
                                    <CheckSquare className="w-4 h-4 text-gray-400" />
                                ) : (
                                    <Square className="w-4 h-4 text-orange-500" />
                                )}
                                <span className={`text-sm ${item.completed ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                                    {item.product}
                                </span>
                            </div>
                            <button 
                                onClick={() => onDeleteItem(item.id)}
                                className="text-gray-300 hover:text-red-500 p-1"
                            >
                                <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm max-h-[80vh] flex flex-col">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">Aggiungi da Storico</h3>
                    <button onClick={() => setShowHistoryModal(false)}>
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>
                <div className="p-2 overflow-y-auto flex-1">
                    <div className="space-y-1">
                        {historyList.map(([prod, lastStore]) => (
                            <button
                                key={prod}
                                onClick={() => handleHistorySelect(prod, lastStore)}
                                className="w-full text-left px-4 py-3 hover:bg-orange-50 rounded-lg flex justify-between items-center group border-b border-gray-50 last:border-0"
                            >
                                <span className="text-sm font-medium text-gray-700">{prod}</span>
                                <span className="text-xs text-gray-400 group-hover:text-orange-500">{lastStore}</span>
                            </button>
                        ))}
                        {historyList.length === 0 && (
                            <p className="text-center text-sm text-gray-500 py-4">Nessun acquisto registrato.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};
