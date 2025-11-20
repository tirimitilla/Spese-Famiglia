
import React, { useMemo } from 'react';
import { Expense } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

interface AnalyticsProps {
  expenses: Expense[];
}

const COLORS = ['#059669', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5'];

export const Analytics: React.FC<AnalyticsProps> = ({ expenses }) => {
  
  const storeData = useMemo(() => {
    const totals: Record<string, number> = {};
    expenses.forEach(e => {
      totals[e.store] = (totals[e.store] || 0) + e.total;
    });
    return Object.keys(totals).map(store => ({
      name: store,
      value: parseFloat(totals[store].toFixed(2))
    })).sort((a, b) => b.value - a.value);
  }, [expenses]);

  const categoryData = useMemo(() => {
    const totals: Record<string, number> = {};
    expenses.forEach(e => {
      totals[e.category] = (totals[e.category] || 0) + e.total;
    });
    return Object.keys(totals).map(cat => ({
      name: cat,
      importo: parseFloat(totals[cat].toFixed(2))
    })).sort((a, b) => b.importo - a.importo).slice(0, 5);
  }, [expenses]);

  const totalSpent = useMemo(() => expenses.reduce((acc, curr) => acc + curr.total, 0), [expenses]);

  if (expenses.length === 0) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Total Summary Card */}
      <div className="bg-emerald-600 rounded-xl shadow-lg p-6 text-white flex flex-col justify-center items-center lg:col-span-2">
         <span className="text-emerald-100 text-sm uppercase tracking-wider font-semibold">Totale Speso</span>
         <h2 className="text-4xl font-bold mt-2">€{totalSpent.toFixed(2)}</h2>
         <p className="text-emerald-100 text-xs mt-2">{expenses.length} transazioni registrate</p>
      </div>

      {/* Category Chart */}
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 h-72 md:h-80">
        <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Top Categorie</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={90} tick={{fontSize: 11}} interval={0} />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              cursor={{fill: '#f3f4f6'}}
            />
            <Bar dataKey="importo" fill="#10B981" radius={[0, 4, 4, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Store Chart */}
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 h-72 md:h-80">
        <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Spesa per Negozio</h3>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={storeData}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={70}
              fill="#8884d8"
              paddingAngle={5}
              dataKey="value"
            >
              {storeData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '11px'}} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
