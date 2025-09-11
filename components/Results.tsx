import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { Rider, Participant, Race, TeamSnapshot, AllRiderPoints, Sport } from '../types';
import { supabase } from '../lib/supabaseClient';
import { Modal } from './Modal';
import { AdminPanel } from './AdminPanel';
import { Leaderboard } from './Leaderboard';
import { RiderLeaderboard } from './RiderLeaderboard';
import { TrophyIcon, CogIcon, UsersIcon, ChartBarIcon } from './Icons';
import { getTeamForRace } from '../lib/utils';

// Modal for rider point details
interface RiderDetailModalProps {
    rider: RiderWithScore | null;
    races: Race[];
    allRiderPoints: AllRiderPoints;
    onClose: () => void;
    sport: Sport;
}

type RiderWithScore = Rider & { score: number };

const RiderDetailModal: React.FC<RiderDetailModalProps> = ({ rider, races, allRiderPoints, onClose, sport }) => {
    if (!rider) return null;

    const sortedRaces = [...races].sort((a, b) => new Date(a.race_date).getTime() - new Date(b.race_date).getTime());
    const riderHasPoints = sortedRaces.some(race => {
        const points = allRiderPoints[race.id]?.[rider.id];
        return points && points > 0;
    });

    return (
        <Modal isOpen={!!rider} onClose={onClose} title={`Desglose de Puntos: ${rider.name}`} sport={sport}>
            <div className="space-y-4">
                <div className="flex justify-between items-center bg-gray-900/50 p-3 rounded-lg">
                    <div>
                        <p className="text-lg font-bold text-white">{rider.name}</p>
                        <p className="text-sm text-gray-400">{rider.team}</p>
                    </div>
                    <div className="flex items-center gap-2 bg-yellow-400/10 text-yellow-300 font-bold px-4 py-2 rounded-full text-lg">
                        <TrophyIcon className="w-6 h-6"/>
                        <span>{rider.score} pts</span>
                    </div>
                </div>

                <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-3">
                    <h3 className="text-md font-semibold text-gray-300 uppercase tracking-wider border-b border-gray-700 pb-2">Puntos por Jornada</h3>
                    {riderHasPoints ? (
                        sortedRaces.map(race => {
                            const points = allRiderPoints[race.id]?.[rider.id] || 0;

                            if (points === 0) return null;

                            return (
                                <div key={race.id} className="bg-gray-700/50 p-3 rounded-md flex justify-between items-center">
                                    <p className="font-semibold text-white">{race.gp_name}</p>
                                    <p className="font-bold text-lg text-yellow-300">{points} pts</p>
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-center text-gray-500 py-4">Este piloto aún no ha conseguido puntos.</p>
                    )}
                </div>
            </div>
        </Modal>
    );
};


interface ResultsProps {
    participants: Participant[];
    races: Race[];
    teamSnapshots: TeamSnapshot[];
    riders: Rider[];
    isAdmin: boolean;
    onUpdateParticipant: (participant: Participant) => Promise<void>;
    onDeleteParticipant: (participantId: number) => Promise<void>;
    onUpdateRace: (race: Race) => Promise<void>;
    onUpdateRider: (rider: Rider) => Promise<void>;
    handleBulkUpdatePoints: (roundId: number, newPoints: Map<number, number>, previousRiderIds: number[]) => Promise<void>;
    showToast: (message: string, type: 'success' | 'error') => void;
    allRiderPoints: AllRiderPoints;
    refetchData: () => void;
    sport: Sport;
    BUDGET: number;
    TEAM_SIZE: number;
    currencyPrefix: string;
    currencySuffix: string;
    currentUser: Participant | null;
}

export const Results: React.FC<ResultsProps> = (props) => {
    const { 
        participants, races, teamSnapshots, riders, isAdmin, 
        onUpdateParticipant, onDeleteParticipant, onUpdateRace, onUpdateRider, handleBulkUpdatePoints,
        showToast, allRiderPoints, refetchData, sport, BUDGET, TEAM_SIZE, currencyPrefix, currencySuffix,
        currentUser
    } = props;
    
    const [selectedRaceForEditing, setSelectedRaceForEditing] = useState<Race | null>(null);
    const [leaderboardView, setLeaderboardView] = useState<number | 'general'>('general');
    const [selectedRiderDetails, setSelectedRiderDetails] = useState<RiderWithScore | null>(null);
    const defaultViewIsSet = useRef(false);
    
    // Mobile-specific state
    const [mobileView, setMobileView] = useState<'leaderboard' | 'riders'>('leaderboard');
    const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
    
    // Modal States
    const [participantToDelete, setParticipantToDelete] = useState<Participant | null>(null);
    const [isConfirmingClearPoints, setIsConfirmingClearPoints] = useState(false);

    useEffect(() => {
        if (races.length > 0 && !defaultViewIsSet.current) {
            let defaultRace: Race | undefined;

            // Priority 1: Current user's last team submission
            if (currentUser) {
                const userSnapshots = teamSnapshots
                    .filter(s => s.participant_id === currentUser.id && s.race_id !== null)
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                
                if (userSnapshots.length > 0) {
                    const latestRaceId = userSnapshots[0].race_id;
                    defaultRace = races.find(r => r.id === latestRaceId);
                }
            }

            // Priority 2 (Fallback): Latest race with points
            if (!defaultRace) {
                defaultRace = [...races]
                    .filter(r => allRiderPoints[r.id] && Object.keys(allRiderPoints[r.id]).length > 0)
                    .sort((a, b) => new Date(b.race_date).getTime() - new Date(a.race_date).getTime())[0];
            }

            // Priority 3 (Fallback): Latest race in the calendar
            if (!defaultRace) {
                defaultRace = [...races].sort((a, b) => new Date(b.race_date).getTime() - new Date(a.race_date).getTime())[0];
            }
            
            if (defaultRace) {
                setLeaderboardView(defaultRace.id);
                if (!selectedRaceForEditing) {
                    setSelectedRaceForEditing(defaultRace);
                }
            }
            defaultViewIsSet.current = true;
        }
    }, [races, allRiderPoints, selectedRaceForEditing, currentUser, teamSnapshots]);

    const handlePointChange = async (riderId: number, pointsStr: string) => {
        if (selectedRaceForEditing === null) {
            showToast('Por favor, selecciona una jornada para editar los puntos.', 'error');
            return;
        }
        const finalPoints = pointsStr === '' ? 0 : parseInt(pointsStr, 10);
        if (isNaN(finalPoints)) return;

        const pointTable = sport === 'f1' ? 'f1_rider_points' : 'rider_points';
        const { error } = await supabase.from(pointTable).upsert({
            round_id: selectedRaceForEditing.id,
            rider_id: riderId,
            points: finalPoints
        });

        if (error) {
            console.error('Error upserting rider points:', error);
            showToast('Error al guardar los puntos.', 'error');
        } else {
            refetchData();
        }
    };
    
    const confirmClearPoints = async () => {
        if (selectedRaceForEditing === null) return;
        const pointTable = sport === 'f1' ? 'f1_rider_points' : 'rider_points';
        const { error } = await supabase.from(pointTable).delete().eq('round_id', selectedRaceForEditing.id);
        if (error) {
            console.error('Error clearing points:', error);
            showToast('Error al limpiar los puntos.', 'error');
        } else {
             showToast('Puntos limpiados para la jornada.', 'success');
             refetchData();
        }
        setIsConfirmingClearPoints(false);
    };

    const confirmDeleteParticipant = () => {
        if (!participantToDelete) return;
        onDeleteParticipant(participantToDelete.id);
        setParticipantToDelete(null);
    };

    const calculateScore = useCallback((participant: Participant): number => {
        const calculateRaceScore = (race: Race) => {
            const teamForRace = getTeamForRace(participant.id, race.id, teamSnapshots);
            const racePointsMap = allRiderPoints[race.id] || {};
            return teamForRace.reduce((acc, riderId) => {
                const points = racePointsMap[riderId] || 0;
                return acc + points;
            }, 0);
        };

        if (leaderboardView === 'general') {
            return races.reduce((totalScore, race) => totalScore + calculateRaceScore(race), 0);
        } else {
            const race = races.find(r => r.id === leaderboardView);
            return race ? calculateRaceScore(race) : 0;
        }
    }, [leaderboardView, races, teamSnapshots, allRiderPoints]);

    const sortedParticipants = useMemo(() => {
        return [...participants].map(p => ({
            ...p,
            score: calculateScore(p)
        })).sort((a, b) => b.score - a.score);
    }, [participants, calculateScore]);

    const sortedRiders = useMemo(() => {
        const riderScores: Record<number, number> = {};

        if (leaderboardView === 'general') {
            // Calculate total score for all rounds
            Object.values(allRiderPoints).forEach(roundPoints => {
                Object.entries(roundPoints).forEach(([riderId, points]) => {
                    const id = parseInt(riderId, 10);
                    riderScores[id] = (riderScores[id] || 0) + points;
                });
            });
        } else {
            // Calculate score for the selected round only
            const selectedRoundPoints = allRiderPoints[leaderboardView] || {};
            Object.entries(selectedRoundPoints).forEach(([riderId, points]) => {
                const id = parseInt(riderId, 10);
                riderScores[id] = points;
            });
        }

        return riders
            .map(rider => ({
                ...rider,
                score: riderScores[rider.id] || 0
            }))
            .filter(rider => rider.score > 0)
            .sort((a, b) => b.score - a.score);

    }, [allRiderPoints, riders, leaderboardView]);

    const riderLeaderboardTitle = useMemo(() => {
        if (leaderboardView === 'general') {
            return "Clasificación de Pilotos";
        }
        const race = races.find(r => r.id === leaderboardView);
        return race ? `Pilotos: ${race.gp_name}` : "Clasificación de Pilotos";
    }, [leaderboardView, races]);

    const mobileTabActiveColor = sport === 'f1' ? 'bg-red-600' : 'bg-orange-500';

    return (
        <div>
            {isAdmin && (
                <div className="mb-6 lg:hidden">
                    <button
                        onClick={() => setIsAdminPanelOpen(!isAdminPanelOpen)}
                        className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300"
                        aria-expanded={isAdminPanelOpen}
                        aria-controls="admin-panel"
                    >
                        <CogIcon className="w-5 h-5" />
                        {isAdminPanelOpen ? 'Ocultar Panel de Administrador' : 'Mostrar Panel de Administrador'}
                    </button>
                </div>
            )}

            <div className="flex flex-col lg:flex-row gap-8">
                {isAdmin && (
                    <div id="admin-panel" className={`${isAdminPanelOpen ? 'block' : 'hidden'} lg:block w-full lg:w-1/3 transition-all duration-300`}>
                        <AdminPanel
                            races={races}
                            selectedRace={selectedRaceForEditing}
                            onSelectRace={setSelectedRaceForEditing}
                            onUpdateRace={onUpdateRace}
                            onClearPoints={() => setIsConfirmingClearPoints(true)}
                            riders={riders}
                            riderPoints={allRiderPoints}
                            onPointChange={handlePointChange}
                            onUpdateRider={onUpdateRider}
                            onBulkUpdatePoints={handleBulkUpdatePoints}
                            showToast={showToast}
                            sport={sport}
                        />
                    </div>
                )}
                
                <div className="flex-grow">
                     {/* Mobile Tabs */}
                    <div className="mb-4 flex lg:hidden rounded-lg bg-gray-800 p-1 border border-gray-700">
                        <button
                            onClick={() => setMobileView('leaderboard')}
                            className={`w-1/2 p-2 rounded-md font-semibold text-center transition-colors flex items-center justify-center gap-2 ${mobileView === 'leaderboard' ? `${mobileTabActiveColor} text-white` : 'text-gray-300'}`}
                        >
                            <UsersIcon className="w-5 h-5" />
                            Clasificación
                        </button>
                        <button
                            onClick={() => setMobileView('riders')}
                            className={`w-1/2 p-2 rounded-md font-semibold text-center transition-colors flex items-center justify-center gap-2 ${mobileView === 'riders' ? `${mobileTabActiveColor} text-white` : 'text-gray-300'}`}
                        >
                            <ChartBarIcon className="w-5 h-5" />
                            Pilotos
                        </button>
                    </div>

                    <div className="lg:flex lg:gap-8">
                        {/* Leaderboard Column - visible on mobile if tab is active */}
                        <div className={`w-full lg:flex-grow ${mobileView === 'leaderboard' ? 'block' : 'hidden'} lg:block`}>
                            <Leaderboard
                                participants={sortedParticipants}
                                races={races}
                                leaderboardView={leaderboardView}
                                onLeaderboardViewChange={setLeaderboardView}
                                isAdmin={isAdmin}
                                onDeleteParticipant={setParticipantToDelete}
                                onUpdateParticipant={onUpdateParticipant}
                                allRiderPoints={allRiderPoints}
                                teamSnapshots={teamSnapshots}
                                riders={riders}
                                sport={sport}
                                BUDGET={BUDGET}
                                TEAM_SIZE={TEAM_SIZE}
                                currencyPrefix={currencyPrefix}
                                currencySuffix={currencySuffix}
                            />
                        </div>

                         {/* Rider Leaderboard Column - visible on mobile if tab is active */}
                        <div className={`w-full lg:w-1/4 ${mobileView === 'riders' ? 'block' : 'hidden'} lg:block`}>
                            <RiderLeaderboard
                                riders={sortedRiders}
                                onRiderClick={setSelectedRiderDetails}
                                title={riderLeaderboardTitle}
                                sport={sport}
                            />
                        </div>
                    </div>
                </div>
            </div>
            
            <RiderDetailModal 
                rider={selectedRiderDetails}
                races={races}
                allRiderPoints={allRiderPoints}
                onClose={() => setSelectedRiderDetails(null)}
                sport={sport}
            />

            <Modal
                isOpen={!!participantToDelete}
                onClose={() => setParticipantToDelete(null)}
                title="Confirmar Eliminación"
                sport={sport}
            >
                <div className="space-y-4 text-center">
                    <p>¿Estás seguro de que quieres eliminar a <strong className="text-white">{participantToDelete?.name}</strong> de la liga?</p>
                    <p className="text-sm text-red-400">Esta acción no se puede deshacer.</p>
                    <div className="flex gap-4 pt-2">
                        <button onClick={() => setParticipantToDelete(null)} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                            Cancelar
                        </button>
                        <button onClick={confirmDeleteParticipant} className={`w-full text-white font-bold py-2 px-4 rounded-lg transition-colors ${sport === 'f1' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'}`}>
                            Eliminar
                        </button>
                    </div>
                </div>
            </Modal>
            
             <Modal
                isOpen={isConfirmingClearPoints}
                onClose={() => setIsConfirmingClearPoints(false)}
                title="Confirmar Limpieza de Puntos"
                sport={sport}
            >
                <div className="space-y-4 text-center">
                    <p>¿Estás seguro de que quieres limpiar todos los puntos para la jornada seleccionada?</p>
                    <p className="text-sm text-red-400">Esto pondrá a 0 los puntos de todos los pilotos para esta jornada.</p>
                     <div className="flex gap-4 pt-2">
                        <button onClick={() => setIsConfirmingClearPoints(false)} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                            Cancelar
                        </button>
                        <button onClick={confirmClearPoints} className={`w-full text-white font-bold py-2 px-4 rounded-lg transition-colors ${sport === 'f1' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'}`}>
                            Limpiar Puntos
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};