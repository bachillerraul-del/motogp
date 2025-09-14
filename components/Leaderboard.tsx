import React, { useState, useMemo, useRef, useCallback } from 'react';
import type { Rider, Participant, Race, TeamSnapshot, Sport, Constructor } from '../types';
import { TrophyIcon, TrashIcon, PencilIcon, CheckIcon, ShareIcon, ArrowDownTrayIcon, MotoIcon, F1Icon, SparklesIcon, ChevronDownIcon, ArrowUpIcon, ArrowDownIcon, MinusIcon } from './Icons';
import { getTeamForRace, getLatestTeam } from '../lib/utils';
import { toPng } from 'html-to-image';
import { Modal } from './Modal';
import { calculateScoreBreakdown } from '../lib/scoreUtils';
import { useFantasy } from '../contexts/FantasyDataContext';
import { RankChart } from './RankChart';

interface ParticipantWithScore extends Participant {
    score: number;
    rankChange?: number;
}
interface LeaderboardProps {
    participants: ParticipantWithScore[];
    races: Race[];
    leaderboardView: number | 'general';
    isAdmin: boolean;
    onDeleteParticipant: (participant: Participant) => void;
    onUpdateParticipant: (participant: Participant) => Promise<void>;
    teamSnapshots: TeamSnapshot[];
    riders: Rider[];
    constructors: Constructor[];
    sport: Sport;
    currencyPrefix: string;
    currencySuffix: string;
    onSelectRider: (rider: Rider) => void;
    participantRanks: Map<number, Map<number, number>>;
}

interface SharePerformanceCardProps {
    participant: Participant;
    teamRiders: Rider[];
    teamConstructor: Constructor | null;
    sport: Sport;
    formatPrice: (price: number) => string;
    raceName: string;
    score: number;
    rank: number;
}

