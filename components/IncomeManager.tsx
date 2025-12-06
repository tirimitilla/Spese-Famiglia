
import React, { useState } from 'react';
import { Income, Expense } from '../types';
import { TrendingUp, TrendingDown, Wallet, Plus, Trash2, Calendar } from 'lucide-react';

interface IncomeManagerProps {
  incomes: Income[];
  expenses: Expense[];
  onAddIncome: (source: string, amount: number, date: string) => void;
  onDeleteIncome: (id: string) => void;
}

export const IncomeManager: React.FC<IncomeManagerProps> = ({ 
  incomes, 
  expenses, 
  onAddIncome, 
  onDeleteIncome 
}) => {
  const [source, setSource] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // Calcoli Totali
  const totalIncome = incomes.reduce((sum, inc) => sum + inc.amount, 0);
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.total, 0);
  const balance = totalIncome - totalExpenses;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!source || !amount) return;
    onAddIncome(source, parseFloat(amount), date);
    setSource('');
    setAmount('');
  };

  return (
    <div className="space-y-6 animate-in fade-in">
      
      {/* Cards Riepilogo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Entrate */}
        <div className="bg-emerald-50 p-5 rounded-2xl border border-emerald-100 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-emerald-100 p-2 rounded-full">
              <TrendingUp className="w-5 h-5 text-emerald-600" />
            </div>
            <span className="text-sm font-bold text-emerald-800 uppercase">Totale Entrate</span>
          </div>
          <div className="text-2xl font-bold text-emerald-700">
            €{totalIncome.toFixed(2)}
          </div>
        </div>

        {/* Uscite */}
        <div className="bg-red-50 p-5 rounded-2xl border border-red-100 shadow-sm">
           <div className="flex items-center gap-2 mb-2">
            <div className="bg-red-100 p-2 rounded-full">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <span className="text-sm font-bold text-red-800 uppercase">Totale Spese</span>
          </div>
          <div className="text-2xl font-bold text-red-700">
            €{totalExpenses.toFixed(2)}
          </div>
        </div>

        {/* Saldo */}
        <div className={`p-5 rounded-2xl border shadow-sm ${balance >= 0 ? 'bg-blue-50 border-blue-100' : 'bg-orange-50 border-orange-100'}`}>
           <div className="flex items-center gap-2 mb-2">
            <div className={`${balance >= 0 ? 'bg-blue-100' : 'bg-orange-100'} p-2 rounded-full`}>
              <Wallet className={`w-5 h-5 ${balance >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
            </div>
            <span className={`text-sm font-bold uppercase ${balance >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>Saldo Attuale</span>
          </div>
          <div className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
            €{balance.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Form Aggiunta */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-600" /> Registra Entrata
        </h3>
        <form onSubmit={handleSubmit} className="flex flex-col md:flex-row gap-3">
            <input 
                type="text" 
                placeholder="Fonte (es. Stipendio, Vendita)" 
                value={source}
                onChange={(e) => setSource(e.target.value)}
                className="flex-1 rounded-xl border border-gray-300 p-3 text-base outline-none focus:border-emerald-500"
                required
            />
            <input 
                type="number" 
                step="0.01"
                placeholder="Importo €" 
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-32 rounded-xl border border-gray-300 p-3 text-base outline-none focus:border-emerald-500"
                required
            />
            <input 
                type="date" 
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="rounded-xl border border-gray-300 p-3 text-base outline-none focus:border-emerald-500"
                required
            />
            <button type="submit" className="bg-emerald-600 text-white font-bold px-6 py-3 rounded-xl hover:bg-emerald-700 transition-colors">
                Aggiungi
            </button>
        </form>
      </div>

      {/* Lista Storico Entrate */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
            <h3 className="font-bold text-gray-700">Storico Entrate</h3>
        </div>
        <div className="divide-y divide-gray-100">
            {incomes.length === 0 ? (
                <div className="p-8 text-center text-gray-500">Nessuna entrata registrata.</div>
            ) : (
                incomes.map(inc => (
                    <div key={inc.id} className="p-4 flex justify-between items-center hover:bg-gray-50">
                        <div>
                            <div className="font-bold text-gray-800 text-lg">{inc.source}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {new Date(inc.date).toLocaleDateString('it-IT')}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="font-bold text-emerald-600 text-lg">+€{inc.amount.toFixed(2)}</span>
                            <button onClick={() => onDeleteIncome(inc.id)} className="text-gray-300 hover:text-red-500">
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>

    </div>
  );
};
