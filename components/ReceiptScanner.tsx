import React, { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, ScanLine, CheckCircle, Sparkles, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
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
          
          const MAX_DIMENSION = 1200; // Ottimale per OCR
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
          if (!ctx) return reject(new Error("Errore Canvas"));
          
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' });
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus('scanning');
    setErrorMessage('');

    try {
      const { base64, mimeType } = await compressAndConvertToBase64(file);
      const result = await parseReceiptImage(base64, mimeType);
      
      if (result.success && result.data) {
        onScanComplete(result.data);
        setFoundItemsCount(result.data.items.length);
        setStatus('success');
        setTimeout(() => setStatus('idle'), 3000);
      } else {
        setErrorMessage(result.error || "Impossibile leggere lo scontrino.");
        setStatus('error');
      }
    } catch (error) {
      console.error("Scan Error:", error);
      setErrorMessage("Errore di caricamento immagine.");
      setStatus('error');
    } finally {
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    }
  };

  return (
    <div className={`p-6 rounded-2xl shadow-lg border transition-all duration-300 mb-6 text-white overflow-hidden relative ${
      status === 'error' ? 'bg-red-50 border-red-200' : 'bg-gradient-to-br from-emerald-600 to-teal-700 border-emerald-500/50'
    }`}>
      <input type="file" ref={cameraInputRef} onChange={handleFileChange} accept="image/*" capture="environment" className="hidden" />
      <input type="file" ref={galleryInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

      {status === 'idle' && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div>
                <h2 className="text-lg font-bold flex items-center gap-2">
                    <ScanLine className="w-5 h-5 text-emerald-200" /> Scansiona Scontrino
                </h2>
                <p className="text-emerald-100 text-xs mt-1">L'IA caricherà automaticamente tutti i prodotti.</p>
            </div>
            <Sparkles className="w-5 h-5 text-yellow-300" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => cameraInputRef.current?.click()} className="bg-white text-emerald-700 font-bold py-3 rounded-xl flex flex-col items-center gap-1 shadow-md active:scale-95">
                <Camera className="w-5 h-5" /> <span className="text-sm">Fotocamera</span>
            </button>
            <button onClick={() => galleryInputRef.current?.click()} className="bg-emerald-800/40 text-white font-medium py-3 rounded-xl flex flex-col items-center gap-1 active:scale-95">
                <ImageIcon className="w-5 h-5" /> <span className="text-sm">Galleria</span>
            </button>
          </div>
        </>
      )}

      {status === 'scanning' && (
        <div className="flex flex-col items-center py-4">
          <Loader2 className="w-10 h-10 animate-spin mb-3" />
          <h3 className="font-bold text-lg">Analisi IA in corso...</h3>
          <p className="text-emerald-100 text-xs">Leggo prodotti e prezzi dallo scontrino...</p>
        </div>
      )}

      {status === 'success' && (
        <div className="flex flex-col items-center py-4">
          <CheckCircle className="w-12 h-12 mb-2" />
          <h3 className="font-bold text-lg">Caricato!</h3>
          <p className="text-emerald-100 text-sm">Aggiunti {foundItemsCount} prodotti alla lista.</p>
        </div>
      )}

      {status === 'error' && (
        <div className="flex flex-col items-center py-2 text-red-800">
          <AlertTriangle className="w-10 h-10 text-red-600 mb-2" />
          <h3 className="font-bold">Errore Scansione</h3>
          <p className="text-red-600 text-xs text-center mb-4">{errorMessage}</p>
          <button onClick={() => setStatus('idle')} className="bg-red-600 text-white px-6 py-2 rounded-lg text-sm font-bold">Riprova</button>
        </div>
      )}
    </div>
  );
};