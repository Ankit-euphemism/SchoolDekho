export interface School {
  id: string;
  name: string;
}

export type SchoolType = 'primary' | 'secondary' | 'international';
export type SchoolBoard = 'CBSE' | 'ICSE' | 'IB' | 'state';

export interface SchoolLocation {
  lat: number;
  lng: number;
}

export interface NearbySchool extends School {
  address: string;
  type: SchoolType;
  board: SchoolBoard;
  averageRating: number;
  reviewCount: number;
  facilities: string[];
  photos: string[];
  distance: number;
  location: SchoolLocation;
}

export interface NearbySchoolFilters {
  types: SchoolType[];
  board: SchoolBoard | 'all';
  minRating: number;
  radiusKm: number;
  facilities: string[];
}