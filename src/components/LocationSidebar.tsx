
import React, { useMemo } from 'react';
import { Search, Users, RotateCcw, ChevronRight, Briefcase, Globe, Map as MapIcon, History, Navigation2, MapPin, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { Employee, LocationData, MovementPoint } from '../types';
import { getDesignation, getTeam, toBDTimeString, getEmployeeStatus } from '../utils/formatters';

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
  statusFilter: 'all' | 'active' | 'hibernate' | 'leave' | 'authorized_leave' | 'unauthorized_leave';
  setStatusFilter: (v: 'all' | 'active' | 'hibernate' | 'leave' | 'authorized_leave' | 'unauthorized_leave') => void;
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
  statusFilter,
  setStatusFilter,
}) => {
  const [isLeaveHovered, setIsLeaveHovered] = React.useState(false);

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

  const hierarchyFilteredLocations = useMemo(() => {
    const DIVISIONS: Record<string, (e: any) => boolean> = {
      'GENERAL': (e) => String(e.DIV_CODE) === '10' && String(e.EMP_LEVEL) !== '7' && String(e.EMP_LEVEL) !== '12',
      'ASPIRE': (e) => String(e.DIV_CODE) === '20',
      'WOMENS_CARE': (e) => String(e.DIV_CODE) === '60',
      'ONCOLOGY': (e) => String(e.DIV_CODE) === '30',
      'SERVAY': (e) => String(e.DIV_CODE) === '10' && String(e.EMP_LEVEL) === '12',
      'DERMA': (e) => String(e.DIV_CODE) === '50',
      'SR': (e) => String(e.DIV_CODE) === '10' && String(e.EMP_LEVEL) === '7',
    };

    return allLatestLocations.filter(e => {
      const divMatch = !selDiv || (DIVISIONS[selDiv] ? DIVISIONS[selDiv](e) : true);
      const nhMatch = !selNH || e.NH_NAME === selNH || e.NH_CODE === selNH;
      const zoneMatch = !selZone || e.ZONE_NAME === selZone || e.ZONE_CODE === selZone;
      const regionMatch = !selRegion || e.REGION_NAME === selRegion || e.REGION_CODE === selRegion;
      const areaMatch = !selArea || e.AREA_NAME === selArea || e.AREA_CODE === selArea;
      const terrMatch = !selTerr || e.TERR_NAME === selTerr || e.TERR_CODE === selTerr;
      return divMatch && nhMatch && zoneMatch && regionMatch && areaMatch && terrMatch;
    });
  }, [allLatestLocations, selDiv, selNH, selZone, selRegion, selArea, selTerr]);

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
          <button 
            onClick={() => setStatusFilter(statusFilter === 'active' ? 'all' : 'active')}
            className={`p-4 border rounded-2xl transition-all text-left group active:scale-95 ${
              statusFilter === 'active' 
                ? 'bg-emerald-600 border-emerald-500 shadow-lg shadow-emerald-100' 
                : 'bg-emerald-50/60 border-emerald-100 hover:bg-emerald-100/80 hover:border-emerald-200'
            }`}
          >
            <p className={`text-[9px] font-extrabold uppercase tracking-widest mb-1 ${
              statusFilter === 'active' ? 'text-emerald-100' : 'text-emerald-600'
            }`}>Active</p>
            <p className={`text-2xl font-black tracking-tight tabular-nums ${
              statusFilter === 'active' ? 'text-white' : 'text-emerald-700'
            }`}>
              {hierarchyFilteredLocations.filter(gl => getEmployeeStatus(gl) === 'active').length}
            </p>
          </button>
          
          <button 
            onClick={() => setStatusFilter(statusFilter === 'hibernate' ? 'all' : 'hibernate')}
            className={`p-4 border rounded-2xl transition-all text-left group active:scale-95 ${
              statusFilter === 'hibernate' 
                ? 'bg-amber-600 border-amber-500 shadow-lg shadow-amber-100' 
                : 'bg-amber-50/60 border-amber-100 hover:bg-amber-100/80 hover:border-amber-200'
            }`}
          >
            <p className={`text-[9px] font-extrabold uppercase tracking-widest mb-1 ${
              statusFilter === 'hibernate' ? 'text-amber-100' : 'text-amber-600'
            }`}>Hibernate</p>
            <p className={`text-2xl font-black tracking-tight tabular-nums ${
              statusFilter === 'hibernate' ? 'text-white' : 'text-amber-700'
            }`}>
              {hierarchyFilteredLocations.filter(gl => getEmployeeStatus(gl) === 'hibernate').length}
            </p>
          </button>

          <div 
            onMouseEnter={() => setIsLeaveHovered(true)}
            onMouseLeave={() => setIsLeaveHovered(false)}
            onClick={() => setStatusFilter(statusFilter === 'leave' ? 'all' : 'leave')}
            className={`border rounded-2xl transition-all duration-300 ease-in-out relative flex flex-col justify-between overflow-hidden cursor-pointer h-full min-h-[82px] select-none ${
              ['leave', 'authorized_leave', 'unauthorized_leave'].includes(statusFilter)
                ? 'bg-rose-600 border-rose-500 shadow-lg shadow-rose-100' 
                : 'bg-rose-50/60 border-rose-100 hover:bg-rose-100/80 hover:border-rose-200'
            }`}
          >
            {!isLeaveHovered ? (
              <div className="p-4 flex flex-col justify-between h-full w-full transition-all duration-300 text-left">
                <p className={`text-[9px] font-extrabold uppercase tracking-widest mb-1 transition-colors duration-300 ${
                  ['leave', 'authorized_leave', 'unauthorized_leave'].includes(statusFilter) ? 'text-rose-100' : 'text-rose-600'
                }`}>Leave</p>
                <p className={`text-2xl font-black tracking-tight tabular-nums transition-colors duration-300 ${
                  ['leave', 'authorized_leave', 'unauthorized_leave'].includes(statusFilter) ? 'text-white' : 'text-rose-700'
                }`}>
                  {hierarchyFilteredLocations.filter(gl => ['leave', 'unauthorized_leave'].includes(getEmployeeStatus(gl))).length}
                </p>
              </div>
            ) : (
              <div className="p-1 flex h-full w-full gap-1.5 items-stretch transition-all duration-300">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStatusFilter(statusFilter === 'authorized_leave' ? 'all' : 'authorized_leave');
                  }}
                  className={`flex-1 flex flex-col justify-between p-2 rounded-xl transition-all duration-300 text-left active:scale-95 ${
                    statusFilter === 'authorized_leave'
                      ? 'bg-white text-rose-700 shadow-sm'
                      : ['leave', 'authorized_leave', 'unauthorized_leave'].includes(statusFilter)
                        ? 'bg-rose-700 text-white hover:bg-rose-800 border border-rose-500'
                        : 'bg-white hover:bg-rose-100 text-rose-700 border border-rose-100 hover:border-rose-300'
                  }`}
                >
                  <span className={`text-[7px] font-extrabold uppercase tracking-wider leading-none transition-colors duration-300 ${
                    statusFilter === 'authorized_leave' ? 'text-rose-700' : ['leave', 'authorized_leave', 'unauthorized_leave'].includes(statusFilter) ? 'text-rose-200' : 'text-rose-600'
                  }`}>Approved</span>
                  <span className={`text-lg font-black tracking-tight mt-1 leading-none transition-colors duration-300 ${
                    statusFilter === 'authorized_leave' ? 'text-rose-700' : ['leave', 'authorized_leave', 'unauthorized_leave'].includes(statusFilter) ? 'text-white' : 'text-rose-700'
                  }`}>
                    {hierarchyFilteredLocations.filter(gl => getEmployeeStatus(gl) === 'leave').length}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setStatusFilter(statusFilter === 'unauthorized_leave' ? 'all' : 'unauthorized_leave');
                  }}
                  className={`flex-1 flex flex-col justify-between p-1.5 rounded-xl transition-all duration-300 text-left active:scale-95 ${
                    statusFilter === 'unauthorized_leave'
                      ? 'bg-white text-pink-700 shadow-sm'
                      : ['leave', 'authorized_leave', 'unauthorized_leave'].includes(statusFilter)
                        ? 'bg-pink-500 text-white hover:bg-pink-600 border border-rose-500'
                        : 'bg-white hover:bg-pink-100 text-pink-700 border border-pink-100 hover:border-pink-300'
                  }`}
                >
                  <span className={`text-[7px] font-extrabold uppercase tracking-wider leading-none transition-colors duration-300 ${
                    statusFilter === 'unauthorized_leave' ? 'text-pink-600' : ['leave', 'authorized_leave', 'unauthorized_leave'].includes(statusFilter) ? 'text-pink-200' : 'text-pink-600'
                  }`}>Missing</span>
                  <span className={`text-lg font-black tracking-tight mt-1 leading-none transition-colors duration-300 ${
                    statusFilter === 'unauthorized_leave' ? 'text-pink-700' : ['leave', 'authorized_leave', 'unauthorized_leave'].includes(statusFilter) ? 'text-white' : 'text-pink-700'
                  }`}>
                    {hierarchyFilteredLocations.filter(gl => getEmployeeStatus(gl) === 'unauthorized_leave').length}
                  </span>
                </button>
              </div>
            )}
          </div>

          <button 
            onClick={() => setStatusFilter('all')}
            className={`p-4 border rounded-2xl transition-all text-left group active:scale-95 ${
              statusFilter === 'all' 
                ? 'bg-slate-800 border-slate-700 shadow-lg shadow-slate-200 outline-2 outline-slate-800 outline-offset-2' 
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100/80 hover:border-slate-300'
            }`}
          >
            <p className={`text-[9px] font-extrabold uppercase tracking-widest mb-1 ${
              statusFilter === 'all' ? 'text-slate-400' : 'text-slate-500'
            }`}>Total</p>
            <div className="flex items-end justify-between">
              <p className={`text-2xl font-black tracking-tight tabular-nums ${
                statusFilter === 'all' ? 'text-white' : 'text-slate-800'
              }`}>
                {hierarchyFilteredLocations.length}
              </p>
            </div>
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="h-full flex flex-col items-center justify-center p-12 text-center text-slate-400">
            <Loader2 size={32} className="animate-spin text-emerald-600 mb-4" />
            <p className="text-xs font-bold text-slate-500">Scanning Satellite Feeds...</p>
          </div>
        ) : !selectedEmpId ? (
          <div className="p-6 space-y-6 animate-fadeIn">
            {/* Search Input */}
            <div className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={14} className="text-slate-400" />
              </div>
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Employee ID or Name..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-emerald-50 focus:border-emerald-300 transition-all shadow-sm"
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
                        className="w-full text-left px-4 py-3 hover:bg-emerald-50 border-b border-slate-50 last:border-0 transition-colors"
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

            {/* Deployment Hierarchy Selector Card */}
            <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100 space-y-4">
              <div className="flex items-center gap-2 mb-1">
                <Users size={14} className="text-emerald-500" />
                <h4 className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">Deployment Hierarchy</h4>
              </div>
              
              <div className="grid grid-cols-1 gap-3">
                {/* Division Selector */}
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider ml-1">Division</label>
                  <select 
                    value={selDiv}
                    onChange={(e) => {
                      setSelDiv(e.target.value);
                      setSelNH(''); setSelZone(''); setSelRegion(''); setSelArea(''); setSelTerr('');
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none appearance-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50/50"
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

                {/* NH Name Selector */}
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider ml-1">NH Name</label>
                  <select 
                    value={selNH}
                    onChange={(e) => {
                      setSelNH(e.target.value);
                      setSelZone(''); setSelRegion(''); setSelArea(''); setSelTerr('');
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none appearance-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50/50"
                  >
                    <option value="">All NH</option>
                    {hierarchyOptions.nhs.sort((a,b) => a.label.localeCompare(b.label)).map(n => <option key={n.code} value={n.name}>{n.label}</option>)}
                  </select>
                </div>

                {/* Zone Name Selector */}
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider ml-1">Zone Name</label>
                  <select 
                    value={selZone}
                    onChange={(e) => {
                      setSelZone(e.target.value);
                      setSelRegion(''); setSelArea(''); setSelTerr('');
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none appearance-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50/50"
                  >
                    <option value="">All Zones</option>
                    {hierarchyOptions.zones.sort((a,b) => a.label.localeCompare(b.label)).map(z => <option key={z.code} value={z.name}>{z.label}</option>)}
                  </select>
                </div>

                {/* Region Name Selector */}
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider ml-1">Region Name</label>
                  <select 
                    value={selRegion}
                    onChange={(e) => {
                      setSelRegion(e.target.value);
                      setSelArea(''); setSelTerr('');
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none appearance-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50/50"
                  >
                    <option value="">All Regions</option>
                    {hierarchyOptions.regions.sort((a,b) => a.label.localeCompare(b.label)).map(r => <option key={r.code} value={r.name}>{r.label}</option>)}
                  </select>
                </div>

                {/* Area Name Selector */}
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider ml-1">Area Name</label>
                  <select 
                    value={selArea}
                    onChange={(e) => {
                      setSelArea(e.target.value);
                      setSelTerr('');
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none appearance-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50/50"
                  >
                    <option value="">All Areas</option>
                    {hierarchyOptions.areas.sort((a,b) => a.label.localeCompare(b.label)).map(a => <option key={a.code} value={a.name}>{a.label}</option>)}
                  </select>
                </div>

                {/* Territory Name Selector */}
                <div className="space-y-1">
                  <label className="text-[8px] font-bold text-slate-400 uppercase tracking-wider ml-1">Territory Name</label>
                  <select 
                    value={selTerr}
                    onChange={(e) => setSelTerr(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none appearance-none focus:border-emerald-300 focus:ring-4 focus:ring-emerald-50/50"
                  >
                    <option value="">All Territories</option>
                    {hierarchyOptions.terrs.sort((a,b) => a.label.localeCompare(b.label)).map(t => <option key={t.code} value={t.name}>{t.label}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4 w-full">
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
                              {(() => {
                                const status = getEmployeeStatus(gl);
                                return (
                                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                                    status === 'unauthorized_leave' ? 'bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.4)]' :
                                    status === 'leave' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]' :
                                    status === 'active' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 
                                    'bg-amber-500'
                                  }`} />
                                );
                              })()}
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
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Signal State</span>
                  {(() => {
                    const globalData = allLatestLocations.find(gl => gl.EMP_ID === location.id);
                    const status = globalData ? getEmployeeStatus(globalData) : 'inactive';
                    return (
                      <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-50 rounded-full border border-slate-100">
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          status === 'unauthorized_leave' ? 'bg-pink-500 shadow-[0_0_6px_rgba(236,72,153,0.6)]' :
                          status === 'active' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]' :
                          'bg-slate-400'
                        } animate-pulse`} />
                        <span className={`text-[8px] font-bold uppercase tracking-wider ${
                          status === 'unauthorized_leave' ? 'text-pink-600' :
                          status === 'active' ? 'text-emerald-600' : 'text-slate-500'
                        }`}>
                          {status === 'unauthorized_leave' ? 'UNAUTHORIZED LEAVE' : status === 'active' ? 'ONLINE' : 'OFFLINE'}
                        </span>
                      </div>
                    );
                  })()}
                </div>
                
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold tracking-tight">{location.name}</h2>
                  <p className="text-sm font-mono text-slate-400 font-bold">{location.id}</p>
                  {(() => {
                    const globalData = allLatestLocations.find(gl => gl.EMP_ID === location.id);
                    const status = globalData ? getEmployeeStatus(globalData) : 'inactive';
                    if (status === 'unauthorized_leave') {
                      return (
                        <div className="mt-2 bg-pink-50 border border-pink-100 text-pink-700 text-[11px] rounded-xl p-3 font-semibold space-y-1">
                          <span className="font-extrabold text-[12px] uppercase tracking-wide">Status: Unauthorized Leave</span>
                          <p className="font-medium text-pink-600">Employee has not generated any attendance logs today. Pulling their last known historical position.</p>
                        </div>
                      );
                    }
                    return null;
                  })()}
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

                {hibernateStatus && (() => {
                  const status = getEmployeeStatus(hibernateStatus);
                  const isActive = status === 'active';
                  return (
                    <div className={`p-5 rounded-2xl border transition-all ${
                      isActive ? 'bg-emerald-50 border-emerald-100 shadow-sm' : 'bg-amber-50 border-amber-100 shadow-sm'
                    }`}>
                      <div className="flex items-center gap-2 mb-3">
                        <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pulse Status</span>
                      </div>
                      <p className={`text-xs font-bold leading-tight mb-2 ${isActive ? 'text-emerald-700' : 'text-amber-700'}`}>
                        {hibernateStatus.LOCATION_STATUS}
                      </p>
                      <div className="flex items-center justify-between text-[9px] font-bold text-slate-400">
                        <span>Last Seen</span>
                        <span className="text-slate-600 italic">{toBDTimeString(hibernateStatus.LAST_LOCATION_TIME)}</span>
                      </div>
                    </div>
                  );
                })()}

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
