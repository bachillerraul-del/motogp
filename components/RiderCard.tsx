import React from 'react';
import type { Rider } from '../types';
import { PlusIcon, ArrowUpIcon, ArrowDownIcon } from './Icons';

interface RiderCardProps {
    rider: Rider;
    onAdd: (rider: Rider) => void;
    isTeamFull: boolean;
    isAffordable: boolean;
    selectedByTeams: string[];
    priceChange: number;
    currencyPrefix: string;
    currencySuffix: string;
}

export const RiderCard: React.FC<RiderCardProps> = ({ rider, onAdd, isTeamFull, isAffordable, selectedByTeams, priceChange, currencyPrefix, currencySuffix }) => {
    const isSelectable = !rider.condition?.includes('unavailable') && !rider.condition?.includes('injured');

    const formatPrice = (price: number): string => {
        const value = currencySuffix === 'M' ? (price / 10).toFixed(1) : price.toLocaleString('es-ES');
        return `${currencyPrefix}${value}${currencySuffix}`;
    }

    const getButtonText = () => {
        if (!isSelectable) return 'No Disponible';
        if (isTeamFull) return 'Equipo Lleno';
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
        return null;
    };

    return (
        <div className={`bg-gray-800 rounded-lg shadow-lg p-4 flex flex-col justify-between transition-all duration-300 hover:shadow-red-600/30 ${!isSelectable ? 'opacity-60' : ''}`}>
            <div>
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="text-xl font-bold text-white">{rider.name}</h3>
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
                disabled={isTeamFull || !isSelectable || !isAffordable}
                className="mt-4 w-full flex items-center justify-center bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
                <PlusIcon className="w-5 h-5 mr-2" />
                {getButtonText()}
            </button>
        </div>
    );
};