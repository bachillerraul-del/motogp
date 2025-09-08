import React, { useState, useMemo, useCallback, useEffect } from 'react';
import type { Rider, Participant, Round } from '../types';
import { TEAM_SIZE, BUDGET } from '../constants';
import { RiderCard } from './RiderCard';
import { TeamSidebar } from './TeamSidebar';
import { CloseIcon } from './Icons';
import { Modal } from './Modal';
import { Countdown } from './Countdown';

interface TeamBuilderProps {
    riders: Rider[];
    participants: Participant[];
    onAddToLeague: (name: string, team: Rider[]) => Promise<boolean>;
    onUpdateTeam: (participantId: number, team: Rider[]) => Promise<boolean>;
    showToast: (message: string, type: 'success' | 'error') => void;
    marketDeadline: string | null;
    currentRound: Round | null;
}

type SaveModalState = 'closed' | 'enterName' | 'confirmUpdate';

const useTeamManagement = (showToast: TeamBuilderProps['showToast']) => {
    const [team, setTeam] = useState<Rider[]>([]);

    const teamTotalPrice = useMemo(() => team.reduce((sum, rider) => sum + rider.price, 0), [team]);
    const remainingBudget = useMemo(() => BUDGET - teamTotalPrice, [teamTotalPrice]);
    const isTeamFull = useMemo(() => team.length >= TEAM_SIZE, [team]);

    const addRider = useCallback((rider: Rider) => {
        if (rider.condition?.includes('unavailable') || rider.condition?.includes('injured')) {
            showToast('Este piloto no está disponible para selección.', 'error');
            return;
        }
        if (isTeamFull) {
            showToast('Tu equipo ya está lleno.', 'error');
            return;
        }
        if (team.some(r => r.id === rider.id)) {
            showToast('Este piloto ya está en tu equipo.', 'error');
            return;
        }
        if (remainingBudget < 0 || rider.price > remainingBudget) {
            showToast('No tienes presupuesto suficiente para este piloto.', 'error');
            return;
        }
        setTeam(prevTeam => [...prevTeam, rider]);
        showToast(`${rider.name} añadido al equipo.`, 'success');
    }, [team, remainingBudget, isTeamFull, showToast]);

    const removeRider = useCallback((rider: Rider) => {
        setTeam(prevTeam => prevTeam.filter(r => r.id !== rider.id));
        showToast(`${rider.name} quitado del equipo.`, 'success');
    }, [showToast]);

    const clearTeam = useCallback(() => {
        setTeam([]);
    }, []);

    return { team, addRider, removeRider, clearTeam, teamTotalPrice, remainingBudget, isTeamFull };
};

const shareTeamOnWhatsapp = (team: Rider[]) => {
    const riderList = team.map((r, index) => `${index + 1}. ${r.name} (€${r.price.toLocaleString('es-ES')})`).join('\n');
    const teamPrice = team.reduce((sum, rider) => sum + rider.price, 0).toLocaleString('es-ES');
    const message = `🏁 ¡Mi equipo de MotoGP Fantasy! 🏁\n\n*Coste Total: €${teamPrice}*\n\n*Pilotos:*\n${riderList}\n\nCrea tu propio equipo aquí.`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
};

const calculateTimeRemaining = (deadline: Date) => {
    const total = deadline.getTime() - new Date().getTime();
    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));
    return { days, hours, minutes, seconds };
};

