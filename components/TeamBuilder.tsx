import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Rider, Race, Participant, Sport, Constructor } from '../types';
import { TeamSidebar } from './TeamSidebar';
import { getLatestTeam } from '../lib/utils';
import { ArrowUpIcon, ArrowDownIcon, FireIcon, AddIcon, RemoveIcon, XCircleIcon, UsersIcon, TrophyIcon, ChartBarIcon, ArrowPathIcon, ExclamationTriangleIcon, CheckIcon } from './Icons';
import { Modal } from './Modal';
import { useFantasy } from '../contexts/FantasyDataContext';

// Helper function to create a unique, sorted identifier for a team selection.
const getTeamIdentifier = (riders: Rider[], constructor: Constructor | null): string => {
    const riderIds = riders.map(r => r.id).sort().join(',');
    const constructorId = constructor ? constructor.id : 'null';
    return `riders:${riderIds}|constructor:${constructorId}`;
};

// --- Components for Constructor Stats Modal ---

const StatCard: React.FC<{ title: string; value: React.ReactNode; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <div className="bg-gray-900/50 p-4 rounded-lg">
        <div className="flex items-center gap-3">
            <div className="text-gray-400">{icon}</div>
            <div>
                <p className="text-sm text-gray-400">{title}</p>
                <p className="text-xl font-bold text-white">{value}</p>
            </div>
        </div>
    </div>
);

interface ConstructorStatsProps {
    constructorItem: Constructor;
    sport: Sport;
    currencyPrefix: string;
    currencySuffix: string;
}

const ConstructorStats: React.FC<ConstructorStatsProps> = ({ constructorItem, sport, currencyPrefix, currencySuffix }) => {
    const { races, allRiderPoints, participants, teamSnapshots, riders } = useFantasy();

    const formatPrice = (price: number): string => {
        const value = currencySuffix === 'M' ? (price / 10).toFixed(1) : price.toLocaleString('es-ES');
        return `${currencyPrefix}${value}${currencySuffix}`;
    };

    const constructorRiderIds = useMemo(() => {
        return new Set(riders.filter(r => {
            if (r.constructor_id) return r.constructor_id === constructorItem.id;
            return r.team === constructorItem.name;
        }).map(r => r.id));
    }, [riders, constructorItem]);

    const calculateConstructorScoreForRace = (racePoints: Record<number, number>): number => {
        const constructorRiderPointsForRace = Object.entries(racePoints)
            .filter(([riderId]) => constructorRiderIds.has(Number(riderId)))
            .map(([, points]) => points)
            .sort((a, b) => b - a);

        if (constructorRiderPointsForRace.length === 0) return 0;
        const top1 = constructorRiderPointsForRace[0] || 0;
        const top2 = constructorRiderPointsForRace[1] || 0;
        return (top1 + top2) / 2;
    };

    const stats = useMemo(() => {
        const totalPoints = Object.values(allRiderPoints).reduce((total, racePoints) => total + calculateConstructorScoreForRace(racePoints), 0);
        const selectionCount = participants.filter(p => getLatestTeam(p.id, races, teamSnapshots).constructorId === constructorItem.id).length;
        const selectionPercentage = participants.length > 0 ? (selectionCount / participants.length) * 100 : 0;
        const priceChange = constructorItem.price - constructorItem.initial_price;
        return { totalPoints: Math.round(totalPoints), selectionPercentage, priceChange };
    }, [constructorItem, allRiderPoints, participants, teamSnapshots, races, calculateConstructorScoreForRace]);

    const pointsByRace = useMemo(() => {
        return [...races]
            .map(race => ({ race, points: Math.round(calculateConstructorScoreForRace(allRiderPoints[race.id] || {})) }))
            .filter(item => item.points > 0)
            .sort((a, b) => b.points - a.points);
    }, [races, allRiderPoints, calculateConstructorScoreForRace]);

    const constructorRidersList = useMemo(() => riders.filter(r => constructorRiderIds.has(r.id)), [riders, constructorRiderIds]);

    return (
        <div className="animate-fadeIn max-w-4xl mx-auto text-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <StatCard title="Puntos Totales" value={stats.totalPoints} icon={<TrophyIcon className="w-6 h-6" />} />
                <StatCard title="Selección" value={`${stats.selectionPercentage.toFixed(1)}%`} icon={<UsersIcon className="w-6 h-6" />} />
                <StatCard
                    title="Variación Precio"
                    value={
                        <span className={stats.priceChange > 0 ? 'text-green-400' : stats.priceChange < 0 ? 'text-red-500' : 'text-white'}>
                            {stats.priceChange !== 0 && (stats.priceChange > 0 ? <ArrowUpIcon className="w-5 h-5 inline-block mr-1" /> : <ArrowDownIcon className="w-5 h-5 inline-block mr-1" />)}
                            {formatPrice(Math.abs(stats.priceChange))}
                        </span>
                    }
                    icon={<ChartBarIcon className="w-6 h-6" />}
                />
                <div className="bg-gray-900/50 p-4 rounded-lg">
                    <p className="text-sm text-gray-400">Precio Actual</p>
                    <p className="text-xl font-bold text-white">{formatPrice(constructorItem.price)}</p>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <h3 className="text-lg font-bold text-white mb-2">Pilotos del Equipo</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {constructorRidersList.length > 0 ? constructorRidersList.map(rider => (
                            <div key={rider.id} className="bg-gray-900/50 p-2 rounded-md"><p className="font-semibold truncate">{rider.name}</p></div>
                        )) : <p className="text-center text-gray-500 py-4">No se encontraron pilotos.</p>}
                    </div>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white mb-2">Puntos por Jornada</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                        {pointsByRace.length > 0 ? pointsByRace.map(({ race, points }) => (
                            <div key={race.id} className="bg-gray-900/50 p-2 rounded-md flex justify-between items-center">
                                <p className="font-semibold text-gray-300 text-sm truncate">{race.gp_name}</p>
                                <p className="font-bold text-yellow-300">{points} pts</p>
                            </div>
                        )) : <p className="text-center text-gray-500 py-4">Sin puntos.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
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
}

