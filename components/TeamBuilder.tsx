import React, { useState, useMemo, useCallback } from 'react';
import type { Rider, Participant } from '../types';
import { MOTOGP_RIDERS, TEAM_SIZE, BUDGET } from '../constants';
import { RiderCard } from './RiderCard';
import { TeamSidebar } from './TeamSidebar';
import { CloseIcon } from './Icons';

// Props for the main component
interface TeamBuilderProps {
    participants: Participant[];
    onAddToLeague: (name: string, team: Rider[]) => Promise<boolean>;
    onUpdateTeam: (participantId: number, team: Rider[]) => Promise<boolean>;
    showToast: (message: string, type: 'success' | 'error') => void;
}

// Custom hook for managing the fantasy team state and logic.
// This encapsulates all team-related state, derived calculations, and actions.
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
        if (rider.price > remainingBudget) {
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

    return {
        team,
        addRider,
        removeRider,
        clearTeam,
        teamTotalPrice,
        remainingBudget,
        isTeamFull,
    };
};

// Utility function to handle sharing to WhatsApp.
const shareTeamOnWhatsapp = (team: Rider[]) => {
    const riderList = team.map((r, index) => 
        `${index + 1}. ${r.name} (${r.team})`
    ).join('\n');
    
    const teamPrice = team.reduce((sum, rider) => sum + rider.price, 0).toFixed(2);

    const message = `🏁 ¡Mi equipo de MotoGP Fantasy! 🏁\n\n*Coste Total: €${teamPrice}m*\n\n*Pilotos:*\n${riderList}\n\nCrea tu propio equipo aquí.`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    
    // Open in a new tab
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
};


export const TeamBuilder: React.FC<TeamBuilderProps> = ({ participants, onAddToLeague, onUpdateTeam, showToast }) => {
    const {
        team,
        addRider,
        removeRider,
        clearTeam,
        teamTotalPrice,
        remainingBudget,
        isTeamFull,
    } = useTeamManagement(showToast);

    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    // Memoize the list of riders available for selection.
    const availableRiders = useMemo(() => {
        const teamIds = new Set(team.map(r => r.id));
        return [...MOTOGP_RIDERS]
            .sort((a, b) => b.price - a.price)
            .filter(r => !teamIds.has(r.id));
    }, [team]);

    // Handles the entire process of saving the team to the league and sharing it.
    const handleSaveAndShare = async () => {
        const participantName = window.prompt("Introduce tu nombre de participante para la liga:");
        if (!participantName?.trim()) {
            if (participantName !== null) { // User clicked OK but left it empty
                showToast('El nombre del participante no puede estar vacío.', 'error');
            }
            return;
        }

        const trimmedName = participantName.trim();
        const existingParticipant = participants.find(p => p.name.toLowerCase() === trimmedName.toLowerCase());

        let success = false;
        if (existingParticipant) {
            const wantsToUpdate = window.confirm(`El participante '${trimmedName}' ya existe. ¿Deseas actualizar su equipo con tu selección actual?`);
            if (wantsToUpdate) {
                success = await onUpdateTeam(existingParticipant.id, team);
            }
        } else {
            success = await onAddToLeague(trimmedName, team);
        }

        if (success) {
            shareTeamOnWhatsapp(team);
            clearTeam(); 
        }
    };
    
    return (
        <div className="flex flex-col lg:flex-row gap-8">
            {/* Rider Selection Area */}
            <div className="flex-grow pb-24 lg:pb-0">
                <h2 className="text-3xl font-bold mb-6 border-b-2 border-red-600 pb-2">Elige tus Pilotos</h2>
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    {availableRiders.map(rider => (
                        <RiderCard 
                            key={rider.id} 
                            rider={rider} 
                            onAdd={addRider} 
                            isTeamFull={isTeamFull}
                            isAffordable={rider.price <= remainingBudget}
                        />
                    ))}
                </div>
            </div>

            {/* Desktop Sidebar */}
            <aside className="w-full lg:w-1/3 xl:w-1/4 hidden lg:block">
                <div className="sticky top-24">
                   <TeamSidebar 
                        team={team}
                        teamTotalPrice={teamTotalPrice}
                        remainingBudget={remainingBudget}
                        onRemoveRider={removeRider}
                        onSaveAndShare={handleSaveAndShare}
                   />
                </div>
            </aside>

            {/* Mobile UI: Fixed Footer & Sidebar Panel */}
            <div className="lg:hidden">
                {/* Fixed Summary Bar */}
                <div 
                    className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t-2 border-red-600 p-3 shadow-lg z-20 flex justify-between items-center cursor-pointer"
                    onClick={() => setIsMobileSidebarOpen(true)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setIsMobileSidebarOpen(true)}
                    aria-label="Abrir resumen del equipo"
                >
                    <div>
                        <p className="font-bold text-lg">{team.length}/{TEAM_SIZE} Pilotos</p>
                        <p className="text-sm text-gray-400">Restante: 
                            <span className={`font-mono font-bold ${remainingBudget < 0 ? 'text-red-500' : 'text-green-400'}`}>
                                €{remainingBudget.toFixed(2)}m
                            </span>
                        </p>
                    </div>
                     <span className="text-white font-bold py-2 px-4 rounded-lg bg-red-600/50">Ver Equipo</span>
                </div>

                {/* Mobile Sidebar Panel */}
                <div 
                    className={`fixed inset-0 bg-black bg-opacity-50 z-30 transition-opacity duration-300 ${isMobileSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    onClick={() => setIsMobileSidebarOpen(false)}
                    aria-hidden={!isMobileSidebarOpen}
                />
                <div 
                    className={`fixed top-0 right-0 bottom-0 w-full max-w-sm bg-gray-900 shadow-xl z-40 transform transition-transform duration-300 ease-in-out ${isMobileSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="mobile-sidebar-title"
                >
                    <div className="p-4 h-full flex flex-col">
                        <div className="flex justify-between items-center mb-4">
                            <h2 id="mobile-sidebar-title" className="text-xl font-bold text-white">Tu Selección</h2>
                            <button 
                                onClick={() => setIsMobileSidebarOpen(false)} 
                                className="p-2 text-gray-400 hover:text-white"
                                aria-label="Cerrar el panel del equipo"
                            >
                                <CloseIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-grow">
                             <TeamSidebar 
                                team={team}
                                teamTotalPrice={teamTotalPrice}
                                remainingBudget={remainingBudget}
                                onRemoveRider={removeRider}
                                onSaveAndShare={() => {
                                    handleSaveAndShare();
                                    setIsMobileSidebarOpen(false); // Close sidebar after action
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};