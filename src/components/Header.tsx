
import React from 'react';
import { Map as MapIcon, RefreshCw, ChevronDown, Calendar, Filter, ExternalLink } from 'lucide-react';

interface HeaderProps {
  dbStatus: any;
  setDbStatus: (s: any) => void;
  currentPage: 'MOVEMENT' | 'LOCATION' | 'REPORT';
  setCurrentPage: (p: 'MOVEMENT' | 'LOCATION' | 'REPORT') => void;
  targetDate: string;
  setTargetDate: (d: string) => void;
  handleManualSearch: () => void;
  location: any;
}

export const Header: React.FC<HeaderProps> = ({
  dbStatus,
  setDbStatus,
  currentPage,
  setCurrentPage,
  targetDate,
  setTargetDate,
  handleManualSearch,
  location
}) => {
  return (
    <header className="h-20 px-8 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white/90 backdrop-blur-xl z-50">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
           <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
              <MapIcon size={20} />
           </div>
           <div>
              <h1 className="text-lg font-bold tracking-tight">Movement Tracking</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Employee Registry</p>
           </div>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-lg">
          <div className={`w-2 h-2 rounded-full shadow-[0_0_8px_rgba(0,0,0,0.1)] ${
            dbStatus?.status === 'healthy' ? 'bg-emerald-500 shadow-emerald-500/50' : 
            dbStatus?.status === 'loading' ? 'bg-amber-500 animate-pulse' : 
            'bg-red-500 shadow-red-500/50'
          }`} />
          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
            {dbStatus?.status === 'healthy' ? 'DB Connected' : 'DB Offline'}
          </span>
          <button 
            onClick={() => {
              setDbStatus({ status: 'loading' });
              fetch('/api/health').then(r => r.json()).then(d => setDbStatus(d)).catch(() => setDbStatus({ status: 'error' }));
            }}
            className="p-1 hover:bg-white rounded-md transition-colors"
          >
            <RefreshCw size={10} className={dbStatus?.status === 'loading' ? 'animate-spin' : ''} />
          </button>
        </div>

        <div className="relative">
          <select 
            value={currentPage}
            onChange={(e) => setCurrentPage(e.target.value as any)}
            className="appearance-none bg-white border border-slate-200 rounded-xl px-4 py-2 pr-10 text-[11px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-300 transition-all shadow-sm cursor-pointer min-w-[180px]"
          >
            <option value="MOVEMENT">MOVEMENT TRACKING</option>
            <option value="LOCATION">CURRENT LOCATION</option>
            <option value="REPORT">TRACKING REPORT</option>
          </select>
          <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
            <ChevronDown size={14} className="text-slate-400" />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-2.5 rounded-2xl">
          <Calendar size={14} className="text-blue-600 ml-2" />
          <div className="flex items-center gap-2">
            <input 
              type="date" 
              value={targetDate}
              onChange={(e) => setTargetDate(e.target.value)}
              className="bg-transparent border-none text-[11px] font-bold text-slate-600 outline-none cursor-pointer"
            />
          </div>
          <button 
            onClick={handleManualSearch}
            className="px-4 py-1.5 bg-blue-600 text-white text-[11px] font-bold rounded-xl hover:bg-blue-700 transition-colors flex items-center gap-2 ml-2"
          >
            <Filter size={12} />
            Filter
          </button>
        </div>

        <a 
          href={location ? `https://www.google.com/maps/search/?api=1&query=${location.lat},${location.lng}` : '#'}
          onClick={(e) => !location && e.preventDefault()}
          target="_blank" 
          rel="noreferrer"
          className={`flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-2xl text-[10px] font-bold transition-all shadow-lg hover:shadow-slate-200 hover:-translate-y-0.5 ${!location ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <ExternalLink size={14} className="text-blue-400" />
          <span className="tracking-widest uppercase">Open Google Maps</span>
        </a>
      </div>
    </header>
  );
};
