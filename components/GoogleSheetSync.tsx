
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
  var lock = LockService.getScriptLock();
  // Wait longer to ensure no collision
  lock.tryLock(30000); 

  try {
    var output = {};
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    
    // --- NOMI FOGLI DATABASE ---
    var SHEET_EXPENSES = "_DB_EXPENSES";
    var SHEET_INCOMES = "_DB_INCOMES";
    var SHEET_SHOPPING = "_DB_SHOPPING";
    var SHEET_META = "_DB_META";

    if (action === "SET_STATE") {
      var state = data.state;
      
      // Salva ogni pezzo nel suo foglio dedicato
      saveJsonToSheet(ss, SHEET_EXPENSES, state.expenses || []);
      saveJsonToSheet(ss, SHEET_INCOMES, state.incomes || []);
      saveJsonToSheet(ss, SHEET_SHOPPING, state.shoppingList || []);
      
      var metaData = {
        stores: state.stores || [],
        recurring: state.recurringExpenses || [],
        prefs: state.offerPrefs || {},
        lastUpdated: state.lastUpdated || Date.now()
      };
      saveJsonToSheet(ss, SHEET_META, metaData);

      output = { success: true, timestamp: metaData.lastUpdated };
    }

    else if (action === "GET_STATE") {
      // Carica i dati separatamente
      var expenses = loadJsonFromSheet(ss, SHEET_EXPENSES) || [];
      var incomes = loadJsonFromSheet(ss, SHEET_INCOMES) || [];
      var shoppingList = loadJsonFromSheet(ss, SHEET_SHOPPING) || [];
      var meta = loadJsonFromSheet(ss, SHEET_META) || {};

      output = {
        expenses: Array.isArray(expenses) ? expenses : [],
        incomes: Array.isArray(incomes) ? incomes : [],
        shoppingList: Array.isArray(shoppingList) ? shoppingList : [],
        stores: Array.isArray(meta.stores) ? meta.stores : [],
        recurringExpenses: Array.isArray(meta.recurring) ? meta.recurring : [],
        offerPrefs: meta.prefs || {},
        lastUpdated: meta.lastUpdated || 0
      };
    }

    else if (action === "ADD_REPORT") {
       // Questa azione serve solo per creare il report leggibile per umani (non usato per sync app)
       output = { success: true };
    }

    return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ error: error.toString() })).setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

// Funzione Helper per salvare JSON
function saveJsonToSheet(ss, sheetName, data) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) { 
    sheet = ss.insertSheet(sheetName);
    // sheet.hideSheet(); // Puoi scommentare per nascondere i fogli DB
  }
  sheet.clear();
  var jsonStr = JSON.stringify(data);
  sheet.getRange(1,1).setValue(jsonStr);
}

// Funzione Helper per caricare JSON
function loadJsonFromSheet(ss, sheetName) {
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
`;

export const GoogleSheetSync: React.FC<GoogleSheetSyncProps> = ({ familyProfile, onUpdateProfile, onClose }) => {
  const [scriptUrl, setScriptUrl] = useState(familyProfile.googleSheetUrl || '');
  
  const copyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE.trim());
    alert("Nuovo Codice copiato! Incollalo su Google Apps Script e ricorda di fare NUOVA IMPLEMENTAZIONE.");
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
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
                <h3 className="font-bold text-blue-800 flex items-center gap-2 mb-2">
                    <HelpCircle className="w-4 h-4" />
                    IMPORTANTE: Aggiorna lo Script
                </h3>
                <ol className="list-decimal list-inside text-sm text-blue-700 space-y-2">
                    <li>Copia il codice qui sotto.</li>
                    <li>Vai su Google Apps Script (Estensioni {'>'} Apps Script).</li>
                    <li>Incolla e sostituisci tutto il vecchio codice.</li>
                    <li className="font-bold text-red-600">Clicca su Pubblica {'>'} Nuova implementazione (Fondamentale!).</li>
                </ol>
            </div>

            <div className="relative mb-6">
                <div className="absolute top-2 right-2">
                    <button onClick={copyCode} className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded flex items-center gap-1">
                        <Copy className="w-3 h-3" /> Copia Codice
                    </button>
                </div>
                <pre className="bg-gray-100 p-4 rounded-lg text-xs font-mono overflow-x-auto border border-gray-300 h-64">
                    {APPS_SCRIPT_CODE.trim()}
                </pre>
            </div>

            <div className="border-t border-gray-100 pt-4">
                <label className="block text-sm font-bold text-gray-700 mb-1">Web App URL (non cambia se aggiorni lo script)</label>
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
