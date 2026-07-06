
import React, { memo, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, AttributionControl, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-polylinedecorator';
import { Hospital, Store, MapPin } from 'lucide-react';
import { POI, MovementPoint } from '../types';
import { toBDTimeString, toBDDateOnlyString, getTimeElapsed, getEmployeeStatus } from '../utils/formatters';

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
  html: '<div class="w-4 h-4 bg-yellow-400 rounded-full border-2 border-white shadow-lg flex items-center justify-center"><div class="w-1.5 h-1.5 bg-white rounded-full"></div></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8]
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

const createPinIcon = (color: string, isSelected: boolean = false) => {
  const size = isSelected ? 40 : 32;
  const innerSize = isSelected ? 12 : 10;
  return new L.DivIcon({
    className: 'custom-pin',
    html: `
      <div class="relative flex flex-col items-center transition-all duration-300" style="transform: ${isSelected ? 'scale(1.2)' : 'scale(1)'}; z-index: ${isSelected ? 1000 : 1}">
        <div class="rounded-full border-4 border-white shadow-xl flex items-center justify-center text-white ring-2 ${isSelected ? 'ring-blue-400' : 'ring-white/50'}" 
             style="background-color: ${color}; width: ${size}px; height: ${size}px;">
          <svg xmlns="http://www.w3.org/2000/svg" width="${isSelected ? 18 : 14}" height="${isSelected ? 18 : 14}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <div class="rotate-45 -mt-2 border-r-4 border-b-4 border-white shadow-sm" 
             style="background-color: ${color}; width: ${innerSize + 2}px; height: ${innerSize + 2}px;"></div>
      </div>
    `,
    iconSize: [size, size + 10],
    iconAnchor: [size / 2, size + 10],
    popupAnchor: [0, -size - 2]
  });
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
  setPoiLoading: (v: boolean) => void;
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
  showSubordinates: boolean;
  setShowSubordinates: (v: boolean) => void;
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
  currentPage: 'MOVEMENT' | 'LOCATION' | 'REPORT';
  selectedEmpId: string;
  setSelectedEmpId: (id: string) => void;
  syncHierarchy: (gl: any) => void;
  location: any;
  activePoint: MovementPoint | null;
  groupedPathCoordinates: [number, number][][];
  addressCache: Record<string, string>;
  handlePointSelect: (p: MovementPoint) => void;
}

export const MainMap: React.FC<MainMapProps> = /*#__PURE__*/ memo(({
  center, zoom, mapStyle, showHospitals, setShowHospitals, showCustomers, setShowCustomers, showSubordinates, setShowSubordinates, pois, setPois, setPoiLoading,
  selDiv, selNH, selZone, selRegion, selArea, selTerr,
  filteredGlobalLocations, currentPage, selectedEmpId, setSelectedEmpId, syncHierarchy,
  location, activePoint, groupedPathCoordinates, addressCache, handlePointSelect
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
        
        // Restore Logic: In MOVEMENT mode, we hide the base marker if the telemetry focus/history is shown for the selected user
        if (currentPage === 'MOVEMENT' && isSelected && location?.history?.length > 0) return null;
        
        const iconColor = status === 'unauthorized_leave' ? '#EC4899' : (
          status === 'leave' ? '#EF4444' : (
            currentPage === 'MOVEMENT' ? '#2563eb' : (
              status === 'active' ? '#10b981' : 
              status === 'hibernate' ? '#f59e0b' : 
              '#EF4444'
            )
          )
        );

        const iconToUse = createPinIcon(iconColor, isSelected);

        return (
          <Marker 
            key={`global-${gl.EMP_ID}-${idx}`} 
            position={[lat, lng]} 
            icon={iconToUse} 
            zIndexOffset={isSelected ? 1000 : 0}
            eventHandlers={{ 
              click: (e) => { 
                setSelectedEmpId(gl.EMP_ID); 
                // Restore Logic: Only sync hierarchy (filter) if in MOVEMENT mode
                if (currentPage === 'MOVEMENT') {
                  syncHierarchy(gl);
                }
                e.target.openPopup();
              } 
            }}
          >
            <Popup className="custom-popup">
              <div className="p-4 min-w-[280px] space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                  <div className={`w-3.5 h-3.5 rounded-full ring-4 ${
                    status === 'unauthorized_leave' ? 'bg-pink-500 ring-pink-100' :
                    status === 'active' ? 'bg-emerald-500 ring-emerald-100' : 
                    status === 'hibernate' ? 'bg-amber-500 ring-amber-100' : 
                    status === 'leave' ? 'bg-red-500 ring-red-100' :
                    'bg-slate-300 ring-slate-100'
                  }`} />
                  <div>
                    <p className="text-[14px] font-black text-slate-800 uppercase tracking-tight leading-none mb-1">{gl.EMP_NAME}</p>
                    <p className="text-[10px] font-bold text-slate-400 font-mono italic tracking-wider">ID: {gl.EMP_ID}</p>
                  </div>
                </div>

                {status === 'unauthorized_leave' && (
                  <div className="bg-pink-50 border border-pink-100 text-pink-700 p-2.5 text-[10px] font-bold rounded-lg leading-relaxed">
                    dYs" STATUS: UNAUTHORIZED LEAVE<br/>
                    <span className="font-medium text-pink-600">Location pulled from last known historical position.</span>
                  </div>
                )}

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
                  VIEW DATA
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

      {activePoint && !isNaN(activePoint.lat) && !isNaN(activePoint.lng) && (() => {
        const actDateStr = new Date(activePoint.time).toISOString().split('T')[0];
        const actDayPoints = location?.history?.filter((h: any) => new Date(h.time).toISOString().split('T')[0] === actDateStr).sort((a: any, b: any) => new Date(a.time).getTime() - new Date(b.time).getTime()) || [];
        const isStart = activePoint.time === actDayPoints[0]?.time;
        const isEnd = activePoint.time === actDayPoints[actDayPoints.length - 1]?.time;
        const actTitle = isStart ? 'Start Point' : isEnd ? 'End Point' : 'Stopage';
        const actAddress = addressCache[`${activePoint.lat}-${activePoint.lng}`] || 'Resolving address...';
        return (
          <Marker position={[activePoint.lat, activePoint.lng]} icon={new L.DivIcon({ className: 'focal-point', html: '<div class="relative flex items-center justify-center"><div class="absolute w-20 h-20 bg-blue-400/20 rounded-full animate-ping"></div><div class="absolute w-12 h-12 bg-blue-500/30 rounded-full animate-pulse border-2 border-white"></div><div class="w-5 h-5 bg-blue-600 rounded-full border-4 border-white shadow-2xl"></div></div>', iconSize: [80, 80], iconAnchor: [40, 40] })} zIndexOffset={1000}>
            <Popup autoPan={true}>
              <div className="p-2 min-w-[200px]">
                <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-2">{actTitle}</p>
                <p className="text-[10px] font-bold text-slate-600 leading-relaxed">{actAddress}</p>
              </div>
            </Popup>
          </Marker>
        );
      })()}

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
        const address = addressCache[`${p.lat}-${p.lng}`] || 'Resolving address...';
        const title = isStartOfDay ? 'Start Point' : isEndOfDay ? 'End Point' : 'Stopage';
        return (
          <Marker 
            key={`map-node-${i}-${p.time}`} 
            position={[p.lat, p.lng]} 
            icon={iconToUse}
            eventHandlers={{ 
              click: () => { 
                handlePointSelect(p); 
              } 
            }}
          >
            <Popup>
              <div className="p-2 min-w-[200px]">
                <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-2">{title}</p>
                <p className="text-[10px] font-bold text-slate-600 leading-relaxed">{address}</p>
              </div>
            </Popup>
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
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 bg-blue-100 border border-blue-300 rounded-lg flex items-center justify-center text-[9px] text-blue-700 font-bold">S</div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Subordinates</span>
          </div>
          <button 
            onClick={() => setShowSubordinates(!showSubordinates)}
            className={`w-8 h-4 rounded-full relative transition-colors ${showSubordinates ? 'bg-blue-600' : 'bg-slate-200'}`}
          >
            <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${showSubordinates ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
          </button>
        </div>
      </div>
    </MapContainer>
  );
});
