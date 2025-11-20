import React, { useState } from 'react';
import { Expense } from '../types';
import { getSpendingAnalysis } from '../services/geminiService';
import { Sparkles, RefreshCw } from 'lucide-react';

interface AIInsightProps {
  expenses: Expense[];
}

export const AIInsight: React.FC<AIInsightProps> = ({ expenses }) => {
  const [insight, setInsight] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const generateInsight = async () => {
    if (expenses.length === 0) return;
    setLoading(true);
    const result = await getSpendingAnalysis(expenses);
    setInsight(result);
    setLoading(false);
  };

  if (expenses.length === 0) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white mb-8">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-yellow-300" />
          L'Assistente Finanziario
        </h3>
        <button
          onClick={generateInsight}
          disabled={loading}
          className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          {insight ? 'Aggiorna Analisi' : 'Analizza Spese'}
        </button>
      </div>
      
      {insight ? (
        <div className="prose prose-invert prose-sm max-w-none bg-black/10 p-4 rounded-lg">
           <p className="whitespace-pre-line leading-relaxed">{insight}</p>
        </div>
      ) : (
        <p className="text-indigo-100 text-sm">
          Clicca su "Analizza Spese" per ricevere consigli personalizzati da Gemini sulle tue abitudini di acquisto e suggerimenti per risparmiare.
        </p>
      )}
    </div>
  );
};
