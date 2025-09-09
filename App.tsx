import React, { useState, useCallback, useEffect, useMemo, Suspense, lazy } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Header } from './components/Header';
import { Toast } from './components/Toast';
import { Modal } from './components/Modal';
import { supabase } from './lib/supabaseClient';
import { useFantasyData } from './hooks/useFantasyData';
import { getTeamForRace } from './lib/utils';
import type { Rider, Participant, TeamSnapshot, Race } from './types';

type View = 'home' | 'builder' | 'results';

const Home = lazy(() => import('./components/Home').then(module => ({ default: module.Home })));
const TeamBuilder = lazy(() => import('./components/TeamBuilder').then(module => ({ default: module.TeamBuilder })));
const Results = lazy(() => import('./components/Results').then(module => ({ default: module.Results })));


const LoadingSpinner: React.FC<{ message: string }> = ({ message }) => (
    <div className="min-h-[calc(100vh-200px)] text-white flex flex-col items-center justify-center">
        <svg className="animate-spin h-10 w-10 text-red-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-xl">{message}</p>
    </div>
);

const App: React.FC = () => {
    const [view, setView] = useState<View>('home');
    
    // Auth State
    const [session, setSession] = useState<Session | null>(null);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState<string | null>(null);
    const isAdmin = !!session;

    const {
        participants, races, teamSnapshots, riders, allRiderPoints, loading, toast, setToast,
        showToast, fetchData, addParticipantToLeague, handleUpdateParticipantTeam, handleUpdateParticipant,
        handleDeleteParticipant, handleUpdateRace, handleUpdateRider
    } = useFantasyData();

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
    
    // Effect for automatic price adjustments, runs only for admins
    useEffect(() => {
        if (isAdmin && !loading && races.length > 0 && riders.length > 0) {
            const processPriceAdjustments = async () => {
                const now = new Date();
                const unprocessedPastRaces = races
                    .filter(r => r.race_date && new Date(r.race_date) < now && !r.prices_adjusted)
                    .sort((a, b) => new Date(a.race_date).getTime() - new Date(b.race_date).getTime());

                if (unprocessedPastRaces.length === 0) return;

                showToast(`Detectadas ${unprocessedPastRaces.length} jornadas pasadas. Ajustando precios...`, 'success');

                const currentRiderPrices = new Map<number, number>();
                riders.forEach(r => currentRiderPrices.set(r.id, r.price));
                
                for (const race of unprocessedPastRaces) {
                    const riderSelectionCounts = new Map<number, number>();
                    participants.forEach(p => {
                        const teamForRace = getTeamForRace(p.id, race.id, teamSnapshots);
                        teamForRace.forEach(riderId => {
                            riderSelectionCounts.set(riderId, (riderSelectionCounts.get(riderId) || 0) + 1);
                        });
                    });
                    
                    currentRiderPrices.forEach((currentPrice, riderId) => {
                        const selectionCount = riderSelectionCounts.get(riderId) || 0;
                        const rider = riders.find(r => r.id === riderId);
                        let newPrice = currentPrice;
                        if (selectionCount > 0) {
                            newPrice += selectionCount * 10;
                        } else if (!rider?.condition) {
                            newPrice = Math.max(100, currentPrice - 10);
                        }
                        currentRiderPrices.set(riderId, newPrice);
                    });
                }

                const ridersToUpdate = Array.from(currentRiderPrices.entries()).map(([id, price]) => ({ id, price }));
                const { error: riderUpdateError } = await supabase.from('rider').upsert(ridersToUpdate);

                if (riderUpdateError) {
                    showToast('Error crítico al actualizar los precios de los pilotos.', 'error');
                    console.error("Rider price update error:", riderUpdateError);
                    return;
                }

                const raceIdsToUpdate = unprocessedPastRaces.map(r => r.id);
                const { error: raceUpdateError } = await supabase.from('races').update({ prices_adjusted: true }).in('id', raceIdsToUpdate);

                if (raceUpdateError) {
                    showToast('Error al marcar las jornadas como procesadas.', 'error');
                    console.error("Race status update error:", raceUpdateError);
                    return;
                }
                
                showToast('Precios de pilotos actualizados. Recargando datos...', 'success');
                await fetchData();
            };
            processPriceAdjustments();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin, loading, races, riders, participants, teamSnapshots]);

    const currentRace = useMemo(() => {
        const now = new Date();
        const futureRaces = races
            .filter(r => r.race_date && new Date(r.race_date) > now)
            .sort((a, b) => new Date(a.race_date!).getTime() - new Date(b.race_date!).getTime());
        return futureRaces.length > 0 ? futureRaces[0] : null;
    }, [races]);


    if (loading) {
        return <LoadingSpinner message="Cargando datos de la liga..." />;
    }

    // A small wrapper to handle view change after adding a participant.
    const addParticipantAndSwitchView = async (name: string, team: Rider[], raceId: number): Promise<boolean> => {
        const success = await addParticipantToLeague(name, team, raceId);
        if (success) {
            setView('results');
        }
        return success;
    };

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
                 <Suspense fallback={<LoadingSpinner message={`Cargando ${view}...`} />}>
                    {view === 'home' && (
                        <Home 
                            races={races}
                            currentRace={currentRace}
                            onGoToBuilder={() => setView('builder')}
                        />
                    )}
                    {view === 'builder' && (
                        <TeamBuilder 
                            riders={riders}
                            participants={participants}
                            teamSnapshots={teamSnapshots}
                            onAddToLeague={addParticipantAndSwitchView}
                            onUpdateTeam={handleUpdateParticipantTeam}
                            showToast={showToast}
                            currentRace={currentRace}
                        />
                    )}
                    {view === 'results' && (
                        <Results 
                            participants={participants}
                            races={races}
                            teamSnapshots={teamSnapshots}
                            riders={riders}
                            isAdmin={isAdmin}
                            onUpdateParticipant={handleUpdateParticipant}
                            onDeleteParticipant={handleDeleteParticipant}
                            onUpdateRace={handleUpdateRace}
                            onUpdateRider={handleUpdateRider}
                            showToast={showToast}
                            allRiderPoints={allRiderPoints}
                            refetchData={fetchData}
                        />
                    )}
                </Suspense>
            </main>
            <Modal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} title="Admin Login">
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                        <input id="email" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className="w-full bg-gray-900 text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" required />
                    </div>
                     <div>
                        <label htmlFor="password"className="block text-sm font-medium text-gray-300 mb-1">Contraseña</label>
                        <input id="password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className="w-full bg-gray-900 text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" required />
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