const SharePerformanceCard: React.FC<SharePerformanceCardProps> = ({ participant, teamRiders, teamConstructor, sport, formatPrice, raceName, score, rank }) => {
    const SportIcon = sport === 'f1' ? F1Icon : MotoIcon;
    const sportName = sport === 'f1' ? "Formula 1" : "MotoGP";

    return (
        <div className="bg-gray-900 p-6 rounded-lg border border-gray-700 text-white font-sans w-[400px]">
            <div className={`flex justify-between items-start border-b-2 pb-3 mb-4 ${sport === 'f1' ? 'border-red-600' : 'border-orange-500'}`}>
                <div>
                    <p className="text-sm text-gray-400">{raceName}</p>
                    <p className="text-2xl font-bold">{participant.name}</p>
                </div>
                <div className="text-right">
                    <p className="text-3xl font-bold">{score} <span className="text-base font-normal text-gray-400">pts</span></p>
                    <p className="text-xl font-bold">Posición: {rank}</p>
                </div>
            </div>
            
            <h3 className="text-lg font-bold mb-2 flex items-center gap-2"><SportIcon className="text-2xl"/> Equipo</h3>
            <div className="space-y-2 mb-4">
                {teamRiders.map(rider => (
                    <div key={rider.id} className="bg-gray-800/70 p-2 rounded-md flex justify-between items-center text-sm">
                        <div>
                            <p className="font-semibold">{rider.name}</p>
                            <p className="text-xs text-gray-400">{rider.team}</p>
                        </div>
                        <p className="font-mono font-semibold">{formatPrice(rider.price)}</p>
                    </div>
                ))}
                {teamConstructor && (
                     <div className="bg-gray-700/50 p-2 rounded-md flex justify-between items-center border-l-4 border-yellow-400 text-sm">
                        <div>
                            <p className="font-semibold">{teamConstructor.name}</p>
                            <p className="text-xs text-gray-400">Escudería</p>
                        </div>
                        <p className="font-mono font-semibold">{formatPrice(teamConstructor.price)}</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const ExpandedViewContent: React.FC<{
    participantId: number;
    raceId: number;
    onSelectRider: (rider: Rider) => void;
    participantRanks: Map<number, Map<number, number>>;
    races: Race[];
}> = ({ participantId, raceId, onSelectRider, participantRanks, races }) => {
    const { teamSnapshots, allRiderPoints, riders, constructors } = useFantasy();
    
    const breakdown = useMemo(() => calculateScoreBreakdown(
        participantId, raceId, teamSnapshots, allRiderPoints, riders, constructors
    ), [participantId, raceId, teamSnapshots, allRiderPoints, riders, constructors]);

    const sortedRiderScores = useMemo(() => [...breakdown.riderScores].sort((a, b) => b.points - a.points), [breakdown.riderScores]);

    const rankHistory = useMemo(() => {
        const sortedRaces = [...races].sort((a,b) => a.round - b.round);
        const history: { raceRound: number, rank: number }[] = [];
        sortedRaces.forEach(race => {
            const rankMap = participantRanks.get(race.id);
            const rank = rankMap?.get(participantId);
            if (rank) {
                history.push({ raceRound: race.round, rank });
            }
        });
        return history.slice(-5); // Last 5 races
    }, [participantId, participantRanks, races]);

    const { constructorData, points: constructorPoints, calculation } = breakdown.constructorScore;
    
    return (
        <div className="bg-gray-900/50 p-3 rounded-b-lg text-sm animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <h4 className="font-bold text-gray-300 mb-2">Desglose de Puntos</h4>
                    <div className="space-y-1.5">
                        {sortedRiderScores.map(({ rider, points, mainRacePoints, sprintRacePoints }) => (
                            <div key={rider.id} className="flex justify-between items-center bg-gray-700/60 p-1.5 rounded-md">
                                <button onClick={() => onSelectRider(rider)} className="text-left group min-w-0">
                                   <p className="font-semibold text-white group-hover:underline truncate text-xs">{rider.name}</p>
                                   <p className="text-gray-400 text-xs truncate" title={`Carrera: ${mainRacePoints} / Sprint: ${sprintRacePoints}`}>
                                        C: {mainRacePoints} / S: {sprintRacePoints}
                                    </p>
                                </button>
                                <span className="font-bold text-yellow-300 ml-2 flex-shrink-0">{points} pts</span>
                            </div>
                        ))}
                        {constructorData && (
                            <div className="flex justify-between items-start bg-gray-600/60 p-1.5 rounded-md border-l-2 border-yellow-400">
                                 <div className="min-w-0">
                                   <p className="font-semibold text-white text-xs truncate">{constructorData.name}</p>
                                   <p className="text-gray-400 text-xs truncate" title={calculation}>Calc: {calculation}</p>
                                </div>
                                <span className="font-bold text-yellow-300 ml-2 flex-shrink-0">{constructorPoints.toFixed(1)} pts</span>
                            </div>
                        )}
                    </div>
                </div>
                <div>
                    <RankChart data={rankHistory} sport={useFantasy().sport!} />
                </div>
            </div>
        </div>
    );
};

const RankChangeIndicator: React.FC<{ change: number | undefined }> = ({ change }) => {
    if (change === undefined) return <div className="w-8 text-center" />;
    if (change > 0) return <span className="flex items-center gap-1 text-green-400 text-xs font-bold w-8 justify-center"><ArrowUpIcon className="w-3 h-3"/> {change}</span>;
    if (change < 0) return <span className="flex items-center gap-1 text-red-500 text-xs font-bold w-8 justify-center"><ArrowDownIcon className="w-3 h-3"/> {Math.abs(change)}</span>;
    return <span className="flex items-center text-gray-500 text-xs font-bold w-8 justify-center"><MinusIcon className="w-3 h-3"/></span>;
};

export const Leaderboard: React.FC<LeaderboardProps> = (props) => {
    const {
        participants, races, leaderboardView, isAdmin, onDeleteParticipant, onUpdateParticipant,
        teamSnapshots, riders, constructors, sport, currencyPrefix, currencySuffix, onSelectRider, participantRanks
    } = props;
    
    const [editingName, setEditingName] = useState<{ id: number; name: string } | null>(null);
    const [sharingParticipant, setSharingParticipant] = useState<ParticipantWithScore | null>(null);
    const [expandedParticipantId, setExpandedParticipantId] = useState<number | null>(null);
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
        if (!cardRef.current || !sharingParticipant) return;
        toPng(cardRef.current, { cacheBust: true, backgroundColor: '#111827' })
            .then((dataUrl) => {
                const link = document.createElement('a');
                link.download = `${sharingParticipant.name}-fantasy-performance.png`;
                link.href = dataUrl;
                link.click();
            })
            .catch((err) => console.error('oops, something went wrong!', err));
    }, [sharingParticipant]);

    const getMedal = (index: number) => index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : null;
    const getRankStyle = (index: number) => index === 0 ? 'border-l-4 border-yellow-400' : index === 1 ? 'border-l-4 border-gray-400' : index === 2 ? 'border-l-4 border-yellow-700' : 'border-l-4 border-transparent';
    
    return (
        <div>
            <div className="space-y-2">
                {participants.length === 0 ? (
                    <div className="text-center py-10 bg-gray-800 rounded-lg"><p className="text-gray-400">Aún no hay participantes.</p></div>
                ) : (
                    participants.map((participant, index) => {
                        const isExpanded = expandedParticipantId === participant.id;
                        const isGemini = participant.name === 'Gemini AI';
                        
                        return (
                             <div key={participant.id} className={`bg-gray-800 rounded-lg shadow-md transition-all duration-300 ${getRankStyle(index)}`}>
                                <div className="p-3 text-left">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 flex-grow min-w-0">
                                            <span className="text-xl font-bold w-6 text-center text-gray-400">{index + 1}</span>
                                            <RankChangeIndicator change={participant.rankChange} />
                                            <div className="flex-grow min-w-0">
                                                {editingName?.id === participant.id ? (
                                                    <input type="text" value={editingName.name} onChange={(e) => setEditingName({ ...editingName, name: e.target.value })} onBlur={() => handleSaveName(participant.id)} onKeyDown={(e) => e.key === 'Enter' && handleSaveName(participant.id)} className="bg-gray-700 text-md font-bold text-white p-1 rounded-md w-full" autoFocus/>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="text-md font-bold text-white truncate">{getMedal(index)} {participant.name}</h3>
                                                        {isGemini && <SparklesIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                                            <div className="font-bold text-yellow-300 text-lg px-2">{participant.score}</div>
                                            {isAdmin && (
                                                <div className="hidden sm:flex items-center">
                                                    {editingName?.id === participant.id ? (
                                                        <button onClick={() => handleSaveName(participant.id)} className="p-1.5 text-gray-400 hover:text-green-500 hover:bg-gray-700 rounded-full"><CheckIcon className="w-4 h-4"/></button>
                                                    ) : (
                                                        <button onClick={() => setEditingName({ id: participant.id, name: participant.name })} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full"><PencilIcon className="w-4 h-4"/></button>
                                                    )}
                                                    <button onClick={() => onDeleteParticipant(participant)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-gray-700 rounded-full"><TrashIcon className="w-4 h-4"/></button>
                                                </div>
                                            )}
                                            {leaderboardView !== 'general' && <button onClick={() => setSharingParticipant(participant)} className="p-1.5 text-gray-400 hover:text-blue-400 hover:bg-gray-700 rounded-full"><ShareIcon className="w-4 h-4"/></button>}
                                            <button onClick={() => setExpandedParticipantId(isExpanded ? null : participant.id)} className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full">
                                                <ChevronDownIcon className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                {isExpanded && (
                                    leaderboardView === 'general'
                                    ? <div className="p-3 bg-gray-900/50 rounded-b-lg text-center text-sm text-gray-400">Selecciona una jornada para ver el desglose detallado.</div>
                                    : <ExpandedViewContent participantId={participant.id} raceId={leaderboardView} onSelectRider={onSelectRider} participantRanks={participantRanks} races={races} />
                                )}
                            </div>
                        )
                    })
                )}
            </div>
            
            {sharingParticipant && leaderboardView !== 'general' && (
                 <Modal isOpen={!!sharingParticipant} onClose={() => setSharingParticipant(null)} title={`Compartir Rendimiento`} sport={sport}>
                    <div>
                         <div ref={cardRef}>
                            <SharePerformanceCard 
                                participant={sharingParticipant}
                                teamRiders={getTeamForRace(sharingParticipant.id, leaderboardView, teamSnapshots).riderIds.map(id => ridersById.get(id)).filter((r): r is Rider => !!r)}
                                teamConstructor={constructorsById.get(getTeamForRace(sharingParticipant.id, leaderboardView, teamSnapshots).constructorId!) || null}
                                sport={sport}
                                formatPrice={formatPrice}
                                raceName={races.find(r => r.id === leaderboardView)?.gp_name || 'Carrera'}
                                score={sharingParticipant.score}
                                rank={participants.findIndex(p => p.id === sharingParticipant.id) + 1}
                            />
                        </div>
                        <button onClick={handleDownloadImage} className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg text-lg flex items-center justify-center gap-3">
                            <ArrowDownTrayIcon className="w-6 h-6"/> Descargar Imagen
                        </button>
                    </div>
                </Modal>
            )}
        </div>
    );
};