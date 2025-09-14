
import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Rider, Race, Participant, Sport, Constructor } from '../types';
import { TeamSidebar } from './TeamSidebar';
import { getLatestTeam } from '../lib/utils';
import { ArrowPathIcon, ExclamationTriangleIcon, CheckIcon } from './Icons';
import { RiderCard } from './RiderCard';
import { ConstructorCard } from './ConstructorCard';
import { useFantasy } from '../contexts/FantasyDataContext';

// Helper function to create a unique, sorted identifier for a team selection.
const getTeamIdentifier = (riders: Rider[], constructor: Constructor | null): string => {
    const riderIds = riders.map(r => r.id).sort().join(',');
    const constructorId = constructor ? constructor.id : 'null';
    return `riders:${riderIds}|constructor:${constructorId}`;
};

// --- TeamBuilder Component and Children ---
type SaveState = 'idle' | 'saving' | 'saved' | 'error';
interface TeamBuilderProps {
    onUpdateTeam: (participantId: number, riders: Rider[], constructor: Constructor, raceId: number) => Promise<boolean>;
    currentRace: Race | null;
    currentUser: Participant | null;
    BUDGET: number;
    RIDER_LIMIT: number;
    CONSTRUCTOR_LIMIT: number;
    currencyPrefix: string;
    currencySuffix: string;
    sport: Sport;
    onSelectRider: (rider: Rider) => void;
    onSelectConstructor: (constructor: Constructor) => void;
}

