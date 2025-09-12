import React, { createContext, useContext } from 'react';
import { useFantasyData } from '../hooks/useFantasyData';
import type { Sport } from '../types';

// The return type of useFantasyData hook defines the context's value shape.
type FantasyDataContextType = ReturnType<typeof useFantasyData>;

// Create the context with a default null value.
const FantasyDataContext = createContext<FantasyDataContextType | null>(null);

// Create the provider component.
export const FantasyDataProvider: React.FC<{ children: React.ReactNode; sport: Sport | null }> = ({ children, sport }) => {
  const data = useFantasyData(sport);
  return (
    <FantasyDataContext.Provider value={data}>
      {children}
    </FantasyDataContext.Provider>
  );
};

// Create a custom hook for easy consumption of the context.
export const useFantasy = () => {
  const context = useContext(FantasyDataContext);
  if (context === null) {
    throw new Error('useFantasy must be used within a FantasyDataProvider');
  }
  return context;
};
