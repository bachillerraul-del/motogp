import React, { useState, useEffect } from 'react';
import type { Rider, Round, LeagueSettings } from '../types';
import { PlusIcon, PencilIcon } from './Icons';
import { Modal } from './Modal';

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
    onUpdateRider: (rider: Rider) => void;
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
        riders, riderPoints, onPointChange, leagueSettings, onUpdateMarketDeadline, onUpdateRider, showToast
    } = props;

    const [newRoundName, setNewRoundName] = useState('');
    const [editedRoundDate, setEditedRoundDate] = useState('');
    const [marketDeadline, setMarketDeadline] = useState('');
    const [editingRider, setEditingRider] = useState<Rider | null>(null);
    const [riderFormData, setRiderFormData] = useState<Rider | null>(null);

    useEffect(() => {
        setEditedRoundDate(formatDatetimeLocal(selectedRound?.round_date));
    }, [selectedRound]);
    
    useEffect(() => {
        setMarketDeadline(formatDatetimeLocal(leagueSettings?.market_deadline));
    }, [leagueSettings]);

    useEffect(() => {
        if (editingRider) {
            setRiderFormData(editingRider);
        } else {
            setRiderFormData(null);
        }
    }, [editingRider]);

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

    const handleRiderFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (!riderFormData) return;
        const { name, value } = e.target;

        if (name === 'condition') {
            setRiderFormData({
                ...riderFormData,
                condition: value === '' ? undefined : value,
            });
        } else {
            setRiderFormData({
                ...riderFormData,
                [name]: name === 'price' ? parseInt(value, 10) || 0 : value,
            });
        }
    };

    const handleSaveRider = (e: React.FormEvent) => {
        e.preventDefault();
        if (riderFormData) {
            onUpdateRider(riderFormData);
            setEditingRider(null);
        }
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

                {/* Rider Editor */}
                <div className="border-t border-gray-700 pt-4">
                    <h2 className="text-xl font-bold mb-2">Editar Pilotos</h2>
                    <div className="max-h-[25vh] overflow-y-auto pr-2 space-y-2">
                        {riders.map(rider => (
                            <div key={rider.id} className="bg-gray-900/50 p-2 rounded-md flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">{rider.name}</p>
                                    <p className="text-xs text-gray-400">€{rider.price.toLocaleString('es-ES')}</p>
                                </div>
                                <button onClick={() => setEditingRider(rider)} className="p-2 text-gray-400 hover:text-white transition-colors">
                                    <PencilIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        ))}
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
                        <div className="space-y-3">
                            {riders.map(rider => (
                                <div key={rider.id} className="bg-gray-900/50 p-2 rounded-md">
                                    <label htmlFor={`rider-points-${rider.id}`} className="block text-sm font-semibold mb-1 truncate">{rider.name}</label>
                                     <div className="flex items-center gap-2">
                                        <label htmlFor={`rider-points-${rider.id}`} className="text-gray-400">Puntos:</label>
                                        <input
                                            id={`rider-points-${rider.id}`}
                                            type="number"
                                            value={currentRiderPoints[rider.id] || ''}
                                            onChange={(e) => onPointChange(rider.id, e.target.value)}
                                            className="w-full bg-gray-700 text-white p-1 rounded-md text-right focus:outline-none focus:ring-2 focus:ring-red-500"
                                            placeholder="0"
                                            disabled={!selectedRound}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
            
            <Modal isOpen={!!editingRider} onClose={() => setEditingRider(null)} title={`Editar ${editingRider?.name}`}>
                {riderFormData && (
                    <form onSubmit={handleSaveRider} className="space-y-4">
                         <div>
                            <label htmlFor="rider-name" className="block text-sm font-medium text-gray-300 mb-1">Nombre</label>
                            <input id="rider-name" name="name" type="text" value={riderFormData.name} onChange={handleRiderFormChange} className="w-full bg-gray-900 text-white p-2 rounded-md"/>
                        </div>
                        <div>
                            <label htmlFor="rider-team" className="block text-sm font-medium text-gray-300 mb-1">Equipo</label>
                            <input id="rider-team" name="team" type="text" value={riderFormData.team} onChange={handleRiderFormChange} className="w-full bg-gray-900 text-white p-2 rounded-md"/>
                        </div>
                         <div>
                            <label htmlFor="rider-bike" className="block text-sm font-medium text-gray-300 mb-1">Moto</label>
                            <input id="rider-bike" name="bike" type="text" value={riderFormData.bike} onChange={handleRiderFormChange} className="w-full bg-gray-900 text-white p-2 rounded-md"/>
                        </div>
                        <div>
                            <label htmlFor="rider-price" className="block text-sm font-medium text-gray-300 mb-1">Precio</label>
                            <input id="rider-price" name="price" type="number" value={riderFormData.price} onChange={handleRiderFormChange} className="w-full bg-gray-900 text-white p-2 rounded-md"/>
                        </div>
                        <div>
                            <label htmlFor="rider-condition" className="block text-sm font-medium text-gray-300 mb-1">Estado</label>
                            <select
                                id="rider-condition"
                                name="condition"
                                value={riderFormData.condition || ''}
                                onChange={handleRiderFormChange}
                                className="w-full bg-gray-900 text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                            >
                                <option value="">Disponible</option>
                                <option value="Rider is injured">Lesionado</option>
                                <option value="Rider is unavailable">No Disponible</option>
                            </select>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                             <button type="button" onClick={() => setEditingRider(null)} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
                             <button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg">Guardar Cambios</button>
                        </div>
                    </form>
                )}
            </Modal>
        </aside>
    );
};