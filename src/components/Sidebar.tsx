
import React, { memo, useMemo, useState } from 'react';
import { Search, Users, RotateCcw, ChevronRight, Briefcase, Globe, Map as MapIcon, History, Navigation2, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Employee, LocationData, MovementPoint } from '../types';
import { getDesignation, getTeam, toBDTimeString, getEmployeeStatus } from '../utils/formatters';

interface SidebarProps {
  currentPage: 'MOVEMENT' | 'LOCATION';
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
  totalDistance: number;
  filteredGlobalLocations: any[];
  allLatestLocations: any[];
  roleFilter: string;
  setRoleFilter: (v: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = memo(({
  currentPage,
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
  totalDistance,
  filteredGlobalLocations,
  allLatestLocations,
  roleFilter,
  setRoleFilter,
}) => {
  const DIVISIONS_MAP: Record<string, (e: any) => boolean> = useMemo(() => ({
    'GENERAL': (e) => String(e.DIV_CODE) === '10' && String(e.EMP_LEVEL) !== '7' && String(e.EMP_LEVEL) !== '12',
    'ASPIRE': (e) => String(e.DIV_CODE) === '20',
    'WOMENS_CARE': (e) => String(e.DIV_CODE) === '60',
    'ONCOLOGY': (e) => String(e.DIV_CODE) === '30',
    'SERVAY': (e) => String(e.DIV_CODE) === '10' && String(e.EMP_LEVEL) === '12',
    'DERMA': (e) => String(e.DIV_CODE) === '50',
    'SR': (e) => String(e.EMP_LEVEL) === '7',
  }), []);

  const hierarchyOptions = useMemo(() => {
    const getUniquePairs = (list: Employee[], codeKey: keyof Employee, nameKey: keyof Employee) => {
      const map = new Map<string, string>();
      list.forEach(e => {
        const code = e[codeKey] as string;
        const name = e[nameKey] as string;
        if (code && name) map.set(code, name);
      });
      return Array.from(map.entries()).map(([code, name]) => ({ code, name, label: `${code} - ${name}` }));
    };

    const divFiltered = employees.filter(e => !selDiv || (DIVISIONS_MAP[selDiv] ? DIVISIONS_MAP[selDiv](e) : true));
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

  const sidebarColorClass = currentPage === 'MOVEMENT' ? 'border-l-blue-600' : 'border-l-emerald-500';
  const [showDeploymentHierarchy, setShowDeploymentHierarchy] = useState(true);

  return (
    <aside className="w-96 h-full border-r border-slate-100 flex flex-col bg-white shrink-0 z-10 shadow-sm overflow-hidden">
      <div className={`p-6 bg-slate-50/50 border-b border-slate-100 space-y-4 border-l-4 ${sidebarColorClass}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-blue-600" />
            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Deployment Hierarchy</h3>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={handleClearFilters}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-slate-200/50 text-[10px] font-bold text-slate-500 transition-colors"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </button>
            <button
              type="button"
              onClick={() => setShowDeploymentHierarchy(prev => !prev)}
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-slate-200/50 text-[10px] font-bold text-slate-500 transition-colors border border-slate-200"
            >
              {showDeploymentHierarchy ? 'HIDE' : 'SHOW'}
            </button>
          </div>
        </div>

        {showDeploymentHierarchy && (
        <>
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={14} className="text-slate-400" />
          </div>
          <input 
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search Employee ID or Name..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300 transition-all shadow-sm"
          />
          {searchQuery && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-xl shadow-2xl z-[60] max-h-60 overflow-y-auto custom-scrollbar">
              {employees
                .filter(e => {
                  const q = searchQuery.toLowerCase();
                  return (
                    e.EMP_NAME.toLowerCase().includes(q) || 
                    e.EMP_ID.toLowerCase().includes(q) ||
                    e.TERR_NAME?.toLowerCase().includes(q) ||
                    e.TERR_CODE?.toLowerCase().includes(q) ||
                    e.AREA_NAME?.toLowerCase().includes(q) ||
                    e.AREA_CODE?.toLowerCase().includes(q) ||
                    e.REGION_NAME?.toLowerCase().includes(q) ||
                    e.REGION_CODE?.toLowerCase().includes(q) ||
                    e.ZONE_NAME?.toLowerCase().includes(q) ||
                    e.ZONE_CODE?.toLowerCase().includes(q) ||
                    e.NH_NAME?.toLowerCase().includes(q) ||
                    e.NH_CODE?.toLowerCase().includes(q)
                  );
                })
                .slice(0, 15)
                .map(emp => (
                  <button
                    key={emp.EMP_ID}
                    onClick={() => {
                      setSelectedEmpId(emp.EMP_ID);
                      setSelNH(emp.NH_NAME || '');
                      setSelZone(emp.ZONE_NAME || '');
                      setSelRegion(emp.REGION_NAME || '');
                      setSelArea(emp.AREA_NAME || '');
                      setSelTerr(emp.TERR_NAME || '');
                      setSearchQuery('');
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-50 last:border-0 transition-colors"
                  >
                    <p className="text-[11px] font-bold text-slate-700">{emp.EMP_NAME}</p>
                    <p className="text-[9px] text-slate-400 font-mono">
                      {emp.EMP_ID} • {emp.TERR_NAME ? `${emp.TERR_CODE} - ${emp.TERR_NAME}` : emp.AREA_NAME ? `${emp.AREA_CODE} - ${emp.AREA_NAME}` : 'HQ'}
                    </p>
                  </button>
                ))}
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-1 gap-2">
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Division</label>
            <select 
              value={selDiv}
              onChange={(e) => {
                setSelDiv(e.target.value);
                setSelNH(''); setSelZone(''); setSelRegion(''); setSelArea(''); setSelTerr('');
              }}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none appearance-none"
            >
              <option value="">All Divisions</option>
              <option value="GENERAL">GENERAL</option>
              <option value="ASPIRE">ASPIRE</option>
              <option value="WOMENS_CARE">WOMEN'S CARE</option>
              <option value="ONCOLOGY">ONCOLOGY</option>
              <option value="SERVAY">SERVAY</option>
              <option value="DERMA">DERMA</option>
              <option value="SR">SR</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">NH Name</label>
            <select 
              value={selNH}
              onChange={(e) => {
                setSelNH(e.target.value);
                setSelZone(''); setSelRegion(''); setSelArea(''); setSelTerr('');
              }}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none appearance-none"
            >
              <option value="">All NH</option>
              {hierarchyOptions.nhs.sort((a,b) => a.label.localeCompare(b.label)).map(n => <option key={n.code} value={n.name}>{n.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Zone Name</label>
            <select 
              value={selZone}
              onChange={(e) => {
                setSelZone(e.target.value);
                setSelRegion(''); setSelArea(''); setSelTerr('');
              }}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none appearance-none"
            >
              <option value="">All Zones</option>
              {hierarchyOptions.zones.sort((a,b) => a.label.localeCompare(b.label)).map(z => <option key={z.code} value={z.name}>{z.label}</option>)}
            </select>
          </div>
          {/* Role Filter Dropdown */}
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Role</label>
            <select
              value={roleFilter}
              onChange={(e) => {
                setRoleFilter(e.target.value);
                if (e.target.value) {
                  // Show a searchable dropdown for the selected role
                  // Clear the searchQuery when changing roles
                  setSearchQuery('');
                }
              }}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none appearance-none focus:border-blue-300 focus:ring-4 focus:ring-blue-50"
            >
              <option value="">All Roles</option>
              <option value="RM">All RM</option>
              <option value="AM">All AM</option>
              <option value="MPO">All MPO</option>
            </select>
            {roleFilter && (
              <div className="relative mt-1">
                {roleFilter === 'RM' && employees.filter(e => e.EMP_LEVEL === '4').length > 0 && (
                  <div className="bg-white border border-slate-100 rounded-lg shadow-sm max-h-36 overflow-y-auto custom-scrollbar">
                    {employees
                      .filter(e => e.EMP_LEVEL === '4')
                      .slice(0, 8)
                      .map(emp => (
                        <button
                          key={emp.EMP_ID}
                          onClick={() => {
                            setSelectedEmpId(emp.EMP_ID);
                            setSelNH(emp.NH_NAME || '');
                            setSelZone(emp.ZONE_NAME || '');
                            setSelRegion(emp.REGION_NAME || '');
                            setSelArea(emp.AREA_NAME || '');
                            setSelTerr(emp.TERR_NAME || '');
                            setSearchQuery('');
                            setRoleFilter('');
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-slate-50 last:border-0 text-[10px] font-bold text-slate-700"
                        >
                          {emp.EMP_NAME}
                          <span className="text-[8px] text-slate-400 font-mono ml-2">{emp.EMP_ID}</span>
                        </button>
                      ))}
                  </div>
                )}
                {roleFilter === 'AM' && employees.filter(e => e.EMP_LEVEL === '5').length > 0 && (
                  <div className="bg-white border border-slate-100 rounded-lg shadow-sm max-h-36 overflow-y-auto custom-scrollbar">
                    {employees
                      .filter(e => e.EMP_LEVEL === '5')
                      .slice(0, 8)
                      .map(emp => (
                        <button
                          key={emp.EMP_ID}
                          onClick={() => {
                            setSelectedEmpId(emp.EMP_ID);
                            setSelNH(emp.NH_NAME || '');
                            setSelZone(emp.ZONE_NAME || '');
                            setSelRegion(emp.REGION_NAME || '');
                            setSelArea(emp.AREA_NAME || '');
                            setSelTerr(emp.TERR_NAME || '');
                            setSearchQuery('');
                            setRoleFilter('');
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-slate-50 last:border-0 text-[10px] font-bold text-slate-700"
                        >
                          {emp.EMP_NAME}
                          <span className="text-[8px] text-slate-400 font-mono ml-2">{emp.EMP_ID}</span>
                        </button>
                      ))}
                  </div>
                )}
                {roleFilter === 'MPO' && employees.filter(e => e.EMP_LEVEL === '6').length > 0 && (
                  <div className="bg-white border border-slate-100 rounded-lg shadow-sm max-h-36 overflow-y-auto custom-scrollbar">
                    {employees
                      .filter(e => e.EMP_LEVEL === '6')
                      .slice(0, 8)
                      .map(emp => (
                        <button
                          key={emp.EMP_ID}
                          onClick={() => {
                            setSelectedEmpId(emp.EMP_ID);
                            setSelNH(emp.NH_NAME || '');
                            setSelZone(emp.ZONE_NAME || '');
                            setSelRegion(emp.REGION_NAME || '');
                            setSelArea(emp.AREA_NAME || '');
                            setSelTerr(emp.TERR_NAME || '');
                            setSearchQuery('');
                            setRoleFilter('');
                          }}
                          className="w-full text-left px-3 py-2 hover:bg-blue-50 border-b border-slate-50 last:border-0 text-[10px] font-bold text-slate-700"
                        >
                          {emp.EMP_NAME}
                          <span className="text-[8px] text-slate-400 font-mono ml-2">{emp.EMP_ID}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Region Name</label>
            <select 
              value={selRegion}
              onChange={(e) => {
                setSelRegion(e.target.value);
                setSelArea(''); setSelTerr('');
              }}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none appearance-none"
            >
              <option value="">All Regions</option>
              {hierarchyOptions.regions.sort((a,b) => a.label.localeCompare(b.label)).map(r => <option key={r.code} value={r.name}>{r.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Area Name</label>
            <select 
              value={selArea}
              onChange={(e) => {
                setSelArea(e.target.value);
                setSelTerr('');
              }}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none appearance-none"
            >
              <option value="">All Areas</option>
              {hierarchyOptions.areas.sort((a,b) => a.label.localeCompare(b.label)).map(a => <option key={a.code} value={a.name}>{a.label}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Territory Name</label>
            <select 
              value={selTerr}
              onChange={(e) => setSelTerr(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none appearance-none"
            >
              <option value="">All Territories</option>
              {hierarchyOptions.terrs.sort((a,b) => a.label.localeCompare(b.label)).map(t => <option key={t.code} value={t.name}>{t.label}</option>)}
            </select>
          </div>
        </div>
        </>
        )}
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
                      `Personnel in ${selTerr || selArea || selRegion || selZone || selNH}` : 
                      `Global Personnel Active: ${filteredGlobalLocations.length}`
                    }
                </p>
               </div>
               {(selRegion || selArea || selTerr) && filteredGlobalLocations.length > 0 && (
                 <div className="px-6 space-y-2 text-left">
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2">Trackable Assets (GPS Online)</p>
                    <div className="space-y-1.5 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                      {filteredGlobalLocations
                        .filter(gl => gl.GEO_LAT)
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
                    </div>
                 </div>
               )}
               <p className="text-[9px] text-slate-400 font-bold px-8 leading-relaxed text-center uppercase tracking-tighter">
                 {selTerr || selArea || selRegion ? 
                   "SELECT A SPECIFIC ASSET FROM THE LIST OR MAP TO VIEW DETAILED TELEMETRY" :
                   "DRILL DOWN INTO REGIONS OR AREAS TO SYNC MANAGER PATHS AND LOGS"}
               </p>
             </div>
          </div>
        ) : selectedEmpId && (!location || !location.history || location.history.length === 0) ? (
          <div className="h-full flex flex-col items-center justify-center p-12 text-center text-slate-400 space-y-6">
             <div className="w-20 h-20 bg-orange-50 rounded-3xl flex items-center justify-center text-orange-400 shadow-sm shadow-orange-100">
                <AlertCircle size={40} />
             </div>
             <div className="space-y-2">
               <h3 className="text-lg font-bold text-slate-700">No Data Available</h3>
               <p className="text-[10px] font-medium leading-relaxed px-4 text-slate-500 uppercase tracking-widest">Tracking offline for selected timeframe</p>
             </div>
          </div>
        ) : location ? (
          <>
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Asset Dossier</span>
                  {(() => {
                    const globalData = allLatestLocations.find(gl => gl.EMP_ID === location.id);
                    const status = globalData ? getEmployeeStatus(globalData) : 'inactive';
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
                  <div className="p-4 bg-slate-50 rounded-2xl space-y-1 border border-slate-100">
                    <div className="flex items-center gap-2 text-slate-400">
                      <History size={12} />
                      <span className="text-[9px] font-bold uppercase tracking-widest">Last Seen</span>
                    </div>
                    <p className="text-xs font-bold text-slate-700">{toBDTimeString(location.current?.time || null)}</p>
                  </div>
                  <div className="p-4 bg-blue-50 rounded-2xl space-y-1 border border-blue-100">
                    <div className="flex items-center gap-2 text-blue-400">
                      <Navigation2 size={12} />
                      <span className="text-[9px] font-bold uppercase tracking-widest">Est. Travel</span>
                    </div>
                    <p className="text-xs font-bold text-blue-700">{totalDistance} KM</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-5 bg-blue-50/50 rounded-[2rem] border border-blue-100 flex items-start gap-4">
                     <div className="w-10 h-10 bg-white rounded-2xl shadow-sm border border-blue-100 flex items-center justify-center shrink-0">
                        <MapPin size={18} className="text-blue-600" />
                     </div>
                     <div className="min-w-0">
                        <p className="text-[9px] font-bold text-blue-400 uppercase tracking-widest mb-1">Sector Link</p>
                        <p className="text-[11px] font-bold text-slate-900 leading-tight">
                          {addressCache[`${activePoint?.lat}-${activePoint?.lng}`] || 'Locating Asset...'}
                        </p>
                     </div>
                  </div>

                  <button 
                    onClick={() => setMapStyle(mapStyle === 'hybrid' ? 'roadmap' : 'hybrid')}
                    className="w-full p-4 bg-white hover:bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-between group transition-all shadow-sm active:scale-95 text-left"
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
                      {mapStyle === 'hybrid' ? <Globe size={18} /> : <MapIcon size={18} />}
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
                  <div className="space-y-3">
                    {location.history?.map((point, idx) => {
                      const isActive = activePoint === point;
                      return (
                        <motion.button
                          key={`sidebar-pt-${idx}-${point.time}`}
                          whileHover={{ x: 4 }}
                          onClick={() => handlePointSelect(point)}
                          className={`w-full text-left p-5 rounded-2xl transition-all border group relative overflow-hidden ${
                            isActive ? 'bg-blue-50 border-blue-200 shadow-sm' : 'hover:bg-slate-50 border-transparent'
                          }`}
                        >
                          <div className="flex items-start gap-4">
                            <div className="flex flex-col items-center pt-1.5 shrink-0">
                              <div className={`w-3 h-3 rounded-full border-2 border-white shadow-sm ring-4 ${
                                point.source === 'ATTEND_MST_OUT' ? 'bg-red-500 ring-red-100' : 
                                point.source === 'ATTEND_MST' ? 'bg-green-500 ring-green-100' : 
                                isActive ? 'bg-blue-600 ring-blue-100' : 'bg-slate-200 ring-transparent'
                              }`} />
                              {idx !== (location.history?.length || 0) - 1 && <div className="w-[1px] h-14 bg-slate-100 my-1.5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <span className={`text-[11px] font-bold font-mono tracking-tight ${isActive ? 'text-blue-600' : 'text-slate-500'}`}>
                                  {toBDTimeString(point.time)}
                                </span>
                                <p className={`text-[11px] font-bold tracking-tight mb-2 leading-relaxed mt-1 ${isActive ? 'text-slate-900' : 'text-slate-700'}`}>
                                   {addressCache[`${point.lat}-${point.lng}`] || `${point.lat.toFixed(5)}, ${point.lng.toFixed(5)}`}
                                </p>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
        ) : null}
      </div>
    </aside>
  );
});
