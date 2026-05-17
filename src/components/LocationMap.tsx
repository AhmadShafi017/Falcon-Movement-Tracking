
import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, AttributionControl, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import { POI } from '../types';
import { toBDTimeString, toBDDateOnlyString, getTimeElapsed } from '../utils/formatters';

const hospitalIcon = new L.DivIcon({
  className: 'location-marker',
  html: `
    <div class="relative group">
      <div class="w-10 h-10 bg-pink-600 rounded-full border-4 border-white shadow-2xl flex items-center justify-center text-white font-bold text-[18px] relative z-10">H</div>
      <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 shadow-lg" />
    </div>
  `,
  iconSize: [40, 48],
  iconAnchor: [20, 48],
});

const storeIcon = new L.DivIcon({
  className: 'location-marker',
  html: `
    <div class="relative group">
      <div class="w-10 h-10 bg-[#FFFFF0] rounded-full border-4 border-white shadow-2xl flex items-center justify-center text-slate-800 font-bold text-[18px] relative z-10">C</div>
      <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 shadow-lg" />
    </div>
  `,
  iconSize: [40, 48],
  iconAnchor: [20, 48],
});

const createPinIcon = (color: string, isSelected: boolean = false) => {
  const size = isSelected ? 48 : 40;
  const innerSize = isSelected ? 12 : 10;
  return new L.DivIcon({
    className: 'location-pin',
    html: `
      <div class="relative flex flex-col items-center transition-all duration-300" style="transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'}; z-index: ${isSelected ? 1000 : 1}">
        <div class="rounded-full border-4 border-white shadow-xl flex items-center justify-center text-white ring-4 transition-all ${isSelected ? 'ring-emerald-400/50' : 'ring-white/30'}" 
             style="background-color: ${color}; width: ${size}px; height: ${size}px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="${isSelected ? 20 : 16}" height="${isSelected ? 20 : 16}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <div class="rotate-45 -mt-2.5 border-r-4 border-b-4 border-white shadow-sm" 
             style="background-color: ${color}; width: ${innerSize + 4}px; height: ${innerSize + 4}px;"></div>
      </div>
    `,
    iconSize: [size, size + 12],
    iconAnchor: [size / 2, size + 12],
    popupAnchor: [0, -size - 5]
  });
};

const statusIcons = {
  active: createPinIcon('#10b981'),
  hibernate: createPinIcon('#f59e0b'),
  leave: createPinIcon('#f43f5e'),
  inactive: createPinIcon('#f43f5e')
};

const getStatus = (emp: any) => {
  if (emp.LOCATION_STATUS) {
    if (emp.LOCATION_STATUS === 'LEAVE') return 'leave';
    if (emp.LOCATION_STATUS.includes('YES')) return 'active';
    if (emp.LOCATION_STATUS.includes('NO')) return 'hibernate';
  }
  if (!emp.IN_TIME) return 'leave';
  const lastUpdate = emp.SERVER_TIME ? new Date(emp.SERVER_TIME) : null;
  const now = new Date();
  const isRecent = lastUpdate && (now.getTime() - lastUpdate.getTime() < 3600000);
  return isRecent ? 'active' : 'hibernate';
};

function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (center && !isNaN(center[0]) && !isNaN(center[1])) {
      map.setView(center, Math.max(map.getZoom(), zoom));
    }
  }, [center, zoom, map]);
  return null;
}

interface LocationMapProps {
  center: { lat: number; lng: number };
  zoom: number;
  mapStyle: 'hybrid' | 'roadmap';
  showHospitals: boolean;
  setShowHospitals: (v: boolean) => void;
  showCustomers: boolean;
  setShowCustomers: (v: boolean) => void;
  pois: any[];
  setPois: React.Dispatch<React.SetStateAction<any[]>>;
  setPoiLoading: React.Dispatch<React.SetStateAction<boolean>>;
  selDiv: string;
  selNH: string;
  selZone: string;
  selRegion: string;
  selArea: string;
  selTerr: string;
  filteredGlobalLocations: any[];
  selectedEmpId: string;
  setSelectedEmpId: (id: string) => void;
  syncHierarchy: (gl: any) => void;
  location: any;
}

