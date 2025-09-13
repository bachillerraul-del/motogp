import React from 'react';
import type { Rider, Sport } from '../types';
import { PlusIcon, ArrowUpIcon, ArrowDownIcon, CheckIcon, RemoveIcon } from './Icons';

interface RiderCardProps {
    rider: Rider;
    onAdd: (rider: Rider) => void;
    onSelect: (rider: Rider) => void;
    isRiderTeamFull: boolean;
    isAffordable: boolean;
    isInTeam: boolean;
    selectedByTeams: string[];
    priceChange: number;
    currencyPrefix: string;
    currencySuffix: string;
    sport: Sport;
}

export const RiderCard: React.FC<RiderCardProps> = ({ rider, onAdd, onSelect, isRiderTeamFull, isAffordable, isInTeam, selectedByTeams, priceChange, currencyPrefix, currencySuffix, sport }) => {
    const isSelectable = !rider.condition?.includes('unavailable') && !rider.condition?.includes('injured');

    const formatPrice = (price: number): string => {
        const value = currencySuffix === 'M' ? (price / 10).toFixed(1) : price.toLocaleString('es-ES');
        return `${currencyPrefix}${value}${currencySuffix}`;
    }

    const getButtonText = () => {
        if (isInTeam) return 'Quitar del Equipo';
        if (!isSelectable) return 'No Disponible';
        if (isRiderTeamFull) return 'Equipo Lleno';
        if (!isAffordable) return 'Excede Presupuesto';
        return 'Añadir al Equipo';
    };

    const renderDynamicCondition = () => {
        if (rider.condition?.includes('injured')) {
            return <p className="text-sm text-red-400 font-semibold mb-4">🩹 {rider.condition}</p>;
        }
        if (rider.condition?.includes('unavailable')) {
            return <p className="text-sm text-gray-400 font-semibold mb-4">❌ {rider.condition}</p>;
        }
        if (selectedByTeams.length > 0) {
            const teamsList = selectedByTeams.join(', ');
            return (
                 <p className="text-sm text-yellow-400 font-semibold mb-4 animate-pulse">
                    🔥 En equipos: <span className="font-normal text-gray-300">{teamsList}</span>
                </p>
            );
        }
        return <div className="mb-4 h-5"></div>; // Placeholder to maintain height
    };

    const buttonTheme = sport === 'f1'
        ? 'bg-red-600 hover:bg-red-700'
        : 'bg-orange-500 hover:bg-orange-600';
    
    const cardTheme = sport === 'f1'
        ? 'hover:shadow-red-600/30'
        : 'hover:shadow-orange-500/30';

    return (
        <div className={`bg-gray-800 rounded-lg shadow-lg p-4 flex flex-col justify-between transition-all duration-300 ${cardTheme} ${!isSelectable ? 'opacity-60' : ''} ${isInTeam ? 'ring-2 ring-green-500' : ''}`}>
            <div 
                className="cursor-pointer group"
                onClick={() => onSelect(rider)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(rider)}
                role="button"
                tabIndex={0}
                aria-label={`Ver detalles de ${rider.name}`}
            >
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="text-xl font-bold text-white group-hover:underline">{rider.name}</h3>
                        <p className="text-sm text-gray-400">{rider.team} / {rider.bike}</p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-lg font-semibold text-white">{formatPrice(rider.price)}</p>
                         {priceChange !== 0 && (
                            <span className={`text-xs font-bold flex items-center justify-end gap-1 ${priceChange > 0 ? 'text-green-400' : 'text-red-500'}`}>
                                {priceChange > 0 ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />}
                                <span>{formatPrice(Math.abs(priceChange))}</span>
                            </span>
                        )}
                    </div>
                </div>
                {renderDynamicCondition()}
            </div>
            <button
                onClick={() => onAdd(rider)}
                disabled={!isInTeam && (isRiderTeamFull || !isSelectable || !isAffordable)}
                className={`mt-auto w-full flex items-center justify-center text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300
                    ${isInTeam
                        ? 'bg-fuchsia-600 hover:bg-fuchsia-700'
                        : `${buttonTheme} disabled:bg-gray-600 disabled:cursor-not-allowed`
                    }
                `}
            >
                {isInTeam ? <RemoveIcon className="w-5 h-5 mr-2" /> : <PlusIcon className="w-5 h-5 mr-2" />}
                {getButtonText()}
            </button>
        </div>
    );
};