import React, { useState, useEffect } from 'react';
import { RecurringExpense, Frequency, Store } from '../types';
import { Repeat, Plus, Trash2, CalendarClock, Bell, Pencil, Save, X as CloseIcon } from 'lucide-react';

interface RecurringManagerProps {
  recurringExpenses: RecurringExpense[];
  stores: Store[];
  onAddRecurring: (product: string, amount: number, store: string, frequency: Frequency, nextDate: string, reminderDays: number) => void;
  onUpdateRecurring: (updated: RecurringExpense) => void;
  onDeleteRecurring: (id: string) => void;
}

export const RecurringManager: React.FC<RecurringManagerProps> = ({ 
  recurringExpenses, 
  stores, 
  onAddRecurring, 
  onUpdateRecurring,
  onDeleteRecurring 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // State per editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [product, setProduct] = useState('');
  const [amount, setAmount] = useState('');
  const [store, setStore] = useState(stores[0]?.name || '');
  const [frequency, setFrequency] = useState<Frequency>('mensile');
  const [nextDate, setNextDate] = useState(new Date().toISOString().split('T')[0]);
  const [reminderDays, setReminderDays] = useState('0');

  useEffect(() => {
    if (!store && stores.length > 0) setStore(stores[0].name);
  }, [stores]);

  const handleEdit = (item: RecurringExpense) => {
    setEditingId(item.id);
    setProduct(item.product);
    setAmount(item.amount.toString());
    setStore(item.store);
    setFrequency(item.frequency);
    setNextDate(item.nextDueDate);
    setReminderDays(item.reminderDays.toString());
    if (!isOpen) setIsOpen(true);
    // Scroll al form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setProduct('');
    setAmount('');
    setFrequency('mensile');
    setNextDate(new Date().toISOString().split('T')[0]);
    setReminderDays('0');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !amount || !store || !nextDate) return;

    if (editingId) {
        onUpdateRecurring({
            id: editingId,
            product,
            amount: parseFloat(amount),
            store,
            frequency,
            nextDueDate: nextDate,
            reminderDays: parseInt(reminderDays) || 0
        });
    } else {
        onAddRecurring(product, parseFloat(amount), store, frequency, nextDate, parseInt(reminderDays) || 0);
    }
    
    resetForm();
    if (!editingId) setIsOpen(false);
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
      <div 
        className="flex justify-between items-center cursor-pointer select-none mb-1"
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
          
          <div className="bg-purple-50 p-4 rounded-2xl border border-purple-100 mb-6">
            <h4 className="text-xs font-bold text-purple-800 uppercase mb-4 flex items-center gap-2">
                {editingId ? <Pencil className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {editingId ? 'Modifica Ricorrenza' : 'Nuova Ricorrenza'}
            </h4>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Nome Servizio</label>
                <input
                  type="text"
                  placeholder="Es. Netflix, Affitto, Palestra"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm focus:border-purple-500 outline-none shadow-sm"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                   <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Importo</label>
                   <input
                    type="number"
                    step="0.01"
                    placeholder="€"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm focus:border-purple-500 outline-none shadow-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Frequenza</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as Frequency)}
                    className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm focus:border-purple-500 outline-none shadow-sm appearance-none"
                  >
                    <option value="settimanale">Settimanale</option>
                    <option value="mensile">Mensile</option>
                    <option value="annuale">Annuale</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Negozio/Ente</label>
                  <select
                    value={store}
                    onChange={(e) => setStore(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm focus:border-purple-500 outline-none shadow-sm appearance-none"
                  >
                    {stores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                   <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Prossima Scadenza</label>
                   <input 
                    type="date"
                    value={nextDate}
                    onChange={(e) => setNextDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm focus:border-purple-500 outline-none shadow-sm"
                    required
                  />
                </div>
              </div>

              <div className="flex items-end gap-3">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-1.5 ml-1">Avviso (giorni prima)</label>
                    <input 
                        type="number"
                        min="0"
                        max="30"
                        value={reminderDays}
                        onChange={(e) => setReminderDays(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 bg-white p-3 text-sm focus:border-purple-500 outline-none shadow-sm text-center"
                    />
                </div>
                <div className="flex gap-2">
                    {editingId && (
                        <button
                            type="button"
                            onClick={resetForm}
                            className="bg-white text-gray-500 border border-gray-300 p-3 rounded-xl hover:bg-gray-50"
                        >
                            <CloseIcon className="w-5 h-5" />
                        </button>
                    )}
                    <button
                        type="submit"
                        className={`px-6 py-3 rounded-xl text-white font-bold transition-all shadow-md active:scale-95 flex items-center gap-2 ${editingId ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-purple-600 hover:bg-purple-700'}`}
                    >
                        {editingId ? <><Save className="w-5 h-5" /> Aggiorna</> : <><Plus className="w-5 h-5" /> Aggiungi</>}
                    </button>
                </div>
              </div>
            </form>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Scadenze salvate</h4>
            {recurringExpenses.length > 0 ? (
                recurringExpenses.map((item) => (
                <div key={item.id} className="group relative flex justify-between items-center p-4 bg-white rounded-2xl text-sm border border-gray-100 shadow-sm hover:border-purple-200 transition-all">
                  <div className="flex-1">
                    <div className="font-bold text-gray-800 text-base">{item.product}</div>
                    <div className="text-xs text-gray-500 flex flex-wrap items-center gap-3 mt-1.5">
                      <span className="font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-100 uppercase">
                        €{item.amount.toFixed(2)} / {item.frequency}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarClock className="w-3.5 h-3.5" />
                        {new Date(item.nextDueDate).toLocaleDateString('it-IT')}
                      </span>
                      {item.reminderDays > 0 && (
                         <span className="flex items-center gap-1 text-purple-600 font-bold" title="Preavviso attivo">
                            <Bell className="w-3.5 h-3.5" />
                            -{item.reminderDays}gg
                         </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-4">
                    <button 
                        onClick={() => handleEdit(item)}
                        className="p-2.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors"
                        title="Modifica"
                    >
                        <Pencil className="w-5 h-5" />
                    </button>
                    <button 
                        onClick={() => onDeleteRecurring(item.id)}
                        className="p-2.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors"
                        title="Elimina"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
                <div className="text-center py-6 text-gray-400 italic text-xs">
                    Nessuna spesa ricorrente impostata.
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};