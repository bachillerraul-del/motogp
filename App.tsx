import React, { useState, useCallback, useEffect, useMemo, Suspense, lazy } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Header } from './components/Header';
import { Toast } from './components/Toast';
import { Modal } from './components/Modal';
import { supabase } from './lib/supabaseClient';
import { useFantasyData } from './hooks/useFantasyData';
import { getTeamForRace } from './lib/utils';
import type { Rider, Participant, TeamSnapshot, Race, Sport, Constructor } from './types';
import { MOTOGP_BUDGET, MOTOGP_RIDER_LIMIT, F1_BUDGET, F1_RIDER_LIMIT, CONSTRUCTOR_LIMIT } from './constants';
import { MotoIcon, F1Icon } from './components/Icons';
import { BottomNav } from './components/BottomNav';


type View = 'home' | 'builder' | 'results' | 'rules' | 'riderDetail' | 'constructorDetail';

const Home = lazy(() => import('./components/Home').then(module => ({ default: module.Home })));
const TeamBuilder = lazy(() => import('./components/TeamBuilder').then(module => ({ default: module.TeamBuilder })));
const Results = lazy(() => import('./components/Results').then(module => ({ default: module.Results })));
const Login = lazy(() => import('./components/Login').then(module => ({ default: module.Login })));
const Rules = lazy(() => import('./components/Rules').then(module => ({ default: module.Rules })));
const RiderDetail = lazy(() => import('./components/RiderDetail').then(module => ({ default: module.RiderDetail })));
const ConstructorDetail = lazy(() => import('./components/ConstructorDetail').then(module => ({ default: module.ConstructorDetail })));


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

