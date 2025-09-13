import React from 'react';
import type { Sport, View } from '../types';
import { HomeIcon, PlusCircleIcon, TrophyIcon, BookOpenIcon, ChartBarIcon } from './Icons';

type NavView = Extract<View, 'home' | 'builder' | 'results' | 'rules' | 'stats'>;

interface BottomNavProps {
    currentView: View;
    setView: (view: NavView) => void;
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
                label="Stats"
                icon={<ChartBarIcon className="w-6 h-6" />}
                isActive={currentView === 'stats'}
                onClick={() => setView('stats')}
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