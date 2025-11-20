
import React, { useState, useEffect } from 'react';
import { Expense, Store, Member } from '../types';
import { Save, X, Calculator } from 'lucide-react';

interface EditExpenseModalProps {
  expense: Expense;
  stores: Store[];
  members: Member[];
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedExpense: Expense) => void;
}

export const EditExpenseModal: React.FC<EditExpenseModalProps> = ({
  expense,
  stores,
  members,
  isOpen,
  onClose,
  onSave,
}) => {
  const [product, setProduct] = useState(expense.product);
  const [quantity, setQuantity] = useState(expense.quantity.toString());
  const [unitPrice, setUnitPrice] = useState(expense.unitPrice.toString());
  const [total, setTotal] = useState(expense.total.toString());
  const [store, setStore] = useState(expense.store);
  const [category, setCategory] = useState(expense.category);
  const [memberId, setMemberId] = useState(expense.memberId || members[0]?.id || '');
  const [date, setDate] = useState(new Date(expense.date).toISOString().substring(0, 16)); // Format YYYY-MM-DDTHH:mm

  // Update local state when expense prop changes
  useEffect(() => {
    if (isOpen) {
      setProduct(expense.product);
      setQuantity(expense.quantity.toString());
      setUnitPrice(expense.unitPrice.toString());
      setTotal(expense.total.toString());
      setStore(expense.store);
      setCategory(expense.category);
      setMemberId(expense.memberId || members[0]?.id || '');
      
      // Handle date format safely
      try {
        const d = new Date(expense.date);
        // Adjust to local ISO string roughly for input datetime-local
        const localIso = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
        setDate(localIso);
      } catch (e) {
        setDate(new Date().toISOString().slice(0, 16));
      }
    }
  }, [expense, isOpen, members]);

  // Auto-calculate logic mirroring the main form
  const updateCalculations = (qtyStr: string, priceStr: string) => {
    const qty = parseFloat(qtyStr);
    const price = parseFloat(priceStr);
    if (!isNaN(qty) && !isNaN(price)) {
      setTotal((qty * price).toFixed(2));
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const finalQty = parseFloat(quantity);
    const finalTotal = parseFloat(total);
    let finalUnitPrice = parseFloat(unitPrice);

    // Fallback math if unit price is missing
    if (isNaN(finalUnitPrice) && finalQty > 0) {
      finalUnitPrice = finalTotal / finalQty;
    }

    const updatedExpense: Expense = {
      ...expense,
      product,
      quantity: finalQty,
      unitPrice: finalUnitPrice,
      total: finalTotal,
      store,
      category,
      memberId,
      date: new Date(date).toISOString()
    };

    onSave(updatedExpense);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="bg-emerald-600 text-white p-4 flex justify-between items-center">
          <h2 className="font-bold text-lg">Modifica Spesa</h2>
          <button onClick={onClose} className="text-emerald-100 hover:text-white p-1 rounded-full hover:bg-emerald-700/50">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Prodotto */}
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prodotto</label>
              <input
                type="text"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-emerald-500 outline-none"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              {/* Qta */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Qt.</label>
                <input
                  type="number"
                  step="any"
                  value={quantity}
                  onChange={handleQuantityChange}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-emerald-500 outline-none"
                  required
                />
              </div>
              {/* Unit Price */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prezzo Unit.</label>
                <input
                  type="number"
                  step="0.01"
                  value={unitPrice}
                  onChange={handleUnitPriceChange}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-emerald-500 outline-none"
                />
              </div>
              {/* Total */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Totale</label>
                <input
                  type="number"
                  step="0.01"
                  value={total}
                  onChange={(e) => setTotal(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 p-2.5 text-sm font-bold text-emerald-600 focus:border-emerald-500 outline-none"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {/* Negozio */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Negozio</label>
                    <select
                        value={store}
                        onChange={(e) => setStore(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-emerald-500 outline-none"
                    >
                        {stores.map(s => (
                            <option key={s.id} value={s.name}>{s.name}</option>
                        ))}
                        {/* Fallback if store was deleted but exists in expense */}
                        {!stores.find(s => s.name === store) && <option value={store}>{store}</option>}
                    </select>
                </div>

                {/* Categoria (Editable) */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria</label>
                    <input
                        type="text"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-emerald-500 outline-none"
                    />
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                {/* Data */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data e Ora</label>
                    <input
                        type="datetime-local"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-emerald-500 outline-none"
                    />
                </div>

                {/* Membro */}
                <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Membro</label>
                    <select
                        value={memberId}
                        onChange={(e) => setMemberId(e.target.value)}
                        className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-emerald-500 outline-none"
                    >
                        {members.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="pt-4 flex gap-3">
                <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                    Annulla
                </button>
                <button
                    type="submit"
                    className="flex-1 py-3 px-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                >
                    <Save className="w-5 h-5" />
                    Salva Modifiche
                </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
};