const App: React.FC = () => {
    const [sport, setSport] = useState<Sport | null>(null);
    const [view, setView] = useState<View>('home');
    const [previousView, setPreviousView] = useState<View>('home');
    const [selectedRider, setSelectedRider] = useState<Rider | null>(null);
    const [selectedConstructor, setSelectedConstructor] = useState<Constructor | null>(null);
    
    // Auth State
    const [session, setSession] = useState<Session | null>(null);
    const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [loginError, setLoginError] = useState<string | null>(null);
    const isAdmin = !!session;

    // Participant State
    const [currentUser, setCurrentUser] = useState<Participant | null>(null);
    const [isNewUserFlow, setIsNewUserFlow] = useState(false);
    const [newUserName, setNewUserName] = useState<string | null>(null);

    const {
        participants, races, teamSnapshots, riders, constructors, allRiderPoints, loading, toast, setToast,
        showToast, fetchData, addParticipantToLeague, handleUpdateParticipantTeam, handleUpdateParticipant,
        handleDeleteParticipant, handleUpdateRace, handleUpdateRider, handleBulkUpdatePoints
    } = useFantasyData(sport);

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
    
    // Theme Management
    useEffect(() => {
        document.body.className = 'bg-gray-900';
        if (sport) {
            document.body.classList.add(`sport-${sport}`);
        }
    }, [sport]);


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

    const handleAdminLogout = async () => {
        await supabase.auth.signOut();
        showToast('Modo administrador desactivado.', 'success');
    };

    const handleUserLogin = (participant: Participant) => {
        setCurrentUser(participant);
        setIsNewUserFlow(false);
        setNewUserName(null);
        showToast(`¡Hola, ${participant.name}!`, 'success');
    };

    const handleUserLogout = () => {
        setCurrentUser(null);
        setIsNewUserFlow(false);
        setNewUserName(null);
        showToast('Has cerrado sesión.', 'success');
    };

    const handleGoToBuilderForNew = (name: string) => {
        setNewUserName(name);
        setIsNewUserFlow(true);
        setView('builder');
    };
    
    useEffect(() => {
        if (isAdmin && !loading && sport && races.length > 0 && riders.length > 0 && constructors.length > 0) {
            const processPriceAdjustments = async () => {
                const now = new Date();
                const unprocessedPastRaces = races
                    .filter(r => r.race_date && new Date(r.race_date) < now && !r.prices_adjusted)
                    .sort((a, b) => new Date(a.race_date).getTime() - new Date(b.race_date).getTime());

                if (unprocessedPastRaces.length === 0) return;

                showToast(`Detectadas ${unprocessedPastRaces.length} jornadas pasadas. Ajustando precios...`, 'info');

                const currentRiderPrices = new Map<number, number>();
                riders.forEach(r => currentRiderPrices.set(r.id, r.price));

                const currentConstructorPrices = new Map<number, number>();
                constructors.forEach(c => currentConstructorPrices.set(c.id, c.price));
                
                for (const race of unprocessedPastRaces) {
                    const riderSelectionCounts = new Map<number, number>();
                    const constructorSelectionCounts = new Map<number, number>();
                    
                    const participantsWithTeamsForRace = participants.filter(p => {
                        const { riderIds, constructorId } = getTeamForRace(p.id, race.id, teamSnapshots);
                        return riderIds.length > 0 && constructorId !== null;
                    });
                    
                    if (participantsWithTeamsForRace.length === 0) continue;

                    participantsWithTeamsForRace.forEach(p => {
                        const { riderIds, constructorId } = getTeamForRace(p.id, race.id, teamSnapshots);
                        riderIds.forEach(riderId => {
                            riderSelectionCounts.set(riderId, (riderSelectionCounts.get(riderId) || 0) + 1);
                        });
                        if (constructorId) {
                            constructorSelectionCounts.set(constructorId, (constructorSelectionCounts.get(constructorId) || 0) + 1);
                        }
                    });
                    
                    const totalParticipantsForRace = participantsWithTeamsForRace.length;
                    
                    // --- Rider Price Changes ---
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

                    // --- Constructor Price Changes ---
                    const constructorPriceChanges = new Map<number, number>();
                    const dominantConstructors: number[] = [], veryPopularConstructors: number[] = [], popularConstructors: number[] = [], unpopularConstructors: number[] = [];

                    constructors.forEach(constructor => {
                        const selectionCount = constructorSelectionCounts.get(constructor.id) || 0;
                        const popularityPercent = totalParticipantsForRace > 0 ? (selectionCount / totalParticipantsForRace) * 100 : 0;

                        if (popularityPercent > 75) dominantConstructors.push(constructor.id);
                        else if (popularityPercent > 50) veryPopularConstructors.push(constructor.id);
                        else if (popularityPercent > 25) popularConstructors.push(constructor.id);
                        else if (popularityPercent === 0) unpopularConstructors.push(constructor.id);
                    });

                    let totalConstructorIncrease = 0;
                    dominantConstructors.forEach(id => { constructorPriceChanges.set(id, 30); totalConstructorIncrease += 30; });
                    veryPopularConstructors.forEach(id => { constructorPriceChanges.set(id, 20); totalConstructorIncrease += 20; });
                    popularConstructors.forEach(id => { constructorPriceChanges.set(id, 10); totalConstructorIncrease += 10; });
                    
                    let constructorDecreaseCandidates = unpopularConstructors;
                    if (constructorDecreaseCandidates.length > 0) {
                        constructorDecreaseCandidates.sort((a, b) => (currentConstructorPrices.get(b) || 0) - (currentConstructorPrices.get(a) || 0));
                        let decreaseToDistribute = totalConstructorIncrease;
                        let candidateIndex = 0;
                        while (decreaseToDistribute >= 10) {
                            const constructorId = constructorDecreaseCandidates[candidateIndex];
                            const currentChange = constructorPriceChanges.get(constructorId) || 0;
                            constructorPriceChanges.set(constructorId, currentChange - 10);
                            decreaseToDistribute -= 10;
                            candidateIndex = (candidateIndex + 1) % constructorDecreaseCandidates.length;
                        }
                    }

                    constructorPriceChanges.forEach((change, constructorId) => {
                        const currentPrice = currentConstructorPrices.get(constructorId) || 0;
                        currentConstructorPrices.set(constructorId, Math.max(0, currentPrice + change));
                    });
                }

                const ridersMap = new Map(riders.map(r => [r.id, r]));
                const ridersToUpdate = Array.from(currentRiderPrices.entries()).map(([id, newPrice]) => {
                    const originalRider = ridersMap.get(id);
                    if (!originalRider) return null;
                    const { id: riderId, ...rest } = originalRider;
                    return { ...rest, id: riderId, price: newPrice, condition: originalRider.condition ?? null };
                }).filter((r): r is NonNullable<typeof r> => r !== null && r.price !== ridersMap.get(r.id)?.price);
                
                const constructorsMap = new Map(constructors.map(c => [c.id, c]));
                const constructorsToUpdate = Array.from(currentConstructorPrices.entries()).map(([id, newPrice]) => {
                    const original = constructorsMap.get(id);
                    if (!original) return null;
                    return { ...original, price: newPrice };
                }).filter((c): c is NonNullable<typeof c> => c !== null && c.price !== constructorsMap.get(c.id)?.price);

                let didUpdate = false;
                if (ridersToUpdate.length > 0) {
                    didUpdate = true;
                    const riderTable = sport === 'f1' ? 'f1_rider' : 'rider';
                    const { error } = await supabase.from(riderTable).upsert(ridersToUpdate);
                    if (error) { showToast('Error crítico al actualizar precios de pilotos.', 'error'); console.error(error); return; }
                }
                
                if (constructorsToUpdate.length > 0) {
                    didUpdate = true;
                    const constructorTable = sport === 'f1' ? 'f1_constructors' : 'teams';
                    const { error } = await supabase.from(constructorTable).upsert(constructorsToUpdate);
                    if (error) { showToast('Error crítico al actualizar precios de escuderías.', 'error'); console.error(error); return; }
                }

                const raceIdsToUpdate = unprocessedPastRaces.map(r => r.id);
                const raceTable = sport === 'f1' ? 'f1_races' : 'races';
                const { error: raceUpdateError } = await supabase.from(raceTable).update({ prices_adjusted: true }).in('id', raceIdsToUpdate);

                if (raceUpdateError) { showToast('Error al marcar jornadas como procesadas.', 'error'); console.error(raceUpdateError); return; }
                
                if (didUpdate) {
                    showToast('Precios de pilotos y escuderías actualizados. Recargando datos...', 'success');
                    await fetchData();
                }
            };
            processPriceAdjustments();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isAdmin, loading, races, riders, constructors, participants, teamSnapshots, sport]);

    const currentRace = useMemo(() => {
        const now = new Date();
        const futureRaces = races
            .filter(r => r.race_date && new Date(r.race_date) > now)
            .sort((a, b) => new Date(a.race_date!).getTime() - new Date(b.race_date!).getTime());
        return futureRaces.length > 0 ? futureRaces[0] : null;
    }, [races]);

    const handleSwitchSport = () => {
        setSport(prevSport => (prevSport === 'motogp' ? 'f1' : 'motogp'));
        setView('home');
    };

    const handleSelectRider = useCallback((rider: Rider) => {
        setPreviousView(view);
        setSelectedRider(rider);
        setView('riderDetail');
    }, [view]);
    
    const handleSelectConstructor = useCallback((constructor: Constructor) => {
        setPreviousView(view);
        setSelectedConstructor(constructor);
        setView('constructorDetail');
    }, [view]);

    const handleBack = useCallback(() => {
        setView(previousView);
        setSelectedRider(null);
        setSelectedConstructor(null);
    }, [previousView]);

    if (!sport) {
        return <SportSelector onSelect={setSport} />;
    }

    if (loading) {
        return <LoadingSpinner message="Cargando datos de la liga..." sport={sport} />;
    }

    const addParticipantAndSwitchView = async (name: string, team: Rider[], constructor: Constructor, raceId: number): Promise<boolean> => {
        const newParticipant = await addParticipantToLeague(name, team, constructor, raceId);
        if (newParticipant) {
            setView('results');
            handleUserLogin(newParticipant);
            return true;
        }
        return false;
    };


    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
            <Toast toast={toast} onClose={() => setToast(null)} />

            {!currentUser && !isNewUserFlow ? (
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
                                    races={races}
                                    currentRace={currentRace}
                                    onGoToBuilder={() => setView('builder')}
                                    sport={sport}
                                    currentUser={currentUser}
                                    participants={participants}
                                    teamSnapshots={teamSnapshots}
                                    riders={riders}
                                    constructors={constructors}
                                    allRiderPoints={allRiderPoints}
                                />
                            )}
                            {view === 'builder' && (
                                <TeamBuilder 
                                    races={races}
                                    riders={riders}
                                    constructors={constructors}
                                    participants={participants}
                                    teamSnapshots={teamSnapshots}
                                    onAddToLeague={addParticipantAndSwitchView}
                                    onUpdateTeam={handleUpdateParticipantTeam}
                                    showToast={showToast}
                                    currentRace={currentRace}
                                    currentUser={currentUser}
                                    newUserName={newUserName}
                                    BUDGET={constants.BUDGET}
                                    RIDER_LIMIT={constants.RIDER_LIMIT}
                                    CONSTRUCTOR_LIMIT={constants.CONSTRUCTOR_LIMIT}
                                    currencyPrefix={constants.CURRENCY_PREFIX}
                                    currencySuffix={constants.CURRENCY_SUFFIX}
                                    sport={sport}
                                    onSelectRider={handleSelectRider}
                                    onSelectConstructor={handleSelectConstructor}
                                />
                            )}
                            {view === 'results' && (
                                <Results 
                                    participants={participants}
                                    races={races}
                                    teamSnapshots={teamSnapshots}
                                    riders={riders}
                                    constructors={constructors}
                                    isAdmin={isAdmin}
                                    onUpdateParticipant={handleUpdateParticipant}
                                    onDeleteParticipant={handleDeleteParticipant}
                                    onUpdateRace={handleUpdateRace}
                                    onUpdateRider={handleUpdateRider}
                                    handleBulkUpdatePoints={handleBulkUpdatePoints}
                                    showToast={showToast}
                                    allRiderPoints={allRiderPoints}
                                    refetchData={fetchData}
                                    sport={sport}
                                    RIDER_LIMIT={constants.RIDER_LIMIT}
                                    CONSTRUCTOR_LIMIT={constants.CONSTRUCTOR_LIMIT}
                                    currencyPrefix={constants.CURRENCY_PREFIX}
                                    currencySuffix={constants.CURRENCY_SUFFIX}
                                    currentUser={currentUser}
                                    onSelectRider={handleSelectRider}
                                />
                            )}
                            {view === 'rules' && (
                                <Rules sport={sport}/>
                            )}
                            {view === 'riderDetail' && selectedRider && (
                                <RiderDetail
                                    rider={selectedRider}
                                    races={races}
                                    allRiderPoints={allRiderPoints}
                                    participants={participants}
                                    teamSnapshots={teamSnapshots}
                                    sport={sport}
                                    onBack={handleBack}
                                    currencyPrefix={constants.CURRENCY_PREFIX}
                                    currencySuffix={constants.CURRENCY_SUFFIX}
                                />
                            )}
                             {view === 'constructorDetail' && selectedConstructor && (
                                <ConstructorDetail
                                    constructor={selectedConstructor}
                                    races={races}
                                    allRiderPoints={allRiderPoints}
                                    participants={participants}
                                    teamSnapshots={teamSnapshots}
                                    riders={riders}
                                    sport={sport}
                                    onBack={handleBack}
                                    currencyPrefix={constants.CURRENCY_PREFIX}
                                    currencySuffix={constants.CURRENCY_SUFFIX}
                                />
                            )}
                        </Suspense>
                    </main>

                    <BottomNav
                        currentView={view}
                        setView={setView}
                        sport={sport}
                    />
                </>
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
};

export default App;