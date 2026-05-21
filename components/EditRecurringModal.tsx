
import React, { useState, useEffect } from 'react';
import { RecurringExpense, Store, Frequency, CustomField } from '../types';
import { Save, X, Plus, Trash2 } from 'lucide-react';

interface EditRecurringModalProps {
  isOpen: boolean;
  recurringExpense: RecurringExpense;
  stores: Store[];
  onClose: () => void;
  onSave: (updated: RecurringExpense) => void;
}

export const EditRecurringModal: React.FC<EditRecurringModalProps> = ({ 
  isOpen, 
  recurringExpense, 
  stores, 
  onClose, 
  onSave 
}) => {
  const [product, setProduct] = useState('');
  const [amount, setAmount] = useState('');
  const [store, setStore] = useState('');
  const [frequency, setFrequency] = useState<Frequency>('mensile');
  const [nextDate, setNextDate] = useState('');
  const [reminderDays, setReminderDays] = useState('');
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldValue, setNewFieldValue] = useState('');

  useEffect(() => {
    if (recurringExpense) {
      setProduct(recurringExpense.product);
      setAmount(String(recurringExpense.amount));
      setStore(recurringExpense.store);
      setFrequency(recurringExpense.frequency);
      setNextDate(recurringExpense.nextDueDate);
      setReminderDays(String(recurringExpense.reminderDays));
      setCustomFields(recurringExpense.customFields || []);
    }
  }, [recurringExpense]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: RecurringExpense = {
      ...recurringExpense,
      product,
      amount: parseFloat(amount),
      store,
      frequency,
      nextDueDate: nextDate,
      reminderDays: parseInt(reminderDays, 10) || 0,
      customFields,
    };
    onSave(updated);
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

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-purple-600 text-white p-4 flex justify-between items-center">
          <h2 className="font-bold text-lg">Modifica Spesa Ricorrente</h2>
          <button onClick={onClose} className="text-purple-100 hover:text-white p-1 rounded-full hover:bg-purple-700/50">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-4">
          
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome Servizio</label>
            <input type="text" value={product} onChange={e => setProduct(e.target.value)} className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none focus:border-purple-500" required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Importo (€)</label>
              <input type="number" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none focus:border-purple-500" required />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Frequenza</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value as Frequency)} className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none focus:border-purple-500 appearance-none">
                <option value="settimanale">Settimanale</option>
                <option value="mensile">Mensile</option>
                <option value="annuale">Annuale</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Negozio</label>
              <select value={store} onChange={e => setStore(e.target.value)} className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none focus:border-purple-500 appearance-none">
                {stores.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Prossima Scadenza</label>
              <input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)} className="w-full rounded-lg border border-gray-300 p-2.5 text-sm outline-none focus:border-purple-500" required />
            </div>
          </div>
          
           {/* Campi Custom */}
           <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Campi Extra</label>
                <div className="space-y-2 mb-2">
                {customFields.map((field, index) => (
                    <div key={index} className="flex items-center justify-between bg-white p-2 rounded-md border">
                        <div className="text-sm">
                            <span className="font-semibold">{field.label}:</span> {field.value}
                        </div>
                        <button type="button" onClick={() => removeCustomField(index)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                ))}
                </div>
                <div className="flex gap-2">
                    <input type="text" placeholder="Etichetta" value={newFieldLabel} onChange={e => setNewFieldLabel(e.target.value)} className="flex-1 rounded-md border-gray-300 p-2 text-xs" />
                    <input type="text" placeholder="Valore" value={newFieldValue} onChange={e => setNewFieldValue(e.target.value)} className="flex-1 rounded-md border-gray-300 p-2 text-xs" />
                    <button type="button" onClick={handleAddCustomField} className="bg-purple-500 text-white p-2 rounded-md"><Plus className="w-4 h-4" /></button>
                </div>
            </div>

          <div className="pt-4 flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 px-4 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-50 transition-colors">Annulla</button>
            <button type="submit" className="flex-1 py-3 px-4 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-colors flex items-center justify-center gap-2"><Save className="w-5 h-5" /> Salva</button>
          </div>
        </form>
      </div>
    </div>
  );
};
