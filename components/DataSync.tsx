import React, { useState } from 'react';
import { SyncData, Expense, Store, RecurringExpense, FamilyProfile, ShoppingItem, Income, CategoryDefinition } from '../types';
import { Share2, Copy, Download, Upload, CheckCircle, AlertCircle, X } from 'lucide-react';

interface DataSyncProps {
  data: {
    expenses: Expense[];
    incomes?: Income[]; // Optional to prevent breaking old calls
    stores: Store[];
    recurringExpenses: RecurringExpense[];
    shoppingList: ShoppingItem[];
    familyProfile: FamilyProfile | null;
    categories: CategoryDefinition[];
  };
  onImport: (data: SyncData) => void;
  onClose: () => void;
}

function utf8_to_b64(str: string) {
  return window.btoa(unescape(encodeURIComponent(str)));
}

function b64_to_utf8(str: string) {
  return decodeURIComponent(escape(window.atob(str)));
}

export const DataSync: React.FC<DataSyncProps> = ({ data, onImport, onClose }) => {
  const [syncMode, setSyncMode] = useState<'export' | 'import'>('export');
  const [importString, setImportString] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);
  const [error, setError] = useState('');

  const generateSyncString = () => {
    const payload: SyncData = {
      ...data,
      incomes: data.incomes || [],
      familyProfile: data.familyProfile!,
      categories: data.categories,
      timestamp: Date.now(),
    };
    return utf8_to_b64(JSON.stringify(payload));
  };

  const handleCopy = () => {
    const code = generateSyncString();
    navigator.clipboard.writeText(code);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  const handleImport = () => {
    try {
      if (!importString.trim()) return;
      
      const jsonString = b64_to_utf8(importString);
      const parsedData = JSON.parse(jsonString) as SyncData;

      if (!parsedData.expenses || !parsedData.familyProfile) {
        throw new Error("Formato dati non valido");
      }

      onImport(parsedData);
      onClose();
      alert("Sincronizzazione completata con successo!");
    } catch (err) {
      console.error(err);
      setError("Codice non valido o corrotto. Riprova a copiare l'intero codice.");
    }
  };

  const syncCode = generateSyncString();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className="bg-gray-900 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Share2 className="w-5 h-5 text-emerald-400" />
            <h2 className="font-bold text-lg">Sincronizza Famiglia</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setSyncMode('export')}
            className={`flex-1 py-3 text-sm font-medium text-center ${syncMode === 'export' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50' : 'text-gray-500 hover:bg-gray-50'}`}
          >
            <div className="flex items-center justify-center gap-2">
                <Download className="w-4 h-4" /> Genera Codice
            </div>
          </button>
          <button
            onClick={() => setSyncMode('import')}
            className={`flex-1 py-3 text-sm font-medium text-center ${syncMode === 'import' ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50' : 'text-gray-500 hover:bg-gray-50'}`}
          >
             <div className="flex items-center justify-center gap-2">
                <Upload className="w-4 h-4" /> Inserisci Codice
            </div>
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          
          {syncMode === 'export' ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Invia questo codice ai tuoi familiari su <strong>WhatsApp</strong> o <strong>Email</strong>. 
                Loro dovranno incollarlo nella sezione "Inserisci Codice" per allineare i dati (Guadagni, Spese e Lista).
              </p>
              
              <div className="relative">
                <textarea
                  readOnly
                  value={syncCode}
                  className="w-full h-32 p-3 bg-gray-100 border border-gray-300 rounded-lg text-xs font-mono text-gray-600 break-all focus:outline-none resize-none"
                />
              </div>

              <button
                onClick={handleCopy}
                className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${copySuccess ? 'bg-green-500 text-white' : 'bg-gray-900 text-white hover:bg-gray-800'}`}
              >
                {copySuccess ? (
                  <>
                    <CheckCircle className="w-5 h-5" /> Copiato!
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5" /> Copia Codice
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
               <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex gap-3">
                 <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                 <p className="text-xs text-blue-800">
                   Attenzione: Importando i dati, <strong>sovrascriverai</strong> quelli attuali su questo dispositivo.
                 </p>
               </div>

               <textarea
                  value={importString}
                  onChange={(e) => {
                    setImportString(e.target.value);
                    setError('');
                  }}
                  placeholder="Incolla qui il codice ricevuto..."
                  className="w-full h-32 p-3 bg-white border border-gray-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />

                {error && <p className="text-red-500 text-xs font-medium flex items-center gap-1"><X className="w-3 h-3" /> {error}</p>}

                <button
                  onClick={handleImport}
                  disabled={!importString}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all"
                >
                  Sincronizza Ora
                </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
