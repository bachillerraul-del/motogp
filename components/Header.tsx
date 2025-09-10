import React from 'react';
import { MotoIcon, LoginIcon, LogoutIcon, ShieldCheckIcon, HomeIcon, UserIcon, F1Icon, ArrowsRightLeftIcon } from './Icons';
import type { Participant, Sport } from '../types';

interface HeaderProps {
    currentView: 'home' | 'builder' | 'results';
    setView: (view: 'home' | 'builder' | 'results') => void;
    isAdmin: boolean;
    onAdminLogin: () => void;
    onAdminLogout: () => void;
    currentUser: Participant | null;
    onUserLogout: () => void;
    sport: Sport;
    onSwitchSport: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, setView, isAdmin, onAdminLogin, onAdminLogout, currentUser, onUserLogout, sport, onSwitchSport }) => {
    
    const navButtonStyle = "px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 flex items-center gap-2 whitespace-nowrap";
    const activeButtonStyle = "bg-red-600 text-white";
    const inactiveButtonStyle = "text-gray-300 hover:bg-gray-700 hover:text-white";

    const SportIcon = sport === 'f1' ? F1Icon : MotoIcon;
    const sportName = sport === 'f1' ? 'F1' : 'MotoGP';

    return (
        <header className="bg-gray-800 shadow-lg shadow-red-600/20 sticky top-0 z-20">
            <div className="container mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
                <button
                    onClick={onSwitchSport}
                    className="flex items-center gap-3 p-2 -m-2 rounded-lg transition-colors duration-200 hover:bg-gray-700 group"
                    aria-label={`Cambiar a ${sport === 'motogp' ? 'Formula 1' : 'MotoGP'}`}
                >
                    <SportIcon className="text-3xl"/>
                    <div className="flex items-center">
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white uppercase hidden sm:block">
                            <span className="text-red-600">{sportName}</span> Fantasy
                        </h1>
                         <ArrowsRightLeftIcon className="w-5 h-5 ml-3 text-gray-500 transition-colors group-hover:text-gray-300 hidden sm:block"/>
                    </div>
                </button>

                <div className="flex items-center flex-wrap justify-end gap-y-2 gap-x-2 md:gap-x-4">
                    <nav className="flex items-center space-x-2 bg-gray-900 p-1 rounded-lg">
                        <button 
                            onClick={() => setView('home')}
                            className={`${navButtonStyle} ${currentView === 'home' ? activeButtonStyle : inactiveButtonStyle}`}
                        >
                            <HomeIcon className="w-5 h-5" />
                            <span className="hidden sm:inline">Inicio</span>
                        </button>
                        <button 
                            onClick={() => setView('builder')}
                            className={`${navButtonStyle} ${currentView === 'builder' ? activeButtonStyle : inactiveButtonStyle}`}
                        >
                            Crear Equipo
                        </button>
                        <button 
                            onClick={() => setView('results')}
                            className={`${navButtonStyle} ${currentView === 'results' ? activeButtonStyle : inactiveButtonStyle}`}
                        >
                            Resultados
                        </button>
                    </nav>

                    {currentUser && (
                         <div className="flex items-center space-x-2 bg-gray-900 p-1 rounded-lg">
                            <span className="flex items-center text-gray-300 px-3 py-1.5 text-sm whitespace-nowrap">
                                <UserIcon className="w-5 h-5 mr-2" />
                                {currentUser.name}
                            </span>
                            <button onClick={onUserLogout} className="text-gray-300 hover:bg-gray-700 hover:text-white p-2 rounded-md" aria-label="Cerrar sesión">
                                <LogoutIcon className="w-5 h-5" />
                            </button>
                        </div>
                    )}

                    {isAdmin ? (
                        <div className="flex items-center space-x-2 bg-gray-900 p-1 rounded-lg">
                            <span className="flex items-center text-green-400 px-3 py-1.5 text-sm whitespace-nowrap">
                                <ShieldCheckIcon className="w-5 h-5 mr-2" />
                                Modo Admin
                            </span>
                             <button onClick={onAdminLogout} className="text-gray-300 hover:bg-gray-700 hover:text-white p-2 rounded-md" aria-label="Cerrar sesión de administrador">
                                <LogoutIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        <button onClick={onAdminLogin} className={`${inactiveButtonStyle} ${navButtonStyle}`}>
                            <LoginIcon className="w-5 h-5 mr-2" />
                            Admin Login
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};