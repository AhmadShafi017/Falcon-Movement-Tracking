import React, { useState, useEffect, useMemo, useRef } from 'react';
import { MapPin, Loader2, ExternalLink, Globe, Layers, X, History, TrendingUp, Navigation2, Navigation, LogOut, Calendar, ChevronRight, Search, User, Briefcase, Users, LayoutGrid, Map as MapIcon, ChevronDown, Filter, RotateCcw, AlertCircle } from 'lucide-react';
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
  NH_CODE?: string;
  NH_NAME?: string;
  ZONE_CODE?: string;
  ZONE_NAME?: string;
  REGION_CODE?: string;
  REGION_NAME?: string;
  AREA_CODE?: string;
  AREA_NAME?: string;
  TERR_CODE?: string;
  TERR_NAME?: string;
}

interface LocationData {
  id: string;
  name: string;
  level: string;
  div: string;
  nhName?: string;
  zoneName?: string;
  regionName?: string;
  areaName?: string;
  territoryName?: string;
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
    '6': 'Medical Promotion Officer (MPO)',
    '5': 'Area Manager (AM)',
    '4': 'Regional Manager (RM)',
    '3': 'Zone Head (ZH)',
    '2': 'National Sales Manager (NSM)',
    '7': 'Sales Representative (SR)'
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
  const [targetDate, setTargetDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Hierarchy Selection State
  const [selNH, setSelNH] = useState<string>('');
  const [selZone, setSelZone] = useState<string>('');
  const [selRegion, setSelRegion] = useState<string>('');
  const [selArea, setSelArea] = useState<string>('');
  const [selTerr, setSelTerr] = useState<string>('');

  const [mapStyle, setMapStyle] = useState<'hybrid' | 'roadmap'>('hybrid');
  const [addressCache, setAddressCache] = useState<Record<string, string>>({});
  const [allLatestLocations, setAllLatestLocations] = useState<any[]>([]);
  const [isGlobalMode, setIsGlobalMode] = useState(true);

  const handleClearFilters = () => {
    setSelNH('');
    setSelZone('');
    setSelRegion('');
    setSelArea('');
    setSelTerr('');
    setSelectedEmpId('');
    setSearchQuery('');
  };

  useEffect(() => {
    fetch('/api/employees')
      .then(res => res.json())
      .then(data => {
        // Ensure unique employees by EMP_ID to prevent duplicate key errors in React
        const unique = Array.from(new Map(data.map((item: Employee) => [item.EMP_ID, item])).values());
        setEmployees(unique as Employee[]);
      })
      .catch(err => console.error('Failed to load employees', err));

    fetch(`/api/all-latest-locations?date=${targetDate}`)
      .then(res => res.json())
      .then(data => setAllLatestLocations(data))
      .catch(err => console.error('Failed to load global telemetry', err));
  }, [targetDate]);

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
      if (!selectedEmpId) {
        setLoading(false);
        setLocation(null);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        
        let url = `/api/movement?empId=${selectedEmpId}`;
        if (targetDate) url += `&date=${targetDate}`;

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
        }
        
        setLocation(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLocation();
  }, [selectedEmpId, targetDate]);

  const handleManualSearch = () => {
    // State change of targetDate triggers useEffect
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
      // Data validation: skip points with invalid coordinates
      const lat = parseFloat(p.lat as any);
      const lng = parseFloat(p.lng as any);
      if (isNaN(lat) || isNaN(lng)) return;

      const dateKey = new Date(p.time).toISOString().split('T')[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push([lat, lng]);
    });

