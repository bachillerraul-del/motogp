import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import type { Rider, Participant, Race, Sport, Constructor } from '../types';
import { supabase } from '../lib/supabaseClient';
import { Modal } from './Modal';
import { AdminPanel } from './AdminPanel';
import { Leaderboard } from './Leaderboard';
import { RiderLeaderboard } from './RiderLeaderboard';
import { CogIcon, TrophyIcon, UsersIcon, ChartBarIcon } from './Icons';
import { useFantasy } from '../contexts/FantasyDataContext';
import { calculateScore } from '../lib/scoreUtils';
import { getTeamForRace } from '../lib/utils';
import { DreamTeam } from './DreamTeam';
import { ConstructorLeaderboard } from './ConstructorLeaderboard';
import { LeagueStats } from './LeagueStats';


type ResultsTab = 'participants' | 'riders' | 'constructors' | 'stats';

interface ResultsProps {
    isAdmin: boolean;
    sport: Sport;
    RIDER_LIMIT: number;
    CONSTRUCTOR_LIMIT: number;
    currencyPrefix: string;
    currencySuffix: string;
    currentUser: Participant | null;
    currentRace: Race | null;
    onSelectRider: (rider: Rider) => void;
    addGeminiParticipant: () => Promise<Participant | null>;
    onUpdateTeam: (participantId: number, riders: Rider[], constructor: Constructor, raceId: number) => Promise<boolean>;
}

