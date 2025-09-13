import React, { useMemo } from 'react';
import type { Constructor, Sport } from '../types';
import { useFantasy } from '../contexts/FantasyDataContext';
import { getLatestTeam } from '../lib/utils';
import { TrophyIcon, UsersIcon, ChartBarIcon, ArrowUpIcon, ArrowDownIcon } from './Icons';

const StatCard: React.FC<{ title: string; value: React.ReactNode; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-gray-900/50 p-4 rounded-lg">
        <div className="flex items-center gap-3">
            <div className="text-gray-400">{icon}</div>
            <div>
                <p className="text-sm text-gray-400">{title}</p>
                <p className="text-xl font-bold text-white">{value}</p>
            </div>
        </div>
    </div>
);

interface ConstructorStatsProps {
    constructorItem: Constructor;
    sport: Sport;
    currencyPrefix: string;
    currencySuffix: string;
}

export const ConstructorStats: React.FC<ConstructorStatsProps> = ({ constructorItem, sport, currencyPrefix, currencySuffix }) => {
    const { races, allRiderPoints, participants, teamSnapshots, riders } = useFantasy();

    const formatPrice = (price: number): string => {
        const value = currencySuffix === 'M' ? (price / 10).toFixed(1) : price.toLocaleString('es-ES');
        return `${currencyPrefix}${value}${currencySuffix}`;
    };

    const constructorRiderIds = useMemo(() => {
        return new Set(riders.filter(r => {
            if (r.constructor_id) return r.constructor_id === constructorItem.id;
            return r.team === constructorItem.name;
        }).map(r => r.id));
    }, [riders, constructorItem]);

    // FIX: Changed parameter type to handle RiderRoundPoints object and map to total points.
    const calculateConstructorScoreForRace = (racePoints: Record<number, { total: number }>): number => {
        const constructorRiderPointsForRace = Object.entries(racePoints)
            .filter(([riderId]) => constructorRiderIds.has(Number(riderId)))
            .map(([, points]) => points.total)
            .sort((a, b) => b - a);

        if (constructorRiderPointsForRace.length === 0) return 0;
        const top1 = constructorRiderPointsForRace[0] || 0;
        const top2 = constructorRiderPointsForRace[1] || 0;
        return (top1 + top2) / 2;
    };

    const stats = useMemo(() => {
        const totalPoints = Object.values(allRiderPoints).reduce((total, racePoints) => total + calculateConstructorScoreForRace(racePoints), 0);
        const selectionCount = participants.filter(p => getLatestTeam(p.id, races, teamSnapshots).constructorId === constructorItem.id).length;
        const selectionPercentage = participants.length > 0 ? (selectionCount / participants.length) * 100 : 0;
        const priceChange = constructorItem.price - constructorItem.initial_price;
        return { totalPoints: Math.round(totalPoints), selectionPercentage, priceChange };
    }, [constructorItem, allRiderPoints, participants, teamSnapshots, races, calculateConstructorScoreForRace]);

    const pointsByRace = useMemo(() => {
        return [...races]
            .map(race => ({ race, points: Math.round(calculateConstructorScoreForRace(allRiderPoints[race.id] || {})) }))
            .filter(item => item.points > 0)
            .sort((a, b) => b.points - a.points);
    }, [races, allRiderPoints, calculateConstructorScoreForRace]);

    const constructorRidersList = useMemo(() => riders.filter(r => constructorRiderIds.has(r.id)), [riders, constructorRiderIds]);

    return (
        <div className="animate-fadeIn max-w-4xl mx-auto text-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <StatCard title="Puntos Totales" value={stats.totalPoints} icon={<TrophyIcon className="w-6 h-6" />} />
                <StatCard title="Selección" value={`${stats.selectionPercentage.toFixed(1)}%`} icon={<UsersIcon className="w-6 h-6" />} />
                <StatCard
                    title="Variación Precio"
                    value={
                        <span className={stats.priceChange > 0 ? 'text-green-400' : stats.priceChange < 0 ? 'text-red-500' : 'text-white'}>
                            {stats.priceChange !== 0 && (stats.priceChange > 0 ? <ArrowUpIcon className="w-5 h-5 inline-block mr-1" /> : <ArrowDownIcon className="w-5 h-5 inline-block mr-1" />)}
                            {formatPrice(Math.abs(stats.priceChange))}
                        </span>
                    }
                    icon={<ChartBarIcon className="w-6 h-6" />}
                />
                <div className="bg-gray-900/50 p-4 rounded-lg">
                    <p className="text-sm text-gray-400">Precio Actual</p>
                    <p className="text-xl font-bold text-white">{formatPrice(constructorItem.price)}</p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-lg font-bold text-white mb-2">Pilotos del Equipo</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {constructorRidersList.length > 0 ? constructorRidersList.map(rider => (
                            <div key={rider.id} className="bg-gray-900/50 p-2 rounded-md"><p className="font-semibold truncate">{rider.name}</p></div>
                        )) : <p className="text-center text-gray-500 py-4">No se encontraron pilotos.</p>}
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white mb-2">Puntos por Jornada</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {pointsByRace.length > 0 ? pointsByRace.map(({ race, points }) => (
                            <div key={race.id} className="bg-gray-900/50 p-2 rounded-md flex justify-between items-center">
                                <p className="font-semibold text-gray-300 text-sm truncate">{race.gp_name}</p>
                                <p className="font-bold text-yellow-300">{points} pts</p>
                            </div>
                        )) : <p className="text-center text-gray-500 py-4">Sin puntos.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};
