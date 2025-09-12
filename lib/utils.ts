import type { TeamSnapshot, Race, TeamSelection } from '../types';

export const getTeamForRace = (participantId: number, raceId: number, snapshots: TeamSnapshot[]): TeamSelection => {
    const raceSnapshots = snapshots
        .filter(s => s.participant_id === participantId && s.race_id === raceId)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
    if (raceSnapshots.length > 0) {
        const snapshot = raceSnapshots[0] as any;
        return {
            riderIds: snapshot.rider_ids || snapshot.team_ids || [],
            constructorId: snapshot.constructor_id || null
        };
    }

    return { riderIds: [], constructorId: null };
};

export const getLatestTeam = (
    participantId: number,
    sportRaces: Race[],
    allSnapshots: TeamSnapshot[]
): TeamSelection => {
    const sportRaceIds = new Set(sportRaces.map(r => r.id));
    
    const participantSportSnapshots = allSnapshots
        .filter(s => s.participant_id === participantId && s.race_id && sportRaceIds.has(s.race_id))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    if (participantSportSnapshots.length > 0) {
        const snapshot = participantSportSnapshots[0] as any;
        return {
            riderIds: snapshot.rider_ids || snapshot.team_ids || [],
            constructorId: snapshot.constructor_id || null,
        };
    }
    
    return { riderIds: [], constructorId: null };
};