const RiderRow: React.FC<{
    rider: Rider, onAdd: (r: Rider) => void, onRemove: (id: number) => void, onSelect: (r: Rider) => void,
    isInTeam: boolean, isAffordable: boolean, isTeamFull: boolean,
    priceChange: number, currencyPrefix: string, currencySuffix: string, sport: Sport
}> = ({ rider, onAdd, onRemove, onSelect, isInTeam, isAffordable, isTeamFull, priceChange, currencyPrefix, currencySuffix }) => {

    const formatPrice = (price: number): string => {
        const value = currencySuffix === 'M' ? (price / 10).toFixed(1) : price.toLocaleString('es-ES');
        return `${currencyPrefix}${value}${currencySuffix}`;
    }

    const isSelectable = !rider.condition?.includes('unavailable') && !rider.condition?.includes('injured');

    const renderCondition = () => {
        if (rider.condition?.includes('injured')) {
            return <span title={rider.condition}><XCircleIcon className="w-6 h-6 text-red-500" /></span>;
        }
        if (rider.condition?.includes('unavailable')) {
            return <span title={rider.condition}><XCircleIcon className="w-6 h-6 text-gray-500" /></span>;
        }
        if (priceChange > 20) {
            return <span title="En racha"><FireIcon className="w-6 h-6 text-fuchsia-500" /></span>;
        }
        return <span className="text-gray-600">-</span>;
    };

    return (
        <div className={`bg-gray-800 grid grid-cols-5 items-center gap-2 p-2 rounded-lg border-b border-gray-700/50 ${!isSelectable ? 'opacity-50' : ''}`}>
            <div
                className="col-span-2 cursor-pointer"
                onClick={() => onSelect(rider)}
                role="button"
                tabIndex={0}
                aria-label={`Ver detalles de ${rider.name}`}
            >
                <p className="font-bold text-white truncate">{rider.name}</p>
                <p className="text-xs text-gray-400 truncate">{rider.team}</p>
            </div>

            <div className="col-span-1 text-center">
                <p className="font-semibold text-white">{formatPrice(rider.price)}</p>
                {priceChange !== 0 && (
                    <span className={`text-xs font-bold flex items-center justify-center gap-1 ${priceChange > 0 ? 'text-green-400' : 'text-red-500'}`}>
                        {priceChange > 0 ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />}
                        <span>{formatPrice(Math.abs(priceChange)).replace(currencyPrefix, '')}</span>
                    </span>
                )}
            </div>

            <div className="col-span-1 flex items-center justify-center">{renderCondition()}</div>

            <div className="col-span-1 flex items-center justify-end">
                {isInTeam ? (
                    <button onClick={() => onRemove(rider.id)} aria-label={`Quitar a ${rider.name}`}>
                        <RemoveIcon className="w-8 h-8 text-fuchsia-500 hover:text-fuchsia-400 transition-colors" />
                    </button>
                ) : (
                    <button onClick={() => onAdd(rider)} disabled={isTeamFull || !isAffordable || !isSelectable} aria-label={`Añadir a ${rider.name}`}>
                        <AddIcon className="w-8 h-8 text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed" />
                    </button>
                )}
            </div>
        </div>
    );
}

