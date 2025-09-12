import React, { useMemo } from 'react';
import type { Constructor, Race, Participant, TeamSnapshot, AllRiderPoints, Sport, Rider } from '../types';
import { getLatestTeam, getTeamForRace } from '../lib/utils';
import { ChevronLeftIcon, TrophyIcon, ArrowUpIcon, ArrowDownIcon, UsersIcon, ChartBarIcon } from './Icons';
import { PriceChart } from './PriceChart';

interface ConstructorDetailProps {
    constructor: Constructor;
    races: Race[];
    allRiderPoints: AllRiderPoints;
    participants: Participant[];
    teamSnapshots: TeamSnapshot[];
    riders: Rider[];
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
    const { constructor, races, allRiderPoints, participants, teamSnapshots, riders, sport, onBack, currencyPrefix, currencySuffix } = props;

    const theme = {
        primaryColor: sport === 'f1' ? 'text-red-500' : 'text-orange-500',
        primaryBorder: sport === 'f1' ? 'border-red-600' : 'border-orange-500',
    };

    const formatPrice = (price: number): string => {
        const value = currencySuffix === 'M' ? (price / 10).toFixed(1) : price.toLocaleString('es-ES');
        return `${currencyPrefix}${value}${currencySuffix}`;
    };

    const constructorRiderIds = useMemo(() => {
        return new Set(riders.filter(r => r.constructor_id === constructor.id).map(r => r.id));
    }, [riders, constructor.id]);

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
            return constructorId === constructor.id;
        }).length;

        const selectionPercentage = participants.length > 0 ? (selectionCount / participants.length) * 100 : 0;
        const priceChange = constructor.price - constructor.initial_price;

        return { totalPoints: Math.round(totalPoints), selectionPercentage, priceChange };
    }, [constructor, allRiderPoints, participants, teamSnapshots, races, calculateConstructorScoreForRace]);

    const pointsByRace = useMemo(() => {
        return [...races]
            .map(race => ({
                race,
                points: Math.round(calculateConstructorScoreForRace(allRiderPoints[race.id] || {}))
            }))
            .filter(item => item.points > 0)
            .sort((a, b) => b.points - a.points);
    }, [races, allRiderPoints, calculateConstructorScoreForRace]);

    const priceHistory = useMemo(() => {
        const history = [{ raceRound: 0, price: constructor.initial_price }];
        // This is a simplified simulation based on popularity and doesn't account for market balancing.
        // It provides a general trend for the user.
        const sortedAdjustedRaces = [...races]
            .filter(r => new Date(r.race_date) < new Date() && r.prices_adjusted)
            .sort((a, b) => new Date(a.race_date).getTime() - new Date(b.race_date).getTime());

        for (const race of sortedAdjustedRaces) {
            const participantsWithTeamsForRace = participants.filter(p => {
                const team = getTeamForRace(p.id, race.id, teamSnapshots);
                return team.riderIds.length > 0 && !!team.constructorId;
            });
            const totalParticipantsForRace = participantsWithTeamsForRace.length;
            if (totalParticipantsForRace === 0) continue;

            const selectionCount = participantsWithTeamsForRace.filter(p => {
                const { constructorId } = getTeamForRace(p.id, race.id, teamSnapshots);
                return constructorId === constructor.id;
            }).length;

            const popularityPercent = (selectionCount / totalParticipantsForRace) * 100;

            let priceChange = 0;
            if (popularityPercent > 75) priceChange = 30;
            else if (popularityPercent > 50) priceChange = 20;
            else if (popularityPercent > 25) priceChange = 10;
            // Note: Decrease logic is handled globally, so we only simulate increases here for the chart.
            const newPrice = history[history.length - 1].price + priceChange;
            history.push({ raceRound: race.round, price: newPrice });
        }

        // Ensure the current price is the last point
        if (history[history.length - 1].price !== constructor.price && sortedAdjustedRaces.length > 0) {
             history[history.length - 1].price = constructor.price;
        }


        return history;
    }, [constructor, races, participants, teamSnapshots]);
    
    const constructorRidersList = useMemo(() => 
        riders.filter(r => r.constructor_id === constructor.id)
    , [riders, constructor.id]);

    return (
        <div className="animate-fadeIn max-w-4xl mx-auto">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-300 hover:text-white mb-4">
                <ChevronLeftIcon className="w-5 h-5" />
                Volver
            </button>

            <header className="bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
                <div className="flex flex-col sm:flex-row gap-6 items-center">
                    <div className="flex-grow text-center sm:text-left">
                        <h1 className="text-4xl font-bold text-white">{constructor.name}</h1>
                        <p className={`text-lg font-semibold ${theme.primaryColor}`}>Escudería / Constructor</p>
                    </div>
                    <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                        <p className="text-sm text-gray-400 uppercase">Precio Actual</p>
                        <p className="text-4xl font-bold text-white">{formatPrice(constructor.price)}</p>
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
            
            <div className="bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
                 <h2 className="text-2xl font-bold text-white mb-4">Evolución del Precio</h2>
                 <PriceChart data={priceHistory} sport={sport} currencyPrefix={currencyPrefix} currencySuffix={currencySuffix} />
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
