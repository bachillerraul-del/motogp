import type { Race, Rider, Participant, TeamSnapshot } from '../types';
import { getTeamForRace } from '../lib/utils';

export const processPriceAdjustments = (
    races: Race[],
    riders: Rider[],
    participants: Participant[],
    teamSnapshots: TeamSnapshot[]
): { ridersToUpdate: Omit<Rider, 'bike' | 'team' | 'name' | 'initial_price' | 'constructor_id'>[], raceIdsToUpdate: number[] } | null => {
    const now = new Date();
    const unprocessedPastRaces = races
        .filter(r => r.race_date && new Date(r.race_date) < now && !r.prices_adjusted)
        .sort((a, b) => new Date(a.race_date).getTime() - new Date(b.race_date).getTime());

    if (unprocessedPastRaces.length === 0) return null;

    const currentRiderPrices = new Map<number, number>();
    riders.forEach(r => currentRiderPrices.set(r.id, r.price));
    
    for (const race of unprocessedPastRaces) {
        const riderSelectionCounts = new Map<number, number>();
        
        const participantsWithTeamsForRace = participants.filter(p => {
            const { riderIds } = getTeamForRace(p.id, race.id, teamSnapshots);
            return riderIds.length > 0;
        });
        
        if (participantsWithTeamsForRace.length === 0) continue;

        participantsWithTeamsForRace.forEach(p => {
            const { riderIds } = getTeamForRace(p.id, race.id, teamSnapshots);
            riderIds.forEach(riderId => {
                riderSelectionCounts.set(riderId, (riderSelectionCounts.get(riderId) || 0) + 1);
            });
        });
        
        const totalParticipantsForRace = participantsWithTeamsForRace.length;
        
        const riderPriceChanges = new Map<number, number>();
        const dominantRiders: number[] = [], veryPopularRiders: number[] = [], popularRiders: number[] = [], differentialRiders: number[] = [], unpopularRiders: number[] = [];

        riders.forEach(rider => {
            const selectionCount = riderSelectionCounts.get(rider.id) || 0;
            const popularityPercent = totalParticipantsForRace > 0 ? (selectionCount / totalParticipantsForRace) * 100 : 0;

            if (popularityPercent > 75) dominantRiders.push(rider.id);
            else if (popularityPercent > 50) veryPopularRiders.push(rider.id);
            else if (popularityPercent > 25) popularRiders.push(rider.id);
            else if (popularityPercent > 0) { if (!rider.condition) differentialRiders.push(rider.id); }
            else { if (!rider.condition) unpopularRiders.push(rider.id); }
        });

        let totalRiderIncrease = 0;
        dominantRiders.forEach(id => { riderPriceChanges.set(id, 30); totalRiderIncrease += 30; });
        veryPopularRiders.forEach(id => { riderPriceChanges.set(id, 20); totalRiderIncrease += 20; });
        popularRiders.forEach(id => { riderPriceChanges.set(id, 10); totalRiderIncrease += 10; });

        let riderDecreaseCandidates = unpopularRiders.length > 0 ? unpopularRiders : differentialRiders;
        if (riderDecreaseCandidates.length > 0) {
            riderDecreaseCandidates.sort((a, b) => (currentRiderPrices.get(b) || 0) - (currentRiderPrices.get(a) || 0));
            let decreaseToDistribute = totalRiderIncrease;
            let candidateIndex = 0;
            while (decreaseToDistribute >= 10) {
                const riderId = riderDecreaseCandidates[candidateIndex];
                const currentChange = riderPriceChanges.get(riderId) || 0;
                riderPriceChanges.set(riderId, currentChange - 10);
                decreaseToDistribute -= 10;
                candidateIndex = (candidateIndex + 1) % riderDecreaseCandidates.length;
            }
        }

        riderPriceChanges.forEach((change, riderId) => {
            const currentPrice = currentRiderPrices.get(riderId) || 0;
            currentRiderPrices.set(riderId, Math.max(0, currentPrice + change));
        });
    }

    const ridersMap = new Map(riders.map(r => [r.id, r]));
    const ridersToUpdate = Array.from(currentRiderPrices.entries()).map(([id, newPrice]) => {
        const originalRider = ridersMap.get(id);
        return { id: id, price: newPrice, condition: originalRider?.condition ?? null };
    }).filter(r => r.price !== ridersMap.get(r.id)?.price);
    
    const raceIdsToUpdate = unprocessedPastRaces.map(r => r.id);

    return { ridersToUpdate, raceIdsToUpdate };
};
