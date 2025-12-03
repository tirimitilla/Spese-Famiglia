
import React, { useState } from 'react';
import { Expense, FamilyProfile } from '../types';
import { Table, HelpCircle, CheckCircle, X, Copy, Loader2, UploadCloud } from 'lucide-react';

interface GoogleSheetSyncProps {
  expenses: Expense[];
  familyProfile: FamilyProfile;
  onUpdateProfile: (profile: FamilyProfile) => void;
  onClose: () => void;
}

// SCRIPT AGGIORNATO: Gestione Fogli Mensili e Ricerca Globale
const APPS_SCRIPT_CODE = `
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var action = data.action;   // "ADD", "UPDATE", "DELETE"
  var expense = data.expense; // Oggetto spesa
  var targetSheetName = data.sheetName; // Es. "Novembre 2025" (usato solo per ADD)
  
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // --- OPERAZIONE: AGGIUNGI (ADD) ---
  // Aggiunge sempre nel foglio specifico del mese/anno
  if (action === "ADD") {
    var sheet = ss.getSheetByName(targetSheetName);
    
    // Se il foglio del mese non esiste, crealo e metti l'intestazione
    if (!sheet) {
      sheet = ss.insertSheet(targetSheetName);
      sheet.appendRow(["ID", "Data", "Prodotto", "Negozio", "Categoria", "Quantità", "Prezzo Unit.", "Totale", "Membro"]);
      sheet.getRange(1, 1, 1, 9).setFontWeight("bold").setBackground("#E6F4EA");
    }

    sheet.appendRow([
      expense.id,
      expense.date,
      expense.product,
      expense.store,
      expense.category,
      expense.quantity,
      expense.unitPrice,
      expense.total,
      expense.member
    ]);
    return response("Added to " + targetSheetName);
  }

  // --- OPERAZIONI: MODIFICA (UPDATE) o ELIMINA (DELETE) ---
  // Cerca l'ID in TUTTI i fogli, perché potrei modificare una spesa di un mese passato
  if (action === "UPDATE" || action === "DELETE") {
    var sheets = ss.getSheets();
    var found = false;

    for (var i = 0; i < sheets.length; i++) {
      var sheet = sheets[i];
      var lastRow = sheet.getLastRow();
      if (lastRow < 2) continue; // Foglio vuoto o solo header

      // Leggi colonna A (ID)
      var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat();
      var rowIndex = ids.indexOf(expense.id);

      if (rowIndex !== -1) {
        var actualRow = rowIndex + 2; // +2 offset header/array

        if (action === "DELETE") {
          sheet.deleteRow(actualRow);
          found = true;
          break; // Trovato ed eliminato, esco
        } 
        
        if (action === "UPDATE") {
          // Se la data è cambiata drasticamente (cambio mese), dovremmo spostare la riga.
          // Per semplicità, aggiorniamo i dati. Se l'utente vuole spostare di mese, 
          // idealmente dovrebbe cancellare e ricreare, ma qui aggiorniamo in loco.
          var rowValues = [[
            expense.date,
            expense.product,
            expense.store,
            expense.category,
            expense.quantity,
            expense.unitPrice,
            expense.total,
            expense.member
          ]];
          sheet.getRange(actualRow, 2, 1, 8).setValues(rowValues);
          
          // Opzionale: rinominare il foglio se vuoto? No, troppo rischioso.
          found = true;
          break;
        }
      }
    }
    
    if (found) return response(action + " success");
    return response("ID not found in any sheet");
  }

  return response("No action specified");
}

function response(msg) {
  return ContentService.createTextOutput(JSON.stringify({result: msg})).setMimeType(ContentService.MimeType.JSON);
}
`;

export const GoogleSheetSync: React.FC<GoogleSheetSyncProps> = ({ expenses, familyProfile, onUpdateProfile, onClose }) => {
  const [step, setStep] = useState<'config' | 'sync'>(familyProfile.googleSheetUrl ? 'sync' : 'config');
  const [scriptUrl, setScriptUrl] = useState(familyProfile.googleSheetUrl || '');
  const [isSyncing, setIsSyncing] = useState(false);
  const [, setStatus] = useState<'idle' | 'success' | 'error'>('idle'); // Fixed unused status variable

  const handleSaveUrl = () => {
    if (!scriptUrl.trim().startsWith('https://script.google.com')) {
      alert("Inserisci un URL valido che inizia con https://script.google.com");
      return;
    }
    onUpdateProfile({ ...familyProfile, googleSheetUrl: scriptUrl });
    setStep('sync');
  };

  const handleBulkSync = async () => {
    if (!scriptUrl) return;
    if (!confirm("Questa operazione invierà TUTTE le spese attuali una per una per organizzarle nei fogli mensili corretti. Potrebbe richiedere del tempo. Continuare?")) return;

    setIsSyncing(true);
    setStatus('idle');

    try {
      // Per il bulk sync con la logica mensile, inviamo le spese una per una come ADD
      // È più lento ma garantisce che finiscano nel foglio giusto (Mese Anno)
      for (const expense of expenses) {
        const dateObj = new Date(expense.date);
        const month = dateObj.toLocaleString('it-IT', { month: 'long' });
        const year = dateObj.getFullYear();
        const sheetName = `${month.charAt(0).toUpperCase() + month.slice(1)} ${year}`; // Es. "Novembre 2025"

        const payload = {
            action: "ADD",
            sheetName: sheetName,
            expense: {
                ...expense,
                date: new Date(expense.date).toLocaleDateString('it-IT'),
                member: familyProfile.members.find(m => m.id === expense.memberId)?.name || 'Sconosciuto'
            }
        };

        await fetch(scriptUrl, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
      }

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
            <h2 className="font-bold text-lg">Integrazione Google Sheets</h2>
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
                            Aggiornamento Necessario
                        </h3>
                        <p className="text-sm text-blue-700 mb-2">
                          Ho aggiornato lo script per salvare le spese <strong>divise per Mese e Anno</strong> (es. "Novembre 2025").
                        </p>
                        <ol className="list-decimal list-inside text-sm text-blue-700 space-y-2">
                            <li>Vai su <a href="https://script.google.com" target="_blank" rel="noreferrer" className="underline font-bold">script.google.com</a>.</li>
                            <li>Sostituisci tutto il codice vecchio con quello qui sotto.</li>
                            <li><strong>IMPORTANTE:</strong> Clicca su "Pubblica" {'>'} "Nuova implementazione".</li>
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
                            <h3 className="font-bold text-emerald-800 text-sm">Sincronizzazione Attiva</h3>
                            <p className="text-xs text-emerald-600 break-all mt-1">{scriptUrl}</p>
                            <p className="text-xs text-gray-500 mt-2">
                              Le nuove spese verranno salvate automaticamente in fogli nominati come "Mese Anno" (es. Novembre 2025).
                            </p>
                            <button onClick={() => setStep('config')} className="text-xs underline text-emerald-700 mt-2">Aggiorna Script URL</button>
                        </div>
                    </div>

                    <button 
                        onClick={handleBulkSync}
                        disabled={isSyncing}
                        className="w-full bg-gray-100 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 border border-gray-200"
                    >
                        {isSyncing ? <Loader2 className="w-5 h-5 animate-spin" /> : <UploadCloud className="w-5 h-5" />}
                        {isSyncing ? 'Invio in corso...' : 'Invia tutto lo storico (organizzato per mesi)'}
                    </button>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};
