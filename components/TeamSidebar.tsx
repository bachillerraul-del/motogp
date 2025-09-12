import React from 'react';
import type { Rider, Participant, Sport, Constructor } from '../types';
import { XCircleIcon, ExclamationTriangleIcon } from './Icons';

interface TeamSidebarProps {
    riders: Rider[];
    constructor: Constructor | null;
    onRemoveRider: (riderId: number) => void;
    onRemoveConstructor: () => void;
    budget: number;
    remainingBudget: number;
    riderLimit: number;
    constructorLimit: number;
    currentUser: Participant | null;
    newUserName: string | null;
    currencyPrefix: string;
    currencySuffix: string;
    isTeamValid: boolean;
    isSubmitting: boolean;
    submitButtonText: string;
    onSubmit: () => void;
    sport: Sport;
    onClose?: () => void;
}

export const TeamSidebar: React.FC<TeamSidebarProps> = ({
    riders,
    constructor,
    onRemoveRider,
    onRemoveConstructor,
    budget,
    remainingBudget,
    riderLimit,
    constructorLimit,
    currentUser,
    newUserName,
    currencyPrefix,
    currencySuffix,
    isTeamValid,
    isSubmitting,
    submitButtonText,
    onSubmit,
    sport,
    onClose
}) => {
    const isRiderTeamFull = riders.length === riderLimit;
    const isConstructorTeamFull = !!constructor;
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
        const messages = [];
        if (!isRiderTeamFull) {
            const ridersNeeded = riderLimit - riders.length;
            messages.push(`Debes seleccionar ${ridersNeeded} piloto${ridersNeeded > 1 ? 's' : ''} más.`);
        }
        if (!isConstructorTeamFull) {
            messages.push(`Debes seleccionar ${constructorLimit} escudería.`);
        }
        if (isBudgetExceeded) {
             return (
                <div className="flex items-center gap-2 text-red-500 bg-red-500/10 p-3 rounded-lg text-sm">
                    <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                    <span>Has excedido el presupuesto.</span>
                </div>
            );
        }
        if(messages.length > 0) {
            return (
                <div className="flex items-center gap-2 text-yellow-400 bg-yellow-400/10 p-3 rounded-lg text-sm">
                    <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                    <span>{messages.join(' ')}</span>
                </div>
            )
        }
        return null;
    };

    const teamNameColor = sport === 'f1' ? 'text-red-600' : 'text-orange-500';

    return (
        <aside className="bg-gray-800 p-4 rounded-lg shadow-lg relative space-y-4">
             {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 transition-colors z-10"
                    aria-label="Cerrar"
                >
                    <XCircleIcon className="w-6 h-6" />
                </button>
            )}
            <h2 className="text-2xl font-bold text-center border-b border-gray-700 pb-3">
                Tu Equipo: <span className={teamNameColor}>{teamName}</span>
            </h2>
            
            {renderBudgetStatus()}

            <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-2">
                {riders.length > 0 ? (
                    riders.map(rider => (
                        <div key={rider.id} className="bg-gray-700/50 p-2 rounded-md flex justify-between items-center animate-fadeIn">
                            <div>
                                <p className="font-semibold text-white text-sm">{rider.name}</p>
                                <p className="text-xs text-gray-400">{formatPrice(rider.price)}</p>
                            </div>
                             <button
                                onClick={() => onRemoveRider(rider.id)}
                                className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-600 transition-colors"
                                aria-label={`Eliminar a ${rider.name}`}
                            >
                                <XCircleIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ))
                ) : (
                    <div className="text-center py-4 text-gray-500">
                        <p className="text-sm">Selecciona pilotos de la lista.</p>
                    </div>
                )}
                {constructor && (
                     <div className="bg-gray-600/50 p-2 rounded-md flex justify-between items-center animate-fadeIn border-l-4 border-yellow-400">
                        <div>
                            <p className="font-semibold text-white text-sm">{constructor.name}</p>
                            <p className="text-xs text-gray-400">{formatPrice(constructor.price)} (Escudería)</p>
                        </div>
                            <button
                            onClick={onRemoveConstructor}
                            className="p-1 text-gray-400 hover:text-red-500 rounded-full hover:bg-gray-600 transition-colors"
                            aria-label={`Eliminar a ${constructor.name}`}
                        >
                            <XCircleIcon className="w-5 h-5" />
                        </button>
                    </div>
                )}
            </div>

            <div className="border-t border-gray-700 pt-4 space-y-2">
                <div className="flex justify-between items-center text-lg">
                    <span className="font-semibold text-gray-300">Pilotos:</span>
                    <span className={`font-bold ${isRiderTeamFull ? 'text-green-400' : 'text-yellow-400'}`}>
                        {riders.length}/{riderLimit}
                    </span>
                </div>
                 <div className="flex justify-between items-center text-lg">
                    <span className="font-semibold text-gray-300">Escudería:</span>
                    <span className={`font-bold ${isConstructorTeamFull ? 'text-green-400' : 'text-yellow-400'}`}>
                        {constructor ? 1 : 0}/{constructorLimit}
                    </span>
                </div>
                {renderValidationMessage()}
            </div>
            
            <button
                onClick={onSubmit}
                disabled={!isTeamValid || isSubmitting}
                className="w-full bg-green-600 text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors duration-300 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
                {isSubmitting ? 'Guardando...' : submitButtonText}
            </button>
        </aside>
    );
};