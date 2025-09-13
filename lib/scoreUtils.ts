import type { Participant, Race, TeamSnapshot, AllRiderPoints, Rider, Constructor, RiderRoundPoints } from './types';
import { getTeamForRace } from './utils';

/**
 * Represents the score of a single rider in a race.
 */
export interface RiderScore {
    rider: Rider;
    points: number;
    mainRacePoints: number;
    sprintRacePoints: number;
}

/**
 * Represents the score of a constructor in a race, including the breakdown of its calculation.
 */
export interface ConstructorScore {
    constructorData: Constructor | null;
    points: number;
    calculation: string;
    contributingRiders: { rider: Rider; points: number }[];
}

/**
 * Represents the complete score breakdown for a participant in a single race.
 */
export interface ScoreBreakdown {
    riderScores: RiderScore[];
    constructorScore: ConstructorScore;
    totalScore: number;
}

const defaultPoints: RiderRoundPoints = { total: 0, main: 0, sprint: 0 };

/**
 * Calculates a detailed score breakdown for a participant for a specific race.
 * @returns A ScoreBreakdown object with points for each rider and the constructor.
 */
export const calculateScoreBreakdown = (
    participantId: number,
    raceId: number,
    teamSnapshots: TeamSnapshot[],
    allRiderPoints: AllRiderPoints,
    riders: Rider[],
    constructors: Constructor[]
): ScoreBreakdown => {
    const { riderIds, constructorId } = getTeamForRace(participantId, raceId, teamSnapshots);
    const racePointsMap = allRiderPoints[raceId] || {};
    const ridersById = new Map(riders.map(r => [r.id, r]));
    const constructorsById = new Map(constructors.map(c => [c.id, c]));

    const riderScores: RiderScore[] = riderIds
        .map(id => ridersById.get(id))
        .filter((r): r is Rider => !!r)
        .map(rider => {
            const riderPointsData = racePointsMap[rider.id] || defaultPoints;
            return {
                rider,
                points: riderPointsData.total,
                mainRacePoints: riderPointsData.main,
                sprintRacePoints: riderPointsData.sprint,
            };
        });

    let constructorScorePoints = 0;
    let constructorScoreCalculation = "No se seleccionó escudería.";
    let contributingRiders: { rider: Rider; points: number }[] = [];
    const constructorData = constructorId ? constructorsById.get(constructorId) : null;

    if (constructorData) {
        const constructorRiderPoints = riders
            .filter(r => (r.constructor_id && r.constructor_id === constructorId) || r.team === constructorData.name)
            .map(r => ({ rider: r, points: (racePointsMap[r.id] || defaultPoints).total }))
            .sort((a, b) => b.points - a.points);
        
        contributingRiders = constructorRiderPoints.slice(0, 2);

        if (constructorRiderPoints.length > 0) {
            const top1 = constructorRiderPoints[0]?.points || 0;
            const top2 = constructorRiderPoints[1]?.points || 0;
            constructorScorePoints = (top1 + top2) / 2;
            
            const top1Name = constructorRiderPoints[0]?.rider.name.split(' ').pop();
            const top2Name = constructorRiderPoints[1]?.rider.name.split(' ').pop();

            if (top1 > 0 && top2 > 0) {
                 constructorScoreCalculation = `(${top1Name}: ${top1} + ${top2Name}: ${top2}) / 2`;
            } else if (top1 > 0) {
                 constructorScoreCalculation = `(${top1Name}: ${top1}) / 2`;
            } else {
                 constructorScoreCalculation = "Pilotos no puntuaron";
            }
        } else {
            constructorScoreCalculation = "Ningún piloto de la escudería puntuó.";
        }
    }
    
    const totalRiderScore = riderScores.reduce((acc, rs) => acc + rs.points, 0);
    const totalScore = totalRiderScore + constructorScorePoints;

    return {
        riderScores,
        constructorScore: {
            constructorData: constructorData,
            points: constructorScorePoints,
            calculation: constructorScoreCalculation,
            contributingRiders,
        },
        totalScore,
    };
};

export const calculateScore = (
    participant: Participant,
    leaderboardView: number | 'general',
    races: Race[],
    teamSnapshots: TeamSnapshot[],
    allRiderPoints: AllRiderPoints,
    riders: Rider[],
    constructors: Constructor[]
): number => {
    const calculateRaceScore = (race: Race) => {
         const breakdown = calculateScoreBreakdown(participant.id, race.id, teamSnapshots, allRiderPoints, riders, constructors);
         return breakdown.totalScore;
    };

    if (leaderboardView === 'general') {
        return races.reduce((totalScore, race) => totalScore + calculateRaceScore(race), 0);
    }
    const race = races.find(r => r.id === leaderboardView);
    return race ? calculateRaceScore(race) : 0;
};