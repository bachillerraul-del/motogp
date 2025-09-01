import React from 'react';
import { MotoIcon, LoginIcon, LogoutIcon, ShieldCheckIcon } from './Icons';

interface HeaderProps {
    currentView: 'builder' | 'results';
    setView: (view: 'builder' | 'results') => void;
    isAdmin: boolean;
    onAdminLogin: () => void;
    onAdminLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentView, setView, isAdmin, onAdminLogin, onAdminLogout }) => {
    
    const navButtonStyle = "px-4 py-2 rounded-md text-sm font-medium transition-colors duration-200";
    const activeButtonStyle = "bg-red-600 text-white";
    const inactiveButtonStyle = "text-gray-300 hover:bg-gray-700 hover:text-white";

    return (
        <header className="bg-gray-800 shadow-lg shadow-red-600/20 sticky top-0 z-20">
            <div className="container mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
                <div className="flex items-center">
                    <MotoIcon className="w-8 h-8 text-red-600 mr-3"/>
                    <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white uppercase hidden sm:block">
                        <span className="text-red-600">MotoGP</span> Fantasy
                    </h1>
                </div>

                <div className="flex items-center space-x-2 md:space-x-4">
                    <nav className="flex items-center space-x-2 bg-gray-900 p-1 rounded-lg">
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

                    {isAdmin ? (
                        <div className="flex items-center space-x-2 bg-gray-900 p-1 rounded-lg">
                            <span className="flex items-center text-green-400 px-3 py-1.5 text-sm">
                                <ShieldCheckIcon className="w-5 h-5 mr-2" />
                                Modo Admin
                            </span>
                             <button onClick={onAdminLogout} className="text-gray-300 hover:bg-gray-700 hover:text-white p-2 rounded-md" aria-label="Cerrar sesión de administrador">
                                <LogoutIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        <button onClick={onAdminLogin} className={`${inactiveButtonStyle} ${navButtonStyle} flex items-center`}>
                            <LoginIcon className="w-5 h-5 mr-2" />
                            Admin Login
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};