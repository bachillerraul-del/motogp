import React from 'react';
import type { Rider } from '../types';
import { ChartBarIcon } from './Icons';

interface RiderWithScore extends Rider {
    score: number;
}

interface RiderLeaderboardProps {
    riders: RiderWithScore[];
    onRiderClick: (rider: RiderWithScore) => void;
}

const getRankStyle = (index: number) => {
    if (index === 0) return 'border-l-4 border-yellow-400';
    if (index === 1) return 'border-l-4 border-gray-400';
    if (index === 2) return 'border-l-4 border-yellow-700';
    return 'border-l-4 border-transparent';
};

export const RiderLeaderboard: React.FC<RiderLeaderboardProps> = ({ riders, onRiderClick }) => {
    return (
        <aside className="w-full lg:w-1/4">
            <div className="bg-gray-800 p-4 rounded-lg shadow-lg sticky top-24 space-y-4">
                <div className="flex items-center gap-3">
                    <ChartBarIcon className="w-6 h-6 text-red-500" />
                    <h2 className="text-xl font-bold">Clasificación de Pilotos</h2>
                </div>

                <div className="max-h-[65vh] overflow-y-auto pr-2 space-y-2">
                     {riders.length === 0 ? (
                        <div className="text-center py-10">
                            <p className="text-gray-400">No hay datos de puntos de pilotos.</p>
                        </div>
                    ) : (
                        riders.map((rider, index) => (
                            <div 
                                key={rider.id} 
                                className={`bg-gray-900/70 rounded-md p-2 flex items-center justify-between transition-all duration-200 hover:bg-gray-900 cursor-pointer ${getRankStyle(index)}`}
                                onClick={() => onRiderClick(rider)}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <span className="font-bold text-gray-400 w-6 text-center">{index + 1}</span>
                                    <div className="flex-1 truncate">
                                        <p className="font-semibold text-white truncate">{rider.name}</p>
                                        <p className="text-xs text-gray-500 truncate">{rider.team}</p>
                                    </div>
                                </div>
                                <div className="font-bold text-lg text-yellow-300 ml-2">
                                    {rider.score}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </aside>
    );
};