import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { Rider, Participant, Round } from '../types';
import { MOTOGP_RIDERS, TEAM_SIZE } from '../constants';
import { supabase } from '../lib/supabaseClient';
import { TrophyIcon, TrashIcon, PencilIcon, CheckIcon, PlusIcon } from './Icons';

interface ResultsProps {
    participants: Participant[];
    rounds: Round[];
    isAdmin: boolean;
    onUpdateParticipant: (participant: Participant) => Promise<void>;
    onDeleteParticipant: (participantId: number) => Promise<void>;
    onAddRound: (roundName: string) => Promise<void>;
    showToast: (message: string, type: 'success' | 'error') => void;
}

// AllRiderPoints structure: { roundId: { riderId: points } }
type AllRiderPoints = Record<number, Record<number, number>>;

export const Results: React.FC<ResultsProps> = ({ participants, rounds, isAdmin, onUpdateParticipant, onDeleteParticipant, onAddRound, showToast }) => {
    const [allRiderPoints, setAllRiderPoints] = useState<AllRiderPoints>({});
    const [editingName, setEditingName] = useState<{ id: number; name: string } | null>(null);
    const [newRoundName, setNewRoundName] = useState('');
    
    // ID of the round selected for editing points
    const [selectedRoundForEditing, setSelectedRoundForEditing] = useState<number | null>(rounds.length > 0 ? rounds[rounds.length-1].id : null);
    
    // ID of the round for leaderboard view, or 'general' for total score
    const [leaderboardView, setLeaderboardView] = useState<number | 'general'>('general');

    useEffect(() => {
        // If rounds are loaded, set the default selected round to the latest one
        if (rounds.length > 0 && selectedRoundForEditing === null) {
            setSelectedRoundForEditing(rounds[rounds.length - 1].id);
        }
    }, [rounds, selectedRoundForEditing]);

    useEffect(() => {
        const fetchRiderPoints = async () => {
            const { data, error } = await supabase
                .from('rider_points')
                .select('round_id, rider_id, points');
            
            if (error) {
                console.error('Error fetching rider points:', error);
            } else if (data) {
                const pointsMap = data.reduce((acc, item) => {
                    if (!acc[item.round_id]) {
                        acc[item.round_id] = {};
                    }
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

        const parsedPoints = pointsStr === '' ? 0 : parseInt(pointsStr, 10);
        const finalPoints = isNaN(parsedPoints) ? 0 : parsedPoints;
        
        // Update local state for instant UI feedback
        setAllRiderPoints(prev => ({
            ...prev,
            [selectedRoundForEditing]: {
                ...prev[selectedRoundForEditing],
                [riderId]: finalPoints,
            }
        }));

        const { error } = await supabase
            .from('rider_points')
            .upsert({ round_id: selectedRoundForEditing, rider_id: riderId, points: finalPoints });

        if (error) {
            console.error('Error upserting rider points:', error);
            showToast('Error al guardar los puntos.', 'error');
        }
    };

    const handleClearPoints = async () => {
        if (selectedRoundForEditing === null) {
            showToast('Selecciona una jornada para limpiar sus puntos.', 'error');
            return;
        }
        if (window.confirm(`¿Estás seguro de que quieres limpiar todos los puntos para la jornada seleccionada?`)) {
            setAllRiderPoints(prev => ({ ...prev, [selectedRoundForEditing!]: {} }));
            const { error } = await supabase
                .from('rider_points')
                .delete()
                .eq('round_id', selectedRoundForEditing);
            if (error) {
                console.error('Error clearing points:', error);
                showToast('Error al limpiar los puntos.', 'error');
            } else {
                 showToast('Puntos limpiados para la jornada.', 'success');
            }
        }
    };

    const handleAddNewRound = () => {
        if (newRoundName.trim() === '') {
            showToast('El nombre de la jornada no puede estar vacío.', 'error');
            return;
        }
        onAddRound(newRoundName.trim());
        setNewRoundName('');
    };
    
    const handleDeleteParticipant = (participantId: number) => {
        if (window.confirm("¿Estás seguro de que quieres eliminar a este participante?")) {
            onDeleteParticipant(participantId);
        }
    };

    const handleSaveName = (participantId: number) => {
        if (!editingName || editingName.name.trim() === '') return;
        const participantToUpdate = participants.find(p => p.id === participantId);
        if (participantToUpdate) {
            onUpdateParticipant({ ...participantToUpdate, name: editingName.name.trim() });
        }
        setEditingName(null);
    };

    const calculateScore = useCallback((team_ids: number[]): number => {
        if (leaderboardView === 'general') {
            // Sum points from all rounds
            return Object.values(allRiderPoints).reduce((totalScore, roundPoints) => {
                return totalScore + team_ids.reduce((roundTotal, riderId) => roundTotal + (roundPoints[riderId] || 0), 0);
            }, 0);
        }
        // Sum points for a specific round
        const roundPoints = allRiderPoints[leaderboardView] || {};
        return team_ids.reduce((total, riderId) => total + (roundPoints[riderId] || 0), 0);
    }, [allRiderPoints, leaderboardView]);

    const sortedParticipants = useMemo(() => {
        return [...participants].sort((a, b) => calculateScore(b.team_ids) - calculateScore(a.team_ids));
    }, [participants, calculateScore]);

    const ridersById = useMemo(() => 
        MOTOGP_RIDERS.reduce((acc, rider) => {
            acc[rider.id] = rider;
            return acc;
        }, {} as Record<number, Rider>), 
    []);

    const getMedal = (index: number) => {
        if (index === 0) return '🥇';
        if (index === 1) return '🥈';
        if (index === 2) return '🥉';
        return null;
    };
    
    const getRankStyle = (index: number) => {
        if (index === 0) return 'border-l-4 border-yellow-400';
        if (index === 1) return 'border-l-4 border-gray-400';
        if (index === 2) return 'border-l-4 border-yellow-700';
        return 'border-l-4 border-transparent';
    };

    const currentRiderPoints = allRiderPoints[selectedRoundForEditing!] || {};

    return (
        <div className="flex flex-col lg:flex-row gap-8">
            {/* Control Panel (Admin Only) */}
            {isAdmin && (
                <div className="w-full lg:w-1/3">
                    <div className="bg-gray-800 p-4 rounded-lg shadow-lg sticky top-24 space-y-4">
                        
                        {/* Round Creator */}
                        <div>
                            <h2 className="text-xl font-bold mb-2">Jornadas</h2>
                            <div className="flex gap-2">
                                 <input
                                    type="text"
                                    value={newRoundName}
                                    onChange={(e) => setNewRoundName(e.target.value)}
                                    placeholder="Nombre de la Jornada (ej. GP Qatar)"
                                    className="flex-grow bg-gray-900 text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                />
                                <button onClick={handleAddNewRound} className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-md transition-colors"><PlusIcon className="w-6 h-6"/></button>
                            </div>
                        </div>

                        {/* Points Editor */}
                        <div className="border-t border-gray-700 pt-4">
                            <div className="flex justify-between items-center mb-2">
                                <h2 className="text-xl font-bold">Editar Puntos</h2>
                                <button onClick={handleClearPoints} disabled={!selectedRoundForEditing} className="text-sm text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Limpiar Puntos</button>
                            </div>
                            <select
                                value={selectedRoundForEditing ?? ''}
                                onChange={(e) => setSelectedRoundForEditing(Number(e.target.value))}
                                className="w-full bg-gray-900 text-white p-2 rounded-md mb-2"
                                disabled={rounds.length === 0}
                            >
                                <option value="" disabled>{rounds.length === 0 ? 'Crea una jornada primero' : 'Selecciona jornada...'}</option>
                                {rounds.map(round => <option key={round.id} value={round.id}>{round.name}</option>)}
                            </select>
                            <div className="max-h-[45vh] overflow-y-auto pr-2">
                                <div className="space-y-2">
                                    {MOTOGP_RIDERS.map(rider => (
                                        <div key={rider.id} className="flex items-center justify-between text-sm">
                                            <label htmlFor={`rider-${rider.id}`} className="flex-grow mr-2 truncate">{rider.name}</label>
                                            <input
                                                id={`rider-${rider.id}`}
                                                type="number"
                                                value={currentRiderPoints[rider.id] || ''}
                                                onChange={(e) => handlePointChange(rider.id, e.target.value)}
                                                className="w-20 bg-gray-900 text-white p-1 rounded-md text-right focus:outline-none focus:ring-2 focus:ring-red-500"
                                                placeholder="0"
                                                disabled={!selectedRoundForEditing}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            )}

            {/* Participants and Scores Area */}
            <div className="flex-grow">
                 <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Clasificación de la Liga</h2>
                    <select
                        value={leaderboardView}
                        onChange={e => setLeaderboardView(e.target.value === 'general' ? 'general' : Number(e.target.value))}
                        className="bg-gray-800 text-white p-2 rounded-md"
                    >
                        <option value="general">Clasificación General</option>
                        <optgroup label="Por Jornada">
                            {rounds.map(round => <option key={round.id} value={round.id}>{round.name}</option>)}
                        </optgroup>
                    </select>
                </div>
                <div className="space-y-4">
                    {sortedParticipants.length === 0 && (
                        <div className="text-center py-10 bg-gray-800 rounded-lg">
                            <p className="text-gray-400">Aún no hay participantes en la liga.</p>
                            <p className="text-sm text-gray-500 mt-2">Ve a "Crear Equipo" para añadir el primer participante.</p>
                        </div>
                    )}
                    {sortedParticipants.map((participant, index) => (
                       <div key={participant.id} className={`bg-gray-800 rounded-lg shadow-lg p-4 transition-all duration-300 hover:shadow-red-600/20 ${getRankStyle(index)}`}>
                           <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl w-6 text-center">{getMedal(index) || index + 1}</span>
                                    {editingName?.id === participant.id ? (
                                        <input
                                            type="text"
                                            value={editingName.name}
                                            onChange={(e) => setEditingName({ ...editingName, name: e.target.value })}
                                            onBlur={() => handleSaveName(participant.id)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSaveName(participant.id)}
                                            className="bg-gray-700 text-xl font-bold text-white p-1 rounded-md"
                                            autoFocus
                                        />
                                    ) : (
                                        <h3 className="text-xl font-bold text-white">{participant.name}</h3>
                                    )}
                                </div>
                               <div className="flex items-center gap-2">
                                   <div className="flex items-center gap-2 bg-yellow-400/10 text-yellow-300 font-bold px-3 py-1 rounded-full">
                                      <TrophyIcon className="w-5 h-5"/>
                                      <span>{calculateScore(participant.team_ids)} pts</span>
                                   </div>
                                   {isAdmin && (
                                       <>
                                        {editingName?.id === participant.id ? (
                                                <button onClick={() => handleSaveName(participant.id)} className="p-2 text-gray-400 hover:text-green-500 hover:bg-gray-700 rounded-full transition-colors"><CheckIcon className="w-5 h-5"/></button>
                                        ) : (
                                                <button onClick={() => setEditingName({ id: participant.id, name: participant.name })} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"><PencilIcon className="w-5 h-5"/></button>
                                        )}
                                        <button onClick={() => handleDeleteParticipant(participant.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-700 rounded-full transition-colors"><TrashIcon className="w-5 h-5"/></button>
                                       </>
                                   )}
                               </div>
                           </div>
                           <div className="bg-gray-900/50 p-3 rounded-md">
                               <p className="text-xs text-gray-400 mb-2 uppercase">Equipo ({participant.team_ids.length}/{TEAM_SIZE})</p>
                               {participant.team_ids.length > 0 ? (
                                   <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 text-sm">
                                       {participant.team_ids.map(riderId => (
                                           <li key={riderId} className="bg-gray-700 p-1.5 rounded-md flex justify-between items-center">
                                               <span className="truncate">{ridersById[riderId]?.name ?? 'N/A'}</span>
                                           </li>
                                       ))}
                                   </ul>
                               ) : (
                                   <p className="text-gray-500 text-sm">Aún no se ha seleccionado ningún piloto.</p>
                               )}
                           </div>
                       </div>
                    ))}
                </div>
            </div>
        </div>
    );
};