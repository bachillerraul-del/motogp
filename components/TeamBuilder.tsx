import React, { useState, useMemo, useCallback } from 'react';
import type { Rider, Race, Participant, TeamSnapshot, Sport } from '../types';
import { RiderCard } from './RiderCard';
import { TeamSidebar } from './TeamSidebar';
import { getLatestTeam } from '../lib/utils';
import { LightBulbIcon, SparklesIcon, ArrowPathIcon } from './Icons';
import { getAITeamAdvice } from '../services/geminiService';

interface TeamBuilderProps {
    races: Race[];
    riders: Rider[];
    participants: Participant[];
    teamSnapshots: TeamSnapshot[];
    onAddToLeague: (name: string, team: Rider[], raceId: number) => Promise<boolean>;
    onUpdateTeam: (participantId: number, team: Rider[], raceId: number) => Promise<boolean>;
    showToast: (message: string, type: 'success' | 'error') => void;
    currentRace: Race | null;
    currentUser: Participant | null;
    newUserName: string | null;
    BUDGET: number;
    TEAM_SIZE: number;
    currencyPrefix: string;
    currencySuffix: string;
    sport: Sport;
}

export const TeamBuilder: React.FC<TeamBuilderProps> = ({
    races, riders, participants, teamSnapshots, onAddToLeague, onUpdateTeam,
    showToast, currentRace, currentUser, newUserName,
    BUDGET, TEAM_SIZE, currencyPrefix, currencySuffix, sport
}) => {
    const getInitialTeam = () => {
        if (!currentUser) return [];
        const latestTeamIds = getLatestTeam(currentUser.id, races, teamSnapshots);
        return riders.filter(r => latestTeamIds.includes(r.id));
    };

    const [team, setTeam] = useState<Rider[]>(getInitialTeam);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortBy, setSortBy] = useState<'price' | 'name'>('price');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isFetchingAdvice, setIsFetchingAdvice] = useState(false);
    const [aiAdvice, setAiAdvice] = useState<string | null>(null);

    const remainingBudget = useMemo(() => {
        const teamCost = team.reduce((total, rider) => total + rider.price, 0);
        return BUDGET - teamCost;
    }, [team, BUDGET]);

    const teamRiderIds = useMemo(() => new Set(team.map(r => r.id)), [team]);

    const filteredAndSortedRiders = useMemo(() => {
        return [...riders]
            .filter(rider => rider.name.toLowerCase().includes(searchTerm.toLowerCase()) && !teamRiderIds.has(rider.id))
            .sort((a, b) => {
                if (sortBy === 'price') return b.price - a.price;
                return a.name.localeCompare(b.name);
            });
    }, [riders, searchTerm, teamRiderIds, sortBy]);
    
    const teamSelectionCounts = useMemo(() => {
        const counts = new Map<number, number>();
        const latestTeams = new Map<number, number[]>();
        
        participants.forEach(p => {
             latestTeams.set(p.id, getLatestTeam(p.id, races, teamSnapshots));
        });

        latestTeams.forEach(teamIds => {
            teamIds.forEach(riderId => {
                counts.set(riderId, (counts.get(riderId) || 0) + 1);
            });
        });
        return counts;
    }, [participants, teamSnapshots, races]);
    
    const getSelectedByTeams = (riderId: number): string[] => {
        const participantNames: string[] = [];
        participants.forEach(p => {
            const latestTeam = getLatestTeam(p.id, races, teamSnapshots);
            if (latestTeam.includes(riderId)) {
                participantNames.push(p.name);
            }
        });
        return participantNames;
    };


    const handleAddRider = (rider: Rider) => {
        if (team.length >= TEAM_SIZE) {
            showToast('Tu equipo ya está lleno.', 'error');
            return;
        }
        if (teamRiderIds.has(rider.id)) {
            showToast(`${rider.name} ya está en tu equipo.`, 'error');
            return;
        }
        setTeam([...team, rider]);
    };

    const handleRemoveRider = (riderId: number) => {
        setTeam(team.filter(rider => rider.id !== riderId));
    };

    const isTeamValid = team.length === TEAM_SIZE && remainingBudget >= 0;

    const handleSubmit = async () => {
        if (!isTeamValid) {
            showToast('Tu equipo no es válido. Revisa el tamaño y el presupuesto.', 'error');
            return;
        }
        if (!currentRace) {
            showToast('No hay una jornada activa para guardar el equipo.', 'error');
            return;
        }
        
        setIsSubmitting(true);
        let success = false;
        
        if (currentUser) { // Existing user updating team
            success = await onUpdateTeam(currentUser.id, team, currentRace.id);
        } else if (newUserName) { // New user creating team
            success = await onAddToLeague(newUserName, team, currentRace.id);
        }

        setIsSubmitting(false);
    };
    
     const handleFetchAdvice = useCallback(async () => {
        setIsFetchingAdvice(true);
        setAiAdvice(null);
        try {
            const availableRiders = riders.filter(r => !teamRiderIds.has(r.id));
            const advice = await getAITeamAdvice(team, remainingBudget, availableRiders, sport);
            setAiAdvice(advice);
        } catch (error) {
            console.error(error);
            showToast('Error al obtener la recomendación de la IA.', 'error');
        } finally {
            setIsFetchingAdvice(false);
        }
    }, [team, remainingBudget, riders, teamRiderIds, sport, showToast]);

    const formatPrice = (price: number): string => {
        const value = currencySuffix === 'M' ? (price / 10).toFixed(1) : price.toLocaleString('es-ES');
        return `${currencyPrefix}${value}${currencySuffix}`;
    }

    if (!currentRace) {
        return (
            <div className="text-center py-20 bg-gray-800 rounded-lg">
                <h2 className="text-2xl font-bold text-white">Mercado Cerrado</h2>
                <p className="text-gray-400 mt-2">No es posible crear o modificar equipos en este momento.</p>
            </div>
        );
    }
    
    const teamName = currentUser?.name || newUserName || 'Nuevo Participante';
    const submitButtonText = currentUser ? 'Actualizar Equipo' : 'Unirse a la Liga';

    return (
        <div className="flex flex-col lg:flex-row gap-8 pb-24 lg:pb-0">
            <div className="w-full lg:w-1/3 xl:w-1/4">
                <TeamSidebar
                    team={team}
                    onRemove={handleRemoveRider}
                    budget={BUDGET}
                    remainingBudget={remainingBudget}
                    teamSize={TEAM_SIZE}
                    currentUser={currentUser}
                    newUserName={newUserName}
                    currencyPrefix={currencyPrefix}
                    currencySuffix={currencySuffix}
                    isTeamValid={isTeamValid}
                    isSubmitting={isSubmitting}
                    submitButtonText={submitButtonText}
                    onSubmit={handleSubmit}
                />
            </div>

            <div className="flex-grow min-w-0">
                <div className="bg-gray-800 p-4 rounded-lg shadow-lg mb-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <input
                            type="text"
                            placeholder="Buscar piloto..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full sm:w-auto flex-grow bg-gray-900 text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        <div className="flex items-center gap-2">
                             <span className="text-sm text-gray-400">Ordenar por:</span>
                             <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as 'price' | 'name')}
                                className="bg-gray-900 text-white p-2 rounded-md"
                            >
                                <option value="price">Precio</option>
                                <option value="name">Nombre</option>
                            </select>
                        </div>
                    </div>
                     <div className="mt-4 border-t border-gray-700 pt-4">
                        <button 
                            onClick={handleFetchAdvice} 
                            disabled={isFetchingAdvice}
                            className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50"
                        >
                            {isFetchingAdvice ? (
                                <ArrowPathIcon className="w-5 h-5 animate-spin" />
                            ) : (
                                <LightBulbIcon className="w-5 h-5" />
                            )}
                            <span>{isFetchingAdvice ? 'Analizando equipo...' : 'Pedir consejo a la IA'}</span>
                        </button>
                         {aiAdvice && (
                            <div className="mt-4 p-4 bg-gray-900/50 rounded-lg text-gray-300 border border-blue-500/30">
                               <div className="flex items-center gap-2 mb-2 text-blue-400">
                                   <SparklesIcon className="w-5 h-5" />
                                   <h4 className="font-bold">Análisis de la IA</h4>
                               </div>
                               <div className="prose prose-sm prose-invert" dangerouslySetInnerHTML={{ __html: aiAdvice.replace(/\n/g, '<br />') }} />
                            </div>
                        )}
                    </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredAndSortedRiders.map(rider => (
                        <RiderCard
                            key={rider.id}
                            rider={rider}
                            onAdd={handleAddRider}
                            isTeamFull={team.length >= TEAM_SIZE}
                            isAffordable={remainingBudget >= rider.price}
                            selectedByTeams={getSelectedByTeams(rider.id)}
                            priceChange={rider.price - (rider.initial_price ?? rider.price)}
                            currencyPrefix={currencyPrefix}
                            currencySuffix={currencySuffix}
                        />
                    ))}
                </div>
            </div>
            
            {/* Mobile Summary Bar */}
            <div className="fixed bottom-0 left-0 right-0 bg-gray-800 p-3 border-t border-gray-700 shadow-[0_-4px_10px_rgba(0,0,0,0.3)] z-30 lg:hidden animate-fadeIn">
                 <div className="container mx-auto flex items-center justify-between gap-4">
                    <div className="text-center">
                        <p className="text-xs text-gray-400 uppercase">Presupuesto</p>
                        <p className={`text-lg font-bold ${remainingBudget < 0 ? 'text-red-500' : 'text-green-400'}`}>
                            {formatPrice(remainingBudget)}
                        </p>
                    </div>
                    <div className="text-center">
                        <p className="text-xs text-gray-400 uppercase">Pilotos</p>
                        <p className={`text-lg font-bold ${team.length === TEAM_SIZE ? 'text-green-400' : 'text-yellow-400'}`}>
                            {team.length}/{TEAM_SIZE}
                        </p>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={!isTeamValid || isSubmitting}
                        className="bg-green-600 text-white font-bold py-3 px-5 rounded-lg transition-colors duration-300 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed flex-shrink-0"
                    >
                        {isSubmitting ? '...' : submitButtonText}
                    </button>
                </div>
            </div>
        </div>
    );
};