
import React, { useMemo } from 'react';
import { Sidebar } from '../components/Sidebar';
import { MainMap } from '../components/MainMap';
import { Employee, LocationData, MovementPoint } from '../types';
import { FileText, TrendingUp, Clock, Map as MapIcon, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface ReportPageProps {
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

export const ReportPage: React.FC<ReportPageProps> = (props) => {
  const mapCenter = useMemo(() => {
    if (props.location && props.selectedEmpId && props.location.lat != null && props.location.lng != null && !isNaN(props.location.lat) && !isNaN(props.location.lng)) {
      return { lat: props.location.lat, lng: props.location.lng };
    }
    return { lat: 23.6850, lng: 90.3563 };
  }, [props.location, props.selectedEmpId]);

  return (
    <div className="flex-1 flex overflow-hidden">
      <aside className="w-96 border-r border-slate-100 flex flex-col bg-white shrink-0 z-10 shadow-sm overflow-hidden">
        <Sidebar {...props} currentPage="REPORT" />
        
        {props.selectedEmpId && (
          <div className="p-8 border-t border-slate-50 bg-slate-50/30">
             <div className="flex items-center gap-2 mb-6">
                <FileText size={16} className="text-purple-600" />
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Daily Analytics Report</h3>
             </div>
             
             <div className="space-y-4">
                <div className="p-5 bg-white border border-slate-200 rounded-[2rem] shadow-sm">
                   <div className="flex items-center gap-3 mb-4">
                      <div className="w-8 h-8 bg-purple-50 rounded-xl flex items-center justify-center text-purple-600">
                         <TrendingUp size={16} />
                      </div>
                      <div>
                         <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Efficiency Index</p>
                         <p className="text-xs font-black text-slate-800">84.2% Coverage</p>
                      </div>
                   </div>
                   <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: '84.2%' }}
                        className="h-full bg-purple-600" 
                      />
                   </div>
                </div>

                <div className="p-5 bg-white border border-slate-200 rounded-[2rem] shadow-sm">
                   <div className="flex items-center gap-3 mb-1">
                      <div className="w-8 h-8 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                         <Clock size={16} />
                      </div>
                      <div>
                         <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Avg Stop Duration</p>
                         <p className="text-xs font-black text-slate-800">18.5 Minutes</p>
                      </div>
                   </div>
                </div>

                <div className="p-5 bg-white border border-slate-200 rounded-[2rem] shadow-sm">
                   <div className="flex items-center gap-3 mb-1">
                      <div className="w-8 h-8 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
                         <MapIcon size={16} />
                      </div>
                      <div>
                         <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest leading-none mb-1">Territory Density</p>
                         <p className="text-xs font-black text-slate-800">High Concentration</p>
                      </div>
                   </div>
                </div>
             </div>
             
             <button className="w-full mt-8 py-4 bg-slate-900 text-white rounded-3xl text-[10px] font-bold hover:bg-purple-600 transition-all flex items-center justify-center gap-2 uppercase tracking-widest shadow-xl">
               <span>Export PDF Dossier</span>
               <ChevronRight size={14} />
             </button>
          </div>
        )}
      </aside>

      <div className="flex-1 relative bg-slate-50">
        <MainMap 
           {...props}
           center={mapCenter}
           zoom={props.selectedEmpId ? 15 : 7}
           currentPage="REPORT"
           groupedPathCoordinates={[]}
        />
      </div>
    </div>
  );
};
