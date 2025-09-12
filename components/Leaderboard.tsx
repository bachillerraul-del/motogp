import React, { useState, useMemo, useRef, useCallback } from 'react';
import type { Rider, Participant, Race, TeamSnapshot, Sport, Constructor } from '../types';
import { TrophyIcon, TrashIcon, PencilIcon, CheckIcon, ShareIcon, ArrowDownTrayIcon, MotoIcon, F1Icon } from './Icons';
import { getTeamForRace, getLatestTeam } from '../lib/utils';
import { toPng } from 'html-to-image';
import { Modal } from './Modal';
import { CONSTRUCTOR_LIMIT, F1_RIDER_LIMIT, MOTOGP_RIDER_LIMIT } from '../constants';

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
    constructors: Constructor[];
    sport: Sport;
    currencyPrefix: string;
    currencySuffix: string;
    onSelectRider: (rider: Rider) => void;
}

interface ShareTeamCardProps {
    participant: Participant;
    teamRiders: Rider[];
    teamConstructor: Constructor | null;
    teamCost: number;
    remainingBudget: number;
    sport: Sport;
    formatPrice: (price: number) => string;
}

const ShareTeamCard: React.FC<ShareTeamCardProps> = ({ participant, teamRiders, teamConstructor, teamCost, remainingBudget, sport, formatPrice }) => {
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
                {teamConstructor && (
                     <div className="bg-gray-700/50 p-2 rounded-md flex justify-between items-center border-l-4 border-yellow-400">
                        <div>
                            <p className="font-semibold">{teamConstructor.name}</p>
                            <p className="text-xs text-gray-400">Escudería</p>
                        </div>
                        <p className="font-mono font-semibold text-lg">{formatPrice(teamConstructor.price)}</p>
                    </div>
                )}
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
        riders, constructors, sport, currencyPrefix, currencySuffix, onSelectRider
    } = props;
    
    const [editingName, setEditingName] = useState<{ id: number; name: string } | null>(null);
    const [sharingTeam, setSharingTeam] = useState<{ participant: Participant, riderIds: number[], constructorId: number | null } | null>(null);
    const cardRef = useRef<HTMLDivElement>(null);

    const ridersById = useMemo(() => new Map(riders.map(r => [r.id, r])), [riders]);
    const constructorsById = useMemo(() => new Map(constructors.map(c => [c.id, c])), [constructors]);

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
            .catch((err) => console.error('oops, something went wrong!', err));
    }, [sharingTeam]);

    const getMedal = (index: number) => index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;
    const getRankStyle = (index: number) => index === 0 ? 'border-l-4 border-yellow-400' : index === 1 ? 'border-l-4 border-gray-400' : index === 2 ? 'border-l-4 border-yellow-700' : 'border-l-4 border-transparent';
    const getTitle = () => leaderboardView === 'general' ? "Clasificación General" : `Clasificación ${races.find(r => r.id === leaderboardView)?.gp_name || ''}`;
    
    const sortedRaces = [...races].sort((a,b) => a.round - b.round);
    const RIDER_LIMIT = sport === 'f1' ? F1_RIDER_LIMIT : MOTOGP_RIDER_LIMIT;

    const sharingTeamData = useMemo(() => {
        if (!sharingTeam) return null;
        
        const teamRiders = sharingTeam.riderIds.map(id => ridersById.get(id)).filter((r): r is Rider => !!r);
        const teamConstructor = sharingTeam.constructorId ? constructorsById.get(sharingTeam.constructorId) : null;
        
        const riderCost = teamRiders.reduce((total, rider) => total + (rider?.price || 0), 0);
        const constructorCost = teamConstructor?.price || 0;
        const teamCost = riderCost + constructorCost;

        const BUDGET = sport === 'f1' ? 1000 : 1000;
        const remainingBudget = BUDGET - teamCost;
        
        return { teamRiders, teamConstructor, teamCost, remainingBudget };
    }, [sharingTeam, ridersById, constructorsById, sport]);


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
                    </div>
                ) : (
                    participants.map((participant, index) => {
                        const { riderIds, constructorId } = leaderboardView === 'general'
                            ? getLatestTeam(participant.id, races, teamSnapshots)
                            : getTeamForRace(participant.id, leaderboardView, teamSnapshots);

                        const riderCost = riderIds.reduce((t, rId) => t + (ridersById.get(rId)?.price || 0), 0);
                        const constructorCost = (constructorId ? constructorsById.get(constructorId)?.price : 0) || 0;
                        const teamCost = riderCost + constructorCost;
                        
                        return (
                            <div key={participant.id} className={`bg-gray-800 rounded-lg shadow-lg p-4 transition-all duration-300 ${sport === 'f1' ? 'hover:shadow-red-600/20' : 'hover:shadow-orange-500/20'} ${getRankStyle(index)}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl w-6 text-center">{getMedal(index) || index + 1}</span>
                                        {editingName?.id === participant.id ? (
                                            <input type="text" value={editingName.name} onChange={(e) => setEditingName({ ...editingName, name: e.target.value })} onBlur={() => handleSaveName(participant.id)} onKeyDown={(e) => e.key === 'Enter' && handleSaveName(participant.id)} className="bg-gray-700 text-xl font-bold text-white p-1 rounded-md" autoFocus/>
                                        ) : (
                                            <div className="flex items-baseline gap-2 flex-wrap">
                                                <h3 className="text-xl font-bold text-white">{participant.name}</h3>
                                                <span className="text-sm text-gray-400 font-mono">({formatPrice(teamCost)})</span>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-2 bg-yellow-400/10 text-yellow-300 font-bold px-3 py-1 rounded-full">
                                            <TrophyIcon className="w-5 h-5"/>
                                            <span>{participant.score} pts</span>
                                        </div>
                                         <button onClick={() => setSharingTeam({ participant, riderIds, constructorId })} className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded-full transition-colors"><ShareIcon className="w-5 h-5"/></button>
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
                                                        const { riderIds, constructorId } = getTeamForRace(participant.id, race.id, teamSnapshots);
                                                        const racePointsMap = allRiderPoints[race.id] || {};
                                                        const riderScore = riderIds.reduce((acc, rId) => acc + (racePointsMap[rId] || 0), 0);
                                                        let constructorScore = 0;
                                                        if (constructorId) {
                                                            const cPoints = riders.filter(r => r.constructor_id === constructorId).map(r => racePointsMap[r.id] || 0).sort((a,b)=>b-a);
                                                            constructorScore = (cPoints[0] || 0 + (cPoints[1] || 0)) / 2;
                                                        }
                                                        return (
                                                            <li key={race.id} className="flex justify-between items-baseline">
                                                                <span className="truncate text-gray-300 mr-2">{race.gp_name}:</span>
                                                                <span className="font-semibold text-white whitespace-nowrap">{Math.round(riderScore + constructorScore)} pts</span>
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
                                                
                                                const { riderIds, constructorId } = getTeamForRace(participant.id, race.id, teamSnapshots);
                                                const constructor = constructorId ? constructorsById.get(constructorId) : null;
                                                const roundPointsMap = allRiderPoints[leaderboardView] || {};
                                                
                                                const sortedTeam = [...riderIds].sort((a, b) => (roundPointsMap[b] || 0) - (roundPointsMap[a] || 0));

                                                return (
                                                    <>
                                                        <p className="text-xs text-gray-400 mb-2 uppercase">Equipo para {race.gp_name} ({riderIds.length}/{RIDER_LIMIT}, {constructor ? '1/1' : '0/1'})</p>
                                                        {sortedTeam.length > 0 || constructor ? (
                                                            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 text-sm">
                                                                {sortedTeam.map(riderId => {
                                                                    const rider = ridersById.get(riderId);
                                                                    return (
                                                                        <li key={riderId} className="bg-gray-700 p-1.5 rounded-md flex flex-col justify-between">
                                                                            <button onClick={() => rider && onSelectRider(rider)} className="w-full h-full text-center group">
                                                                                <p className="truncate font-semibold text-xs leading-tight group-hover:underline">{rider?.name ?? 'N/A'}</p>
                                                                                <p className="text-yellow-300 font-bold mt-1">{roundPointsMap[riderId] || 0} pts</p>
                                                                            </button>
                                                                        </li>
                                                                    );
                                                                })}
                                                                {constructor && (
                                                                    <li className="bg-gray-600 p-1.5 rounded-md flex flex-col justify-between">
                                                                        <div className="w-full h-full text-center">
                                                                            <p className="truncate font-semibold text-xs leading-tight">{constructor.name}</p>
                                                                            <p className="text-yellow-300 font-bold mt-1">{/* Constructor score could be shown here */}</p>
                                                                        </div>
                                                                    </li>
                                                                )}
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
                                teamConstructor={sharingTeamData.teamConstructor}
                                teamCost={sharingTeamData.teamCost}
                                remainingBudget={sharingTeamData.remainingBudget}
                                sport={sport}
                                formatPrice={formatPrice}
                            />
                        </div>
                        <button onClick={handleDownloadImage} className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors duration-300 flex items-center justify-center gap-3">
                            <ArrowDownTrayIcon className="w-6 h-6"/> Descargar Imagen
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};