import React, { useState, useMemo, useEffect } from 'react';
import { ShoppingItem, Store } from '../types';
import { ShoppingCart, Plus, Trash2, History, X, Store as StoreIcon, Filter, Sparkles, CheckSquare, Square, Eraser } from 'lucide-react';

interface ShoppingListManagerProps {
  items: ShoppingItem[];
  stores: Store[];
  productHistory: Record<string, string>;
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
  const [isOpen, setIsOpen] = useState(true); 
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [activeStoreFilter, setActiveStoreFilter] = useState<string>('');
  const [newItemProduct, setNewItemProduct] = useState('');
  const [newItemStore, setNewItemStore] = useState(stores[0]?.name || '');

  // Quando l'utente inizia a scrivere un prodotto, suggeriamo l'ultimo negozio usato se disponibile
  const handleProductInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewItemProduct(val);
    if (productHistory[val]) {
        setNewItemStore(productHistory[val]);
    }
  };

  useEffect(() => {
    if (activeStoreFilter) {
        setNewItemStore(activeStoreFilter);
    }
  }, [activeStoreFilter]);

  const { activeItems, completedItems } = useMemo(() => {
    const filtered = activeStoreFilter 
      ? items.filter(i => i.store === activeStoreFilter)
      : items;
    
    return {
      activeItems: filtered.filter(i => !i.completed),
      completedItems: filtered.filter(i => i.completed)
    };
  }, [items, activeStoreFilter]);

  const historyList = useMemo(() => {
    return Object.entries(productHistory).sort((a, b) => a[0].localeCompare(b[0]));
  }, [productHistory]);

  const quickSuggestions = useMemo(() => {
    const inList = new Set(items.filter(i => !i.completed).map(i => i.product.toLowerCase()));
    return historyList
        .filter(([prod]) => !inList.has(prod.toLowerCase()))
        .slice(0, 10);
  }, [historyList, items]);

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newItemProduct.trim() && newItemStore) {
      onAddItem(newItemProduct.trim(), newItemStore);
      setNewItemProduct('');
    }
  };

  const handleHistorySelect = (product: string, defaultStore: string) => {
    const targetStore = activeStoreFilter || defaultStore || stores[0]?.name;
    onAddItem(product, targetStore);
    setShowHistoryModal(false);
  };

  const handleClearCompleted = () => {
    if (confirm("Vuoi rimuovere tutti i prodotti segnati come acquistati?")) {
        completedItems.forEach(item => onDeleteItem(item.id));
    }
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
      <div className="flex justify-between items-center mb-5">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-orange-500" />
          Lista della Spesa
          {activeItems.length > 0 && (
            <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
              {activeItems.length}
            </span>
          )}
        </h3>
        <div className="flex gap-2">
            {completedItems.length > 0 && (
                <button 
                    onClick={handleClearCompleted}
                    className="text-gray-400 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-colors"
                    title="Svuota acquistati"
                >
                    <Eraser className="w-5 h-5" />
                </button>
            )}
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="text-orange-500 hover:text-orange-700 text-sm font-semibold px-2"
            >
                {isOpen ? 'Nascondi' : 'Mostra'}
            </button>
        </div>
      </div>

      {isOpen && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Suggerimenti dallo Storico */}
          {quickSuggestions.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-1.5 mb-2 px-1">
                <Sparkles className="h-3.5 w-3.5 text-orange-400" />
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Più acquistati</span>
              </div>
              <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {quickSuggestions.map(([prod, store]) => (
                  <button
                    key={prod}
                    onClick={() => handleHistorySelect(prod, store)}
                    className="flex-shrink-0 bg-orange-50/50 border border-orange-100 hover:border-orange-400 hover:bg-white px-3 py-2 rounded-xl text-sm font-medium text-gray-700 transition-all flex flex-col items-start gap-0.5 whitespace-nowrap"
                  >
                    <div className="flex items-center gap-1">
                        <Plus className="h-3 w-3 text-orange-500" />
                        {prod}
                    </div>
                    <span className="text-[9px] text-gray-400 uppercase font-bold">{store}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mb-5 flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              <button
                  onClick={() => setActiveStoreFilter('')}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                      activeStoreFilter === '' 
                      ? 'bg-orange-500 text-white border-orange-600 shadow-sm' 
                      : 'bg-white text-gray-400 border-gray-200 hover:text-orange-500'
                  }`}
              >
                  TUTTI
              </button>
              {stores.map(s => (
                  <button
                      key={s.id}
                      onClick={() => setActiveStoreFilter(s.name)}
                      className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold border transition-all ${
                          activeStoreFilter === s.name
                          ? 'bg-orange-500 text-white border-orange-600 shadow-sm' 
                          : 'bg-white text-gray-400 border-gray-200 hover:text-orange-500'
                      }`}
                  >
                      {s.name.toUpperCase()}
                  </button>
              ))}
          </div>

          <form onSubmit={handleAdd} className="flex flex-col gap-3 mb-8">
            <div className="flex gap-2">
                <input
                    type="text"
                    value={newItemProduct}
                    onChange={handleProductInputChange}
                    placeholder="Es. Latte, Uova..."
                    className="flex-1 rounded-xl border border-gray-300 bg-gray-50 p-3.5 text-base focus:border-orange-500 focus:ring-2 focus:ring-orange-100 outline-none transition-all"
                />
                <button
                    type="button"
                    onClick={() => setShowHistoryModal(true)}
                    className="bg-gray-100 text-gray-400 px-3.5 rounded-xl hover:bg-orange-50 hover:text-orange-500 transition-colors border border-gray-200"
                    title="Storico completo"
                >
                    <History className="h-6 w-6" />
                </button>
            </div>
            <div className="flex gap-2">
                <select
                    value={newItemStore}
                    onChange={(e) => setNewItemStore(e.target.value)}
                    className="flex-1 rounded-xl border border-gray-300 bg-gray-50 p-3.5 text-base focus:border-orange-500 outline-none appearance-none"
                >
                    {stores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
                <button
                    type="submit"
                    disabled={!newItemProduct.trim()}
                    className="bg-orange-500 text-white px-8 rounded-xl font-bold hover:bg-orange-600 transition-all disabled:opacity-50 active:scale-95 shadow-lg"
                >
                    Aggiungi
                </button>
            </div>
          </form>

          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-2">Da Acquistare</h4>
            {activeItems.map(item => (
                <div key={item.id} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 shadow-sm group">
                    <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => onToggleItem(item.id)}>
                        <div className="text-orange-500">
                           <Square className="w-6 h-6" />
                        </div>
                        <div>
                            <span className="text-lg font-semibold text-gray-800">{item.product}</span>
                            <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold uppercase mt-0.5">
                                <StoreIcon className="w-3 h-3" /> {item.store}
                            </div>
                        </div>
                    </div>
                    <button onClick={() => onDeleteItem(item.id)} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-5 h-5" />
                    </button>
                </div>
            ))}

            {activeItems.length === 0 && (
                <div className="text-center py-12 bg-gray-50/50 rounded-2xl border border-dashed border-gray-200">
                    <p className="text-sm text-gray-400 italic">Lista vuota.</p>
                </div>
            )}

            {completedItems.length > 0 && (
                <div className="mt-10 pt-6 border-t border-gray-100">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-3">Nel carrello</h4>
                    <div className="space-y-2">
                        {completedItems.map(item => (
                            <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50/50 rounded-xl border border-gray-100 opacity-70">
                                <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => onToggleItem(item.id)}>
                                    <CheckSquare className="w-6 h-6 text-emerald-500" />
                                    <span className="text-base font-medium text-gray-400 line-through">{item.product}</span>
                                </div>
                                <button onClick={() => onDeleteItem(item.id)} className="p-2 text-gray-300 hover:text-red-400">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
          </div>
        </div>
      )}

      {showHistoryModal && (
        <div className="fixed inset-0 bg-black/70 z-[60] flex items-center justify-center p-4 animate-in fade-in backdrop-blur-sm">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm max-h-[80vh] flex flex-col overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-800">Storico Acquisti</h3>
                    <button onClick={() => setShowHistoryModal(false)} className="p-2 bg-gray-100 rounded-full">
                        <X className="h-5 w-5 text-gray-600" />
                    </button>
                </div>
                <div className="p-2 overflow-y-auto flex-1">
                    {historyList.map(([prod, lastStore]) => (
                        <button
                            key={prod}
                            onClick={() => handleHistorySelect(prod, lastStore)}
                            className="w-full text-left px-5 py-4 hover:bg-orange-50 rounded-2xl flex justify-between items-center group transition-all"
                        >
                            <div>
                                <div className="text-base font-bold text-gray-800">{prod}</div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase mt-1 flex items-center gap-1">
                                    <StoreIcon className="w-3 h-3" /> {lastStore}
                                </div>
                            </div>
                            <Plus className="w-5 h-5 text-gray-300 group-hover:text-orange-500" />
                        </button>
                    ))}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};