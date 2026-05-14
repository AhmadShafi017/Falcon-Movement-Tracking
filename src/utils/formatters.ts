
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

export const toBDDateTimeString = (dateStr: string | null) => {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch (e) {
    return 'N/A';
  }
};
