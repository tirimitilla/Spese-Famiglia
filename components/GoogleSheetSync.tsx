
import React, { useState } from 'react';
import { Expense, FamilyProfile } from '../types';
import { HelpCircle, X, Copy, RefreshCw } from 'lucide-react';

interface GoogleSheetSyncProps {
  expenses: Expense[];
  familyProfile: FamilyProfile;
  onUpdateProfile: (profile: FamilyProfile) => void;
  onClose: () => void;
}

const APPS_SCRIPT_CODE = `
function doPost(e) {
  var data = JSON.parse(e.postData.contents);
  var action = data.action;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // --- SALVATAGGIO STATO COMPLETO (SU FOGLI SEPARATI) ---
  if (action === "SET_STATE") {
    var state = data.state;
    
    // Salviamo ogni pezzo su un foglio dedicato per evitare conflitti
    saveToHiddenSheet(ss, "_DB_EXPENSES", state.expenses);
    saveToHiddenSheet(ss, "_DB_INCOMES", state.incomes);
    saveToHiddenSheet(ss, "_DB_SHOPPING", state.shoppingList);
    saveToHiddenSheet(ss, "_DB_META", { 
      stores: state.stores, 
      recurring: state.recurringExpenses, 
      prefs: state.offerPrefs,
      lastUpdated: state.lastUpdated 
    });

    return response({ success: true, timestamp: Date.now() });
  }

  // --- CARICAMENTO STATO (DA FOGLI SEPARATI) ---
  if (action === "GET_STATE") {
    var expenses = loadFromHiddenSheet(ss, "_DB_EXPENSES") || [];
    var incomes = loadFromHiddenSheet(ss, "_DB_INCOMES") || [];
    var shoppingList = loadFromHiddenSheet(ss, "_DB_SHOPPING") || [];
    var meta = loadFromHiddenSheet(ss, "_DB_META") || {};

    return response({
      expenses: expenses,
      incomes: incomes,
      shoppingList: shoppingList,
      stores: meta.stores || [],
      recurringExpenses: meta.recurring || [],
      offerPrefs: meta.prefs || {},
      lastUpdated: meta.lastUpdated || 0
    });
  }

  // --- REPORT TABELLARE (LEGGIBILE DA UMANI) ---
  if (action === "ADD_REPORT") {
    var expense = data.expense;
    var targetSheetName = data.sheetName; 
    var sheet = ss.getSheetByName(targetSheetName);
    if (!sheet) {
      sheet = ss.insertSheet(targetSheetName);
      sheet.appendRow(["ID", "Data", "Prodotto", "Negozio", "Categoria", "Quantità", "Prezzo Unit.", "Totale"]);
      sheet.getRange(1, 1, 1, 8).setFontWeight("bold").setBackground("#E6F4EA");
    }
    // Evita duplicati controllando l'ID
    var textFinder = sheet.createTextFinder(expense.id);
    if (textFinder.findAll().length === 0) {
       sheet.appendRow([
        expense.id, expense.date, expense.product, expense.store, expense.category, expense.quantity, expense.unitPrice, expense.total
      ]);
    }
    return response("Report Added");
  }

  return response("Unknown Action");
}

// Funzione Helper per salvare JSON su un foglio nascosto
function saveToHiddenSheet(ss, sheetName, data) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) { 
    sheet = ss.insertSheet(sheetName);
    // sheet.hideSheet(); // Decommenta se vuoi nasconderli
  }
  sheet.clear();
  if (data) {
    // Usiamo la cella A1 per conservare tutto il blocco JSON
    // Questo è molto più veloce e sicuro per la sincronizzazione app-to-app
    // rispetto a scrivere riga per riga che può creare errori di parsing
    sheet.getRange(1,1).setValue(JSON.stringify(data));
  }
}

// Funzione Helper per caricare JSON
function loadFromHiddenSheet(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return null;
  var val = sheet.getRange(1,1).getValue();
  if (!val) return null;
  try {
    return JSON.parse(val);
  } catch(e) {
    return null;
  }
}

function response(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}
`;

export const GoogleSheetSync: React.FC<GoogleSheetSyncProps> = ({ familyProfile, onUpdateProfile, onClose }) => {
  const [scriptUrl, setScriptUrl] = useState(familyProfile.googleSheetUrl || '');
  
  const copyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE.trim());
    alert("Nuovo Codice copiato! Aggiorna il tuo script su Google.");
  };

  const handleSaveUrl = () => {
    if (!scriptUrl.trim().startsWith('https://script.google.com')) {
      alert("Inserisci un URL valido che inizia con https://script.google.com");
      return;
    }
    onUpdateProfile({ ...familyProfile, googleSheetUrl: scriptUrl });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-emerald-700 text-white p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-emerald-100" />
            <h2 className="font-bold text-lg">Cloud Sync (Google Sheets)</h2>
          </div>
          <button onClick={onClose} className="text-emerald-200 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
            <div className="bg-orange-50 p-4 rounded-lg border border-orange-100 mb-6">
                <h3 className="font-bold text-orange-800 flex items-center gap-2 mb-2">
                    <HelpCircle className="w-4 h-4" />
                    Aggiornamento Critico Richiesto
                </h3>
                <p className="text-sm text-orange-700 mb-2">
                  Ho riscritto il sistema di salvataggio per separare <strong>Guadagni</strong>, <strong>Lista Spesa</strong> e <strong>Spese</strong> in fogli diversi.
                </p>
                <ol className="list-decimal list-inside text-sm text-orange-700 space-y-2">
                    <li>Copia il <strong>Nuovo Codice</strong> qui sotto.</li>
                    <li>Vai su <a href="https://script.google.com" target="_blank" rel="noreferrer" className="underline font-bold">script.google.com</a> e incolla tutto.</li>
                    <li>Pubblica di nuovo ("Nuova implementazione").</li>
                </ol>
            </div>

            <div className="relative mb-6">
                <div className="absolute top-2 right-2">
                    <button onClick={copyCode} className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded flex items-center gap-1">
                        <Copy className="w-3 h-3" /> Copia Codice
                    </button>
                </div>
                <pre className="bg-gray-100 p-4 rounded-lg text-xs font-mono overflow-x-auto border border-gray-300 h-32">
                    {APPS_SCRIPT_CODE.trim()}
                </pre>
            </div>

            <div className="border-t border-gray-100 pt-4">
                <label className="block text-sm font-bold text-gray-700 mb-1">Web App URL</label>
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        value={scriptUrl}
                        onChange={(e) => setScriptUrl(e.target.value)}
                        placeholder="https://script.google.com/macros/s/..."
                        className="flex-1 rounded-lg border border-gray-300 p-3 text-sm focus:border-emerald-500 outline-none"
                    />
                    <button 
                        onClick={handleSaveUrl}
                        className="bg-emerald-600 text-white font-bold px-4 rounded-xl hover:bg-emerald-700 transition-colors"
                    >
                        Salva & Connetti
                    </button>
                </div>
            </div>

        </div>
      </div>
    </div>
  );
};
