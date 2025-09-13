import React, { useState, useCallback, useEffect, useMemo, Suspense, lazy } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Header } from './components/Header';
import { Toast } from './components/Toast';
import { Modal } from './components/Modal';
import { supabase } from './lib/supabaseClient';
import { useFantasyData } from './hooks/useFantasyData';
import type { Rider, Participant, Race, Sport, Constructor, View } from './types';
import { MOTOGP_BUDGET, MOTOGP_RIDER_LIMIT, F1_BUDGET, F1_RIDER_LIMIT, CONSTRUCTOR_LIMIT } from './constants';
import { MotoIcon, F1Icon } from './components/Icons';
import { BottomNav } from './components/BottomNav';
import { FantasyDataProvider, useFantasy } from './contexts/FantasyDataContext';
import { processPriceAdjustments } from './services/leagueService';
import { RiderDetailModal } from './components/RiderDetailModal';
import { ConstructorDetailModal } from './components/ConstructorDetailModal';


const Home = lazy(() => import('./components/Home').then(module => ({ default: module.Home })));
const TeamBuilder = lazy(() => import('./components/TeamBuilder').then(module => ({ default: module.TeamBuilder })));
const Results = lazy(() => import('./components/Results').then(module => ({ default: module.Results })));
const Login = lazy(() => import('./components/Login').then(module => ({ default: module.Login })));
const Rules = lazy(() => import('./components/Rules').then(module => ({ default: module.Rules })));
const LeagueStats = lazy(() => import('./components/LeagueStats').then(module => ({ default: module.LeagueStats })));


const SportSelector: React.FC<{ onSelect: (sport: Sport) => void }> = ({ onSelect }) => (
    <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4 animate-fadeIn">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white uppercase mb-10">
            Fantasy League
        </h1>
        <p className="text-xl text-gray-300 mb-12">Elige tu competición</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-2xl">
            <div
                onClick={() => onSelect('motogp')}
                className="bg-gray-800 rounded-lg p-8 text-center transition-all duration-300 hover:bg-orange-500 hover:scale-105 cursor-pointer shadow-lg flex flex-col items-center gap-4"
                role="button"
            >
                <MotoIcon className="text-7xl"/>
                <h2 className="text-3xl font-bold text-white">MotoGP</h2>
            </div>
            <div
                onClick={() => onSelect('f1')}
                className="bg-gray-800 rounded-lg p-8 text-center transition-all duration-300 hover:bg-red-600 hover:scale-105 cursor-pointer shadow-lg flex flex-col items-center gap-4"
                role="button"
            >
                <F1Icon className="text-7xl"/>
                <h2 className="text-3xl font-bold text-white">Formula 1</h2>
            </div>
        </div>
    </div>
);

