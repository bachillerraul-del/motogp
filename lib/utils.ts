import type { TeamSnapshot } from '../types';

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
