import React, { useMemo, useState } from 'react';
import type { Sport, Constructor, Rider } from '../types';
import { UsersIcon, ChevronDownIcon } from './Icons';
import { useFantasy } from '../contexts/FantasyDataContext';
import { getLatestTeam } from '../lib/utils';

type ConstructorWithScore = Constructor & {
    score: number;
    selectionPercent: number;
    value: number;
};

const ConstructorExpandedView: React.FC<{ constructor: ConstructorWithScore }> = ({ constructor }) => {
    const { allRiderPoints, riders, races } = useFantasy();
    const constructorRiders = useMemo(() => riders.filter(r => (r.constructor_id && r.constructor_id === constructor.id) || r.team === constructor.name), [riders, constructor]);
    const constructorRiderIds = useMemo(() => new Set(constructorRiders.map(r => r.id)), [constructorRiders]);

    const pointsByRace = useMemo(() => {
        return races.map(race => {
            const racePoints = allRiderPoints[race.id];
            if (!racePoints) return { race, points: 0, calculation: "No data" };

            const points = Object.entries(racePoints).filter(([riderId]) => constructorRiderIds.has(Number(riderId))).map(([, p]) => p.total).sort((a, b) => b - a);
            const top1 = points[0] || 0, top2 = points[1] || 0;
            const score = (top1 + top2) / 2;
            
            const top1Rider = constructorRiders.find(r => (racePoints[r.id]?.total || 0) === top1);
            const top2Rider = constructorRiders.find(r => r.id !== top1Rider?.id && (racePoints[r.id]?.total || 0) === top2);
            let calculation = (top1 > 0 && top2 > 0) ? `(${(top1Rider?.name || '').split(' ').pop()}: ${top1} + ${(top2Rider?.name || '').split(' ').pop()}: ${top2}) / 2` : (top1 > 0 ? `(${(top1Rider?.name || '').split(' ').pop()}: ${top1}) / 2` : "No points");

            return { race, points: score, calculation };
        }).filter(item => item.points > 0).sort((a, b) => new Date(a.race.race_date).getTime() - new Date(b.race.race_date).getTime());
    }, [races, allRiderPoints, constructorRiders, constructorRiderIds]);

    return (
        <div className="bg-gray-700/30 p-3 text-sm animate-fadeIn border-t border-gray-700/50">
            <h4 className="font-bold text-gray-300 mb-2">Desglose por Jornada</h4>
            {pointsByRace.length > 0 ? (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-2">
                    {pointsByRace.map(({ race, points, calculation }) => (
                        <div key={race.id} className="flex justify-between items-center bg-gray-800/60 p-1.5 rounded-md">
                            <div className="min-w-0">
                                <p className="font-semibold text-white truncate text-xs">{race.gp_name}</p>
                                <p className="text-gray-400 text-xs truncate" title={calculation}>{calculation}</p>
                            </div>
                            <span className="font-bold text-yellow-300 ml-2 flex-shrink-0">{points.toFixed(1)} pts</span>
                        </div>
                    ))}
                </div>
            ) : <p className="text-center text-gray-500 py-4">Sin puntos esta temporada.</p>}
        </div>
    );
};

interface ConstructorLeaderboardProps {
    sport: Sport;
    leaderboardView: number | 'general';
    currencyPrefix: string;
    currencySuffix: string;
}

const getRankStyle = (index: number) => {
    if (index === 0) return 'border-l-4 border-yellow-400';
    if (index === 1) return 'border-l-4 border-gray-400';
    if (index === 2) return 'border-l-4 border-yellow-700';
    return 'border-l-4 border-transparent';
};

export const ConstructorLeaderboard: React.FC<ConstructorLeaderboardProps> = ({ sport, leaderboardView, currencyPrefix, currencySuffix }) => {
    const { riders, constructors, races, allRiderPoints, participants, teamSnapshots } = useFantasy();
    const [expandedConstructorId, setExpandedConstructorId] = useState<number | null>(null);

    const constructorScores = useMemo(() => {
        const scores = new Map<number, number>();
        constructors.forEach(c => scores.set(c.id, 0));

        const racesToProcess = leaderboardView === 'general' ? races : races.filter(r => r.id === leaderboardView);
        racesToProcess.forEach(race => {
            const racePoints = allRiderPoints[race.id];
            if (!racePoints) return;
            constructors.forEach(c => {
                const cRiderIds = new Set(riders.filter(r => (r.constructor_id && r.constructor_id === c.id) || r.team === c.name).map(r => r.id));
                const points = Object.entries(racePoints).filter(([rId]) => cRiderIds.has(Number(rId))).map(([, p]) => p.total).sort((a, b) => b - a);
                if (points.length > 0) {
                    const raceScore = ((points[0] || 0) + (points[1] || 0)) / 2;
                    scores.set(c.id, (scores.get(c.id) || 0) + raceScore);
                }
            });
        });
        
        const selectionCounts = new Map<number, number>();
        const participantsWithTeams = participants.filter(p => getLatestTeam(p.id, races, teamSnapshots).constructorId !== null);
        participantsWithTeams.forEach(p => {
            const { constructorId } = getLatestTeam(p.id, races, teamSnapshots);
            if(constructorId) selectionCounts.set(constructorId, (selectionCounts.get(constructorId) || 0) + 1);
        });

        return [...constructors].map(c => {
            const score = scores.get(c.id) || 0;
            const selectionCount = selectionCounts.get(c.id) || 0;
            const selectionPercent = participantsWithTeams.length > 0 ? (selectionCount / participantsWithTeams.length) * 100 : 0;
            const priceForValue = sport === 'f1' ? (c.price / 10) : c.price;
            const value = priceForValue > 0 ? score / priceForValue : 0;
            return { ...c, score, selectionPercent, value };
        }).sort((a, b) => b.score - a.score);

    }, [constructors, riders, allRiderPoints, races, leaderboardView, participants, teamSnapshots, sport]);

    return (
        <div className="bg-gray-800 p-4 rounded-lg shadow-lg">
            <div className="space-y-2">
                 {constructorScores.length === 0 ? (
                    <div className="text-center py-10"><p className="text-gray-400">No hay datos de puntos de escuderías.</p></div>
                ) : (
                    constructorScores.map((constructor, index) => {
                        const isExpanded = expandedConstructorId === constructor.id;
                        return (
                            <div key={constructor.id} className={`bg-gray-900/70 rounded-md transition-all duration-300 overflow-hidden ${getRankStyle(index)}`}>
                                <div className="p-3 cursor-pointer" onClick={() => setExpandedConstructorId(isExpanded ? null : constructor.id)} role="button" aria-expanded={isExpanded}>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <span className="font-bold text-gray-400 w-6 text-center">{index + 1}</span>
                                            <p className="font-semibold text-white truncate">{constructor.name}</p>
                                        </div>
                                        <div className="flex items-center">
                                            <div className="font-bold text-lg text-yellow-300 ml-2">{constructor.score.toFixed(1)}</div>
                                            <ChevronDownIcon className={`w-5 h-5 ml-1.5 text-gray-400 transition-transform flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                                        </div>
                                    </div>
                                    <div className="flex justify-end items-center gap-4 mt-2 text-xs text-gray-400 border-t border-gray-700/50 pt-2">
                                        <span>Sel: <span className="font-bold text-white">{constructor.selectionPercent.toFixed(1)}%</span></span>
                                        <span>Valor: <span className="font-bold text-white">{constructor.value.toFixed(2)}</span></span>
                                    </div>
                                </div>
                                {isExpanded && <ConstructorExpandedView constructor={constructor} />}
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    );
};
