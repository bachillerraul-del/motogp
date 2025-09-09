import React, { useState, useEffect } from 'react';
import type { Rider, Race } from '../types';
import { PencilIcon, MagnifyingGlassIcon } from './Icons';
import { Modal } from './Modal';
import { fetchRaceResultsFromAI } from '../services/geminiService';

type AllRiderPoints = Record<number, Record<number, number>>;

interface AdminPanelProps {
    races: Race[];
    selectedRace: Race | null;
    onSelectRace: (race: Race) => void;
    onUpdateRace: (race: Race) => Promise<void>;
    onClearPoints: () => void;
    riders: Rider[];
    riderPoints: AllRiderPoints;
    onPointChange: (riderId: number, points: string) => Promise<void>;
    onUpdateRider: (rider: Rider) => Promise<void>;
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
        races, selectedRace, onSelectRace, onUpdateRace, onClearPoints,
        riders, riderPoints, onPointChange, onUpdateRider, showToast
    } = props;

    const [editedRaceDate, setEditedRaceDate] = useState('');
    const [editingRider, setEditingRider] = useState<Rider | null>(null);
    const [riderFormData, setRiderFormData] = useState<Rider | null>(null);
    const [isFetchingPoints, setIsFetchingPoints] = useState(false);


    useEffect(() => {
        setEditedRaceDate(formatDatetimeLocal(selectedRace?.race_date));
    }, [selectedRace]);
    
    useEffect(() => {
        if (editingRider) {
            setRiderFormData(editingRider);
        } else {
            setRiderFormData(null);
        }
    }, [editingRider]);
    
    const handleRaceDateChange = () => {
        if (!selectedRace) return;
        const newDate = editedRaceDate ? new Date(editedRaceDate).toISOString() : null;
        if (newDate) {
            onUpdateRace({ ...selectedRace, race_date: newDate });
        } else {
            showToast('La fecha no puede estar vacía.', 'error');
        }
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

    const handleSaveRider = async (e: React.FormEvent) => {
        e.preventDefault();
        if (riderFormData) {
            try {
                await onUpdateRider(riderFormData);
                setEditingRider(null);
            } catch (error) {
                // Error toast is handled in the App component's function
                console.error("Failed to save rider:", error);
            }
        }
    };
    
    const normalizeString = (str: string) => 
        str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const handleFetchPointsWithAI = async () => {
        if (!selectedRace) {
            showToast('Por favor, selecciona una jornada para buscar los puntos.', 'error');
            return;
        }
        setIsFetchingPoints(true);
        try {
            const riderNames = riders.map(r => r.name);
            const currentYear = new Date().getFullYear();
            const aiResults = await fetchRaceResultsFromAI(selectedRace.gp_name, riderNames, currentYear);
            
            if (!aiResults || aiResults.length === 0) {
                showToast('La IA no devolvió resultados para esta jornada.', 'success');
                return;
            }

            let updatedCount = 0;
            const notFoundNames: string[] = [];
            
            const riderNameMap = new Map(riders.map(r => [normalizeString(r.name), r]));

            const updates = aiResults.map(result => {
                const normalizedName = normalizeString(result.riderName);
                const rider = riderNameMap.get(normalizedName);
                if (rider) {
                    updatedCount++;
                    return onPointChange(rider.id, String(result.points));
                } else {
                    notFoundNames.push(result.riderName);
                    return Promise.resolve();
                }
            });
            
            await Promise.all(updates);

            let message = `IA actualizó los puntos de ${updatedCount} pilotos.`;
            if (notFoundNames.length > 0) {
                message += ` No se encontraron: ${notFoundNames.join(', ')}.`;
            }
            showToast(message, updatedCount > 0 ? 'success' : 'error');

        } catch (error) {
            console.error("Error fetching points from AI:", error);
            showToast('Error al buscar puntos con la IA.', 'error');
        } finally {
            setIsFetchingPoints(false);
        }
    };


    const currentRiderPoints = selectedRace ? riderPoints[selectedRace.id] || {} : {};

    return (
        <aside className="w-full lg:w-1/3">
            <div className="bg-gray-800 p-4 rounded-lg shadow-lg sticky top-24 space-y-4">
                {/* Rider Editor */}
                <div>
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

                {/* Points Editor */}
                <div className="border-t border-gray-700 pt-4">
                     <div className="flex justify-between items-center mb-2">
                        <h2 className="text-xl font-bold">Editar Puntos</h2>
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handleFetchPointsWithAI} 
                                disabled={!selectedRace || isFetchingPoints} 
                                className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isFetchingPoints ? (
                                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <MagnifyingGlassIcon className="w-4 h-4" />
                                )}
                                <span>{isFetchingPoints ? 'Buscando...' : 'Buscar Puntos'}</span>
                            </button>
                            <button onClick={onClearPoints} disabled={!selectedRace} className="text-sm text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Limpiar</button>
                        </div>
                    </div>
                    <select
                        value={selectedRace?.id ?? ''}
                        onChange={(e) => {
                            const race = races.find(r => r.id === Number(e.target.value));
                            if (race) onSelectRace(race);
                        }}
                        className="w-full bg-gray-900 text-white p-2 rounded-md mb-2"
                        disabled={races.length === 0}
                    >
                        <option value="" disabled>{races.length === 0 ? 'No hay carreras en el calendario' : 'Selecciona jornada...'}</option>
                        {races.map(race => <option key={race.id} value={race.id}>{race.gp_name}</option>)}
                    </select>

                    {selectedRace && (
                        <div className="mt-2">
                            <label htmlFor="round-date" className="block text-sm font-medium text-gray-300 mb-1">Fecha Límite (Cierre de Mercado)</label>
                            <input
                                id="round-date"
                                type="datetime-local"
                                value={editedRaceDate}
                                onChange={(e) => setEditedRaceDate(e.target.value)}
                                onBlur={handleRaceDateChange}
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
                                            value={currentRiderPoints[rider.id] ?? ''}
                                            onChange={(e) => onPointChange(rider.id, e.target.value)}
                                            className="w-full bg-gray-700 text-white p-1 rounded-md text-right focus:outline-none focus:ring-2 focus:ring-red-500"
                                            placeholder="0"
                                            disabled={!selectedRace}
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