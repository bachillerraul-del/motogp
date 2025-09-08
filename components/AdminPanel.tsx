import React, { useState, useEffect } from 'react';
import type { Rider, Round, LeagueSettings, Participant, TeamSnapshot } from '../types';
import { PlusIcon, PencilIcon, SparklesIcon, MagnifyingGlassIcon } from './Icons';
import { Modal } from './Modal';
import { suggestRiderPriceChanges, fetchRaceResultsFromAI, AISuggestion } from '../services/geminiService';

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
    onUpdateRider: (rider: Rider) => Promise<void>;
    showToast: (message: string, type: 'success' | 'error') => void;
    participants: Participant[];
    teamSnapshots: TeamSnapshot[];
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
        riders, riderPoints, onPointChange, leagueSettings, onUpdateMarketDeadline, onUpdateRider, showToast,
        participants, teamSnapshots
    } = props;

    const [newRoundName, setNewRoundName] = useState('');
    const [editedRoundDate, setEditedRoundDate] = useState('');
    const [marketDeadline, setMarketDeadline] = useState('');
    const [editingRider, setEditingRider] = useState<Rider | null>(null);
    const [riderFormData, setRiderFormData] = useState<Rider | null>(null);

    // AI Price Suggestion State
    const [isSuggestingPrices, setIsSuggestingPrices] = useState(false);
    const [aiSuggestions, setAiSuggestions] = useState<AISuggestion[]>([]);
    const [isSuggestionModalOpen, setIsSuggestionModalOpen] = useState(false);
    const [aiRoundId, setAiRoundId] = useState<string>('');
    const [isFetchingPoints, setIsFetchingPoints] = useState(false);


    useEffect(() => {
        setEditedRoundDate(formatDatetimeLocal(selectedRound?.round_date));
    }, [selectedRound]);
    
    useEffect(() => {
        setMarketDeadline(formatDatetimeLocal(leagueSettings?.market_deadline));
    }, [leagueSettings]);
    
    useEffect(() => {
        if (rounds.length > 0 && !aiRoundId) {
            const latestRound = [...rounds].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
            setAiRoundId(String(latestRound.id));
        }
    }, [rounds, aiRoundId]);

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

    const handleSuggestPrices = async () => {
        if (!aiRoundId) {
            showToast('Por favor, selecciona una jornada para analizar.', 'error');
            return;
        }
        const roundToEvaluate = rounds.find(r => r.id === Number(aiRoundId));
        if (!roundToEvaluate) {
            showToast('La jornada seleccionada no es válida.', 'error');
            return;
        }

        setIsSuggestingPrices(true);
        try {
            const suggestions = await suggestRiderPriceChanges(
                riders,
                participants,
                teamSnapshots,
                roundToEvaluate,
                riderPoints
            );
            if (suggestions && suggestions.length > 0) {
                setAiSuggestions(suggestions);
                setIsSuggestionModalOpen(true);
            } else {
                showToast('La IA no ha sugerido cambios de precios para esta jornada.', 'success');
            }
        } catch (error) {
            console.error("Error getting AI suggestions:", error);
            showToast('No se pudieron obtener las sugerencias de la IA.', 'error');
        } finally {
            setIsSuggestingPrices(false);
        }
    };

    const handleApplySuggestions = async () => {
        const updates = aiSuggestions.map(suggestion => {
            const riderToUpdate = riders.find(r => r.id === suggestion.riderId);
            if (riderToUpdate) {
                // Create a new object for the updated rider
                const updatedRider = { ...riderToUpdate, price: suggestion.newPrice };
                return onUpdateRider(updatedRider);
            }
            return Promise.resolve();
        });
    
        try {
            await Promise.all(updates);
            setIsSuggestionModalOpen(false);
            setAiSuggestions([]);
            // Success toast is shown by onUpdateRider for each rider, but a summary is good.
            showToast('Precios de los pilotos actualizados con las sugerencias de la IA.', 'success');
        } catch (error) {
            console.error("Error applying AI suggestions:", error);
            showToast('Error al aplicar una o más sugerencias.', 'error');
        }
    };
    
    const normalizeString = (str: string) => 
        str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const handleFetchPointsWithAI = async () => {
        if (!selectedRound) {
            showToast('Por favor, selecciona una jornada para buscar los puntos.', 'error');
            return;
        }
        setIsFetchingPoints(true);
        try {
            const riderNames = riders.map(r => r.name);
            const currentYear = new Date().getFullYear();
            const aiResults = await fetchRaceResultsFromAI(selectedRound.name, riderNames, currentYear);
            
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
                    <div className="mt-4">
                        <h3 className="text-md font-semibold text-gray-300 mb-1">Sugerencias de Precios con IA</h3>
                        <div className="flex gap-2">
                             <select
                                value={aiRoundId}
                                onChange={(e) => setAiRoundId(e.target.value)}
                                className="flex-grow bg-gray-900 text-white p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 text-sm"
                                disabled={rounds.length === 0}
                                aria-label="Seleccionar jornada para análisis de IA"
                            >
                                <option value="" disabled>{rounds.length === 0 ? 'Crea una jornada' : 'Seleccionar...'}</option>
                                {rounds.map(round => <option key={round.id} value={round.id}>{round.name}</option>)}
                            </select>
                            <button
                                onClick={handleSuggestPrices}
                                disabled={isSuggestingPrices || !aiRoundId}
                                className="flex-shrink-0 flex items-center justify-center bg-purple-600 text-white font-bold p-2 rounded-lg transition-colors duration-300 hover:bg-purple-700 disabled:bg-gray-600"
                                title="Sugerir precios con IA"
                            >
                                <SparklesIcon className="w-5 h-5" />
                            </button>
                        </div>
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
                        <div className="flex items-center gap-2">
                            <button 
                                onClick={handleFetchPointsWithAI} 
                                disabled={!selectedRound || isFetchingPoints} 
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
                            <button onClick={onClearPoints} disabled={!selectedRound} className="text-sm text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">Limpiar</button>
                        </div>
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

            <Modal isOpen={isSuggestionModalOpen} onClose={() => setIsSuggestionModalOpen(false)} title="Sugerencias de Precios por IA">
                 <div className="space-y-4">
                    <p className="text-gray-300">La IA ha analizado el rendimiento de la última jornada y sugiere los siguientes cambios:</p>
                    <div className="max-h-[50vh] overflow-y-auto pr-2 space-y-3">
                        {aiSuggestions.map(suggestion => {
                            const rider = riders.find(r => r.id === suggestion.riderId);
                            if (!rider) return null;
                            const priceChange = suggestion.newPrice - rider.price;
                            return (
                                <div key={suggestion.riderId} className="bg-gray-900/50 p-3 rounded-lg">
                                    <div className="flex justify-between items-start">
                                        <h4 className="font-bold text-white text-lg">{rider.name}</h4>
                                        <div className="text-right">
                                            <p className="font-mono text-gray-400 line-through">€{rider.price.toLocaleString('es-ES')}</p>
                                            <p className={`font-mono font-bold text-xl ${priceChange > 0 ? 'text-green-400' : 'text-red-500'}`}>
                                                €{suggestion.newPrice.toLocaleString('es-ES')}
                                            </p>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-400 mt-2 italic">"{suggestion.reasoning}"</p>
                                </div>
                            );
                        })}
                    </div>
                     <div className="flex gap-4 pt-4">
                        <button onClick={() => setIsSuggestionModalOpen(false)} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
                        <button onClick={handleApplySuggestions} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">Aplicar Cambios</button>
                    </div>
                 </div>
            </Modal>
        </aside>
    );
};
