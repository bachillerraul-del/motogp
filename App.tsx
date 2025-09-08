import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Header } from './components/Header';
import { TeamBuilder } from './components/TeamBuilder';
import { Results } from './components/Results';
import { Toast } from './components/Toast';
import { Modal } from './components/Modal';
import { supabase } from './lib/supabaseClient';
import type { Participant, Rider, Round, TeamSnapshot, LeagueSettings, AllRiderPoints } from './types';
import { MOTOGP_RIDERS } from './constants';

type View = 'builder' | 'results';

const App: React.FC = () => {
    const [view, setView] = useState<View>('builder');
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [rounds, setRounds] = useState<Round[]>([]);
    const [teamSnapshots, setTeamSnapshots] = useState<TeamSnapshot[]>([]);
    const [leagueSettings, setLeagueSettings] = useState<LeagueSettings | null>(null);
    const [riders, setRiders] = useState<Rider[]>(MOTOGP_RIDERS);
    const [allRiderPoints, setAllRiderPoints] = useState<AllRiderPoints>({});
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ id: number; message: string; type: 'success' | 'error' } | null>(null);
    
    // Auth State
    const [session, setSession] = useState<Session | null>(null);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState<string | null>(null);
    const isAdmin = !!session;

    const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        setToast({ id: Date.now(), message, type });
    }, []);

    // Auth Management
    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (_event === 'SIGNED_IN') {
                setIsLoginModalOpen(false);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError(null);
        const { error } = await supabase.auth.signInWithPassword({
            email: loginEmail,
            password: loginPassword,
        });

        if (error) {
            console.error("Login Error:", error.message);
            setLoginError('Email o contraseña inválidos.');
        } else {
            showToast('Login correcto. Modo administrador activado.', 'success');
            setLoginEmail('');
            setLoginPassword('');
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        showToast('Modo administrador desactivado.', 'success');
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        const [participantsRes, roundsRes, snapshotsRes, settingsRes, pointsRes, ridersRes] = await Promise.all([
            supabase.from('participants').select('*').order('id'),
            supabase.from('rounds').select('*').order('created_at'),
            supabase.from('team_snapshots').select('*').order('created_at'),
            supabase.from('league_settings').select('*').limit(1).single(),
            supabase.from('rider_points').select('round_id, rider_id, points'),
            supabase.from('rider').select('*').order('id')
        ]);

        if (participantsRes.error) {
            console.error('Error fetching participants:', participantsRes.error);
            showToast('No se pudieron cargar los participantes.', 'error');
        } else {
            setParticipants(participantsRes.data || []);
        }

        if (roundsRes.error) {
            console.error('Error fetching rounds:', roundsRes.error);
            showToast('No se pudieron cargar las jornadas.', 'error');
        } else {
            setRounds(roundsRes.data || []);
        }
        
        if (snapshotsRes.error) {
            console.error('Error fetching snapshots:', snapshotsRes.error);
            showToast('No se pudo cargar el historial de equipos.', 'error');
        } else {
            setTeamSnapshots(snapshotsRes.data || []);
        }

        if (settingsRes.error) {
            if (settingsRes.error.code !== 'PGRST116') {
                 console.error('Error fetching settings:', settingsRes.error);
            }
            setLeagueSettings(null);
        } else {
            setLeagueSettings(settingsRes.data || null);
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

        setLoading(false);
    }, [showToast]);


    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const addParticipantToLeague = useCallback(async (name: string, team: Rider[]): Promise<boolean> => {
        const team_ids = team.map(r => r.id);

        const { data: newParticipant, error: participantError } = await supabase
            .from('participants')
            .insert({ name, team_ids })
            .select()
            .single();

        if (participantError || !newParticipant) {
            console.error('Error adding participant:', participantError);
            showToast('Error al añadir participante. ¿Quizás el nombre ya existe?', 'error');
            return false;
        }

        const { error: snapshotError } = await supabase
            .from('team_snapshots')
            .insert({ participant_id: newParticipant.id, team_ids });
        
        if (snapshotError) {
             console.error('Error creating snapshot:', snapshotError);
             showToast('Error al guardar el historial del equipo.', 'error');
             // Attempt to roll back participant creation for consistency
             await supabase.from('participants').delete().eq('id', newParticipant.id);
             return false;
        }
        
        await fetchData(); // Refetch all data to ensure consistency
        showToast(`'${name}' ha sido añadido a la liga.`, 'success');
        setView('results');
        return true;
    }, [showToast, fetchData]);

    const handleUpdateParticipantTeam = async (participantId: number, team: Rider[]): Promise<boolean> => {
        const team_ids = team.map(r => r.id);

        const { error: updateError } = await supabase
            .from('participants')
            .update({ team_ids })
            .eq('id', participantId);

        if (updateError) {
            console.error('Error updating team:', updateError);
            showToast('Error al actualizar el equipo.', 'error');
            return false;
        }
        
        const { error: snapshotError } = await supabase
            .from('team_snapshots')
            .insert({ participant_id: participantId, team_ids });
            
        if (snapshotError) {
            console.error('Error updating snapshot:', snapshotError);
            showToast('Error al guardar el historial del equipo.', 'error');
            // Data is now inconsistent, but rolling back is complex. Refetching will show the current state.
        }
        
        await fetchData();
        showToast('Equipo actualizado con éxito.', 'success');
        return true;
    };

    const handleUpdateParticipant = async (participant: Participant) => {
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
    };
    
    const handleDeleteParticipant = async (participantId: number) => {
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
    };
    
    const handleAddRound = async (roundName: string): Promise<void> => {
        const { data, error } = await supabase
            .from('rounds')
            .insert({ name: roundName })
            .select()
            .single();

        if (error) {
            console.error('Error adding round:', error);
            showToast('Error al crear la jornada. ¿Quizás el nombre ya existe?', 'error');
        } else if (data) {
            setRounds(prev => [...prev, data]);
            showToast(`Jornada '${roundName}' creada.`, 'success');
        }
    };
    
    const handleUpdateRound = async (round: Round) => {
        const { error } = await supabase
            .from('rounds')
            .update({ name: round.name, round_date: round.round_date })
            .eq('id', round.id);

        if (error) {
            showToast('Error al actualizar la jornada.', 'error');
        } else {
            setRounds(prev => prev.map(r => r.id === round.id ? round : r));
            showToast('Jornada actualizada.', 'success');
        }
    };
    
    const handleUpdateMarketDeadline = async (deadline: string | null) => {
        const { error } = await supabase
            .from('league_settings')
            .upsert({ id: 1, market_deadline: deadline });

        if (error) {
            console.error('Error updating market deadline:', error);
            showToast('Error al actualizar la fecha límite.', 'error');
        } else {
            await fetchData(); // Refetch data to ensure UI consistency
            showToast('Fecha límite del mercado actualizada.', 'success');
        }
    };

    const handleUpdateRider = async (updatedRider: Rider): Promise<void> => {
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
    };

    const currentRound = useMemo(() => {
        const now = new Date();
        const futureRounds = rounds
            .filter(r => r.round_date && new Date(r.round_date) > now)
            .sort((a, b) => new Date(a.round_date!).getTime() - new Date(b.round_date!).getTime());
        
        return futureRounds.length > 0 ? futureRounds[0] : null;
    }, [rounds]);


    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
                <svg className="animate-spin h-10 w-10 text-red-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-xl">Cargando datos de la liga...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
            <Toast toast={toast} onClose={() => setToast(null)} />
            <Header 
                currentView={view} 
                setView={setView} 
                isAdmin={isAdmin}
                onAdminLogin={() => setIsLoginModalOpen(true)}
                onAdminLogout={handleLogout}
            />
            <main className="container mx-auto p-4 md:p-8">
                {view === 'builder' && (
                    <TeamBuilder 
                        riders={riders}
                        participants={participants}
                        onAddToLeague={addParticipantToLeague}
                        onUpdateTeam={handleUpdateParticipantTeam}
                        showToast={showToast}
                        marketDeadline={leagueSettings?.market_deadline || null}
                        currentRound={currentRound}
                    />
                )}
                {view === 'results' && (
                    <Results 
                        participants={participants}
                        rounds={rounds}
                        teamSnapshots={teamSnapshots}
                        leagueSettings={leagueSettings}
                        riders={riders}
                        isAdmin={isAdmin}
                        onUpdateParticipant={handleUpdateParticipant}
                        onDeleteParticipant={handleDeleteParticipant}
                        onAddRound={handleAddRound}
                        onUpdateRound={handleUpdateRound}
                        onUpdateMarketDeadline={handleUpdateMarketDeadline}
                        onUpdateRider={handleUpdateRider}
                        showToast={showToast}
                        allRiderPoints={allRiderPoints}
                        refetchData={fetchData}
                    />
                )}
            </main>
            <Modal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} title="Admin Login">
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                        <input
                            id="email"
                            type="email"
                            value={loginEmail}
                            onChange={(e) => setLoginEmail(e.target.value)}
                            className="w-full bg-gray-900 text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                            required
                        />
                    </div>
                     <div>
                        <label htmlFor="password"className="block text-sm font-medium text-gray-300 mb-1">Contraseña</label>
                        <input
                            id="password"
                            type="password"
                            value={loginPassword}
                            onChange={(e) => setLoginPassword(e.target.value)}
                            className="w-full bg-gray-900 text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                            required
                        />
                    </div>
                    {loginError && <p className="text-sm text-red-500">{loginError}</p>}
                    <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300">
                        Iniciar Sesión
                    </button>
                </form>
            </Modal>
        </div>
    );
};

export default App;