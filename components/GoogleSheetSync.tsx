
import React, { useState } from 'react';
import { Expense, FamilyProfile } from '../types';
import { Table, Save, HelpCircle, CheckCircle, AlertCircle, X, Copy, ExternalLink, Loader2, UploadCloud } from 'lucide-react';

interface GoogleSheetSyncProps {
  expenses: Expense[];
  familyProfile: FamilyProfile;
  onUpdateProfile: (profile: FamilyProfile) => void;
  onClose: () => void;
}

const APPS_SCRIPT_CODE = `
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var sheetName = data.sheetName || "Spese";
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(["Data", "Prodotto", "Negozio", "Categoria", "Quantità", "Prezzo Unit.", "Totale", "Membro"]);
    sheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#E6F4EA");
  }
  
  // Opzionale: Pulisci il foglio prima di riscrivere (per evitare duplicati in sync totale)
  // Commenta le due righe sotto se vuoi solo accodare
  sheet.clearContents(); 
  sheet.appendRow(["Data", "Prodotto", "Negozio", "Categoria", "Quantità", "Prezzo Unit.", "Totale", "Membro"]);

  if (data.expenses && data.expenses.length > 0) {
    var rows = data.expenses.map(function(ex) {
      return [ex.date, ex.product, ex.store, ex.category, ex.quantity, ex.unitPrice, ex.total, ex.member];
    });
    sheet.getRange(2, 1, rows.length, 8).setValues(rows);
  }
  
  return ContentService.createTextOutput(JSON.stringify({result: "success"})).setMimeType(ContentService.MimeType.JSON);
}
`;

export const GoogleSheetSync: React.FC<GoogleSheetSyncProps> = ({ expenses, familyProfile, onUpdateProfile, onClose }) => {
  const [step, setStep] = useState<'config' | 'sync'>(familyProfile.googleSheetUrl ? 'sync' : 'config');
  const [scriptUrl, setScriptUrl] = useState(familyProfile.googleSheetUrl || '');
  const [sheetName, setSheetName] = useState(() => {
    const date = new Date();
    return date.toLocaleString('it-IT', { month: 'long', year: 'numeric' }); // Es: "ottobre 2023"
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const handleSaveUrl = () => {
    if (!scriptUrl.trim().startsWith('https://script.google.com')) {
      alert("Inserisci un URL valido che inizia con https://script.google.com");
      return;
    }
    onUpdateProfile({ ...familyProfile, googleSheetUrl: scriptUrl });
    setStep('sync');
  };

  const handleSync = async () => {
    if (!scriptUrl) return;
    setIsSyncing(true);
    setStatus('idle');

    try {
      const payload = {
        sheetName: sheetName,
        expenses: expenses.map(e => ({
          ...e,
          date: new Date(e.date).toLocaleDateString('it-IT'), // Format date for sheet
          member: familyProfile.members.find(m => m.id === e.memberId)?.name || 'Sconosciuto'
        }))
      };

      // Google Apps Script Web Apps require 'no-cors' mode usually for simple POSTs from browser,
      // but to get response we might face CORS issues. 
      // Usually 'no-cors' is safest but we can't read response. 
      // Let's try standard fetch first, if CORS fails we assume success if no network error.
      
      await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors', 
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      // Since mode is no-cors, we can't check response.ok. We assume if fetch didn't throw, it worked.
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
    } finally {
      setIsSyncing(false);
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE.trim());
    alert("Codice copiato!");
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-emerald-700 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Table className="w-5 h-5 text-emerald-100" />
            <h2 className="font-bold text-lg">Backup su Google Sheets</h2>
          </div>
          <button onClick={onClose} className="text-emerald-200 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
            
            {step === 'config' ? (
                <div className="space-y-6">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                        <h3 className="font-bold text-blue-800 flex items-center gap-2 mb-2">
                            <HelpCircle className="w-4 h-4" />
                            Prima Configurazione
                        </h3>
                        <ol className="list-decimal list-inside text-sm text-blue-700 space-y-2">
                            <li>Vai su <a href="https://sheets.new" target="_blank" rel="noreferrer" className="underline font-bold">sheets.new</a> e crea un nuovo foglio.</li>
                            <li>Clicca su <strong>Estensioni</strong> {'>'} <strong>Apps Script</strong>.</li>
                            <li>Copia il codice qui sotto e incollalo nell'editor, cancellando tutto il resto.</li>
                            <li>Clicca su <strong>Pubblica</strong> {'>'} <strong>Implementa come applicazione web</strong>.</li>
                            <li>Imposta "Chi ha accesso" su <strong>Chiunque (Anyone)</strong>. (Importante!)</li>
                            <li>Copia l'URL generato e incollalo qui sotto.</li>
                        </ol>
                    </div>

                    <div className="relative">
                        <div className="absolute top-2 right-2">
                            <button onClick={copyCode} className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded flex items-center gap-1">
                                <Copy className="w-3 h-3" /> Copia
                            </button>
                        </div>
                        <pre className="bg-gray-100 p-4 rounded-lg text-xs font-mono overflow-x-auto border border-gray-300 h-32">
                            {APPS_SCRIPT_CODE.trim()}
                        </pre>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Web App URL</label>
                        <input 
                            type="text" 
                            value={scriptUrl}
                            onChange={(e) => setScriptUrl(e.target.value)}
                            placeholder="https://script.google.com/macros/s/..."
                            className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-emerald-500 outline-none"
                        />
                    </div>

                    <button 
                        onClick={handleSaveUrl}
                        disabled={!scriptUrl}
                        className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                        Salva Configurazione
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-100 flex items-start gap-3">
                        <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-bold text-emerald-800 text-sm">Collegamento Attivo</h3>
                            <p className="text-xs text-emerald-600 break-all mt-1">{scriptUrl}</p>
                            <button onClick={() => setStep('config')} className="text-xs underline text-emerald-700 mt-2">Cambia URL</button>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-1">Nome del Foglio (Tab)</label>
                        <p className="text-xs text-gray-500 mb-2">Dove vuoi salvare i dati? Se non esiste verrà creato.</p>
                        <input 
                            type="text" 
                            value={sheetName}
                            onChange={(e) => setSheetName(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 p-3 text-sm focus:border-emerald-500 outline-none"
                        />
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                        <p className="text-sm text-gray-600 mb-2">Verranno inviati <strong>{expenses.length}</strong> record.</p>
                        <ul className="text-xs text-gray-500 space-y-1 list-disc list-inside">
                            <li>I dati esistenti nel foglio "{sheetName}" verranno sovrascritti.</li>
                            <li>Ideale per backup mensili o reportistica.</li>
                        </ul>
                    </div>

                    {status === 'success' && (
                        <div className="bg-green-100 text-green-800 p-3 rounded-lg flex items-center gap-2 text-sm font-medium animate-in fade-in">
                            <CheckCircle className="w-4 h-4" />
                            Dati inviati con successo!
                        </div>
                    )}
                    
                    {status === 'error' && (
                        <div className="bg-red-100 text-red-800 p-3 rounded-lg flex items-center gap-2 text-sm font-medium animate-in fade-in">
                            <AlertCircle className="w-4 h-4" />
                            Errore durante l'invio. Controlla l'URL.
                        </div>
                    )}

                    <button 
                        onClick={handleSync}
                        disabled={isSyncing || !sheetName}
                        className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                        {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                        {isSyncing ? 'Invio in corso...' : 'Invia Dati a Google Sheets'}
                    </button>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};
