import React, { useState, useMemo, useCallback } from 'react';
import type { Rider } from '../types';
import { MOTOGP_RIDERS, TEAM_SIZE, BUDGET } from '../constants';
import { RiderCard } from './RiderCard';
import { TeamSidebar } from './TeamSidebar';

export const TeamBuilder: React.FC = () => {
    const [team, setTeam] = useState<Rider[]>([]);

    const teamTotalPrice = useMemo(() => {
        return team.reduce((sum, rider) => sum + rider.price, 0);
    }, [team]);

    const remainingBudget = useMemo(() => BUDGET - teamTotalPrice, [teamTotalPrice]);

    const addRiderToTeam = useCallback((rider: Rider) => {
        if (rider.condition?.includes('unavailable') || rider.condition?.includes('injured')) {
            return; // Defensive check, though button should be disabled
        }
        if (team.length >= TEAM_SIZE) {
            alert('Tu equipo ya está lleno. No puedes añadir más de 5 pilotos.');
            return;
        }
        if (team.find(r => r.id === rider.id)) {
            alert('Este piloto ya está en tu equipo.');
            return;
        }
        if (rider.price > remainingBudget) {
            alert(`No puedes añadir a ${rider.name}. Excederías tu presupuesto de $${BUDGET.toFixed(2)}m.`);
            return;
        }
        setTeam(prevTeam => [...prevTeam, rider]);
    }, [team, remainingBudget]);

    const removeRiderFromTeam = useCallback((rider: Rider) => {
        setTeam(prevTeam => prevTeam.filter(r => r.id !== rider.id));
    }, []);

    const handleShare = () => {
        const riderList = team.map((r, index) => 
            `${index + 1}. ${r.name} (${r.team})`
        ).join('\n');
        
        const teamPrice = team.reduce((sum, rider) => sum + rider.price, 0).toFixed(2);

        const message = `🏁 ¡Mi equipo de MotoGP Fantasy! 🏁\n\n*Coste Total: $${teamPrice}m*\n\n*Pilotos:*\n${riderList}\n\nCrea tu propio equipo aquí.`;
        
        const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
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
            <div className="flex-grow">
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

            {/* Team Sidebar */}
            <aside className="w-full lg:w-1/3 xl:w-1/4">
                <div className="sticky top-24">
                   <TeamSidebar 
                        team={team}
                        teamTotalPrice={teamTotalPrice}
                        remainingBudget={remainingBudget}
                        onRemoveRider={removeRiderFromTeam}
                        onShare={handleShare}
                   />
                </div>
            </aside>
        </div>
    );
};