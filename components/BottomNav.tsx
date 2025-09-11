import React from 'react';
import type { Sport } from '../types';
import { HomeIcon, PlusCircleIcon, TrophyIcon, BookOpenIcon } from './Icons';

interface BottomNavProps {
    // FIX: Updated `currentView` to include 'riderDetail'. The parent component `App.tsx`
    // can be in a 'riderDetail' state, and this prop needs to accept it to avoid a type error.
    currentView: 'home' | 'builder' | 'results' | 'rules' | 'riderDetail';
    setView: (view: 'home' | 'builder' | 'results' | 'rules') => void;
    sport: Sport;
}

const NavItem: React.FC<{
    label: string;
    icon: React.ReactNode;
    isActive: boolean;
    onClick: () => void;
    activeColor: string;
}> = ({ label, icon, isActive, onClick, activeColor }) => (
    <button
        onClick={onClick}
        className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${isActive ? activeColor : 'text-gray-400'}`}
    >
        {icon}
        <span className="text-xs mt-1">{label}</span>
    </button>
);

export const BottomNav: React.FC<BottomNavProps> = ({ currentView, setView, sport }) => {
    const activeColor = sport === 'f1' ? 'text-red-500' : 'text-orange-500';

    return (
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-gray-800 border-t border-gray-700 flex justify-around items-center z-40">
            <NavItem
                label="Inicio"
                icon={<HomeIcon className="w-6 h-6" />}
                isActive={currentView === 'home'}
                onClick={() => setView('home')}
                activeColor={activeColor}
            />
            <NavItem
                label="Equipo"
                icon={<PlusCircleIcon className="w-6 h-6" />}
                isActive={currentView === 'builder'}
                onClick={() => setView('builder')}
                activeColor={activeColor}
            />
            <NavItem
                label="Resultados"
                icon={<TrophyIcon className="w-6 h-6" />}
                isActive={currentView === 'results'}
                onClick={() => setView('results')}
                activeColor={activeColor}
            />
            <NavItem
                label="Reglas"
                icon={<BookOpenIcon className="w-6 h-6" />}
                isActive={currentView === 'rules'}
                onClick={() => setView('rules')}
                activeColor={activeColor}
            />
        </nav>
    );
};