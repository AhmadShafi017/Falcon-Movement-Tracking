
import React, { useMemo } from 'react';
import { Sidebar } from '../components/Sidebar';
import { MainMap } from '../components/MainMap';
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
  setPoiLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

export const LocationPage: React.FC<LocationPageProps> = (props) => {
  const mapCenter = useMemo(() => {
    if (props.location && props.selectedEmpId && props.location.lat != null && props.location.lng != null && !isNaN(props.location.lat) && !isNaN(props.location.lng)) {
      return { lat: props.location.lat, lng: props.location.lng };
    }
    return { lat: 23.6850, lng: 90.3563 };
  }, [props.location, props.selectedEmpId]);

  return (
    <div className="flex-1 flex overflow-hidden">
      <Sidebar {...props} currentPage="LOCATION" />
      <div className="flex-1 relative bg-slate-50">
        <MainMap 
          {...props}
          center={mapCenter}
          zoom={props.selectedEmpId ? 15 : 7}
          currentPage="LOCATION"
          groupedPathCoordinates={[]}
        />
      </div>
    </div>
  );
};
