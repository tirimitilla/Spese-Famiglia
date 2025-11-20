
import React, { useState } from 'react';
import { Expense, Member, Store } from '../types';
import { Trash2, Tag, Calendar, ChevronDown, ChevronUp, Package, User, Pencil, Store as StoreIcon } from 'lucide-react';
import { EditExpenseModal } from './EditExpenseModal';

interface ExpenseListProps {
  expenses: Expense[];
  members: Member[];
  stores: Store[];
  onDelete: (id: string) => void;
  onEdit: (expense: Expense) => void;
}

export const ExpenseList: React.FC<ExpenseListProps> = ({ expenses, members, stores, onDelete, onEdit }) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const getMember = (id?: string) => members.find(m => m.id === id);

  const handleEditClick = (e: React.MouseEvent, expense: Expense) => {
    e.stopPropagation(); // Prevent row expansion
    setEditingExpense(expense);
  };

  const handleSaveEdit = (updated: Expense) => {
    onEdit(updated);
    setEditingExpense(null);
  };

  if (expenses.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="bg-emerald-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
          <Tag className="w-8 h-8 text-emerald-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-900">Nessuna spesa</h3>
        <p className="text-gray-500 mt-1">Inizia aggiungendo i tuoi acquisti giornalieri.</p>
      </div>
    );
  }

  return (
    <>
      {/* DESKTOP VIEW (Table) - Hidden on Mobile */}
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
                const member = getMember(expense.memberId);
                
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
                         {member && (
                           <div 
                              className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0"
                              style={{ backgroundColor: member.color }}
                              title={`Acquistato da: ${member.name}`}
                           >
                             {member.name.charAt(0).toUpperCase()}
                           </div>
                         )}
                         {expandedId === expense.id ? <ChevronUp className="w-3 h-3 text-gray-400" /> : <ChevronDown className="w-3 h-3 text-gray-400" />}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {expense.store}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-emerald-100 text-emerald-800">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                      €{expense.total.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end items-center gap-2">
                        <button
                          onClick={(e) => handleEditClick(e, expense)}
                          className="text-blue-400 hover:text-blue-600 transition-colors p-1 rounded-full hover:bg-blue-50"
                          title="Modifica"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(expense.id);
                          }}
                          className="text-red-400 hover:text-red-600 transition-colors p-1 rounded-full hover:bg-red-50"
                          title="Elimina"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded Row Details Desktop */}
                  {expandedId === expense.id && (
                    <tr className="bg-emerald-50/30 animate-in fade-in duration-200">
                      <td colSpan={6} className="px-6 py-4 border-t border-emerald-100/50">
                         <div className="grid grid-cols-4 gap-6 text-sm">
                           <div>
                             <span className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                               <Calendar className="w-3 h-3" /> Data Completa
                             </span>
                             <span className="font-medium text-gray-800">
                               {new Date(expense.date).toLocaleString('it-IT', { 
                                 weekday: 'long', 
                                 year: 'numeric', 
                                 month: 'long', 
                                 day: 'numeric',
                                 hour: '2-digit',
                                 minute: '2-digit'
                               })}
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
                             <span className="font-medium text-gray-800">
                               €{expense.unitPrice.toFixed(2)}
                             </span>
                           </div>

                           <div>
                             <span className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                               <User className="w-3 h-3" /> Acquistato da
                             </span>
                             <span className="font-medium text-gray-800 flex items-center gap-1">
                               {member ? (
                                 <>
                                   <span className="w-2 h-2 rounded-full" style={{backgroundColor: member.color}}></span>
                                   {member.name}
                                 </>
                               ) : 'Sconosciuto'}
                             </span>
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

      {/* MOBILE VIEW (Cards) - Visible only on small screens */}
      <div className="md:hidden space-y-3">
        {expenses.map((expense) => {
          const member = getMember(expense.memberId);
          const isExpanded = expandedId === expense.id;

          return (
            <div 
              key={expense.id}
              onClick={() => toggleExpand(expense.id)}
              className={`bg-white p-4 rounded-xl shadow-sm border transition-all ${
                isExpanded ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-gray-100'
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0 pr-2">
                  <div className="font-bold text-gray-900 truncate text-base">{expense.product}</div>
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                     <span className="flex items-center gap-1 truncate max-w-[120px]">
                       <StoreIcon className="w-3 h-3" /> {expense.store}
                     </span>
                     <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                     <span>{new Date(expense.date).toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}</span>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-bold text-emerald-600 text-lg">€{expense.total.toFixed(2)}</div>
                </div>
              </div>

              <div className="flex justify-between items-center mt-2">
                 <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 inline-flex text-[10px] font-bold uppercase tracking-wide rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                      {expense.category}
                    </span>
                    {member && (
                        <div className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: member.color }}></span>
                          <span className="text-[10px] font-medium text-gray-600">{member.name}</span>
                        </div>
                    )}
                 </div>
                 <div className="text-gray-300">
                   {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                 </div>
              </div>

              {/* Mobile Expanded Details */}
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-3 animate-in fade-in">
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase block mb-0.5">Quantità</span>
                      <span className="text-sm font-medium text-gray-700">{expense.quantity}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 uppercase block mb-0.5">Prezzo Unit.</span>
                      <span className="text-sm font-medium text-gray-700">€{expense.unitPrice.toFixed(2)}</span>
                    </div>
                    <div className="col-span-2 flex justify-end gap-2 mt-2 pt-2 border-t border-dashed border-gray-100">
                        <button
                          onClick={(e) => handleEditClick(e, expense)}
                          className="flex items-center gap-1 text-xs font-medium text-blue-600 bg-blue-50 px-3 py-2 rounded-lg"
                        >
                          <Pencil className="w-3.5 h-3.5" /> Modifica
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(expense.id);
                          }}
                          className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-3 py-2 rounded-lg"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Elimina
                        </button>
                    </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
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
