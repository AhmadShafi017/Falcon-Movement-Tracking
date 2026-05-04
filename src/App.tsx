import { useState, useEffect } from 'react';
import { MapPin, ArrowUpRight, Search, Database, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import MapPopup from './components/MapPopup';

interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description: string;
  category: string;
}

export default function App() {
  const [apiUrl, setApiUrl] = useState('/api/lookup?lat=23.8103&lng=90.4125&name=Sample+Location');
  const [loading, setLoading] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = await res.json();
      setSelectedLocation(data);
    } catch (err) {
      console.error('Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Invalid API Response');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen font-sans bg-slate-50 flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
      >
        <div className="p-8 border-b border-slate-100 flex items-center gap-4 bg-slate-50/50">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
            <Database size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 leading-tight">API Command Center</h1>
            <p className="text-xs text-slate-400 font-mono uppercase tracking-widest mt-1">GeoArchive Pro v2.0</p>
          </div>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Coordinate API Endpoint</label>
            <div className="relative group">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors">
                <Search size={18} />
              </div>
              <input 
                type="text" 
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder="Paste API URL here (e.g. /api/lookup?lat=...&lng=...)"
                className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono focus:bg-white focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          {error && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }} 
              animate={{ height: 'auto', opacity: 1 }}
              className="p-4 bg-red-50 border border-red-100 rounded-lg text-red-600 text-xs font-medium flex items-center gap-2"
            >
              <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              {error}
            </motion.div>
          )}

          <button 
            onClick={handleFetch}
            disabled={loading || !apiUrl}
            className="w-full py-4 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-[0.98] disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3 group"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                <span>INTERROGATING SOURCE...</span>
              </>
            ) : (
              <>
                <span>LAUNCH SPATIAL PREVIEW</span>
                <ArrowUpRight size={20} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </>
            )}
          </button>
        </div>

        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <div className="flex gap-4">
            <div className="text-[10px]">
              <span className="block text-slate-300 font-bold uppercase">METHOD</span>
              <span className="font-mono text-slate-500">GET_JSON</span>
            </div>
            <div className="text-[10px]">
              <span className="block text-slate-300 font-bold uppercase">TIMEOUT</span>
              <span className="font-mono text-slate-500">5000MS</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${apiUrl ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-300'}`} />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">API_READY</span>
          </div>
        </div>
      </motion.div>

      {/* Full Screen Map Popup Modal */}
      <MapPopup 
        location={selectedLocation} 
        onClose={() => setSelectedLocation(null)} 
      />
    </div>
  );
}
