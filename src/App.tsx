
import React, { useState, useEffect, useMemo } from 'react';
import { AlertCircle, KeyRound, ShieldAlert, Lock } from 'lucide-react';
import { Header } from './components/Header';
import { MovementPage } from './pages/MovementPage';
import { LocationPage } from './pages/LocationPage';
import { ReportPage } from './pages/ReportPage';
import { Employee, LocationData, MovementPoint } from './types';
import { getEmployeeStatus } from './utils/formatters';

export default function App() {
  const [currentPage, setCurrentPageState] = useState<'MOVEMENT' | 'LOCATION' | 'REPORT'>('MOVEMENT');
  const [isAuthorized, setIsAuthorized] = useState<boolean | 'checking'>(true);
  const [manualCodeInput, setManualCodeInput] = useState('');
  const [authError, setAuthError] = useState('');

  const PAGE_PATHS = {
    MOVEMENT: '/mtracking/movementTracking',
    LOCATION: '/mtracking/currentLocation',
    REPORT: '/mtracking/operationalReport'
  };

  const setCurrentPage = async (page: 'MOVEMENT' | 'LOCATION' | 'REPORT') => {
    try {
      const res = await fetch('/api/current-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page })
      });
      if (res.ok) {
        const data = await res.json();
        const active = data.activePage as 'MOVEMENT' | 'LOCATION' | 'REPORT' || page;
        setCurrentPageState(active);
        const newPath = PAGE_PATHS[active];
        if (window.location.pathname !== newPath) {
          window.history.pushState(null, '', newPath);
        }
      } else {
        setCurrentPageState(page);
        const newPath = PAGE_PATHS[page];
        if (window.location.pathname !== newPath) {
          window.history.pushState(null, '', newPath);
        }
      }
    } catch (err) {
      console.warn("Failed to synchronize active page state over API:", err);
      setCurrentPageState(page);
      const newPath = PAGE_PATHS[page];
      if (window.location.pathname !== newPath) {
        window.history.pushState(null, '', newPath);
      }
    }
  };

  useEffect(() => {
    // 1. Check URL query parameters for securityCode to strip it to keep URL clean
    const urlParams = new URLSearchParams(window.location.search);
    const codeParam = urlParams.get('securityCode');

    if (codeParam) {
      // Clean query parameter instantaneously to hide it from URL bar and make it only URL without securityCode
      urlParams.delete('securityCode');
      const newSearch = urlParams.toString();
      const cleanUrl = window.location.pathname + (newSearch ? '?' + newSearch : '');
      window.history.replaceState(null, '', cleanUrl);
    }
    
    // Always authorize access directly
    setIsAuthorized(true);
  }, []);

  const handleManualUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCodeInput.trim()) {
      setAuthError('Please enter a security code.');
      return;
    }
    try {
      setAuthError('');
      const res = await fetch('/api/verify-security-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: manualCodeInput })
      });
      if (res.ok) {
        sessionStorage.setItem('falcon_authorized', 'true');
        setIsAuthorized(true);
      } else {
        setAuthError('Invalid system security key. Access denied.');
      }
    } catch (err) {
      setAuthError('Unable to connect to security server.');
    }
  };

  useEffect(() => {
    // Determine the page routing state based on the current browser path
    const path = window.location.pathname;
    let initialPage: 'MOVEMENT' | 'LOCATION' | 'REPORT' = 'MOVEMENT';
    if (path.includes('location') || path.includes('LOCATION') || path.includes('current-location')) {
      initialPage = 'LOCATION';
    } else if (path.includes('report') || path.includes('REPORT') || path.includes('operational-report')) {
      initialPage = 'REPORT';
    }

    fetch('/api/current-page')
      .then(res => {
        if (res.ok) return res.json();
        throw new Error();
      })
      .then(data => {
        const activePage = (data.activePage || initialPage) as 'MOVEMENT' | 'LOCATION' | 'REPORT';
        setCurrentPageState(activePage);
        const correctPath = PAGE_PATHS[activePage];
        if (window.location.pathname !== correctPath) {
          window.history.replaceState(null, '', correctPath);
        }
      })
      .catch(err => {
        console.warn("Could not retrieve current active page state on load, using path-resolved page:", err);
        setCurrentPageState(initialPage);
        const correctPath = PAGE_PATHS[initialPage];
        if (window.location.pathname !== correctPath) {
          window.history.replaceState(null, '', correctPath);
        }
      });
  }, []);

  // Listen to popstate event (browser back & forward clicks) to change pages in sync
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      let targetPage: 'MOVEMENT' | 'LOCATION' | 'REPORT' = 'MOVEMENT';
      if (path.includes('location') || path.includes('LOCATION') || path.includes('current-location')) {
        targetPage = 'LOCATION';
      } else if (path.includes('report') || path.includes('REPORT') || path.includes('operational-report')) {
        targetPage = 'REPORT';
      }
      setCurrentPageState(targetPage);
      // Synchronize the change to the back-end
      fetch('/api/current-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page: targetPage })
      }).catch(err => console.warn("Failed to synchronize active page on history navigation:", err));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<{ message: string; instruction?: string; locked?: boolean } | null>(null);
  const [activePoint, setActivePoint] = useState<MovementPoint | null>(null);
  const [targetDate, setTargetDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [showHospitals, setShowHospitals] = useState(false);
  const [showCustomers, setShowCustomers] = useState(false);
  const [poiLoading, setPoiLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Hierarchy Selection State
  const [selNH, setSelNH] = useState<string>('');
  const [selDiv, setSelDiv] = useState<string>('');
  const [selZone, setSelZone] = useState<string>('');
  const [selRegion, setSelRegion] = useState<string>('');
  const [selArea, setSelArea] = useState<string>('');
  const [selTerr, setSelTerr] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'hibernate' | 'leave'>('all');

  const [mapStyle, setMapStyle] = useState<'hybrid' | 'roadmap'>('hybrid');
  const [addressCache, setAddressCache] = useState<Record<string, string>>({});
  const [allLatestLocations, setAllLatestLocations] = useState<any[]>([]);
  const [dbStatus, setDbStatus] = useState<{ status: string; sample?: any; error?: string; advice?: string } | null>(null);
  const [pois, setPois] = useState<any[]>([]);

  const handleClearFilters = () => {
    setSelDiv(''); setSelNH(''); setSelZone(''); setSelRegion(''); setSelArea(''); setSelTerr('');
    setSelectedEmpId(''); setSearchQuery(''); setStatusFilter('all');
  };

  const DIVISIONS: Record<string, (e: any) => boolean> = {
    'GENERAL': (e) => String(e.DIV_CODE) === '10' && String(e.EMP_LEVEL) !== '7' && String(e.EMP_LEVEL) !== '12',
    'ASPIRE': (e) => String(e.DIV_CODE) === '20',
    'WOMENS_CARE': (e) => String(e.DIV_CODE) === '60',
    'ONCOLOGY': (e) => String(e.DIV_CODE) === '30',
    'SERVAY': (e) => String(e.DIV_CODE) === '10' && String(e.EMP_LEVEL) === '12',
    'DERMA': (e) => String(e.DIV_CODE) === '50',
    'SR': (e) => String(e.DIV_CODE) === '10' && String(e.EMP_LEVEL) === '7',
  };

  useEffect(() => {
    fetch('/api/employees')
      .then(res => res.json())
      .then(data => setEmployees(Array.from(new Map(data.map((item: any) => [item.EMP_ID, item])).values()) as Employee[]))
      .catch(console.error);

    const dateToFetch = currentPage === 'LOCATION' ? new Date().toISOString().split('T')[0] : targetDate;
    fetch(`/api/all-latest-locations?date=${dateToFetch}`)
      .then(res => res.json())
      .then(data => setAllLatestLocations(Array.from(new Map(data.map((item: any) => [item.EMP_ID, item])).values())))
      .catch(console.error);

    fetch('/api/health')
      .then(res => res.json())
      .then(data => setDbStatus(data))
      .catch(err => setDbStatus({ status: 'error', error: err.message }));
  }, [targetDate, currentPage]);

  useEffect(() => {
    if (activePoint && !addressCache[`${activePoint.lat}-${activePoint.lng}`]) {
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${activePoint.lat}&lon=${activePoint.lng}&zoom=18`)
        .then(res => res.json())
        .then(data => setAddressCache(prev => ({ ...prev, [`${activePoint.lat}-${activePoint.lng}`]: data.display_name })))
        .catch(console.error);
    }
  }, [activePoint]);

  useEffect(() => {
    const fetchLocation = async () => {
      if (!selectedEmpId) {
        setLoading(false); setLocation(null); return;
      }
      try {
        setLoading(true); setError(null);
        const res = await fetch(`/api/movement?empId=${selectedEmpId}&date=${targetDate}`);
        const data = await res.json();
        if (!res.ok) {
          if (data.employee) setLocation({ ...data.employee, id: data.employee.id, name: data.employee.name, lat: 23.8103, lng: 90.4125, history: [] });
          setError({ message: data.message || 'Sync failed', instruction: data.instruction, locked: data.locked });
        } else {
          if (data.current) { data.lat = data.current.lat; data.lng = data.current.lng; setActivePoint(data.current); }
          setLocation(data);
        }
      } catch (err: any) { setError({ message: err.message }); } finally { setLoading(false); }
    };
    fetchLocation();
  }, [selectedEmpId, targetDate]);

  useEffect(() => {
    if (selTerr) {
      const mpo = employees.find(e => e.TERR_NAME === selTerr && e.EMP_LEVEL === '6');
      if (mpo) setSelectedEmpId(mpo.EMP_ID);
    } else if (selArea) {
      const am = employees.find(e => e.AREA_NAME === selArea && e.EMP_LEVEL === '5');
      if (am) setSelectedEmpId(am.EMP_ID);
    } else if (selRegion) {
      const rm = employees.find(e => e.REGION_NAME === selRegion && e.EMP_LEVEL === '4');
      if (rm) setSelectedEmpId(rm.EMP_ID);
    }
  }, [selNH, selZone, selRegion, selArea, selTerr, employees]);

  const totalDistance = useMemo(() => {
    if (!location?.history || location.history.length < 2) return 0;
    let dist = 0;
    for (let i = 1; i < location.history.length; i++) {
        const dx = location.history[i-1].lat - location.history[i].lat;
        const dy = location.history[i-1].lng - location.history[i].lng;
        dist += Math.sqrt(dx*dx + dy*dy);
    }
    return Math.round(dist * 111 * 10) / 10;
  }, [location?.history]);

  const filteredGlobalLocations = useMemo(() => {
    return allLatestLocations.filter(e => {
      // User requested: if no data for today (selected date), don't show on map in MOVEMENT
      if (currentPage === 'MOVEMENT' && !e.IN_TIME && !e.LEAVE_TYPE) return false;

      // Status Filter
      if (statusFilter !== 'all') {
        const empStatus = getEmployeeStatus(e);
        if (empStatus !== statusFilter) return false;
      }

      const divMatch = !selDiv || (DIVISIONS[selDiv] ? DIVISIONS[selDiv](e) : true);
      const nhMatch = !selNH || e.NH_NAME === selNH || e.NH_CODE === selNH;
      const zoneMatch = !selZone || e.ZONE_NAME === selZone || e.ZONE_CODE === selZone;
      const regionMatch = !selRegion || e.REGION_NAME === selRegion || e.REGION_CODE === selRegion;
      const areaMatch = !selArea || e.AREA_NAME === selArea || e.AREA_CODE === selArea;
      const terrMatch = !selTerr || e.TERR_NAME === selTerr || e.TERR_CODE === selTerr;
      return divMatch && nhMatch && zoneMatch && regionMatch && areaMatch && terrMatch;
    });
  }, [allLatestLocations, selDiv, selNH, selZone, selRegion, selArea, selTerr, currentPage, statusFilter]);

  const syncHierarchy = (gl: any) => {
    // Optionally identify division from DIV_CODE and EMP_LEVEL
    let divId = '';
    const dCode = String(gl.DIV_CODE);
    const eLevel = String(gl.EMP_LEVEL);
    if (dCode === '10') {
      if (eLevel === '12') divId = 'SERVAY';
      else if (eLevel === '7') divId = 'SR';
      else divId = 'GENERAL';
    } else if (dCode === '20') divId = 'ASPIRE';
    else if (dCode === '60') divId = 'WOMENS_CARE';
    else if (dCode === '30') divId = 'ONCOLOGY';
    else if (dCode === '50') divId = 'DERMA';

    setSelDiv(divId);
    setSelNH(gl.NH_NAME || ''); setSelZone(gl.ZONE_NAME || ''); setSelRegion(gl.REGION_NAME || ''); setSelArea(gl.AREA_NAME || ''); setSelTerr(gl.TERR_NAME || '');
  };

  const sharedProps = {
    loading, employees, searchQuery, setSearchQuery, selDiv, setSelDiv, selNH, setSelNH, selZone, setSelZone, 
    selRegion, setSelRegion, selArea, setSelArea, selTerr, setSelTerr, handleClearFilters,
    selectedEmpId, setSelectedEmpId, location, activePoint, handlePointSelect: setActivePoint,
    addressCache, mapStyle, setMapStyle, totalDistance, filteredGlobalLocations, allLatestLocations,
    syncHierarchy, showHospitals, setShowHospitals, showCustomers, setShowCustomers, pois, setPois, setPoiLoading,
    statusFilter, setStatusFilter
  };

  if (isAuthorized === 'checking') {
    return (
      <div className="h-screen w-screen bg-slate-50 flex flex-col items-center justify-center font-sans">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin mb-4" />
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">Initializing System Authorization...</p>
        </div>
      </div>
    );
  }

  if (isAuthorized === false) {
    return (
      <div className="h-screen w-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-white border border-slate-200 shadow-2xl rounded-3xl p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-red-500" />
          
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center text-red-500 mb-6 border border-red-100">
              <ShieldAlert size={28} />
            </div>
            
            <h3 className="text-xl font-bold text-slate-800 mb-1">SECURITY MISMATCH</h3>
            <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider mb-6">Access Denied: Invalid Security Code</p>
            
            <p className="text-xs text-slate-600 leading-relaxed mb-6">
              The provided security key is invalid, expired, or missing. To display and synchronize this telemetry monitoring dashboard, please supply the correct <code className="bg-slate-100 px-1.5 py-0.5 rounded text-red-600 font-mono text-[10px]">securityCode</code> in your URL query:
            </p>

            <div className="w-full bg-slate-50 border border-slate-100 p-4 rounded-xl text-left font-mono text-[11px] text-slate-500 leading-relaxed break-all">
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wide">Expected Access Pattern:</span><br/>
              <span className="text-slate-800 font-medium select-all">
                {window.location.origin}/mtracking/movementTracking?securityCode=<b>YOUR_CODE</b>
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-white text-slate-900 font-sans">
      <Header 
        dbStatus={dbStatus} setDbStatus={setDbStatus}
        currentPage={currentPage} setCurrentPage={setCurrentPage}
        targetDate={targetDate} setTargetDate={setTargetDate} handleManualSearch={() => {}} location={location}
      />

      <main className="flex-1 flex overflow-hidden relative">
        {error && (
           <div className="absolute inset-0 bg-white/40 backdrop-blur-md z-30 flex flex-col items-center justify-center p-12 text-center">
             <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-amber-500 mb-8 shadow-xl"><AlertCircle size={32} /></div>
             <h3 className="text-xl font-bold mb-3 text-slate-800">{error.locked ? 'ACCOUNT LOCKED' : 'Link Alert'}</h3>
             <p className="text-sm font-bold text-slate-500 max-w-lg mb-4 uppercase tracking-widest leading-relaxed">{error.message}</p>
             {error.instruction && (
               <div className="bg-amber-100 border border-amber-200 p-6 rounded-2xl max-w-lg mb-6">
                 <h4 className="text-[10px] font-bold text-amber-800 uppercase tracking-widest mb-2 text-left">Action Required:</h4>
                 <p className="text-[11px] text-amber-900 font-bold text-left leading-relaxed">{error.instruction}</p>
               </div>
             )}
             <div className="flex gap-4">
               {error.locked && (
                 <button 
                   onClick={async () => {
                     await fetch('/api/reset-lock', { method: 'POST' });
                     setError(null);
                     window.location.reload();
                   }}
                   className="px-8 py-3.5 bg-emerald-600 text-white text-[10px] font-bold rounded-2xl shadow-xl uppercase tracking-widest hover:bg-emerald-700 transition-all font-mono"
                 >
                   Reset Lock (I fixed it)
                 </button>
               )}
               <button onClick={() => { setError(null); window.location.reload(); }} className="px-8 py-3.5 bg-blue-600 text-white text-[10px] font-bold rounded-2xl shadow-xl uppercase tracking-widest">Retry</button>
             </div>
           </div>
        )}

        {currentPage === 'MOVEMENT' && <MovementPage {...sharedProps} />}
        {currentPage === 'LOCATION' && <LocationPage {...sharedProps} />}
        {currentPage === 'REPORT' && (
          <ReportPage 
            employees={employees}
            setCurrentPage={setCurrentPage}
            setSelectedEmpId={setSelectedEmpId}
            setTargetDate={setTargetDate}
            syncHierarchy={syncHierarchy}
          />
        )}
      </main>
    </div>
  );
}
