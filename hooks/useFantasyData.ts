import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Sport, Participant, Race, Rider, TeamSnapshot, AllRiderPoints, Constructor } from '../types';

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
            const constructorTable = sport === 'f1' ? 'f1_constructors' : 'teams'; // FIX: Use 'teams' for MotoGP constructors
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
            setRiders(ridersData || []);
            setConstructors(constructorsData || []);
            
            const pointsMap: AllRiderPoints = {};
            (pointsData || []).forEach(p => {
                if (!pointsMap[p.round_id]) {
                    pointsMap[p.round_id] = {};
                }
                pointsMap[p.round_id][p.rider_id] = p.points;
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

    const addParticipantToLeague = async (name: string, riders: Rider[], constructor: Constructor, raceId: number): Promise<Participant | null> => {
        const { data: newParticipantData, error: participantError } = await supabase
            .from('participants')
            .insert({ name })
            .select()
            .single();

        if (participantError || !newParticipantData) {
            showToast('Error al crear el nuevo participante.', 'error');
            console.error(participantError);
            return null;
        }

        const snapshotTable = sport === 'f1' ? 'f1_team_snapshots' : 'team_snapshots';
        const { error: snapshotError } = await supabase.from(snapshotTable).insert({
            participant_id: newParticipantData.id,
            rider_ids: riders.map(r => r.id),
            constructor_id: constructor.id,
            race_id: raceId
        });

        if (snapshotError) {
            showToast('Error al guardar el equipo inicial.', 'error');
            console.error(snapshotError);
            await supabase.from('participants').delete().eq('id', newParticipantData.id);
            return null;
        }

        showToast(`¡Bienvenido a la liga, ${name}! Tu equipo ha sido guardado.`, 'success');
        await fetchData();
        return newParticipantData;
    };

    const handleUpdateParticipantTeam = async (participantId: number, riders: Rider[], constructor: Constructor, raceId: number): Promise<boolean> => {
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
        
        showToast('¡Equipo actualizado con éxito!', 'success');
        await fetchData();
        return true;
    };
    
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
    
    const handleBulkUpdatePoints = async (roundId: number, newPoints: Map<number, number>, previousRiderIds: number[]): Promise<void> => {
        const pointTable = sport === 'f1' ? 'f1_rider_points' : 'rider_points';
        
        const ridersToClear = previousRiderIds.filter(id => !newPoints.has(id));
        const upsertData = Array.from(newPoints.entries()).map(([rider_id, points]) => ({
            round_id: roundId,
            rider_id,
            points
        }));
        
        if (ridersToClear.length > 0) {
            upsertData.push(...ridersToClear.map(rider_id => ({
                round_id: roundId,
                rider_id,
                points: 0
            })));
        }

        if (upsertData.length === 0) {
            showToast('No hay puntos que actualizar.', 'success');
            return;
        }

        const { error } = await supabase.from(pointTable).upsert(upsertData, { onConflict: 'round_id, rider_id' });

        if (error) {
            showToast('Error al guardar los puntos.', 'error');
            console.error('Bulk point update error:', error);
        } else {
            showToast('Puntos guardados con éxito.', 'success');
            await fetchData();
        }
    };


    return {
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
        addParticipantToLeague,
        handleUpdateParticipantTeam,
        handleUpdateParticipant,
        handleDeleteParticipant,
        handleUpdateRace,
        handleUpdateRider,
        handleBulkUpdatePoints
    };
};
