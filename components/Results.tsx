import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { Rider, Participant, Race, Sport, Constructor } from '../types';
import { supabase } from '../lib/supabaseClient';
import { Modal } from './Modal';
import { AdminPanel } from './AdminPanel';
import { Leaderboard } from './Leaderboard';
import { RiderLeaderboard } from './RiderLeaderboard';
import { CogIcon, ClipboardDocumentListIcon } from './Icons';
import { useFantasy } from '../contexts/FantasyDataContext';
import { calculateScore } from '../lib/scoreUtils';
import { getTeamForRace } from '../lib/utils';


type RiderWithScore = Rider & { score: number };

interface ResultsProps {
    isAdmin: boolean;
    sport: Sport;
    RIDER_LIMIT: number;
    CONSTRUCTOR_LIMIT: number;
    currencyPrefix: string;
    currencySuffix: string;
    currentUser: Participant | null;
    currentRace: Race | null;
    onSelectRider: (rider: Rider) => void;
    addGeminiParticipant: () => Promise<Participant | null>;
    onUpdateTeam: (participantId: number, riders: Rider[], constructor: Constructor, raceId: number) => Promise<boolean>;
}

export const Results: React.FC<ResultsProps> = (props) => {
    const { 
        isAdmin, sport, currentUser, currentRace, onSelectRider, addGeminiParticipant, onUpdateTeam
    } = props;
    
    // FIX: Renamed destructured functions to match what useFantasy hook provides (e.g., onUpdateParticipant -> handleUpdateParticipant).
    const {
        participants, races, teamSnapshots, riders, constructors, allRiderPoints,
        handleBulkUpdatePoints, showToast, fetchData, handleUpdateParticipant, handleDeleteParticipant,
        handleUpdateRace, handleUpdateRider
    } = useFantasy();

    const [selectedRaceForEditing, setSelectedRaceForEditing] = useState<Race | null>(null);
    const [leaderboardView, setLeaderboardView] = useState<number | 'general'>('general');
    const defaultViewIsSet = useRef(false);
    
    const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
    const [isShareModalOpen, setIsShareModalOpen] = useState(false);
    const [shareableText, setShareableText] = useState('');
    
    const [participantToDelete, setParticipantToDelete] = useState<Participant | null>(null);
    const [isConfirmingClearPoints, setIsConfirmingClearPoints] = useState(false);

    useEffect(() => {
        if (races.length > 0 && !defaultViewIsSet.current) {
            let defaultRace: Race | undefined;

            if (currentUser) {
                const userSnapshots = teamSnapshots
                    .filter(s => s.participant_id === currentUser.id && s.race_id !== null)
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                
                if (userSnapshots.length > 0) {
                    const latestRaceId = userSnapshots[0].race_id;
                    defaultRace = races.find(r => r.id === latestRaceId);
                }
            }

            if (!defaultRace) {
                defaultRace = [...races]
                    .filter(r => allRiderPoints[r.id] && Object.keys(allRiderPoints[r.id]).length > 0)
                    .sort((a, b) => new Date(b.race_date).getTime() - new Date(a.race_date).getTime())[0];
            }

            if (!defaultRace) {
                defaultRace = [...races].sort((a, b) => new Date(b.race_date).getTime() - new Date(a.race_date).getTime())[0];
            }
            
            if (defaultRace) {
                setLeaderboardView(defaultRace.id);
                if (!selectedRaceForEditing) {
                    setSelectedRaceForEditing(defaultRace);
                }
            }
            defaultViewIsSet.current = true;
        }
    }, [races, allRiderPoints, selectedRaceForEditing, currentUser, teamSnapshots]);

    const confirmClearPoints = async () => {
        if (selectedRaceForEditing === null) return;
        const pointTable = sport === 'f1' ? 'f1_rider_points' : 'rider_points';
        const { error } = await supabase.from(pointTable).delete().eq('round_id', selectedRaceForEditing.id);
        if (error) {
            showToast('Error al limpiar los puntos.', 'error');
        } else {
             showToast('Puntos limpiados para la jornada.', 'success');
             fetchData();
        }
        setIsConfirmingClearPoints(false);
    };

    const handleShareSelections = useCallback(() => {
        if (leaderboardView === 'general') {
            showToast('Selecciona una jornada específica para compartir.', 'info');
            return;
        }
    
        const race = races.find(r => r.id === leaderboardView);
        if (!race) return;
    
        const ridersById = new Map(riders.map(r => [r.id, r]));
        const constructorsById = new Map(constructors.map(c => [c.id, c]));
    
        const participantTeams = participants.map(participant => {
            const { riderIds, constructorId } = getTeamForRace(participant.id, race.id, teamSnapshots);
            const teamRiders = riderIds.map(id => ridersById.get(id)).filter((r): r is Rider => !!r);
            const teamConstructor = constructorId ? constructorsById.get(constructorId) : null;
            return { participant, teamRiders, teamConstructor };
        }).filter(pt => pt.teamRiders.length > 0 && pt.teamConstructor);
    
        const sportName = sport === 'f1' ? 'Fórmula 1' : 'MotoGP';
        let text = `*Fantasy ${sportName} - Selecciones para ${race.gp_name}* 🏁\n\n`;
        text += `---------------------------------\n\n`;
    
        participantTeams.forEach(({ participant, teamRiders, teamConstructor }) => {
            text += `*${participant.name}*:\n`;
            teamRiders.forEach(rider => {
                text += `  • ${rider.name}\n`;
            });
            if (teamConstructor) {
                text += `  • _${teamConstructor.name} (Escudería)_\n`;
            }
            text += '\n';
        });
    
        setShareableText(text);
        setIsShareModalOpen(true);
    }, [leaderboardView, races, participants, teamSnapshots, riders, constructors, sport, showToast]);

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(shareableText).then(() => {
            showToast('Texto copiado al portapapeles.', 'success');
            setIsShareModalOpen(false);
        }, (err) => {
            console.error('Could not copy text: ', err);
            showToast('Error al copiar el texto.', 'error');
        });
    };

    const confirmDeleteParticipant = () => {
        if (!participantToDelete) return;
        // FIX: Renamed to match function from useFantasy hook.
        handleDeleteParticipant(participantToDelete.id);
        setParticipantToDelete(null);
    };

    const scoreCalculator = useCallback((participant: Participant) => {
        return calculateScore(participant, leaderboardView, races, teamSnapshots, allRiderPoints, riders, constructors);
    }, [leaderboardView, races, teamSnapshots, allRiderPoints, riders, constructors]);


    const sortedParticipants = useMemo(() => {
        return [...participants].map(p => ({
            ...p,
            score: Math.round(scoreCalculator(p))
        })).sort((a, b) => b.score - a.score);
    }, [participants, scoreCalculator]);

    const sortedRiders = useMemo(() => {
        const riderScores: Record<number, number> = {};

        if (leaderboardView === 'general') {
            Object.values(allRiderPoints).forEach(roundPoints => {
                Object.entries(roundPoints).forEach(([riderId, pointsData]) => {
                    const id = parseInt(riderId, 10);
                    riderScores[id] = (riderScores[id] || 0) + pointsData.total;
                });
            });
        } else {
            const selectedRoundPoints = allRiderPoints[leaderboardView] || {};
            Object.entries(selectedRoundPoints).forEach(([riderId, pointsData]) => {
                riderScores[parseInt(riderId, 10)] = pointsData.total;
            });
        }

        return riders
            .map(rider => ({ ...rider, score: riderScores[rider.id] || 0 }))
            .filter(rider => rider.score > 0)
            .sort((a, b) => b.score - a.score);
    }, [allRiderPoints, riders, leaderboardView]);

    const riderLeaderboardTitle = useMemo(() => {
        if (leaderboardView === 'general') return "Clasificación de Pilotos";
        const race = races.find(r => r.id === leaderboardView);
        return race ? `Pilotos: ${race.gp_name}` : "Clasificación de Pilotos";
    }, [leaderboardView, races]);

    const [activeTab, setActiveTab] = useState<'participants' | 'riders'>('participants');

    return (
        <div className="space-y-6">
             {isAdmin && (
                <div className="mb-2">
                    <button
                        onClick={() => setIsAdminPanelOpen(true)}
                        className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300"
                    >
                        <CogIcon className="w-5 h-5" />
                        Panel de Administrador
                    </button>
                </div>
            )}
            <div className="block sm:hidden">
                 <select 
                    value={activeTab} 
                    onChange={e => setActiveTab(e.target.value as 'participants' | 'riders')}
                    className="bg-gray-800 text-white p-2 rounded-md w-full"
                 >
                     <option value="participants">Clasificación de Participantes</option>
                     <option value="riders">Clasificación de Pilotos</option>
                 </select>
             </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 <div className={`lg:col-span-2 ${activeTab !== 'participants' && 'hidden sm:block'}`}>
                     <Leaderboard
                        participants={sortedParticipants}
                        races={races}
                        leaderboardView={leaderboardView}
                        onLeaderboardViewChange={setLeaderboardView}
                        isAdmin={isAdmin}
                        onDeleteParticipant={setParticipantToDelete}
                        onUpdateParticipant={handleUpdateParticipant}
                        teamSnapshots={teamSnapshots}
                        onShare={handleShareSelections}
                        riders={riders}
                        constructors={constructors}
                        sport={sport}
                        currencyPrefix={props.currencyPrefix}
                        currencySuffix={props.currencySuffix}
                        onSelectRider={onSelectRider}
                    />
                </div>
                 <div className={`lg:col-span-1 ${activeTab !== 'riders' && 'hidden sm:block'}`}>
                     <RiderLeaderboard
                        riders={sortedRiders}
                        onSelectRider={onSelectRider}
                        title={riderLeaderboardTitle}
                        sport={sport}
                    />
                </div>
            </div>
            
            <Modal isOpen={!!participantToDelete} onClose={() => setParticipantToDelete(null)} title="Confirmar Eliminación" sport={sport}>
                <div className="space-y-4 text-center">
                    <p>¿Estás seguro de que quieres eliminar a <strong className="text-white">{participantToDelete?.name}</strong> de la liga?</p>
                    <p className="text-sm text-red-400">Esta acción no se puede deshacer.</p>
                    <div className="flex gap-4 pt-2">
                        <button onClick={() => setParticipantToDelete(null)} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Cancelar</button>
                        <button onClick={confirmDeleteParticipant} className={`w-full text-white font-bold py-2 px-4 rounded-lg transition-colors ${sport === 'f1' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'}`}>Eliminar</button>
                    </div>
                </div>
            </Modal>
            
             <Modal isOpen={isConfirmingClearPoints} onClose={() => setIsConfirmingClearPoints(false)} title="Confirmar Limpieza de Puntos" sport={sport}>
                <div className="space-y-4 text-center">
                    <p>¿Estás seguro de que quieres limpiar todos los puntos para la jornada seleccionada?</p>
                    <p className="text-sm text-red-400">Esto pondrá a 0 los puntos de todos los pilotos para esta jornada.</p>
                     <div className="flex gap-4 pt-2">
                        <button onClick={() => setIsConfirmingClearPoints(false)} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Cancelar</button>
                        <button onClick={confirmClearPoints} className={`w-full text-white font-bold py-2 px-4 rounded-lg transition-colors ${sport === 'f1' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600'}`}>Limpiar Puntos</button>
                    </div>
                </div>
            </Modal>
            
            <Modal isOpen={isAdminPanelOpen} onClose={() => setIsAdminPanelOpen(false)} title="Panel de Administrador" sport={sport}>
                <div className="max-h-[75vh] overflow-y-auto pr-2 -mr-4">
                    <AdminPanel
                        races={races}
                        riders={riders}
                        constructors={constructors}
                        participants={participants}
                        riderPoints={allRiderPoints}
                        sport={sport}
                        selectedRace={selectedRaceForEditing}
                        currentRace={currentRace}
                        onSelectRace={setSelectedRaceForEditing}
                        onClearPoints={() => { setIsConfirmingClearPoints(true); setIsAdminPanelOpen(false); }}
                        addGeminiParticipant={addGeminiParticipant}
                        onUpdateTeam={onUpdateTeam}
                        // FIX: Renamed to match functions from useFantasy hook.
                        onUpdateRace={handleUpdateRace}
                        onUpdateRider={handleUpdateRider}
                        onBulkUpdatePoints={handleBulkUpdatePoints}
                        showToast={showToast}
                    />
                </div>
            </Modal>

            <Modal isOpen={isShareModalOpen} onClose={() => setIsShareModalOpen(false)} title={`Compartir Selecciones para ${races.find(r => r.id === leaderboardView)?.gp_name}`} sport={sport} size="lg">
                <div>
                    <p className="text-sm text-gray-400 mb-2">Copia este texto y pégalo en tu grupo de WhatsApp.</p>
                    <textarea
                        readOnly
                        className="w-full h-64 bg-gray-900 text-gray-300 p-3 rounded-md border border-gray-700 focus:ring-0 focus:outline-none"
                        value={shareableText}
                    />
                    <button
                        onClick={handleCopyToClipboard}
                        className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg text-lg transition-colors duration-300 flex items-center justify-center gap-3"
                    >
                        <ClipboardDocumentListIcon className="w-6 h-6"/> Copiar Texto
                    </button>
                </div>
            </Modal>
        </div>
    );
};