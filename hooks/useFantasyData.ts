import { useState, useCallback, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import type { Participant, Rider, TeamSnapshot, AllRiderPoints, Race } from '../types';
import { MOTOGP_RIDERS } from '../constants';

export const useFantasyData = () => {
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [races, setRaces] = useState<Race[]>([]);
    const [teamSnapshots, setTeamSnapshots] = useState<TeamSnapshot[]>([]);
    const [riders, setRiders] = useState<Rider[]>(MOTOGP_RIDERS);
    const [allRiderPoints, setAllRiderPoints] = useState<AllRiderPoints>({});
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ id: number; message: string; type: 'success' | 'error' } | null>(null);

    const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        setToast({ id: Date.now(), message, type });
    }, []);

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [participantsRes, snapshotsRes, pointsRes, ridersRes, racesRes] = await Promise.all([
            supabase.from('participants').select('*').order('id'),
            supabase.from('team_snapshots').select('*').order('created_at'),
            supabase.from('rider_points').select('round_id, rider_id, points'),
            supabase.from('rider').select('*').order('id'),
            supabase.from('races').select('*').order('round')
        ]);

        if (participantsRes.error) {
            console.error('Error fetching participants:', participantsRes.error);
            showToast('No se pudieron cargar los participantes.', 'error');
        } else {
            setParticipants(participantsRes.data || []);
        }
        
        if (snapshotsRes.error) {
            console.error('Error fetching snapshots:', snapshotsRes.error);
            showToast('No se pudo cargar el historial de equipos.', 'error');
        } else {
            setTeamSnapshots(snapshotsRes.data || []);
        }

        if (pointsRes.error) {
            console.error('Error fetching rider points:', pointsRes.error);
            showToast('No se pudieron cargar los puntos de los pilotos.', 'error');
        } else if (pointsRes.data) {
            const pointsMap = pointsRes.data.reduce((acc, item) => {
                if (!acc[item.round_id]) acc[item.round_id] = {};
                acc[item.round_id][item.rider_id] = item.points || 0;
                return acc;
            }, {} as AllRiderPoints);
            setAllRiderPoints(pointsMap);
        }
        
        if (ridersRes.error) {
            console.error('Error fetching riders, using fallback:', ridersRes.error);
            showToast('Error al cargar los datos de los pilotos. Usando datos locales.', 'error');
            setRiders(MOTOGP_RIDERS); // Fallback to constants
        } else if (ridersRes.data.length === 0) {
            // Table is empty, let's seed it with the initial rider data
            console.log('Seeding rider table with initial data...');
            showToast('Inicializando datos de pilotos en la base de datos...', 'success');

            const ridersToSeed = MOTOGP_RIDERS.map(rider => ({
                id: rider.id,
                name: rider.name,
                team: rider.team,
                bike: rider.bike,
                price: rider.price,
                condition: rider.condition ?? null,
            }));

            const { error: seedError } = await supabase.from('rider').upsert(ridersToSeed);

            if (seedError) {
                console.error('Error seeding riders table:', seedError);
                showToast('Error al inicializar los datos de los pilotos.', 'error');
                setRiders(MOTOGP_RIDERS); // Fallback to local data on seed error
            } else {
                showToast('Datos de pilotos inicializados correctamente.', 'success');
                setRiders(MOTOGP_RIDERS); // Use the data we just seeded
            }
        } else {
            // We have data from the database, use it
            setRiders(ridersRes.data);
        }

        if (racesRes.error) {
            console.error('Error fetching races:', racesRes.error);
            showToast('No se pudo cargar el calendario de carreras.', 'error');
        } else {
            setRaces(racesRes.data || []);
        }


        setLoading(false);
    }, [showToast]);


    useEffect(() => {
        fetchData();
    }, [fetchData]);
    
    const addParticipantToLeague = useCallback(async (name: string, team: Rider[], raceId: number): Promise<Participant | null> => {
        const team_ids = team.map(r => r.id);

        const { data: newParticipant, error: participantError } = await supabase
            .from('participants')
            .insert({ name, team_ids })
            .select()
            .single();

        if (participantError || !newParticipant) {
            console.error('Error adding participant:', participantError);
            showToast('Error al añadir participante. ¿Quizás el nombre ya existe?', 'error');
            return null;
        }

        const { error: snapshotError } = await supabase
            .from('team_snapshots')
            .insert({ participant_id: newParticipant.id, team_ids, race_id: raceId });
        
        if (snapshotError) {
             console.error('Error creating snapshot:', snapshotError);
             showToast('Error al guardar el historial del equipo.', 'error');
             // Attempt to roll back participant creation for consistency
             await supabase.from('participants').delete().eq('id', newParticipant.id);
             return null;
        }
        
        await fetchData(); // Refetch all data to ensure consistency
        showToast(`'${name}' ha sido añadido a la liga.`, 'success');
        return newParticipant;
    }, [showToast, fetchData]);

    const handleUpdateParticipantTeam = useCallback(async (participantId: number, team: Rider[], raceId: number): Promise<boolean> => {
        const team_ids = team.map(r => r.id);

        // Update the participant's main team_ids to reflect the latest submission
        const { error: updateError } = await supabase
            .from('participants')
            .update({ team_ids })
            .eq('id', participantId);

        if (updateError) {
            console.error('Error updating participant team:', updateError);
            showToast('Error al actualizar el equipo del participante.', 'error');
            return false;
        }
        
        // Insert a new snapshot for the specific race
        const { error: snapshotError } = await supabase
            .from('team_snapshots')
            .insert({ participant_id: participantId, team_ids, race_id: raceId });
            
        if (snapshotError) {
            console.error('Error creating new team snapshot:', snapshotError);
            showToast('Error al guardar el equipo para esta jornada.', 'error');
            // Data might be slightly inconsistent, but core functionality remains.
        }
        
        await fetchData();
        showToast('Equipo actualizado con éxito para esta jornada.', 'success');
        return true;
    }, [showToast, fetchData]);

    const handleUpdateParticipant = useCallback(async (participant: Participant) => {
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
    }, [showToast]);
    
    const handleDeleteParticipant = useCallback(async (participantId: number) => {
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
    }, [showToast, fetchData]);
    
    const handleUpdateRace = useCallback(async (race: Race) => {
        const { error } = await supabase
            .from('races')
            .update({ gp_name: race.gp_name, race_date: race.race_date })
            .eq('id', race.id);

        if (error) {
            showToast('Error al actualizar la jornada.', 'error');
        } else {
            setRaces(prev => prev.map(r => r.id === race.id ? race : r));
            showToast('Jornada actualizada.', 'success');
        }
    }, [showToast]);

    const handleUpdateRider = useCallback(async (updatedRider: Rider): Promise<void> => {
        const { id, ...updateData } = updatedRider;

        // Ensure condition is handled correctly (null vs undefined)
        if (updateData.condition === undefined) {
            updateData.condition = null;
        }

        const { error } = await supabase
            .from('rider')
            .update(updateData)
            .eq('id', id);
        
        if (error) {
            console.error("Error updating rider:", error);
            showToast(`Error al actualizar a ${updatedRider.name}.`, 'error');
            throw error; // Re-throw to allow caller to handle it
        }

        setRiders(prevRiders =>
            prevRiders.map(rider =>
                rider.id === updatedRider.id ? updatedRider : rider
            )
        );
        showToast(`Piloto ${updatedRider.name} actualizado.`, 'success');
    }, [showToast]);

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
    };
};