
import React, { useState } from 'react';
import { Store, FlyerOffer } from '../types';
import { Search, MapPin, Loader2, ExternalLink, Calendar, ShoppingBag, Percent } from 'lucide-react';
import { findFlyerOffers } from '../services/geminiService';

interface OffersFinderProps {
  stores: Store[];
}

export const OffersFinder: React.FC<OffersFinderProps> = ({ stores }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [city, setCity] = useState('');
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [offers, setOffers] = useState<FlyerOffer[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleGeolocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        // Simple reverse geocoding simulation or user prompt override
        // Since we don't have a geocoding API key, we'll ask the user or rely on browser prompt
        // For now, let's just set a placeholder or ask user to type.
        alert("Inserisci il nome della tua città per risultati migliori.");
      }, (error) => {
        alert("Impossibile ottenere la posizione. Inserisci la città manualmente.");
      });
    }
  };

  const toggleStore = (storeName: string) => {
    const next = new Set(selectedStores);
    if (next.has(storeName)) next.delete(storeName);
    else next.add(storeName);
    setSelectedStores(next);
  };

  const handleSearch = async () => {
    if (!city.trim() || selectedStores.size === 0) return;
    
    setIsLoading(true);
    setHasSearched(true);
    setOffers([]); // Reset previous
    
    const results = await findFlyerOffers(city, Array.from(selectedStores));
    setOffers(results);
    setIsLoading(false);
  };

  // Initialize selected stores with first few available
  React.useEffect(() => {
    if (stores.length > 0 && selectedStores.size === 0) {
      const initial = new Set<string>();
      stores.slice(0, 3).forEach(s => initial.add(s.name));
      setSelectedStores(initial);
    }
  }, [stores]);

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6">
      <div 
        className="flex justify-between items-center cursor-pointer select-none"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Percent className="w-4 h-4 text-red-500" />
          Caccia alle Offerte
        </h3>
        <button className="text-red-500 hover:text-red-700 text-xs font-medium">
          {isOpen ? 'Chiudi' : 'Apri'}
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* City Input */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">La tua zona</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MapPin className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Città (es. Milano)"
                  className="pl-10 w-full rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm focus:border-red-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Store Selection */}
          <div className="mb-4">
            <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Seleziona Negozi</label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {stores.map(store => (
                <button
                  key={store.id}
                  onClick={() => toggleStore(store.name)}
                  className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                    selectedStores.has(store.name) 
                      ? 'bg-red-100 border-red-200 text-red-700 font-medium' 
                      : 'bg-gray-50 border-gray-200 text-gray-600'
                  }`}
                >
                  {store.name}
                </button>
              ))}
            </div>
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={isLoading || !city || selectedStores.size === 0}
            className="w-full bg-red-600 text-white py-2 rounded-lg font-bold text-sm hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Cercando volantini...
              </>
            ) : (
              <>
                <Search className="w-4 h-4" /> Cerca Volantini
              </>
            )}
          </button>

          {/* Results */}
          <div className="mt-4 space-y-3">
            {hasSearched && !isLoading && offers.length === 0 && (
              <p className="text-xs text-center text-gray-500 bg-gray-50 p-2 rounded-lg">
                Nessun volantino trovato. Prova a cambiare città o negozi.
              </p>
            )}

            {offers.map((offer, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-3 hover:shadow-md transition-shadow bg-white">
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-gray-800 flex items-center gap-1">
                    <ShoppingBag className="w-4 h-4 text-red-500" />
                    {offer.storeName}
                  </h4>
                  {offer.validUntil && (
                    <span className="text-[10px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Scad: {offer.validUntil}
                    </span>
                  )}
                </div>
                
                {offer.topOffers.length > 0 && (
                  <ul className="text-xs text-gray-600 mb-3 space-y-1 list-disc list-inside">
                    {offer.topOffers.slice(0, 3).map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                )}

                {offer.flyerLink && (
                  <a 
                    href={offer.flyerLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-red-50 text-red-600 text-xs font-bold py-1.5 rounded hover:bg-red-100 transition-colors flex items-center justify-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> Vedi Volantino
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