    // Only return groups with at least 2 points for a meaningful path
    return Object.values(groups).filter(path => path.length >= 1);
  }, [location?.history]);

  const allCoordinates = useMemo(() => {
    return groupedPathCoordinates.flat();
  }, [groupedPathCoordinates]);

  const filteredEmployees = useMemo(() => {
    return employees.filter(e => {
      const matchSearch = e.EMP_NAME.toLowerCase().includes(searchQuery.toLowerCase()) || e.EMP_ID.includes(searchQuery);
      const matchNH = !selNH || e.NH_NAME === selNH;
      const matchZone = !selZone || e.ZONE_NAME === selZone;
      const matchRegion = !selRegion || e.REGION_NAME === selRegion;
      const matchArea = !selArea || e.AREA_NAME === selArea;
      const matchTerr = !selTerr || e.TERR_NAME === selTerr;
      return matchSearch && matchNH && matchZone && matchRegion && matchArea && matchTerr;
    }).slice(0, 50);
  }, [employees, searchQuery, selNH, selZone, selRegion, selArea, selTerr]);
  
  useEffect(() => {
    // Hierarchical Auto-Selection Logic
    // Logic: Select the manager of the deepest level selected.
    if (selTerr) {
      // Find MPO (Level 6) for this Territory
      const mpo = employees.find(e => e.TERR_NAME === selTerr && e.EMP_LEVEL === '6');
      if (mpo) {
        setSelectedEmpId(mpo.EMP_ID);
        return;
      }
      // Fallback: If no level 6 found, pick first person in territory
      const firstInTerr = employees.find(e => e.TERR_NAME === selTerr);
      if (firstInTerr) setSelectedEmpId(firstInTerr.EMP_ID);
    } else if (selArea) {
      // Find Area Manager (Level 5) for this Area
      const am = employees.find(e => e.AREA_NAME === selArea && e.EMP_LEVEL === '5');
      if (am) {
        setSelectedEmpId(am.EMP_ID);
        return;
      }
      // Fallback: Pick first in area
      const firstInArea = employees.find(e => e.AREA_NAME === selArea);
      if (firstInArea) setSelectedEmpId(firstInArea.EMP_ID);
    } else if (selRegion) {
      // Find Regional Manager (Level 4) for this Region
      const rm = employees.find(e => e.REGION_NAME === selRegion && e.EMP_LEVEL === '4');
      if (rm) {
        setSelectedEmpId(rm.EMP_ID);
        return;
      }
      // Fallback: Pick first in region
      const firstInRegion = employees.find(e => e.REGION_NAME === selRegion);
      if (firstInRegion) setSelectedEmpId(firstInRegion.EMP_ID);
    } else if (selZone) {
      // Find Zone Head (Level 3) for this Zone
      const zh = employees.find(e => e.ZONE_NAME === selZone && e.EMP_LEVEL === '3');
      if (zh) {
        setSelectedEmpId(zh.EMP_ID);
        return;
      }
      // No fallback for ZH tracking as per user request
      setSelectedEmpId('');
    } else if (selNH) {
      // Find NSM (Level 2)
      const nsm = employees.find(e => e.NH_NAME === selNH && e.EMP_LEVEL === '2');
      if (nsm) {
        setSelectedEmpId(nsm.EMP_ID);
        return;
      }
      // No fallback for NSM tracking as per user request
      setSelectedEmpId('');
    } else {
      setSelectedEmpId('');
    }
  }, [selNH, selZone, selRegion, selArea, selTerr, employees]);

  const filteredGlobalLocations = useMemo(() => {
    return allLatestLocations.filter(e => {
      const matchNH = !selNH || e.NH_NAME === selNH;
      const matchZone = !selZone || e.ZONE_NAME === selZone;
      const matchRegion = !selRegion || e.REGION_NAME === selRegion;
      const matchArea = !selArea || e.AREA_NAME === selArea;
      const matchTerr = !selTerr || e.TERR_NAME === selTerr;
      return matchNH && matchZone && matchRegion && matchArea && matchTerr;
    });
  }, [allLatestLocations, selNH, selZone, selRegion, selArea, selTerr]);

  const statusIcons = {
    active: new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    }),
    hibernate: new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-gold.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    }),
    inactive: new L.Icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    })
  };

  const toBDTimeString = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      // Treating the incoming date string as local time
      return new Date(dateStr).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (e) {
      return 'N/A';
    }
  };

  const toBDDateTimeString = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr).toLocaleString([], {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    } catch (e) {
      return 'N/A';
    }
  };

  const getEmpStatus = (lastSeen: string | null, outTime: string | null) => {
    // 1. Inactive: Has OUT_TIME
    if (outTime && outTime.trim() !== '') return 'inactive';
    
    // 2. Active: Updated within the last 1 hour
    if (lastSeen) {
      // Comparison works correctly if both are local time
      const lastTime = new Date(lastSeen).getTime();
      const now = new Date().getTime();
      
      const diffMinutes = (now - lastTime) / (1000 * 60);
      if (diffMinutes < 60) return 'active';
    }
    
    // 3. Hibernate: No updates for > 1 hour
    return 'hibernate';
  };

  // Derived options for hierarchy
  const hierarchyOptions = useMemo(() => {
    const nhNames = Array.from(new Set(employees.map(e => e.NH_NAME).filter(Boolean))) as string[];
    
    const zoneFiltered = employees.filter(e => !selNH || e.NH_NAME === selNH);
    const zones = Array.from(new Set(zoneFiltered.map(e => e.ZONE_NAME).filter(Boolean))) as string[];

    const regionFiltered = zoneFiltered.filter(e => !selZone || e.ZONE_NAME === selZone);
    const regions = Array.from(new Set(regionFiltered.map(e => e.REGION_NAME).filter(Boolean))) as string[];

    const areaFiltered = regionFiltered.filter(e => !selRegion || e.REGION_NAME === selRegion);
    const areas = Array.from(new Set(areaFiltered.map(e => e.AREA_NAME).filter(Boolean))) as string[];

    const terrFiltered = areaFiltered.filter(e => !selArea || e.AREA_NAME === selArea);
    const terrs = Array.from(new Set(terrFiltered.map(e => e.TERR_NAME).filter(Boolean))) as string[];

    return { nhNames, zones, regions, areas, terrs };
  }, [employees, selNH, selZone, selRegion, selArea]);

  const totalDistance = useMemo(() => {
    if (!location?.history || location.history.length < 2) return 0;
    let dist = 0;
    for (let i = 1; i < location.history.length; i++) {
        const p1 = location.history[i-1];
        const p2 = location.history[i];
        const dx = p1.lat - p2.lat;
        const dy = p1.lng - p2.lng;
        dist += Math.sqrt(dx*dx + dy*dy);
    }
    return Math.round(dist * 111 * 10) / 10; // Convert to approx KM
  }, [location?.history]);

  const mapCenter = useMemo(() => {
    const fallback = { lat: 23.6850, lng: 90.3563 };
    
    if (location && selectedEmpId) {
      const lat = parseFloat(location.lat as any);
      const lng = parseFloat(location.lng as any);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
    
    if (filteredGlobalLocations.length > 0) {
      // Center on the first filtered location if available
      const lat = parseFloat(filteredGlobalLocations[0].GEO_LAT || filteredGlobalLocations[0].IN_LAT); 
      const lng = parseFloat(filteredGlobalLocations[0].GEO_LONG || filteredGlobalLocations[0].IN_LONG);
      if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
    }
    
    return fallback; // Default Bangladesh center
  }, [location, selectedEmpId, filteredGlobalLocations]);

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-white text-slate-900 font-sans">
      {/* Top Navigation */}
      <header className="h-20 px-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/90 backdrop-blur-xl z-50">
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
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-2xl">
            <Calendar size={14} className="text-blue-600 ml-2" />
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
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
        <aside className="w-96 border-r border-slate-100 flex flex-col bg-white shrink-0 z-10 shadow-sm overflow-hidden">
          {/* Hierarchy Selection Header */}
          <div className="p-6 bg-slate-50/50 border-b border-slate-100 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-blue-600" />
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Deployment Hierarchy</h3>
              </div>
              <button 
                onClick={handleClearFilters}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-slate-200/50 text-[10px] font-bold text-slate-500 transition-colors"
                title="Clear all filters"
              >
                <RotateCcw size={12} />
                <span>Reset</span>
              </button>
            </div>
            
            <div className="grid grid-cols-1 gap-2">
              {/* Level 1: NH_NAME */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">NH Name</label>
                <select 
                  value={selNH}
                  onChange={(e) => {
                    setSelNH(e.target.value);
                    setSelZone('');
                    setSelRegion('');
                    setSelArea('');
                    setSelTerr('');
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all appearance-none"
                >
                  <option value="">All NH</option>
                  {hierarchyOptions.nhNames.sort().map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>

              {/* Level 2: ZONE_NAME */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Zone Name</label>
                <select 
                  value={selZone}
                  onChange={(e) => {
                    setSelZone(e.target.value);
                    setSelRegion('');
                    setSelArea('');
                    setSelTerr('');
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all appearance-none"
                >
                  <option value="">All Zones</option>
                  {hierarchyOptions.zones.sort().map(z => <option key={z} value={z}>{z}</option>)}
                </select>
              </div>

              {/* Level 3: REGION_NAME */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Region Name</label>
                <select 
                  value={selRegion}
                  onChange={(e) => {
                    setSelRegion(e.target.value);
                    setSelArea('');
                    setSelTerr('');
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all appearance-none"
                >
                  <option value="">All Regions</option>
                  {hierarchyOptions.regions.sort().map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>

              {/* Level 4: AREA_NAME */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Area Name</label>
                <select 
                  value={selArea}
                  onChange={(e) => {
                    setSelArea(e.target.value);
                    setSelTerr('');
                  }}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all appearance-none"
                >
                  <option value="">All Areas</option>
                  {hierarchyOptions.areas.sort().map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              </div>

              {/* Level 5: TERR_NAME */}
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Territory Name</label>
                <select 
                  value={selTerr}
                  onChange={(e) => setSelTerr(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all appearance-none"
                >
                  <option value="">All Territories</option>
                  {hierarchyOptions.terrs.sort().map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center text-slate-400">
                <Loader2 size={32} className="animate-spin text-blue-600 mb-4" />
                <p className="text-xs font-bold text-slate-500">Synchronizing Telemetry...</p>
              </div>
            ) : !selectedEmpId ? (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center text-slate-400 space-y-6">
                 <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center text-blue-400 shadow-sm shadow-blue-100">
                    <Users size={40} />
                 </div>
                 <div className="space-y-4 w-full">
                   <div className="text-center px-6">
                    <h3 className="text-lg font-bold text-slate-700">Fleet Deployment</h3>
                    <p className="text-[10px] font-medium leading-relaxed text-slate-500 uppercase tracking-widest">
                        {selTerr || selArea || selRegion || selZone || selNH ? 
                          `Active Subordinates in ${selTerr || selArea || selRegion || selZone || selNH}` : 
                          `Global Personnel Active: ${filteredGlobalLocations.length}`
                        }
                    </p>
                   </div>

                   {/* Add a list of tracked assets if level selected */}
                   {(selRegion || selArea || selTerr) && filteredGlobalLocations.length > 0 && (
                     <div className="px-6 space-y-2">
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Trackable Assets (GPS Online)</p>
                        <div className="space-y-1.5 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                          {filteredGlobalLocations
                            .filter(gl => gl.GEO_LAT) // Only those with tracking
                            .slice(0, 20)
                            .map(gl => (
                              <button 
                                key={`list-${gl.EMP_ID}`}
                                onClick={() => setSelectedEmpId(gl.EMP_ID)}
                                className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-xl transition-all group"
                              >
                                <div className="text-left">
                                  <p className="text-[10px] font-bold text-slate-700 group-hover:text-blue-600">{gl.EMP_NAME}</p>
                                  <p className="text-[8px] text-slate-400 font-mono">{gl.EMP_ID} • {getDesignation(gl.EMP_LEVEL || '6')}</p>
                                </div>
                                <ChevronRight size={12} className="text-slate-300 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
                              </button>
                            ))
                          }
                          {filteredGlobalLocations.filter(gl => gl.GEO_LAT).length === 0 && (
                            <p className="text-[9px] text-slate-400 italic py-2">No GPS assets currently reporting in this sector.</p>
                          )}
                        </div>
                     </div>
                   )}
                   
                   <p className="text-[9px] text-slate-400 font-bold px-8 leading-relaxed text-center">
                     {selTerr || selArea || selRegion ? 
                       "SELECT A SPECIFIC ASSET FROM THE LIST OR MAP TO VIEW DETAILED MOVEMENT TELEMETRY" :
                       "DRILL DOWN INTO REGIONS OR AREAS TO SYNC MANAGER PATHS AND DEPLOYMENT LOGS"}
                   </p>
                 </div>
              </div>
            ) : selectedEmpId && (!location || !location.history || location.history.length === 0) ? (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center text-slate-400 space-y-6">
                 <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center text-orange-400 shadow-sm shadow-orange-100">
                    <AlertCircle size={40} />
                 </div>
                 <div className="space-y-2">
                   <h3 className="text-lg font-bold text-slate-700">No Movement Data</h3>
                   <p className="text-[10px] font-medium leading-relaxed px-4 text-slate-500 uppercase tracking-widest">Employee tracking offline for selected timeframe</p>
                 </div>
              </div>
            ) : location ? (
            <>
              {/* Employee Detail Card */}
              <div className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Asset Dossier</span>
                    {(() => {
                      const globalData = allLatestLocations.find(gl => gl.EMP_ID === location.id);
                      const status = getEmpStatus(
                        location.current?.time || null,
                        globalData?.OUT_TIME || null
                      );
                      return (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 rounded-full border border-slate-100">
                          <div className={`w-1 h-1 rounded-full ${
                            status === 'active' ? 'bg-blue-500' :
                            status === 'hibernate' ? 'bg-yellow-500' :
                            'bg-red-500'
                          } animate-pulse`} />
                          <span className={`text-[8px] font-bold uppercase tracking-wider ${
                            status === 'active' ? 'text-blue-600' :
                            status === 'hibernate' ? 'text-yellow-600' :
                            'text-red-600'
                          }`}>
                            {status === 'active' ? 'Active' : status === 'hibernate' ? 'Hibernate' : 'Inactive'}
                          </span>
                        </div>
                      );
                    })()}
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
                    {location.regionName && (
                      <div className="p-4 bg-slate-50 rounded-2xl space-y-1 border border-slate-100">
                        <div className="flex items-center gap-2 text-slate-400">
                          <Globe size={12} />
                          <span className="text-[9px] font-bold uppercase tracking-widest">Region</span>
                        </div>
                        <p className="text-xs font-bold text-slate-700">{location.regionName}</p>
                      </div>
                    )}
                    {location.territoryName && (
                      <div className="p-4 bg-slate-50 rounded-2xl space-y-1 border border-slate-100">
                        <div className="flex items-center gap-2 text-slate-400">
                          <MapIcon size={12} />
                          <span className="text-[9px] font-bold uppercase tracking-widest">Territory</span>
                        </div>
                        <p className="text-xs font-bold text-slate-700">{location.territoryName}</p>
                      </div>
                    )}
                    <div className="p-4 bg-slate-50 rounded-2xl space-y-1 border border-slate-100">
                      <div className="flex items-center gap-2 text-slate-400">
                        <History size={12} />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Last Seen</span>
                      </div>
                      <p className="text-xs font-bold text-slate-700">
                        {toBDTimeString(location.current?.time || null)}
                      </p>
                    </div>
                    {(() => {
                      const globalData = allLatestLocations.find(gl => gl.EMP_ID === location.id);
                      if (!globalData?.IN_TIME) return null;
                      return (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-4 bg-slate-50 rounded-2xl space-y-1 border border-slate-100">
                            <div className="flex items-center gap-2 text-slate-400">
                              <Navigation size={12} />
                              <span className="text-[9px] font-bold uppercase tracking-widest">Clock In</span>
                            </div>
                            <p className="text-xs font-bold text-slate-700">{globalData.IN_TIME}</p>
                          </div>
                          {globalData.OUT_TIME && (
                            <div className="p-4 bg-red-50 rounded-2xl space-y-1 border border-red-100">
                              <div className="flex items-center gap-2 text-red-400">
                                <LogOut size={12} />
                                <span className="text-[9px] font-bold uppercase tracking-widest">Clock Out</span>
                              </div>
                              <p className="text-xs font-bold text-red-700">{globalData.OUT_TIME}</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                    <div className="p-4 bg-blue-50 rounded-2xl space-y-1 border border-blue-100">
                      <div className="flex items-center gap-2 text-blue-400">
                        <Navigation2 size={12} />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Est. Distance</span>
                      </div>
                      <p className="text-xs font-bold text-blue-700">{totalDistance} KM Today</p>
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
                  const pointSource = (point as any).source;
                  const pointName = (point as any).name || 'Tracked Location';
                  const isClockIn = pointSource === 'ATTEND_MST';
                  const isClockOut = pointSource === 'ATTEND_MST_OUT';
                  const isActive = activePoint === point;

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
                            isClockOut ? 'bg-red-500 ring-red-100' : 
                            isClockIn ? 'bg-green-500 ring-green-100' : 
                            isActive ? 'bg-blue-600 ring-blue-100' : 'bg-slate-200 ring-transparent'
                          }`} />
                          {idx !== (location.history?.length || 0) - 1 && (
                            <div className="w-[1px] h-14 bg-slate-100 my-1.5" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-center mb-1.5">
                            <span className={`text-[11px] font-bold font-mono tracking-tight ${isActive ? 'text-blue-600' : 'text-slate-500'}`}>
                              {toBDTimeString(point.time)}
                            </span>
                            {isClockOut && <span className="text-[8px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full uppercase tracking-widest border border-red-200">Attendance Out</span>}
                            {isClockIn && <span className="text-[8px] font-bold bg-green-100 text-green-600 px-2 py-0.5 rounded-full uppercase tracking-widest border border-green-200">Attendance In</span>}
                            {!isClockIn && !isClockOut && idx === 0 && <span className="text-[8px] font-bold bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full uppercase tracking-widest border border-blue-200">Latest Position</span>}
                          </div>
                          <p className={`text-[11px] font-bold tracking-tight mb-2 leading-relaxed ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                             {addressCache[`${point.lat}-${point.lng}`] || `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`}
                          </p>
                          <div className="flex items-center gap-2">
                             <div className={`w-1.5 h-1.5 rounded-full ${isClockOut ? 'bg-red-400' : isClockIn ? 'bg-green-400' : 'bg-blue-400'}`} />
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{pointName}</span>
                          </div>
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
        </div>
      </aside>

        {/* Map View */}
        <div className="flex-1 relative bg-slate-50">
          {loading && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-30 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-xl flex items-center justify-center mb-4">
                <Loader2 className="text-blue-600 animate-spin" size={24} />
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Uplink Synchronization</p>
            </div>
          )}

          {error && (
             <div className="absolute inset-0 bg-white/40 backdrop-blur-md z-30 flex flex-col items-center justify-center p-12 text-center">
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

          <MapContainer 
            center={[mapCenter.lat, mapCenter.lng]} 
            zoom={selectedEmpId ? 15 : 7} 
            zoomControl={false}
            attributionControl={false}
            className="w-full h-full"
          >
              <ChangeView center={[mapCenter.lat, mapCenter.lng]} />
              <AttributionControl prefix='<a href="https://www.linkedin.com/in/ahmadshafi016" target="_blank" rel="noreferrer">ARIF</a>' />
              {/* Global Tracking Markers */}
              {filteredGlobalLocations.map((gl, idx) => {
                const status = getEmpStatus(gl.SERVER_TIME, gl.OUT_TIME);
                const lat = parseFloat(gl.GEO_LAT || gl.IN_LAT);
                const lng = parseFloat(gl.GEO_LONG || gl.IN_LONG);
                
                if (isNaN(lat) || isNaN(lng)) return null;

                // Skip the selected employee if they have history/path markers which already show their position
                if (selectedEmpId === gl.EMP_ID && location?.history && location.history.length > 0) return null;

                return (
                  <Marker 
                    key={`global-${gl.EMP_ID}-${idx}`}
                    position={[lat, lng]}
                    icon={statusIcons[status as keyof typeof statusIcons]}
                  >
                    <Popup>
                      <div className="p-1 min-w-[120px]">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-xs font-bold text-slate-700">{gl.EMP_NAME}</p>
                          <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase border ${
                            status === 'active' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            status === 'hibernate' ? 'bg-yellow-50 text-yellow-600 border-yellow-100' :
                            'bg-red-50 text-red-600 border-red-100'
                          }`}>
                            {status === 'active' ? 'Active' : status === 'hibernate' ? 'Hibernate' : 'Inactive'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400 font-medium">{gl.EMP_ID}</p>
                        <hr className="my-1 border-slate-100" />
                        <div className="space-y-0.5">
                          <p className="text-[9px] text-slate-500 font-bold uppercase">{gl.TERR_NAME || gl.AREA_NAME || 'Unknown Territory'}</p>
                          <p className="text-[8px] text-slate-400">Clock In: {gl.IN_TIME || 'N/A'}</p>
                          <p className="text-[8px] text-blue-600 font-bold mt-1">
                            {gl.GEO_LAT ? `GPS Tracking: ${toBDTimeString(gl.SERVER_TIME)}` : `Attendance Base: ${gl.IN_TIME || 'No Data'}`}
                          </p>
                          {selectedEmpId && gl.EMP_ID !== selectedEmpId && (
                            <div className="mt-1 pt-1 border-t border-slate-50">
                               <span className="text-[7px] font-bold text-slate-300 uppercase tracking-tighter">Subordinate Asset</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}

              <TileLayer
                attribution='&copy; Google Maps'
                url={mapStyle === 'hybrid' 
                  ? "https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}" 
                  : "https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
                }
              />

              {/* Status Legend */}
              <div className="absolute bottom-6 right-6 z-[1000] bg-white/90 backdrop-blur-md p-3 rounded-2xl border border-slate-200 shadow-xl space-y-2 pointer-events-none">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Status Legend</p>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#2A7BB1] shadow-sm shadow-blue-200" />
                  <span className="text-[10px] font-bold text-slate-600">Active (Updated &lt; 1h BD)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#E5B800] shadow-sm shadow-yellow-200" />
                  <span className="text-[10px] font-bold text-slate-600">Hibernate (Stopped &gt; 1h BD)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#B12A2A] shadow-sm shadow-red-200" />
                  <span className="text-[10px] font-bold text-slate-600">Inactive (Out Day)</span>
                </div>
              </div>
              
              {groupedPathCoordinates.map((path, idx) => (
                <MapDecorations key={`decor-${idx}`} path={path as [number, number][]} />
              ))}
              
              {/* Focal Highlight for Selected Ledger Item */}
              {activePoint && !isNaN(parseFloat(activePoint.lat as any)) && !isNaN(parseFloat(activePoint.lng as any)) && (
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
                      <p className="text-[10px] font-mono text-slate-500 font-bold">{toBDTimeString(activePoint.time)}</p>
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
                    const lat = parseFloat(p.lat as any);
                    const lng = parseFloat(p.lng as any);
                    if (isNaN(lat) || isNaN(lng)) return null;

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
                               {toBDDateTimeString(p.time)}
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

          {/* Coordinate HUD handled in sidebar now */}
        </div>
      </main>
    </div>
  );
}
