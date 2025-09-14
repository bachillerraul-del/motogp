import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Sport, Participant, Race, Rider, TeamSnapshot, AllRiderPoints, Constructor, RiderRoundPoints } from '../types';
import { MOTOGP_GRID_VALUE } from '../constants';
import { getTeamForRace } from '../lib/utils';

// FIX: Added 'info' to the toast message types to support informational messages.
type ToastMessage = { id: number; message: string; type: 'success' | 'error' | 'info' };

export const useFantasyData = (sport: Sport | null) => {
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [races, setRaces] = useState<Race[]>([]);
    const [teamSnapshots, setTeamSnapshots] = useState<TeamSnapshot[]>([]);
    const [riders, setRiders] = useState<Rider[]>([]);
    const [constructors, setConstructors] = useState<Constructor[]>([]);
    const [allRiderPoints, setAllRiderPoints] = useState<AllRiderPoints>({});
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<ToastMessage | null>(null);

    const showToast = useCallback((message: string, type: 'success' | 'error' | 'info') => {
        setToast({ id: Date.now(), message, type });
    }, []);

    const fetchData = useCallback(async () => {
        if (!sport) return;
        setLoading(true);
        try {
            const participantTable = 'participants';
            const raceTable = sport === 'f1' ? 'f1_races' : 'races';
            const riderTable = sport === 'f1' ? 'f1_rider' : 'rider';
            const constructorTable = sport === 'f1' ? 'f1_constructors' : 'teams';
            const snapshotTable = sport === 'f1' ? 'f1_team_snapshots' : 'team_snapshots';
            const pointsTable = sport === 'f1' ? 'f1_rider_points' : 'rider_points';

            const [
                { data: participantsData, error: participantsError },
                { data: racesData, error: racesError },
                { data: snapshotsData, error: snapshotsError },
                { data: ridersData, error: ridersError },
                { data: constructorsData, error: constructorsError },
                { data: pointsData, error: pointsError }
            ] = await Promise.all([
                supabase.from(participantTable).select('*'),
                supabase.from(raceTable).select('*').order('round', { ascending: true }),
                supabase.from(snapshotTable).select('*'),
                supabase.from(riderTable).select('*'),
                supabase.from(constructorTable).select('*'),
                supabase.from(pointsTable).select('*')
            ]);
            
            if (participantsError) throw participantsError;
            if (racesError) throw racesError;
            if (snapshotsError) throw snapshotsError;
            if (ridersError) throw ridersError;
            if (constructorsError) throw constructorsError;
            if (pointsError) throw pointsError;

            setParticipants(participantsData || []);
            setRaces(racesData || []);
            setTeamSnapshots(snapshotsData || []);
            
            const processedRiders = (ridersData || []).map(rider => ({
                ...rider,
                initial_price: rider.initial_price ?? rider.price,
            }));
            setRiders(processedRiders);
            
            const processedConstructors = (constructorsData || []).map(constructor => {
                const constructorRiders = processedRiders.filter(rider => {
                    if (rider.constructor_id) {
                        return rider.constructor_id === constructor.id;
                    }
                    // Fallback to match by name for data consistency
                    return rider.team === constructor.name;
                });
            
                if (constructorRiders.length > 0) {
                    // Calculate current price
                    const sortedByPrice = [...constructorRiders].sort((a, b) => b.price - a.price);
                    const topTwoPrices = sortedByPrice.slice(0, 2).map(r => r.price);
                    const newPrice = topTwoPrices.reduce((a, b) => a + b, 0) / topTwoPrices.length;
            
                    // Calculate initial price
                    const sortedByInitialPrice = [...constructorRiders].sort((a, b) => b.initial_price - a.initial_price);
                    const topTwoInitialPrices = sortedByInitialPrice.slice(0, 2).map(r => r.initial_price);
                    const newInitialPrice = topTwoInitialPrices.reduce((a, b) => a + b, 0) / topTwoInitialPrices.length;
                    
                    return {
                        ...constructor,
                        price: Math.round(newPrice),
                        initial_price: Math.round(newInitialPrice)
                    };
                }
                // Add fallback for constructors without associated riders
                return {
                    ...constructor,
                    initial_price: constructor.initial_price ?? constructor.price
                };
            });
            setConstructors(processedConstructors);
            
            const pointsMap: AllRiderPoints = {};
            (pointsData || []).forEach((p: any) => {
                if (!pointsMap[p.round_id]) {
                    pointsMap[p.round_id] = {};
                }
                pointsMap[p.round_id][p.rider_id] = {
                    total: p.points || 0,
                    // Fallback for old data that doesn't have breakdown
                    main: p.main_points ?? p.points ?? 0,
                    sprint: p.sprint_points ?? 0,
                };
            });
            setAllRiderPoints(pointsMap);

        } catch (error: any) {
            console.error('Error fetching data:', error.message);
            showToast('Error al cargar los datos de la liga.', 'error');
        } finally {
            setLoading(false);
        }
    }, [sport, showToast]);

    useEffect(() => {
        if (sport) {
            fetchData();
        } else {
            setLoading(false);
        }
    }, [sport, fetchData]);

    const addParticipant = async (name: string): Promise<Participant | null> => {
        const { data: newParticipantData, error: participantError } = await supabase
            .from('participants')
            .insert({ name, team_ids: [] })
            .select()
            .single();

        if (participantError || !newParticipantData) {
            showToast('Error al crear el nuevo participante.', 'error');
            console.error(participantError);
            return null;
        }

        showToast(`¡Bienvenido a la liga, ${name}!`, 'success');
        await fetchData();
        return newParticipantData;
    };

    const addGeminiParticipant = async (): Promise<Participant | null> => {
        const existingGemini = participants.find(p => p.name === 'Gemini AI');
        if (existingGemini) {
            showToast('El participante "Gemini AI" ya existe.', 'info');
            return existingGemini;
        }
    
        const { data, error } = await supabase.from('participants').insert({ name: 'Gemini AI', team_ids: [] }).select().single();
        if (error) {
            showToast('Error al añadir a Gemini AI a la liga.', 'error');
            console.error(error);
            return null;
        }
        
        showToast('¡Gemini AI se ha unido a la liga!', 'success');
        await fetchData();
        return data;
    };


    const handleUpdateParticipantTeam = useCallback(async (participantId: number, riders: Rider[], constructor: Constructor, raceId: number): Promise<boolean> => {
        const snapshotTable = sport === 'f1' ? 'f1_team_snapshots' : 'team_snapshots';
        const { error } = await supabase.from(snapshotTable).insert({
            participant_id: participantId,
            rider_ids: riders.map(r => r.id),
            constructor_id: constructor.id,
            race_id: raceId
        });

        if (error) {
            showToast('Error al actualizar tu equipo.', 'error');
            console.error(error);
            return false;
        }
        
        await fetchData();
        return true;
    }, [sport, showToast, fetchData]);
    
    const handleUpdateParticipant = async (participant: Participant): Promise<void> => {
        const { error } = await supabase.from('participants').update({ name: participant.name }).eq('id', participant.id);
        if (error) {
            showToast(`Error al actualizar el nombre.`, 'error');
        } else {
            showToast('Nombre actualizado.', 'success');
            await fetchData();
        }
    };
    
    const handleDeleteParticipant = async (participantId: number): Promise<void> => {
        const snapshotTable = sport === 'f1' ? 'f1_team_snapshots' : 'team_snapshots';
        const { error: snapshotError } = await supabase.from(snapshotTable).delete().eq('participant_id', participantId);
        
        if (snapshotError) {
            showToast('Error al eliminar los datos del equipo del participante.', 'error');
            return;
        }

        const { error: participantError } = await supabase.from('participants').delete().eq('id', participantId);

        if (participantError) {
            showToast('Error al eliminar el participante.', 'error');
        } else {
            showToast('Participante eliminado.', 'success');
            await fetchData();
        }
    };
    
    const handleUpdateRace = async (race: Race): Promise<void> => {
        const raceTable = sport === 'f1' ? 'f1_races' : 'races';
        const { error } = await supabase.from(raceTable).update({ race_date: race.race_date, prices_adjusted: race.prices_adjusted }).eq('id', race.id);
        if (error) {
            showToast('Error al actualizar la jornada.', 'error');
        } else {
            showToast('Jornada actualizada.', 'success');
            await fetchData();
        }
    };
    
    const handleUpdateRider = async (rider: Rider): Promise<void> => {
        const riderTable = sport === 'f1' ? 'f1_rider' : 'rider';
        const { id, ...updateData } = rider;
        const { error } = await supabase.from(riderTable).update(updateData).eq('id', id);

        if (error) {
            showToast('Error al actualizar el piloto.', 'error');
            console.error(error);
        } else {
            showToast('Piloto actualizado con éxito.', 'success');
            await fetchData();
        }
    };

    const handleCreateRider = async (riderData: Omit<Rider, 'id'>): Promise<void> => {
        const riderTable = sport === 'f1' ? 'f1_rider' : 'rider';
        const { error } = await supabase.from(riderTable).insert(riderData);
        if (error) {
            showToast('Error al crear el piloto.', 'error');
            console.error(error);
        } else {
            showToast('Piloto creado con éxito.', 'success');
            await fetchData();
        }
    };
    
    const handleBulkUpdatePoints = async (
        roundId: number, 
        newPoints: Map<number, { main: number, sprint: number, total: number }>, 
        previousRiderIds: number[]
    ): Promise<void> => {
        const pointTable = sport === 'f1' ? 'f1_rider_points' : 'rider_points';
        
        const ridersToClear = previousRiderIds.filter(id => !newPoints.has(id));
        
        const upsertData = Array.from(newPoints.entries()).map(([rider_id, pointsData]) => ({
            round_id: roundId,
            rider_id,
            points: pointsData.total,
            main_points: pointsData.main,
            sprint_points: pointsData.sprint
        }));
        
        if (ridersToClear.length > 0) {
            upsertData.push(...ridersToClear.map(rider_id => ({
                round_id: roundId,
                rider_id,
                points: 0,
                main_points: 0,
                sprint_points: 0,
            })));
        }

        if (upsertData.length === 0) {
            showToast('No hay puntos que actualizar.', 'success');
            await fetchData();
            return;
        }

        const { error } = await supabase.from(pointTable).upsert(upsertData, { onConflict: 'round_id, rider_id' });

        if (error) {
            showToast('Error al guardar los puntos.', 'error');
            console.error('Bulk point update error:', error);
        } else {
            showToast('Puntos guardados con éxito.', 'success');

            // Price adjustment logic for MotoGP
            if (sport === 'motogp') {
                const { data: raceData, error: raceError } = await supabase
                    .from('races')
                    .select('prices_adjusted')
                    .eq('id', roundId)
                    .single();

                if (raceError) {
                    console.error('Error fetching race for price adjustment check:', raceError);
                } else if (raceData && !raceData.prices_adjusted) {
                    
                    showToast('Ajustando precios de los pilotos...', 'info');

                    const riderSelectionCounts = new Map<number, number>();
                    const participantsWithTeamsForRace = participants.filter(p => getTeamForRace(p.id, roundId, teamSnapshots).riderIds.length > 0);
                    const totalTeams = participantsWithTeamsForRace.length;

                    if (totalTeams > 0) {
                        participantsWithTeamsForRace.forEach(p => {
                            const { riderIds } = getTeamForRace(p.id, roundId, teamSnapshots);
                            riderIds.forEach(id => {
                                riderSelectionCounts.set(id, (riderSelectionCounts.get(id) || 0) + 1);
                            });
                        });
                    }

                    const officialRiders = riders.filter(r => r.is_official);
                    
                    let totalWeight = 0;
                    const riderWeights = officialRiders.map(rider => {
                        const pointsData = newPoints.get(rider.id) || { main: 0, sprint: 0, total: 0 };
                        const selectionCount = riderSelectionCounts.get(rider.id) || 0;
                        const popularityPercentage = totalTeams > 0 ? (selectionCount / totalTeams) * 100 : 0;
                        
                        // Weight is a mix of current price, performance (main + sprint), and popularity.
                        const POPULARITY_MULTIPLIER = 0.5;
                        
                        const performanceWeight = pointsData.total;
                        const weight = rider.price + performanceWeight + (popularityPercentage * POPULARITY_MULTIPLIER);
                        
                        totalWeight += weight;
                        return { id: rider.id, weight };
                    });

                    if (totalWeight > 0) {
                        const riderPriceUpdates = riderWeights.map(({ id, weight }) => {
                            const newPrice = Math.round((weight / totalWeight) * MOTOGP_GRID_VALUE);
                            return { id, price: newPrice };
                        });

                        const finalSum = riderPriceUpdates.reduce((sum, r) => sum + r.price, 0);
                        const difference = MOTOGP_GRID_VALUE - finalSum;
                        
                        if (difference !== 0 && riderPriceUpdates.length > 0) {
                            riderPriceUpdates.sort((a, b) => b.price - a.price);
                            riderPriceUpdates[0].price += difference;
                        }

                        const { error: updateError } = await supabase.from('rider').upsert(riderPriceUpdates);
                        
                        if (updateError) {
                            showToast('Error al actualizar los precios de los pilotos.', 'error');
                            console.error('Price update error:', updateError);
                        } else {
                            await supabase.from('races').update({ prices_adjusted: true }).eq('id', roundId);
                            showToast('Precios de los pilotos oficiales actualizados.', 'success');
                        }
                    }
                }
            }
            await fetchData();
        }
    };


    return {
        sport,
        participants,
        races,
        teamSnapshots,
        riders,
        constructors,
        allRiderPoints,
        loading,
        toast,
        setToast,
        showToast,
        fetchData,
        addParticipant,
        addGeminiParticipant,
        handleUpdateParticipantTeam,
        handleUpdateParticipant,
        handleDeleteParticipant,
        handleUpdateRace,
        handleUpdateRider,
        handleCreateRider,
        handleBulkUpdatePoints
    };
};