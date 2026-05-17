
export const getDesignation = (level: string) => {
  const levels: Record<string, string> = {
    '6': 'Medical Promotion Officer (MPO)',
    '5': 'Area Manager (AM)',
    '4': 'Regional Manager (RM)',
    '3': 'Zone Head (ZH)',
    '2': 'National Sales Manager (NSM)',
    '7': 'Sales Representative (SR)'
  };
  return levels[level] || `Level ${level}`;
};

export const getTeam = (div: string) => {
  const divs: Record<string, string> = {
    '10': 'General',
    '20': 'Aspire',
    '30': 'Oncology',
    '50': 'Derma',
    '60': "Women's Care"
  };
  return divs[div] || div;
};

export const toBDTimeString = (dateStr: string | null) => {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch (e) {
    return 'N/A';
  }
};

export const toBDDateOnlyString = (dateStr: string | null) => {
  if (!dateStr) return 'N/A';
  try {
    const d = new Date(dateStr);
    return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
  } catch (e) {
    return 'N/A';
  }
};

export const getTimeElapsed = (dateStr: string | null) => {
  if (!dateStr) return 'N/A';
  try {
    const lastUpdate = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - lastUpdate.getTime();
    
    if (diffMs < 0) return "Just now";
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (diffDays > 0) return `${diffDays} Day ${diffHrs % 24} Hours ago`;
    if (diffHrs > 0) return `${diffHrs} Hours ${diffMins % 60} Minutes ago`;
    if (diffMins > 0) return `${diffMins} Minutes ago`;
    return "Just now";
  } catch (e) {
    return 'N/A';
  }
};
