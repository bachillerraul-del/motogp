import React, { useState, useMemo, useCallback } from 'react';
import type { Rider, Race, Participant, TeamSnapshot, Sport, Constructor } from '../types';
import { RiderCard } from './RiderCard';
import { TeamSidebar } from './TeamSidebar';
import { getLatestTeam } from '../lib/utils';
import { LightBulbIcon, SparklesIcon, ArrowPathIcon, ClipboardDocumentListIcon, PlusIcon, CheckIcon, ArrowUpIcon, ArrowDownIcon } from './Icons';
import { getAITeamAdvice } from '../services/geminiService';

interface TeamBuilderProps {
    races: Race[];
    riders: Rider[];
    constructors: Constructor[];
    participants: Participant[];
    teamSnapshots: TeamSnapshot[];
    onAddToLeague: (name: string, riders: Rider[], constructor: Constructor, raceId: number) => Promise<boolean>;
    onUpdateTeam: (participantId: number, riders: Rider[], constructor: Constructor, raceId: number) => Promise<boolean>;
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
    currentRace: Race | null;
    currentUser: Participant | null;
    newUserName: string | null;
    BUDGET: number;
    RIDER_LIMIT: number;
    CONSTRUCTOR_LIMIT: number;
    currencyPrefix: string;
    currencySuffix: string;
    sport: Sport;
    onSelectRider: (rider: Rider) => void;
    onSelectConstructor: (constructor: Constructor) => void;
}

