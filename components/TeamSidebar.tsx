import React from 'react';
import type { Rider, Participant, Sport, Constructor } from '../types';
import { XCircleIcon, ExclamationTriangleIcon, CheckIcon, ArrowPathIcon } from './Icons';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

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
    sport: Sport;
    saveState: SaveState;
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
    sport,
    saveState,
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
    
    const renderStatusFooter = () => {
        if (saveState === 'saving') return <div className="flex items-center justify-center gap-2 text-center text-sm text-yellow-400 p-3 bg-yellow-500/10 rounded-lg"><ArrowPathIcon className="w-4 h-4 animate-spin" /> Guardando...</div>;
        if (saveState === 'saved') return <div className="flex items-center justify-center gap-2 text-center text-sm text-green-400 p-3 bg-green-500/10 rounded-lg animate-fadeIn"><CheckIcon className="w-4 h-4" /> Equipo guardado</div>;
        if (saveState === 'error') return <div className="flex items-center justify-center gap-2 text-center text-sm text-red-500 p-3 bg-red-500/10 rounded-lg"><ExclamationTriangleIcon className="w-4 h-4" /> Error al guardar</div>;

        const validationMessages = [];
        if (!isRiderTeamFull) {
            const ridersNeeded = riderLimit - riders.length;
            validationMessages.push(`Falta${ridersNeeded > 1 ? 'n' : ''} ${ridersNeeded} piloto${ridersNeeded > 1 ? 's' : ''}.`);
        }
        if (!isConstructorTeamFull) {
            validationMessages.push(`Falta ${constructorLimit} escudería.`);
        }
        if (isBudgetExceeded) {
             return (
                <div className="flex items-center gap-2 text-red-500 bg-red-500/10 p-3 rounded-lg text-sm">
                    <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                    <span>Has excedido el presupuesto.</span>
                </div>
            );
        }
        if(validationMessages.length > 0) {
            return (
                <div className="flex items-center gap-2 text-yellow-400 bg-yellow-400/10 p-3 rounded-lg text-sm">
                    <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0" />
                    <span>{validationMessages.join(' ')}</span>
                </div>
            )
        }
        
        if (isTeamValid) {
             return <div className="flex items-center justify-center gap-2 text-center text-sm text-green-400 p-3 bg-green-500/10 rounded-lg"><CheckIcon className="w-4 h-4" /> ¡Equipo listo para competir!</div>;
        }

        return null; // Should not be reached if logic is correct
    };

    const teamNameColor = sport === 'f1' ? 'text-red-600' : 'text-orange-500';

    return (
        <aside className="bg-gray-800 p-4 rounded-lg shadow-lg relative flex flex-col h-full">
             {onClose && (
                <button
                    onClick={onClose}
                    className="absolute top-2 right-2 p-2 text-gray-400 hover:text-white rounded-full hover:bg-gray-700 transition-colors z-10"
                    aria-label="Cerrar"
                >
                    <XCircleIcon className="w-6 h-6" />
                </button>
            )}
            <h2 className="text-2xl font-bold text-center border-b border-gray-700 pb-3 mb-3">
                Tu Equipo: <span className={teamNameColor}>{teamName}</span>
            </h2>
            
            <div className="space-y-2 overflow-y-auto pr-2 flex-grow mb-3">
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
                     <div className="flex items-center justify-center h-full text-center text-gray-500">
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

            <div className="border-t border-gray-700 pt-3 space-y-3 mt-auto">
                 <div className="bg-gray-900/50 p-3 rounded-lg flex justify-between items-center text-sm">
                    <div className="text-center">
                        <span className="font-semibold text-gray-300">Pilotos</span>
                        <p className={`font-bold ${isRiderTeamFull ? 'text-green-400' : 'text-yellow-400'}`}>
                            {riders.length}/{riderLimit}
                        </p>
                    </div>
                    <div className="text-center">
                        <span className="font-semibold text-gray-300">Escudería</span>
                         <p className={`font-bold ${isConstructorTeamFull ? 'text-green-400' : 'text-yellow-400'}`}>
                            {constructor ? 1 : 0}/{constructorLimit}
                        </p>
                    </div>
                    <div className="text-center">
                        <span className="font-semibold text-gray-300">Restante</span>
                        <p className={`font-bold ${isBudgetExceeded ? 'text-red-500' : 'text-green-400'}`}>
                           {formatPrice(remainingBudget)}
                        </p>
                    </div>
                </div>
                {renderStatusFooter()}
            </div>
        </aside>
    );
};