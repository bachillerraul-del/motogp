import React from 'react';
import { MotoIcon, LoginIcon, LogoutIcon, UserIcon, F1Icon } from './Icons';
import type { Participant, Sport } from '../types';

interface HeaderProps {
    currentView: 'home' | 'builder' | 'results' | 'rules';
    isAdmin: boolean;
    onAdminLogin: () => void;
    onAdminLogout: () => void;
    currentUser: Participant | null;
    onUserLogout: () => void;
    sport: Sport;
    onSwitchSport: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, isAdmin, onAdminLogin, onAdminLogout, currentUser, onUserLogout, sport, onSwitchSport }) => {
    
    const SportIcon = sport === 'f1' ? F1Icon : MotoIcon;

    const viewTitles = {
        home: 'Inicio',
        builder: 'Crear Equipo',
        results: 'Resultados',
        rules: 'Reglas del Juego'
    };

    return (
        <header className={`bg-gray-800 shadow-md ${sport === 'f1' ? 'shadow-red-600/20' : 'shadow-orange-500/20'} p-3 sticky top-0 z-20`}>
            <div className="container mx-auto flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={onSwitchSport}
                        className="p-2 -m-2 rounded-full transition-colors duration-200 hover:bg-gray-700 group"
                        aria-label={`Cambiar a ${sport === 'motogp' ? 'Formula 1' : 'MotoGP'}`}
                    >
                        <SportIcon className="text-3xl"/>
                    </button>
                    <h1 className="text-xl font-bold text-white whitespace-nowrap">
                        {viewTitles[currentView]}
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    {currentUser && (
                         <div className="flex items-center gap-2 bg-gray-900/50 p-1 rounded-full">
                            <span className="flex items-center text-gray-300 pl-2 text-sm whitespace-nowrap">
                                <UserIcon className="w-5 h-5 mr-1.5" />
                                <span className="hidden sm:inline">{currentUser.name}</span>
                            </span>
                            <button onClick={onUserLogout} className="text-gray-300 hover:bg-gray-700 hover:text-white p-1.5 rounded-full" aria-label="Cerrar sesión">
                                <LogoutIcon className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {isAdmin ? (
                        <div className="flex items-center gap-2 bg-green-900/50 p-1 rounded-full text-green-400">
                             <span className="pl-2 text-sm hidden sm:inline">Admin</span>
                             <button onClick={onAdminLogout} className="hover:bg-gray-700 hover:text-white p-1.5 rounded-full" aria-label="Cerrar sesión de administrador">
                                <LogoutIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        currentUser === null && (
                            <button onClick={onAdminLogin} className="text-gray-300 hover:bg-gray-700 hover:text-white p-1.5 rounded-full">
                                <LoginIcon className="w-5 h-5" />
                            </button>
                        )
                    )}
                </div>
            </div>
        </header>
    );
};