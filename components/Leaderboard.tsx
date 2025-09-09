import React, { useState, useMemo } from 'react';
import type { Rider, Participant, Race, TeamSnapshot } from '../types';
import { TEAM_SIZE } from '../constants';
import { TrophyIcon, TrashIcon, PencilIcon, CheckIcon } from './Icons';
import { getTeamForRace } from '../lib/utils';

type AllRiderPoints = Record<number, Record<number, number>>;

interface ParticipantWithScore extends Participant {
    score: number;
}
interface LeaderboardProps {
    participants: ParticipantWithScore[];
    races: Race[];
    leaderboardView: number | 'general';
    onLeaderboardViewChange: (view: number | 'general') => void;
    isAdmin: boolean;
    onDeleteParticipant: (participant: Participant) => void;
    onUpdateParticipant: (participant: Participant) => Promise<void>;
    allRiderPoints: AllRiderPoints;
    teamSnapshots: TeamSnapshot[];
    riders: Rider[];
}

export const Leaderboard: React.FC<LeaderboardProps> = ({
    participants,
    races,
    leaderboardView,
    onLeaderboardViewChange,
    isAdmin,
    onDeleteParticipant,
    onUpdateParticipant,
    allRiderPoints,
    teamSnapshots,
    riders,
}) => {
    const [editingName, setEditingName] = useState<{ id: number; name: string } | null>(null);

    const ridersById = useMemo(() => {
        return riders.reduce((acc, rider) => {
            acc[rider.id] = rider;
            return acc;
        }, {} as Record<number, Rider>);
    }, [riders]);


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
    
    const getTitle = () => {
        if (leaderboardView === 'general') {
            return "Clasificación General";
        }
        const race = races.find(r => r.id === leaderboardView);
        return race ? `Clasificación ${race.gp_name}` : "Clasificación de la Liga";
    };

    return (
        <div className="flex-grow">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                <h2 className="text-2xl font-bold">{getTitle()}</h2>
                <select
                    value={leaderboardView}
                    onChange={e => onLeaderboardViewChange(e.target.value === 'general' ? 'general' : Number(e.target.value))}
                    className="bg-gray-800 text-white p-2 rounded-md w-full sm:w-auto"
                >
                    <option value="general">Clasificación General</option>
                    <optgroup label="Por Jornada">
                        {races.map(race => <option key={race.id} value={race.id}>{race.gp_name}</option>)}
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
                    participants.map((participant, index) => {
                        const teamIdsForView = leaderboardView === 'general'
                            ? participant.team_ids // Shows the latest team in general view
                            : getTeamForRace(participant.id, leaderboardView, teamSnapshots);

                        const teamCost = teamIdsForView.reduce((total, riderId) => {
                            return total + (ridersById[riderId]?.price || 0);
                        }, 0);

                        return (
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
                                            <div className="flex items-baseline gap-2 flex-wrap">
                                                <h3 className="text-xl font-bold text-white">{participant.name}</h3>
                                                <span className="text-sm text-gray-400 font-mono">
                                                    (€{teamCost.toLocaleString('es-ES')})
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-2 bg-yellow-400/10 text-yellow-300 font-bold px-3 py-1 rounded-full">
                                            <TrophyIcon className="w-5 h-5"/>
                                            <span>{participant.score} pts</span>
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
                                    {leaderboardView === 'general' ? (
                                        <>
                                            <p className="text-xs text-gray-400 mb-2 uppercase">Puntuación por Jornada</p>
                                            {races.length > 0 ? (
                                                <ul className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-sm">
                                                    {races.map(race => {
                                                        const teamForRace = getTeamForRace(participant.id, race.id, teamSnapshots);
                                                        const racePointsMap = allRiderPoints[race.id] || {};
                                                        const raceScore = teamForRace.reduce((acc, riderId) => {
                                                            const points = racePointsMap[riderId] || 0;
                                                            return acc + points;
                                                        }, 0);
                                                        return (
                                                            <li key={race.id} className="flex justify-between items-baseline">
                                                                <span className="truncate text-gray-300 mr-2">{race.gp_name}:</span>
                                                                <span className="font-semibold text-white whitespace-nowrap">{raceScore} pts</span>
                                                            </li>
                                                        );
                                                    })}
                                                </ul>
                                            ) : (
                                                <p className="text-gray-500 text-sm">Aún no se han creado jornadas.</p>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {(() => {
                                                const race = races.find(r => r.id === leaderboardView);
                                                if (!race) return <p className="text-gray-500 text-sm">Jornada no encontrada.</p>;
                                                const teamForRace = getTeamForRace(participant.id, race.id, teamSnapshots);
                                                const roundPointsMap = allRiderPoints[leaderboardView] || {};
                                                
                                                const sortedTeam = [...teamForRace].sort((a, b) => {
                                                    const pointsA = roundPointsMap[a] || 0;
                                                    const pointsB = roundPointsMap[b] || 0;
                                                    return pointsB - pointsA;
                                                });

                                                return (
                                                    <>
                                                        <p className="text-xs text-gray-400 mb-2 uppercase">Equipo para {race.gp_name} ({teamForRace.length}/{TEAM_SIZE})</p>
                                                        {sortedTeam.length > 0 ? (
                                                            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 text-sm">
                                                                {sortedTeam.map(riderId => {
                                                                    const riderPoints = roundPointsMap[riderId] || 0;
                                                                    const rider = ridersById[riderId];
                                                                    return (
                                                                        <li key={riderId} className="bg-gray-700 p-1.5 rounded-md text-center flex flex-col justify-between">
                                                                            <p className="truncate font-semibold text-xs leading-tight">{rider?.name ?? 'N/A'}</p>
                                                                            <p className="text-yellow-300 font-bold mt-1">{riderPoints} pts</p>
                                                                        </li>
                                                                    );
                                                                })}
                                                            </ul>
                                                        ) : (
                                                            <p className="text-gray-500 text-sm">No se encontró un equipo guardado para esta jornada.</p>
                                                        )}
                                                    </>
                                                );
                                            })()}
                                        </>
                                    )}
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
        </div>
    );
};