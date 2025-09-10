import type { TeamSnapshot, Race } from '../types';

export const getTeamForRace = (participantId: number, raceId: number, snapshots: TeamSnapshot[]): number[] => {
    const raceSnapshots = snapshots
        .filter(s => s.participant_id === participantId && s.race_id === raceId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
    // If there are snapshots for this specific race, use the latest one
    if (raceSnapshots.length > 0) {
        return raceSnapshots[0].team_ids;
    }

    return [];
};

export const getLatestTeam = (
    participantId: number,
    sportRaces: Race[],
    allSnapshots: TeamSnapshot[]
): number[] => {
    const sportRaceIds = new Set(sportRaces.map(r => r.id));
    
    const participantSportSnapshots = allSnapshots
        .filter(s => s.participant_id === participantId && s.race_id && sportRaceIds.has(s.race_id))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return participantSportSnapshots.length > 0 ? participantSportSnapshots[0].team_ids : [];
};