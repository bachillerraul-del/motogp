import React, { useMemo } from 'react';
import type { Sport, Rider, Constructor } from '../types';
import { useFantasy } from '../contexts/FantasyDataContext';
import { F1_RIDER_LIMIT, MOTOGP_RIDER_LIMIT, F1_BUDGET, MOTOGP_BUDGET } from '../constants';
import { SparklesIcon } from './Icons';

interface DreamTeamProps {
    sport: Sport;
    currencyPrefix: string;
    currencySuffix: string;
}

const calculateConstructorScoreForRace = (constructor: Constructor, racePoints: Record<number, { total: number }>, allRiders: Rider[]): number => {
    const constructorRiders = allRiders.filter(r => (r.constructor_id && r.constructor_id === constructor.id) || r.team === constructor.name);
    const riderPoints = constructorRiders
        .map(r => racePoints[r.id]?.total || 0)
        .sort((a, b) => b - a);
        
    if (riderPoints.length === 0) return 0;
    const top1 = riderPoints[0] || 0;
    const top2 = riderPoints[1] || 0;
    return (top1 + top2) / 2;
};


export const DreamTeam: React.FC<DreamTeamProps> = ({ sport, currencyPrefix, currencySuffix }) => {
    const { riders, constructors, races, allRiderPoints } = useFantasy();
    const RIDER_LIMIT = sport === 'f1' ? F1_RIDER_LIMIT : MOTOGP_RIDER_LIMIT;

    const formatPrice = (price: number): string => {
        const value = currencySuffix === 'M' ? (price / 10).toFixed(1) : price.toLocaleString('es-ES');
        return `${currencyPrefix}${value}${currencySuffix}`;
    };

    const lastRaceWithPoints = useMemo(() => {
        return races
            .filter(r => allRiderPoints[r.id] && Object.keys(allRiderPoints[r.id]).length > 0)
            .sort((a, b) => new Date(b.race_date).getTime() - new Date(a.race_date).getTime())[0];
    }, [races, allRiderPoints]);

    const dreamTeamData = useMemo(() => {
        if (!lastRaceWithPoints) return null;

        const BUDGET = sport === 'f1' ? F1_BUDGET : MOTOGP_BUDGET;
        const racePoints = allRiderPoints[lastRaceWithPoints.id];
        
        const ridersWithPoints = riders.map(r => ({ data: r, points: racePoints[r.id]?.total || 0 }));
        const constructorsWithScores = constructors.map(c => ({ data: c, score: calculateConstructorScoreForRace(c, racePoints, riders) }));

        let bestTeamScore = -1;
        let bestTeam: { riders: Rider[], constructor: Constructor | null } = { riders: [], constructor: null };
        
        // This is a simplified approach (greedy algorithm) for performance.
        // A true knapsack solution would be too slow.
        const sortedRidersByPoints = [...ridersWithPoints].sort((a, b) => b.points - a.points);
        const sortedConstructorsByScore = [...constructorsWithScores].sort((a,b) => b.score - a.score);

        for (const constructorItem of sortedConstructorsByScore) {
            let currentBudget = BUDGET - constructorItem.data.price;
            let currentRiders: Rider[] = [];
            
            for (const riderItem of sortedRidersByPoints) {
                if (currentRiders.length < RIDER_LIMIT && currentBudget >= riderItem.data.price) {
                    currentRiders.push(riderItem.data);
                    currentBudget -= riderItem.data.price;
                }
            }

            if(currentRiders.length === RIDER_LIMIT) {
                const ridersScore = currentRiders.reduce((sum, r) => sum + (racePoints[r.id]?.total || 0), 0);
                const totalScore = constructorItem.score + ridersScore;
                
                if (totalScore > bestTeamScore) {
                    bestTeamScore = totalScore;
                    bestTeam = { riders: currentRiders, constructor: constructorItem.data };
                }
            }
        }


        if (bestTeamScore === -1 || !bestTeam.constructor) return null;
        
        const totalCost = bestTeam.riders.reduce((sum, r) => sum + r.price, 0) + (bestTeam.constructor.price);

        return {
            race: lastRaceWithPoints,
            riders: bestTeam.riders.sort((a,b) => (racePoints[b.id]?.total || 0) - (racePoints[a.id]?.total || 0)),
            constructor: bestTeam.constructor,
            score: Math.round(bestTeamScore),
            cost: totalCost
        };
    }, [lastRaceWithPoints, allRiderPoints, riders, constructors, RIDER_LIMIT, sport]);

    if (!dreamTeamData) {
        return (
            <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
                <div className="text-center py-6 text-gray-400">
                    <p>No hay datos suficientes para calcular el Dream Team.</p>
                </div>
            </div>
        );
    }
    
    const themeColor = sport === 'f1' ? 'border-red-500' : 'border-orange-500';

    return (
        <div className={`bg-gray-800 p-5 rounded-lg shadow-lg border-t-4 ${themeColor}`}>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-4">
                <div>
                    <div className="flex items-center gap-3">
                        <SparklesIcon className="w-8 h-8 text-fuchsia-400" />
                        <h2 className="text-2xl font-bold">Dream Team</h2>
                    </div>
                    <p className="text-sm text-gray-400 ml-11">Equipo ideal para <span className="font-semibold text-gray-300">{dreamTeamData.race.gp_name}</span></p>
                </div>
                <div className="text-left sm:text-right">
                    <p className="text-gray-400 text-sm">Puntuación Total</p>
                    <p className="text-4xl font-bold text-yellow-300">{dreamTeamData.score} pts</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    {dreamTeamData.riders.map(rider => (
                        <div key={rider.id} className="bg-gray-900/70 rounded-md p-2 flex items-center justify-between">
                            <div>
                                <p className="font-semibold text-white text-sm truncate">{rider.name}</p>
                                <p className="text-xs text-gray-400">{rider.team}</p>
                            </div>
                            <span className="text-sm text-gray-300 font-mono">{formatPrice(rider.price)}</span>
                        </div>
                    ))}
                </div>
                <div>
                    {dreamTeamData.constructor && (
                        <div className="bg-gray-700/50 rounded-md p-2 flex items-center justify-between border-l-4 border-yellow-400 h-full">
                            <div>
                               <p className="font-semibold text-white text-sm truncate">{dreamTeamData.constructor.name}</p>
                               <p className="text-xs text-gray-400">Escudería</p>
                            </div>
                             <span className="text-sm text-gray-300 font-mono">{formatPrice(dreamTeamData.constructor.price)}</span>
                        </div>
                    )}
                </div>
            </div>
            
        </div>
    );
};