const ConstructorCard: React.FC<{
    constructorItem: Constructor, onAdd: (c: Constructor) => void, onSelect: (c: Constructor) => void, isSelected: boolean, isAffordable: boolean,
    priceChange: number, currencyPrefix: string, currencySuffix: string, sport: Sport
}> = ({ constructorItem, onAdd, onSelect, isSelected, isAffordable, priceChange, currencyPrefix, currencySuffix, sport }) => {
    const formatPrice = (price: number): string => {
        const value = currencySuffix === 'M' ? (price / 10).toFixed(1) : price.toLocaleString('es-ES');
        return `${currencyPrefix}${value}${currencySuffix}`;
    };

    const getButtonText = () => {
        if (isSelected) return 'En tu Equipo';
        if (!isAffordable) return 'Excede Presupuesto';
        return 'Añadir al Equipo';
    };
    
    const buttonTheme = sport === 'f1' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600';
    const cardTheme = sport === 'f1' ? 'hover:shadow-red-600/30' : 'hover:shadow-orange-500/30';

    return (
         <div className={`bg-gray-800 rounded-lg shadow-lg p-4 flex flex-col justify-between transition-all duration-300 ${cardTheme} ${isSelected ? 'ring-2 ring-green-500' : ''}`}>
             <div 
                className="cursor-pointer group"
                onClick={() => onSelect(constructorItem)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(constructorItem)}
                role="button"
                tabIndex={0}
                aria-label={`Ver detalles de ${constructorItem.name}`}
            >
                <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-bold text-white group-hover:underline">{constructorItem.name}</h3>
                    <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-lg font-semibold text-white">{formatPrice(constructorItem.price)}</p>
                         {priceChange !== 0 && (
                            <span className={`text-xs font-bold flex items-center justify-end gap-1 ${priceChange > 0 ? 'text-green-400' : 'text-red-500'}`}>
                                {priceChange > 0 ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />}
                                <span>{formatPrice(Math.abs(priceChange))}</span>
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <button
                onClick={() => onAdd(constructorItem)}
                disabled={isSelected || !isAffordable}
                className={`mt-4 w-full flex items-center justify-center text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300
                    ${isSelected ? 'bg-green-600 disabled:opacity-75 cursor-default' : `${buttonTheme} disabled:bg-gray-600 disabled:cursor-not-allowed`}`}
            >
                {isSelected ? <CheckIcon className="w-5 h-5 mr-2" /> : <PlusIcon className="w-5 h-5 mr-2" />}
                {getButtonText()}
            </button>
        </div>
    );
};

export const TeamBuilder: React.FC<TeamBuilderProps> = (props) => {
    const {
        races, riders, constructors, participants, teamSnapshots, onAddToLeague, onUpdateTeam,
        showToast, currentRace, currentUser, newUserName,
        BUDGET, RIDER_LIMIT, CONSTRUCTOR_LIMIT, currencyPrefix, currencySuffix, sport, onSelectRider,
        onSelectConstructor
    } = props;
    
    const initialTeam = useMemo(() => {
        if (!currentUser) return { initialRiders: [], initialConstructor: null };
        const { riderIds, constructorId } = getLatestTeam(currentUser.id, races, teamSnapshots);
        const initialRiders = riders.filter(r => riderIds.includes(r.id));
        const initialConstructor = constructors.find(c => c.id === constructorId) || null;
        return { initialRiders, initialConstructor };
    }, [currentUser, races, teamSnapshots, riders, constructors]);

    const [selectedRiders, setSelectedRiders] = useState<Rider[]>(initialTeam.initialRiders);
    const [selectedConstructor, setSelectedConstructor] = useState<Constructor | null>(initialTeam.initialConstructor);
    
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'price' | 'name'>('price');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFetchingAdvice, setIsFetchingAdvice] = useState(false);
    const [aiAdvice, setAiAdvice] = useState<string | null>(null);
    const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);

    const remainingBudget = useMemo(() => {
        const riderCost = selectedRiders.reduce((total, rider) => total + rider.price, 0);
        const constructorCost = selectedConstructor?.price || 0;
        return BUDGET - riderCost - constructorCost;
    }, [selectedRiders, selectedConstructor, BUDGET]);

    const teamRiderIds = useMemo(() => new Set(selectedRiders.map(r => r.id)), [selectedRiders]);

    const groupedRiders = useMemo(() => {
        const filtered = riders.filter(rider =>
            rider.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        const groups = new Map<string, Rider[]>();
        filtered.forEach(rider => {
            if (!groups.has(rider.team)) groups.set(rider.team, []);
            groups.get(rider.team)!.push(rider);
        });
        groups.forEach((teamRiders, teamName) => {
            const sorted = [...teamRiders].sort((a, b) => sortBy === 'price' ? b.price - a.price : a.name.localeCompare(b.name));
            groups.set(teamName, sorted);
        });
        return groups;
    }, [riders, searchTerm, sortBy]);

    const sortedTeamNames = useMemo(() => Array.from(groupedRiders.keys()).sort((a, b) => a.localeCompare(b)), [groupedRiders]);

    const sortedConstructors = useMemo(() => {
        return [...constructors]
            .filter(c => c.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => sortBy === 'price' ? b.price - a.price : a.name.localeCompare(b.name));
    }, [constructors, searchTerm, sortBy]);

    const getSelectedByTeams = (riderId: number): string[] => {
        return participants.map(p => {
            const { riderIds } = getLatestTeam(p.id, races, teamSnapshots);
            return riderIds.includes(riderId) ? p.name : null;
        }).filter((name): name is string => name !== null);
    };

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

    const isTeamValid = selectedRiders.length === RIDER_LIMIT && !!selectedConstructor && remainingBudget >= 0;

    const handleSubmit = async () => {
        if (!isTeamValid || !selectedConstructor) {
            showToast('Tu equipo no es válido. Revisa la composición y el presupuesto.', 'error');
            return;
        }
        if (!currentRace) {
            showToast('No hay una jornada activa para guardar el equipo.', 'error');
            return;
        }
        
        setIsSubmitting(true);
        let success = false;
        
        if (currentUser) {
            success = await onUpdateTeam(currentUser.id, selectedRiders, selectedConstructor, currentRace.id);
        } else if (newUserName) {
            success = await onAddToLeague(newUserName, selectedRiders, selectedConstructor, currentRace.id);
        }

        if (success) setIsTeamModalOpen(false);
        setIsSubmitting(false);
    };
    
     const handleFetchAdvice = useCallback(async () => {
        setIsFetchingAdvice(true);
        setAiAdvice(null);
        try {
            const availableRiders = riders.filter(r => !teamRiderIds.has(r.id));
            const availableConstructors = constructors.filter(c => c.id !== selectedConstructor?.id);
            const advice = await getAITeamAdvice(
                selectedRiders,
                selectedConstructor,
                remainingBudget,
                availableRiders,
                availableConstructors,
                sport
            );
            setAiAdvice(advice);
        } catch (error) {
            console.error(error);
            showToast('Error al obtener la recomendación de la IA.', 'error');
        } finally {
            setIsFetchingAdvice(false);
        }
    }, [selectedRiders, selectedConstructor, remainingBudget, riders, constructors, teamRiderIds, sport, showToast]);

    if (!currentRace) {
        return (
            <div className="text-center py-20 bg-gray-800 rounded-lg">
                <h2 className="text-2xl font-bold text-white">Mercado Cerrado</h2>
                <p className="text-gray-400 mt-2">No es posible crear o modificar equipos en este momento.</p>
            </div>
        );
    }
    
    const submitButtonText = currentUser ? 'Actualizar Equipo' : 'Unirse a la Liga';
    const focusRingColor = sport === 'f1' ? 'focus:ring-red-500' : 'focus:ring-orange-500';
    const tabActiveColor = sport === 'f1' ? 'bg-red-600' : 'bg-orange-500';

    return (
        <div>
            <div className="bg-gray-800 p-4 rounded-lg shadow-lg mb-6 sticky top-20 z-10">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <input
                        type="text"
                        placeholder="Buscar piloto o escudería..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className={`w-full sm:w-auto flex-grow bg-gray-900 text-white p-2 rounded-md focus:outline-none focus:ring-2 ${focusRingColor}`}
                    />
                    <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-400">Ordenar por:</span>
                            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'price' | 'name')} className="bg-gray-900 text-white p-2 rounded-md">
                            <option value="price">Precio</option>
                            <option value="name">Nombre</option>
                        </select>
                    </div>
                </div>
                <div className="mt-4 border-t border-gray-700 pt-4">
                    <button onClick={handleFetchAdvice} disabled={isFetchingAdvice} className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50">
                        {isFetchingAdvice ? <ArrowPathIcon className="w-5 h-5 animate-spin" /> : <LightBulbIcon className="w-5 h-5" />}
                        <span>{isFetchingAdvice ? 'Analizando equipo...' : 'Pedir consejo a la IA'}</span>
                    </button>
                        {aiAdvice && (
                        <div className="mt-4 p-4 bg-gray-900/50 rounded-lg text-gray-300 border border-blue-500/30">
                            <div className="flex items-center gap-2 mb-2 text-blue-400">
                                <SparklesIcon className="w-5 h-5" /> <h4 className="font-bold">Análisis de la IA</h4>
                            </div>
                            <div className="prose prose-sm prose-invert" dangerouslySetInnerHTML={{ __html: aiAdvice.replace(/\n/g, '<br />') }} />
                        </div>
                    )}
                </div>
            </div>

            <div className="mb-8">
                <h2 className={`text-2xl font-bold text-white mb-4 pb-2 border-b-2 ${sport === 'f1' ? 'border-red-600/50' : 'border-orange-500/50'}`}>Escuderías</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {sortedConstructors.map(c => (
                        <ConstructorCard key={c.id} constructorItem={c} onAdd={handleSelectConstructor}
                           onSelect={onSelectConstructor}
                           isSelected={selectedConstructor?.id === c.id}
                           isAffordable={remainingBudget >= c.price || selectedConstructor?.id === c.id}
                           priceChange={c.price - c.initial_price}
                           currencyPrefix={currencyPrefix} currencySuffix={currencySuffix} sport={sport}
                        />
                    ))}
                </div>
            </div>
            
            <div className="space-y-8">
                {sortedTeamNames.map(teamName => (
                    <div key={teamName}>
                        <h2 className={`text-2xl font-bold text-white mb-4 pb-2 border-b-2 ${sport === 'f1' ? 'border-red-600/50' : 'border-orange-500/50'}`}>{teamName}</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {groupedRiders.get(teamName)!.map(rider => (
                                <RiderCard key={rider.id} rider={rider} onAdd={handleAddRider} onSelect={onSelectRider}
                                    isRiderTeamFull={selectedRiders.length >= RIDER_LIMIT}
                                    isAffordable={remainingBudget >= rider.price || teamRiderIds.has(rider.id)}
                                    selectedByTeams={getSelectedByTeams(rider.id)}
                                    priceChange={rider.price - rider.initial_price}
                                    currencyPrefix={currencyPrefix} currencySuffix={currencySuffix}
                                    sport={sport} isInTeam={teamRiderIds.has(rider.id)}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            <button onClick={() => setIsTeamModalOpen(true)} className={`fixed bottom-20 right-4 z-30 flex items-center justify-center w-16 h-16 rounded-full text-white shadow-lg transition-transform hover:scale-110 ${tabActiveColor}`} aria-label="Ver mi equipo">
                <ClipboardDocumentListIcon className="w-8 h-8" />
                {(selectedRiders.length > 0 || selectedConstructor) && (
                    <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
                        {selectedRiders.length + (selectedConstructor ? 1 : 0)}
                    </span>
                )}
            </button>

            {isTeamModalOpen && (
                 <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 animate-fadeIn" onClick={() => setIsTeamModalOpen(false)}>
                    <div className="w-full max-w-md" onClick={(e) => e.stopPropagation()}>
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
                            newUserName={newUserName}
                            currencyPrefix={currencyPrefix}
                            currencySuffix={currencySuffix}
                            isTeamValid={isTeamValid}
                            isSubmitting={isSubmitting}
                            submitButtonText={submitButtonText}
                            onSubmit={handleSubmit}
                            sport={sport}
                            onClose={() => setIsTeamModalOpen(false)}
                        />
                    </div>
                 </div>
            )}
        </div>
    );
};