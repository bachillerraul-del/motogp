
import React from 'react';
import type { Rider } from '../types';
import { PlusIcon } from './Icons';

interface RiderCardProps {
    rider: Rider;
    onAdd: (rider: Rider) => void;
    isTeamFull: boolean;
    isAffordable: boolean;
}

const formatPrice = (price: number): string => `$${price.toFixed(2)}m`;

const formatPriceChange = (change: number): React.ReactNode => {
    if (change === 0) return null;
    const sign = change > 0 ? '+' : '';
    const color = change > 0 ? 'text-green-400' : 'text-red-400';
    return <span className={`ml-2 text-sm ${color}`}>({sign}${change}K)</span>;
};

const StatItem: React.FC<{ label: string; value: string | number }> = ({ label, value }) => (
    <div className="flex flex-col">
        <span className="text-xs text-gray-400 uppercase tracking-wider">{label}</span>
        <span className="text-xl font-bold text-white">{value}</span>
    </div>
);

const renderCondition = (condition?: string) => {
    if (!condition) return null;
    if (condition.includes('fire')) {
        return <p className="text-sm text-yellow-400 font-semibold mb-4 animate-pulse">🔥 {condition}</p>;
    }
    if (condition.includes('injured')) {
        return <p className="text-sm text-red-400 font-semibold mb-4">🩹 {condition}</p>;
    }
    if (condition.includes('unavailable')) {
        return <p className="text-sm text-gray-400 font-semibold mb-4">❌ {condition}</p>;
    }
    return null;
}


export const RiderCard: React.FC<RiderCardProps> = ({ rider, onAdd, isTeamFull, isAffordable }) => {
    const isSelectable = !rider.condition?.includes('unavailable') && !rider.condition?.includes('injured');

    const getButtonText = () => {
        if (!isSelectable) return 'No Disponible';
        if (isTeamFull) return 'Equipo Lleno';
        if (!isAffordable) return 'Excede Presupuesto';
        return 'Añadir al Equipo';
    };

    return (
        <div className={`bg-gray-800 rounded-lg shadow-lg p-4 flex flex-col justify-between transition-all duration-300 hover:shadow-red-600/30 ${!isSelectable ? 'opacity-60' : ''}`}>
            <div>
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="text-xl font-bold text-white">{rider.name}</h3>
                        <p className="text-sm text-gray-400">{rider.team} / {rider.bike}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <p className="text-lg font-semibold text-white">{formatPrice(rider.price)}</p>
                        <p>{formatPriceChange(rider.priceChange)}</p>
                    </div>
                </div>
                {renderCondition(rider.condition)}

                <div className="grid grid-cols-3 gap-4 my-4 text-center bg-gray-900/50 p-3 rounded-md">
                    <StatItem label="Total Pts" value={rider.totalPoints} />
                    <StatItem label="Podios" value={rider.totalPodiums} />
                    <div>
                         <span className="text-xs text-gray-400 uppercase tracking-wider">Últimas 3</span>
                         <p className="text-xl font-bold text-white">{rider.last3Races.join(' - ')}</p>
                    </div>
                </div>
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
