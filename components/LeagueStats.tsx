import React, { useMemo } from 'react';
import type { Sport, Rider, Constructor } from '../types';
import { useFantasy } from '../contexts/FantasyDataContext';
import { getLatestTeam } from '../lib/utils';
import { F1_RIDER_LIMIT, MOTOGP_RIDER_LIMIT } from '../constants';
import { ChartBarIcon, FireIcon, TrophyIcon, SparklesIcon, MagnifyingGlassIcon, UsersIcon } from './Icons';

interface LeagueStatsProps {
    sport: Sport;
    currencyPrefix: string;
    currencySuffix: string;
}

interface StatCardProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
    colorClass: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, icon, children, colorClass }) => (
    <div className="bg-gray-800 rounded-lg shadow-lg p-5 flex flex-col">
        <div className="flex items-center gap-4 mb-3">
            <div className={`p-2 rounded-lg bg-gray-900/50 ${colorClass}`}>{icon}</div>
            <h2 className="text-xl font-bold text-white">{title}</h2>
        </div>
        <div className="text-gray-300 leading-relaxed flex-grow space-y-2">{children}</div>
    </div>
);

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

export const LeagueStats: React.FC<LeagueStatsProps> = ({ sport, currencyPrefix, currencySuffix }) => {
    const { participants, riders, constructors, teamSnapshots, races, allRiderPoints } = useFantasy();
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

    const selectionStats = useMemo(() => {
        const riderCounts = new Map<number, number>();
        const constructorCounts = new Map<number, number>();
        const participantsWithTeams = participants.filter(p => {
            const { riderIds, constructorId } = getLatestTeam(p.id, races, teamSnapshots);
            return riderIds.length > 0 && constructorId !== null;
        });

        if (participantsWithTeams.length === 0) {
            return { mostSelectedRider: null, mostSelectedConstructor: null, totalParticipants: participants.length };
        }

        participantsWithTeams.forEach(p => {
            const { riderIds, constructorId } = getLatestTeam(p.id, races, teamSnapshots);
            riderIds.forEach(id => riderCounts.set(id, (riderCounts.get(id) || 0) + 1));
            if (constructorId) {
                constructorCounts.set(constructorId, (constructorCounts.get(constructorId) || 0) + 1);
            }
        });

        const getMostSelected = (counts: Map<number, number>, items: (Rider | Constructor)[]) => {
            if (counts.size === 0) return null;
            const [mostSelectedId] = [...counts.entries()].reduce((a, b) => b[1] > a[1] ? b : a);
            const item = items.find(i => i.id === mostSelectedId);
            const count = counts.get(mostSelectedId) || 0;
            const percentage = (count / participantsWithTeams.length) * 100;
            return { item, percentage: percentage.toFixed(1) };
        };

        return {
            mostSelectedRider: getMostSelected(riderCounts, riders),
            mostSelectedConstructor: getMostSelected(constructorCounts, constructors),
            totalParticipants: participants.length
        };
    }, [participants, races, teamSnapshots, riders, constructors]);

    const dreamTeam = useMemo(() => {
        if (!lastRaceWithPoints) return null;
        const racePoints = allRiderPoints[lastRaceWithPoints.id];
        const sortedRiders = [...riders].map(r => ({ rider: r, points: racePoints[r.id]?.total || 0 })).sort((a, b) => b.points - a.points);
        const constructorScores = constructors.map(c => ({
            constructor: c,
            score: calculateConstructorScoreForRace(c, racePoints, riders)
        })).sort((a, b) => b.score - a.score);
        const dreamRiders = sortedRiders.slice(0, RIDER_LIMIT).map(item => item.rider);
        const dreamConstructor = constructorScores[0]?.constructor || null;
        const totalScore = Math.round(sortedRiders.slice(0, RIDER_LIMIT).reduce((sum, r) => sum + r.points, 0) + (constructorScores[0]?.score || 0));
        return { race: lastRaceWithPoints, riders: dreamRiders, constructor: dreamConstructor, score: totalScore };
    }, [lastRaceWithPoints, allRiderPoints, riders, constructors, RIDER_LIMIT]);

    const leagueMVP = useMemo(() => {
        const riderTotalPoints = new Map<number, number>();
        Object.values(allRiderPoints).forEach(racePoints => {
            Object.entries(racePoints).forEach(([riderId, points]) => {
                const id = parseInt(riderId);
                riderTotalPoints.set(id, (riderTotalPoints.get(id) || 0) + points.total);
            });
        });
        if (riderTotalPoints.size === 0) return null;
        const [mvpId, mvpPoints] = [...riderTotalPoints.entries()].reduce((a, b) => b[1] > a[1] ? b : a);
        const mvpRider = riders.find(r => r.id === mvpId);
        return mvpRider ? { rider: mvpRider, points: mvpPoints } : null;
    }, [allRiderPoints, riders]);

    const hiddenGem = useMemo(() => {
        if (participants.length < 3) return null;
        const riderTotalPoints = new Map<number, number>();
        Object.values(allRiderPoints).forEach(racePoints => {
            Object.entries(racePoints).forEach(([riderId, points]) => {
                // FIX: Correctly parse `riderId` string to a number and use a defined variable `id`.
                const id = parseInt(riderId);
                riderTotalPoints.set(id, (riderTotalPoints.get(id) || 0) + points.total);
            });
        });

        const riderSelectionCounts = new Map<number, number>();
        participants.forEach(p => getLatestTeam(p.id, races, teamSnapshots).riderIds.forEach(id => riderSelectionCounts.set(id, (riderSelectionCounts.get(id) || 0) + 1)));

        const candidates = riders.map(rider => {
            const points = riderTotalPoints.get(rider.id) || 0;
            const price = sport === 'f1' ? rider.price / 10 : rider.price;
            const value = price > 0 ? points / price : 0;
            const selectionPercentage = (riderSelectionCounts.get(rider.id) || 0) / participants.length * 100;
            return { rider, value, selectionPercentage, points };
        }).filter(c => c.selectionPercentage < 25 && c.points > 10).sort((a, b) => b.value - a.value);
        return candidates.length > 0 ? candidates[0] : null;
    }, [allRiderPoints, riders, participants, races, teamSnapshots, sport]);
    
    const averageValue = useMemo(() => {
        const ridersById = new Map(riders.map(r => [r.id, r]));
        const constructorsById = new Map(constructors.map(c => [c.id, c]));
        const teams = participants.map(p => getLatestTeam(p.id, races, teamSnapshots)).filter(t => t.riderIds.length > 0);
        if (teams.length === 0) return 0;
        const totalValue = teams.reduce((total, team) => {
            const teamCost = team.riderIds.reduce((s, id) => s + (ridersById.get(id)?.price || 0), 0) + (constructorsById.get(team.constructorId!)?.price || 0);
            return total + teamCost;
        }, 0);
        return totalValue / teams.length;
    }, [participants, races, teamSnapshots, riders, constructors]);


    if (riders.length === 0 || participants.length === 0) {
        return (
            <div className="text-center py-20 bg-gray-800 rounded-lg animate-fadeIn">
                <h2 className="text-2xl font-bold text-white">No hay suficientes datos</h2>
                <p className="text-gray-400 mt-2">Se necesitan participantes y datos de la temporada para mostrar estadísticas.</p>
            </div>
        );
    }
    
    return (
      <div className="animate-fadeIn">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <StatCard title="Participantes" icon={<UsersIcon className="w-7 h-7" />} colorClass="text-blue-400">
                <p className="text-5xl font-bold">{selectionStats.totalParticipants}</p>
                <p>jugadores compitiendo en la liga.</p>
            </StatCard>

            <StatCard title="Los Más Seleccionados" icon={<TrophyIcon className="w-7 h-7" />} colorClass="text-yellow-400">
                {selectionStats.mostSelectedRider?.item && (
                    <div><span className="font-bold">{selectionStats.mostSelectedRider.item.name}</span> está en el <span className="font-bold">{selectionStats.mostSelectedRider.percentage}%</span> de los equipos.</div>
                )}
                 {selectionStats.mostSelectedConstructor?.item && (
                    <div><span className="font-bold">{selectionStats.mostSelectedConstructor.item.name}</span> es la escudería del <span className="font-bold">{selectionStats.mostSelectedConstructor.percentage}%</span>.</div>
                )}
            </StatCard>
            
            <StatCard title="MVP de la Liga" icon={<FireIcon className="w-7 h-7" />} colorClass="text-orange-500">
                {leagueMVP ? (
                    <>
                        <p className="text-2xl font-bold">{leagueMVP.rider.name}</p>
                        <p>con un total de <span className="font-bold text-3xl text-white">{leagueMVP.points}</span> puntos.</p>
                    </>
                ) : <p>Aún no hay datos de puntos.</p>}
            </StatCard>

            <StatCard title="Dream Team" icon={<SparklesIcon className="w-7 h-7" />} colorClass="text-fuchsia-400">
                {dreamTeam ? (
                    <>
                        <p className="text-xs text-gray-400 mb-1">Mejor equipo de {dreamTeam.race.gp_name}:</p>
                        <ul className="text-sm list-disc list-inside">
                            {dreamTeam.riders.map(r => <li key={r.id}>{r.name}</li>)}
                            {dreamTeam.constructor && <li>{dreamTeam.constructor.name} (E)</li>}
                        </ul>
                        <p className="mt-2">Puntuación: <span className="font-bold text-2xl text-white">{dreamTeam.score} pts</span></p>
                    </>
                ) : <p>No hay datos de carreras para calcular el Dream Team.</p>}
            </StatCard>

            <StatCard title="Joya Oculta" icon={<MagnifyingGlassIcon className="w-7 h-7" />} colorClass="text-green-400">
                {hiddenGem ? (
                    <>
                        <p className="text-2xl font-bold">{hiddenGem.rider.name}</p>
                        <p>Seleccionado solo por el <span className="font-bold">{hiddenGem.selectionPercentage.toFixed(1)}%</span>, pero con <span className="font-bold">{hiddenGem.points}</span> puntos.</p>
                        <p className="text-sm text-gray-400">Valor (pts/precio): {hiddenGem.value.toFixed(2)}</p>
                    </>
                ) : <p>No se encontró ninguna joya oculta con los criterios actuales.</p>}
            </StatCard>

            <StatCard title="Valor Medio del Equipo" icon={<ChartBarIcon className="w-7 h-7" />} colorClass="text-teal-400">
                <p className="text-4xl font-bold">{formatPrice(averageValue)}</p>
                <p>es el coste promedio de los equipos de la liga.</p>
            </StatCard>

        </div>
      </div>
    );
};