const LoadingSpinner: React.FC<{ message: string, sport: Sport | null }> = ({ message, sport }) => (
    <div className="min-h-screen text-white flex flex-col items-center justify-center bg-gray-900">
        <svg className={`animate-spin h-10 w-10 mb-4 ${sport === 'f1' ? 'text-red-600' : 'text-orange-500'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <p className="text-xl">{message}</p>
    </div>
);

// FIX: Correctly type `setSport` to accept a state updater function.
const MainApp: React.FC<{ sport: Sport; setSport: React.Dispatch<React.SetStateAction<Sport | null>> }> = ({ sport, setSport }) => {
    const [view, setView] = useState<View>('home');
    const [viewingRider, setViewingRider] = useState<Rider | null>(null);
    const [viewingConstructor, setViewingConstructor] = useState<Constructor | null>(null);

    const [session, setSession] = useState<Session | null>(null);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState<string | null>(null);
    const isAdmin = !!session;

    const [currentUser, setCurrentUser] = useState<Participant | null>(null);
    
    const {
        participants, races, teamSnapshots, riders, constructors, loading, toast, setToast,
        showToast, fetchData, addParticipant, addGeminiParticipant, handleUpdateParticipantTeam
    } = useFantasy();

    const constants = useMemo(() => {
        if (sport === 'f1') {
            return {
                BUDGET: F1_BUDGET,
                RIDER_LIMIT: F1_RIDER_LIMIT,
                CONSTRUCTOR_LIMIT: CONSTRUCTOR_LIMIT,
                CURRENCY_PREFIX: '$',
                CURRENCY_SUFFIX: 'M'
            };
        }
        return {
            BUDGET: MOTOGP_BUDGET,
            RIDER_LIMIT: MOTOGP_RIDER_LIMIT,
            CONSTRUCTOR_LIMIT: CONSTRUCTOR_LIMIT,
            CURRENCY_PREFIX: '€',
            CURRENCY_SUFFIX: ''
        };
    }, [sport]);
    
    useEffect(() => {
        document.body.className = 'bg-gray-900';
        document.body.classList.add(`sport-${sport}`);
    }, [sport]);

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setSession(session);
            if (_event === 'SIGNED_IN') setIsLoginModalOpen(false);
        });
        return () => subscription.unsubscribe();
    }, []);

    useEffect(() => {
        const runPriceAdjustments = async () => {
            if (isAdmin && !loading && sport && races.length > 0 && riders.length > 0) {
                const adjustmentData = processPriceAdjustments(races, riders, participants, teamSnapshots);
                if (adjustmentData && (adjustmentData.ridersToUpdate.length > 0 || adjustmentData.raceIdsToUpdate.length > 0)) {
                    showToast(`Detectadas ${adjustmentData.raceIdsToUpdate.length} jornadas pasadas. Ajustando precios...`, 'info');

                    let didUpdate = false;
                    if (adjustmentData.ridersToUpdate.length > 0) {
                        didUpdate = true;
                        const riderTable = sport === 'f1' ? 'f1_rider' : 'rider';
                        const { error } = await supabase.from(riderTable).upsert(adjustmentData.ridersToUpdate);
                        if (error) { showToast('Error crítico al actualizar precios de pilotos.', 'error'); console.error(error); return; }
                    }
                    
                    if (adjustmentData.raceIdsToUpdate.length > 0) {
                        const raceTable = sport === 'f1' ? 'f1_races' : 'races';
                        const { error: raceUpdateError } = await supabase.from(raceTable).update({ prices_adjusted: true }).in('id', adjustmentData.raceIdsToUpdate);
                        if (raceUpdateError) { showToast('Error al marcar jornadas como procesadas.', 'error'); console.error(raceUpdateError); return; }
                    }
                    
                    if (didUpdate) {
                        showToast('Precios de pilotos actualizados. Recargando datos...', 'success');
                        await fetchData();
                    } else if (adjustmentData.raceIdsToUpdate.length > 0) {
                        await fetchData();
                    }
                }
            }
        };
        runPriceAdjustments();
    }, [isAdmin, loading, sport, races, riders, participants, teamSnapshots, showToast, fetchData]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoginError(null);
        const { error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
        if (error) {
            setLoginError('Email o contraseña inválidos.');
        } else {
            showToast('Login correcto. Modo administrador activado.', 'success');
            setLoginEmail('');
            setLoginPassword('');
        }
    };

    const handleAdminLogout = async () => {
        await supabase.auth.signOut();
        showToast('Modo administrador desactivado.', 'success');
    };

    const handleUserLogin = (participant: Participant) => {
        setCurrentUser(participant);
        showToast(`¡Hola, ${participant.name}!`, 'success');
    };

    const handleUserLogout = () => {
        setCurrentUser(null);
    };

    const handleGoToBuilderForNew = async (name: string) => {
        const newParticipant = await addParticipant(name);
        if (newParticipant) {
            handleUserLogin(newParticipant);
            setView('builder');
        }
    };

    const currentRace = useMemo(() => {
        const now = new Date();
        return races
            .filter(r => r.race_date && new Date(r.race_date) > now)
            .sort((a, b) => new Date(a.race_date!).getTime() - new Date(b.race_date!).getTime())[0] || null;
    }, [races]);

    const handleSwitchSport = () => {
        setSport(prevSport => (prevSport === 'motogp' ? 'f1' : 'motogp'));
        setView('home');
    };
    
    const handleSelectRiderForDetail = useCallback((rider: Rider) => setViewingRider(rider), []);
    const handleSelectConstructorForDetail = useCallback((constructor: Constructor) => setViewingConstructor(constructor), []);
    const handleCloseDetailModal = useCallback(() => {
        setViewingRider(null);
        setViewingConstructor(null);
    }, []);

    if (loading) {
        return <LoadingSpinner message="Cargando datos de la liga..." sport={sport} />;
    }

    return (
         <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
            <Toast toast={toast} onClose={() => setToast(null)} />

            {!currentUser ? (
                <Suspense fallback={<LoadingSpinner message="Cargando..." sport={sport} />}>
                    <Login
                        participants={participants}
                        onLogin={handleUserLogin}
                        onGoToBuilderForNew={handleGoToBuilderForNew}
                        sport={sport}
                        onAdminLogin={() => setIsLoginModalOpen(true)}
                    />
                </Suspense>
            ) : (
                <>
                    <Header
                        currentView={view}
                        isAdmin={isAdmin}
                        onAdminLogin={() => setIsLoginModalOpen(true)}
                        onAdminLogout={handleAdminLogout}
                        currentUser={currentUser}
                        onUserLogout={handleUserLogout}
                        sport={sport}
                        onSwitchSport={handleSwitchSport}
                    />
                    <main className="container mx-auto p-4 pb-24">
                        <Suspense fallback={<LoadingSpinner message={`Cargando ${view}...`} sport={sport} />}>
                            {view === 'home' && (
                                <Home 
                                    onGoToBuilder={() => setView('builder')}
                                    onGoToResults={() => setView('results')}
                                    sport={sport}
                                    currentUser={currentUser}
                                    currentRace={currentRace}
                                />
                            )}
                            {view === 'builder' && (
                                <TeamBuilder 
                                    onUpdateTeam={handleUpdateParticipantTeam}
                                    currentRace={currentRace}
                                    currentUser={currentUser}
                                    BUDGET={constants.BUDGET}
                                    RIDER_LIMIT={constants.RIDER_LIMIT}
                                    CONSTRUCTOR_LIMIT={constants.CONSTRUCTOR_LIMIT}
                                    currencyPrefix={constants.CURRENCY_PREFIX}
                                    currencySuffix={constants.CURRENCY_SUFFIX}
                                    sport={sport}
                                    onSelectRider={handleSelectRiderForDetail}
                                    onSelectConstructor={handleSelectConstructorForDetail}
                                />
                            )}
                            {view === 'results' && (
                                <Results 
                                    isAdmin={isAdmin}
                                    sport={sport}
                                    RIDER_LIMIT={constants.RIDER_LIMIT}
                                    CONSTRUCTOR_LIMIT={constants.CONSTRUCTOR_LIMIT}
                                    currencyPrefix={constants.CURRENCY_PREFIX}
                                    currencySuffix={constants.CURRENCY_SUFFIX}
                                    currentUser={currentUser}
                                    currentRace={currentRace}
                                    onSelectRider={handleSelectRiderForDetail}
                                    addGeminiParticipant={addGeminiParticipant}
                                    onUpdateTeam={handleUpdateParticipantTeam}
                                />
                            )}
                            {view === 'rules' && <Rules sport={sport}/>}
                            {view === 'stats' && <LeagueStats sport={sport} currencyPrefix={constants.CURRENCY_PREFIX} currencySuffix={constants.CURRENCY_SUFFIX}/>}
                        </Suspense>
                    </main>
                    <BottomNav currentView={view} setView={setView} sport={sport} />
                </>
            )}

            {viewingRider && (
                <RiderDetailModal 
                    rider={viewingRider}
                    sport={sport}
                    onClose={handleCloseDetailModal}
                    currencyPrefix={constants.CURRENCY_PREFIX}
                    currencySuffix={constants.CURRENCY_SUFFIX}
                />
            )}
            
            {viewingConstructor && (
                 <ConstructorDetailModal
                    constructorItem={viewingConstructor}
                    sport={sport}
                    onClose={handleCloseDetailModal}
                    currencyPrefix={constants.CURRENCY_PREFIX}
                    currencySuffix={constants.CURRENCY_SUFFIX}
                />
            )}


            <Modal isOpen={isLoginModalOpen} onClose={() => setIsLoginModalOpen(false)} title="Admin Login" sport={sport}>
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email</label>
                        <input id="email" type="email" value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} className={`w-full bg-gray-900 text-white p-2 rounded-md focus:outline-none focus:ring-2 ${sport === 'f1' ? 'focus:ring-red-500' : 'focus:ring-orange-500'}`} required />
                    </div>
                     <div>
                        <label htmlFor="password"className="block text-sm font-medium text-gray-300 mb-1">Contraseña</label>
                        <input id="password" type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} className={`w-full bg-gray-900 text-white p-2 rounded-md focus:outline-none focus:ring-2 ${sport === 'f1' ? 'focus:ring-red-500' : 'focus:ring-orange-500'}`} required />
                    </div>
                    {loginError && <p className="text-sm text-red-500">{loginError}</p>}
                    <button type="submit" className={`w-full text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 ${sport === 'f1' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'}`}>
                        Iniciar Sesión
                    </button>
                </form>
            </Modal>
        </div>
    );
}

const App: React.FC = () => {
    const [sport, setSport] = useState<Sport | null>(null);

    if (!sport) {
        return <SportSelector onSelect={setSport} />;
    }

    return (
        <FantasyDataProvider sport={sport}>
            <MainApp sport={sport} setSport={setSport} />
        </FantasyDataProvider>
    );
};

export default App;