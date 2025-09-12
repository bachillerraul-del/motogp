import React, { useMemo } from 'react';
import type { Constructor, Race, Participant, TeamSnapshot, AllRiderPoints, Sport, Rider } from '../types';
import { getLatestTeam } from '../lib/utils';
import { ChevronLeftIcon, TrophyIcon, ArrowUpIcon, ArrowDownIcon, UsersIcon, ChartBarIcon } from './Icons';
import { useFantasy } from '../contexts/FantasyDataContext';

interface ConstructorDetailProps {
    constructorItem: Constructor;
    sport: Sport;
    onBack: () => void;
    currencyPrefix: string;
    currencySuffix: string;
}

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

export const ConstructorDetail: React.FC<ConstructorDetailProps> = (props) => {
    const { constructorItem, sport, onBack, currencyPrefix, currencySuffix } = props;
    const { races, allRiderPoints, participants, teamSnapshots, riders } = useFantasy();

    const theme = {
        primaryColor: sport === 'f1' ? 'text-red-500' : 'text-orange-500',
        primaryBorder: sport === 'f1' ? 'border-red-600' : 'border-orange-500',
    };

    const formatPrice = (price: number): string => {
        const value = currencySuffix === 'M' ? (price / 10).toFixed(1) : price.toLocaleString('es-ES');
        return `${currencyPrefix}${value}${currencySuffix}`;
    };

    const constructorRiderIds = useMemo(() => {
        return new Set(riders.filter(r => {
            if (r.constructor_id) {
                return r.constructor_id === constructorItem.id;
            }
            return r.team === constructorItem.name;
        }).map(r => r.id));
    }, [riders, constructorItem]);

    const calculateConstructorScoreForRace = (racePoints: Record<number, number>): number => {
        const constructorRiderPointsForRace = Object.entries(racePoints)
            .filter(([riderId]) => constructorRiderIds.has(Number(riderId)))
            .map(([, points]) => points)
            .sort((a, b) => b - a);

        if (constructorRiderPointsForRace.length === 0) return 0;

        const top1 = constructorRiderPointsForRace[0] || 0;
        const top2 = constructorRiderPointsForRace[1] || 0;
        return (top1 + top2) / 2;
    };

    const stats = useMemo(() => {
        const totalPoints = Object.values(allRiderPoints).reduce((total, racePoints) => {
            return total + calculateConstructorScoreForRace(racePoints);
        }, 0);

        const selectionCount = participants.filter(p => {
            const { constructorId } = getLatestTeam(p.id, races, teamSnapshots);
            return constructorId === constructorItem.id;
        }).length;

        const selectionPercentage = participants.length > 0 ? (selectionCount / participants.length) * 100 : 0;
        const priceChange = constructorItem.price - constructorItem.initial_price;

        return { totalPoints: Math.round(totalPoints), selectionPercentage, priceChange };
    }, [constructorItem, allRiderPoints, participants, teamSnapshots, races, calculateConstructorScoreForRace]);

    const pointsByRace = useMemo(() => {
        return [...races]
            .map(race => ({
                race,
                points: Math.round(calculateConstructorScoreForRace(allRiderPoints[race.id] || {}))
            }))
            .filter(item => item.points > 0)
            .sort((a, b) => b.points - a.points);
    }, [races, allRiderPoints, calculateConstructorScoreForRace]);
    
    const constructorRidersList = useMemo(() => 
        riders.filter(r => constructorRiderIds.has(r.id))
    , [riders, constructorRiderIds]);

    return (
        <div className="animate-fadeIn max-w-4xl mx-auto">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-300 hover:text-white mb-4">
                <ChevronLeftIcon className="w-5 h-5" />
                Volver
            </button>

            <header className="bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
                <div className="flex flex-col sm:flex-row gap-6 items-center">
                    <div className="flex-grow text-center sm:text-left">
                        <h1 className="text-4xl font-bold text-white">{constructorItem.name}</h1>
                        <p className={`text-lg font-semibold ${theme.primaryColor}`}>Escudería / Constructor</p>
                    </div>
                    <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                        <p className="text-sm text-gray-400 uppercase">Precio Actual</p>
                        <p className="text-4xl font-bold text-white">{formatPrice(constructorItem.price)}</p>
                    </div>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatCard title="Puntos Totales" value={stats.totalPoints} icon={<TrophyIcon className="w-8 h-8"/>}/>
                <StatCard title="Selección en Liga" value={`${stats.selectionPercentage.toFixed(1)}%`} icon={<UsersIcon className="w-8 h-8"/>}/>
                <StatCard
                    title="Variación de Precio"
                    value={
                        <span className={stats.priceChange > 0 ? 'text-green-400' : stats.priceChange < 0 ? 'text-red-500' : 'text-white'}>
                            {stats.priceChange !== 0 && (
                                stats.priceChange > 0 
                                ? <ArrowUpIcon className="w-5 h-5 inline-block mr-1"/> 
                                : <ArrowDownIcon className="w-5 h-5 inline-block mr-1"/>
                            )}
                            {formatPrice(Math.abs(stats.priceChange))}
                        </span>
                    }
                    icon={<ChartBarIcon className="w-8 h-8"/>}
                />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                    <h2 className="text-2xl font-bold text-white mb-4">Puntos por Jornada</h2>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {pointsByRace.length > 0 ? pointsByRace.map(({ race, points }) => (
                            <div key={race.id} className="bg-gray-900/50 p-3 rounded-md flex justify-between items-center">
                                <p className="font-semibold text-gray-200">{race.gp_name}</p>
                                <p className="font-bold text-lg text-yellow-300">{points} pts</p>
                            </div>
                        )) : (
                            <p className="text-center text-gray-500 py-6">Esta escudería aún no ha conseguido puntos.</p>
                        )}
                    </div>
                </div>
                 <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                    <h2 className="text-2xl font-bold text-white mb-4">Pilotos del Equipo</h2>
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                        {constructorRidersList.length > 0 ? constructorRidersList.map(rider => (
                            <div key={rider.id} className="bg-gray-900/50 p-3 rounded-md">
                                <p className="font-bold text-white truncate">{rider.name}</p>
                                <p className="text-sm text-gray-400 truncate">{formatPrice(rider.price)}</p>
                            </div>
                        )) : (
                            <p className="text-center text-gray-500 py-6">No se encontraron pilotos para esta escudería.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};