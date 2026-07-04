
import React, { memo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, AttributionControl, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin } from 'lucide-react';
import { POI } from '../types';
import { toBDTimeString, toBDDateOnlyString, getTimeElapsed, getEmployeeStatus } from '../utils/formatters';

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

function ChangeView({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    if (center && !isNaN(center[0]) && !isNaN(center[1])) {
      map.setView(center, Math.max(map.getZoom(), zoom));
    }
  }, [center, zoom, map]);
  return null;
}

function FitBounds({ markers }: { markers: any[] }) {
  const map = useMap();
  useEffect(() => {
    if (markers.length === 0) return;
    
    const validMarkers = markers.filter(m => {
      const lat = m.GEO_LAT || m.IN_LAT;
      const lng = m.GEO_LONG || m.IN_LONG;
      return lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng));
    });

    if (validMarkers.length === 0) return;

    const bounds = L.latLngBounds(validMarkers.map(m => [
      parseFloat(m.GEO_LAT || m.IN_LAT),
      parseFloat(m.GEO_LONG || m.IN_LONG)
    ]));

    map.flyToBounds(bounds, { 
      padding: [50, 50], 
      maxZoom: 12,
      duration: 1.5
    });
  }, [markers, map]);
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
  setPoiLoading: (v: boolean) => void;
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

export const LocationMap: React.FC<LocationMapProps> = memo(({
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
      <FitBounds markers={filteredGlobalLocations} />
      <TileLayer 
        url={mapStyle === 'hybrid' ? "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" : "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"} 
        maxZoom={22}
        maxNativeZoom={20}
      />
      <AttributionControl prefix='<a href="#" target="_blank" rel="noreferrer">mTracking V-2.0</a>' />

      {filteredGlobalLocations.map((gl, idx) => {
        const status = getEmployeeStatus(gl);
        const latStr = gl.GEO_LAT || gl.IN_LAT;
        const lngStr = gl.GEO_LONG || gl.IN_LONG;
        if (!latStr || !lngStr) return null;
        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);
        if (isNaN(lat) || isNaN(lng)) return null;

        const isSelected = selectedEmpId === gl.EMP_ID;
        const iconColor = 
          status === 'unauthorized_leave' ? '#EC4899' :
          status === 'leave' ? '#EF4444' :
          status === 'active' ? '#10b981' : 
          status === 'hibernate' ? '#f59e0b' : 
          '#EF4444';
        
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
            <Tooltip direction="top" offset={[0, -48]} opacity={0.95} permanent={false}>
              <div className="p-1.5 min-w-[180px]">
                <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight leading-tight mb-0.5">{gl.EMP_NAME}</p>
                <p className="text-[8px] font-bold text-slate-400 font-mono">ID: {gl.EMP_ID}</p>
                <div className="flex gap-2 mt-1.5 pt-1.5 border-t border-slate-100">
                  <span className="text-[7px] font-bold text-slate-500 uppercase">T: {gl.TERR_CODE || 'N/A'}</span>
                  <span className="text-[7px] font-bold text-slate-500 uppercase">A: {gl.AREA_CODE || 'N/A'}</span>
                  <span className="text-[7px] font-bold text-slate-500 uppercase">R: {gl.REGION_CODE || 'N/A'}</span>
                </div>
                <div className="flex gap-2 mt-1 pt-1 border-t border-slate-100">
                  <span className="text-[7px] font-bold text-slate-500 uppercase">
                    {gl.SERVER_TIME ? toBDDateOnlyString(gl.SERVER_TIME) : 'N/A'}
                  </span>
                  <span className="text-[7px] font-bold text-slate-500 uppercase">
                    {gl.SERVER_TIME ? toBDTimeString(gl.SERVER_TIME) : 'N/A'}
                  </span>
                </div>
                <div className="mt-1">
                  <span className="text-[7px] font-black text-blue-600 uppercase italic">
                    {gl.SERVER_TIME ? getTimeElapsed(gl.SERVER_TIME) : 'SIGNAL LOST'}
                  </span>
                </div>
              </div>
            </Tooltip>
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
});
