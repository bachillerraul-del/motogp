import React, { useState, useMemo, useCallback } from 'react';
import type { Rider, Participant } from '../types';
import { MOTOGP_RIDERS, TEAM_SIZE } from '../constants';
import { EditTeamModal } from './EditTeamModal';
import { TrophyIcon, EditIcon, TrashIcon, PlusIcon } from './Icons';

export const Results: React.FC = () => {
    const [riderPoints, setRiderPoints] = useState<Record<number, number>>({});
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [newParticipantName, setNewParticipantName] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingParticipant, setEditingParticipant] = useState<Participant | null>(null);

    const handlePointChange = (riderId: number, points: string) => {
        const parsedPoints = points === '' ? 0 : parseInt(points, 10);
        setRiderPoints(prev => ({ ...prev, [riderId]: isNaN(parsedPoints) ? 0 : parsedPoints }));
    };

    const handleAddParticipant = (e: React.FormEvent) => {
        e.preventDefault();
        if (newParticipantName.trim()) {
            const newParticipant: Participant = {
                id: Date.now(),
                name: newParticipantName.trim(),
                teamIds: [],
            };
            setParticipants(prev => [...prev, newParticipant]);
            setNewParticipantName('');
        }
    };
    
    const handleDeleteParticipant = (participantId: number) => {
        setParticipants(prev => prev.filter(p => p.id !== participantId));
    };

    const calculateScore = useCallback((teamIds: number[]): number => {
        return teamIds.reduce((total, riderId) => total + (riderPoints[riderId] || 0), 0);
    }, [riderPoints]);

    const sortedParticipants = useMemo(() => {
        return [...participants].sort((a, b) => calculateScore(b.teamIds) - calculateScore(a.teamIds));
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
        setParticipants(prev => prev.map(p => p.id === participantId ? { ...p, teamIds } : p));
        handleCloseModal();
    };

    const ridersById = useMemo(() => 
        MOTOGP_RIDERS.reduce((acc, rider) => {
            acc[rider.id] = rider;
            return acc;
        }, {} as Record<number, Rider>), 
    []);


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
                    <h2 className="text-xl font-bold mb-4 border-b border-gray-700 pb-2">Paso 1: Puntos del GP</h2>
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
                <h2 className="text-2xl font-bold mb-4">Paso 2: Participantes y Resultados</h2>
                <form onSubmit={handleAddParticipant} className="flex gap-2 mb-6">
                    <input
                        type="text"
                        value={newParticipantName}
                        onChange={(e) => setNewParticipantName(e.target.value)}
                        placeholder="Nombre del participante"
                        className="flex-grow bg-gray-800 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                    <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-5 rounded-lg transition-colors duration-300 flex items-center">
                        <PlusIcon className="w-5 h-5 mr-2"/> Añadir
                    </button>
                </form>

                <div className="space-y-4">
                    {sortedParticipants.length === 0 && (
                        <p className="text-gray-500 text-center py-8">Añade participantes para ver los resultados.</p>
                    )}
                    {sortedParticipants.map(participant => (
                       <div key={participant.id} className="bg-gray-800 rounded-lg shadow-lg p-4 transition-all duration-300 hover:shadow-red-600/20">
                           <div className="flex items-center justify-between mb-3">
                               <h3 className="text-xl font-bold text-white">{participant.name}</h3>
                               <div className="flex items-center gap-2">
                                   <div className="flex items-center gap-2 bg-yellow-400/10 text-yellow-300 font-bold px-3 py-1 rounded-full">
                                      <TrophyIcon className="w-5 h-5"/>
                                      <span>{calculateScore(participant.teamIds)} pts</span>
                                   </div>
                                   <button onClick={() => handleOpenModal(participant)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full transition-colors"><EditIcon className="w-5 h-5"/></button>
                                   <button onClick={() => handleDeleteParticipant(participant.id)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-700 rounded-full transition-colors"><TrashIcon className="w-5 h-5"/></button>
                               </div>
                           </div>
                           <div className="bg-gray-900/50 p-3 rounded-md">
                               <p className="text-xs text-gray-400 mb-2 uppercase">Equipo ({participant.teamIds.length}/{TEAM_SIZE})</p>
                               {participant.teamIds.length > 0 ? (
                                   <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 text-sm">
                                       {participant.teamIds.map(riderId => (
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