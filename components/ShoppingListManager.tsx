
import React, { useState, useMemo, useEffect } from 'react';
import { ShoppingItem, Store } from '../types';
import { ShoppingCart, Plus, Trash2, CheckSquare, Square, History, X, Store as StoreIcon, Filter } from 'lucide-react';

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
  
  // Filter state: '' means "All Stores"
  const [activeStoreFilter, setActiveStoreFilter] = useState<string>('');

  const [newItemProduct, setNewItemProduct] = useState('');
  const [newItemStore, setNewItemStore] = useState(stores[0]?.name || '');

  // When filter changes, update the "Add Item" store selection automatically
  useEffect(() => {
    if (activeStoreFilter) {
        setNewItemStore(activeStoreFilter);
    }
  }, [activeStoreFilter]);

  // Group items by store
  const groupedItems = useMemo(() => {
    const groups: Record<string, ShoppingItem[]> = {};
    items.forEach(item => {
      if (!groups[item.store]) groups[item.store] = [];
      groups[item.store].push(item);
    });
    return groups;
  }, [items]);

  // Determine which groups to display based on filter
  const displayedGroups = useMemo(() => {
      if (!activeStoreFilter) return groupedItems;
      
      const filtered: Record<string, ShoppingItem[]> = {};
      if (groupedItems[activeStoreFilter]) {
          filtered[activeStoreFilter] = groupedItems[activeStoreFilter];
      }
      return filtered;
  }, [groupedItems, activeStoreFilter]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemProduct.trim() && newItemStore) {
      onAddItem(newItemProduct.trim(), newItemStore);
      setNewItemProduct('');
    }
  };

  const handleHistorySelect = (product: string, defaultStore: string) => {
    const targetStore = activeStoreFilter || defaultStore;
    onAddItem(product, targetStore);
    setShowHistoryModal(false);
  };

  // Unique products for history modal list
  const historyList = useMemo(() => {
    return Object.entries(productHistory).sort((a, b) => a[0].localeCompare(b[0]));
  }, [productHistory]);

  const activeCount = items.filter(i => !i.completed).length;

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
      
      {/* Header */}
      <div 
        className="flex justify-between items-center cursor-pointer select-none mb-5"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-orange-500" />
          Lista della Spesa
          {activeCount > 0 && (
            <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full">
              {activeCount} da prendere
            </span>
          )}
        </h3>
        <button className="text-orange-500 hover:text-orange-700 text-sm font-semibold py-1 px-2">
          {isOpen ? 'Chiudi' : 'Apri'}
        </button>
      </div>

      {isOpen && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Store Filter Control */}
          <div className="mb-5 bg-orange-50 p-4 rounded-xl border border-orange-100">
              <label className="block text-xs font-bold text-orange-800 uppercase mb-3 flex items-center gap-1">
                  <Filter className="w-3.5 h-3.5" />
                  Visualizza prodotti per:
              </label>
              <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  <button
                      onClick={() => setActiveStoreFilter('')}
                      className={`whitespace-nowrap px-4 py-2.5 rounded-full text-sm font-semibold transition-colors border shadow-sm ${
                          activeStoreFilter === '' 
                          ? 'bg-orange-500 text-white border-orange-600' 
                          : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300'
                      }`}
                  >
                      Tutti i Negozi
                  </button>
                  {stores.map(store => (
                      <button
                          key={store.id}
                          onClick={() => setActiveStoreFilter(store.name)}
                          className={`whitespace-nowrap px-4 py-2.5 rounded-full text-sm font-semibold transition-colors border shadow-sm ${
                              activeStoreFilter === store.name
                              ? 'bg-orange-500 text-white border-orange-600' 
                              : 'bg-white text-gray-700 border-gray-200 hover:border-orange-300'
                          }`}
                      >
                          {store.name}
                      </button>
                  ))}
              </div>
          </div>

          {/* Add Form - Bigger Inputs */}
          <form onSubmit={handleAdd} className="flex flex-col gap-3 mb-6">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={newItemProduct}
                    onChange={(e) => setNewItemProduct(e.target.value)}
                    placeholder={activeStoreFilter ? `Cosa serve al ${activeStoreFilter}?` : "Cosa serve?"}
                    className="flex-1 rounded-xl border border-gray-300 bg-gray-50 p-3.5 text-base focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none transition-all shadow-sm"
                />
                <button
                    type="button"
                    onClick={() => setShowHistoryModal(true)}
                    className="bg-orange-100 text-orange-600 px-3.5 rounded-xl hover:bg-orange-200 transition-colors border border-orange-200"
                    title="Scegli dai prodotti acquistati in passato"
                >
                    <History className="w-6 h-6" />
                </button>
            </div>
            <div className="flex gap-2">
                <select
                    value={newItemStore}
                    onChange={(e) => setNewItemStore(e.target.value)}
                    className="flex-1 rounded-xl border border-gray-300 bg-gray-50 p-3.5 text-base focus:border-orange-500 focus:ring-2 focus:ring-orange-200 outline-none shadow-sm appearance-none"
                >
                    {stores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
                <button
                    type="submit"
                    disabled={!newItemProduct.trim()}
                    className="bg-orange-500 text-white px-5 rounded-xl hover:bg-orange-600 transition-colors disabled:opacity-50 shadow-md active:scale-95"
                >
                    <Plus className="w-6 h-6" />
                </button>
            </div>
          </form>

          {/* List - Larger text and padding */}
          <div className="space-y-5">
            {Object.keys(displayedGroups).length === 0 && (
                <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    <p className="text-sm text-gray-500 italic">
                        {activeStoreFilter 
                            ? `Nessun prodotto in lista per ${activeStoreFilter}.` 
                            : "La lista della spesa è vuota."}
                    </p>
                </div>
            )}

            {Object.entries(displayedGroups).map(([storeName, storeItems]) => (
              <div key={storeName} className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden animate-in fade-in">
                <div className="bg-orange-50 px-4 py-2.5 text-sm font-bold text-orange-800 flex items-center gap-2 border-b border-orange-100">
                  <StoreIcon className="w-4 h-4" /> {storeName}
                </div>
                <div className="divide-y divide-gray-100">
                    {(storeItems as ShoppingItem[]).map(item => (
                        <div key={item.id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors active:bg-gray-100">
                            <div 
                                className="flex items-center gap-3 cursor-pointer flex-1"
                                onClick={() => onToggleItem(item.id)}
                            >
                                {item.completed ? (
                                    <CheckSquare className="w-6 h-6 text-gray-300 flex-shrink-0" />
                                ) : (
                                    <Square className="w-6 h-6 text-orange-500 flex-shrink-0" />
                                )}
                                <span className={`text-lg font-medium ${item.completed ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                                    {item.product}
                                </span>
                            </div>
                            <button 
                                onClick={() => onDeleteItem(item.id)}
                                className="text-gray-300 hover:text-red-500 p-2 -mr-2"
                            >
                                <Trash2 className="w-5 h-5" />
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
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-in fade-in backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[85vh] flex flex-col">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-800">Storico Prodotti</h3>
                    <button onClick={() => setShowHistoryModal(false)} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200">
                        <X className="w-5 h-5 text-gray-600" />
                    </button>
                </div>
                <div className="p-2 overflow-y-auto flex-1">
                    <div className="space-y-1">
                        {historyList.map(([prod, lastStore]) => (
                            <button
                                key={prod}
                                onClick={() => handleHistorySelect(prod, lastStore)}
                                className="w-full text-left px-5 py-4 hover:bg-orange-50 rounded-xl flex justify-between items-center group border-b border-gray-50 last:border-0"
                            >
                                <span className="text-base font-medium text-gray-800">{prod}</span>
                                <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-md group-hover:bg-white">
                                    {activeStoreFilter ? '' : lastStore}
                                </span>
                            </button>
                        ))}
                        {historyList.length === 0 && (
                            <p className="text-center text-gray-500 py-8">Nessun acquisto registrato.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
      )}

    </div>
  );
};
