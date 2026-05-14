
import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { Header } from './components/Header';
import { MovementPage } from './pages/MovementPage';
import { LocationPage } from './pages/LocationPage';
import { ReportPage } from './pages/ReportPage';
import { Employee, LocationData, MovementPoint } from './types';

export default function App() {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [currentPage, setCurrentPage] = useState<'MOVEMENT' | 'LOCATION' | 'REPORT'>('MOVEMENT');
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

  const [mapStyle, setMapStyle] = useState<'hybrid' | 'roadmap'>('hybrid');
  const [addressCache, setAddressCache] = useState<Record<string, string>>({});
  const [allLatestLocations, setAllLatestLocations] = useState<any[]>([]);
  const [dbStatus, setDbStatus] = useState<{ status: string; sample?: any; error?: string; advice?: string } | null>(null);
  const [pois, setPois] = useState<any[]>([]);

  const handleClearFilters = () => {
    setSelDiv(''); setSelNH(''); setSelZone(''); setSelRegion(''); setSelArea(''); setSelTerr('');
    setSelectedEmpId(''); setSearchQuery('');
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

    fetch(`/api/all-latest-locations?date=${targetDate}`)
      .then(res => res.json())
      .then(data => setAllLatestLocations(data))
      .catch(console.error);

    fetch('/api/health')
      .then(res => res.json())
      .then(data => setDbStatus(data))
      .catch(err => setDbStatus({ status: 'error', error: err.message }));
  }, [targetDate]);

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
      const divMatch = !selDiv || (DIVISIONS[selDiv] ? DIVISIONS[selDiv](e) : true);
      const nhMatch = !selNH || e.NH_NAME === selNH || e.NH_CODE === selNH;
      const zoneMatch = !selZone || e.ZONE_NAME === selZone || e.ZONE_CODE === selZone;
      const regionMatch = !selRegion || e.REGION_NAME === selRegion || e.REGION_CODE === selRegion;
      const areaMatch = !selArea || e.AREA_NAME === selArea || e.AREA_CODE === selArea;
      const terrMatch = !selTerr || e.TERR_NAME === selTerr || e.TERR_CODE === selTerr;
      return divMatch && nhMatch && zoneMatch && regionMatch && areaMatch && terrMatch;
    });
  }, [allLatestLocations, selDiv, selNH, selZone, selRegion, selArea, selTerr]);

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
    syncHierarchy, showHospitals, setShowHospitals, showCustomers, setShowCustomers, pois, setPois, setPoiLoading
  };

  return (
    <div className="h-screen w-screen overflow-hidden flex flex-col bg-white text-slate-900 font-sans">
      <Header 
        dbStatus={dbStatus} setDbStatus={setDbStatus} currentPage={currentPage} setCurrentPage={setCurrentPage}
        targetDate={targetDate} setTargetDate={setTargetDate} handleManualSearch={() => {}} location={location}
      />

      <main className="flex-1 flex overflow-hidden relative">
        {error && (
           <div className="absolute inset-0 bg-white/40 backdrop-blur-md z-30 flex flex-col items-center justify-center p-12 text-center">
             <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center text-amber-500 mb-8 shadow-xl"><AlertCircle size={32} /></div>
             <h3 className="text-xl font-bold mb-3 text-slate-800">{error.locked ? 'ACCOUNT LOCKED' : 'Link Alert'}</h3>
             <p className="text-sm font-bold text-slate-500 max-w-lg mb-4 uppercase tracking-widest leading-relaxed">{error.message}</p>
             <button onClick={() => setError(null)} className="px-8 py-3.5 bg-blue-600 text-white text-[10px] font-bold rounded-2xl shadow-xl uppercase tracking-widest">Retry</button>
           </div>
        )}

        {currentPage === 'MOVEMENT' && <MovementPage {...sharedProps} />}
        {currentPage === 'LOCATION' && <LocationPage {...sharedProps} />}
        {currentPage === 'REPORT' && <ReportPage {...sharedProps} />}
      </main>
    </div>
  );
}
