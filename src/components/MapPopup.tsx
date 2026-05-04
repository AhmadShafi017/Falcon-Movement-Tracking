import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useEffect } from 'react';

// Fix for default marker icons in Leaflet with Vite
// Using a custom SVG marker to avoid image path issues
const customIcon = new L.DivIcon({
  html: `<svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 21C16 17.5 19 14.2 19 10C19 6.13401 15.866 3 12 3C8.13401 3 5 6.13401 5 10C5 14.2 8 17.5 12 21Z" fill="#2563EB" stroke="#FFFFFF" stroke-width="2"/>
          <circle cx="12" cy="10" r="3" fill="#FFFFFF"/>
        </svg>`,
  className: 'custom-marker-icon',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
});

interface Location {
  id: string;
  name: string;
  lat: number;
  lng: number;
  description: string;
}

interface MapPopupProps {
  location: Location | null;
  onClose: () => void;
}

// Component to handle map centering when location changes
function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, 13);
  }, [center, map]);
  return null;
}

export default function MapPopup({ location, onClose }: MapPopupProps) {
  if (!location) return null;

  // Google Maps Embed URL (No-Key version for basic place/search)
  const mapUrl = `https://maps.google.com/maps?q=${location.lat},${location.lng}&z=15&output=embed`;
  const googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}`;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-white flex flex-col"
      >
        {/* Full Screen Header */}
        <header className="h-16 px-8 border-b border-slate-200 flex items-center justify-between shrink-0 bg-white shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-blue-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <div>
              <h2 className="font-bold text-lg text-slate-900 leading-tight">{location.name}</h2>
              <p className="text-[10px] font-mono text-slate-400 uppercase tracking-widest leading-none mt-1">
                COORDINATES: {location.lat.toFixed(6)} N, {location.lng.toFixed(6)} E
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex gap-4 mr-4">
               <div className="text-xs text-right">
                  <span className="block text-[10px] font-bold text-slate-300 uppercase tracking-tighter">PROVIDER</span>
                  <span className="font-mono text-slate-600 font-medium">GOOGLE_MAPS</span>
               </div>
               <div className="w-px h-6 bg-slate-200" />
               <div className="text-xs text-right">
                  <span className="block text-[10px] font-bold text-slate-300 uppercase tracking-tighter">DATA</span>
                  <span className="font-mono text-blue-600 font-medium">LIVE_FEED</span>
               </div>
            </div>
            <a 
              href={googleMapsLink} 
              target="_blank" 
              rel="noreferrer"
              className="px-4 py-2 bg-slate-100 text-slate-600 rounded-md font-bold text-sm hover:bg-slate-200 transition-all border border-slate-200 mr-2"
            >
              Exernal View
            </a>
            <button 
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-md font-bold text-sm shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all active:scale-95"
            >
              Exit View
            </button>
          </div>
        </header>

        {/* Full Screen Google Maps Iframe */}
        <div className="flex-1 relative bg-slate-100 overflow-hidden">
          <iframe
            title="Google Map"
            width="100%"
            height="100%"
            frameBorder="0"
            style={{ border: 0 }}
            src={mapUrl}
            allowFullScreen
            className="absolute inset-0"
          />

          {/* Floating UI Elements over map */}
          <div className="absolute top-6 right-6 z-[10] flex flex-col gap-3 pointer-events-none">
             <div className="bg-white/95 backdrop-blur p-5 rounded-2xl shadow-2xl border border-white w-72 pointer-events-auto">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Asset Metadata</h4>
                  <div className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-[9px] font-bold border border-blue-100">VERIFIED</div>
                </div>
                <p className="text-sm font-semibold text-slate-900 mb-1">{location.name}</p>
                <p className="text-xs text-slate-500 mb-4 leading-relaxed line-clamp-3">{location.description}</p>
                
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] font-mono border-b border-slate-100 pb-1.5">
                    <span className="text-slate-400">LATITUDE</span>
                    <span className="text-slate-900">{location.lat}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono border-b border-slate-100 pb-1.5">
                    <span className="text-slate-400">LONGITUDE</span>
                    <span className="text-slate-900">{location.lng}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Category</span>
                  <span className="text-[10px] font-bold text-blue-600">{location.category}</span>
                </div>
             </div>
          </div>

          <div className="absolute bottom-10 left-1/2 -translate-x-1/2 z-[10] bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 border border-white/10 backdrop-blur-md">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs font-bold tracking-widest uppercase">Target Synchronized with Global GPS Cluster</span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
