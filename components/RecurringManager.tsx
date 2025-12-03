
import React, { useState } from 'react';
import { RecurringExpense, Frequency, Store } from '../types';
import { Repeat, Plus, Trash2, CalendarClock } from 'lucide-react';

interface RecurringManagerProps {
  recurringExpenses: RecurringExpense[];
  stores: Store[];
  onAddRecurring: (product: string, amount: number, store: string, frequency: Frequency, nextDate: string) => void;
  onDeleteRecurring: (id: string) => void;
}

export const RecurringManager: React.FC<RecurringManagerProps> = ({ 
  recurringExpenses, 
  stores, 
  onAddRecurring, 
  onDeleteRecurring 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [product, setProduct] = useState('');
  const [amount, setAmount] = useState('');
  const [store, setStore] = useState(stores[0]?.name || '');
  const [frequency, setFrequency] = useState<Frequency>('mensile');
  const [nextDate, setNextDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !amount || !store || !nextDate) return;

    onAddRecurring(product, parseFloat(amount), store, frequency, nextDate);
    
    // Reset form
    setProduct('');
    setAmount('');
    setIsOpen(false);
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
      <div 
        className="flex justify-between items-center cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Repeat className="w-4 h-4 text-purple-600" />
          Spese Ricorrenti & Abbonamenti
        </h3>
        <button className="text-purple-600 hover:text-purple-700 text-xs font-medium">
          {isOpen ? 'Chiudi' : 'Gestisci'}
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* List of existing recurring expenses */}
          {recurringExpenses.length > 0 && (
            <div className="mb-6 space-y-2">
              {recurringExpenses.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-purple-50 rounded-lg text-sm border border-purple-100">
                  <div>
                    <div className="font-medium text-gray-800">{item.product}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2">
                      <span>€{item.amount.toFixed(2)} / {item.frequency}</span>
                      <span className="flex items-center gap-1">
                        <CalendarClock className="w-3 h-3" />
                        Prox: {new Date(item.nextDueDate).toLocaleDateString('it-IT')}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => onDeleteRecurring(item.id)}
                    className="text-red-400 hover:text-red-600 p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-gray-100 pt-4">
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-3">Aggiungi Ricorrenza</h4>
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <input
                  type="text"
                  placeholder="Es. Netflix, Affitto, Palestra"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm focus:border-purple-500 outline-none"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  step="0.01"
                  placeholder="Importo €"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm focus:border-purple-500 outline-none"
                  required
                />
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as Frequency)}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm focus:border-purple-500 outline-none"
                >
                  <option value="settimanale">Settimanale</option>
                  <option value="mensile">Mensile</option>
                  <option value="annuale">Annuale</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <select
                  value={store}
                  onChange={(e) => setStore(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm focus:border-purple-500 outline-none"
                >
                  {stores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>
                <input 
                  type="date"
                  value={nextDate}
                  onChange={(e) => setNextDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm focus:border-purple-500 outline-none"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full flex justify-center items-center gap-2 py-2 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> Aggiungi Ricorrenza
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
