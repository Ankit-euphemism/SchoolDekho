export const FACILITY_CATEGORIES: Record<string, string[]> = {
  Sports: ['Sports Ground', 'Swimming Pool', 'Sports Complex', 'Football', 'Cricket', 'Basketball', 'sports'],
  Academics: ['Science Lab', 'Computer Lab', 'Library', 'Math Lab'],
  'Arts & Culture': ['Music Room', 'Art Room', 'Theater', 'Dance Studio'],
  Amenities: ['Cafeteria', 'Auditorium', 'Gym', 'Health Center'],
  Transport: ['Bus', 'Transport', 'School Bus'],
};

export const FACILITY_OPTIONS = Object.values(FACILITY_CATEGORIES).flat();
