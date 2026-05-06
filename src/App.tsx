import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapPin, Loader2, ExternalLink, Globe, Layers, X, History, TrendingUp, Navigation2, Calendar, ChevronRight, Search, User, Briefcase, Users, LayoutGrid, Map as MapIcon, ChevronDown, Filter } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, AttributionControl } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-polylinedecorator';

// Add polyline decorator type for TypeScript
declare module 'leaflet' {
  export class PolylineDecorator extends L.Layer {
    constructor(polyline: L.Polyline | L.LatLng[], options: any);
  }
  export function polylineDecorator(polyline: L.Polyline | L.LatLng[], options: any): PolylineDecorator;
}

// Marker definitions with specific colors as requested
const startIcon = new L.DivIcon({
  className: 'custom-marker',
  html: '<div class="w-8 h-8 bg-green-500 rounded-full border-4 border-white shadow-lg flex items-center justify-center"><div class="w-2 h-2 bg-white rounded-full"></div></div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const endIcon = new L.DivIcon({
  className: 'custom-marker',
  html: '<div class="w-8 h-8 bg-red-600 rounded-full border-4 border-white shadow-lg flex items-center justify-center animate-pulse"><div class="w-2 h-2 bg-white rounded-full"></div></div>',
  iconSize: [32, 32],
  iconAnchor: [16, 16]
});

const intermediateIcon = new L.DivIcon({
  className: 'custom-marker',
  html: '<div class="w-5 h-5 bg-yellow-400 rounded-full border-2 border-white shadow-md"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
});

const breadcrumbIcon = new L.DivIcon({
  className: 'breadcrumb-marker',
  html: '<div class="w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white shadow-sm"></div>',
  iconSize: [10, 10],
  iconAnchor: [5, 5]
});

