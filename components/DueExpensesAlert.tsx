
import React from 'react';
import { RecurringExpense } from '../types';
import { BellRing, Check, Calendar, Clock, AlertTriangle } from 'lucide-react';

interface DueExpensesAlertProps {
  dueExpenses: RecurringExpense[];
  onProcessExpense: (expense: RecurringExpense) => void;
}

export const DueExpensesAlert: React.FC<DueExpensesAlertProps> = ({ dueExpenses, onProcessExpense }) => {
  if (dueExpenses.length === 0) return null;

  const today = new Date();
  today.setHours(0,0,0,0);

  const getStatus = (dueDateStr: string) => {
    const d = new Date(dueDateStr);
    d.setHours(0,0,0,0);
    const diffTime = d.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: `Scaduta da ${Math.abs(diffDays)}gg`, color: 'text-red-600 bg-red-50 border-red-100', icon: <AlertTriangle className="w-3 h-3"/> };
    if (diffDays === 0) return { label: 'Scade Oggi', color: 'text-amber-600 bg-amber-50 border-amber-100', icon: <Clock className="w-3 h-3"/> };
    return { label: `Scade tra ${diffDays}gg`, color: 'text-blue-600 bg-blue-50 border-blue-100', icon: <Calendar className="w-3 h-3"/> };
  };

  return (
    <div className="mb-6 bg-white border border-amber-200 rounded-xl p-4 shadow-sm animate-in slide-in-from-top-4 duration-500">
      <div className="flex items-start gap-3">
        <div className="bg-amber-100 p-2 rounded-full">
          <BellRing className="w-5 h-5 text-amber-600 animate-pulse" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-bold text-gray-800 mb-1">Pagamenti in Arrivo</h3>
          <p className="text-xs text-gray-500 mb-3">
            Hai {dueExpenses.length} pagamenti da gestire.
          </p>
          
          <div className="space-y-2">
            {dueExpenses.map(expense => {
              const status = getStatus(expense.nextDueDate);
              
              return (
                <div key={expense.id} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg border border-gray-100">
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-sm text-gray-800">{expense.product}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-gray-600">€{expense.amount.toFixed(2)}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border flex items-center gap-1 ${status.color}`}>
                        {status.icon} {status.label}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => onProcessExpense(expense)}
                    className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors shadow-sm active:scale-95"
                  >
                    <Check className="w-3 h-3" /> Paga
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
