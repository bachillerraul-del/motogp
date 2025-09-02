import React, { useState } from 'react';
import type { Rider, Participant, Round } from '../types';
import { MOTOGP_RIDERS, TEAM_SIZE } from '../constants';
import { TrophyIcon, TrashIcon, PencilIcon, CheckIcon } from './Icons';

interface LeaderboardProps {
    participants: Participant[];
    rounds: Round[];
    leaderboardView: number | 'general';
    onLeaderboardViewChange: (view: number | 'general') => void;
    calculateScore: (team_ids: number[]) => number;
    isAdmin: boolean;
    onDeleteParticipant: (participant: Participant) => void;
    onUpdateParticipant: (participant: Participant) => Promise<void>;
}

const ridersById = MOTOGP_RIDERS.reduce((acc, rider) => {
    acc[rider.id] = rider;
    return acc;
}, {} as Record<number, Rider>);

export const Leaderboard: React.FC<LeaderboardProps> = ({
    participants,
    rounds,
    leaderboardView,
    onLeaderboardViewChange,
    calculateScore,
    isAdmin,
    onDeleteParticipant,
    onUpdateParticipant,
}) => {
    const [editingName, setEditingName] = useState<{ id: number; name: string } | null>(null);

    const handleSaveName = (participantId: number) => {
        if (!editingName || editingName.name.trim() === '') return;
        const participantToUpdate = participants.find(p => p.id === participantId);
        if (participantToUpdate) {
            onUpdateParticipant({ ...participantToUpdate, name: editingName.name.trim() });
        }
        setEditingName(null);
    };

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
        <div className="flex-grow">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Clasificación de la Liga</h2>
                <select
                    value={leaderboardView}
                    onChange={e => onLeaderboardViewChange(e.target.value === 'general' ? 'general' : Number(e.target.value))}
                    className="bg-gray-800 text-white p-2 rounded-md"
                >
                    <option value="general">Clasificación General</option>
                    <optgroup label="Por Jornada">
                        {rounds.map(round => <option key={round.id} value={round.id}>{round.name}</option>)}
                    </optgroup>
                </select>
            </div>
            <div className="space-y-4">
                {participants.length === 0 ? (
                    <div className="text-center py-10 bg-gray-800 rounded-lg">
                        <p className="text-gray-400">Aún no hay participantes en la liga.</p>
                        <p className="text-sm text-gray-500 mt-2">Ve a "Crear Equipo" para añadir el primer participante.</p>
                    </div>
                ) : (
                    participants.map((participant, index) => (
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
                                            <button onClick={() => onDeleteParticipant(participant)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-gray-700 rounded-full transition-colors"><TrashIcon className="w-5 h-5"/></button>
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
                    ))
                )}
            </div>
        </div>
    );
};
