
export interface MovementPoint {
  lat: number;
  lng: number;
  time: string;
  remarks?: string;
  address?: string;
  source?: string;
  name?: string;
}

export interface Employee {
  EMP_ID: string;
  EMP_NAME: string;
  EMP_LEVEL: string;
  DIV_CODE: string;
  NH_CODE?: string;
  NH_NAME?: string;
  ZONE_CODE?: string;
  ZONE_NAME?: string;
  REGION_CODE?: string;
  REGION_NAME?: string;
  AREA_CODE?: string;
  AREA_NAME?: string;
  TERR_CODE?: string;
  TERR_NAME?: string;
  IN_TIME?: string | null;
  OUT_TIME?: string | null;
  SERVER_TIME?: string | null;
  GEO_LAT?: string | null;
  GEO_LONG?: string | null;
  IN_LAT?: string | null;
  IN_LONG?: string | null;
}

export interface LocationData {
  id: string;
  name: string;
  level: string;
  div: string;
  nhName?: string;
  zoneName?: string;
  regionName?: string;
  areaName?: string;
  territoryName?: string;
  history?: MovementPoint[];
  current?: MovementPoint;
  start?: MovementPoint;
  lat: number;
  lng: number;
  startDate?: string;
  endDate?: string;
}

export interface POI {
  ID: string;
  NAME: string;
  ADDRESS: string;
  LAT: string;
  LNG: string;
  TYPE: 'HOSPITAL' | 'CUSTOMER';
}
