import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { Rider, Participant, Round, TeamSnapshot, LeagueSettings, AllRiderPoints } from '../types';
import { supabase } from '../lib/supabaseClient';
import { Modal } from './Modal';
import { AdminPanel } from './AdminPanel';
import { Leaderboard } from './Leaderboard';
import { RiderLeaderboard } from './RiderLeaderboard';
import { TrophyIcon } from './Icons';

// Modal for rider point details
interface RiderDetailModalProps {
    rider: RiderWithScore | null;
    rounds: Round[];
    allRiderPoints: AllRiderPoints;
    onClose: () => void;
}

type RiderWithScore = Rider & { score: number };

const RiderDetailModal: React.FC<RiderDetailModalProps> = ({ rider, rounds, allRiderPoints, onClose }) => {
    if (!rider) return null;

    const sortedRounds = [...rounds].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const riderHasPoints = sortedRounds.some(round => {
        const points = allRiderPoints[round.id]?.[rider.id];
        return points && points > 0;
    });

    return (
        <Modal isOpen={!!rider} onClose={onClose} title={`Desglose de Puntos: ${rider.name}`}>
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
                        sortedRounds.map(round => {
                            const points = allRiderPoints[round.id]?.[rider.id] || 0;

                            if (points === 0) return null;

                            return (
                                <div key={round.id} className="bg-gray-700/50 p-3 rounded-md flex justify-between items-center">
                                    <p className="font-semibold text-white">{round.name}</p>
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
    rounds: Round[];
    teamSnapshots: TeamSnapshot[];
    leagueSettings: LeagueSettings | null;
    riders: Rider[];
    isAdmin: boolean;
    onUpdateParticipant: (participant: Participant) => Promise<void>;
    onDeleteParticipant: (participantId: number) => Promise<void>;
    onAddRound: (roundName: string) => Promise<void>;
    onUpdateRound: (round: Round) => Promise<void>;
    onUpdateMarketDeadline: (deadline: string | null) => Promise<void>;
    onUpdateRider: (rider: Rider) => Promise<void>;
    showToast: (message: string, type: 'success' | 'error') => void;
    allRiderPoints: AllRiderPoints;
    refetchData: () => void;
}

const getTeamForRound = (participantId: number, roundDate: string | null, snapshots: TeamSnapshot[]): number[] => {
    if (!roundDate) return [];
    
    const participantSnapshots = snapshots
        .filter(s => s.participant_id === participantId && new Date(s.created_at) < new Date(roundDate))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
    return participantSnapshots.length > 0 ? participantSnapshots[0].team_ids : [];
};

export const Results: React.FC<ResultsProps> = (props) => {
    const { 
        participants, rounds, teamSnapshots, leagueSettings, riders, isAdmin, 
        onUpdateParticipant, onDeleteParticipant, onAddRound, onUpdateRound, onUpdateMarketDeadline, onUpdateRider,
        showToast, allRiderPoints, refetchData
    } = props;
    
    const [selectedRoundForEditing, setSelectedRoundForEditing] = useState<Round | null>(null);
    const [leaderboardView, setLeaderboardView] = useState<number | 'general'>('general');
    const [selectedRiderDetails, setSelectedRiderDetails] = useState<RiderWithScore | null>(null);
    const defaultViewIsSet = useRef(false);
    
    // Modal States
    const [participantToDelete, setParticipantToDelete] = useState<Participant | null>(null);
    const [isConfirmingClearPoints, setIsConfirmingClearPoints] = useState(false);

    useEffect(() => {
        if (rounds.length > 0 && !defaultViewIsSet.current) {
            const latestRound = [...rounds].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
            setLeaderboardView(latestRound.id);
            if (!selectedRoundForEditing) {
                setSelectedRoundForEditing(latestRound);
            }
            defaultViewIsSet.current = true;
        }
    }, [rounds, selectedRoundForEditing]);

    const handlePointChange = async (riderId: number, pointsStr: string) => {
        if (selectedRoundForEditing === null) {
            showToast('Por favor, selecciona una jornada para editar los puntos.', 'error');
            return;
        }
        const finalPoints = pointsStr === '' ? 0 : parseInt(pointsStr, 10);
        if (isNaN(finalPoints)) return;

        const { error } = await supabase.from('rider_points').upsert({
            round_id: selectedRoundForEditing.id,
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
        if (selectedRoundForEditing === null) return;
        const { error } = await supabase.from('rider_points').delete().eq('round_id', selectedRoundForEditing.id);
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
        const calculateRoundScore = (round: Round) => {
            const teamForRound = getTeamForRound(participant.id, round.round_date, teamSnapshots);
            const roundPointsMap = allRiderPoints[round.id] || {};
            return teamForRound.reduce((acc, riderId) => {
                const points = roundPointsMap[riderId] || 0;
                return acc + points;
            }, 0);
        };

        if (leaderboardView === 'general') {
            return rounds.reduce((totalScore, round) => totalScore + calculateRoundScore(round), 0);
        } else {
            const round = rounds.find(r => r.id === leaderboardView);
            return round ? calculateRoundScore(round) : 0;
        }
    }, [leaderboardView, rounds, teamSnapshots, allRiderPoints]);

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
        const round = rounds.find(r => r.id === leaderboardView);
        return round ? `Pilotos: ${round.name}` : "Clasificación de Pilotos";
    }, [leaderboardView, rounds]);

    return (
        <div className="flex flex-col lg:flex-row gap-8">
            {isAdmin && (
                <AdminPanel
                    rounds={rounds}
                    onAddRound={onAddRound}
                    selectedRound={selectedRoundForEditing}
                    onSelectRound={setSelectedRoundForEditing}
                    onUpdateRound={onUpdateRound}
                    onClearPoints={() => setIsConfirmingClearPoints(true)}
                    riders={riders}
                    riderPoints={allRiderPoints}
                    onPointChange={handlePointChange}
                    leagueSettings={leagueSettings}
                    onUpdateMarketDeadline={onUpdateMarketDeadline}
                    onUpdateRider={onUpdateRider}
                    showToast={showToast}
                    participants={participants}
                    teamSnapshots={teamSnapshots}
                />
            )}

            <Leaderboard
                participants={sortedParticipants}
                rounds={rounds}
                leaderboardView={leaderboardView}
                onLeaderboardViewChange={setLeaderboardView}
                isAdmin={isAdmin}
                onDeleteParticipant={setParticipantToDelete}
                onUpdateParticipant={onUpdateParticipant}
                allRiderPoints={allRiderPoints}
                teamSnapshots={teamSnapshots}
                riders={riders}
            />

            <RiderLeaderboard
                riders={sortedRiders}
                onRiderClick={setSelectedRiderDetails}
                title={riderLeaderboardTitle}
            />
            
            <RiderDetailModal 
                rider={selectedRiderDetails}
                rounds={rounds}
                allRiderPoints={allRiderPoints}
                onClose={() => setSelectedRiderDetails(null)}
            />

            <Modal
                isOpen={!!participantToDelete}
                onClose={() => setParticipantToDelete(null)}
                title="Confirmar Eliminación"
            >
                <div className="space-y-4 text-center">
                    <p>¿Estás seguro de que quieres eliminar a <strong className="text-white">{participantToDelete?.name}</strong> de la liga?</p>
                    <p className="text-sm text-red-400">Esta acción no se puede deshacer.</p>
                    <div className="flex gap-4 pt-2">
                        <button onClick={() => setParticipantToDelete(null)} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                            Cancelar
                        </button>
                        <button onClick={confirmDeleteParticipant} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                            Eliminar
                        </button>
                    </div>
                </div>
            </Modal>
            
             <Modal
                isOpen={isConfirmingClearPoints}
                onClose={() => setIsConfirmingClearPoints(false)}
                title="Confirmar Limpieza de Puntos"
            >
                <div className="space-y-4 text-center">
                    <p>¿Estás seguro de que quieres limpiar todos los puntos para la jornada seleccionada?</p>
                    <p className="text-sm text-red-400">Esto pondrá a 0 los puntos de todos los pilotos para esta jornada.</p>
                     <div className="flex gap-4 pt-2">
                        <button onClick={() => setIsConfirmingClearPoints(false)} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                            Cancelar
                        </button>
                        <button onClick={confirmClearPoints} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                            Limpiar Puntos
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};