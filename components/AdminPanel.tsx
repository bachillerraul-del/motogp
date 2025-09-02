import React, { useState, useEffect } from 'react';
import type { Rider, Round, LeagueSettings } from '../types';
import { PlusIcon } from './Icons';

type AllRiderPoints = Record<number, Record<number, number>>;

interface AdminPanelProps {
    rounds: Round[];
    onAddRound: (roundName: string) => Promise<void>;
    selectedRound: Round | null;
    onSelectRound: (round: Round) => void;
    onUpdateRound: (round: Round) => Promise<void>;
    onClearPoints: () => void;
    riders: Rider[];
    riderPoints: AllRiderPoints;
    onPointChange: (riderId: number, points: string) => Promise<void>;
    leagueSettings: LeagueSettings | null;
    onUpdateMarketDeadline: (deadline: string | null) => Promise<void>;
    showToast: (message: string, type: 'success' | 'error') => void;
}

const formatDatetimeLocal = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    // Adjust for timezone offset to display correctly in the input
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - timezoneOffset);
    return localDate.toISOString().slice(0, 16);
};

export const AdminPanel: React.FC<AdminPanelProps> = (props) => {
    const {
        rounds, onAddRound, selectedRound, onSelectRound, onUpdateRound, onClearPoints,
        riders, riderPoints, onPointChange, leagueSettings, onUpdateMarketDeadline, showToast
    } = props;

    const [newRoundName, setNewRoundName] = useState('');
    const [editedRoundDate, setEditedRoundDate] = useState('');
    const [marketDeadline, setMarketDeadline] = useState('');

    useEffect(() => {
        setEditedRoundDate(formatDatetimeLocal(selectedRound?.round_date));
    }, [selectedRound]);
    
    useEffect(() => {
        setMarketDeadline(formatDatetimeLocal(leagueSettings?.market_deadline));
    }, [leagueSettings]);

    const handleAddNewRound = () => {
        if (newRoundName.trim() === '') {
            showToast('El nombre de la jornada no puede estar vacío.', 'error');
            return;
        }
        onAddRound(newRoundName.trim());
        setNewRoundName('');
    };
    
    const handleRoundDateChange = () => {
        if (!selectedRound) return;
        const newDate = editedRoundDate ? new Date(editedRoundDate).toISOString() : null;
        onUpdateRound({ ...selectedRound, round_date: newDate });
    };

    const handleDeadlineChange = () => {
        const newDeadline = marketDeadline ? new Date(marketDeadline).toISOString() : null;
        onUpdateMarketDeadline(newDeadline);
    };

    const currentRiderPoints = selectedRound ? riderPoints[selectedRound.id] || {} : {};

    return (
        <aside className="w-full lg:w-1/3">
            <div className="bg-gray-800 p-4 rounded-lg shadow-lg sticky top-24 space-y-4">
                {/* League Settings */}
                 <div>
                    <h2 className="text-xl font-bold mb-2">Ajustes de la Liga</h2>
                    <label htmlFor="market-deadline" className="block text-sm font-medium text-gray-300 mb-1">Cierre de Mercado Global</label>
                    <div className="flex gap-2">
                        <input
                            id="market-deadline"
                            type="datetime-local"
                            value={marketDeadline}
                            onChange={(e) => setMarketDeadline(e.target.value)}
                            onBlur={handleDeadlineChange}
                            className="w-full bg-gray-900 text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                    </div>
                </div>

                {/* Round Creator */}
                <div className="border-t border-gray-700 pt-4">
                    <h2 className="text-xl font-bold mb-2">Jornadas</h2>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newRoundName}
                            onChange={(e) => setNewRoundName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddNewRound()}
                            placeholder="Nombre de la Jornada (ej. GP Qatar)"
                            className="flex-grow bg-gray-900 text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                        />
                        <button onClick={handleAddNewRound} className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-md transition-colors"><PlusIcon className="w-6 h-6"/></button>
                    </div>
                </div>

                {/* Points Editor */}
                <div className="border-t border-gray-700 pt-4">
                    <div className="flex justify-between items-center mb-2">
                        <h2 className="text-xl font-bold">Editar Puntos</h2>
                        <button onClick={onClearPoints} disabled={!selectedRound} className="text-sm text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Limpiar Puntos</button>
                    </div>
                    <select
                        value={selectedRound?.id ?? ''}
                        onChange={(e) => {
                            const round = rounds.find(r => r.id === Number(e.target.value));
                            if (round) onSelectRound(round);
                        }}
                        className="w-full bg-gray-900 text-white p-2 rounded-md mb-2"
                        disabled={rounds.length === 0}
                    >
                        <option value="" disabled>{rounds.length === 0 ? 'Crea una jornada primero' : 'Selecciona jornada...'}</option>
                        {rounds.map(round => <option key={round.id} value={round.id}>{round.name}</option>)}
                    </select>

                    {selectedRound && (
                        <div className="mt-2">
                            <label htmlFor="round-date" className="block text-sm font-medium text-gray-300 mb-1">Fecha Límite de la Jornada</label>
                            <input
                                id="round-date"
                                type="datetime-local"
                                value={editedRoundDate}
                                onChange={(e) => setEditedRoundDate(e.target.value)}
                                onBlur={handleRoundDateChange}
                                className="w-full bg-gray-900 text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>
                    )}

                    <div className="max-h-[45vh] overflow-y-auto pr-2 mt-4">
                        <div className="space-y-2">
                            {riders.map(rider => (
                                <div key={rider.id} className="flex items-center justify-between text-sm">
                                    <label htmlFor={`rider-${rider.id}`} className="flex-grow mr-2 truncate">{rider.name}</label>
                                    <input
                                        id={`rider-${rider.id}`}
                                        type="number"
                                        value={currentRiderPoints[rider.id] || ''}
                                        onChange={(e) => onPointChange(rider.id, e.target.value)}
                                        className="w-20 bg-gray-900 text-white p-1 rounded-md text-right focus:outline-none focus:ring-2 focus:ring-red-500"
                                        placeholder="0"
                                        disabled={!selectedRound}
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
};