export const Results: React.FC<ResultsProps> = (props) => {
    const { 
        isAdmin, sport, currentUser, currentRace, onSelectRider, addGeminiParticipant, onUpdateTeam,
        currencyPrefix, currencySuffix
    } = props;
    
    const {
        participants, races, teamSnapshots, riders, constructors, allRiderPoints,
        handleBulkUpdatePoints, showToast, fetchData, handleUpdateParticipant, handleDeleteParticipant,
        handleUpdateRace, handleUpdateRider, handleCreateRider
    } = useFantasy();

    const [selectedRaceForEditing, setSelectedRaceForEditing] = useState<Race | null>(null);
    const [leaderboardView, setLeaderboardView] = useState<number | 'general'>('general');
    const defaultViewIsSet = useRef(false);
    
    const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
    const [participantToDelete, setParticipantToDelete] = useState<Participant | null>(null);
    const [isConfirmingClearPoints, setIsConfirmingClearPoints] = useState(false);
    const [activeTab, setActiveTab] = useState<ResultsTab>('participants');
    
    const sortedRaces = useMemo(() => [...races].sort((a, b) => a.round - b.round), [races]);

    useEffect(() => {
        if (races.length > 0 && !defaultViewIsSet.current) {
            let defaultRace: Race | undefined = [...races]
                .filter(r => allRiderPoints[r.id] && Object.keys(allRiderPoints[r.id]).length > 0)
                .sort((a, b) => new Date(b.race_date).getTime() - new Date(a.race_date).getTime())[0];
            
            if (!defaultRace) {
                defaultRace = sortedRaces.slice().reverse()[0];
            }
            
            if (defaultRace) {
                setLeaderboardView(defaultRace.id);
                if (!selectedRaceForEditing) {
                    setSelectedRaceForEditing(defaultRace);
                }
            }
            defaultViewIsSet.current = true;
        }
    }, [races, allRiderPoints, selectedRaceForEditing, sortedRaces]);

    const participantRanks = useMemo(() => {
        const ranksByRace = new Map<number, Map<number, number>>();
        let cumulativeScores = new Map<number, number>();
        participants.forEach(p => cumulativeScores.set(p.id, 0));

        sortedRaces.forEach(race => {
            participants.forEach(p => {
                const raceScore = calculateScore(p, race.id, races, teamSnapshots, allRiderPoints, riders, constructors, sport);
                cumulativeScores.set(p.id, (cumulativeScores.get(p.id) || 0) + raceScore);
            });

            const ranked = [...cumulativeScores.entries()]
                // FIX: Corrected typo in sort function from `a` to `scoreA`.
                .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
                .map(([participantId], index) => ({ participantId, rank: index + 1 }));

            const rankMap = new Map<number, number>();
            ranked.forEach(({ participantId, rank }) => rankMap.set(participantId, rank));
            ranksByRace.set(race.id, rankMap);
        });
        return ranksByRace;
    }, [participants, sortedRaces, races, teamSnapshots, allRiderPoints, riders, constructors, sport]);

    const scoreCalculator = useCallback((participant: Participant) => {
        return calculateScore(participant, leaderboardView, races, teamSnapshots, allRiderPoints, riders, constructors, sport);
    }, [leaderboardView, races, teamSnapshots, allRiderPoints, riders, constructors, sport]);

    const sortedParticipants = useMemo(() => {
        const participantsWithScores = participants.map(p => ({
            ...p,
            score: Math.round(scoreCalculator(p)),
            rankChange: undefined as number | undefined
        }));

        if (leaderboardView !== 'general') {
            const currentRaceIndex = sortedRaces.findIndex(r => r.id === leaderboardView);
            if (currentRaceIndex > 0) {
                const prevRace = sortedRaces[currentRaceIndex - 1];
                const currentRanks = participantRanks.get(leaderboardView as number);
                const prevRanks = participantRanks.get(prevRace.id);

                participantsWithScores.forEach(p => {
                    const currentRank = currentRanks?.get(p.id);
                    const prevRank = prevRanks?.get(p.id);
                    if (currentRank != null && prevRank != null) {
                        p.rankChange = prevRank - currentRank;
                    }
                });
            }
        }
        return participantsWithScores.sort((a, b) => b.score - a.score);
    }, [participants, scoreCalculator, leaderboardView, sortedRaces, participantRanks]);

    const confirmClearPoints = async () => {
        if (!selectedRaceForEditing) return;
        const pointTable = sport === 'f1' ? 'f1_rider_points' : 'rider_points';
        const { error } = await supabase.from(pointTable).delete().eq('round_id', selectedRaceForEditing.id);
        if (error) {
            showToast('Error al limpiar los puntos.', 'error');
        } else {
             showToast('Puntos limpiados para la jornada.', 'success');
             fetchData();
        }
        setIsConfirmingClearPoints(false);
    };

    const confirmDeleteParticipant = () => {
        if (!participantToDelete) return;
        handleDeleteParticipant(participantToDelete.id);
        setParticipantToDelete(null);
    };

    const leaderboardTitle = useMemo(() => {
        if (leaderboardView === 'general') return "Clasificación General";
        const race = races.find(r => r.id === leaderboardView);
        return race ? `Clasificación ${race.gp_name}` : "Clasificación General";
    }, [leaderboardView, races]);

    const theme = {
        tabActive: `border-b-2 font-semibold ${sport === 'f1' ? 'border-red-500 text-white' : 'border-orange-500 text-white'}`,
        tabInactive: 'border-b-2 border-transparent text-gray-400 hover:text-white',
    };

    const tabs: { id: ResultsTab; label: string; icon: React.ReactNode }[] = [
        { id: 'participants', label: 'Clasificación', icon: <TrophyIcon className="w-5 h-5" /> },
        { id: 'riders', label: 'Pilotos', icon: <UsersIcon className="w-5 h-5" /> },
        { id: 'constructors', label: 'Escuderías', icon: <UsersIcon className="w-5 h-5" /> },
        { id: 'stats', label: 'Estadísticas', icon: <ChartBarIcon className="w-5 h-5" /> },
    ];

    return (
        <div className="space-y-6">
             {isAdmin && (
                <div className="mb-2">
                    <button onClick={() => setIsAdminPanelOpen(true)} className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors">
                        <CogIcon className="w-5 h-5" /> Panel de Administrador
                    </button>
                </div>
            )}
            
             <div className="flex flex-wrap justify-between items-center gap-y-2 gap-x-4">
                <h2 className="text-2xl font-bold">{leaderboardTitle}</h2>
                <div className="w-full sm:w-auto">
                    <select value={leaderboardView} onChange={e => setLeaderboardView(e.target.value === 'general' ? 'general' : Number(e.target.value))} className="bg-gray-800 text-white p-2 rounded-md w-full">
                        <option value="general">Clasificación General</option>
                        <optgroup label="Por Jornada">
                            {sortedRaces.map(race => <option key={race.id} value={race.id}>{race.gp_name}</option>)}
                        </optgroup>
                    </select>
                </div>
            </div>

            <div className="border-b border-gray-700 flex">
                {tabs.map(tab => (
                    <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex items-center justify-center gap-2 flex-1 py-3 text-center text-sm uppercase tracking-wider transition-colors ${activeTab === tab.id ? theme.tabActive : theme.tabInactive}`}>
                        {tab.icon} <span className="hidden sm:inline">{tab.label}</span>
                    </button>
                ))}
            </div>

            <div className="mt-4">
                {activeTab === 'participants' && (
                     <Leaderboard
                        participants={sortedParticipants}
                        races={races}
                        leaderboardView={leaderboardView}
                        isAdmin={isAdmin}
                        onDeleteParticipant={setParticipantToDelete}
                        onUpdateParticipant={handleUpdateParticipant}
                        teamSnapshots={teamSnapshots}
                        riders={riders}
                        constructors={constructors}
                        sport={sport}
                        currencyPrefix={props.currencyPrefix}
                        currencySuffix={props.currencySuffix}
                        onSelectRider={onSelectRider}
                        participantRanks={participantRanks}
                    />
                )}
                {activeTab === 'riders' && <RiderLeaderboard sport={sport} leaderboardView={leaderboardView} onSelectRider={onSelectRider} currencyPrefix={currencyPrefix} currencySuffix={currencySuffix}/>}
                {activeTab === 'constructors' && <ConstructorLeaderboard sport={sport} leaderboardView={leaderboardView} currencyPrefix={currencyPrefix} currencySuffix={currencySuffix}/>}
                {activeTab === 'stats' && (
                    <div className="space-y-8">
                        <DreamTeam sport={sport} currencyPrefix={currencyPrefix} currencySuffix={currencySuffix} />
                        <LeagueStats sport={sport} currencyPrefix={currencyPrefix} currencySuffix={currencySuffix} />
                    </div>
                )}
            </div>
            
            <Modal isOpen={!!participantToDelete} onClose={() => setParticipantToDelete(null)} title="Confirmar Eliminación" sport={sport}>
                <div className="space-y-4 text-center">
                    <p>¿Estás seguro de que quieres eliminar a <strong className="text-white">{participantToDelete?.name}</strong> de la liga?</p>
                    <p className="text-sm text-red-400">Esta acción no se puede deshacer.</p>
                    <div className="flex gap-4 pt-2">
                        <button onClick={() => setParticipantToDelete(null)} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
                        <button onClick={confirmDeleteParticipant} className={`w-full text-white font-bold py-2 px-4 rounded-lg ${sport === 'f1' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'}`}>Eliminar</button>
                    </div>
                </div>
            </Modal>
            
            <Modal isOpen={isConfirmingClearPoints} onClose={() => setIsConfirmingClearPoints(false)} title="Confirmar Limpieza" sport={sport}>
                 <div className="space-y-4 text-center">
                    <p>¿Limpiar todos los puntos para <strong className="text-white">{selectedRaceForEditing?.gp_name}</strong>? Esta acción es irreversible.</p>
                    <div className="flex gap-4 pt-2">
                        <button onClick={() => setIsConfirmingClearPoints(false)} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
                        <button onClick={confirmClearPoints} className={`w-full text-white font-bold py-2 px-4 rounded-lg ${sport === 'f1' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'}`}>Confirmar</button>
                    </div>
                </div>
            </Modal>
            
            <Modal isOpen={isAdminPanelOpen} onClose={() => setIsAdminPanelOpen(false)} title="Panel de Administrador" sport={sport} size="xl">
                <AdminPanel
                    races={races}
                    selectedRace={selectedRaceForEditing}
                    currentRace={currentRace}
                    onSelectRace={setSelectedRaceForEditing}
                    onUpdateRace={handleUpdateRace}
                    onClearPoints={() => setIsConfirmingClearPoints(true)}
                    riders={riders}
                    constructors={constructors}
                    participants={participants}
                    riderPoints={allRiderPoints}
                    onUpdateRider={handleUpdateRider}
                    onBulkUpdatePoints={handleBulkUpdatePoints}
                    addGeminiParticipant={addGeminiParticipant}
                    onUpdateTeam={onUpdateTeam}
                    showToast={showToast}
                    sport={sport}
                    onCreateRider={handleCreateRider}
                />
            </Modal>
        </div>
    );
};