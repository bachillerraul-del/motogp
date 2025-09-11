import React, { useState, useMemo, useRef, useCallback } from 'react';
import type { Rider, Participant, Race, TeamSnapshot, Sport } from '../types';
import { TrophyIcon, TrashIcon, PencilIcon, CheckIcon, ShareIcon, ArrowDownTrayIcon, MotoIcon, F1Icon } from './Icons';
import { getTeamForRace, getLatestTeam } from '../lib/utils';
import { toPng } from 'html-to-image';
import { Modal } from './Modal';

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
    sport: Sport;
    BUDGET: number;
    TEAM_SIZE: number;
    currencyPrefix: string;
    currencySuffix: string;
}

interface ShareTeamCardProps {
    participant: Participant;
    teamRiders: Rider[];
    teamCost: number;
    remainingBudget: number;
    sport: Sport;
    currencyPrefix: string;
    currencySuffix: string;
    formatPrice: (price: number) => string;
}

const ShareTeamCard: React.FC<ShareTeamCardProps> = ({ participant, teamRiders, teamCost, remainingBudget, sport, formatPrice }) => {
    const SportIcon = sport === 'f1' ? F1Icon : MotoIcon;
    const sportName = sport === 'f1' ? "Formula 1" : "MotoGP";

    return (
        <div className="bg-gray-900 p-6 rounded-lg border border-gray-700 text-white font-sans">
            <div className={`flex justify-between items-center border-b-2 pb-3 mb-4 ${sport === 'f1' ? 'border-red-600' : 'border-orange-500'}`}>
                <div>
                    <p className="text-2xl font-bold">{participant.name}</p>
                    <p className="text-sm text-gray-400">Fantasy Team</p>
                </div>
                <div className="text-right">
                     <SportIcon className="text-4xl mb-1"/>
                     <p className={`font-bold ${sport === 'f1' ? 'text-red-500' : 'text-orange-500'}`}>{sportName}</p>
                </div>
            </div>
            
            <div className="space-y-3 mb-4">
                {teamRiders.map(rider => (
                    <div key={rider.id} className="bg-gray-800/70 p-2 rounded-md flex justify-between items-center">
                        <div>
                            <p className="font-semibold">{rider.name}</p>
                            <p className="text-xs text-gray-400">{rider.team}</p>
                        </div>
                        <p className="font-mono font-semibold text-lg">{formatPrice(rider.price)}</p>
                    </div>
                ))}
            </div>

            <div className="bg-gray-800/70 p-3 rounded-md text-sm">
                <div className="flex justify-between items-center">
                    <span className="text-gray-400">Coste del Equipo:</span>
                    <span className="font-bold text-white">{formatPrice(teamCost)}</span>
                </div>
                <div className="flex justify-between items-center mt-1">
                    <span className="text-gray-400">Presupuesto Restante:</span>
                    <span className={`font-bold ${remainingBudget < 0 ? 'text-red-500' : 'text-green-400'}`}>{formatPrice(remainingBudget)}</span>
                </div>
            </div>
        </div>
    );
};


export const Leaderboard: React.FC<LeaderboardProps> = (props) => {
    const {
        participants, races, leaderboardView, onLeaderboardViewChange, isAdmin,
        onDeleteParticipant, onUpdateParticipant, allRiderPoints, teamSnapshots,
        riders, sport, BUDGET, TEAM_SIZE, currencyPrefix, currencySuffix
    } = props;
    
    const [editingName, setEditingName] = useState<{ id: number; name: string } | null>(null);
    const [sharingTeam, setSharingTeam] = useState<{ participant: Participant, teamIds: number[] } | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    const ridersById = useMemo(() => {
        return riders.reduce((acc, rider) => {
            acc[rider.id] = rider;
            return acc;
        }, {} as Record<number, Rider>);
    }, [riders]);

    const formatPrice = useCallback((price: number): string => {
        const value = currencySuffix === 'M' ? (price / 10).toFixed(1) : price.toLocaleString('es-ES');
        return `${currencyPrefix}${value}${currencySuffix}`;
    }, [currencyPrefix, currencySuffix]);

    const handleSaveName = (participantId: number) => {
        if (!editingName || editingName.name.trim() === '') return;
        const participantToUpdate = participants.find(p => p.id === participantId);
        if (participantToUpdate) {
            onUpdateParticipant({ ...participantToUpdate, name: editingName.name.trim() });
        }
        setEditingName(null);
    };

    const handleDownloadImage = useCallback(() => {
        if (cardRef.current === null || !sharingTeam) return;

        toPng(cardRef.current, { cacheBust: true, backgroundColor: '#111827' })
            .then((dataUrl) => {
                const link = document.createElement('a');
                link.download = `${sharingTeam.participant.name}-fantasy-team.png`;
                link.href = dataUrl;
                link.click();
            })
            .catch((err) => {
                console.error('oops, something went wrong!', err);
            });
    }, [sharingTeam]);

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
    
    const sortedRaces = [...races].sort((a,b) => a.round - b.round);

    const sharingTeamData = useMemo(() => {
        if (!sharingTeam) return null;
        
        const teamRiders = sharingTeam.teamIds.map(id => ridersById[id]).filter(Boolean);
        const teamCost = teamRiders.reduce((total, rider) => total + (rider?.price || 0), 0);
        const remainingBudget = BUDGET - teamCost;
        
        return {
            teamRiders,
            teamCost,
            remainingBudget
        };
    }, [sharingTeam, ridersById, BUDGET]);


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
                        {sortedRaces.map(race => <option key={race.id} value={race.id}>{race.gp_name}</option>)}
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
                            ? getLatestTeam(participant.id, races, teamSnapshots)
                            : getTeamForRace(participant.id, leaderboardView, teamSnapshots);

                        const teamCost = teamIdsForView.reduce((total, riderId) => {
                            return total + (ridersById[riderId]?.price || 0);
                        }, 0);
                        
                        const hoverShadow = sport === 'f1' ? 'hover:shadow-red-600/20' : 'hover:shadow-orange-500/20';

                        return (
                            <div key={participant.id} className={`bg-gray-800 rounded-lg shadow-lg p-4 transition-all duration-300 ${hoverShadow} ${getRankStyle(index)}`}>
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
                                                    ({formatPrice(teamCost)})
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-2 bg-yellow-400/10 text-yellow-300 font-bold px-3 py-1 rounded-full">
                                            <TrophyIcon className="w-5 h-5"/>
                                            <span>{participant.score} pts</span>
                                        </div>
                                         <button onClick={() => setSharingTeam({ participant, teamIds: teamIdsForView })} className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded-full transition-colors"><ShareIcon className="w-5 h-5"/></button>
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
                                                    {sortedRaces.map(race => {
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
            
            {sharingTeam && sharingTeamData && (
                 <Modal isOpen={!!sharingTeam} onClose={() => setSharingTeam(null)} title={`Equipo de ${sharingTeam.participant.name}`} sport={sport}>
                    <div>
                         <div ref={cardRef}>
                            <ShareTeamCard 
                                participant={sharingTeam.participant}
                                teamRiders={sharingTeamData.teamRiders}
                                teamCost={sharingTeamData.teamCost}
                                remainingBudget={sharingTeamData.remainingBudget}
                                sport={sport}
                                currencyPrefix={currencyPrefix}
                                currencySuffix={currencySuffix}
                                formatPrice={formatPrice}
                            />
                        </div>
                        <button
                            onClick={handleDownloadImage}
                            className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors duration-300 flex items-center justify-center gap-3"
                        >
                            <ArrowDownTrayIcon className="w-6 h-6"/>
                            Descargar Imagen
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};