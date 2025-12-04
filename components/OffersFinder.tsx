
import React, { useState, useEffect } from 'react';
import { Store, FlyerOffer } from '../types';
import { Search, MapPin, Loader2, ExternalLink, Calendar, ShoppingBag, Percent, Bell, BellOff, Locate } from 'lucide-react';
import { findFlyerOffers } from '../services/geminiService';

interface OffersFinderProps {
  stores: Store[];
  savedCity: string;
  savedStores: string[];
  notificationsEnabled: boolean;
  onPreferencesChange: (city: string, selectedStores: string[], notificationsEnabled: boolean) => void;
}

export const OffersFinder: React.FC<OffersFinderProps> = ({ 
    stores, 
    savedCity, 
    savedStores, 
    notificationsEnabled,
    onPreferencesChange 
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const [city, setCity] = useState(savedCity);
  const [selectedStores, setSelectedStores] = useState<Set<string>>(new Set(savedStores));
  const [isLoading, setIsLoading] = useState(false);
  const [offers, setOffers] = useState<FlyerOffer[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Initialize selected stores default if empty
  useEffect(() => {
    if (stores.length > 0 && selectedStores.size === 0 && savedStores.length === 0) {
      const initial = new Set<string>();
      stores.slice(0, 3).forEach(s => initial.add(s.name));
      setSelectedStores(initial);
    }
  }, [stores]);

  const toggleStore = (storeName: string) => {
    const next = new Set(selectedStores);
    if (next.has(storeName)) next.delete(storeName);
    else next.add(storeName);
    setSelectedStores(next);
  };

  const savePreferences = (currentCity: string, enableNotifications: boolean = notificationsEnabled) => {
    onPreferencesChange(currentCity, Array.from(selectedStores), enableNotifications);
  };

  const handleToggleNotifications = async () => {
    if (!notificationsEnabled) {
        if (!("Notification" in window)) {
            alert("Questo browser non supporta le notifiche.");
            return;
        }

        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            savePreferences(city, true);
        } else {
            alert("Permesso notifiche negato.");
        }
    } else {
        savePreferences(city, false);
    }
  };

  const handleGeoLocation = () => {
    if (!navigator.geolocation) {
      alert("La geolocalizzazione non è supportata dal tuo browser.");
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Usa un'API pubblica gratuita per il reverse geocoding
          const response = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=it`
          );
          const data = await response.json();
          
          const foundCity = data.city || data.locality || data.principalSubdivision;
          
          if (foundCity) {
            setCity(foundCity);
            savePreferences(foundCity); // Salva subito la città trovata
          } else {
            alert("Città non trovata. Inseriscila manualmente.");
          }
        } catch (error) {
          console.error("Errore geolocalizzazione:", error);
          alert("Impossibile recuperare il nome della città. Riprova o inserisci manualmente.");
        } finally {
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Errore permessi GPS:", error);
        alert("Per usare il GPS, devi concedere i permessi di localizzazione.");
        setIsLocating(false);
      }
    );
  };

  const handleSearch = async () => {
    if (!city.trim() || selectedStores.size === 0) return;
    
    savePreferences(city);

    setIsLoading(true);
    setHasSearched(true);
    setOffers([]); 
    
    const results = await findFlyerOffers(city, Array.from(selectedStores));
    setOffers(results);
    setIsLoading(false);
  };

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 mb-6">
      <div 
        className="flex justify-between items-center cursor-pointer select-none mb-4"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Percent className="w-5 h-5 text-red-500" />
          Caccia alle Offerte
        </h3>
        <button className="text-red-500 hover:text-red-700 text-sm font-semibold">
          {isOpen ? 'Chiudi' : 'Apri'}
        </button>
      </div>

      {isOpen && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          
          <div className="bg-red-50 border border-red-100 rounded-xl p-4 mb-5">
             <div className="flex justify-between items-center mb-3">
                 <h4 className="font-bold text-red-800 text-sm">Impostazioni Monitoraggio</h4>
                 <button 
                    onClick={handleToggleNotifications}
                    className={`p-2 rounded-full transition-colors flex items-center gap-2 px-3 ${notificationsEnabled ? 'bg-red-200 text-red-800' : 'bg-white text-gray-400 border border-gray-200'}`}
                    title={notificationsEnabled ? "Notifiche Attive" : "Abilita Notifiche"}
                 >
                     {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                     <span className="text-xs font-bold">{notificationsEnabled ? 'ON' : 'OFF'}</span>
                 </button>
             </div>
             
             {/* City Input with GPS */}
             <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">La tua zona</label>
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
                        className="pl-10 w-full rounded-xl border border-gray-300 bg-white p-3 text-base focus:border-red-500 focus:ring-2 focus:ring-red-100 outline-none transition-all shadow-sm"
                        />
                    </div>
                    <button
                        onClick={handleGeoLocation}
                        disabled={isLocating}
                        className="bg-white border border-gray-300 text-gray-600 px-3 rounded-xl hover:bg-gray-50 hover:text-red-600 transition-colors shadow-sm"
                        title="Usa la mia posizione"
                    >
                        {isLocating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Locate className="w-5 h-5" />}
                    </button>
                </div>
             </div>

             {/* Store Selection */}
             <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Monitora Volantini di:</label>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                    {stores.map(store => (
                        <button
                        key={store.id}
                        onClick={() => toggleStore(store.name)}
                        className={`text-sm px-3 py-1.5 rounded-full border transition-all active:scale-95 ${
                            selectedStores.has(store.name) 
                            ? 'bg-red-500 border-red-600 text-white font-semibold shadow-sm' 
                            : 'bg-white border-gray-200 text-gray-600 hover:border-red-300'
                        }`}
                        >
                        {store.name}
                        </button>
                    ))}
                </div>
             </div>
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            disabled={isLoading || !city || selectedStores.size === 0}
            className="w-full bg-red-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-md active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Controllo volantini...
              </>
            ) : (
              <>
                <Search className="w-5 h-5" /> Cerca Offerte Ora
              </>
            )}
          </button>

          {/* Results */}
          <div className="mt-6 space-y-4">
            {hasSearched && !isLoading && offers.length === 0 && (
              <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <p className="text-sm text-gray-500">
                    Nessun volantino trovato al momento. <br/> Prova a cambiare città o controlla più tardi.
                  </p>
              </div>
            )}

            {offers.map((offer, idx) => (
              <div key={idx} className="border border-gray-100 rounded-xl p-4 hover:shadow-lg transition-all bg-white group">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                    <ShoppingBag className="w-5 h-5 text-red-500" />
                    {offer.storeName}
                  </h4>
                  {offer.validUntil && (
                    <span className="text-[10px] uppercase font-bold text-gray-500 bg-gray-100 px-2 py-1 rounded-md flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> Scad: {offer.validUntil}
                    </span>
                  )}
                </div>
                
                {offer.topOffers.length > 0 && (
                  <div className="bg-red-50/50 rounded-lg p-3 mb-3">
                      <p className="text-xs font-bold text-red-800 uppercase mb-1">In evidenza:</p>
                      <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                        {offer.topOffers.slice(0, 3).map((item, i) => (
                        <li key={i}>{item}</li>
                        ))}
                      </ul>
                  </div>
                )}

                {offer.flyerLink && (
                  <a 
                    href={offer.flyerLink} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="block w-full text-center bg-white border-2 border-red-500 text-red-600 text-sm font-bold py-3 rounded-xl hover:bg-red-50 transition-colors flex items-center justify-center gap-2 group-hover:bg-red-600 group-hover:text-white"
                  >
                    <ExternalLink className="w-4 h-4" /> Vedi Volantino Digitale
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
