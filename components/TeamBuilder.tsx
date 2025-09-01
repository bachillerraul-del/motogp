import React, { useState, useMemo, useCallback } from 'react';
import type { Rider } from '../types';
import { MOTOGP_RIDERS, TEAM_SIZE, BUDGET } from '../constants';
import { RiderCard } from './RiderCard';
import { TeamSidebar } from './TeamSidebar';
import { CloseIcon } from './Icons';

interface TeamBuilderProps {
    onAddToLeague: (name: string, team: Rider[]) => void;
    showToast: (message: string, type: 'success' | 'error') => void;
}

export const TeamBuilder: React.FC<TeamBuilderProps> = ({ onAddToLeague, showToast }) => {
    const [team, setTeam] = useState<Rider[]>([]);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    const teamTotalPrice = useMemo(() => {
        return team.reduce((sum, rider) => sum + rider.price, 0);
    }, [team]);

    const remainingBudget = useMemo(() => BUDGET - teamTotalPrice, [teamTotalPrice]);

    const addRiderToTeam = useCallback((rider: Rider) => {
        if (rider.condition?.includes('unavailable') || rider.condition?.includes('injured')) {
            return; // Defensive check
        }
        if (team.length >= TEAM_SIZE) {
            showToast('Tu equipo ya está lleno. No puedes añadir más de 5 pilotos.', 'error');
            return;
        }
        if (team.find(r => r.id === rider.id)) {
            showToast('Este piloto ya está en tu equipo.', 'error');
            return;
        }
        if (rider.price > remainingBudget) {
            showToast(`No puedes añadir a ${rider.name}. Excederías el presupuesto.`, 'error');
            return;
        }
        setTeam(prevTeam => [...prevTeam, rider]);
        showToast(`${rider.name} añadido al equipo.`, 'success');
    }, [team, remainingBudget, showToast, setTeam]);

    const removeRiderFromTeam = useCallback((rider: Rider) => {
        setTeam(prevTeam => prevTeam.filter(r => r.id !== rider.id));
        showToast(`${rider.name} quitado del equipo.`, 'success');
    }, [setTeam, showToast]);

    const handleShare = () => {
        const riderList = team.map((r, index) => 
            `${index + 1}. ${r.name} (${r.team})`
        ).join('\n');
        
        const teamPrice = team.reduce((sum, rider) => sum + rider.price, 0).toFixed(2);

        const message = `🏁 ¡Mi equipo de MotoGP Fantasy! 🏁\n\n*Coste Total: $${teamPrice}m*\n\n*Pilotos:*\n${riderList}\n\nCrea tu propio equipo aquí.`;
        
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleAddToLeague = () => {
        const participantName = window.prompt("Introduce el nombre del participante para esta liga:");
        if (participantName && participantName.trim() !== "") {
            onAddToLeague(participantName.trim(), team);
            setTeam([]); // Clear the current team after adding to the league
        } else if (participantName !== null) { // User clicked OK but left it empty
            showToast('El nombre del participante no puede estar vacío.', 'error');
        }
    };
    
    const sortedRiders = useMemo(() => 
        [...MOTOGP_RIDERS].sort((a, b) => b.price - a.price), 
    []);

    const availableRiders = useMemo(() => {
        const teamIds = new Set(team.map(r => r.id));
        return sortedRiders.filter(r => !teamIds.has(r.id));
    }, [team, sortedRiders]);

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
                            onAdd={() => addRiderToTeam(rider)} 
                            isTeamFull={team.length >= TEAM_SIZE}
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
                        onRemoveRider={removeRiderFromTeam}
                        onShare={handleShare}
                        onAddToLeague={handleAddToLeague}
                   />
                </div>
            </aside>

            {/* Mobile Fixed Footer & Sidebar */}
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
                        <p className="text-sm text-gray-400">Restante: <span className="font-mono font-bold text-white">${remainingBudget.toFixed(2)}m</span></p>
                    </div>
                    <button className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg pointer-events-none">
                        Ver Mi Equipo
                    </button>
                </div>

                {/* Sidebar Overlay/Modal */}
                <div className={`fixed inset-0 z-30 transition-opacity duration-300 ${isMobileSidebarOpen ? 'bg-black/60' : 'bg-transparent pointer-events-none'}`} onClick={() => setIsMobileSidebarOpen(false)} aria-hidden={!isMobileSidebarOpen}>
                    <div 
                        className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ease-in-out ${isMobileSidebarOpen ? 'translate-y-0' : 'translate-y-full'}`}
                        onClick={(e) => e.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-label="Panel de Mi Equipo"
                    >
                        <div className="max-h-[85vh] overflow-y-auto rounded-t-2xl relative">
                             <TeamSidebar 
                                team={team}
                                teamTotalPrice={teamTotalPrice}
                                remainingBudget={remainingBudget}
                                onRemoveRider={removeRiderFromTeam}
                                onShare={handleShare}
                                onAddToLeague={handleAddToLeague}
                             />
                             <button onClick={() => setIsMobileSidebarOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white bg-gray-900/50 rounded-full p-1" aria-label="Cerrar panel de Mi Equipo">
                               <CloseIcon className="w-6 h-6"/>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};