
import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, AttributionControl, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-polylinedecorator';
import { Hospital, Store, MapPin } from 'lucide-react';
import { POI, MovementPoint } from '../types';
import { toBDTimeString, toBDDateTimeString } from '../utils/formatters';

// Add polyline decorator type for TypeScript
declare module 'leaflet' {
  export class PolylineDecorator extends L.Layer {
    constructor(polyline: L.Polyline | L.LatLng[], options: any);
  }
  export function polylineDecorator(polyline: L.Polyline | L.LatLng[], options: any): PolylineDecorator;
}

const startIcon = new L.DivIcon({
  className: 'custom-marker',
  html: '<div class="w-8 h-8 bg-green-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center"><div class="w-2 h-2 bg-white rounded-full"></div></div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const endIcon = new L.DivIcon({
  className: 'custom-marker',
  html: '<div class="w-8 h-8 bg-red-600 rounded-full border-4 border-white shadow-lg flex items-center justify-center"><div class="w-2 h-2 bg-white rounded-full"></div></div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const intermediateIcon = new L.DivIcon({
  className: 'custom-marker',
  html: '<div class="w-5 h-5 bg-yellow-400 rounded-full border-2 border-white shadow-md"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const hospitalIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `
    <div class="relative group">
      <div class="w-10 h-10 bg-pink-600 rounded-full border-4 border-white shadow-2xl flex items-center justify-center text-white font-bold text-[18px] relative z-10">
        H
      </div>
      <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 shadow-lg" />
      <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-pink-600 rotate-45 z-10" />
    </div>
  `,
  iconSize: [40, 48],
  iconAnchor: [20, 48],
  popupAnchor: [0, -48]
});

const storeIcon = new L.DivIcon({
  className: 'custom-marker',
  html: `
    <div class="relative group">
      <div class="w-10 h-10 bg-[#FFFFF0] rounded-full border-4 border-white shadow-2xl flex items-center justify-center text-slate-800 font-bold text-[18px] relative z-10">
        C
      </div>
      <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 shadow-lg" />
      <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-[#FFFFF0] rotate-45 z-10" />
    </div>
  `,
  iconSize: [40, 48],
  iconAnchor: [20, 48],
  popupAnchor: [0, -48]
});

const createPinIcon = (color: string) => new L.DivIcon({
  className: 'custom-pin',
  html: `
    <div class="relative flex flex-col items-center">
      <div class="w-8 h-8 rounded-full border-4 border-white shadow-xl flex items-center justify-center text-white ring-2 ring-white/50" style="background-color: ${color}">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
      </div>
      <div class="w-3 h-3 rotate-45 -mt-2 border-r-4 border-b-4 border-white shadow-sm" style="background-color: ${color}"></div>
    </div>
  `,
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -40]
});

const statusIcons = {
  active: createPinIcon('#10b981'),
  hibernate: createPinIcon('#f59e0b'),
  inactive: createPinIcon('#f43f5e'),
  movement: createPinIcon('#2563eb')
};

const getStatus = (emp: any) => {
  if (!emp.IN_TIME) return 'inactive';
  const lastUpdate = emp.SERVER_TIME ? new Date(emp.SERVER_TIME) : null;
  const now = new Date();
  const isRecent = lastUpdate && (now.getTime() - lastUpdate.getTime() < 3600000);
  return isRecent ? 'active' : 'hibernate';
};

const MapDecorations: React.FC<{ path: [number, number][] }> = ({ path }) => {
  const map = useMap();
  useEffect(() => {
    if (path.length < 2) return;
    const polyline = L.polyline(path);
    const decorator = L.polylineDecorator(polyline, {
      patterns: [
        { offset: '15%', repeat: '20%', symbol: (L as any).Symbol.arrowHead({ pixelSize: 14, polygon: true, pathOptions: { stroke: false, fill: true, color: '#FFFFFF', fillOpacity: 1, weight: 1 } }) },
        { offset: '15%', repeat: '20%', symbol: (L as any).Symbol.arrowHead({ pixelSize: 14, polygon: false, pathOptions: { stroke: true, color: '#000000', weight: 2, opacity: 0.5 } }) }
      ]
    });
    decorator.addTo(map);
    return () => { map.removeLayer(decorator); };
  }, [map, path]);
  return null;
}

function ChangeView({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    if (center && !isNaN(center[0]) && !isNaN(center[1])) {
      map.setView(center, map.getZoom());
    }
  }, [center, map]);
  return null;
}

interface ViewportPOIHandlerProps {
  showHospitals: boolean;
  showCustomers: boolean;
  pois: any[];
  setPois: React.Dispatch<React.SetStateAction<any[]>>;
  setPoiLoading: React.Dispatch<React.SetStateAction<boolean>>;
  selDiv: string;
  selNH: string;
  selZone: string;
  selRegion: string;
  selArea: string;
  selTerr: string;
}

const ViewportPOIHandler: React.FC<ViewportPOIHandlerProps> = ({ 
  showHospitals, showCustomers, pois, setPois, setPoiLoading,
  selDiv, selNH, selZone, selRegion, selArea, selTerr
}) => {
  const map = useMap();
  const fetchTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchedBounds = useRef<string>('');

  const fetchInView = () => {
    if (!showHospitals && !showCustomers) {
      if (pois.length > 0) setPois([]);
      return;
    }
    const zoom = map.getZoom();
    if (zoom < 11) {
      if (pois.length > 0) setPois([]);
      return;
    }
    const bounds = map.getBounds();
    if (!bounds) return;
    const sw = bounds.getSouthWest();
    const ne = bounds.getNorthEast();
    const boundsKey = `${sw.lat.toFixed(3)},${sw.lng.toFixed(3)},${ne.lat.toFixed(3)},${ne.lng.toFixed(3)}-${selDiv}-${selNH}-${selZone}-${selRegion}-${selArea}-${selTerr}`;
    if (boundsKey === lastFetchedBounds.current) return;
    lastFetchedBounds.current = boundsKey;
    const latBuffer = (ne.lat - sw.lat) * 0.1;
    const lngBuffer = (ne.lng - sw.lng) * 0.1;
    const params = new URLSearchParams({
      minLat: (sw.lat - latBuffer).toString(), maxLat: (ne.lat + latBuffer).toString(),
      minLng: (sw.lng - lngBuffer).toString(), maxLng: (ne.lng + lngBuffer).toString(),
      selDiv, selNH, selZone, selRegion, selArea, selTerr
    });
    setPoiLoading(true);
    fetch(`/api/poi?${params.toString()}`).then(res => res.json()).then(data => setPois(data)).catch(console.error).finally(() => setPoiLoading(false));
  };

  useEffect(() => {
    const onMoveEnd = () => {
      if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current);
      fetchTimerRef.current = setTimeout(fetchInView, 500);
    };
    map.on('moveend', onMoveEnd);
    fetchInView();
    return () => { map.off('moveend', onMoveEnd); if (fetchTimerRef.current) clearTimeout(fetchTimerRef.current); };
  }, [map, showHospitals, showCustomers, selDiv, selNH, selZone, selRegion, selArea, selTerr]);
  return null;
};

interface MainMapProps {
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
  currentPage: 'MOVEMENT' | 'LOCATION' | 'REPORT';
  selectedEmpId: string;
  setSelectedEmpId: (id: string) => void;
  syncHierarchy: (gl: any) => void;
  location: any;
  activePoint: MovementPoint | null;
  groupedPathCoordinates: [number, number][][];
}

export const MainMap: React.FC<MainMapProps> = ({
  center, zoom, mapStyle, showHospitals, setShowHospitals, showCustomers, setShowCustomers, pois, setPois, setPoiLoading,
  selDiv, selNH, selZone, selRegion, selArea, selTerr,
  filteredGlobalLocations, currentPage, selectedEmpId, setSelectedEmpId, syncHierarchy,
  location, activePoint, groupedPathCoordinates
}) => {
  return (
    <MapContainer center={[center.lat, center.lng]} zoom={zoom} maxZoom={22} zoomControl={false} attributionControl={false} className="w-full h-full">
      <ViewportPOIHandler 
        showHospitals={showHospitals} showCustomers={showCustomers} pois={pois} setPois={setPois} setPoiLoading={setPoiLoading} 
        selDiv={selDiv} selNH={selNH} selZone={selZone} selRegion={selRegion} selArea={selArea} selTerr={selTerr}
      />
      <ChangeView center={[center.lat, center.lng]} />
      <TileLayer 
        url={mapStyle === 'hybrid' ? "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" : "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"} 
        maxZoom={22}
        maxNativeZoom={20}
      />
      <AttributionControl prefix='<a href="https://www.linkedin.com/in/ahmadshafi016" target="_blank" rel="noreferrer">ARIF</a>' />

      {filteredGlobalLocations.map((gl, idx) => {
        const status = getStatus(gl);
        const latStr = gl.GEO_LAT || gl.IN_LAT;
        const lngStr = gl.GEO_LONG || gl.IN_LONG;
        if (!latStr || !lngStr) return null;
        const lat = parseFloat(latStr);
        const lng = parseFloat(lngStr);
        if (isNaN(lat) || isNaN(lng)) return null;
        if (currentPage === 'MOVEMENT' && selectedEmpId === gl.EMP_ID && location?.history?.length > 0) return null;
        const iconToUse = currentPage === 'MOVEMENT' ? statusIcons.movement : statusIcons[status as keyof typeof statusIcons];

        return (
          <Marker key={`global-${gl.EMP_ID}-${idx}`} position={[lat, lng]} icon={iconToUse} eventHandlers={{ click: () => { setSelectedEmpId(gl.EMP_ID); syncHierarchy(gl); } }}>
            <Popup className="custom-popup">
              <div className="p-3 min-w-[200px]">
                <div className="flex items-center gap-3 mb-3 border-b border-slate-100 pb-2">
                  <div className={`w-3 h-3 rounded-full ${status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : status === 'hibernate' ? 'bg-amber-500' : 'bg-rose-500'}`} />
                  <div>
                    <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight leading-none mb-1">{gl.EMP_NAME}</p>
                    <p className="text-[9px] font-bold text-slate-400 font-mono italic">{gl.EMP_ID}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedEmpId(gl.EMP_ID)} className="w-full mt-2 py-2 bg-slate-900 text-white rounded-lg text-[10px] font-bold hover:bg-blue-600 transition-colors uppercase tracking-widest">
                  View Data
                </button>
              </div>
            </Popup>
          </Marker>
        );
      })}

      {pois.filter(p => (p.TYPE === 'HOSPITAL' && showHospitals) || (p.TYPE === 'CUSTOMER' && showCustomers)).map((poi, idx) => {
        const lat = parseFloat(poi.LAT);
        const lng = parseFloat(poi.LNG);
        if (isNaN(lat) || isNaN(lng)) return null;
        return (
          <Marker key={`poi-${poi.ID}-${idx}`} position={[lat, lng]} icon={poi.TYPE === 'HOSPITAL' ? hospitalIcon : storeIcon}>
            <Tooltip direction="top" offset={[0, -48]} opacity={0.9}>{poi.NAME}</Tooltip>
          </Marker>
        );
      })}

      {activePoint && !isNaN(activePoint.lat) && !isNaN(activePoint.lng) && (
        <Marker position={[activePoint.lat, activePoint.lng]} icon={new L.DivIcon({ className: 'focal-point', html: '<div class="relative flex items-center justify-center"><div class="absolute w-20 h-20 bg-blue-400/20 rounded-full animate-ping"></div><div class="absolute w-12 h-12 bg-blue-500/30 rounded-full animate-pulse border-2 border-white"></div><div class="w-5 h-5 bg-blue-600 rounded-full border-4 border-white shadow-2xl"></div></div>', iconSize: [80, 80], iconAnchor: [40, 40] })} zIndexOffset={1000}>
          <Popup autoPan={true}><div className="p-1 font-sans text-center font-bold text-blue-600 uppercase text-[11px] tracking-[0.2em]">Telemetry Focus</div></Popup>
        </Marker>
      )}

      {groupedPathCoordinates.map((path, idx) => {
        const colors = ['#8B5CF6', '#06B6D4', '#EC4899', '#6366F1', '#F97316'];
        return (
          <React.Fragment key={`path-group-${idx}`}>
            <Polyline positions={path} pathOptions={{ color: colors[idx % colors.length], weight: 4, opacity: 0.9, lineCap: 'round', lineJoin: 'round' }} />
            <MapDecorations path={path} />
          </React.Fragment>
        );
      })}

      {location?.history?.map((p: any, i: number) => {
        if (!p.lat || !p.lng || isNaN(p.lat) || isNaN(p.lng)) return null;
        const pDateStr = new Date(p.time).toISOString().split('T')[0];
        const dayPoints = location.history?.filter((h: any) => new Date(h.time).toISOString().split('T')[0] === pDateStr).sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime()) || [];
        const isStartOfDay = p.time === dayPoints[0]?.time;
        const isEndOfDay = p.time === dayPoints[dayPoints.length - 1]?.time;
        const iconToUse = isStartOfDay ? startIcon : isEndOfDay ? endIcon : intermediateIcon;
        return (
          <Marker key={`map-node-${i}-${p.time}`} position={[p.lat, p.lng]} icon={iconToUse}>
            <Popup><div className="text-[10px] p-1 font-sans font-bold uppercase tracking-widest">{isStartOfDay ? 'Startup' : isEndOfDay ? 'Terminal' : 'Stopage'}</div></Popup>
          </Marker>
        );
      })}

      <div className="absolute bottom-6 right-6 z-[1000] bg-white/90 backdrop-blur-md p-4 rounded-[2rem] border border-slate-200 shadow-2xl space-y-3 min-w-[220px]">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Fleet Status</p>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full shadow-sm ${currentPage === 'LOCATION' ? 'bg-[#10b981]' : 'bg-[#2563eb]'}`} />
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">Personnel in Field</span>
        </div>
        <hr className="border-slate-100 my-2" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-pink-600 rounded-lg flex items-center justify-center text-[10px] text-white font-bold">H</div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Hospital</span>
          </div>
          <button 
            onClick={() => setShowHospitals(!showHospitals)}
            className={`w-8 h-4 rounded-full relative transition-colors ${showHospitals ? 'bg-pink-600' : 'bg-slate-200'}`}
          >
            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${showHospitals ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-[#FFFFF0] border rounded-lg flex items-center justify-center text-[10px] text-slate-800 font-bold">C</div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Customer</span>
          </div>
          <button 
            onClick={() => setShowCustomers(!showCustomers)}
            className={`w-8 h-4 rounded-full relative transition-colors ${showCustomers ? 'bg-slate-800' : 'bg-slate-200'}`}
          >
            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${showCustomers ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>
    </MapContainer>
  );
};
