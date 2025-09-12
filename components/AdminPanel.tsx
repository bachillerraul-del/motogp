import React, { useState, useEffect, useMemo } from 'react';
import type { Rider, Race, Sport } from '../types';
import { PencilIcon, MagnifyingGlassIcon, SparklesIcon } from './Icons';
import { Modal } from './Modal';
import { fetchMotogpRacePositionsFromAI, fetchF1RacePositionsFromAI } from '../services/geminiService';
import { MOTOGP_MAIN_RACE_POINTS, MOTOGP_SPRINT_RACE_POINTS, F1_MAIN_RACE_POINTS, F1_SPRINT_RACE_POINTS } from '../constants';

type AllRiderPoints = Record<number, Record<number, number>>;

interface AdminPanelProps {
    races: Race[];
    selectedRace: Race | null;
    onSelectRace: (race: Race) => void;
    onUpdateRace: (race: Race) => Promise<void>;
    onClearPoints: () => void;
    riders: Rider[];
    riderPoints: AllRiderPoints;
    onUpdateRider: (rider: Rider) => Promise<void>;
    onBulkUpdatePoints: (roundId: number, newPoints: Map<number, number>, previousRiderIds: number[]) => Promise<void>;
    // FIX: Added 'info' to the toast types to support informational messages.
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
    sport: Sport;
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
        riders, riderPoints, onUpdateRider, onBulkUpdatePoints, showToast, sport
    } = props;

    const [editedRaceDate, setEditedRaceDate] = useState('');
    const [editingRider, setEditingRider] = useState<Rider | null>(null);
    const [riderFormData, setRiderFormData] = useState<Rider | null>(null);
    const [isFetchingPoints, setIsFetchingPoints] = useState(false);
    
    // MotoGP specific state
    const [mainRaceResults, setMainRaceResults] = useState<string[]>(Array(15).fill(''));
    const [sprintRaceResults, setSprintRaceResults] = useState<string[]>(Array(9).fill(''));
    
    // F1 specific state
    const [f1MainRaceResults, setF1MainRaceResults] = useState<string[]>(Array(10).fill(''));
    const [f1SprintRaceResults, setF1SprintRaceResults] = useState<string[]>(Array(8).fill(''));
    
    const [isSavingResults, setIsSavingResults] = useState(false);


    useEffect(() => {
        setEditedRaceDate(formatDatetimeLocal(selectedRace?.race_date));
         if(sport === 'motogp') {
            setMainRaceResults(Array(15).fill(''));
            setSprintRaceResults(Array(9).fill(''));
        } else if (sport === 'f1') {
            setF1MainRaceResults(Array(10).fill(''));
            setF1SprintRaceResults(Array(8).fill(''));
        }
    }, [selectedRace, sport]);
    
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
                condition: value === '' ? null : value,
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

    const handleFetchWithAI = async () => {
        if (!selectedRace) {
            showToast('Por favor, selecciona una jornada para buscar.', 'error');
            return;
        }
        setIsFetchingPoints(true);
        try {
            if (sport === 'motogp') {
                await fetchMotoGPResultsWithAI();
            } else if (sport === 'f1') {
                await fetchF1ResultsWithAI();
            }
        } catch (error) {
            console.error("Error fetching data from AI:", error);
            showToast('Error al buscar datos con la IA.', 'error');
        } finally {
            setIsFetchingPoints(false);
        }
    };
        
    const fetchMotoGPResultsWithAI = async () => {
        if (!selectedRace) return;
        const riderNames = riders.map(r => r.name);
        const currentYear = new Date().getFullYear();
        const aiResults = await fetchMotogpRacePositionsFromAI(selectedRace.gp_name, riderNames, currentYear);
        
        if (!aiResults || (aiResults.mainRace.length === 0 && aiResults.sprintRace.length === 0)) {
            showToast('La IA no devolvió resultados para esta jornada.', 'success');
            return;
        }

        const riderNameMap = new Map(riders.map(r => [normalizeString(r.name), r]));
        
        const newMainResults = Array(15).fill('');
        const newSprintResults = Array(9).fill('');
        let foundMain = 0;
        let foundSprint = 0;

        aiResults.mainRace.forEach(res => {
            const rider = riderNameMap.get(normalizeString(res.riderName));
            if (rider && res.position > 0 && res.position <= 15) {
                newMainResults[res.position - 1] = String(rider.id);
                foundMain++;
            }
        });
        
        aiResults.sprintRace.forEach(res => {
            const rider = riderNameMap.get(normalizeString(res.riderName));
            if (rider && res.position > 0 && res.position <= 9) {
                newSprintResults[res.position - 1] = String(rider.id);
                foundSprint++;
            }
        });

        setMainRaceResults(newMainResults);
        setSprintRaceResults(newSprintResults);
        showToast(`IA encontró ${foundMain} resultados de carrera y ${foundSprint} de sprint.`, 'success');
    };

    const fetchF1ResultsWithAI = async () => {
        if (!selectedRace) return;
        const riderNames = riders.map(r => r.name);
        const currentYear = new Date().getFullYear();
        const aiResults = await fetchF1RacePositionsFromAI(selectedRace.gp_name, riderNames, currentYear);

        if (!aiResults || (aiResults.mainRace.length === 0 && aiResults.sprintRace.length === 0)) {
            showToast('La IA no devolvió resultados para esta jornada.', 'success');
            return;
        }

        const riderNameMap = new Map(riders.map(r => [normalizeString(r.name), r]));
        
        const newMainResults = Array(10).fill('');
        const newSprintResults = Array(8).fill('');
        let foundMain = 0;
        let foundSprint = 0;

        aiResults.mainRace.forEach(res => {
            const rider = riderNameMap.get(normalizeString(res.riderName));
            if (rider && res.position > 0 && res.position <= 10) {
                newMainResults[res.position - 1] = String(rider.id);
                foundMain++;
            }
        });
        
        aiResults.sprintRace.forEach(res => {
            const rider = riderNameMap.get(normalizeString(res.riderName));
            if (rider && res.position > 0 && res.position <= 8) {
                newSprintResults[res.position - 1] = String(rider.id);
                foundSprint++;
            }
        });

        setF1MainRaceResults(newMainResults);
        setF1SprintRaceResults(newSprintResults);
        showToast(`IA encontró ${foundMain} resultados de carrera y ${foundSprint} de sprint.`, 'success');
    };

    const handleSaveMotoGPResults = async () => {
        if (!selectedRace) return;

        setIsSavingResults(true);
        const pointsMap = new Map<number, number>();

        mainRaceResults.forEach((riderIdStr, index) => {
            if (riderIdStr) {
                const riderId = parseInt(riderIdStr, 10);
                const currentPoints = pointsMap.get(riderId) || 0;
                pointsMap.set(riderId, currentPoints + MOTOGP_MAIN_RACE_POINTS[index]);
            }
        });
        
        sprintRaceResults.forEach((riderIdStr, index) => {
            if (riderIdStr) {
                const riderId = parseInt(riderIdStr, 10);
                const currentPoints = pointsMap.get(riderId) || 0;
                pointsMap.set(riderId, currentPoints + MOTOGP_SPRINT_RACE_POINTS[index]);
            }
        });
        
        const previousRiderIds = Object.keys(riderPoints[selectedRace.id] || {}).map(Number);
        
        await onBulkUpdatePoints(selectedRace.id, pointsMap, previousRiderIds);
        setIsSavingResults(false);
    };
    
    const handleSaveF1Results = async () => {
        if (!selectedRace) return;

        setIsSavingResults(true);
        const pointsMap = new Map<number, number>();

        f1MainRaceResults.forEach((riderIdStr, index) => {
            if (riderIdStr) {
                const riderId = parseInt(riderIdStr, 10);
                const currentPoints = pointsMap.get(riderId) || 0;
                pointsMap.set(riderId, currentPoints + F1_MAIN_RACE_POINTS[index]);
            }
        });
        
        f1SprintRaceResults.forEach((riderIdStr, index) => {
            if (riderIdStr) {
                const riderId = parseInt(riderIdStr, 10);
                const currentPoints = pointsMap.get(riderId) || 0;
                pointsMap.set(riderId, currentPoints + F1_SPRINT_RACE_POINTS[index]);
            }
        });
        
        const previousRiderIds = Object.keys(riderPoints[selectedRace.id] || {}).map(Number);
        
        await onBulkUpdatePoints(selectedRace.id, pointsMap, previousRiderIds);
        setIsSavingResults(false);
    };

    const sortedRiders = useMemo(() => [...riders].sort((a, b) => a.name.localeCompare(b.name)), [riders]);
    const sortedRaces = [...races].sort((a,b) => a.round - b.round);
    
    const theme = {
        focusRing: sport === 'f1' ? 'focus:ring-red-500' : 'focus:ring-orange-500',
        button: sport === 'f1' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600',
        hoverText: sport === 'f1' ? 'hover:text-red-500' : 'hover:text-orange-500',
    };
    
    const renderResultSelects = (
        title: string,
        count: number,
        results: string[],
        setResults: React.Dispatch<React.SetStateAction<string[]>>
    ) => {
        const handleSelectChange = (index: number, riderId: string) => {
            const newResults = [...results];
            newResults[index] = riderId;
            setResults(newResults);
        };
        
        const selectedIds = new Set(results.filter(Boolean));

        return (
            <div className="space-y-3">
                 <h3 className="text-lg font-bold text-gray-200">{title}</h3>
                {Array.from({ length: count }).map((_, i) => {
                    const currentSelection = results[i];
                    return (
                        <div key={i} className="flex items-center gap-2">
                            <label className="w-10 text-right text-gray-400 font-semibold">{i + 1}º</label>
                            <select
                                value={currentSelection}
                                onChange={(e) => handleSelectChange(i, e.target.value)}
                                className={`w-full bg-gray-700 text-white p-1 rounded-md text-sm focus:outline-none focus:ring-1 ${theme.focusRing}`}
                            >
                                <option value="">- Seleccionar piloto -</option>
                                {sortedRiders.map(r => (
                                    <option 
                                        key={r.id} 
                                        value={r.id}
                                        disabled={selectedIds.has(String(r.id)) && currentSelection !== String(r.id)}
                                    >
                                        {r.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    );
                })}
            </div>
        )
    };

    return (
        <div className="space-y-4">
            {/* Rider Editor */}
            <div>
                <h2 className="text-xl font-bold mb-2">Editar Pilotos</h2>
                <div className="max-h-[25vh] overflow-y-auto pr-2 space-y-2">
                    {riders.map(rider => (
                        <div key={rider.id} className="bg-gray-900/50 p-2 rounded-md flex justify-between items-center">
                            <div>
                                <p className="font-semibold">{rider.name}</p>
                                <p className="text-xs text-gray-400">
                                    {sport === 'f1' ? `$${(rider.price/10).toFixed(1)}M` : `€${rider.price.toLocaleString('es-ES')}`}
                                </p>
                            </div>
                            <button onClick={() => setEditingRider(rider)} className="p-2 text-gray-400 hover:text-white transition-colors">
                                <PencilIcon className="w-5 h-5"/>
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* Points/Results Editor */}
            <div className="border-t border-gray-700 pt-4">
                 <div className="flex justify-between items-center mb-2">
                    <h2 className="text-xl font-bold">Editar Resultados</h2>
                    <div className="flex items-center gap-2">
                        <button 
                            onClick={handleFetchWithAI} 
                            disabled={!selectedRace || isFetchingPoints} 
                            className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isFetchingPoints ? (
                                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                <SparklesIcon className="w-4 h-4" />
                            )}
                            <span>{isFetchingPoints ? 'Buscando...' : 'Buscar Resultados'}</span>
                        </button>
                        <button onClick={onClearPoints} disabled={!selectedRace} className={`text-sm text-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${theme.hoverText}`}>Limpiar</button>
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
                    {sortedRaces.map(race => <option key={race.id} value={race.id}>{race.gp_name}</option>)}
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
                            className={`w-full bg-gray-900 text-white p-2 rounded-md focus:outline-none focus:ring-2 ${theme.focusRing}`}
                        />
                    </div>
                )}

                <div className="max-h-[45vh] overflow-y-auto pr-2 mt-4">
                    {sport === 'motogp' && (
                        <div className="space-y-6">
                            {renderResultSelects("Carrera Principal (Top 15)", 15, mainRaceResults, setMainRaceResults)}
                            {renderResultSelects("Carrera Sprint (Top 9)", 9, sprintRaceResults, setSprintRaceResults)}
                            <button
                                onClick={handleSaveMotoGPResults}
                                disabled={!selectedRace || isSavingResults}
                                className={`w-full mt-4 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 disabled:bg-gray-600 ${theme.button}`}
                            >
                                {isSavingResults ? 'Guardando...' : 'Guardar Resultados'}
                            </button>
                        </div>
                    )}
                    {sport === 'f1' && (
                         <div className="space-y-6">
                            {renderResultSelects("Carrera Principal (Top 10)", 10, f1MainRaceResults, setF1MainRaceResults)}
                            {renderResultSelects("Carrera Sprint (Top 8)", 8, f1SprintRaceResults, setF1SprintRaceResults)}
                            <button
                                onClick={handleSaveF1Results}
                                disabled={!selectedRace || isSavingResults}
                                className={`w-full mt-4 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 disabled:bg-gray-600 ${theme.button}`}
                            >
                                {isSavingResults ? 'Guardando...' : 'Guardar Resultados'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
            
            <Modal isOpen={!!editingRider} onClose={() => setEditingRider(null)} title={`Editar ${editingRider?.name}`} sport={sport}>
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
                            <label htmlFor="rider-bike" className="block text-sm font-medium text-gray-300 mb-1">Motor</label>
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
                                className={`w-full bg-gray-900 text-white p-2 rounded-md focus:outline-none focus:ring-2 ${theme.focusRing}`}
                            >
                                <option value="">Disponible</option>
                                <option value="Rider is injured">Lesionado</option>
                                <option value="Rider is unavailable">No Disponible</option>
                            </select>
                        </div>
                        <div className="flex justify-end gap-3 pt-2">
                             <button type="button" onClick={() => setEditingRider(null)} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancelar</button>
                             <button type="submit" className={`text-white font-bold py-2 px-4 rounded-lg ${theme.button}`}>Guardar Cambios</button>
                        </div>
                    </form>
                )}
            </Modal>
        </div>
    );
};
