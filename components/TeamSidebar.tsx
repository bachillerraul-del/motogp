import React from 'react';
import type { Rider, Participant } from '../types';
import { XCircleIcon, ExclamationTriangleIcon } from './Icons';

interface TeamSidebarProps {
    team: Rider[];
    onRemove: (riderId: number) => void;
    budget: number;
    remainingBudget: number;
    teamSize: number;
    currentUser: Participant | null;
    newUserName: string | null;
    currencyPrefix: string;
    currencySuffix: string;
}

export const TeamSidebar: React.FC<TeamSidebarProps> = ({
    team,
    onRemove,
    budget,
    remainingBudget,
    teamSize,
    currentUser,
    newUserName,
    currencyPrefix,
    currencySuffix,
}) => {
    const isTeamFull = team.length === teamSize;
    const isBudgetExceeded = remainingBudget < 0;
    const teamName = currentUser?.name || newUserName || 'Nuevo Participante';
    
    const formatPrice = (price: number): string => {
        const value = currencySuffix === 'M' ? (price / 10).toFixed(1) : price.toLocaleString('es-ES');
        return `${currencyPrefix}${value}${currencySuffix}`;
    }

    const renderBudgetStatus = () => {
        const remainingStyle = isBudgetExceeded ? "text-red-500 font-bold animate-pulse" : "text-green-400 font-bold";
        return (
            <div className="bg-gray-900/50 p-4 rounded-lg">
                <div className="flex justify-between items-baseline mb-1">
                    <span className="text-gray-400">Presupuesto Total:</span>
                    <span className="font-semibold text-white">{formatPrice(budget)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                    <span className="text-gray-400">Restante:</span>
                    <span className={remainingStyle}>{formatPrice(remainingBudget)}</span>
                </div>
            </div>
        );
    };

    const renderValidationMessage = () => {
        if (!isTeamFull) {
            return (
                <div className="flex items-center gap-2 text-yellow-400 bg-yellow-400/10 p-3 rounded-lg text-sm">
                    <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                    <span>Debes seleccionar {teamSize - team.length} piloto{teamSize - team.length > 1 ? 's' : ''} más.</span>
                </div>
            );
        }
        if (isBudgetExceeded) {
             return (
                <div className="flex items-center gap-2 text-red-500 bg-red-500/10 p-3 rounded-lg text-sm">
                    <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                    <span>Has excedido el presupuesto.</span>
                </div>
            );
        }
        return null;
    };

    return (
        <aside className="bg-gray-800 p-4 rounded-lg shadow-lg sticky top-24 space-y-4">
            <h2 className="text-2xl font-bold text-center border-b border-gray-700 pb-3">
                Tu Equipo: <span className="text-red-600">{teamName}</span>
            </h2>
            
            {renderBudgetStatus()}

            <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-2">
                {team.length > 0 ? (
                    team.map(rider => (
                        <div key={rider.id} className="bg-gray-700/50 p-2 rounded-md flex justify-between items-center animate-fadeIn">
                            <div>
                                <p className="font-semibold text-white text-sm">{rider.name}</p>
                                <p className="text-xs text-gray-400">{formatPrice(rider.price)}</p>
                            </div>
                             <button
                                onClick={() => onRemove(rider.id)}
                                className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-600 transition-colors"
                                aria-label={`Eliminar a ${rider.name}`}
                            >
                                <XCircleIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-8 text-gray-500">
                        <p>Tu equipo está vacío.</p>
                        <p className="text-sm">Selecciona pilotos de la lista.</p>
                    </div>
                )}
            </div>

            <div className="border-t border-gray-700 pt-4 space-y-2">
                <div className="flex justify-between items-center text-lg">
                    <span className="font-semibold text-gray-300">Pilotos:</span>
                    <span className={`font-bold ${isTeamFull ? 'text-green-400' : 'text-yellow-400'}`}>
                        {team.length}/{teamSize}
                    </span>
                </div>
                {renderValidationMessage()}
            </div>
        </aside>
    );
};
