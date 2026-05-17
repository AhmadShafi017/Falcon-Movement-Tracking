
import React, { useMemo } from 'react';
import { Search, Users, RotateCcw, ChevronRight, Briefcase, Globe, Map as MapIcon, History, Navigation2, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Employee, LocationData, MovementPoint } from '../types';
import { getDesignation, getTeam, toBDTimeString } from '../utils/formatters';

interface LocationSidebarProps {
  loading: boolean;
  employees: Employee[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  selDiv: string;
  setSelDiv: (val: string) => void;
  selNH: string;
  setSelNH: (val: string) => void;
  selZone: string;
  setSelZone: (val: string) => void;
  selRegion: string;
  setSelRegion: (val: string) => void;
  selArea: string;
  setSelArea: (val: string) => void;
  selTerr: string;
  setSelTerr: (val: string) => void;
  handleClearFilters: () => void;
  selectedEmpId: string;
  setSelectedEmpId: (id: string) => void;
  location: LocationData | null;
  activePoint: MovementPoint | null;
  handlePointSelect: (p: MovementPoint) => void;
  addressCache: Record<string, string>;
  mapStyle: 'hybrid' | 'roadmap';
  setMapStyle: (s: 'hybrid' | 'roadmap') => void;
  filteredGlobalLocations: any[];
  allLatestLocations: any[];
  showHospitals: boolean;
  setShowHospitals: (v: boolean) => void;
  showCustomers: boolean;
  setShowCustomers: (v: boolean) => void;
  activeLocationData?: any[];
  activeDataLoading?: boolean;
  hibernateStatus?: any;
}

export const LocationSidebar: React.FC<LocationSidebarProps> = ({
  loading,
  employees,
  searchQuery,
  setSearchQuery,
  selDiv,
  setSelDiv,
  selNH,
  setSelNH,
  selZone,
  setSelZone,
  selRegion,
  setSelRegion,
  selArea,
  setSelArea,
  selTerr,
  setSelTerr,
  handleClearFilters,
  selectedEmpId,
  setSelectedEmpId,
  location,
  activePoint,
  handlePointSelect,
  addressCache,
  mapStyle,
  setMapStyle,
  filteredGlobalLocations,
  allLatestLocations,
  showHospitals,
  setShowHospitals,
  showCustomers,
  setShowCustomers,
  activeLocationData = [],
  activeDataLoading = false,
  hibernateStatus = null,
}) => {
  const getStatus = (emp: any) => {
    if (emp.LOCATION_STATUS) {
      if (emp.LOCATION_STATUS === 'LEAVE') return 'leave';
      if (emp.LOCATION_STATUS.includes('YES')) return 'active';
      if (emp.LOCATION_STATUS.includes('NO')) return 'hibernate';
    }
    if (!emp.IN_TIME) return 'leave'; // Treat no in-time as leave/offline for color coding
    const lastUpdate = emp.SERVER_TIME ? new Date(emp.SERVER_TIME) : null;
    const now = new Date();
    const isRecent = lastUpdate && (now.getTime() - lastUpdate.getTime() < 3600000);
    return isRecent ? 'active' : 'hibernate';
  };

  const hierarchyOptions = useMemo(() => {
    const DIVISIONS: Record<string, (e: any) => boolean> = {
      'GENERAL': (e) => String(e.DIV_CODE) === '10' && String(e.EMP_LEVEL) !== '7' && String(e.EMP_LEVEL) !== '12',
      'ASPIRE': (e) => String(e.DIV_CODE) === '20',
      'WOMENS_CARE': (e) => String(e.DIV_CODE) === '60',
      'ONCOLOGY': (e) => String(e.DIV_CODE) === '30',
      'SERVAY': (e) => String(e.DIV_CODE) === '10' && String(e.EMP_LEVEL) === '12',
      'DERMA': (e) => String(e.DIV_CODE) === '50',
      'SR': (e) => String(e.DIV_CODE) === '10' && String(e.EMP_LEVEL) === '7',
    };

    const getUniquePairs = (list: Employee[], codeKey: keyof Employee, nameKey: keyof Employee) => {
      const map = new Map<string, string>();
      list.forEach(e => {
        const code = e[codeKey] as string;
        const name = e[nameKey] as string;
        if (code && name) map.set(code, name);
      });
      return Array.from(map.entries()).map(([code, name]) => ({ code, name, label: `${code} - ${name}` }));
    };

    const divFiltered = employees.filter(e => !selDiv || (DIVISIONS[selDiv] ? DIVISIONS[selDiv](e) : true));
    const nhs = getUniquePairs(divFiltered, 'NH_CODE', 'NH_NAME');
    
    const nhFiltered = divFiltered.filter(e => !selNH || e.NH_NAME === selNH || e.NH_CODE === selNH);
    const zones = getUniquePairs(nhFiltered, 'ZONE_CODE', 'ZONE_NAME');
    
    const zoneFiltered = nhFiltered.filter(e => !selZone || e.ZONE_NAME === selZone || e.ZONE_CODE === selZone);
    const regions = getUniquePairs(zoneFiltered, 'REGION_CODE', 'REGION_NAME');
    
    const regionFiltered = zoneFiltered.filter(e => !selRegion || e.REGION_NAME === selRegion || e.REGION_CODE === selRegion);
    const areas = getUniquePairs(regionFiltered, 'AREA_CODE', 'AREA_NAME');
    
    const areaFiltered = regionFiltered.filter(e => !selArea || e.AREA_NAME === selArea || e.AREA_CODE === selArea);
    const terrs = getUniquePairs(areaFiltered, 'TERR_CODE', 'TERR_NAME');
    
    return { nhs, zones, regions, areas, terrs };
  }, [employees, selDiv, selNH, selZone, selRegion, selArea]);

  return (
    <aside className="w-96 border-r border-slate-100 flex flex-col bg-white shrink-0 z-10 shadow-sm overflow-hidden">
      <div className={`p-6 bg-slate-50/50 border-b border-slate-100 space-y-4 border-l-4 border-l-emerald-500`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Globe size={16} className="text-emerald-500" />
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Signal Intelligence</h3>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => {
                handleClearFilters();
                setSelectedEmpId('');
              }}
              className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-[8px] font-bold text-slate-500 rounded-full transition-all active:scale-95 border border-slate-200"
            >
              <RotateCcw size={10} />
              RESET
            </button>
            <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 rounded-full border border-emerald-100">
              <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[8px] font-bold text-emerald-600 uppercase tracking-widest">Live Stats</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="p-4 bg-emerald-50/60 border border-emerald-100 rounded-2xl transition-all hover:bg-emerald-50">
            <p className="text-[9px] font-extrabold text-emerald-600 uppercase tracking-widest mb-1">Active</p>
            <p className="text-2xl font-black text-emerald-700 tracking-tight tabular-nums">
              {filteredGlobalLocations.filter(gl => gl.LOCATION_STATUS?.includes('YES')).length}
            </p>
          </div>
          
          <div className="p-4 bg-amber-50/60 border border-amber-100 rounded-2xl transition-all hover:bg-amber-50">
            <p className="text-[9px] font-extrabold text-amber-600 uppercase tracking-widest mb-1">Hibernate</p>
            <p className="text-2xl font-black text-amber-700 tracking-tight tabular-nums">
              {filteredGlobalLocations.filter(gl => gl.LOCATION_STATUS?.includes('NO')).length}
            </p>
          </div>

          <div className="p-4 bg-rose-50/60 border border-rose-100 rounded-2xl transition-all hover:bg-rose-50">
            <p className="text-[9px] font-extrabold text-rose-600 uppercase tracking-widest mb-1">Leave</p>
            <p className="text-2xl font-black text-rose-700 tracking-tight tabular-nums">
              {filteredGlobalLocations.filter(gl => gl.LOCATION_STATUS === 'LEAVE').length}
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl transition-all hover:bg-slate-100/50">
            <p className="text-[9px] font-extrabold text-slate-500 uppercase tracking-widest mb-1">Total</p>
            <p className="text-2xl font-black text-slate-800 tracking-tight tabular-nums">
              {filteredGlobalLocations.length}
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center p-12 text-center text-slate-400">
            <Loader2 size={32} className="animate-spin text-emerald-600 mb-4" />
            <p className="text-xs font-bold text-slate-500">Scanning Satellite Feeds...</p>
          </div>
        ) : !selectedEmpId ? (
          <div className="h-full flex flex-col items-center justify-center p-12 text-center text-slate-400 space-y-6">
             <div className="w-20 h-20 bg-emerald-50 rounded-3xl flex items-center justify-center text-emerald-400 shadow-sm shadow-emerald-100">
                <MapPin size={40} />
             </div>
             <div className="space-y-4 w-full">
               <div className="text-center px-6">
                <h3 className="text-lg font-black text-slate-800 tracking-tight">Signal Analysis Ready</h3>
                <p className="text-[10px] font-medium leading-relaxed text-slate-400 uppercase tracking-widest mt-2">
                    Select a node from the map or roster to track movement
                </p>
               </div>
               {filteredGlobalLocations.length > 0 && (
                 <div className="px-6 space-y-3 text-left">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Field Roster</p>
                      <span className="text-[8px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">LIVE</span>
                    </div>
                    <div className="space-y-1.5 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                      {filteredGlobalLocations
                        .filter(gl => gl.GEO_LAT)
                        .slice(0, 30)
                        .map(gl => (
                          <button 
                            key={`loc-list-${gl.EMP_ID}`}
                            onClick={() => setSelectedEmpId(gl.EMP_ID)}
                            className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-emerald-50 border border-slate-100 hover:border-emerald-200 rounded-xl transition-all group"
                          >
                            <div className="text-left flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full shrink-0 ${
                                gl.LOCATION_STATUS === 'LEAVE' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' :
                                gl.LOCATION_STATUS?.includes('YES') ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 
                                gl.LOCATION_STATUS?.includes('NO') ? 'bg-amber-500' : 'bg-slate-300'
                              }`} />
                              <div>
                                <p className="text-[10px] font-bold text-slate-700 group-hover:text-emerald-600">{gl.EMP_NAME}</p>
                                <p className="text-[8px] text-slate-400 font-mono">{gl.EMP_ID}</p>
                              </div>
                            </div>
                            <ChevronRight size={12} className="text-slate-300 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                          </button>
                        ))
                      }
                    </div>
                 </div>
               )}
             </div>
          </div>
        ) : location ? (
          <div className="p-8 space-y-8">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Live Signal</span>
                  {(() => {
                    const globalData = allLatestLocations.find(gl => gl.EMP_ID === location.id);
                    const status = globalData ? getStatus(globalData) : 'inactive';
                    return (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 rounded-full border border-slate-100">
                        <div className={`w-1 h-1 rounded-full ${
                          status === 'active' ? 'bg-emerald-500' :
                          'bg-slate-400'
                        } animate-pulse`} />
                        <span className={`text-[8px] font-bold uppercase tracking-wider ${
                          status === 'active' ? 'text-emerald-600' : 'text-slate-500'
                        }`}>
                          {status === 'active' ? 'ONLINE' : 'OFFLINE'}
                        </span>
                      </div>
                    );
                  })()}
                </div>
                
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold tracking-tight">{location.name}</h2>
                  <p className="text-sm font-mono text-slate-400 font-bold">{location.id}</p>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <div className="p-5 bg-slate-50 rounded-2xl space-y-2 border border-slate-100 italic">
                    <div className="flex items-center gap-2 text-slate-400">
                      <MapPin size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Current Coordinates</span>
                    </div>
                    <p className="text-sm font-bold text-slate-700">
                      {location.lat?.toFixed(5)}, {location.lng?.toFixed(5)}
                    </p>
                    <p className="text-[11px] font-medium text-slate-500 leading-tight">
                      {addressCache[`${location.lat}-${location.lng}`] || 'Fetching address...'}
                    </p>
                  </div>

                  <div className="p-5 bg-emerald-50 rounded-2xl space-y-2 border border-emerald-100">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <History size={14} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Last Update Received</span>
                    </div>
                    <p className="text-sm font-bold text-emerald-700">{toBDTimeString(location.current?.time || null)}</p>
                  </div>
                </div>

                {(() => {
                  const empData = allLatestLocations.find(gl => gl.EMP_ID === location.id);
                  if (empData?.LEAVE_TYPE) {
                    return (
                      <div className="p-5 bg-rose-50 rounded-2xl border border-rose-100 space-y-3 shadow-sm shadow-rose-100">
                        <div className="flex items-center gap-2 text-rose-500">
                          <AlertCircle size={14} />
                          <span className="text-[10px] font-bold uppercase tracking-widest">Leave Information</span>
                        </div>
                        <div className="space-y-1">
                          <p className="text-xs font-black text-rose-700 uppercase tracking-tight">Type: {empData.LEAVE_TYPE}</p>
                          {empData.NOTES && <p className="text-[11px] text-rose-600 italic leading-relaxed">"{empData.NOTES}"</p>}
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="pt-2">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Activity Ledger (Today)</h3>
                    {activeDataLoading && <Loader2 size={12} className="animate-spin text-emerald-500" />}
                  </div>
                  
                  <div className="space-y-2 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                    {activeLocationData.length > 0 ? (
                      activeLocationData.map((item, idx) => (
                        <div key={`active-${idx}`} className="p-3 bg-white border border-slate-100 rounded-xl hover:border-emerald-200 transition-all shadow-sm">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${
                              item.SOURCE_TABLE === 'ATTEND_MST' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {item.SOURCE_TABLE}
                            </span>
                            <span className="text-[9px] font-mono text-slate-400">{toBDTimeString(item.EVENT_TIME)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                            <MapPin size={10} className="text-slate-400" />
                            <span>{item.LATITUDE.toFixed(5)}, {item.LONGITUDE.toFixed(5)}</span>
                          </div>
                        </div>
                      ))
                    ) : !activeDataLoading ? (
                      <div className="p-6 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <AlertCircle size={20} className="mx-auto text-slate-300 mb-2" />
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Active Signal Found</p>
                        <p className="text-[9px] text-slate-500 mt-1 italic">Last update &gt; 1 hour or no data today</p>
                      </div>
                    ) : null}
                  </div>
                </div>

                {hibernateStatus && (
                  <div className={`p-5 rounded-2xl border transition-all ${
                    hibernateStatus.LOCATION_STATUS?.includes('YES') 
                      ? 'bg-emerald-50 border-emerald-100 shadow-sm' 
                      : 'bg-amber-50 border-amber-100 shadow-sm'
                  }`}>
                    <div className="flex items-center gap-2 mb-3">
                      <div className={`w-2 h-2 rounded-full ${
                        hibernateStatus.LOCATION_STATUS?.includes('YES') ? 'bg-emerald-500' : 'bg-amber-500'
                      } animate-pulse`} />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pulse Status</span>
                    </div>
                    <p className={`text-xs font-bold leading-tight mb-2 ${
                      hibernateStatus.LOCATION_STATUS?.includes('YES') ? 'text-emerald-700' : 'text-amber-700'
                    }`}>
                      {hibernateStatus.LOCATION_STATUS}
                    </p>
                    <div className="flex items-center justify-between text-[9px] font-bold text-slate-400">
                      <span>Last Seen</span>
                      <span className="text-slate-600 italic">{toBDTimeString(hibernateStatus.LAST_LOCATION_TIME)}</span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 pt-4">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Environmental Overlays</h3>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setShowHospitals(!showHospitals)}
                      className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                        showHospitals ? 'bg-pink-50 border-pink-200 text-pink-700 shadow-sm' : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        showHospitals ? 'bg-pink-600 text-white shadow-lg shadow-pink-200' : 'bg-slate-100'
                      }`}>
                        <Briefcase size={14} />
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-widest">Hospitals</span>
                    </button>
                    <button 
                      onClick={() => setShowCustomers(!showCustomers)}
                      className={`flex-1 flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all ${
                        showCustomers ? 'bg-amber-50 border-amber-200 text-amber-700 shadow-sm' : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        showCustomers ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-slate-100'
                      }`}>
                        <Globe size={14} />
                      </div>
                      <span className="text-[9px] font-bold uppercase tracking-widest">Customers</span>
                    </button>
                  </div>
                </div>

                <div className="pt-6">
                  <button 
                    onClick={() => setMapStyle(mapStyle === 'hybrid' ? 'roadmap' : 'hybrid')}
                    className="w-full p-4 bg-white hover:bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group transition-all shadow-sm active:scale-95"
                  >
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Toggle Layer</p>
                      <p className="text-[11px] font-bold text-slate-700 uppercase">
                        {mapStyle === 'hybrid' ? 'Satellite' : 'Roadmap'}
                      </p>
                    </div>
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                      mapStyle === 'hybrid' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-slate-900 text-white'
                    }`}>
                      {mapStyle === 'hybrid' ? <Globe size={18} /> : <MapIcon size={18} />}
                    </div>
                  </button>
                </div>
              </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
};
