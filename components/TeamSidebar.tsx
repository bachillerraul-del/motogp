import React from 'react';
import type { Rider } from '../types';
import { TEAM_SIZE, BUDGET } from '../constants';
import { TrashIcon, WhatsappIcon } from './Icons';

interface TeamSidebarProps {
    team: Rider[];
    teamTotalPrice: number;
    remainingBudget: number;
    onRemoveRider: (rider: Rider) => void;
    onSaveAndShare: () => void;
}

const TeamMember: React.FC<{rider: Rider, onRemove: () => void}> = ({ rider, onRemove }) => (
    <div className="flex items-center justify-between bg-gray-700 p-2 rounded-md hover:bg-gray-600 transition-colors duration-200">
        <div className="flex items-center">
            <div>
                <p className="font-semibold">{rider.name}</p>
                <p className="text-xs text-gray-400">€{rider.price.toFixed(2)}m - {rider.team}</p>
            </div>
        </div>
        <button onClick={onRemove} aria-label={`Quitar a ${rider.name}`} className="text-gray-400 hover:text-red-500 transition-colors duration-200 p-1">
            <TrashIcon className="w-5 h-5" />
        </button>
    </div>
);

export const TeamSidebar: React.FC<TeamSidebarProps> = ({ team, teamTotalPrice, remainingBudget, onRemoveRider, onSaveAndShare }) => {
    const isTeamComplete = team.length === TEAM_SIZE;

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-2xl space-y-6">
            <h2 className="text-2xl font-bold text-center border-b border-gray-700 pb-3">Mi Equipo</h2>
            
            <div className="text-center">
                <p className="text-5xl font-bold">{team.length}<span className="text-3xl text-gray-400">/{TEAM_SIZE}</span></p>
                <p className="text-gray-400">Pilotos Seleccionados</p>
            </div>

            <div className="border-t border-gray-700 pt-4 space-y-2">
                 <h3 className="text-lg font-semibold text-center mb-3">Presupuesto</h3>
                 <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Inicial:</span>
                    <span className="font-mono">€{BUDGET.toFixed(2)}m</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Coste Equipo:</span>
                    <span className="font-mono font-semibold">€{teamTotalPrice.toFixed(2)}m</span>
                </div>
                <div className="bg-gray-900/50 p-2 rounded-md mt-2">
                    <div className="flex justify-between items-center">
                        <span className="text-gray-300 font-bold">Restante:</span>
                        <span className={`font-mono font-bold text-2xl ${remainingBudget < 0 ? 'text-red-500' : 'text-green-400'}`}>
                            €{remainingBudget.toFixed(2)}m
                        </span>
                    </div>
                </div>
            </div>

            <div className="space-y-3 min-h-[260px] border-t border-gray-700 pt-4">
                {team.length > 0 ? (
                    team.map(rider => (
                        <TeamMember key={rider.id} rider={rider} onRemove={() => onRemoveRider(rider)} />
                    ))
                ) : (
                    <div className="flex items-center justify-center h-full pt-10">
                        <p className="text-gray-500 text-center">Selecciona pilotos de la lista para empezar.</p>
                    </div>
                )}
            </div>
            
            <div className="border-t border-gray-700 pt-6 space-y-3">
                 <button
                    onClick={onSaveAndShare}
                    disabled={!isTeamComplete}
                    className="w-full flex items-center justify-center bg-green-500 text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 hover:bg-green-600 disabled:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    <WhatsappIcon className="w-6 h-6 mr-3" />
                    Guardar y Compartir
                </button>
                {!isTeamComplete && <p className="text-xs text-gray-400 text-center mt-2">Completa tu equipo de 5 pilotos para habilitar la acción.</p>}
            </div>
        </div>
    );
};