const ConstructorRow: React.FC<{
    constructorItem: Constructor, onAdd: (c: Constructor) => void, onRemove: () => void, onSelect: (c: Constructor) => void,
    isSelected: boolean, isAffordable: boolean,
    priceChange: number, currencyPrefix: string, currencySuffix: string,
    riders: Rider[]
}> = ({ constructorItem, onAdd, onRemove, onSelect, isSelected, isAffordable, priceChange, currencyPrefix, currencySuffix, riders }) => {

    const formatPrice = (price: number): string => {
        const value = currencySuffix === 'M' ? (price / 10).toFixed(1) : price.toLocaleString('es-ES');
        return `${currencyPrefix}${value}${currencySuffix}`;
    }

    const constructorRiders = useMemo(() =>
        riders.filter(r => {
            if (r.constructor_id) return r.constructor_id === constructorItem.id;
            return r.team === constructorItem.name;
        }), [riders, constructorItem]);

    return (
        <div className="bg-gray-800 grid grid-cols-5 items-center gap-2 p-2 rounded-lg border-b border-gray-700/50">
            <div
                className="col-span-2 cursor-pointer"
                onClick={() => onSelect(constructorItem)}
                role="button"
                tabIndex={0}
                aria-label={`Ver detalles de ${constructorItem.name}`}
            >
                <p className="font-bold text-white truncate">{constructorItem.name}</p>
                <p className="text-xs text-gray-400 truncate">{constructorRiders.map(r => r.name).join(', ')}</p>
            </div>

            <div className="col-span-1 text-center">
                <p className="font-semibold text-white">{formatPrice(constructorItem.price)}</p>
                {priceChange !== 0 && (
                    <span className={`text-xs font-bold flex items-center justify-center gap-1 ${priceChange > 0 ? 'text-green-400' : 'text-red-500'}`}>
                        {priceChange > 0 ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />}
                        <span>{formatPrice(Math.abs(priceChange)).replace(currencyPrefix, '')}</span>
                    </span>
                )}
            </div>

            <div className="col-span-1 flex items-center justify-center"><span className="text-gray-600">-</span></div>

            <div className="col-span-1 flex items-center justify-end">
                {isSelected ? (
                    <button onClick={onRemove} aria-label={`Quitar a ${constructorItem.name}`}>
                        <RemoveIcon className="w-8 h-8 text-fuchsia-500 hover:text-fuchsia-400 transition-colors" />
                    </button>
                ) : (
                    <button onClick={() => onAdd(constructorItem)} disabled={isSelected || !isAffordable} aria-label={`Añadir a ${constructorItem.name}`}>
                        <AddIcon className="w-8 h-8 text-gray-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed" />
                    </button>
                )}
            </div>
        </div>
    );
}


