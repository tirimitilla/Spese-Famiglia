
import React, { useState, useEffect } from 'react';
import { RecurringExpense, Frequency, Store, CustomField } from '../types';
import { Repeat, Plus, Trash2, CalendarClock, Bell, Pencil, Save, X as CloseIcon, Info, LayoutList } from 'lucide-react';

interface RecurringManagerProps {
  recurringExpenses: RecurringExpense[];
  stores: Store[];
  onAddRecurring: (product: string, amount: number, store: string, frequency: Frequency, nextDate: string, reminderDays: number, customFields: CustomField[]) => void;
  onUpdateRecurring: (updated: RecurringExpense) => void;
  onDeleteRecurring: (id: string) => void;
}

const FrequencyBadge = ({ freq }: { freq: Frequency }) => {
  const colors: Record<string, string> = {
    settimanale: 'bg-blue-100 text-blue-700 border-blue-200',
    mensile: 'bg-purple-100 text-purple-700 border-purple-200',
    annuale: 'bg-indigo-100 text-indigo-700 border-indigo-200'
  };
  return (
    <span className={`text-[9px] px-2 py-0.5 rounded-full border font-black uppercase tracking-tighter ${colors[freq] || 'bg-gray-100 text-gray-600'}`}>
      {freq}
    </span>
  );
};

