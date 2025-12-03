import React from 'react';
import { Store } from '../types';
import { Filter, X, Calendar, Tag, Store as StoreIcon } from 'lucide-react';

export interface FilterState {
  store: string;
  category: string;
  startDate: string;
  endDate: string;
}

interface ExpenseFiltersProps {
  stores: Store[];
  categories: string[];
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: string) => void;
  onClearFilters: () => void;
}

export const ExpenseFilters: React.FC<ExpenseFiltersProps> = ({
  stores,
  categories,
  filters,
  onFilterChange,
  onClearFilters,
}) => {
  const hasActiveFilters = filters.store || filters.category || filters.startDate || filters.endDate;

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Filter className="w-4 h-4 text-emerald-600" />
          Filtra Spese
        </h3>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-medium transition-colors"
          >
            <X className="w-3 h-3" />
            Rimuovi filtri
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Store Filter */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
            <StoreIcon className="h-3.5 w-3.5 text-gray-400" />
          </div>
          <select
            value={filters.store}
            onChange={(e) => onFilterChange('store', e.target.value)}
            className="pl-8 w-full rounded-lg border border-gray-300 bg-gray-50 py-2 text-xs focus:border-emerald-500 focus:ring-emerald-500 outline-none appearance-none"
          >
            <option value="">Tutti i negozi</option>
            {stores.map((store) => (
              <option key={store.id} value={store.name}>
                {store.name}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
            <Tag className="h-3.5 w-3.5 text-gray-400" />
          </div>
          <select
            value={filters.category}
            onChange={(e) => onFilterChange('category', e.target.value)}
            className="pl-8 w-full rounded-lg border border-gray-300 bg-gray-50 py-2 text-xs focus:border-emerald-500 focus:ring-emerald-500 outline-none appearance-none"
          >
            <option value="">Tutte le categorie</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Start Date */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
            <Calendar className="h-3.5 w-3.5 text-gray-400" />
          </div>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => onFilterChange('startDate', e.target.value)}
            placeholder="Da"
            className="pl-8 w-full rounded-lg border border-gray-300 bg-gray-50 py-2 text-xs focus:border-emerald-500 focus:ring-emerald-500 outline-none text-gray-600"
          />
        </div>

        {/* End Date */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
            <Calendar className="h-3.5 w-3.5 text-gray-400" />
          </div>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => onFilterChange('endDate', e.target.value)}
            placeholder="A"
            className="pl-8 w-full rounded-lg border border-gray-300 bg-gray-50 py-2 text-xs focus:border-emerald-500 focus:ring-emerald-500 outline-none text-gray-600"
          />
        </div>
      </div>
    </div>
  );
};
