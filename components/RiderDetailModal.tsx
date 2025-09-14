import React, { useMemo, useState } from 'react';
import type { Rider, Sport } from '../types';
import { getLatestTeam, getTeamForRace } from '../lib/utils';
import { TrophyIcon, ArrowUpIcon, ArrowDownIcon, UsersIcon, ChartBarIcon } from './Icons';
import { PriceChart } from './PriceChart';
import { useFantasy } from '../contexts/FantasyDataContext';
import { Modal } from './Modal';

interface RiderDetailModalProps {
    rider: Rider;
    sport: Sport;
    onClose: () => void;
    currencyPrefix: string;
    currencySuffix: string;
}

type RiderDetailTab = 'stats' | 'points';

const StatCard: React.FC<{ title: string; value: React.ReactNode; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-gray-900/50 p-3 rounded-lg h-full">
        <p className="text-xs text-gray-400 mb-1">{title}</p>
        <div className="flex items-center gap-2">
             <div className="text-gray-400">{icon}</div>
             <p className="text-lg font-bold text-white">{value}</p>
        </div>
    </div>
);

export const RiderDetailModal: React.FC<RiderDetailModalProps> = (props) => {
    const { rider, sport, onClose, currencyPrefix, currencySuffix } = props;
    const { races, allRiderPoints, participants, teamSnapshots } = useFantasy();
    const [activeTab, setActiveTab] = useState<RiderDetailTab>('stats');

    const theme = {
        primaryColor: sport === 'f1' ? 'text-red-500' : 'text-orange-500',
        primaryBorder: sport === 'f1' ? 'border-red-600' : 'border-orange-500',
        tabActive: sport === 'f1' ? 'bg-red-600 text-white' : 'bg-orange-500 text-white',
        tabInactive: 'bg-gray-700 text-gray-300 hover:bg-gray-600'
    };

    const formatPrice = (price: number): string => {
        const value = currencySuffix === 'M' ? (price / 10).toFixed(1) : price.toLocaleString('es-ES');
        return `${currencyPrefix}${value}${currencySuffix}`;
    };

    const stats = useMemo(() => {
        // FIX: Access .total property from RiderRoundPoints object to correctly sum up points.
        const totalPoints = Object.values(allRiderPoints).reduce((total, racePoints) => total + (racePoints[rider.id]?.total || 0), 0);
        const selectionCount = participants.filter(p => getLatestTeam(p.id, races, teamSnapshots).riderIds.includes(rider.id)).length;
        const selectionPercentage = participants.length > 0 ? (selectionCount / participants.length) * 100 : 0;
        const priceChange = rider.price - rider.initial_price;
        return { totalPoints, selectionPercentage, priceChange };
    }, [rider, allRiderPoints, participants, teamSnapshots, races]);

    const pointsByRace = useMemo(() => {
        return [...races]
            // FIX: Access .total property from RiderRoundPoints object to get a numeric score.
            .map(race => ({ race, points: allRiderPoints[race.id]?.[rider.id]?.total || 0 }))
            .filter(item => item.points > 0)
            .sort((a, b) => b.points - a.points);
    }, [races, allRiderPoints, rider.id]);

     const priceHistory = useMemo(() => {
        const history = [{ raceRound: 0, price: rider.initial_price }];
        
        // Find the latest race with points as a proxy for when the price might have changed.
        const lastRaceWithPoints = [...races]
            .filter(r => allRiderPoints[r.id] && Object.keys(allRiderPoints[r.id]).length > 0)
            .sort((a, b) => b.round - a.round)[0];

        // If the price has changed and we have a race to anchor it to, show the evolution.
        if (rider.price !== rider.initial_price && lastRaceWithPoints) {
            history.push({ raceRound: lastRaceWithPoints.round, price: rider.price });
        }
        
        return history;
    }, [rider, races, allRiderPoints]);

    return (
        <Modal isOpen={!!rider} onClose={onClose} title="Detalles del Piloto" sport={sport}>
            <div className="max-h-[75vh] overflow-y-auto pr-2 -mr-4 text-white">
                <header className="mb-4">
                     <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                        <div>
                            <h1 className="text-2xl font-bold">{rider.name}</h1>
                            <p className={`font-semibold ${theme.primaryColor}`}>{rider.team} / {rider.bike}</p>
                        </div>
                        <div className="bg-gray-900/50 p-2 rounded-lg text-center flex-shrink-0">
                            <p className="text-xs text-gray-400 uppercase">Precio</p>
                            <p className="text-2xl font-bold">{formatPrice(rider.price)}</p>
                        </div>
                    </div>
                </header>

                <nav className="flex bg-gray-700/50 rounded-lg p-1 mb-4">
                    <button className={`w-1/2 p-2 rounded-md font-semibold text-sm transition-colors ${activeTab === 'stats' ? theme.tabActive : theme.tabInactive}`} onClick={() => setActiveTab('stats')}>Estadísticas</button>
                    <button className={`w-1/2 p-2 rounded-md font-semibold text-sm transition-colors ${activeTab === 'points' ? theme.tabActive : theme.tabInactive}`} onClick={() => setActiveTab('points')}>Puntos</button>
                </nav>

                <div className="space-y-4">
                    {activeTab === 'stats' && (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <StatCard title="Puntos Totales" value={stats.totalPoints} icon={<TrophyIcon className="w-5 h-5"/>}/>
                                <StatCard title="Selección" value={`${stats.selectionPercentage.toFixed(1)}%`} icon={<UsersIcon className="w-5 h-5"/>}/>
                                <StatCard
                                    title="Variación"
                                    value={
                                        <span className={`flex items-center gap-1 ${stats.priceChange > 0 ? 'text-green-400' : stats.priceChange < 0 ? 'text-red-500' : 'text-white'}`}>
                                            {stats.priceChange !== 0 && (stats.priceChange > 0 ? <ArrowUpIcon className="w-4 h-4"/> : <ArrowDownIcon className="w-4 h-4"/>)}
                                            {formatPrice(Math.abs(stats.priceChange))}
                                        </span>
                                    }
                                    icon={<ChartBarIcon className="w-5 h-5"/>}
                                />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold mb-2">Evolución del Precio</h3>
                                <PriceChart data={priceHistory} sport={sport} currencyPrefix={currencyPrefix} currencySuffix={currencySuffix} />
                            </div>
                        </>
                    )}
                    {activeTab === 'points' && (
                         <div>
                            <h3 className="text-lg font-bold mb-2">Puntos por Jornada</h3>
                            <div className="space-y-2">
                                {pointsByRace.length > 0 ? pointsByRace.map(({ race, points }) => (
                                    <div key={race.id} className="bg-gray-900/50 p-2 rounded-md flex justify-between items-center text-sm">
                                        <p className="font-semibold text-gray-200">{race.gp_name}</p>
                                        <p className="font-bold text-base text-yellow-300">{points} pts</p>
                                    </div>
                                )) : (
                                    <p className="text-center text-gray-500 py-6">Este piloto aún no ha conseguido puntos.</p>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
};