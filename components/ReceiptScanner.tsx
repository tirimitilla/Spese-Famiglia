
import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, ScanLine, CheckCircle, Sparkles, AlertTriangle, RefreshCw } from 'lucide-react';
import { parseReceiptImage, ReceiptData } from '../services/geminiService';

interface ReceiptScannerProps {
  onScanComplete: (data: ReceiptData) => void;
}

type ScanStatus = 'idle' | 'scanning' | 'success' | 'error';

export const ReceiptScanner: React.FC<ReceiptScannerProps> = ({ onScanComplete }) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  
  const [status, setStatus] = useState<ScanStatus>('idle');
  const [foundItemsCount, setFoundItemsCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  // Funzione per comprimere e convertire l'immagine in JPEG base64
  const compressAndConvertToBase64 = (file: File): Promise<{ base64: string, mimeType: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Ridimensiona se l'immagine è troppo grande (max 1500px lato lungo)
          const MAX_DIMENSION = 1500;
          if (width > height) {
            if (width > MAX_DIMENSION) {
              height *= MAX_DIMENSION / width;
              width = MAX_DIMENSION;
            }
          } else {
            if (height > MAX_DIMENSION) {
              width *= MAX_DIMENSION / height;
              height = MAX_DIMENSION;
            }
          }

          canvas.width = width;
          canvas.height = height;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error("Impossibile creare il contesto canvas"));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Converte sempre in JPEG con qualità 0.7 (buona per testo, leggera)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          const base64 = dataUrl.split(',')[1];
          
          resolve({ base64, mimeType: 'image/jpeg' });
        };
        
        img.onerror = (err) => reject(err);
      };
      
      reader.onerror = (err) => reject(err);
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Rimuovo il check rigido dei 5MB sul file originale perché ora comprimiamo
    // Ma evitiamo file assurdi > 20MB
    if (file.size > 20 * 1024 * 1024) {
       setErrorMessage("L'immagine è eccessivamente grande. Usa una foto più piccola.");
       setStatus('error');
       return;
    }

    setStatus('scanning');
    setErrorMessage('');

    try {
      // 1. Comprimi e Converti
      const { base64, mimeType } = await compressAndConvertToBase64(file);
      
      // 2. Invia a Gemini
      const result = await parseReceiptImage(base64, mimeType);
      
      if (result.success && result.data) {
        onScanComplete(result.data);
        setFoundItemsCount(result.data.items.length);
        setStatus('success');
        
        // Reset to idle after 3 seconds
        setTimeout(() => {
          setStatus('idle');
        }, 3000);
      } else {
        setErrorMessage(result.error || "Impossibile leggere lo scontrino.");
        setStatus('error');
      }
      
      // Reset inputs to allow re-selecting same file if needed
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
      
    } catch (error) {
      console.error("Error processing image", error);
      setErrorMessage("Errore durante l'elaborazione dell'immagine.");
      setStatus('error');
    }
  };

  const handleRetry = () => {
    setStatus('idle');
    setErrorMessage('');
  };

  return (
    <div className={`p-6 rounded-xl shadow-lg border transition-all duration-300 mb-6 text-white overflow-hidden relative ${
      status === 'error' ? 'bg-red-50 border-red-200' : 'bg-gradient-to-br from-emerald-600 to-teal-700 border-emerald-500/50'
    }`}>
      
      {/* Inputs Hidden */}
      <input
        type="file"
        ref={cameraInputRef}
        onChange={handleFileChange}
        accept="image/*"
        capture="environment"
        className="hidden"
      />
      <input
        type="file"
        ref={galleryInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* IDLE STATE */}
      {status === 'idle' && (
        <>
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
          <div className="flex items-center justify-between mb-4 relative z-10">
            <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <ScanLine className="w-5 h-5 text-emerald-200" />
                    Scansiona Scontrino
                </h2>
                <p className="text-emerald-100 text-xs mt-1 opacity-90">
                    Usa l'IA per estrarre prodotti e prezzi dalla foto.
                </p>
            </div>
            <div className="bg-white/20 p-2 rounded-lg">
              <Sparkles className="w-5 h-5 text-yellow-300" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
                onClick={() => cameraInputRef.current?.click()}
                className="group bg-white text-emerald-700 hover:bg-emerald-50 font-bold py-3 px-2 rounded-lg transition-all duration-200 flex flex-col items-center justify-center gap-1 shadow-md active:scale-[0.98]"
            >
                <Camera className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-sm">Scatta Foto</span>
            </button>

            <button
                onClick={() => galleryInputRef.current?.click()}
                className="group bg-emerald-800/40 hover:bg-emerald-800/60 border border-emerald-400/30 text-white font-medium py-3 px-2 rounded-lg transition-all duration-200 flex flex-col items-center justify-center gap-1 active:scale-[0.98]"
            >
                <ImageIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-sm">Galleria</span>
            </button>
          </div>
        </>
      )}

      {/* SCANNING STATE */}
      {status === 'scanning' && (
        <div className="flex flex-col items-center justify-center py-2 animate-in fade-in duration-300">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-emerald-200/30 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-white border-r-white/50 border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            <ScanLine className="absolute inset-0 m-auto w-6 h-6 text-white animate-pulse" />
          </div>
          <h3 className="font-semibold text-lg">Analisi in corso...</h3>
          <p className="text-emerald-100 text-xs mt-1 text-center">
            Sto ottimizzando e leggendo lo scontrino...
          </p>
        </div>
      )}

      {/* SUCCESS STATE */}
      {status === 'success' && (
        <div className="flex flex-col items-center justify-center py-2 animate-in zoom-in duration-300">
          <div className="w-14 h-14 bg-white text-emerald-600 rounded-full flex items-center justify-center mb-3 shadow-lg">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="font-bold text-lg">Successo!</h3>
          <p className="text-emerald-100 text-sm mt-1">
            Aggiunti {foundItemsCount} prodotti allo storico.
          </p>
        </div>
      )}

      {/* ERROR STATE */}
      {status === 'error' && (
        <div className="flex flex-col items-center justify-center py-1 animate-in shake duration-300 text-red-800">
          <div className="bg-red-100 p-3 rounded-full mb-3">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="font-bold text-lg text-red-700">Scansione Fallita</h3>
          <p className="text-red-600 text-sm mt-1 text-center max-w-xs mb-4 leading-tight">
            {errorMessage}
          </p>
          
          <button 
            onClick={handleRetry}
            className="flex items-center gap-2 bg-red-600 text-white px-5 py-2 rounded-lg hover:bg-red-700 transition-colors shadow-sm text-sm font-medium"
          >
            <RefreshCw className="w-4 h-4" /> Riprova
          </button>
        </div>
      )}
    </div>
  );
};
