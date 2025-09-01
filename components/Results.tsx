import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { Rider, Participant } from '../types';
import { MOTOGP_RIDERS, TEAM_SIZE } from '../constants';
import { supabase } from '../lib/supabaseClient';
import { EditTeamModal } from './EditTeamModal';
import { TrophyIcon, EditIcon, TrashIcon, PlusIcon, PencilIcon, CheckIcon } from './Icons';

interface ResultsProps {
    participants: Participant[];
    onUpdateParticipant: (participant: Participant) => Promise<void>;
    onDeleteParticipant: (participantId: number) => Promise<void>;
}

export const Results: React.FC<ResultsProps> = ({ participants, onUpdateParticipant, onDeleteParticipant }) => {
    const [riderPoints, setRiderPoints] = useState<Record<number, number>>({});
    const [newParticipantName, setNewParticipantName] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);
    const [editingName, setEditingName] = useState<{ id: number; name: string } | null>(null);

    useEffect(() => {
        const fetchRiderPoints = async () => {
            const { data, error } = await supabase
                .from('rider_points')
                .select('rider_id, points');
            
            if (error) {
                console.error('Error fetching rider points:', error);
            } else if (data) {
                const pointsMap = data.reduce((acc, item) => {
                    acc[item.rider_id] = item.points;
                    return acc;
                }, {} as Record<number, number>);
                setRiderPoints(pointsMap);
            }
        };
        fetchRiderPoints();
    }, []);

    const handlePointChange = async (riderId: number, points: string) => {
        const parsedPoints = points === '' ? 0 : parseInt(points, 10);
        const finalPoints = isNaN(parsedPoints) ? 0 : parsedPoints;
        
        setRiderPoints(prev => ({ ...prev, [riderId]: finalPoints }));

        const { error } = await supabase
            .from('rider_points')
            .upsert({ rider_id: riderId, points: finalPoints });

        if (error) {
            console.error('Error upserting rider points:', error);
            // Optionally, show a toast message on error
        }
    };

    const handleClearPoints = async () => {
        setRiderPoints({});
        const riderIds = MOTOGP_RIDERS.map(r => r.id);
        const { error } = await supabase
            .from('rider_points')
            .delete()
            .in('rider_id', riderIds);
        if (error) {
            console.error('Error clearing points:', error);
        }
    };

    const handleAddParticipant = (e: React.FormEvent) => {
        e.preventDefault();
        // This is now handled by App.tsx through the "Add to League" button.
        // This form could be re-purposed or removed if adding is only done from the builder.
        // For now, let's keep it but it's disconnected from team creation.
        if (newParticipantName.trim()) {
            const newParticipant: Omit<Participant, 'id'> = {
                name: newParticipantName.trim(),
                team_ids: [],
            };
            // The logic to add this would need to be in App.tsx
            console.warn("Adding participants from this form is not fully implemented with Supabase yet.");
            setNewParticipantName('');
        }
    };
    
    const handleDeleteParticipant = (participantId: number) => {
        onDeleteParticipant(participantId);
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
        return team_ids.reduce((total, riderId) => total + (riderPoints[riderId] || 0), 0);
    }, [riderPoints]);

    const sortedParticipants = useMemo(() => {
        return [...participants].sort((a, b) => calculateScore(b.team_ids) - calculateScore(a.team_ids));
    }, [participants, calculateScore]);

    const handleOpenModal = (participant: Participant) => {
        setEditingParticipant(participant);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingParticipant(null);
    };

    const handleSaveTeam = (participantId: number, teamIds: number[]) => {
        const participantToUpdate = participants.find(p => p.id === participantId);
        if (participantToUpdate) {
            onUpdateParticipant({ ...participantToUpdate, team_ids: teamIds });
        }
        handleCloseModal();
    };

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


    return (
        <div className="flex flex-col lg:flex-row gap-8">
            {isModalOpen && editingParticipant && (
                <EditTeamModal 
                    participant={editingParticipant}
                    riders={MOTOGP_RIDERS}
                    onSave={handleSaveTeam}
                    onClose={handleCloseModal}
                />
            )}

            {/* Rider Points Input Area */}
            <div className="w-full lg:w-1/3">
                <div className="bg-gray-800 p-4 rounded-lg shadow-lg sticky top-24">
                    <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-2">
                        <h2 className="text-xl font-bold">Paso 1: Puntos</h2>
                        <button onClick={handleClearPoints} className="text-sm text-gray-400 hover:text-red-500 transition-colors">Limpiar Puntos</button>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto pr-2">
                        <div className="space-y-2">
                            {MOTOGP_RIDERS.map(rider => (
                                <div key={rider.id} className="flex items-center justify-between text-sm">
                                    <label htmlFor={`rider-${rider.id}`} className="flex-grow mr-2 truncate">{rider.name}</label>
                                    <input
                                        id={`rider-${rider.id}`}
                                        type="number"
                                        value={riderPoints[rider.id] || ''}
                                        onChange={(e) => handlePointChange(rider.id, e.target.value)}
                                        className="w-20 bg-gray-900 text-white p-1 rounded-md text-right focus:outline-none focus:ring-2 focus:ring-red-500"
                                        placeholder="0"
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Participants and Scores Area */}
            <div className="flex-grow">
                <h2 className="text-2xl font-bold mb-4">Paso 2: Participantes de la Liga</h2>
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
                                   {editingName?.id === participant.id ? (
                                        <button onClick={() => handleSaveName(participant.id)} className="p-2 text-gray-400 hover:text-green-500 hover:bg-gray-700 rounded-full transition-colors"><CheckIcon className="w-5 h-5"/></button>
                                   ) : (
                                        <button onClick={() => setEditingName({ id: participant.id, name: participant.name })} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"><PencilIcon className="w-5 h-5"/></button>
                                   )}
                                   <button onClick={() => handleOpenModal(participant)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"><EditIcon className="w-5 h-5"/></button>
                                   <button onClick={() => handleDeleteParticipant(participant.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-700 rounded-full transition-colors"><TrashIcon className="w-5 h-5"/></button>
                               </div>
                           </div>
                           <div className="bg-gray-900/50 p-3 rounded-md">
                               <p className="text-xs text-gray-400 mb-2 uppercase">Equipo ({participant.team_ids.length}/{TEAM_SIZE})</p>
                               {participant.team_ids.length > 0 ? (
                                   <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 text-sm">
                                       {participant.team_ids.map(riderId => (
                                           <li key={riderId} className="bg-gray-700 p-1.5 rounded-md flex justify-between items-center">
                                               <span className="truncate">{ridersById[riderId]?.name ?? 'N/A'}</span>
                                               <span className="font-mono text-xs ml-2 text-yellow-400">{riderPoints[riderId] || 0}</span>
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