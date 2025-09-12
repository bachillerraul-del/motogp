import type { Participant, Race, TeamSnapshot, AllRiderPoints, Rider, Constructor } from '../types';
import { getTeamForRace } from './utils';

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
        const { riderIds, constructorId } = getTeamForRace(participant.id, race.id, teamSnapshots);
        const racePointsMap = allRiderPoints[race.id] || {};

        const riderScore = riderIds.reduce((acc, riderId) => acc + (racePointsMap[riderId] || 0), 0);

        let constructorScore = 0;
        if (constructorId) {
            const constructor = constructors.find(c => c.id === constructorId);
            if (constructor) {
                const constructorRiderPoints = riders
                    .filter(r => {
                        if (r.constructor_id) {
                            return r.constructor_id === constructorId;
                        }
                        return r.team === constructor.name;
                    })
                    .map(r => racePointsMap[r.id] || 0)
                    .sort((a, b) => b - a);

                if (constructorRiderPoints.length > 0) {
                    const top1 = constructorRiderPoints[0] || 0;
                    const top2 = constructorRiderPoints[1] || 0;
                    constructorScore = (top1 + top2) / 2;
                }
            }
        }
        
        return riderScore + constructorScore;
    };

    if (leaderboardView === 'general') {
        return races.reduce((totalScore, race) => totalScore + calculateRaceScore(race), 0);
    }
    const race = races.find(r => r.id === leaderboardView);
    return race ? calculateRaceScore(race) : 0;
};
