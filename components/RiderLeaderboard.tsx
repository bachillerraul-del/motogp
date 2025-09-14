import React, { useMemo } from 'react';
import type { Rider, Sport } from '../types';
import { ChartBarIcon } from './Icons';
import { useFantasy } from '../contexts/FantasyDataContext';
import { getLatestTeam } from '../lib/utils';

interface RiderWithScore extends Rider {
    score: number;
    selectionPercent: number;
    value: number;
}

interface RiderLeaderboardProps {
    sport: Sport;
    leaderboardView: number | 'general';
    onSelectRider: (rider: Rider) => void;
    currencyPrefix: string;
    currencySuffix: string;
}

const getRankStyle = (index: number) => {
    if (index === 0) return 'border-l-4 border-yellow-400';
    if (index === 1) return 'border-l-4 border-gray-400';
    if (index === 2) return 'border-l-4 border-yellow-700';
    return 'border-l-4 border-transparent';
};

export const RiderLeaderboard: React.FC<RiderLeaderboardProps> = ({ sport, leaderboardView, onSelectRider, currencyPrefix, currencySuffix }) => {
    const { riders, allRiderPoints, participants, races, teamSnapshots } = useFantasy();

    const sortedRiders = useMemo(() => {
        const riderScores: Record<number, number> = {};
        if (leaderboardView === 'general') {
            Object.values(allRiderPoints).forEach(roundPoints => {
                Object.entries(roundPoints).forEach(([riderId, pointsData]) => {
                    riderScores[Number(riderId)] = (riderScores[Number(riderId)] || 0) + pointsData.total;
                });
            });
        } else {
            const selectedRoundPoints = allRiderPoints[leaderboardView] || {};
            Object.entries(selectedRoundPoints).forEach(([riderId, pointsData]) => {
                riderScores[Number(riderId)] = pointsData.total;
            });
        }

        const riderSelectionCounts = new Map<number, number>();
        const participantsWithTeams = participants.filter(p => getLatestTeam(p.id, races, teamSnapshots).riderIds.length > 0);
        participantsWithTeams.forEach(p => {
            getLatestTeam(p.id, races, teamSnapshots).riderIds.forEach(id => {
                riderSelectionCounts.set(id, (riderSelectionCounts.get(id) || 0) + 1);
            });
        });

        return riders
            .map(rider => {
                const score = riderScores[rider.id] || 0;
                const selectionCount = riderSelectionCounts.get(rider.id) || 0;
                const selectionPercent = participantsWithTeams.length > 0 ? (selectionCount / participantsWithTeams.length) * 100 : 0;
                const priceForValue = sport === 'f1' ? (rider.price / 10) : rider.price;
                const value = priceForValue > 0 ? score / priceForValue : 0;

                return { ...rider, score, selectionPercent, value };
            })
            .sort((a, b) => b.score - a.score);
    }, [allRiderPoints, riders, leaderboardView, participants, races, teamSnapshots, sport]);

    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
            <div className="space-y-2">
                 {riders.length === 0 ? (
                    <div className="text-center py-10"><p className="text-gray-400">No hay datos de puntos de pilotos.</p></div>
                ) : (
                    sortedRiders.map((rider, index) => (
                        <div 
                            key={rider.id} 
                            className={`bg-gray-900/70 rounded-md p-3 transition-all duration-200 hover:bg-gray-900 cursor-pointer ${getRankStyle(index)}`}
                            onClick={() => onSelectRider(rider)}
                            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectRider(rider)}
                            role="button" tabIndex={0} aria-label={`Ver detalles de ${rider.name}`}
                        >
                            <div className="flex items-center justify-between">
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
                            <div className="flex justify-end items-center gap-4 mt-2 text-xs text-gray-400 border-t border-gray-700/50 pt-2">
                                <span>Sel: <span className="font-bold text-white">{rider.selectionPercent.toFixed(1)}%</span></span>
                                <span>Valor: <span className="font-bold text-white">{rider.value.toFixed(2)}</span></span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};