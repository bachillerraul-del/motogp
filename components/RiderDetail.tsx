
import React, { useMemo } from 'react';
import type { Rider, Race, Participant, TeamSnapshot, AllRiderPoints, Sport } from '../types';
import { getLatestTeam, getTeamForRace } from '../lib/utils';
import { ChevronLeftIcon, TrophyIcon, ArrowUpIcon, ArrowDownIcon, UsersIcon, ChartBarIcon } from './Icons';
import { PriceChart } from './PriceChart';

interface RiderDetailProps {
    rider: Rider;
    races: Race[];
    allRiderPoints: AllRiderPoints;
    participants: Participant[];
    teamSnapshots: TeamSnapshot[];
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

export const RiderDetail: React.FC<RiderDetailProps> = (props) => {
    const { rider, races, allRiderPoints, participants, teamSnapshots, sport, onBack, currencyPrefix, currencySuffix } = props;

    const theme = {
        primaryColor: sport === 'f1' ? 'text-red-500' : 'text-orange-500',
        primaryBorder: sport === 'f1' ? 'border-red-600' : 'border-orange-500',
    };

    const formatPrice = (price: number): string => {
        const value = currencySuffix === 'M' ? (price / 10).toFixed(1) : price.toLocaleString('es-ES');
        return `${currencyPrefix}${value}${currencySuffix}`;
    };

    const stats = useMemo(() => {
        const totalPoints = Object.values(allRiderPoints).reduce((total, racePoints) => {
            return total + (racePoints[rider.id] || 0);
        }, 0);

        const selectionCount = participants.filter(p => {
            const { riderIds } = getLatestTeam(p.id, races, teamSnapshots);
            return riderIds.includes(rider.id);
        }).length;

        const selectionPercentage = participants.length > 0 ? (selectionCount / participants.length) * 100 : 0;
        
        const priceChange = rider.price - rider.initial_price;

        return { totalPoints, selectionPercentage, priceChange };
    }, [rider, allRiderPoints, participants, teamSnapshots, races]);

    const pointsByRace = useMemo(() => {
        return [...races]
            .map(race => ({
                race,
                points: allRiderPoints[race.id]?.[rider.id] || 0
            }))
            .filter(item => item.points > 0)
            .sort((a, b) => b.points - a.points);
    }, [races, allRiderPoints, rider.id]);

     const priceHistory = useMemo(() => {
        const history = [{ raceRound: 0, price: rider.initial_price }];
        let currentPrice = rider.initial_price;
        
        const sortedAdjustedRaces = [...races]
            .filter(r => new Date(r.race_date) < new Date() && r.prices_adjusted)
            .sort((a, b) => new Date(a.race_date).getTime() - new Date(b.race_date).getTime());

        for (const race of sortedAdjustedRaces) {
            const participantsWithTeamsForRace = participants.filter(p => getTeamForRace(p.id, race.id, teamSnapshots).riderIds.length > 0);
            const totalParticipantsForRace = participantsWithTeamsForRace.length;

            if (totalParticipantsForRace === 0) {
                history.push({ raceRound: race.round, price: currentPrice });
                continue;
            }

            const selectionCount = participantsWithTeamsForRace.filter(p => {
                const { riderIds } = getTeamForRace(p.id, race.id, teamSnapshots);
                return riderIds.includes(rider.id);
            }).length;

            const popularityPercent = (selectionCount / totalParticipantsForRace) * 100;

            let priceChange = 0;
            if (popularityPercent > 75) priceChange = 30;
            else if (popularityPercent > 50) priceChange = 20;
            else if (popularityPercent > 25) priceChange = 10;
            
            currentPrice = Math.max(0, currentPrice + priceChange);
            history.push({ raceRound: race.round, price: currentPrice });
        }
        
        return history;
    }, [rider, races, participants, teamSnapshots]);

    return (
        <div className="animate-fadeIn max-w-4xl mx-auto">
            <button onClick={onBack} className="flex items-center gap-2 text-gray-300 hover:text-white mb-4">
                <ChevronLeftIcon className="w-5 h-5" />
                Volver
            </button>

            <header className="bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
                <div className="flex flex-col sm:flex-row gap-6 items-center">
                    <div className="flex-grow text-center sm:text-left">
                        <h1 className="text-4xl font-bold text-white">{rider.name}</h1>
                        <p className={`text-lg font-semibold ${theme.primaryColor}`}>{rider.team} / {rider.bike}</p>
                    </div>
                    <div className="bg-gray-900/50 p-4 rounded-lg text-center">
                        <p className="text-sm text-gray-400 uppercase">Precio Actual</p>
                        <p className="text-4xl font-bold text-white">{formatPrice(rider.price)}</p>
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

            <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                <h2 className="text-2xl font-bold text-white mb-4">Puntos por Jornada</h2>
                <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {pointsByRace.length > 0 ? pointsByRace.map(({ race, points }) => (
                        <div key={race.id} className="bg-gray-900/50 p-3 rounded-md flex justify-between items-center">
                            <p className="font-semibold text-gray-200">{race.gp_name}</p>
                            <p className="font-bold text-lg text-yellow-300">{points} pts</p>
                        </div>
                    )) : (
                        <p className="text-center text-gray-500 py-6">Este piloto aún no ha conseguido puntos esta temporada.</p>
                    )}
                </div>
            </div>
        </div>
    );
};