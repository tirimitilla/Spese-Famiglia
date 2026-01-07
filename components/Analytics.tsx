
import React, { useMemo } from 'react';
import { Expense } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Calendar, TrendingUp } from 'lucide-react';

interface AnalyticsProps {
  expenses: Expense[];
}

const COLORS = ['#059669', '#10B981', '#34D399', '#6EE7B7', '#A7F3D0', '#D1FAE5'];
const ITALIAN_MONTHS = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno', 'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];

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

  const monthlyData = useMemo(() => {
    const totals: Record<string, number> = {};
    expenses.forEach(e => {
      const date = new Date(e.date);
      const key = `${date.getFullYear()}-${date.getMonth()}`; // Key is "YYYY-MM"
      totals[key] = (totals[key] || 0) + e.total;
    });

    return Object.entries(totals)
      .map(([key, total]) => {
        const [year, monthIndex] = key.split('-').map(Number);
        return {
          year,
          monthIndex,
          name: `${ITALIAN_MONTHS[monthIndex]} ${year}`,
          total,
        };
      })
      .sort((a, b) => {
        if (a.year !== b.year) {
          return b.year - a.year; // Sort by year descending
        }
        return b.monthIndex - a.monthIndex; // Then by month descending
      });
  }, [expenses]);

  if (expenses.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900">Nessun dato da analizzare</h3>
          <p className="text-gray-500 mt-2 text-base">Aggiungi delle spese per vedere i report.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
      {/* Total Summary Card */}
       <div className="bg-emerald-600 rounded-2xl shadow-lg p-6 text-white flex flex-col justify-between min-h-[12rem]">
         <div>
            <span className="text-emerald-100 text-sm uppercase tracking-wider font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Totale Speso Complessivo
            </span>
         </div>
         <div>
            <h2 className="text-4xl md:text-5xl font-bold">€{totalSpent.toFixed(2)}</h2>
            <p className="text-emerald-100 text-xs mt-1">{expenses.length} transazioni registrate</p>
         </div>
      </div>

      {/* Monthly Summary Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col min-h-[12rem]">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide flex items-center gap-2 mb-3 flex-shrink-0">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Riepilogo Mensile
          </h3>
          <div className="flex-1 overflow-y-auto pr-2 -mr-2 space-y-2">
            {monthlyData.map(month => (
              <div key={month.name} className="flex justify-between items-center text-sm bg-gray-50/80 p-3 rounded-lg border border-gray-100">
                <span className="font-semibold text-gray-600">{month.name}</span>
                <span className="font-bold text-gray-800">€{month.total.toFixed(2)}</span>
              </div>
            ))}
          </div>
      </div>

      {/* Category Chart */}
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 h-72 md:h-80 lg:col-span-1">
        <h3 className="text-sm font-bold text-gray-700 mb-4 uppercase tracking-wide">Top Categorie</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={categoryData} layout="vertical" margin={{ top: -10, right: 10, left: 0, bottom: -10 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" width={90} tick={{fontSize: 11}} interval={0} axisLine={false} tickLine={false} />
            <Tooltip 
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
              cursor={{fill: '#f3f4f6'}}
            />
            <Bar dataKey="importo" fill="#10B981" radius={[0, 4, 4, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Store Chart */}
      <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 h-72 md:h-80 lg:col-span-1">
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
              labelLine={false}
              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                if (percent < 0.05) return null; // Hide small labels
                const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                const x = cx + (radius + 15) * Math.cos(-midAngle * (Math.PI / 180));
                const y = cy + (radius + 15) * Math.sin(-midAngle * (Math.PI / 180));
                return (
                  <text x={x} y={y} fill="#374151" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11}>
                    {`${(percent * 100).toFixed(0)}%`}
                  </text>
                );
              }}
            >
              {storeData.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
            <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{fontSize: '11px', paddingTop: '20px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
