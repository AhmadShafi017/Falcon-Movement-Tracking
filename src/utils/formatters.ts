
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

export const getEmployeeStatus = (emp: any) => {
  if (!emp) return 'leave';
  
  // Priority 0: Specifically marked as Unauthorized Leave (Compliance Exception)
  if (emp.LOCATION_STATUS === 'UNAUTHORIZED LEAVE') return 'unauthorized_leave';
  
  // Priority 1: Specifically marked as Leave
  if (emp.LOCATION_STATUS === 'LEAVE' || emp.LEAVE_TYPE) return 'leave';
  
  // Priority 1.5: If there is an update time (SERVER_TIME or LAST_LOCATION_TIME), check if it is over 1 hour ago
  // If no recent data from the last 1 hour, show as HIBERNATE
  const updateTime = emp.SERVER_TIME || emp.LAST_LOCATION_TIME;
  if (updateTime) {
    const lastUpdate = new Date(updateTime);
    const now = new Date();
    const diffMs = now.getTime() - lastUpdate.getTime();
    const ONE_HOUR = 3600000;
    
    if (diffMs >= ONE_HOUR) {
      return 'hibernate';
    }
  }
  
  // Priority 2: Use the server-calculated status if available
  // The server uses SYSDATE vs APPLY_DATE_TIME which is the most accurate
  if (emp.LOCATION_STATUS) {
    const status = String(emp.LOCATION_STATUS).toUpperCase();
    if (status.includes('YES') || status === 'ACTIVE' || status.includes('ACTIVE TRACKING')) return 'active';
    if (status.includes('NO') || status === 'HIBERNATE') return 'hibernate';
    if (status === 'LEAVE') return 'leave';
  }

  // Priority 3: Fallback client-side time check if server status is missing
  // SERVER_TIME is NVL(L.SERVER_TIME, A.FULL_IN_TIME)
  if (emp.SERVER_TIME) {
    const lastUpdate = new Date(emp.SERVER_TIME);
    const now = new Date();
    const diffMs = now.getTime() - lastUpdate.getTime();
    const ONE_HOUR = 3600000;
    
    // If update is within 1 hour, it's active
    if (diffMs >= 0 && diffMs < ONE_HOUR) return 'active';
    return 'hibernate';
  }

  // Priority 4: No IN_TIME means they haven't started yet today (Inactive/Leave)
  if (!emp.IN_TIME) return 'leave';
  
  return 'hibernate';
};
