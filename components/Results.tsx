import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import type { Rider, Participant, Race, Sport, Constructor } from '../types';
import { supabase } from '../lib/supabaseClient';
import { Modal } from './Modal';
import { AdminPanel } from './AdminPanel';
import { Leaderboard } from './Leaderboard';
import { RiderLeaderboard } from './RiderLeaderboard';
import { CogIcon, UsersIcon, ChartBarIcon } from './Icons';
import { useFantasy } from '../contexts/FantasyDataContext';
import { calculateScore } from '../lib/scoreUtils';

type RiderWithScore = Rider & { score: number };

interface ResultsProps {
    isAdmin: boolean;
    sport: Sport;
    RIDER_LIMIT: number;
    CONSTRUCTOR_LIMIT: number;
    currencyPrefix: string;
    currencySuffix: string;
    currentUser: Participant | null;
    onSelectRider: (rider: Rider) => void;
}

export const Results: React.FC<ResultsProps> = (props) => {
    const { 
        isAdmin, sport, currentUser, onSelectRider
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
    
    const [mobileView, setMobileView] = useState<'leaderboard' | 'riders'>('leaderboard');
    const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
    
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
                Object.entries(roundPoints).forEach(([riderId, points]) => {
                    const id = parseInt(riderId, 10);
                    riderScores[id] = (riderScores[id] || 0) + points;
                });
            });
        } else {
            const selectedRoundPoints = allRiderPoints[leaderboardView] || {};
            Object.entries(selectedRoundPoints).forEach(([riderId, points]) => {
                riderScores[parseInt(riderId, 10)] = points;
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

    const mobileTabActiveColor = sport === 'f1' ? 'bg-red-600' : 'bg-orange-500';

    return (
        <div>
            {isAdmin && (
                <div className="mb-6">
                    <button
                        onClick={() => setIsAdminPanelOpen(true)}
                        className="w-full flex items-center justify-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors duration-300"
                    >
                        <CogIcon className="w-5 h-5" />
                        Panel de Administrador
                    </button>
                </div>
            )}

            <div className="flex flex-col gap-8">
                <div className="flex lg:hidden rounded-lg bg-gray-800 p-1 border border-gray-700">
                    <button onClick={() => setMobileView('leaderboard')} className={`w-1/2 p-2 rounded-md font-semibold text-center transition-colors flex items-center justify-center gap-2 ${mobileView === 'leaderboard' ? `${mobileTabActiveColor} text-white` : 'text-gray-300'}`}>
                        <UsersIcon className="w-5 h-5" /> Clasificación
                    </button>
                    <button onClick={() => setMobileView('riders')} className={`w-1/2 p-2 rounded-md font-semibold text-center transition-colors flex items-center justify-center gap-2 ${mobileView === 'riders' ? `${mobileTabActiveColor} text-white` : 'text-gray-300'}`}>
                        <ChartBarIcon className="w-5 h-5" /> Pilotos
                    </button>
                </div>

                <div className="lg:flex lg:gap-8">
                    <div className={`w-full lg:flex-grow ${mobileView === 'leaderboard' ? 'block' : 'hidden'} lg:block`}>
                        <Leaderboard
                            participants={sortedParticipants}
                            races={races}
                            leaderboardView={leaderboardView}
                            onLeaderboardViewChange={setLeaderboardView}
                            isAdmin={isAdmin}
                            onDeleteParticipant={setParticipantToDelete}
                            // FIX: Renamed to match function from useFantasy hook.
                            onUpdateParticipant={handleUpdateParticipant}
                            allRiderPoints={allRiderPoints}
                            teamSnapshots={teamSnapshots}
                            riders={riders}
                            constructors={constructors}
                            sport={sport}
                            currencyPrefix={props.currencyPrefix}
                            currencySuffix={props.currencySuffix}
                            onSelectRider={onSelectRider}
                        />
                    </div>
                    <div className={`w-full lg:w-96 ${mobileView === 'riders' ? 'block' : 'hidden'} lg:block`}>
                        <RiderLeaderboard
                            riders={sortedRiders}
                            onSelectRider={onSelectRider}
                            title={riderLeaderboardTitle}
                            sport={sport}
                        />
                    </div>
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
                        riderPoints={allRiderPoints}
                        sport={sport}
                        selectedRace={selectedRaceForEditing}
                        onSelectRace={setSelectedRaceForEditing}
                        onClearPoints={() => { setIsConfirmingClearPoints(true); setIsAdminPanelOpen(false); }}
                        // FIX: Renamed to match functions from useFantasy hook.
                        onUpdateRace={handleUpdateRace}
                        onUpdateRider={handleUpdateRider}
                        onBulkUpdatePoints={handleBulkUpdatePoints}
                        showToast={showToast}
                    />
                </div>
            </Modal>
        </div>
    );
};