export const TeamBuilder: React.FC<TeamBuilderProps> = ({ riders, participants, onAddToLeague, onUpdateTeam, showToast, marketDeadline, currentRound }) => {
    const { team, addRider, removeRider, clearTeam, teamTotalPrice, remainingBudget, isTeamFull } = useTeamManagement(showToast);
    
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [saveModalState, setSaveModalState] = useState<SaveModalState>('closed');
    const [participantName, setParticipantName] = useState('');
    const [participantToUpdate, setParticipantToUpdate] = useState<Participant | null>(null);

    const deadlineDate = useMemo(() => marketDeadline ? new Date(marketDeadline) : null, [marketDeadline]);
    const [marketStatus, setMarketStatus] = useState({ 
        isOpen: true, 
        timeRemaining: { days: 0, hours: 0, minutes: 0, seconds: 0 } 
    });

    useEffect(() => {
        if (!deadlineDate) {
            setMarketStatus(prev => ({ ...prev, isOpen: true }));
            return;
        }

        const updateStatus = () => {
            const now = new Date();
            if (now >= deadlineDate) {
                setMarketStatus({ isOpen: false, timeRemaining: { days: 0, hours: 0, minutes: 0, seconds: 0 } });
                return true; // Timer finished
            }
            setMarketStatus({ isOpen: true, timeRemaining: calculateTimeRemaining(deadlineDate) });
            return false; // Timer still running
        };

        if (updateStatus()) return; // If market already closed, no need for interval

        const timer = setInterval(() => {
            if (updateStatus()) {
                clearInterval(timer);
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [deadlineDate]);

    const ridersInLeagues = useMemo(() => {
        const riderSelectionMap: Record<number, string[]> = {};
        for (const participant of participants) {
            for (const riderId of participant.team_ids) {
                if (!riderSelectionMap[riderId]) {
                    riderSelectionMap[riderId] = [];
                }
                riderSelectionMap[riderId].push(participant.name);
            }
        }
        return riderSelectionMap;
    }, [participants]);

    const availableRiders = useMemo(() => {
        const teamIds = new Set(team.map(r => r.id));
        const filteredRiders = riders.filter(r => !teamIds.has(r.id));

        const available = [];
        const unavailable = [];

        for (const rider of filteredRiders) {
            if (rider.condition?.includes('unavailable') || rider.condition?.includes('injured')) {
                unavailable.push(rider);
            } else {
                available.push(rider);
            }
        }
        
        available.sort((a, b) => b.price - a.price);

        return [...available, ...unavailable];
    }, [team, riders]);

    const resetSaveModal = () => {
        setSaveModalState('closed');
        setParticipantName('');
        setParticipantToUpdate(null);
    };

    const handleSaveAndShareClick = () => {
        if (!marketStatus.isOpen) {
            showToast('El mercado está cerrado. No se pueden hacer cambios.', 'error');
            return;
        }
        if (team.length === TEAM_SIZE) {
            setSaveModalState('enterName');
        }
    };

    const handleNameSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!participantName.trim()) {
            showToast('El nombre del participante no puede estar vacío.', 'error');
            return;
        }

        const trimmedName = participantName.trim();
        const existingParticipant = participants.find(p => p.name.toLowerCase() === trimmedName.toLowerCase());

        if (existingParticipant) {
            setParticipantToUpdate(existingParticipant);
            setSaveModalState('confirmUpdate');
        } else {
            const success = await onAddToLeague(trimmedName, team);
            if (success) {
                shareTeamOnWhatsapp(team);
                clearTeam();
                resetSaveModal();
            }
        }
    };

    const handleConfirmUpdate = async () => {
        if (!participantToUpdate) return;
        const success = await onUpdateTeam(participantToUpdate.id, team);
        if (success) {
            shareTeamOnWhatsapp(team);
            clearTeam();
            resetSaveModal();
        }
    };
    
    return (
        <div className="flex flex-col lg:flex-row gap-8">
            <div className="flex-grow pb-24 lg:pb-0">
                {deadlineDate && (
                    <div className="bg-gray-800 p-4 rounded-lg mb-6 text-center shadow-lg">
                        {marketStatus.isOpen ? (
                            <>
                                <h3 className="text-lg font-semibold text-red-500 mb-2 uppercase tracking-wider">Cierre de Mercado</h3>
                                <Countdown timeRemaining={marketStatus.timeRemaining} />
                                <p className="text-sm text-gray-400 mt-3">
                                    Fecha límite: {deadlineDate.toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'short' })}
                                </p>
                            </>
                        ) : (
                            <div className="py-4">
                                <h3 className="text-2xl font-bold text-red-600 uppercase tracking-widest">Mercado Cerrado</h3>
                            </div>
                        )}
                    </div>
                )}
                <div className="mb-6 border-b-2 border-red-600 pb-2 flex justify-between items-end flex-wrap">
                    <h2 className="text-3xl font-bold">Elige tus Pilotos</h2>
                    {currentRound && (
                        <p className="text-md text-gray-300 whitespace-nowrap ml-4 mt-2 sm:mt-0">
                            Próximo GP: <span className="font-bold text-red-500">{currentRound.name}</span>
                        </p>
                    )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {availableRiders.map(rider => (
                        <RiderCard 
                            key={rider.id} 
                            rider={rider} 
                            onAdd={() => marketStatus.isOpen ? addRider(rider) : showToast('El mercado está cerrado.', 'error')} 
                            isTeamFull={isTeamFull}
                            isAffordable={rider.price <= (remainingBudget < 0 ? 0 : remainingBudget)}
                            selectedByTeams={ridersInLeagues[rider.id] || []}
                        />
                    ))}
                </div>
            </div>

            <aside className="w-full lg:w-1/3 xl:w-1/4 hidden lg:block">
                <div className="sticky top-24">
                   <TeamSidebar 
                        team={team}
                        teamTotalPrice={teamTotalPrice}
                        remainingBudget={remainingBudget}
                        onRemoveRider={(rider) => marketStatus.isOpen ? removeRider(rider) : showToast('El mercado está cerrado.', 'error')}
                        onSaveAndShare={handleSaveAndShareClick}
                   />
                </div>
            </aside>

            <div className="lg:hidden">
                <div 
                    className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t-2 border-red-600 p-3 shadow-lg z-20 flex justify-between items-center cursor-pointer"
                    onClick={() => setIsMobileSidebarOpen(true)}
                    role="button"
                >
                    <div>
                        <p className="font-bold text-lg">{team.length}/{TEAM_SIZE} Pilotos</p>
                        <p className="text-sm text-gray-400">Restante: 
                            <span className={`font-mono font-bold ${remainingBudget < 0 ? 'text-red-500' : 'text-green-400'}`}>
                                €{remainingBudget.toLocaleString('es-ES')}
                            </span>
                        </p>
                    </div>
                     <span className="text-white font-bold py-2 px-4 rounded-lg bg-red-600/50">Ver Equipo</span>
                </div>

                <div 
                    className={`fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity duration-300 ${isMobileSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    onClick={() => setIsMobileSidebarOpen(false)}
                    aria-hidden={!isMobileSidebarOpen}
                />
                <div 
                    className={`fixed top-0 right-0 bottom-0 w-full max-w-sm bg-gray-900 shadow-xl z-40 transform transition-transform duration-300 ease-in-out ${isMobileSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
                    role="dialog"
                    aria-modal="true"
                >
                    <div className="p-4 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-white">Tu Selección</h2>
                            <button onClick={() => setIsMobileSidebarOpen(false)} className="p-2 text-gray-400 hover:text-white" aria-label="Cerrar">
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-grow">
                             <TeamSidebar 
                                team={team}
                                teamTotalPrice={teamTotalPrice}
                                remainingBudget={remainingBudget}
                                onRemoveRider={(rider) => marketStatus.isOpen ? removeRider(rider) : showToast('El mercado está cerrado.', 'error')}
                                onSaveAndShare={() => {
                                    handleSaveAndShareClick();
                                    setIsMobileSidebarOpen(false);
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
            
            <Modal
                isOpen={saveModalState !== 'closed'}
                onClose={resetSaveModal}
                title={saveModalState === 'enterName' ? 'Guardar equipo en la liga' : `Actualizar equipo`}
            >
                {saveModalState === 'enterName' && (
                    <form onSubmit={handleNameSubmit} className="space-y-4">
                        <p className="text-gray-300">Introduce tu nombre para añadir tu equipo a la clasificación.</p>
                        <div>
                           <label htmlFor="participant-name" className="block text-sm font-medium text-gray-300 mb-1">Nombre del Participante</label>
                            <input
                                id="participant-name"
                                type="text"
                                value={participantName}
                                onChange={(e) => setParticipantName(e.target.value)}
                                className="w-full bg-gray-900 text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                                required
                                autoFocus
                            />
                        </div>
                        <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300">
                            Guardar Equipo
                        </button>
                    </form>
                )}
                {saveModalState === 'confirmUpdate' && participantToUpdate && (
                    <div className="space-y-4 text-center">
                        <p className="text-gray-300">El participante <strong className="text-white">{participantToUpdate.name}</strong> ya existe.</p>
                        <p>¿Deseas actualizar su equipo con tu selección actual?</p>
                        <div className="flex gap-4 pt-2">
                             <button onClick={resetSaveModal} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                                Cancelar
                            </button>
                            <button onClick={handleConfirmUpdate} className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                                Sí, Actualizar
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};