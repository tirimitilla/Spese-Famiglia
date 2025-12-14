
import React, { useState } from 'react';
import { Expense, Member, Store, CategoryDefinition } from '../types';
import { Trash2, Calendar, ChevronDown, ChevronUp, Package, Pencil, Store as StoreIcon, Tag, HelpCircle } from 'lucide-react';
import { EditExpenseModal } from './EditExpenseModal';
import { CategoryIcon } from './CategoryIcons';

interface ExpenseListProps {
  expenses: Expense[];
  members: Member[]; // Keep for compatibility
  stores: Store[];
  categories?: CategoryDefinition[]; // Optional to support legacy calls if any
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, stores, members, categories = [], onDelete, onEdit }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const handleEditClick = (e: React.MouseEvent, expense: Expense) => {
    e.stopPropagation();
    setEditingExpense(expense);
  };

  const handleSaveEdit = (updated: Expense) => {
    onEdit(updated);
    setEditingExpense(null);
  };

  const getCategoryDef = (catName: string) => {
    return categories.find(c => c.name === catName) || { name: catName, icon: 'help-circle', color: 'bg-gray-100 text-gray-600' };
  };

  if (expenses.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm mx-auto max-w-sm">
        <div className="bg-emerald-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
          <Tag className="w-10 h-10 text-emerald-600" />
        </div>
        <h3 className="text-xl font-bold text-gray-900">Nessuna spesa</h3>
        <p className="text-gray-500 mt-2 text-base px-6">Inizia aggiungendo i tuoi acquisti giornalieri.</p>
      </div>
    );
  }

  return (
    <>
      {/* DESKTOP VIEW */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prodotto</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Negozio</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Totale</th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Azioni</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {expenses.map((expense) => {
                const catDef = getCategoryDef(expense.category);
                return (
                  <React.Fragment key={expense.id}>
                    <tr 
                      onClick={() => toggleExpand(expense.id)}
                      className={`cursor-pointer transition-colors ${expandedId === expense.id ? 'bg-emerald-50/50' : 'hover:bg-gray-50'}`}
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {new Date(expense.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                           <div className="text-sm font-medium text-gray-900">{expense.product}</div>
                           {expandedId === expense.id ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {expense.store}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 inline-flex items-center gap-1.5 text-xs leading-5 font-semibold rounded-full ${catDef.color}`}>
                          <CategoryIcon iconName={catDef.icon} className="w-3.5 h-3.5" />
                          {catDef.name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                        €{expense.total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end items-center gap-2">
                          <button onClick={(e) => handleEditClick(e, expense)} className="text-blue-400 hover:text-blue-600 p-1"><Pencil className="w-4 h-4" /></button>
                          <button onClick={(e) => { e.stopPropagation(); onDelete(expense.id); }} className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                    
                    {expandedId === expense.id && (
                      <tr className="bg-emerald-50/30">
                        <td colSpan={6} className="px-6 py-4 border-t border-emerald-100/50">
                           <div className="grid grid-cols-4 gap-6 text-sm">
                             <div>
                               <span className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                                 <Calendar className="w-3 h-3" /> Data Completa
                               </span>
                               <span className="font-medium text-gray-800">
                                 {new Date(expense.date).toLocaleString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                               </span>
                             </div>
                             <div>
                               <span className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                                 <Package className="w-3 h-3" /> Quantità
                               </span>
                               <span className="font-medium text-gray-800">
                                 {expense.quantity} {expense.quantity === 1 ? 'unità' : 'unità'}
                               </span>
                             </div>
                             <div>
                               <span className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                                 <Tag className="w-3 h-3" /> Prezzo Unitario
                               </span>
                               <span className="font-medium text-gray-800">€{expense.unitPrice.toFixed(2)}</span>
                             </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* MOBILE VIEW */}
      <div className="md:hidden space-y-4">
        {expenses.map((expense) => {
          const isExpanded = expandedId === expense.id;
          const catDef = getCategoryDef(expense.category);
          
          return (
            <div 
              key={expense.id}
              onClick={() => toggleExpand(expense.id)}
              className={`bg-white p-5 rounded-2xl shadow-sm border transition-all active:bg-gray-50 ${isExpanded ? 'border-emerald-200 ring-2 ring-emerald-50' : 'border-gray-100'}`}
            >
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0 pr-3">
                  <div className="font-bold text-gray-900 truncate text-lg">{expense.product}</div>
                  <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                     <span className="flex items-center gap-1 truncate max-w-[140px]"><StoreIcon className="w-3.5 h-3.5" /> {expense.store}</span>
                     <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                     <span>{new Date(expense.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-emerald-600 text-xl">€{expense.total.toFixed(2)}</div>
                </div>
              </div>

              <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-50">
                 <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide rounded-md border ${catDef.color} bg-opacity-50 border-opacity-20`}>
                      <CategoryIcon iconName={catDef.icon} className="w-3.5 h-3.5" />
                      {expense.category}
                    </span>
                 </div>
                 <div className="text-gray-400 p-1">
                   {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                 </div>
              </div>

              {isExpanded && (
                <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-xs font-bold text-gray-400 uppercase block mb-1">Quantità</span>
                      <span className="text-base font-semibold text-gray-700">{expense.quantity}</span>
                    </div>
                    <div>
                      <span className="text-xs font-bold text-gray-400 uppercase block mb-1">Prezzo Unit.</span>
                      <span className="text-base font-semibold text-gray-700">€{expense.unitPrice.toFixed(2)}</span>
                    </div>
                    <div className="col-span-2 flex justify-end gap-3 mt-2 pt-2 border-t border-dashed border-gray-100">
                        <button onClick={(e) => handleEditClick(e, expense)} className="flex-1 flex items-center justify-center gap-2 text-sm font-bold text-blue-600 bg-blue-50 px-4 py-3 rounded-xl hover:bg-blue-100">
                          <Pencil className="w-4 h-4" /> Modifica
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(expense.id); }} className="flex-1 flex items-center justify-center gap-2 text-sm font-bold text-red-600 bg-red-50 px-4 py-3 rounded-xl hover:bg-red-100">
                          <Trash2 className="w-4 h-4" /> Elimina
                        </button>
                    </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {editingExpense && (
        <EditExpenseModal
          expense={editingExpense}
          stores={stores}
          members={members}
          isOpen={!!editingExpense}
          onClose={() => setEditingExpense(null)}
          onSave={handleSaveEdit}
        />
      )}
    </>
  );
};
