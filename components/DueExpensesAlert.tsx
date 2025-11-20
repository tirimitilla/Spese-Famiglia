
import React from 'react';
import { RecurringExpense } from '../types';
import { BellRing, Check, Calendar } from 'lucide-react';

interface DueExpensesAlertProps {
  dueExpenses: RecurringExpense[];
  onProcessExpense: (expense: RecurringExpense) => void;
}

export const DueExpensesAlert: React.FC<DueExpensesAlertProps> = ({ dueExpenses, onProcessExpense }) => {
  if (dueExpenses.length === 0) return null;

  return (
    <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm animate-in slide-in-from-top-4 duration-500">
      <div className="flex items-start gap-3">
        <div className="bg-amber-100 p-2 rounded-full">
          <BellRing className="w-5 h-5 text-amber-600 animate-pulse" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-gray-800 mb-1">Promemoria Spese in Scadenza</h3>
          <p className="text-xs text-gray-600 mb-3">
            Hai {dueExpenses.length} spese ricorrenti in scadenza oggi o arretrate. Vuoi registrarle ora?
          </p>
          
          <div className="space-y-2">
            {dueExpenses.map(expense => (
              <div key={expense.id} className="flex items-center justify-between bg-white p-2 rounded-lg border border-amber-100 shadow-sm">
                <div className="flex flex-col">
                  <span className="font-medium text-sm text-gray-800">{expense.product}</span>
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>€{expense.amount.toFixed(2)}</span>
                    <span className="text-amber-600 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(expense.nextDueDate).toLocaleDateString('it-IT')}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => onProcessExpense(expense)}
                  className="flex items-center gap-1 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors shadow-sm"
                >
                  <Check className="w-3 h-3" /> Paga
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
