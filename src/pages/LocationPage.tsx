
import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Menu } from 'lucide-react';
import { LocationSidebar } from '../components/LocationSidebar';
import { LocationMap } from '../components/LocationMap';
import { Employee, LocationData, MovementPoint } from '../types';

interface LocationPageProps {
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
  syncHierarchy: (gl: any) => void;
  showHospitals: boolean;
  setShowHospitals: (v: boolean) => void;
  showCustomers: boolean;
  setShowCustomers: (v: boolean) => void;
  pois: any[];
  setPois: React.Dispatch<React.SetStateAction<any[]>>;
  setPoiLoading: (v: boolean) => void;
  statusFilter: 'all' | 'active' | 'hibernate' | 'leave' | 'authorized_leave' | 'unauthorized_leave';
  setStatusFilter: (v: 'all' | 'active' | 'hibernate' | 'leave' | 'authorized_leave' | 'unauthorized_leave') => void;
  roleFilter: string;
  setRoleFilter: (v: string) => void;
}

export const LocationPage: React.FC<LocationPageProps> = (props) => {
  const mapCenter = useMemo(() => {
    if (props.location && props.selectedEmpId && props.location.lat != null && props.location.lng != null && !isNaN(props.location.lat) && !isNaN(props.location.lng)) {
      return { lat: props.location.lat, lng: props.location.lng };
    }
    return { lat: 23.6850, lng: 90.3563 };
  }, [props.location, props.selectedEmpId]);

  const lastFetchRef = useRef<string>('');
  const [activeLocationData, setActiveLocationData] = useState<any[]>([]);
  const [activeDataLoading, setActiveDataLoading] = useState(false);
  const [hibernateStatus, setHibernateStatus] = useState<any>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    if (!props.selectedEmpId) {
      setActiveLocationData([]);
      setHibernateStatus(null);
      return;
    }

    const fetchActiveData = async () => {
      try {
        setActiveDataLoading(true);
        const res = await fetch(`/api/active-location/${props.selectedEmpId}`);
        if (res.ok) {
          const data = await res.json();
          setActiveLocationData(data);
        }
      } catch (err) {
        console.error('Active Data Fetch Error:', err);
      } finally {
        setActiveDataLoading(false);
      }
    };

    const fetchHibernate = async () => {
      try {
        const res = await fetch(`/api/hibernate-check/${props.selectedEmpId}`);
        if (res.ok) {
          const data = await res.json();
          setHibernateStatus(data);
        }
      } catch (err) {
        console.error('Hibernate Fetch Error:', err);
      }
    };

    fetchActiveData();
    fetchHibernate();
  }, [props.selectedEmpId]);

  useEffect(() => {
    if (!props.showHospitals && !props.showCustomers) {
      props.setPois([]);
      return;
    }

    const lat = mapCenter.lat;
    const lng = mapCenter.lng;
    const bounds = {
      minLat: lat - 0.2,
      maxLat: lat + 0.2,
      minLng: lng - 0.2,
      maxLng: lng + 0.2
    };

    const fetchKey = `${bounds.minLat}-${bounds.maxLat}-${props.selDiv}-${props.selTerr}`;
    if (fetchKey === lastFetchRef.current) return;
    lastFetchRef.current = fetchKey;

    const fetchPois = async () => {
      try {
        props.setPoiLoading(true);
        const params = new URLSearchParams({
          minLat: bounds.minLat.toString(),
          maxLat: bounds.maxLat.toString(),
          minLng: bounds.minLng.toString(),
          maxLng: bounds.maxLng.toString(),
          selDiv: props.selDiv,
          selNH: props.selNH,
          selZone: props.selZone,
          selRegion: props.selRegion,
          selArea: props.selArea,
          selTerr: props.selTerr
        });

        const res = await fetch(`/api/poi?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          props.setPois(data);
        }
      } catch (err) {
        console.error('POI Fetch Error:', err);
      } finally {
        props.setPoiLoading(false);
      }
    };

    fetchPois();
  }, [mapCenter, props.showHospitals, props.showCustomers, props.selDiv, props.selNH, props.selZone, props.selRegion, props.selArea, props.selTerr]);

  return (
    <div className="flex-1 relative overflow-hidden">
      <div className="absolute inset-0 bg-slate-50">
        <LocationMap 
          {...props}
          center={mapCenter}
          zoom={props.selectedEmpId ? 15 : 7}
        />
      </div>
      <button
        type="button"
        onClick={() => setSidebarOpen(prev => !prev)}
        className="absolute top-4 left-4 z-[1000] p-2.5 bg-white rounded-xl shadow-lg border border-slate-200 hover:bg-slate-50 transition-all active:scale-95"
      >
        <Menu size={18} className="text-slate-700" />
      </button>
      {sidebarOpen && (
        <div className="absolute inset-y-0 left-0 z-[999]">
          <LocationSidebar 
            {...props} 
            activeLocationData={activeLocationData} 
            activeDataLoading={activeDataLoading} 
            hibernateStatus={hibernateStatus}
          />
        </div>
      )}
    </div>
  );
};
