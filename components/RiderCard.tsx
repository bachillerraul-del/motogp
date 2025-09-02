import React from 'react';
import type { Rider } from '../types';
import { PlusIcon } from './Icons';

interface RiderCardProps {
    rider: Rider;
    onAdd: (rider: Rider) => void;
    isTeamFull: boolean;
    isAffordable: boolean;
}

const formatPrice = (price: number): string => `€${price.toLocaleString('es-ES')}`;

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
                    </div>
                </div>
                {renderCondition(rider.condition)}
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