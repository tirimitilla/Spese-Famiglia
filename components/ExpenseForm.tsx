
import React, { useState, useEffect } from 'react';
import { Store, Member } from '../types';
import { Plus, Loader2, ShoppingBag, Hash, DollarSign, Store as StoreIcon, Tag, UserCircle } from 'lucide-react';

interface ExpenseFormProps {
  stores: Store[];
  members: Member[];
  existingProducts: string[];
  productHistory: Record<string, string>; // Map: Product Name -> Last Store Name
  onAddExpense: (product: string, quantity: number, unitPrice: number, total: number, store: string, memberId: string) => Promise<void>;
  isAnalyzing: boolean;
}

export const ExpenseForm: React.FC<ExpenseFormProps> = ({ stores, members, existingProducts, productHistory, onAddExpense, isAnalyzing }) => {
  const [product, setProduct] = useState('');
  const [quantity, setQuantity] = useState<string>('1');
  const [unitPrice, setUnitPrice] = useState<string>('');
  const [total, setTotal] = useState<string>('');
  const [selectedStore, setSelectedStore] = useState<string>(stores[0]?.name || '');
  const [selectedMemberId, setSelectedMemberId] = useState<string>(members[0]?.id || '');

  // Update selected store/member if lists change (e.g. after sync)
  useEffect(() => {
    if (!selectedStore && stores.length > 0) setSelectedStore(stores[0].name);
    if (!selectedMemberId && members.length > 0) setSelectedMemberId(members[0].id);
  }, [stores, members]);

  // Handle product input change and auto-suggest store
  const handleProductChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setProduct(val);

    // Auto-select store if product exists in history
    // We check if the suggested store actually exists in the current stores list to avoid errors
    if (productHistory[val]) {
        const suggestedStore = productHistory[val];
        const storeExists = stores.some(s => s.name === suggestedStore);
        if (storeExists) {
            setSelectedStore(suggestedStore);
        }
    }
  };

  // Auto-calculate total when quantity or unit price changes
  const updateCalculations = (qtyStr: string, priceStr: string) => {
    const qty = parseFloat(qtyStr);
    const price = parseFloat(priceStr);
    
    if (!isNaN(qty) && !isNaN(price)) {
      const calculatedTotal = (qty * price).toFixed(2);
      setTotal(calculatedTotal);
    }
  };

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuantity(val);
    updateCalculations(val, unitPrice);
  };

  const handleUnitPriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUnitPrice(val);
    updateCalculations(quantity, val);
  };

  const handleTotalChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTotal(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !total || !selectedStore || !selectedMemberId) return;

    const finalQty = parseFloat(quantity);
    const finalTotal = parseFloat(total);
    
    // If unit price is empty but total exists, calculate it
    let finalUnitPrice = parseFloat(unitPrice);
    if (isNaN(finalUnitPrice) && finalQty > 0) {
        finalUnitPrice = finalTotal / finalQty;
    }

    await onAddExpense(product, finalQty, finalUnitPrice || 0, finalTotal, selectedStore, selectedMemberId);
    
    // Reset form partially
    setProduct('');
    setQuantity('1');
    setUnitPrice('');
    setTotal('');
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
      <h2 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
        <Plus className="w-6 h-6 text-emerald-600" />
        Nuova Spesa
      </h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        
        {/* Product Input - Text-base prevents zoom on iOS and is readable */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Prodotto</label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <ShoppingBag className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={product}
              list="product-suggestions"
              onChange={handleProductChange}
              placeholder="Es. Latte, Pane"
              className="pl-11 w-full rounded-xl border border-gray-300 bg-gray-50 p-3.5 text-base focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all outline-none shadow-sm"
              required
              autoComplete="off"
            />
            <datalist id="product-suggestions">
              {existingProducts.map((prod, index) => (
                <option key={`${prod}-${index}`} value={prod} />
              ))}
            </datalist>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {/* Quantity Input */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Qt.</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <Hash className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="number"
                min="0.01"
                step="any"
                value={quantity}
                onChange={handleQuantityChange}
                className="pl-8 w-full rounded-xl border border-gray-300 bg-gray-50 p-3 text-base focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none shadow-sm"
                required
              />
            </div>
          </div>

          {/* Unit Price Input */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1 whitespace-nowrap">Prezzo Un.</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <Tag className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={unitPrice}
                onChange={handleUnitPriceChange}
                placeholder="0.00"
                className="pl-8 w-full rounded-xl border border-gray-300 bg-gray-50 p-3 text-base focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none shadow-sm"
              />
            </div>
          </div>

          {/* Total Price Input */}
          <div>
            <label className="block text-xs font-bold text-emerald-600 uppercase mb-1.5 ml-1">Totale</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={total}
                onChange={handleTotalChange}
                placeholder="0.00"
                className="pl-8 w-full rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-base font-bold text-emerald-700 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none shadow-sm"
                required
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Store Select */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Negozio</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <StoreIcon className="h-5 w-5 text-gray-400" />
                  </div>
                <select
                  value={selectedStore}
                  onChange={(e) => setSelectedStore(e.target.value)}
                  className="pl-11 w-full rounded-xl border border-gray-300 bg-gray-50 p-3.5 text-base focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none appearance-none shadow-sm"
                >
                  {stores.map((store) => (
                    <option key={store.id} value={store.name}>
                      {store.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>

            {/* Member Select */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5 ml-1">Chi paga?</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <UserCircle className="h-5 w-5 text-gray-400" />
                  </div>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="pl-11 w-full rounded-xl border border-gray-300 bg-gray-50 p-3.5 text-base focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none appearance-none shadow-sm"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>
            </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isAnalyzing}
          className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-xl shadow-md text-base font-bold text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-70 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analisi con IA in corso...
            </>
          ) : (
            'Aggiungi Spesa'
          )}
        </button>
      </form>
    </div>
  );
};