export const LocationMap: React.FC<LocationMapProps> = ({
  center, zoom, mapStyle, showHospitals, setShowHospitals, showCustomers, setShowCustomers, pois, setPois, setPoiLoading,
  selDiv, selNH, selZone, selRegion, selArea, selTerr,
  filteredGlobalLocations, selectedEmpId, setSelectedEmpId, syncHierarchy,
  location
}) => {
  const mapRef = useRef<L.Map | null>(null);

  return (
    <MapContainer 
      center={[center.lat, center.lng]} 
      zoom={zoom} 
      maxZoom={22} 
      zoomControl={false} 
      attributionControl={false} 
      className="w-full h-full"
      ref={mapRef}
    >
      <ChangeView center={[center.lat, center.lng]} zoom={zoom} />
      <TileLayer 
        url={mapStyle === 'hybrid' ? "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" : "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"} 
        maxZoom={22}
        maxNativeZoom={20}
      />
      <AttributionControl prefix='<a href="#" target="_blank" rel="noreferrer">SIGNAL TRACKER</a>' />

      {filteredGlobalLocations.map((gl, idx) => {
        const status = getStatus(gl);
        const latStr = gl.GEO_LAT || gl.IN_LAT;
        const lngStr = gl.GEO_LONG || gl.IN_LONG;
        if (!latStr || !lngStr) return null;
        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);
        if (isNaN(lat) || isNaN(lng)) return null;

        const isSelected = selectedEmpId === gl.EMP_ID;
        const iconColor = 
          status === 'active' ? '#10b981' : 
          status === 'hibernate' ? '#f59e0b' : 
          '#f43f5e';
        
        const iconToUse = createPinIcon(iconColor, isSelected);

        return (
          <Marker 
            key={`loc-marker-${gl.EMP_ID}-${idx}`} 
            position={[lat, lng]} 
            icon={iconToUse} 
            zIndexOffset={isSelected ? 1000 : 0}
            eventHandlers={{ 
              click: (e) => { 
                setSelectedEmpId(gl.EMP_ID); 
                e.target.openPopup();
              } 
            }}
          >
            <Popup className="custom-popup">
              <div className="p-4 min-w-[280px] space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div className={`w-3.5 h-3.5 rounded-full ring-4 ${
                    status === 'active' ? 'bg-emerald-500 ring-emerald-100' : 
                    status === 'hibernate' ? 'bg-amber-500 ring-amber-100' : 
                    status === 'leave' ? 'bg-rose-500 ring-rose-100' :
                    'bg-slate-300 ring-slate-100'
                  }`} />
                  <div>
                    <p className="text-[14px] font-black text-slate-800 uppercase tracking-tight leading-none mb-1">{gl.EMP_NAME}</p>
                    <p className="text-[10px] font-bold text-slate-400 font-mono italic tracking-wider">ID: {gl.EMP_ID}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[8px] font-extrabold text-slate-400 uppercase tracking-[0.15em]">Last Update Date</p>
                    <p className="text-[11px] font-bold text-slate-700">{gl.SERVER_TIME ? toBDDateOnlyString(gl.SERVER_TIME) : 'N/A'}</p>
                  </div>
                  <div className="space-y-1 text-right">
                    <p className="text-[8px] font-extrabold text-slate-400 uppercase tracking-[0.15em]">Last Update Time</p>
                    <p className="text-[11px] font-bold text-slate-700">{gl.SERVER_TIME ? toBDTimeString(gl.SERVER_TIME) : 'N/A'}</p>
                  </div>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-[8px] font-extrabold text-slate-400 uppercase tracking-[0.15em] mb-1">Time Elapsed</p>
                  <p className="text-[11px] font-black text-blue-600 uppercase italic">
                    {gl.SERVER_TIME ? getTimeElapsed(gl.SERVER_TIME) : 'SIGNAL LOST'}
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  <div className="border-l-2 border-slate-200 pl-3 py-0.5">
                    <p className="text-[8px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-0.5">Territory</p>
                    <p className="text-[10px] font-bold text-slate-700">{gl.TERR_NAME} ({gl.TERR_CODE})</p>
                  </div>
                  <div className="border-l-2 border-slate-200 pl-3 py-0.5">
                    <p className="text-[8px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-0.5">Area</p>
                    <p className="text-[10px] font-bold text-slate-700">{gl.AREA_NAME} ({gl.AREA_CODE})</p>
                  </div>
                  <div className="border-l-2 border-slate-200 pl-3 py-0.5">
                    <p className="text-[8px] font-extrabold text-slate-400 uppercase tracking-[0.2em] mb-0.5">Region</p>
                    <p className="text-[10px] font-bold text-slate-700">{gl.REGION_NAME} ({gl.REGION_CODE})</p>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedEmpId(gl.EMP_ID)} 
                  className="w-full py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black hover:bg-emerald-600 transition-all uppercase tracking-[0.2em] shadow-lg shadow-slate-100 active:scale-95"
                >
                  SATELLITE FOCUS
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {showHospitals && pois.filter(p => p.TYPE === 'HOSPITAL').map(p => (
        <Marker key={`hosp-${p.ID}`} position={[p.LAT, p.LNG]} icon={hospitalIcon}>
           <Popup>
             <div className="p-2">
               <p className="text-xs font-bold text-pink-700">{p.NAME}</p>
               <p className="text-[10px] text-slate-500">{p.ADDRESS}</p>
             </div>
           </Popup>
        </Marker>
      ))}

      {showCustomers && pois.filter(p => p.TYPE === 'CUSTOMER').map(p => (
        <Marker key={`cust-${p.ID}`} position={[p.LAT, p.LNG]} icon={storeIcon}>
           <Popup>
             <div className="p-2">
               <p className="text-xs font-bold text-amber-700">{p.NAME}</p>
               <p className="text-[10px] text-slate-500">{p.ADDRESS}</p>
             </div>
           </Popup>
        </Marker>
      ))}

      <div className="absolute bottom-10 right-10 z-[1000] bg-white/95 backdrop-blur-xl p-5 rounded-[2.5rem] border border-slate-100 shadow-2xl space-y-4 min-w-[240px]">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Signal Constellation</p>
          <div className="flex gap-1">
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-lg shadow-emerald-200" />
            <span className="text-[11px] font-bold text-slate-700 uppercase">Online (Recent)</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-4 h-4 rounded-full bg-amber-500 shadow-lg shadow-amber-200" />
            <span className="text-[11px] font-bold text-slate-700 uppercase">Idle (Hibernate)</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-4 h-4 rounded-full bg-rose-500 shadow-lg shadow-rose-200" />
            <span className="text-[11px] font-bold text-slate-700 uppercase">On Leave / Offline</span>
          </div>
        </div>
      </div>
    </MapContainer>
  );
};
