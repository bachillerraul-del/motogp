import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { Rider, Participant, Round, TeamSnapshot, LeagueSettings } from '../types';
import { MOTOGP_RIDERS } from '../constants';
import { supabase } from '../lib/supabaseClient';
import { Modal } from './Modal';
import { AdminPanel } from './AdminPanel';
import { Leaderboard } from './Leaderboard';

interface ResultsProps {
    participants: Participant[];
    rounds: Round[];
    teamSnapshots: TeamSnapshot[];
    leagueSettings: LeagueSettings | null;
    isAdmin: boolean;
    onUpdateParticipant: (participant: Participant) => Promise<void>;
    onDeleteParticipant: (participantId: number) => Promise<void>;
    onAddRound: (roundName: string) => Promise<void>;
    onUpdateRound: (round: Round) => Promise<void>;
    onUpdateMarketDeadline: (deadline: string | null) => Promise<void>;
    showToast: (message: string, type: 'success' | 'error') => void;
}

type AllRiderPoints = Record<number, Record<number, number>>;

const getTeamForRound = (participantId: number, roundDate: string | null, snapshots: TeamSnapshot[]): number[] => {
    if (!roundDate) return [];
    
    const participantSnapshots = snapshots
        .filter(s => s.participant_id === participantId && new Date(s.created_at) < new Date(roundDate))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        
    return participantSnapshots.length > 0 ? participantSnapshots[0].team_ids : [];
};

export const Results: React.FC<ResultsProps> = (props) => {
    const { 
        participants, rounds, teamSnapshots, leagueSettings, isAdmin, 
        onUpdateParticipant, onDeleteParticipant, onAddRound, onUpdateRound, onUpdateMarketDeadline, 
        showToast 
    } = props;
    
    const [allRiderPoints, setAllRiderPoints] = useState<AllRiderPoints>({});
    const [selectedRoundForEditing, setSelectedRoundForEditing] = useState<Round | null>(null);
    const [leaderboardView, setLeaderboardView] = useState<number | 'general'>('general');
    const defaultViewIsSet = useRef(false);
    
    // Modal States
    const [participantToDelete, setParticipantToDelete] = useState<Participant | null>(null);
    const [isConfirmingClearPoints, setIsConfirmingClearPoints] = useState(false);

    useEffect(() => {
        // This effect sets the default view to the latest round *only once* when rounds are available.
        // It won't override the user's selection later.
        if (rounds.length > 0 && !defaultViewIsSet.current) {
            const latestRound = [...rounds].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
            
            setLeaderboardView(latestRound.id);
            
            // Also set the default round for the admin panel if it's not already set
            if (!selectedRoundForEditing) {
                setSelectedRoundForEditing(latestRound);
            }
            
            defaultViewIsSet.current = true; // Mark as set to prevent this from running again
        }
    }, [rounds, selectedRoundForEditing]);

    useEffect(() => {
        const fetchRiderPoints = async () => {
            const { data, error } = await supabase.from('rider_points').select('round_id, rider_id, points');
            if (error) {
                console.error('Error fetching rider points:', error);
            } else if (data) {
                const pointsMap = data.reduce((acc, item) => {
                    if (!acc[item.round_id]) acc[item.round_id] = {};
                    acc[item.round_id][item.rider_id] = item.points;
                    return acc;
                }, {} as AllRiderPoints);
                setAllRiderPoints(pointsMap);
            }
        };
        fetchRiderPoints();
    }, []);

    const handlePointChange = async (riderId: number, pointsStr: string) => {
        if (selectedRoundForEditing === null) {
            showToast('Por favor, selecciona una jornada para editar los puntos.', 'error');
            return;
        }
        const finalPoints = pointsStr === '' ? 0 : parseInt(pointsStr, 10);
        if (isNaN(finalPoints)) return;

        setAllRiderPoints(prev => ({ ...prev, [selectedRoundForEditing.id]: { ...prev[selectedRoundForEditing.id], [riderId]: finalPoints }}));
        const { error } = await supabase.from('rider_points').upsert({ round_id: selectedRoundForEditing.id, rider_id: riderId, points: finalPoints });
        if (error) {
            console.error('Error upserting rider points:', error);
            showToast('Error al guardar los puntos.', 'error');
        }
    };
    
    const confirmClearPoints = async () => {
        if (selectedRoundForEditing === null) return;
        setAllRiderPoints(prev => ({ ...prev, [selectedRoundForEditing.id]: {} }));
        const { error } = await supabase.from('rider_points').delete().eq('round_id', selectedRoundForEditing.id);
        if (error) {
            console.error('Error clearing points:', error);
            showToast('Error al limpiar los puntos.', 'error');
        } else {
             showToast('Puntos limpiados para la jornada.', 'success');
        }
        setIsConfirmingClearPoints(false);
    };

    const confirmDeleteParticipant = () => {
        if (!participantToDelete) return;
        onDeleteParticipant(participantToDelete.id);
        setParticipantToDelete(null);
    };

    const calculateScore = useCallback((participant: Participant): number => {
        if (leaderboardView === 'general') {
            return rounds.reduce((totalScore, round) => {
                const teamForRound = getTeamForRound(participant.id, round.round_date, teamSnapshots);
                const roundPointsMap = allRiderPoints[round.id] || {};
                const roundScore = teamForRound.reduce((acc, riderId) => acc + (roundPointsMap[riderId] || 0), 0);
                return totalScore + roundScore;
            }, 0);
        } else {
            const round = rounds.find(r => r.id === leaderboardView);
            if (!round) return 0;
            const teamForRound = getTeamForRound(participant.id, round.round_date, teamSnapshots);
            const roundPointsMap = allRiderPoints[leaderboardView] || {};
            return teamForRound.reduce((acc, riderId) => acc + (roundPointsMap[riderId] || 0), 0);
        }
    }, [leaderboardView, rounds, teamSnapshots, allRiderPoints]);

    const sortedParticipants = useMemo(() => {
        return [...participants].map(p => ({
            ...p,
            score: calculateScore(p)
        })).sort((a, b) => b.score - a.score);
    }, [participants, calculateScore]);

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
                    riders={MOTOGP_RIDERS}
                    riderPoints={allRiderPoints}
                    onPointChange={handlePointChange}
                    leagueSettings={leagueSettings}
                    onUpdateMarketDeadline={onUpdateMarketDeadline}
                    showToast={showToast}
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