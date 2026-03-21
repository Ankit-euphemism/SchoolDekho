import { createContext, useState, type ReactNode } from 'react';
import type { School } from '../types/school';

interface CompareContextType {
  compareList: School[];
  addSchool: (school: School) => void;
  removeSchool: (id: string) => void;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

const MAX_COMPARE = 3;

export function CompareProvider({ children }: { children: ReactNode }) {
  const [compareList, setCompareList] = useState<School[]>([]);

  function addSchool(school: School) {
    setCompareList((prev) => {
      if (prev.length >= MAX_COMPARE) return prev;
      if (prev.some((s) => s.id === school.id)) return prev;
      return [...prev, school];
    });
  }

  function removeSchool(id: string) {
    setCompareList((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <CompareContext.Provider value={{ compareList, addSchool, removeSchool }}>
      {children}
    </CompareContext.Provider>
  );
}

export { CompareContext };
