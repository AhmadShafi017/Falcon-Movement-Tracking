
import React, { useMemo, useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from '../components/Sidebar';
import { MainMap } from '../components/MainMap';
import { Employee, LocationData, MovementPoint } from '../types';

interface MovementPageProps {
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
  syncHierarchy: (gl: any) => void;
  showHospitals: boolean;
  setShowHospitals: (v: boolean) => void;
  showCustomers: boolean;
  setShowCustomers: (v: boolean) => void;
  pois: any[];
  setPois: React.Dispatch<React.SetStateAction<any[]>>;
  setPoiLoading: (v: boolean) => void;
  roleFilter: string;
  setRoleFilter: (v: string) => void;
}

export const MovementPage: React.FC<MovementPageProps> = (props) => {
  const mapCenter = useMemo(() => {
    if (props.location && props.selectedEmpId && props.location.lat != null && props.location.lng != null && !isNaN(props.location.lat) && !isNaN(props.location.lng)) {
      return { lat: props.location.lat, lng: props.location.lng };
    }
    return { lat: 23.6850, lng: 90.3563 };
  }, [props.location, props.selectedEmpId]);

  const groupedPathCoordinates = useMemo(() => {
    if (!props.location?.history) return [];
    const groups: Record<string, [number, number][]> = {};
    const sortedHistory = [...props.location.history].sort((a, b) => 
      new Date(a.time).getTime() - new Date(b.time).getTime()
    );

    sortedHistory.forEach(p => {
      const lat = parseFloat(p.lat as any);
      const lng = parseFloat(p.lng as any);
      if (isNaN(lat) || isNaN(lng)) return;
      const dateKey = new Date(p.time).toISOString().split('T')[0];
      if (!groups[dateKey]) groups[dateKey] = [];
      groups[dateKey].push([lat, lng]);
    });
    return Object.values(groups).filter(path => path.length >= 1);
  }, [props.location?.history]);

  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="flex-1 relative overflow-hidden">
      <div className="absolute inset-0 bg-slate-50">
        <MainMap 
          {...props}
          center={mapCenter}
          zoom={props.selectedEmpId ? 15 : 7}
          currentPage="MOVEMENT"
          groupedPathCoordinates={groupedPathCoordinates}
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
          <Sidebar {...props} currentPage="MOVEMENT" />
        </div>
      )}
    </div>
  );
};
