import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Participant, Rider, TeamSnapshot, AllRiderPoints, Race, Sport } from '../types';
import { MOTOGP_RIDERS, F1_DRIVERS, F1_RACES } from '../constants';

export const useFantasyData = (sport: Sport | null) => {
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [races, setRaces] = useState<Race[]>([]);
    const [teamSnapshots, setTeamSnapshots] = useState<TeamSnapshot[]>([]);
    const [riders, setRiders] = useState<Rider[]>([]);
    const [allRiderPoints, setAllRiderPoints] = useState<AllRiderPoints>({});
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ id: number; message: string; type: 'success' | 'error' } | null>(null);

    const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        setToast({ id: Date.now(), message, type });
    }, []);

    const fetchData = useCallback(async () => {
        if (!sport) {
            setLoading(false);
            return;
        }
        setLoading(true);

        const tableNames = {
            rider_points: sport === 'f1' ? 'f1_rider_points' : 'rider_points',
            rider: sport === 'f1' ? 'f1_rider' : 'rider',
            races: sport === 'f1' ? 'f1_races' : 'races',
        };

        const [participantsRes, motogpSnapshotsRes, f1SnapshotsRes, pointsRes, ridersRes, racesRes] = await Promise.all([
            supabase.from('participants').select('*').order('id'),
            supabase.from('team_snapshots').select('*'),
            supabase.from('f1_team_snapshots').select('*'),
            supabase.from(tableNames.rider_points).select('round_id, rider_id, points'),
            supabase.from(tableNames.rider).select('*').order('id'),
            supabase.from(tableNames.races).select('*').order('round')
        ]);

        if (participantsRes.error) console.error('Error fetching participants:', participantsRes.error);
        setParticipants(participantsRes.data || []);
        
        if (motogpSnapshotsRes.error) console.error('Error fetching MotoGP snapshots:', motogpSnapshotsRes.error);
        if (f1SnapshotsRes.error) console.error('Error fetching F1 snapshots:', f1SnapshotsRes.error);
        const allSnapshots = [
            ...(motogpSnapshotsRes.data || []),
            ...(f1SnapshotsRes.data || [])
        ].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        setTeamSnapshots(allSnapshots);

        if (pointsRes.error) console.error('Error fetching rider points:', pointsRes.error);
        if (pointsRes.data) {
            const pointsMap = pointsRes.data.reduce((acc, item) => {
                if (!acc[item.round_id]) acc[item.round_id] = {};
                acc[item.round_id][item.rider_id] = item.points || 0;
                return acc;
            }, {} as AllRiderPoints);
            setAllRiderPoints(pointsMap);
        }
        
        const initialRiders = sport === 'f1' ? F1_DRIVERS : MOTOGP_RIDERS;
        if (ridersRes.error) {
            console.error('Error fetching riders, using fallback:', ridersRes.error);
            setRiders(initialRiders);
        } else if (ridersRes.data.length === 0) {
            console.log(`Seeding ${tableNames.rider} table...`);
            const ridersToSeed = initialRiders.map(r => ({ ...r, condition: r.condition ?? null }));
            const { error: seedError } = await supabase.from(tableNames.rider).upsert(ridersToSeed);
            if (seedError) {
                console.error(`Error seeding ${tableNames.rider}:`, seedError);
                setRiders(initialRiders);
            } else {
                setRiders(initialRiders);
            }
        } else {
            setRiders(ridersRes.data);
        }

        if (racesRes.error) {
            console.error('Error fetching races:', racesRes.error);
        } else if (racesRes.data.length === 0 && sport === 'f1') {
             console.log(`Seeding ${tableNames.races} table...`);
             const { error: seedError } = await supabase.from(tableNames.races).insert(F1_RACES);
             if (seedError) {
                 console.error(`Error seeding ${tableNames.races}:`, seedError);
                 setRaces([]);
             } else {
                 const { data: newRaces } = await supabase.from(tableNames.races).select('*').order('round');
                 setRaces(newRaces || []);
             }
        } else {
            setRaces(racesRes.data || []);
        }

        setLoading(false);
    }, [sport]);


    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const addParticipantToLeague = useCallback(async (name: string, team: Rider[], raceId: number): Promise<Participant | null> => {
        if (!sport) return null;
        const snapshotTable = sport === 'f1' ? 'f1_team_snapshots' : 'team_snapshots';
        
        const team_ids = team.map(r => r.id);

        const { data: newParticipant, error: participantError } = await supabase
            .from('participants')
            .insert({ name })
            .select()
            .single();

        if (participantError || !newParticipant) {
            console.error('Error adding participant:', participantError);
            showToast('Error al añadir participante. ¿Quizás el nombre ya existe?', 'error');
            return null;
        }

        const { error: snapshotError } = await supabase
            .from(snapshotTable)
            .insert({ participant_id: newParticipant.id, team_ids, race_id: raceId });
        
        if (snapshotError) {
             console.error('Error creating snapshot:', snapshotError);
             showToast('Error al guardar el historial del equipo.', 'error');
             await supabase.from('participants').delete().eq('id', newParticipant.id);
             return null;
        }
        
        await fetchData();
        showToast(`'${name}' ha sido añadido a la liga.`, 'success');
        return newParticipant;
    }, [sport, showToast, fetchData]);

    const handleUpdateParticipantTeam = useCallback(async (participantId: number, team: Rider[], raceId: number): Promise<boolean> => {
        if (!sport) return false;
        const snapshotTable = sport === 'f1' ? 'f1_team_snapshots' : 'team_snapshots';
        const team_ids = team.map(r => r.id);
        
        const { error: snapshotError } = await supabase
            .from(snapshotTable)
            .insert({ participant_id: participantId, team_ids, race_id: raceId });
            
        if (snapshotError) {
            console.error('Error creating new team snapshot:', snapshotError);
            showToast('Error al guardar el equipo para esta jornada.', 'error');
            return false;
        }
        
        await fetchData();
        showToast('Equipo actualizado con éxito para esta jornada.', 'success');
        return true;
    }, [sport, showToast, fetchData]);

    const handleUpdateParticipant = useCallback(async (participant: Participant) => {
        if (!sport) return;
        const { id, ...updateData } = participant;
        const { error } = await supabase
            .from('participants')
            .update(updateData)
            .eq('id', id);

        if (error) {
            console.error('Error updating participant:', error);
            showToast('Error al actualizar participante.', 'error');
        } else {
            setParticipants(prev => prev.map(p => p.id === id ? participant : p));
        }
    }, [sport, showToast]);
    
    const handleDeleteParticipant = useCallback(async (participantId: number) => {
        if (!sport) return;

        // Delete snapshots from both leagues first
        const { error: tsError } = await supabase.from('team_snapshots').delete().eq('participant_id', participantId);
        const { error: f1TsError } = await supabase.from('f1_team_snapshots').delete().eq('participant_id', participantId);
        
        if (tsError) console.error("Error deleting motogp snapshots:", tsError);
        if (f1TsError) console.error("Error deleting f1 snapshots:", f1TsError);

        const { error } = await supabase
            .from('participants')
            .delete()
            .eq('id', participantId);
        
        if (error) {
             console.error('Error deleting participant:', error);
            showToast('Error al eliminar participante.', 'error');
        } else {
            await fetchData();
            showToast('Participante eliminado.', 'success');
        }
    }, [sport, showToast, fetchData]);
    
    const handleUpdateRace = useCallback(async (race: Race) => {
        if (!sport) return;
        const raceTable = sport === 'f1' ? 'f1_races' : 'races';
        const { error } = await supabase
            .from(raceTable)
            .update({ gp_name: race.gp_name, race_date: race.race_date })
            .eq('id', race.id);

        if (error) {
            showToast('Error al actualizar la jornada.', 'error');
        } else {
            setRaces(prev => prev.map(r => r.id === race.id ? race : r));
            showToast('Jornada actualizada.', 'success');
        }
    }, [sport, showToast]);

    const handleUpdateRider = useCallback(async (updatedRider: Rider): Promise<void> => {
        if (!sport) throw new Error("Sport not selected");
        const riderTable = sport === 'f1' ? 'f1_rider' : 'rider';
        const { id, ...updateData } = updatedRider;

        if (updateData.condition === undefined) {
            updateData.condition = null;
        }

        const { error } = await supabase
            .from(riderTable)
            .update(updateData)
            .eq('id', id);
        
        if (error) {
            console.error("Error updating rider:", error);
            showToast(`Error al actualizar a ${updatedRider.name}.`, 'error');
            throw error;
        }

        setRiders(prevRiders =>
            prevRiders.map(rider =>
                rider.id === updatedRider.id ? updatedRider : rider
            )
        );
        showToast(`Piloto ${updatedRider.name} actualizado.`, 'success');
    }, [sport, showToast]);

    const handleBulkUpdatePoints = useCallback(async (roundId: number, newPoints: Map<number, number>, previousRiderIds: number[]) => {
        if (!sport) return;
        const pointTable = sport === 'f1' ? 'f1_rider_points' : 'rider_points';

        const updates: { round_id: number; rider_id: number; points: number }[] = [];
        const newPointRiderIds = new Set(newPoints.keys());

        // Add new/updated points
        for (const [rider_id, points] of newPoints.entries()) {
            updates.push({ round_id: roundId, rider_id, points });
        }

        // Set points to 0 for riders who are no longer in the results
        for (const rider_id of previousRiderIds) {
            if (!newPointRiderIds.has(rider_id)) {
                updates.push({ round_id: roundId, rider_id, points: 0 });
            }
        }

        if (updates.length === 0) {
            // If there are no new points but there were previous points, we need to clear them.
            if(previousRiderIds.length > 0) {
                const { error } = await supabase.from(pointTable).delete().eq('round_id', roundId);
                 if (error) {
                    console.error("Error clearing points:", error);
                    showToast('Error al limpiar los resultados anteriores.', 'error');
                } else {
                    showToast('Resultados limpiados. No hay nuevos puntos que guardar.', 'success');
                    await fetchData();
                }
            } else {
                showToast('No hay cambios que guardar.', 'success');
            }
            return;
        }

        const { error } = await supabase.from(pointTable).upsert(updates);
        
        if (error) {
            console.error("Error bulk updating points:", error);
            showToast('Error al guardar los resultados.', 'error');
        } else {
            showToast('Resultados guardados con éxito.', 'success');
            await fetchData();
        }
    }, [sport, fetchData, showToast]);

    return {
        participants,
        races,
        teamSnapshots,
        riders,
        allRiderPoints,
        loading,
        toast,
        setToast,
        showToast,
        fetchData,
        addParticipantToLeague,
        handleUpdateParticipantTeam,
        handleUpdateParticipant,
        handleDeleteParticipant,
        handleUpdateRace,
        handleUpdateRider,
        handleBulkUpdatePoints
    };
};