export const TeamBuilder: React.FC<TeamBuilderProps> = (props) => {
    const {
        onUpdateTeam, currentRace, currentUser,
        BUDGET, RIDER_LIMIT, CONSTRUCTOR_LIMIT, currencyPrefix, currencySuffix, sport, onSelectRider, onSelectConstructor
    } = props;
    
    const { riders, constructors, races, teamSnapshots, showToast, participants } = useFantasy();
    
    const initialTeam = useMemo(() => {
        if (!currentUser) return { initialRiders: [], initialConstructor: null };
        const { riderIds, constructorId } = getLatestTeam(currentUser.id, races, teamSnapshots);
        const initialRiders = riders.filter(r => riderIds.includes(r.id));
        const initialConstructor = constructors.find(c => c.id === constructorId) || null;
        return { initialRiders, initialConstructor };
    }, [currentUser, races, teamSnapshots, riders, constructors]);

    const [selectedRiders, setSelectedRiders] = useState<Rider[]>(initialTeam.initialRiders);
    const [selectedConstructor, setSelectedConstructor] = useState<Constructor | null>(initialTeam.initialConstructor);
    const [isTeamSheetOpen, setIsTeamSheetOpen] = useState(false);
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const isInitialMount = useRef(true);
    const saveStateResetTimer = useRef<number | null>(null);
    const [activeTab, setActiveTab] = useState<'constructors' | 'riders'>('constructors');

    const initialTeamIdentifier = useMemo(() => getTeamIdentifier(initialTeam.initialRiders, initialTeam.initialConstructor), [initialTeam]);

    const remainingBudget = useMemo(() => {
        const riderCost = selectedRiders.reduce((total, rider) => total + rider.price, 0);
        const constructorCost = selectedConstructor?.price || 0;
        return BUDGET - riderCost - constructorCost;
    }, [selectedRiders, selectedConstructor, BUDGET]);
    
    const isTeamValid = selectedRiders.length === RIDER_LIMIT && !!selectedConstructor && remainingBudget >= 0;

    useEffect(() => {
        return () => { if (saveStateResetTimer.current) clearTimeout(saveStateResetTimer.current); };
    }, []);

    useEffect(() => {
        if (saveStateResetTimer.current) clearTimeout(saveStateResetTimer.current);
    
        if (isInitialMount.current) {
            isInitialMount.current = false;
            // If there's an initial team, mark it as 'saved' to give user confidence
            if (initialTeam.initialRiders.length > 0 || initialTeam.initialConstructor) {
                setSaveState('saved');
                saveStateResetTimer.current = window.setTimeout(() => setSaveState('idle'), 3000);
            }
            return;
        }
    
        const currentTeamIdentifier = getTeamIdentifier(selectedRiders, selectedConstructor);
    
        if (currentTeamIdentifier === initialTeamIdentifier) {
            setSaveState('saved');
            return;
        }
    
        if (!isTeamValid) {
            setSaveState('idle');
            return;
        }
        
        const save = async () => {
            if (!currentUser || !currentRace || !selectedConstructor) return;
    
            setSaveState('saving');
            const success = await onUpdateTeam(currentUser.id, selectedRiders, selectedConstructor, currentRace.id);
    
            if (success) {
                showToast('Equipo guardado automáticamente.', 'success');
            } else {
                setSaveState('error');
                showToast('Error al guardar. Se restauró tu equipo anterior.', 'error');
                
                setSelectedRiders(initialTeam.initialRiders);
                setSelectedConstructor(initialTeam.initialConstructor);
                
                saveStateResetTimer.current = window.setTimeout(() => setSaveState('idle'), 4000);
            }
        };
    
        save();
    
        return () => { if (saveStateResetTimer.current) clearTimeout(saveStateResetTimer.current); };
    
    }, [
        selectedRiders, 
        selectedConstructor, 
        isTeamValid, 
        initialTeamIdentifier, 
        currentUser, 
        currentRace, 
        onUpdateTeam, 
        showToast, 
        initialTeam.initialRiders,
        initialTeam.initialConstructor
    ]);


    const formatPrice = (price: number): string => {
        const value = currencySuffix === 'M' ? (price / 10).toFixed(1) : price.toLocaleString('es-ES');
        return `${currencyPrefix}${value}${currencySuffix}`;
    }

    const teamRiderIds = useMemo(() => new Set(selectedRiders.map(r => r.id)), [selectedRiders]);

    const selectionsByRider = useMemo(() => {
        const selections = new Map<number, string[]>();
        const latestTeams = participants.map(p => ({
            participantName: p.name,
            team: getLatestTeam(p.id, races, teamSnapshots)
        }));

        latestTeams.forEach(({ participantName, team }) => {
            team.riderIds.forEach(riderId => {
                const current = selections.get(riderId) || [];
                if (!current.includes(participantName)) {
                    selections.set(riderId, [...current, participantName]);
                }
            });
        });
        return selections;
    }, [participants, races, teamSnapshots]);

     const structuredData = useMemo(() => {
        const sortedConstructors = [...constructors].sort((a, b) => b.price - a.price);
        const allOfficialRiders = riders.filter(r => r.is_official);
        const reserveRiders = riders.filter(r => !r.is_official);
        
        const ridersByConstructor = new Map<number, Rider[]>();
        allOfficialRiders.forEach(rider => {
            const constructorId = rider.constructor_id;
            if (!ridersByConstructor.has(constructorId)) {
                ridersByConstructor.set(constructorId, []);
            }
            ridersByConstructor.get(constructorId)!.push(rider);
        });

        ridersByConstructor.forEach(teamRiders => teamRiders.sort((a, b) => b.price - a.price));

        const isUnavailable = (rider: Rider) => rider.condition?.includes('unavailable') || rider.condition?.includes('injured');
        const sortedReserveRiders = reserveRiders.sort((a, b) => {
            if (isUnavailable(a) && !isUnavailable(b)) return 1;
            if (!isUnavailable(a) && isUnavailable(b)) return -1;
            return b.price - a.price;
        });

        return { sortedConstructors, ridersByConstructor, sortedReserveRiders };
    }, [riders, constructors]);


    const handleRemoveRider = (riderId: number) => {
        setSelectedRiders(selectedRiders.filter(rider => rider.id !== riderId));
    };

    const handleToggleRider = (rider: Rider) => {
        if (teamRiderIds.has(rider.id)) {
            handleRemoveRider(rider.id);
        } else {
            if (selectedRiders.length >= RIDER_LIMIT) {
                showToast('Ya has seleccionado el máximo de pilotos.', 'error');
                return;
            }
            setSelectedRiders([...selectedRiders, rider]);
        }
    };

    const handleToggleConstructor = (constructor: Constructor) => {
        if (selectedConstructor?.id === constructor.id) {
            setSelectedConstructor(null);
        } else {
            setSelectedConstructor(constructor);
        }
    };
    
    const handleRemoveConstructor = () => setSelectedConstructor(null);
    
    const renderSaveStatus = () => {
        switch (saveState) {
            case 'saving': return <div className="flex items-center justify-center gap-2 text-center text-sm text-yellow-400 p-2 bg-yellow-500/10 rounded-lg"><ArrowPathIcon className="w-4 h-4 animate-spin" /> Guardando...</div>;
            case 'saved': return <div className="flex items-center justify-center gap-2 text-center text-sm text-green-400 p-2 bg-green-500/10 rounded-lg animate-fadeIn"><CheckIcon className="w-4 h-4" /> Equipo guardado</div>;
            case 'error': return <div className="flex items-center justify-center gap-2 text-center text-sm text-red-500 p-2 bg-red-500/10 rounded-lg"><ExclamationTriangleIcon className="w-4 h-4" /> Error al guardar</div>;
            case 'idle': default:
                if (isTeamValid) return <div className="flex items-center justify-center gap-2 text-center text-sm text-green-400 p-2"><CheckIcon className="w-4 h-4" /> ¡Equipo listo!</div>;
                return null;
        }
    };

    if (!currentRace) {
        return (
            <div className="text-center py-20 bg-gray-800 rounded-lg">
                <h2 className="text-2xl font-bold text-white">Mercado Cerrado</h2>
                <p className="text-gray-400 mt-2">No es posible crear o modificar equipos en este momento.</p>
            </div>
        );
    }
    
    const theme = {
        activeTab: sport === 'f1' ? 'border-red-500 text-white' : 'border-orange-500 text-white',
        inactiveTab: 'border-transparent text-gray-400 hover:text-white',
        border: sport === 'f1' ? 'border-red-600/30' : 'border-orange-500/30'
    };


    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Main selection area */}
            <div className="md:col-span-2">
                <div className="flex border-b border-gray-700 mb-6">
                    <button
                        onClick={() => setActiveTab('constructors')}
                        className={`flex-1 py-3 text-center font-semibold transition-colors uppercase tracking-wider text-sm border-b-2 ${activeTab === 'constructors' ? theme.activeTab : theme.inactiveTab}`}
                    >
                        Escuderías
                    </button>
                    <button
                        onClick={() => setActiveTab('riders')}
                        className={`flex-1 py-3 text-center font-semibold transition-colors uppercase tracking-wider text-sm border-b-2 ${activeTab === 'riders' ? theme.activeTab : theme.inactiveTab}`}
                    >
                        Pilotos
                    </button>
                </div>
                
                {activeTab === 'constructors' && (
                    <div className="animate-fadeIn grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {structuredData.sortedConstructors.map(c => (
                            <ConstructorCard
                                key={c.id}
                                constructorItem={c}
                                onAdd={handleToggleConstructor}
                                onSelect={onSelectConstructor}
                                isSelected={selectedConstructor?.id === c.id}
                                isAffordable={remainingBudget >= c.price || selectedConstructor?.id === c.id}
                                priceChange={c.price - c.initial_price}
                                currencyPrefix={currencyPrefix}
                                currencySuffix={currencySuffix}
                                riders={riders}
                                sport={sport}
                            />
                        ))}
                    </div>
                )}
                
                {activeTab === 'riders' && (
                    <div className="animate-fadeIn space-y-8">
                        {structuredData.sortedConstructors.map(constructor => {
                            const teamRiders = structuredData.ridersByConstructor.get(constructor.id) || [];
                            if (teamRiders.length === 0) return null;
                            return (
                                <div key={constructor.id}>
                                    <h2 className={`text-2xl font-bold text-gray-200 border-b-2 ${theme.border} pb-2 mb-4`}>{constructor.name.toUpperCase()}</h2>
                                    <div className="grid grid-cols-2 gap-4">
                                        {teamRiders.map(rider => (
                                            <RiderCard
                                                key={rider.id}
                                                rider={rider}
                                                onAdd={handleToggleRider}
                                                onSelect={onSelectRider}
                                                isRiderTeamFull={selectedRiders.length >= RIDER_LIMIT}
                                                isInTeam={teamRiderIds.has(rider.id)}
                                                isAffordable={remainingBudget >= rider.price || teamRiderIds.has(rider.id)}
                                                selectedByTeams={selectionsByRider.get(rider.id) || []}
                                                priceChange={rider.price - rider.initial_price}
                                                currencyPrefix={currencyPrefix}
                                                currencySuffix={currencySuffix}
                                                sport={sport}
                                            />
                                        ))}
                                    </div>
                                </div>
                            )
                        })}

                        {structuredData.sortedReserveRiders.length > 0 && (
                             <div>
                                <h2 className={`text-2xl font-bold text-gray-200 border-b-2 ${theme.border} pb-2 mb-4`}>RESERVAS</h2>
                                <div className="grid grid-cols-2 gap-4">
                                    {structuredData.sortedReserveRiders.map(rider => (
                                        <RiderCard
                                            key={rider.id}
                                            rider={rider}
                                            onAdd={handleToggleRider}
                                            onSelect={onSelectRider}
                                            isRiderTeamFull={selectedRiders.length >= RIDER_LIMIT}
                                            isInTeam={teamRiderIds.has(rider.id)}
                                            isAffordable={remainingBudget >= rider.price || teamRiderIds.has(rider.id)}
                                            selectedByTeams={selectionsByRider.get(rider.id) || []}
                                            priceChange={rider.price - rider.initial_price}
                                            currencyPrefix={currencyPrefix}
                                            currencySuffix={currencySuffix}
                                            sport={sport}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Sticky Sidebar for Desktop */}
            <div className="hidden md:block md:col-span-1">
                <div className="sticky top-24">
                    <TeamSidebar
                        riders={selectedRiders}
                        constructor={selectedConstructor}
                        onRemoveRider={handleRemoveRider}
                        onRemoveConstructor={handleRemoveConstructor}
                        budget={BUDGET}
                        remainingBudget={remainingBudget}
                        riderLimit={RIDER_LIMIT}
                        constructorLimit={CONSTRUCTOR_LIMIT}
                        currentUser={currentUser}
                        newUserName={null}
                        currencyPrefix={currencyPrefix}
                        currencySuffix={currencySuffix}
                        isTeamValid={isTeamValid}
                        sport={sport}
                        saveState={saveState}
                    />
                </div>
            </div>

            {/* Mobile Bottom Bar & Modal */}
            <div className="md:hidden">
                <div className="fixed bottom-16 left-0 right-0 bg-gray-800 border-t border-gray-700 p-2 shadow-lg z-30 animate-fadeIn">
                    <div className="container mx-auto flex items-center justify-between gap-2 relative">
                        <div className="flex-grow flex items-center gap-4 text-sm text-gray-300">
                            <div className="flex items-center gap-2">
                            <span className="font-bold">{selectedRiders.length}/{RIDER_LIMIT}</span>
                            <span className="hidden sm:inline">Pilotos</span>
                            </div>
                            <div className="hidden sm:block h-6 border-l border-gray-600"></div>
                            <div className="text-xs sm:text-sm">
                            <p className="text-gray-400">Presupuesto</p>
                            <p className={`font-bold ${remainingBudget < 0 ? 'text-red-500' : 'text-green-400'}`}>{formatPrice(remainingBudget)}</p>
                            </div>
                        </div>
                        <div className="absolute left-1/2 -translate-x-1/2 hidden md:block">
                            {renderSaveStatus()}
                        </div>
                        <button onClick={() => setIsTeamSheetOpen(true)} className={`text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 flex-shrink-0 ${isTeamValid ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'}`}>
                        Ver Mi Equipo
                        </button>
                    </div>
                </div>

                {isTeamSheetOpen && (
                    <>
                        <div className="fixed inset-0 bg-black bg-opacity-60 z-40" onClick={() => setIsTeamSheetOpen(false)}></div>
                        <div className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-300 ease-out ${isTeamSheetOpen ? 'translate-y-0' : 'translate-y-full'}`}>
                            <div className="bg-gray-800 rounded-t-2xl max-h-[80vh] overflow-y-auto">
                                <div className="sticky top-0 bg-gray-800 p-2 z-10 flex justify-center">
                                    <div className="w-12 h-1.5 bg-gray-600 rounded-full"></div>
                                </div>
                                <div className="p-4 pt-0">
                                    <TeamSidebar
                                        riders={selectedRiders}
                                        constructor={selectedConstructor}
                                        onRemoveRider={handleRemoveRider}
                                        onRemoveConstructor={handleRemoveConstructor}
                                        budget={BUDGET}
                                        remainingBudget={remainingBudget}
                                        riderLimit={RIDER_LIMIT}
                                        constructorLimit={CONSTRUCTOR_LIMIT}
                                        currentUser={currentUser}
                                        newUserName={null}
                                        currencyPrefix={currencyPrefix}
                                        currencySuffix={currencySuffix}
                                        isTeamValid={isTeamValid}
                                        sport={sport}
                                        saveState={saveState}
                                        onClose={() => setIsTeamSheetOpen(false)}
                                    />
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};
