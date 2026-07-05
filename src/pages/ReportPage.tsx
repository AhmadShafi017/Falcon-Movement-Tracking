import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, Search, Trash2, Download, ExternalLink, MapPin, ChevronLeft, ChevronRight, Check, BarChart2, Filter, Activity, Users, Menu } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Employee } from '../types';
import { getDesignation, getTeam } from '../utils/formatters';

// Live reverse-geocoding via Google Maps (server proxy). Always performs a fresh network
// lookup per call — results are NEVER cached/stored, per requirement.
const resolveLiveAddress = async (lat: any, lng: any): Promise<string> => {
  if (lat === null || lat === undefined || lng === null || lng === undefined || lat === '' || lng === '') {
    return 'Unknown Location';
  }
  try {
    const res = await fetch(`/api/geocode?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lng)}`);
    const data = await res.json();
    if (data.address) return data.address;
    return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
  } catch {
    return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`;
  }
};

// Displays a human-readable address for a coordinate pair, resolved live (no caching)
// from the Google Maps Geocoding API every time the component mounts.
const LiveLocationName: React.FC<{ lat: any; lng: any }> = ({ lat, lng }) => {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setAddress(null);
    resolveLiveAddress(lat, lng).then(addr => {
      if (!cancelled) setAddress(addr);
    });
    return () => { cancelled = true; };
  }, [lat, lng]);

  if (address === null) {
    return <span className="text-slate-400 italic">Resolving address…</span>;
  }
  return <span>{address}</span>;
};

interface ReportPageProps {
  employees: Employee[];
  setCurrentPage: (p: 'MOVEMENT' | 'LOCATION' | 'REPORT') => void;
  setSelectedEmpId: (id: string) => void;
  setTargetDate: (d: string) => void;
  syncHierarchy: (gl: any) => void;
}

export const ReportPage: React.FC<ReportPageProps> = ({
  employees,
  setCurrentPage,
  setSelectedEmpId,
  setTargetDate,
  syncHierarchy,
}) => {
  // Filter Inputs State
  const getToday = () => {
    return new Date().toISOString().split('T')[0];
  };

  const [fDate, setFDate] = useState<string>(getToday());
  const [tDate, setTDate] = useState<string>(getToday());
  const [selDiv, setSelDiv] = useState<string>('ALL');
  const [selNSM, setSelNSM] = useState<string>('ALL');
  const [selZone, setSelZone] = useState<string>('ALL');
  const [selRegion, setSelRegion] = useState<string>('ALL');
  const [selArea, setSelArea] = useState<string>('ALL');
  const [selTerr, setSelTerr] = useState<string>('ALL');
  const [selDesignation, setSelDesignation] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showFilters, setShowFilters] = useState<boolean>(true);

  // Report results state
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Master-Detail Roster Pagination
  const [rosterPageNum, setRosterPageNum] = useState<number>(1);
  const rosterItemsPerPage = 10;
  const [selectedRosterEmpId, setSelectedRosterEmpId] = useState<string | null>(null);

  // NSM List: level '2'
  const nsmList = useMemo(() => {
    const list = employees.filter(e => String(e.EMP_LEVEL) === '2');
    const unique = new Map<string, string>();
    list.forEach(e => {
      unique.set(e.EMP_ID, e.EMP_NAME);
    });
    return Array.from(unique.entries()).map(([id, name]) => ({ id, name }));
  }, [employees]);

  // Dynamic selector options based on hierarchy
  const DIVISIONS: Record<string, (e: any) => boolean> = {
    'GENERAL': (e) => String(e.DIV_CODE) === '10' && String(e.EMP_LEVEL) !== '7' && String(e.EMP_LEVEL) !== '12',
    'ASPIRE': (e) => String(e.DIV_CODE) === '20',
    'WOMENS_CARE': (e) => String(e.DIV_CODE) === '60',
    'ONCOLOGY': (e) => String(e.DIV_CODE) === '30',
    'SERVAY': (e) => String(e.DIV_CODE) === '10' && String(e.EMP_LEVEL) === '12',
    'DERMA': (e) => String(e.DIV_CODE) === '50',
    'SR': (e) => String(e.EMP_LEVEL) === '7',
  };

  const currentHierarchyOptions = useMemo(() => {
    const getUniquePairs = (list: Employee[], codeKey: keyof Employee, nameKey: keyof Employee) => {
      const map = new Map<string, string>();
      list.forEach(e => {
        const code = e[codeKey] as string;
        const name = e[nameKey] as string;
        if (code && name) map.set(code, name);
      });
      return Array.from(map.entries()).map(([code, name]) => ({ code, name, label: `${code} - ${name}` }));
    };

    const divFiltered = employees.filter(e => selDiv === 'ALL' || (DIVISIONS[selDiv] ? DIVISIONS[selDiv](e) : true));
    const zones = getUniquePairs(divFiltered, 'ZONE_CODE', 'ZONE_NAME');

    const zoneFiltered = divFiltered.filter(e => selZone === 'ALL' || e.ZONE_NAME === selZone || e.ZONE_CODE === selZone);
    const regions = getUniquePairs(zoneFiltered, 'REGION_CODE', 'REGION_NAME');

    const regionFiltered = zoneFiltered.filter(e => selRegion === 'ALL' || e.REGION_NAME === selRegion || e.REGION_CODE === selRegion);
    const areas = getUniquePairs(regionFiltered, 'AREA_CODE', 'AREA_NAME');

    const areaFiltered = regionFiltered.filter(e => selArea === 'ALL' || e.AREA_NAME === selArea || e.AREA_CODE === selArea);
    const terrs = getUniquePairs(areaFiltered, 'TERR_CODE', 'TERR_NAME');

    return { zones, regions, areas, terrs };
  }, [employees, selDiv, selZone, selRegion, selArea]);

  // Designation mappings for selection
  const designationList = [
    { code: '6', label: 'Medical Promotion Officer (MPO)' },
    { code: '5', label: 'Area Manager (AM)' },
    { code: '4', label: 'Regional Manager (RM)' },
    { code: '3', label: 'Zone Head (ZH)' },
    { code: '2', label: 'National Sales Manager (NSM)' },
    { code: '7', label: 'Sales Representative (SR)' }
  ];

  // Load report data
  const handleFetchReport = async () => {
    setLoading(true);
    setErrorMsg(null);
    setRosterPageNum(1);
    try {
      const queryParams = new URLSearchParams({
        fromDate: fDate,
        toDate: tDate,
        division: selDiv,
        nsm: selNSM,
        zone: selZone,
        region: selRegion,
        area: selArea,
        territory: selTerr,
        designation: selDesignation,
      });

      const response = await fetch(`/api/report-data?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error(`Server returned error status ${response.status}`);
      }
      const data = await response.json();
      setReportData(data);
    } catch (err: any) {
      console.error("Report Fetch Failed:", err);
      setErrorMsg(err.message || 'Failed to generate report. Please check configurations.');
    } finally {
      setLoading(false);
    }
  };

  // Trigger load on mounting
  useEffect(() => {
    handleFetchReport();
  }, []);

  const handleResetFilters = () => {
    // 1. Revert Scheduler Input States to defaults
    setFDate(getToday());
    setTDate(getToday());
    setSelDiv('ALL');
    setSelNSM('ALL');
    setSelZone('ALL');
    setSelRegion('ALL');
    setSelArea('ALL');
    setSelTerr('ALL');
    setSelDesignation('ALL');
    setSearchQuery('');

    // 2. Clear Left Sidebar State (Employee Roster)
    setReportData([]);
    setSelectedRosterEmpId(null);
    setRosterPageNum(1);

    // 3. Clear Right Viewport State or tracking arrays
    // Placing console clear and diagnostic messages here
    console.clear();
    console.log("Falcon Movement Tracking Report Engine filters purged successfully. State reset to virgin templates.");
  };

  const handleClear = handleResetFilters;

  // Redirect click to Map View Tracker
  const handleShowOnMap = (row: any) => {
    // 1. Sync Date
    setTargetDate(row.APPLY_DATE);
    // 2. Set Employee
    setSelectedEmpId(row.EMP_ID);
    // 3. Set page mode
    setCurrentPage('MOVEMENT');
  };

  // CSV Export helper — resolves each row's address live via Google Maps (no caching)
  const [exportingCSV, setExportingCSV] = useState<boolean>(false);
  const handleExportCSV = async () => {
    if (filteredReportData.length === 0 || exportingCSV) return;
    setExportingCSV(true);

    try {
      const headers = [
        "Territory Code",
        "Territory Name",
        "Emp. Id.",
        "Emp. Name",
        "Designation",
        "Division",
        "Date",
        "Time",
        "Event Type",
        "Coordinates",
        "Location Address"
      ];

      const csvRows = [headers.join(",")];

      // Resolve addresses live with limited concurrency to avoid overwhelming the geocoder
      const CONCURRENCY = 5;
      const addresses: string[] = new Array(filteredReportData.length);
      let cursor = 0;
      const workers = Array.from({ length: Math.min(CONCURRENCY, filteredReportData.length) }, async () => {
        while (cursor < filteredReportData.length) {
          const i = cursor++;
          const row = filteredReportData[i];
          addresses[i] = await resolveLiveAddress(row.LATITUDE, row.LONGITUDE);
        }
      });
      await Promise.all(workers);

      filteredReportData.forEach((row, i) => {
        const resolvedAddress = addresses[i];
        const values = [
          `"${row.TERR_CODE || ''}"`,
          `"${row.TERR_NAME || ''}"`,
          `"${row.EMP_ID || ''}"`,
          `"${row.EMP_NAME || ''}"`,
          `"${getDesignation(row.EMP_LEVEL)}"`,
          `"${getTeam(row.DIV_CODE)}"`,
          `"${row.APPLY_DATE || ''}"`,
          `"${row.TIME_STR || ''}"`,
          `"${row.EVENT_NAME || 'Tracked Location'}"`,
          `"${row.LATITUDE ? Number(row.LATITUDE).toFixed(5) : ''}, ${row.LONGITUDE ? Number(row.LONGITUDE).toFixed(5) : ''}"`,
          `"${resolvedAddress.replace(/"/g, '""')}"`
        ];
        csvRows.push(values.join(","));
      });

      const blob = new Blob([csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `Employee_Registry_Report_${fDate}_to_${tDate}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setExportingCSV(false);
    }
  };

  // Dynamic client-side instant filter by Emp ID, Name, or Territory
  const filteredReportData = useMemo(() => {
    if (!searchQuery.trim()) return reportData;
    const q = searchQuery.toLowerCase().trim();
    return reportData.filter(row => {
      const empId = String(row.EMP_ID || '').toLowerCase();
      const empName = String(row.EMP_NAME || '').toLowerCase();
      const terrCode = String(row.TERR_CODE || '').toLowerCase();
      const terrName = String(row.TERR_NAME || '').toLowerCase();
      return empId.includes(q) || empName.includes(q) || terrCode.includes(q) || terrName.includes(q);
    });
  }, [reportData, searchQuery]);

  // Unique employees in the report context
  const uniqueEmployeesInReport = useMemo(() => {
    const empMap = new Map<string, { EMP_ID: string; EMP_NAME: string; EMP_LEVEL: string; DIV_CODE: string; score: number }>();
    filteredReportData.forEach(row => {
      if (!empMap.has(row.EMP_ID)) {
        empMap.set(row.EMP_ID, {
          EMP_ID: row.EMP_ID,
          EMP_NAME: row.EMP_NAME,
          EMP_LEVEL: row.EMP_LEVEL,
          DIV_CODE: row.DIV_CODE,
          score: 0,
        });
      }
      empMap.get(row.EMP_ID)!.score += 1;
    });
    return Array.from(empMap.values()).sort((a, b) => a.EMP_NAME.localeCompare(b.EMP_NAME));
  }, [filteredReportData]);

  // Synchronize active roster page size & selection
  useEffect(() => {
    if (uniqueEmployeesInReport.length > 0) {
      const exists = uniqueEmployeesInReport.some(e => e.EMP_ID === selectedRosterEmpId);
      if (!exists) {
        setSelectedRosterEmpId(uniqueEmployeesInReport[0].EMP_ID);
      }
    } else {
      setSelectedRosterEmpId(null);
    }
  }, [uniqueEmployeesInReport, selectedRosterEmpId]);

  useEffect(() => {
    setRosterPageNum(1);
  }, [filteredReportData]);

  const totalRosterPages = Math.ceil(uniqueEmployeesInReport.length / rosterItemsPerPage) || 1;
  const paginatedRoster = useMemo(() => {
    const startIdx = (rosterPageNum - 1) * rosterItemsPerPage;
    return uniqueEmployeesInReport.slice(startIdx, startIdx + rosterItemsPerPage);
  }, [uniqueEmployeesInReport, rosterPageNum]);

  // Canonical per-employee trail — fetched from the SAME server-side logic (fetchDailyHistory)
  // that drives the Movement Tracking map markers, so record counts always match exactly.
  const [empTrailData, setEmpTrailData] = useState<any[]>([]);
  const [trailLoading, setTrailLoading] = useState<boolean>(false);
  const [trailError, setTrailError] = useState<string | null>(null);

  useEffect(() => {
    if (!selectedRosterEmpId) {
      setEmpTrailData([]);
      return;
    }
    let cancelled = false;
    setTrailLoading(true);
    setTrailError(null);
    const params = new URLSearchParams({
      empId: selectedRosterEmpId,
      fromDate: fDate,
      toDate: tDate,
    });
    fetch(`/api/employee-trail?${params.toString()}`)
      .then(res => {
        if (!res.ok) throw new Error(`Server returned error status ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (!cancelled) setEmpTrailData(data);
      })
      .catch(err => {
        if (!cancelled) {
          console.error('Employee Trail Fetch Failed:', err);
          setTrailError(err.message || 'Failed to load employee trail.');
          setEmpTrailData([]);
        }
      })
      .finally(() => {
        if (!cancelled) setTrailLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedRosterEmpId, fDate, tDate]);

  const selectedEmpTraces = empTrailData;

  return (
    <div className="flex-1 h-full flex flex-col overflow-hidden bg-slate-50 p-6">
      {/* Search Input Box Frame */}
      <div className="w-full bg-white rounded-2xl border border-slate-100 shadow-sm shrink-0 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Calendar size={18} />
            </span>
            <div>
              <h2 className="text-sm font-bold text-slate-800">Operational Report Scheduler</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Set Filters & Generate Historical Trace sheet</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <AnimatePresence mode="popLayout" initial={false}>
              {showFilters && (
                <motion.div
                  key="action-buttons"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex items-center gap-3"
                >
                  <button 
                    onClick={handleClear} 
                    className="px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-500 rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 border border-slate-100 transition-colors cursor-pointer"
                  >
                    <Trash2 size={13} />
                    Reset Filters
                  </button>
                  <button 
                    onClick={handleFetchReport} 
                    className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-blue-100 transition-all cursor-pointer"
                  >
                    <Search size={13} />
                    Generate Report
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
            <button 
              onClick={() => setShowFilters(!showFilters)} 
              className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
                showFilters 
                ? 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100' 
                : 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-md shadow-blue-500/10'
              }`}
              title={showFilters ? "Hide Search & Filters" : "Show Search & Filters"}
            >
              <Menu size={16} className="stroke-[2.5]" />
            </button>
          </div>
        </div>

        <AnimatePresence initial={false}>
          {showFilters && (
            <motion.div
              key="filter-fields-container"
              initial={{ height: 0, opacity: 0, marginTop: 0 }}
              animate={{ height: "auto", opacity: 1, marginTop: 16 }}
              exit={{ height: 0, opacity: 0, marginTop: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 text-xs font-sans">
                {/* Row item: From Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">From Date</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      value={fDate} 
                      onChange={(e) => setFDate(e.target.value)} 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-slate-700 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300 transition-all" 
                    />
                  </div>
                </div>

                {/* Row item: To Date */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">To Date</label>
                  <div className="relative">
                    <input 
                      type="date" 
                      value={tDate} 
                      onChange={(e) => setTDate(e.target.value)} 
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold font-mono text-slate-700 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300 transition-all" 
                    />
                  </div>
                </div>

                {/* Row item: Division */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Division</label>
                  <select 
                    value={selDiv} 
                    onChange={(e) => { setSelDiv(e.target.value); setSelZone('ALL'); setSelRegion('ALL'); setSelArea('ALL'); setSelTerr('ALL'); }}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300 transition-all cursor-pointer"
                  >
                    <option value="ALL">All Divisions</option>
                    <option value="GENERAL">General</option>
                    <option value="ASPIRE">Aspire</option>
                    <option value="WOMENS_CARE">Women's Care</option>
                    <option value="ONCOLOGY">Oncology</option>
                    <option value="SERVAY">Servay</option>
                    <option value="DERMA">Derma</option>
                    <option value="SR">SR</option>
                  </select>
                </div>

                {/* Row item: NSM */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">NSM Designation</label>
                  <select
                    value={selNSM}
                    onChange={(e) => setSelNSM(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300 transition-all cursor-pointer"
                  >
                    <option value="ALL">All NSMs</option>
                    {nsmList.sort((a,b) => a.name.localeCompare(b.name)).map(item => (
                      <option key={item.id} value={item.name}>{item.name}</option>
                    ))}
                  </select>
                </div>

                {/* Row item: Zone */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Zone Code/Name</label>
                  <select
                    value={selZone}
                    onChange={(e) => { setSelZone(e.target.value); setSelRegion('ALL'); setSelArea('ALL'); setSelTerr('ALL'); }}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300 transition-all cursor-pointer"
                  >
                    <option value="ALL">All Zones</option>
                    {currentHierarchyOptions.zones.sort((a,b) => a.label.localeCompare(b.label)).map(item => (
                      <option key={item.code} value={item.name}>{item.label}</option>
                    ))}
                  </select>
                </div>

                {/* Row item: Region */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Region Code/Name</label>
                  <select
                    value={selRegion}
                    onChange={(e) => { setSelRegion(e.target.value); setSelArea('ALL'); setSelTerr('ALL'); }}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300 transition-all cursor-pointer"
                  >
                    <option value="ALL">All Regions</option>
                    {currentHierarchyOptions.regions.sort((a,b) => a.label.localeCompare(b.label)).map(item => (
                      <option key={item.code} value={item.name}>{item.label}</option>
                    ))}
                  </select>
                </div>

                {/* Row item: Area */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Area Code/Name</label>
                  <select
                    value={selArea}
                    onChange={(e) => { setSelArea(e.target.value); setSelTerr('ALL'); }}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300 transition-all cursor-pointer"
                  >
                    <option value="ALL">All Areas</option>
                    {currentHierarchyOptions.areas.sort((a,b) => a.label.localeCompare(b.label)).map(item => (
                      <option key={item.code} value={item.name}>{item.label}</option>
                    ))}
                  </select>
                </div>

                {/* Row item: Territory */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Territory Code/Name</label>
                  <select
                    value={selTerr}
                    onChange={(e) => setSelTerr(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300 transition-all cursor-pointer"
                  >
                    <option value="ALL">All Territories</option>
                    {currentHierarchyOptions.terrs.sort((a,b) => a.label.localeCompare(b.label)).map(item => (
                      <option key={item.code} value={item.name}>{item.label}</option>
                    ))}
                  </select>
                </div>

                {/* Row item: Designation */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Designation</label>
                  <select
                    value={selDesignation}
                    onChange={(e) => setSelDesignation(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300 transition-all cursor-pointer"
                  >
                    <option value="ALL">All Designations</option>
                    {designationList.map(item => (
                      <option key={item.code} value={item.code}>{item.label}</option>
                    ))}
                  </select>
                </div>

                {/* Row item: Search Employee ID or Name */}
                <div className="space-y-1">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">Search Employee (ID / Name)</label>
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Search Emp ID or Name..."
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setRosterPageNum(1);
                      }}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300 transition-all font-sans"
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
                      <Search size={14} className="stroke-[2.5]" />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Split Panel Container */}
      <div className="flex-1 min-h-0 w-full flex gap-4 mt-4 overflow-hidden">
        {/* Left Master Sidebar (Employee Master Roster) */}
        <div className="w-80 h-full flex flex-col bg-white border border-slate-200 rounded-xl overflow-hidden shrink-0 shadow-sm font-sans">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Users size={14} className="text-blue-600" />
                Employee Roster
              </h3>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                {uniqueEmployeesInReport.length} Personnel Found
              </p>
            </div>
          </div>

          {/* Roster Items List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 bg-white">
            {loading ? (
              <div className="h-full flex flex-col items-center justify-center p-6 space-y-2">
                <div className="w-6 h-6 border-2 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Loading...</p>
              </div>
            ) : paginatedRoster.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
                <Users size={24} className="text-slate-200 mb-2" />
                <p className="text-[10px] font-bold uppercase tracking-widest leading-relaxed">No Employee Records Found</p>
              </div>
            ) : (
              paginatedRoster.map((emp) => {
                const isActive = selectedRosterEmpId === emp.EMP_ID;
                return (
                  <button
                    key={emp.EMP_ID}
                    onClick={() => setSelectedRosterEmpId(emp.EMP_ID)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between text-xs group cursor-pointer ${
                      isActive
                        ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/10'
                        : 'bg-white text-slate-700 border-slate-100 hover:bg-slate-55 hover:border-slate-200'
                    }`}
                  >
                    <div className="min-w-0 pr-2 space-y-0.5">
                      <p className={`font-bold truncate ${isActive ? 'text-white' : 'text-slate-800'}`}>
                        {emp.EMP_NAME}
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={`font-mono text-[9px] ${isActive ? 'text-blue-200' : 'text-slate-400'}`}>
                          #{emp.EMP_ID}
                        </span>
                        <span className={`text-[9px] font-semibold px-1 rounded ${
                          isActive ? 'bg-blue-500 text-blue-50' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {getDesignation(emp.EMP_LEVEL)}
                        </span>
                      </div>
                    </div>
                    {/* Badge */}
                    <span className={`shrink-0 inline-flex items-center justify-center font-mono text-[9px] font-black rounded-lg px-2 py-0.5 ${
                      isActive ? 'bg-white text-blue-600' : 'bg-blue-50 text-blue-600'
                    }`}>
                      {emp.score} pt{emp.score > 1 ? 's' : ''}
                    </span>
                  </button>
                );
              })
            )}
          </div>

          {/* Roster Pagination Footer */}
          {!loading && totalRosterPages > 1 && (
            <div className="p-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
              <button
                onClick={() => setRosterPageNum(prev => Math.max(1, prev - 1))}
                disabled={rosterPageNum === 1}
                className="p-1 px-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft size={12} />
                Prev
              </button>
              
              <div className="text-[10px] font-bold text-slate-500">
                <span className="bg-slate-100 border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-mono">
                  {rosterPageNum}
                </span>
                <span className="mx-1">/</span>
                <span className="font-mono">{totalRosterPages}</span>
              </div>

              <button
                onClick={() => setRosterPageNum(prev => Math.min(totalRosterPages, prev + 1))}
                disabled={rosterPageNum === totalRosterPages}
                className="p-1 px-2 border border-slate-200 bg-white rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-all text-[10px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1 cursor-pointer"
              >
                Next
                <ChevronRight size={12} />
              </button>
            </div>
          )}
        </div>

        {/* Right Detail Panel */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full min-w-0 font-sans">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                {selectedRosterEmpId ? "Employee Location Trail" : "Operational Log Entry Sheet"}
              </h3>
              {selectedRosterEmpId ? (
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  Traces for <strong className="text-blue-600 font-extrabold">{uniqueEmployeesInReport.find(e => e.EMP_ID === selectedRosterEmpId)?.EMP_NAME}</strong> ({selectedEmpTraces.length} records) • Chronological Sequence (Old to New)
                </p>
              ) : (
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  Ordered chronologically Old to New
                </p>
              )}
            </div>
            {filteredReportData.length > 0 && (
              <button 
                onClick={handleExportCSV}
                disabled={exportingCSV}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-emerald-500/10 transition-colors cursor-pointer"
              >
                <Download size={13} />
                {exportingCSV ? 'Resolving Addresses…' : 'Export Active Filter (CSV)'}
              </button>
            )}
          </div>

          {(errorMsg || trailError) && (
            <div className="p-6 bg-red-50 text-red-700 text-xs font-bold border-b border-red-100 shrink-0">
              {errorMsg || trailError}
            </div>
          )}

          {/* Scrollable Trace Grid */}
          <div className="flex-1 overflow-x-auto overflow-y-auto h-full bg-white">
            {loading || trailLoading ? (
              <div className="h-full w-full flex flex-col items-center justify-center p-12 space-y-3 min-h-[300px]">
                <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-xs font-extrabold text-slate-400 uppercase tracking-widest mt-2">Querying tracking databases...</p>
              </div>
            ) : !selectedRosterEmpId ? (
              <div className="h-full w-full flex flex-col items-center justify-center p-12 text-slate-400 min-h-[300px] text-center">
                <Calendar size={48} className="text-slate-200 mb-3" />
                <p className="text-xs font-bold uppercase tracking-widest">No matching records found for current filters</p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase">Try moving date ranges or selecting other territories</p>
              </div>
            ) : selectedEmpTraces.length === 0 ? (
              <div className="h-full w-full flex flex-col items-center justify-center p-12 text-slate-400 min-h-[300px] text-center">
                <MapPin size={48} className="text-slate-200 mb-3" />
                <p className="text-xs font-bold uppercase tracking-widest">No Location Logs for this Employee</p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase">This user has recorded no movement data within selection</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/75 border-b border-slate-100 text-[9px] font-extrabold text-slate-400 uppercase tracking-widest sticky top-0 bg-white z-10">
                    <th className="px-6 py-4">Territory Code</th>
                    <th className="px-6 py-4">Territory Name</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Time</th>
                    <th className="px-6 py-4">Location Name</th>
                    <th className="px-6 py-4 text-center">Click on Map View Link</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] font-bold text-slate-700">
                  {selectedEmpTraces.map((row, idx) => (
                    <tr key={`${row.EMP_ID}-${row.APPLY_DATE}-${row.TIME_STR}-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3.5 font-mono text-slate-500">{row.TERR_CODE}</td>
                      <td className="px-6 py-3.5">{row.TERR_NAME}</td>
                      <td className="px-6 py-3.5 font-mono text-slate-500">{row.APPLY_DATE}</td>
                      <td className="px-6 py-3.5 font-mono text-slate-500">{row.TIME_STR}</td>
                      <td className="px-6 py-3.5 max-w-[340px]">
                        <div className="flex flex-col gap-1 text-slate-700">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider ${
                              row.EVENT_NAME === 'Attendance In' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                              row.EVENT_NAME === 'Attendance Out' ? 'bg-rose-50 text-rose-600 border border-rose-100' :
                              'bg-blue-50 text-blue-600 border border-blue-100'
                            }`}>
                              {row.EVENT_NAME || 'Tracked'}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono">
                              {Number(row.LATITUDE).toFixed(4)}, {Number(row.LONGITUDE).toFixed(4)}
                            </span>
                          </div>
                          <div className="text-[11px] font-extrabold text-slate-800 flex items-start gap-1 leading-snug">
                            <MapPin size={12} className="text-blue-500 shrink-0 mt-0.5" />
                            <LiveLocationName lat={row.LATITUDE} lng={row.LONGITUDE} />
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <button 
                            onClick={() => handleShowOnMap(row)}
                            className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors flex items-center gap-1.5 font-sans text-[10px] cursor-pointer"
                          >
                            <MapPin size={10} />
                            Switch to Tracker
                          </button>
                          <a 
                            href={`https://www.google.com/maps/search/?api=1&query=${row.LATITUDE},${row.LONGITUDE}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 text-slate-300 hover:text-slate-500 hover:bg-slate-100 rounded-md transition-all"
                            title="Open in Google Maps"
                          >
                            <ExternalLink size={12} />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
