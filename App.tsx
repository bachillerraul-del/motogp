import React, { useState, useCallback, useEffect } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Header } from './components/Header';
import { TeamBuilder } from './components/TeamBuilder';
import { Results } from './components/Results';
import { Toast } from './components/Toast';
import { Modal } from './components/Modal';
import { supabase } from './lib/supabaseClient';
import type { Participant, Rider, Round } from './types';

type View = 'builder' | 'results';

const App: React.FC = () => {
    const [view, setView] = useState<View>('builder');
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [rounds, setRounds] = useState<Round[]>([]);
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


    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            const [participantsRes, roundsRes] = await Promise.all([
                supabase.from('participants').select('*').order('id'),
                supabase.from('rounds').select('*').order('created_at')
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

            setLoading(false);
        };
        fetchData();
    }, [showToast]);

    const addParticipantToLeague = useCallback(async (name: string, team: Rider[]): Promise<boolean> => {
        const newParticipantData = {
            name,
            team_ids: team.map(r => r.id),
        };

        const { data, error } = await supabase
            .from('participants')
            .insert(newParticipantData)
            .select()
            .single();

        if (error) {
            console.error('Error adding participant:', error);
            showToast('Error al añadir participante.', 'error');
            return false;
        } 
        
        if (data) {
            setParticipants(prev => [...prev, data]);
            showToast(`'${name}' ha sido añadido a la liga.`, 'success');
            setView('results');
            return true;
        }
        return false;
    }, [showToast]);

    const handleUpdateParticipantTeam = async (participantId: number, team: Rider[]): Promise<boolean> => {
        const team_ids = team.map(r => r.id);
        const { error } = await supabase
            .from('participants')
            .update({ team_ids })
            .eq('id', participantId);

        if (error) {
            console.error('Error updating team:', error);
            showToast('Error al actualizar el equipo.', 'error');
            return false;
        }
        
        setParticipants(prev => prev.map(p => p.id === participantId ? { ...p, team_ids } : p));
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
            setParticipants(prev => prev.filter(p => p.id !== participantId));
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

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
                <svg className="animate-spin h-10 w-10 text-red-600 mb-4" xmlns="http://www.w.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
                        participants={participants}
                        onAddToLeague={addParticipantToLeague}
                        onUpdateTeam={handleUpdateParticipantTeam}
                        showToast={showToast}
                    />
                )}
                {view === 'results' && (
                    <Results 
                        participants={participants}
                        rounds={rounds}
                        isAdmin={isAdmin}
                        onUpdateParticipant={handleUpdateParticipant}
                        onDeleteParticipant={handleDeleteParticipant}
                        onAddRound={handleAddRound}
                        showToast={showToast}
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