// Component to handle map decorations (arrows)
const MapDecorations: React.FC<{ path: [number, number][] }> = ({ path }) => {
  const map = useMap();

  useEffect(() => {
    if (path.length < 2) return;

    const polyline = L.polyline(path);
    const decorator = L.polylineDecorator(polyline, {
      patterns: [
        {
          offset: '15%',
          repeat: '20%',
          symbol: (L as any).Symbol.arrowHead({
            pixelSize: 14,
            polygon: true,
            pathOptions: { stroke: false, fill: true, color: '#FFFFFF', fillOpacity: 1, weight: 1 }
          })
        },
        {
          offset: '15%',
          repeat: '20%',
          symbol: (L as any).Symbol.arrowHead({
            pixelSize: 14,
            polygon: false,
            pathOptions: { stroke: true, color: '#000000', weight: 2, opacity: 0.5 }
          })
        }
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
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

interface MovementPoint {
  lat: number;
  lng: number;
  time: string;
  remarks?: string;
  address?: string;
}

interface Employee {
  EMP_ID: string;
  EMP_NAME: string;
  EMP_LEVEL: string;
  DIV_CODE: string;
}

interface LocationData {
  id: string;
  name: string;
  level: string;
  div: string;
  territory?: string;
  area?: string;
  manager?: string;
  history?: MovementPoint[];
  current?: MovementPoint;
  start?: MovementPoint;
  lat: number;
  lng: number;
  startDate?: string;
  endDate?: string;
}

const getDesignation = (level: string) => {
  const levels: Record<string, string> = {
    '6': 'MPO',
    '5': 'AM',
    '4': 'RM',
    '3': 'ZH',
    '2': 'NSM',
    '7': 'SR'
  };
  return levels[level] || `Level ${level}`;
};

const getTeam = (div: string) => {
  const divs: Record<string, string> = {
    '10': 'General',
    '20': 'Aspire',
    '30': 'Oncology',
    '50': 'Derma',
    '60': "Women's Care"
  };
  return divs[div] || div;
};

export default function App() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePoint, setActivePoint] = useState<MovementPoint | null>(null);
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedEmpId, setSelectedEmpId] = useState<string>('09747');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [showEmpList, setShowEmpList] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [mapStyle, setMapStyle] = useState<'hybrid' | 'roadmap'>('hybrid');
  const [addressCache, setAddressCache] = useState<Record<string, string>>({});

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/api/employees')
      .then(res => res.json())
      .then(data => setEmployees(data))
      .catch(err => console.error('Failed to load employees', err));
  }, []);

  const fetchAddress = async (lat: number, lng: number, pointKey: string) => {
    if (addressCache[pointKey]) return;
    
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
      const data = await response.json();
      const address = data.display_name || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      setAddressCache(prev => ({ ...prev, [pointKey]: address }));
    } catch (err) {
      console.error('Failed to geocode', err);
    }
  };

  useEffect(() => {
    if (activePoint && !addressCache[`${activePoint.lat}-${activePoint.lng}`]) {
      fetchAddress(activePoint.lat, activePoint.lng, `${activePoint.lat}-${activePoint.lng}`);
    }
  }, [activePoint]);

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        setLoading(true);
        setError(null);
        
        let url = `/api/movement?empId=${selectedEmpId}`;
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;

        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
          if (data.employee) {
            // Return dummy location but with error to show sidebar details
            setLocation({
              ...data.employee,
              id: data.employee.id,
              name: data.employee.name,
              lat: 23.8103, // Default center
              lng: 90.4125,
              history: []
            });
          }
          throw new Error(data.error || 'Failed to sync with tracking server');
        }
        
        if (data.current) {
          data.lat = data.current.lat;
          data.lng = data.current.lng;
          setActivePoint(data.current);
          if (!startDate && data.startDate) setStartDate(data.startDate);
          if (!endDate && data.endDate) setEndDate(data.endDate);
        }
        
        setLocation(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLocation();
  }, [selectedEmpId]);

  const handleManualSearch = () => {
    const fetchWithRange = async () => {
      try {
        setLoading(true);
        setError(null);
        let url = `/api/movement?empId=${selectedEmpId}`;
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
        const res = await fetch(url);
        const data = await res.json();
        
        if (!res.ok) {
          if (data.employee) {
            setLocation(prev => prev ? { ...prev, history: [] } : null);
          }
          throw new Error(data.error);
        }
        
        if (data.current) {
          data.lat = data.current.lat;
          data.lng = data.current.lng;
        }
        
        setLocation(data);
        if (data.current) setActivePoint(data.current);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchWithRange();
  };

  const handlePointSelect = (point: MovementPoint) => {
    setActivePoint(point);
    if (location) {
      setLocation({ ...location, lat: point.lat, lng: point.lng });
    }
  };

  const groupedPathCoordinates = useMemo(() => {
    if (!location?.history) return [];
    
    // Group history by date (YYYY-MM-DD)
    const groups: Record<string, [number, number][]> = {};
    
    // Sort history by time to ensure path continuity
    const sortedHistory = [...location.history].sort((a, b) => 
      new Date(a.time).getTime() - new Date(b.time).getTime()
    );

    sortedHistory.forEach(p => {
      const dateKey = new Date(p.time).toISOString().split('T')[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push([p.lat, p.lng]);
    });

    return Object.values(groups);
  }, [location?.history]);

  const allCoordinates = useMemo(() => {
    return groupedPathCoordinates.flat();
  }, [groupedPathCoordinates]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => 
      e.EMP_NAME.toLowerCase().includes(searchQuery.toLowerCase()) || 
      e.EMP_ID.includes(searchQuery)
    ).slice(0, 50);
  }, [employees, searchQuery]);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-white text-slate-900 font-sans">
      {/* Top Navigation */}
      <header className="h-20 px-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/90 backdrop-blur-xl z-[1000]">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <MapIcon size={20} />
             </div>
             <div>
                <h1 className="text-lg font-bold tracking-tight">Movement Tracking</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Employee Registry</p>
             </div>
          </div>

          <div className="h-10 w-px bg-slate-100 mx-2" />

          {/* Employee Selector */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setShowEmpList(!showEmpList)}
              className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all group"
            >
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <User size={16} />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Target Asset</p>
                <p className="text-sm font-bold text-slate-700 leading-none">{location?.name || 'Select Employee'}</p>
              </div>
              <ChevronDown size={14} className={`text-slate-400 transition-transform ${showEmpList ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {showEmpList && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute top-full mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 z-[2000] overflow-hidden"
                >
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="Search name or ID..." 
                      className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border-none text-sm rounded-xl focus:ring-2 focus:ring-blue-100 outline-none"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto custom-scrollbar">
                    {filteredEmployees.map((emp, idx) => (
                      <button
                        key={`${emp.EMP_ID}-${idx}`}
                        onClick={() => {
                          setSelectedEmpId(emp.EMP_ID);
                          setShowEmpList(false);
                          setSearchQuery('');
                        }}
                        className={`w-full text-left p-3 rounded-xl transition-all flex items-center gap-3 ${
                          selectedEmpId === emp.EMP_ID ? 'bg-blue-50 text-blue-700' : 'hover:bg-slate-50'
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          selectedEmpId === emp.EMP_ID ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {emp.EMP_NAME.charAt(0)}
                        </div>
                        <div>
                          <p className="text-xs font-bold">{emp.EMP_NAME}</p>
                          <p className="text-[10px] font-mono opacity-60">{emp.EMP_ID}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-2xl">
            <Calendar size={14} className="text-blue-600 ml-2" />
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none text-[11px] font-bold text-slate-600 outline-none cursor-pointer"
              />
              <ChevronRight size={12} className="text-slate-300" />
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none text-[11px] font-bold text-slate-600 outline-none cursor-pointer"
              />
            </div>
            <button 
              onClick={handleManualSearch}
              className="px-4 py-1.5 bg-blue-600 text-white text-[11px] font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 ml-2"
            >
              <Filter size={12} />
              Filter
            </button>
          </div>

          <a 
            href={location ? `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}` : '#'}
            onClick={(e) => !location && e.preventDefault()}
            target="_blank" 
            rel="noreferrer"
            className={`flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-bold transition-all shadow-lg hover:shadow-slate-200 hover:-translate-y-0.5 ${!location ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <ExternalLink size={14} className="text-blue-400" />
            <span className="tracking-widest uppercase">Open Google Maps</span>
          </a>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Sidebar Info */}
        <aside className="w-96 border-r border-slate-100 flex flex-col bg-white shrink-0 z-10 shadow-sm">
          {location ? (
            <>
              {/* Employee Detail Card */}
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Asset Dossier</span>
                    <span className="text-[8px] font-mono font-bold px-2 py-1 bg-green-50 text-green-600 rounded-full border border-green-100">ONLINE</span>
                  </div>
                  
                  <div className="space-y-1">
                    <h2 className="text-2xl font-bold tracking-tight">{location.name}</h2>
                    <p className="text-sm font-mono text-slate-400 font-bold">ID: {location.id}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 bg-slate-50 rounded-2xl space-y-1 border border-slate-100">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Briefcase size={12} />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Designation</span>
                      </div>
                      <p className="text-xs font-bold text-slate-700">{getDesignation(location.level)}</p>
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl space-y-1 border border-slate-100">
                      <div className="flex items-center gap-2 text-slate-400">
                        <Users size={12} />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Team</span>
                      </div>
                      <p className="text-xs font-bold text-slate-700">{getTeam(location.div)}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="p-5 bg-blue-50/50 rounded-[2rem] border border-blue-100 flex items-start gap-4">
                       <div className="w-10 h-10 bg-white rounded-2xl shadow-sm border border-blue-100 flex items-center justify-center shrink-0">
                          <MapPin size={18} className="text-blue-600" />
                       </div>
                       <div className="min-w-0">
                          <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1">Current Sector</p>
                          <p className="text-[11px] font-bold text-slate-900 leading-tight">
                            {addressCache[`${activePoint?.lat}-${activePoint?.lng}`] || 'Locating Asset...'}
                          </p>
                       </div>
                    </div>

                    <button 
                      onClick={() => setMapStyle(mapStyle === 'hybrid' ? 'roadmap' : 'hybrid')}
                      className="p-4 bg-white hover:bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-between group transition-all shadow-sm active:scale-95 text-left"
                    >
                      <div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Visualization View</p>
                        <p className="text-[11px] font-bold text-slate-900 uppercase tracking-tighter">
                          {mapStyle === 'hybrid' ? 'Satellite Hybrid' : 'Standard Roadmap'}
                        </p>
                      </div>
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                        mapStyle === 'hybrid' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-slate-900 text-white'
                      }`}>
                        {mapStyle === 'hybrid' ? <Globe size={18} /> : <LayoutGrid size={18} />}
                      </div>
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Movement Ledger</h3>
                    <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100">
                      {location.history?.length || 0} PTS
                    </span>
                  </div>
                </div>
              </div>

              {/* Movement History List */}
              <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-8 space-y-3">
                {location.history?.map((point, idx) => {
                  const isActive = activePoint === point;
                  const isStart = idx === (location.history?.length || 0) - 1;
                  const isEnd = idx === 0;
                  const date = new Date(point.time);

                  return (
                    <motion.button
                      key={`sidebar-pt-${idx}-${point.time}`}
                      whileHover={{ x: 4 }}
                      onClick={() => handlePointSelect(point)}
                      className={`w-full text-left p-5 rounded-2xl transition-all border group relative overflow-hidden ${
                        isActive 
                          ? 'bg-blue-50 border-blue-200 shadow-sm' 
                          : 'hover:bg-slate-50 border-transparent'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex flex-col items-center pt-1.5 shrink-0">
                          <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ring-4 ${
                            isEnd ? 'bg-red-500 ring-red-100' : 
                            isStart ? 'bg-green-500 ring-green-100' : 
                            isActive ? 'bg-blue-600 ring-blue-100' : 'bg-slate-200 ring-transparent'
                          }`} />
                          {idx !== (location.history?.length || 0) - 1 && (
                            <div className="w-[1px] h-14 bg-slate-100 my-1.5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className={`text-[11px] font-bold font-mono tracking-tight ${isActive ? 'text-blue-600' : 'text-slate-500'}`}>
                              {date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                            </span>
                            {isEnd && <span className="text-[8px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase tracking-widest border border-red-200">Terminal</span>}
                            {isStart && <span className="text-[8px] font-bold bg-green-100 text-green-600 px-2 py-0.5 rounded-full uppercase tracking-widest border border-green-200">Origin</span>}
                          </div>
                          <p className={`text-[11px] font-bold tracking-tight mb-2 leading-relaxed ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                             {addressCache[`${point.lat}-${point.lng}`] || `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`}
                          </p>
                          {point.remarks && (
                            <div className={`p-3 rounded-xl border ${isActive ? 'bg-white/50 border-blue-100' : 'bg-slate-50/50 border-slate-100'}`}>
                              <p className="text-[11px] text-slate-500 italic leading-relaxed line-clamp-2">
                                "{point.remarks}"
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
               <div className="w-16 h-16 bg-slate-50 rounded-3xl flex items-center justify-center mb-6">
                  <Search size={32} className="opacity-20" />
               </div>
               <p className="text-sm font-bold uppercase tracking-widest mb-2">No Asset Loaded</p>
               <p className="text-[10px] font-medium leading-relaxed">Adjust filters or select an employee to begin telemetry synchronization</p>
            </div>
          )}
        </aside>

        {/* Map View */}
        <div className="flex-1 relative bg-slate-50">
          {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-[2000] flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-xl flex items-center justify-center mb-4">
                <Loader2 className="text-blue-600 animate-spin" size={24} />
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Uplink Synchronization</p>
            </div>
          )}

          {error && (
             <div className="absolute inset-0 bg-white/40 backdrop-blur-md z-[2000] flex flex-col items-center justify-center p-12 text-center">
               <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-amber-500 mb-8 border border-amber-100/50 shadow-xl">
                  <Filter size={32} />
               </div>
               <h3 className="text-xl font-bold mb-3 text-slate-800">Connection Link Alert</h3>
               <p className="text-sm font-bold text-slate-500 max-w-xs mb-8 uppercase tracking-widest">{error}</p>
               <button 
                 onClick={handleManualSearch} 
                 className="px-8 py-3.5 bg-blue-600 text-white text-[10px] font-bold rounded-2xl shadow-xl hover:bg-blue-700 transition-all uppercase tracking-[0.2em]"
               >
                 Re-synchronize Data
               </button>
             </div>
          )}

          {location && typeof location.lat === 'number' && typeof location.lng === 'number' && (
            <MapContainer 
              center={[location.lat, location.lng]} 
              zoom={15} 
              zoomControl={false}
              attributionControl={false}
              className="w-full h-full"
            >
              <ChangeView center={[location.lat, location.lng]} />
              <AttributionControl prefix='<a href="https://www.linkedin.com/in/ahmadshafi016" target="_blank" rel="noreferrer">ARIF</a>' />
              <TileLayer
                attribution='&copy; Google Maps'
                url={mapStyle === 'hybrid' 
                  ? "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" 
                  : "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                }
              />
              
              {groupedPathCoordinates.map((path, idx) => (
                <MapDecorations key={`decor-${idx}`} path={path as [number, number][]} />
              ))}
              
              {/* Focal Highlight for Selected Ledger Item */}
              {activePoint && (
                <Marker 
                  key={`active-focal-${activePoint.time}`}
                  position={[activePoint.lat, activePoint.lng]} 
                  icon={new L.DivIcon({
                    className: 'focal-point',
                    html: `
                      <div class="relative flex items-center justify-center">
                        <div class="absolute w-20 h-20 bg-blue-400/20 rounded-full animate-ping"></div>
                        <div class="absolute w-12 h-12 bg-blue-500/30 rounded-full animate-pulse shadow-[0_0_30px_rgba(59,130,246,0.6)] border-2 border-white"></div>
                        <div class="w-5 h-5 bg-blue-600 rounded-full border-4 border-white shadow-2xl"></div>
                      </div>
                    `,
                    iconSize: [80, 80],
                    iconAnchor: [40, 40]
                  })}
                  zIndexOffset={1000}
                >
                  <Popup autoPan={true}>
                    <div className="p-1 font-sans text-center">
                      <p className="font-bold text-blue-600 uppercase text-[11px] tracking-[0.2em] mb-1">Telemetry Focus</p>
                      <p className="text-[10px] font-mono text-slate-500 font-bold">{new Date(activePoint.time).toLocaleTimeString()}</p>
                    </div>
                  </Popup>
                </Marker>
              )}
              
              {groupedPathCoordinates.length > 0 && (
                <>
                  {groupedPathCoordinates.map((path, dayIdx) => {
                    const colors = ['#8B5CF6', '#06B6D4', '#EC4899', '#6366F1', '#F97316'];
                    const pathColor = colors[dayIdx % colors.length];

                    return (
                      <Polyline 
                        key={`path-${dayIdx}`}
                        positions={path} 
                        pathOptions={{ 
                          color: pathColor, 
                          weight: 4, 
                          opacity: 0.9,
                          lineCap: 'round',
                          lineJoin: 'round'
                        }} 
                      />
                    );
                  })}
                  
                  {location.history?.map((p, i) => {
                    if (typeof p.lat !== 'number' || typeof p.lng !== 'number') return null;

                    // Group markers by their specific day to find start/end of that day
                    const pDateStr = new Date(p.time).toISOString().split('T')[0];
                    const dayPoints = location.history?.filter(h => 
                      new Date(h.time).toISOString().split('T')[0] === pDateStr
                    ).sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime()) || [];
                    
                    const isStartOfDay = p.time === dayPoints[0]?.time;
                    const isEndOfDay = p.time === dayPoints[dayPoints.length - 1]?.time;

                    let iconToUse = intermediateIcon;
                    if (isStartOfDay) iconToUse = startIcon;
                    if (isEndOfDay) iconToUse = endIcon;

                    return (
                      <Marker 
                        key={`map-node-${i}-${p.time}`} 
                        position={[p.lat, p.lng]} 
                        icon={iconToUse}
                        eventHandlers={{ click: () => handlePointSelect(p) }}
                      >
                        <Popup>
                          <div className="text-[10px] p-1 font-sans">
                            <p className={`font-bold uppercase tracking-widest mb-1 ${
                              isStartOfDay ? 'text-green-600' : isEndOfDay ? 'text-red-600' : 'text-yellow-600'
                            }`}>
                              {isStartOfDay ? 'Startup' : isEndOfDay ? 'Terminal' : 'Stopage'}
                            </p>
                            <p className="text-slate-600 font-mono flex items-center gap-2">
                               <Calendar size={10} />
                               {new Date(p.time).toLocaleString()}
                            </p>
                            {p.remarks && <p className="text-slate-500 italic mt-2 border-t border-slate-100 pt-1">"{p.remarks}"</p>}
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                </>
              )}
            </MapContainer>
          )}

          {/* Coordinate HUD handled in sidebar now */}
        </div>
      </main>
    </div>
  );
}
