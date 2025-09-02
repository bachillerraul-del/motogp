import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { Rider, Participant, Round } from '../types';
import { MOTOGP_RIDERS } from '../constants';
import { supabase } from '../lib/supabaseClient';
import { Modal } from './Modal';
import { AdminPanel } from './AdminPanel';
import { Leaderboard } from './Leaderboard';

interface ResultsProps {
    participants: Participant[];
    rounds: Round[];
    isAdmin: boolean;
    onUpdateParticipant: (participant: Participant) => Promise<void>;
    onDeleteParticipant: (participantId: number) => Promise<void>;
    onAddRound: (roundName: string) => Promise<void>;
    showToast: (message: string, type: 'success' | 'error') => void;
}

type AllRiderPoints = Record<number, Record<number, number>>;

export const Results: React.FC<ResultsProps> = ({ participants, rounds, isAdmin, onUpdateParticipant, onDeleteParticipant, onAddRound, showToast }) => {
    const [allRiderPoints, setAllRiderPoints] = useState<AllRiderPoints>({});
    const [selectedRoundForEditing, setSelectedRoundForEditing] = useState<number | null>(null);
    const [leaderboardView, setLeaderboardView] = useState<number | 'general'>('general');
    
    // Modal States
    const [participantToDelete, setParticipantToDelete] = useState<Participant | null>(null);
    const [isConfirmingClearPoints, setIsConfirmingClearPoints] = useState(false);

    useEffect(() => {
        if (rounds.length > 0 && selectedRoundForEditing === null) {
            const latestRound = rounds.reduce((latest, current) => new Date(latest.created_at) > new Date(current.created_at) ? latest : current);
            setSelectedRoundForEditing(latestRound.id);
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

        setAllRiderPoints(prev => ({ ...prev, [selectedRoundForEditing]: { ...prev[selectedRoundForEditing], [riderId]: finalPoints }}));
        const { error } = await supabase.from('rider_points').upsert({ round_id: selectedRoundForEditing, rider_id: riderId, points: finalPoints });
        if (error) {
            console.error('Error upserting rider points:', error);
            showToast('Error al guardar los puntos.', 'error');
        }
    };
    
    const confirmClearPoints = async () => {
        if (selectedRoundForEditing === null) return;
        setAllRiderPoints(prev => ({ ...prev, [selectedRoundForEditing]: {} }));
        const { error } = await supabase.from('rider_points').delete().eq('round_id', selectedRoundForEditing);
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

    const calculateScore = useCallback((team_ids: number[]): number => {
        if (leaderboardView === 'general') {
            return Object.values(allRiderPoints).reduce((totalScore, roundPoints) => 
                totalScore + team_ids.reduce((roundTotal, riderId) => roundTotal + (roundPoints[riderId] || 0), 0), 0);
        }
        const roundPoints = allRiderPoints[leaderboardView] || {};
        return team_ids.reduce((total, riderId) => total + (roundPoints[riderId] || 0), 0);
    }, [allRiderPoints, leaderboardView]);

    const sortedParticipants = useMemo(() => {
        return [...participants].sort((a, b) => calculateScore(b.team_ids) - calculateScore(a.team_ids));
    }, [participants, calculateScore]);

    return (
        <div className="flex flex-col lg:flex-row gap-8">
            {isAdmin && (
                <AdminPanel
                    rounds={rounds}
                    onAddRound={onAddRound}
                    selectedRound={selectedRoundForEditing}
                    onSelectRound={setSelectedRoundForEditing}
                    onClearPoints={() => setIsConfirmingClearPoints(true)}
                    riders={MOTOGP_RIDERS}
                    riderPoints={allRiderPoints}
                    onPointChange={handlePointChange}
                    showToast={showToast}
                />
            )}

            <Leaderboard
                participants={sortedParticipants}
                rounds={rounds}
                leaderboardView={leaderboardView}
                onLeaderboardViewChange={setLeaderboardView}
                calculateScore={calculateScore}
                isAdmin={isAdmin}
                onDeleteParticipant={setParticipantToDelete}
                onUpdateParticipant={onUpdateParticipant}
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