export const RecurringManager: React.FC<RecurringManagerProps> = ({ 
  recurringExpenses, 
  stores, 
  onAddRecurring, 
  onUpdateRecurring,
  onDeleteRecurring 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // State per form principale
  const [editingId, setEditingId] = useState<string | null>(null);
  const [product, setProduct] = useState('');
  const [amount, setAmount] = useState('');
  const [store, setStore] = useState(stores[0]?.name || '');
  const [frequency, setFrequency] = useState<Frequency>('mensile');
  const [nextDate, setNextDate] = useState(new Date().toISOString().split('T')[0]);
  const [reminderDays, setReminderDays] = useState('0');
  
  // State per campi personalizzati
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

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
    setCustomFields(item.customFields || []);
    if (!isOpen) setIsOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const resetForm = () => {
    setEditingId(null);
    setProduct('');
    setAmount('');
    setFrequency('mensile');
    setNextDate(new Date().toISOString().split('T')[0]);
    setReminderDays('0');
    setCustomFields([]);
    setNewFieldLabel('');
    setNewFieldValue('');
  };

  const handleAddCustomField = () => {
    if (newFieldLabel.trim() && newFieldValue.trim()) {
      setCustomFields([...customFields, { label: newFieldLabel.trim(), value: newFieldValue.trim() }]);
      setNewFieldLabel('');
      setNewFieldValue('');
    }
  };

  const removeCustomField = (index: number) => {
    setCustomFields(customFields.filter((_, i) => i !== index));
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
            reminderDays: parseInt(reminderDays) || 0,
            customFields
        });
    } else {
        onAddRecurring(product, parseFloat(amount), store, frequency, nextDate, parseInt(reminderDays) || 0, customFields);
    }
    
    resetForm();
    if (!editingId) setIsOpen(false);
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
      <div 
        className="flex justify-between items-center cursor-pointer select-none mb-1"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Repeat className="w-5 h-5 text-purple-600" />
          Spese Ricorrenti
        </h3>
        <button className="text-purple-600 hover:text-purple-700 text-sm font-semibold">
          {isOpen ? 'Chiudi' : 'Gestisci'}
        </button>
      </div>

      {isOpen && (
        <div className="mt-5 animate-in fade-in slide-in-from-top-2 duration-200">
          
          <div className={`p-5 rounded-2xl border mb-6 transition-all ${editingId ? 'bg-indigo-50 border-indigo-200 shadow-inner' : 'bg-purple-50 border-purple-100'}`}>
            <h4 className={`text-[10px] font-bold uppercase mb-4 flex items-center gap-2 ${editingId ? 'text-indigo-800' : 'text-purple-800'}`}>
                {editingId ? <Pencil className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                {editingId ? 'Modifica Voce Ricorrente' : 'Nuova Scadenza'}
            </h4>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1">Servizio / Nome</label>
                <input
                  type="text"
                  placeholder="Es. Affitto, Netflix, Fibra"
                  value={product}
                  onChange={(e) => setProduct(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 bg-white p-3.5 text-base focus:border-purple-500 outline-none shadow-sm"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                   <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1">Importo (€)</label>
                   <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white p-3.5 text-base focus:border-purple-500 outline-none shadow-sm"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1">Frequenza</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as Frequency)}
                    className="w-full rounded-xl border border-gray-300 bg-white p-3.5 text-base focus:border-purple-500 outline-none shadow-sm appearance-none"
                  >
                    <option value="settimanale">Settimanale</option>
                    <option value="mensile">Mensile</option>
                    <option value="annuale">Annuale</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1">Negozio</label>
                  <select
                    value={store}
                    onChange={(e) => setStore(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white p-3.5 text-base focus:border-purple-500 outline-none shadow-sm appearance-none"
                  >
                    {stores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                   <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1">Data Scadenza</label>
                   <input 
                    type="date"
                    value={nextDate}
                    onChange={(e) => setNextDate(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white p-3.5 text-base focus:border-purple-500 outline-none shadow-sm"
                    required
                  />
                </div>
              </div>

              {/* Sezione Campi Personalizzati */}
              <div className="bg-white/50 p-4 rounded-xl border border-purple-100/50 mt-4">
                <label className="block text-[10px] font-bold text-purple-400 uppercase mb-3 flex items-center gap-1">
                  <LayoutList className="w-3 h-3" /> Campi Personalizzati (Es. Codice, Note, Targa)
                </label>
                
                <div className="space-y-2 mb-3">
                  {customFields.map((field, index) => (
                    <div key={index} className="flex items-center justify-between bg-white px-3 py-2 rounded-lg border border-purple-50 shadow-sm animate-in zoom-in-95">
                      <div className="text-sm">
                        <span className="font-bold text-purple-700">{field.label}:</span> <span className="text-gray-600">{field.value}</span>
                      </div>
                      <button type="button" onClick={() => removeCustomField(index)} className="text-red-300 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Etichetta (es. Note)"
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-200 p-2 text-xs focus:border-purple-300 outline-none"
                  />
                  <input
                    type="text"
                    placeholder="Valore"
                    value={newFieldValue}
                    onChange={(e) => setNewFieldValue(e.target.value)}
                    className="flex-1 rounded-lg border border-gray-200 p-2 text-xs focus:border-purple-300 outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomField}
                    className="bg-purple-100 text-purple-600 p-2 rounded-lg hover:bg-purple-200 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-end gap-3 pt-2">
                <div className="flex-1">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5 ml-1">Avviso (gg prima)</label>
                    <input 
                        type="number"
                        min="0"
                        max="30"
                        value={reminderDays}
                        onChange={(e) => setReminderDays(e.target.value)}
                        className="w-full rounded-xl border border-gray-300 bg-white p-3.5 text-base focus:border-purple-500 outline-none shadow-sm text-center font-bold"
                    />
                </div>
                <div className="flex gap-2">
                    {editingId && (
                        <button
                            type="button"
                            onClick={resetForm}
                            className="bg-white text-gray-500 border border-gray-300 p-3.5 rounded-xl hover:bg-gray-100 transition-colors shadow-sm"
                            title="Annulla"
                        >
                            <CloseIcon className="w-6 h-6" />
                        </button>
                    )}
                    <button
                        type="submit"
                        className={`px-8 py-3.5 rounded-xl text-white font-bold transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 ${editingId ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-purple-600 hover:bg-purple-700'}`}
                    >
                        {editingId ? <><Save className="w-5 h-5" /> Aggiorna</> : <><Plus className="w-5 h-5" /> Salva</>}
                    </button>
                </div>
              </div>
            </form>
          </div>

          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-1 mb-2">Abbonamenti & Pagamenti Registrati</h4>
            {recurringExpenses.length > 0 ? (
                recurringExpenses.map((item) => {
                    const isDue = new Date(item.nextDueDate) < new Date();
                    return (
                        <div key={item.id} className={`group relative flex flex-col p-4 bg-white rounded-2xl border shadow-sm hover:shadow-md transition-all ${isDue ? 'border-red-200 bg-red-50/20' : 'border-gray-100'}`}>
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="font-bold text-gray-800 text-lg flex items-center gap-2 flex-wrap">
                                        {item.product}
                                        <FrequencyBadge freq={item.frequency} />
                                        {isDue && <span className="bg-red-500 text-[10px] text-white px-2 py-0.5 rounded-full animate-pulse font-bold">SCADUTO</span>}
                                    </div>
                                    <div className="text-xs text-gray-500 flex flex-wrap items-center gap-4 mt-2 font-medium">
                                        <span className="font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-lg border border-purple-100">
                                            €{item.amount.toFixed(2)}
                                        </span>
                                        <span className={`flex items-center gap-1.5 ${isDue ? 'text-red-600 font-bold' : ''}`}>
                                            <CalendarClock className="w-4 h-4" />
                                            {new Date(item.nextDueDate).toLocaleDateString('it-IT')}
                                        </span>
                                        {item.reminderDays > 0 && (
                                            <span className="flex items-center gap-1.5 text-orange-600 font-bold">
                                                <Bell className="w-4 h-4" />
                                                -{item.reminderDays}gg
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex gap-1 ml-4">
                                    <button 
                                        onClick={() => handleEdit(item)}
                                        className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                        title="Modifica"
                                    >
                                        <Pencil className="w-5 h-5" />
                                    </button>
                                    <button 
                                        onClick={() => onDeleteRecurring(item.id)}
                                        className="p-3 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                                        title="Elimina"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>

                            {/* Visualizzazione Campi Personalizzati nella Card */}
                            {item.customFields && item.customFields.length > 0 && (
                              <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-gray-50">
                                {item.customFields.map((field, fIdx) => (
                                  <div key={fIdx} className="bg-gray-50 text-[10px] px-2 py-1 rounded-md border border-gray-100 flex items-center gap-1 shadow-sm">
                                    <Info className="w-3 h-3 text-purple-400" />
                                    <span className="font-bold text-gray-500">{field.label}:</span>
                                    <span className="text-gray-700">{field.value}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>
                    );
                })
            ) : (
                <div className="text-center py-12 text-gray-400 italic text-sm border-2 border-dashed border-gray-100 rounded-2xl">
                    Nessuna scadenza ricorrente configurata.
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
