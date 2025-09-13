import React, { useMemo, useState } from 'react';
import type { Constructor, Sport } from '../types';
import { getLatestTeam } from '../lib/utils';
import { TrophyIcon, ArrowUpIcon, ArrowDownIcon, UsersIcon, ChartBarIcon } from './Icons';
import { useFantasy } from '../contexts/FantasyDataContext';
import { Modal } from './Modal';

interface ConstructorDetailModalProps {
    constructorItem: Constructor;
    sport: Sport;
    onClose: () => void;
    currencyPrefix: string;
    currencySuffix: string;
}

type ConstructorDetailTab = 'stats' | 'points' | 'riders';

const StatCard: React.FC<{ title: string; value: React.ReactNode; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-gray-900/50 p-3 rounded-lg h-full">
        <p className="text-xs text-gray-400 mb-1">{title}</p>
        <div className="flex items-center gap-2">
             <div className="text-gray-400">{icon}</div>
             <p className="text-lg font-bold text-white">{value}</p>
        </div>
    </div>
);

export const ConstructorDetailModal: React.FC<ConstructorDetailModalProps> = (props) => {
    const { constructorItem, sport, onClose, currencyPrefix, currencySuffix } = props;
    const { races, allRiderPoints, participants, teamSnapshots, riders } = useFantasy();
    const [activeTab, setActiveTab] = useState<ConstructorDetailTab>('stats');

    const theme = {
        primaryColor: sport === 'f1' ? 'text-red-500' : 'text-orange-500',
        tabActive: sport === 'f1' ? 'bg-red-600 text-white' : 'bg-orange-500 text-white',
        tabInactive: 'bg-gray-700 text-gray-300 hover:bg-gray-600'
    };
    
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

    // FIX: Changed parameter type to handle RiderRoundPoints, mapped to .total, and corrected averaging logic.
    const calculateConstructorScoreForRace = (racePoints: Record<number, { total: number }>): number => {
        const points = Object.entries(racePoints)
            .filter(([riderId]) => constructorRiderIds.has(Number(riderId)))
            .map(([, p]) => p.total)
            .sort((a, b) => b - a);
        if (points.length === 0) return 0;
        const top1 = points[0] || 0;
        const top2 = points[1] || 0;
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
    
    const constructorRidersList = useMemo(() => 
        riders.filter(r => constructorRiderIds.has(r.id))
    , [riders, constructorRiderIds]);


    return (
        <Modal isOpen={!!constructorItem} onClose={onClose} title="Detalles de Escudería" sport={sport}>
            <div className="max-h-[75vh] overflow-y-auto pr-2 -mr-4 text-white">
                 <header className="mb-4">
                     <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                        <div>
                            <h1 className="text-2xl font-bold">{constructorItem.name}</h1>
                            <p className={`font-semibold ${theme.primaryColor}`}>Escudería / Constructor</p>
                        </div>
                        <div className="bg-gray-900/50 p-2 rounded-lg text-center flex-shrink-0">
                            <p className="text-xs text-gray-400 uppercase">Precio</p>
                            <p className="text-2xl font-bold">{formatPrice(constructorItem.price)}</p>
                        </div>
                    </div>
                </header>
                 <nav className="flex bg-gray-700/50 rounded-lg p-1 mb-4">
                    <button className={`w-1/3 p-2 rounded-md font-semibold text-sm transition-colors ${activeTab === 'stats' ? theme.tabActive : theme.tabInactive}`} onClick={() => setActiveTab('stats')}>Estadísticas</button>
                    <button className={`w-1/3 p-2 rounded-md font-semibold text-sm transition-colors ${activeTab === 'points' ? theme.tabActive : theme.tabInactive}`} onClick={() => setActiveTab('points')}>Puntos</button>
                    <button className={`w-1/3 p-2 rounded-md font-semibold text-sm transition-colors ${activeTab === 'riders' ? theme.tabActive : theme.tabInactive}`} onClick={() => setActiveTab('riders')}>Pilotos</button>
                </nav>

                <div className="space-y-4">
                    {activeTab === 'stats' && (
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
                                )) : <p className="text-center text-gray-500 py-6">Esta escudería aún no ha conseguido puntos.</p>}
                            </div>
                        </div>
                    )}
                    {activeTab === 'riders' && (
                        <div>
                            <h3 className="text-lg font-bold mb-2">Pilotos del Equipo</h3>
                            <div className="space-y-2">
                                {constructorRidersList.length > 0 ? constructorRidersList.map(rider => (
                                    <div key={rider.id} className="bg-gray-900/50 p-2 rounded-md flex justify-between items-center">
                                        <p className="font-semibold">{rider.name}</p>
                                        <p className="text-sm text-gray-400">{formatPrice(rider.price)}</p>
                                    </div>
                                )) : <p className="text-center text-gray-500 py-6">No se encontraron pilotos.</p>}
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </Modal>
    );
};