export const TeamBuilder: React.FC<TeamBuilderProps> = (props) => {
    const {
        onUpdateTeam, currentRace, currentUser,
        BUDGET, RIDER_LIMIT, CONSTRUCTOR_LIMIT, currencyPrefix, currencySuffix, sport, onSelectRider
    } = props;
    
    const { riders, constructors, races, teamSnapshots, showToast } = useFantasy();
    
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
    const [activeTab, setActiveTab] = useState<'riders' | 'constructors'>('riders');
    const [viewingConstructor, setViewingConstructor] = useState<Constructor | null>(null);
    const [saveState, setSaveState] = useState<SaveState>('idle');
    const isInitialMount = useRef(true);
    const saveStateResetTimer = useRef<number | null>(null);

    const initialTeamIdentifier = useMemo(() => getTeamIdentifier(initialTeam.initialRiders, initialTeam.initialConstructor), [initialTeam]);

    const remainingBudget = useMemo(() => {
        const riderCost = selectedRiders.reduce((total, rider) => total + rider.price, 0);
        const constructorCost = selectedConstructor?.price || 0;
        return BUDGET - riderCost - constructorCost;
    }, [selectedRiders, selectedConstructor, BUDGET]);
    
    const isTeamValid = selectedRiders.length === RIDER_LIMIT && !!selectedConstructor && remainingBudget >= 0;

    useEffect(() => {
        return () => {
            if (saveStateResetTimer.current) {
                clearTimeout(saveStateResetTimer.current);
            }
        };
    }, []);

    useEffect(() => {
        if (saveStateResetTimer.current) {
            clearTimeout(saveStateResetTimer.current);
            saveStateResetTimer.current = null;
        }

        if (isInitialMount.current) {
            isInitialMount.current = false;
            if (initialTeam.initialRiders.length > 0 || initialTeam.initialConstructor) {
                setSaveState('saved');
                saveStateResetTimer.current = window.setTimeout(() => setSaveState('idle'), 3000);
            }
            return;
        }

        const currentTeamIdentifier = getTeamIdentifier(selectedRiders, selectedConstructor);

        if (currentTeamIdentifier === initialTeamIdentifier) {
            setSaveState('saved');
            saveStateResetTimer.current = window.setTimeout(() => setSaveState('idle'), 3000);
            return;
        }

        setSaveState('idle');

        const debounceHandler = setTimeout(() => {
            if (isTeamValid && currentUser && currentRace && selectedConstructor && currentTeamIdentifier !== initialTeamIdentifier) {
                setSaveState('saving');
                onUpdateTeam(currentUser.id, selectedRiders, selectedConstructor, currentRace.id)
                    .then(success => {
                        if (!success) {
                            setSaveState('error');
                            showToast('Error al guardar el equipo.', 'error');
                        } else {
                            showToast('Equipo guardado automáticamente.', 'success');
                        }
                    });
            }
        }, 2000);

        return () => clearTimeout(debounceHandler);
    }, [selectedRiders, selectedConstructor, isTeamValid, initialTeamIdentifier, currentUser, currentRace, onUpdateTeam, showToast, initialTeam.initialRiders.length, initialTeam.initialConstructor]);


    const formatPrice = (price: number): string => {
        const value = currencySuffix === 'M' ? (price / 10).toFixed(1) : price.toLocaleString('es-ES');
        return `${currencyPrefix}${value}${currencySuffix}`;
    }

    const teamRiderIds = useMemo(() => new Set(selectedRiders.map(r => r.id)), [selectedRiders]);

    const sortedRiders = useMemo(() => {
        const isUnavailable = (rider: Rider) => rider.condition?.includes('unavailable') || rider.condition?.includes('injured');
        return [...riders].sort((a, b) => {
            const aIsUnavailable = isUnavailable(a);
            const bIsUnavailable = isUnavailable(b);
            if (aIsUnavailable && !bIsUnavailable) return 1;
            if (!aIsUnavailable && bIsUnavailable) return -1;
            return b.price - a.price;
        });
    }, [riders]);
    
    const sortedConstructors = useMemo(() => [...constructors].sort((a, b) => b.price - a.price), [constructors]);

    const handleAddRider = (rider: Rider) => {
        if (selectedRiders.length >= RIDER_LIMIT) {
            showToast('Ya has seleccionado el máximo de pilotos.', 'error');
            return;
        }
        if (teamRiderIds.has(rider.id)) {
            showToast(`${rider.name} ya está en tu equipo.`, 'error');
            return;
        }
        setSelectedRiders([...selectedRiders, rider]);
    };

    const handleRemoveRider = (riderId: number) => {
        setSelectedRiders(selectedRiders.filter(rider => rider.id !== riderId));
    };

    const handleSelectConstructor = (constructor: Constructor) => {
        if (selectedConstructor?.id === constructor.id) {
            setSelectedConstructor(null);
        } else {
            setSelectedConstructor(constructor);
        }
    };
    
    const handleRemoveConstructor = () => setSelectedConstructor(null);
    
    const renderSaveStatus = () => {
        switch (saveState) {
            case 'saving':
                return <div className="flex items-center justify-center gap-2 text-center text-sm text-yellow-400 p-2 bg-yellow-500/10 rounded-lg"><ArrowPathIcon className="w-4 h-4 animate-spin" /> Guardando...</div>;
            case 'saved':
                return <div className="flex items-center justify-center gap-2 text-center text-sm text-green-400 p-2 bg-green-500/10 rounded-lg animate-fadeIn"><CheckIcon className="w-4 h-4" /> Equipo guardado</div>;
            case 'error':
                return <div className="flex items-center justify-center gap-2 text-center text-sm text-red-500 p-2 bg-red-500/10 rounded-lg"><ExclamationTriangleIcon className="w-4 h-4" /> Error al guardar</div>;
            case 'idle':
            default:
                if (isTeamValid) {
                     return <div className="flex items-center justify-center gap-2 text-center text-sm text-green-400 p-2"><CheckIcon className="w-4 h-4" /> ¡Equipo listo!</div>;
                }
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
    
    const tabActiveStyle = 'border-fuchsia-500 text-white font-bold';
    const tabInactiveStyle = 'border-transparent text-gray-400';

    return (
        <div className="pb-24">
            <div className="sticky top-[60px] bg-gray-900 z-10 pt-2">
                <div className="flex border-b border-gray-700">
                    <button 
                        onClick={() => setActiveTab('riders')} 
                        className={`py-3 px-6 text-sm uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'riders' ? tabActiveStyle : tabInactiveStyle}`}
                    >
                        Pilotos
                    </button>
                    <button 
                        onClick={() => setActiveTab('constructors')} 
                        className={`py-3 px-6 text-sm uppercase tracking-wider border-b-2 transition-colors ${activeTab === 'constructors' ? tabActiveStyle : tabInactiveStyle}`}
                    >
                        Constructores
                    </button>
                </div>
                 <div className="grid grid-cols-5 items-center gap-2 p-2 text-xs text-gray-500 uppercase font-bold border-b border-gray-800">
                    <span className="col-span-2">{activeTab === 'riders' ? 'Piloto' : 'Escudería'}</span>
                    <span className="text-center">Precio</span>
                    <span className="text-center">Condición</span>
                    <span className="text-right"></span>
                </div>
            </div>

            <div className="mt-2 space-y-1">
                {activeTab === 'riders' && sortedRiders.map(rider => (
                    <RiderRow 
                        key={rider.id}
                        rider={rider}
                        onAdd={handleAddRider}
                        onRemove={handleRemoveRider}
                        onSelect={onSelectRider}
                        isInTeam={teamRiderIds.has(rider.id)}
                        isAffordable={remainingBudget >= rider.price || teamRiderIds.has(rider.id)}
                        isTeamFull={selectedRiders.length >= RIDER_LIMIT}
                        priceChange={rider.price - rider.initial_price}
                        currencyPrefix={currencyPrefix}
                        currencySuffix={currencySuffix}
                        sport={sport}
                    />
                ))}
                {activeTab === 'constructors' && sortedConstructors.map(c => (
                    <ConstructorRow
                        key={c.id}
                        constructorItem={c}
                        onAdd={handleSelectConstructor}
                        onRemove={handleRemoveConstructor}
                        onSelect={setViewingConstructor}
                        isSelected={selectedConstructor?.id === c.id}
                        isAffordable={remainingBudget >= c.price || selectedConstructor?.id === c.id}
                        priceChange={c.price - c.initial_price}
                        currencyPrefix={currencyPrefix}
                        currencySuffix={currencySuffix}
                        riders={riders}
                    />
                ))}
            </div>

            <div className="fixed bottom-16 left-0 right-0 bg-gray-800 border-t border-gray-700 p-2 shadow-lg z-30 animate-fadeIn">
                 <div className="container mx-auto flex items-center justify-between gap-2 relative">
                    <div className="flex-grow flex items-center gap-4 text-sm text-gray-300">
                        <div className="flex items-center gap-2">
                           <UsersIcon className="w-5 h-5"/>
                           <span>{selectedRiders.length}/{RIDER_LIMIT}</span>
                           <span className="hidden sm:inline">Pilotos</span>
                        </div>
                        <div className="hidden sm:block h-6 border-l border-gray-600"></div>
                        <div className="text-xs sm:text-sm">
                           <p className="text-gray-400">Presupuesto Restante</p>
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

            {viewingConstructor && (
                <Modal 
                    isOpen={!!viewingConstructor} 
                    onClose={() => setViewingConstructor(null)}
                    title={`Estadísticas: ${viewingConstructor.name}`}
                    sport={sport}
                >
                    <ConstructorStats 
                        constructorItem={viewingConstructor}
                        sport={sport}
                        currencyPrefix={currencyPrefix}
                        currencySuffix={currencySuffix}
                    />
                </Modal>
            )}
        </div>
    );
};