import React, { useState, useEffect, useMemo } from 'react';
import type { Rider, Race, Sport, Constructor, Participant, RiderRoundPoints } from '../types';
import { PencilIcon, MagnifyingGlassIcon, SparklesIcon, PlusIcon } from './Icons';
import { EditRiderModal } from './EditRiderModal';
import { createAITeam, fetchMotogpRacePositionsFromAI, fetchF1RacePositionsFromAI } from '../services/geminiService';
import { MOTOGP_MAIN_RACE_POINTS, MOTOGP_SPRINT_RACE_POINTS, F1_MAIN_RACE_POINTS, F1_SPRINT_RACE_POINTS, F1_BUDGET, MOTOGP_BUDGET, F1_RIDER_LIMIT, MOTOGP_RIDER_LIMIT } from '../constants';

type AllRiderPoints = Record<number, Record<number, RiderRoundPoints>>;
type AdminTab = 'races' | 'riders';

interface AdminPanelProps {
    races: Race[];
    selectedRace: Race | null;
    currentRace: Race | null;
    onSelectRace: (race: Race) => void;
    onUpdateRace: (race: Race) => Promise<void>;
    onClearPoints: () => void;
    riders: Rider[];
    constructors: Constructor[];
    participants: Participant[];
    riderPoints: AllRiderPoints;
    onUpdateRider: (rider: Rider) => Promise<void>;
    onCreateRider: (rider: Omit<Rider, 'id'>) => Promise<void>;
    onBulkUpdatePoints: (roundId: number, newPoints: Map<number, { main: number, sprint: number, total: number }>, previousRiderIds: number[]) => Promise<void>;
    addGeminiParticipant: () => Promise<Participant | null>;
    onUpdateTeam: (participantId: number, riders: Rider[], constructor: Constructor, raceId: number) => Promise<boolean>;
    showToast: (message: string, type: 'success' | 'error' | 'info') => void;
    sport: Sport;
}

const formatDatetimeLocal = (dateStr: string | null | undefined): string => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - timezoneOffset);
    return localDate.toISOString().slice(0, 16);
};

export const AdminPanel: React.FC<AdminPanelProps> = (props) => {
    const {
        races, selectedRace, currentRace, onSelectRace, onUpdateRace, onClearPoints,
        riders, constructors, participants, riderPoints, onUpdateRider, onCreateRider,
        onBulkUpdatePoints, addGeminiParticipant, onUpdateTeam, showToast, sport
    } = props;

    const [activeTab, setActiveTab] = useState<AdminTab>('races');
    const [editedRaceDate, setEditedRaceDate] = useState('');
    const [editingRider, setEditingRider] = useState<Rider | 'new' | null>(null);
    const [riderSearch, setRiderSearch] = useState('');
    const [isFetchingPoints, setIsFetchingPoints] = useState(false);
    const [isGeneratingTeam, setIsGeneratingTeam] = useState(false);
    const [isAddingGemini, setIsAddingGemini] = useState(false);
    const [mainRaceResults, setMainRaceResults] = useState<string[]>(Array(15).fill(''));
    const [sprintRaceResults, setSprintRaceResults] = useState<string[]>(Array(9).fill(''));
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

    const handleRaceDateChange = () => {
        if (!selectedRace) return;
        const newDate = editedRaceDate ? new Date(editedRaceDate).toISOString() : null;
        if (newDate) {
            onUpdateRace({ ...selectedRace, race_date: newDate });
        } else {
            showToast('La fecha no puede estar vacía.', 'error');
        }
    };

    const handleSaveRider = async (riderData: Rider | Omit<Rider, 'id'>) => {
        if ('id' in riderData) {
            await onUpdateRider(riderData);
        } else {
            await onCreateRider(riderData);
        }
        setEditingRider(null);
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
            showToast('La IA no devolvió resultados para esta jornada.', 'info');
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
            showToast('La IA no devolvió resultados para esta jornada.', 'info');
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

    const handleSaveResults = async (
        mainResults: string[],
        sprintResults: string[],
        mainPoints: number[],
        sprintPoints: number[]
    ) => {
        if (!selectedRace) return;
        setIsSavingResults(true);
        const pointsBreakdownMap = new Map<number, { main: number, sprint: number, total: number }>();
        const addPoints = (riderId: number, points: number, type: 'main' | 'sprint') => {
            const current = pointsBreakdownMap.get(riderId) || { main: 0, sprint: 0, total: 0 };
            if (type === 'main') current.main += points;
            else current.sprint += points;
            current.total = current.main + current.sprint;
            pointsBreakdownMap.set(riderId, current);
        };
        mainResults.forEach((riderIdStr, index) => {
            if (riderIdStr) addPoints(parseInt(riderIdStr, 10), mainPoints[index], 'main');
        });
        sprintResults.forEach((riderIdStr, index) => {
            if (riderIdStr) addPoints(parseInt(riderIdStr, 10), sprintPoints[index], 'sprint');
        });
        const previousRiderIds = Object.keys(riderPoints[selectedRace.id] || {}).map(Number);
        await onBulkUpdatePoints(selectedRace.id, pointsBreakdownMap, previousRiderIds);
        setIsSavingResults(false);
    };

    const sortedRiders = useMemo(() => [...riders].sort((a, b) => a.name.localeCompare(b.name)), [riders]);
    const filteredRiders = useMemo(() => {
        if (!riderSearch) return sortedRiders;
        return sortedRiders.filter(r => r.name.toLowerCase().includes(riderSearch.toLowerCase()));
    }, [sortedRiders, riderSearch]);

    const sortedRaces = [...races].sort((a,b) => a.round - b.round);
    const theme = {
        focusRing: sport === 'f1' ? 'focus:ring-red-500' : 'focus:ring-orange-500',
        button: sport === 'f1' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600',
        hoverText: sport === 'f1' ? 'hover:text-red-500' : 'hover:text-orange-500',
        tabActive: sport === 'f1' ? 'border-red-500 text-white' : 'border-orange-500 text-white',
        tabInactive: 'border-transparent text-gray-400 hover:text-white',
    };
    const geminiParticipant = useMemo(() => participants.find(p => p.name === 'Gemini AI'), [participants]);

    const handleGenerateGeminiTeam = async () => {
        const raceToUse = selectedRace || currentRace;
        if (!raceToUse || !geminiParticipant) {
            showToast('Selecciona una jornada o asegúrate de que la próxima carrera esté disponible.', 'error');
            return;
        }
        setIsGeneratingTeam(true);
        try {
            const budget = sport === 'f1' ? F1_BUDGET : MOTOGP_BUDGET;
            const riderLimit = sport === 'f1' ? F1_RIDER_LIMIT : MOTOGP_RIDER_LIMIT;
            const aiTeam = await createAITeam(riders, constructors, sport, budget, riderLimit);
            if (!aiTeam) throw new Error("La IA no pudo generar un equipo.");
            const success = await onUpdateTeam(geminiParticipant.id, aiTeam.riders, aiTeam.constructor, raceToUse.id);
            if (success) showToast(`Equipo generado por IA para ${raceToUse.gp_name} y guardado.`, 'success');
            else throw new Error("No se pudo guardar el equipo generado por la IA.");
        } catch (error: any) {
            showToast(error.message || 'Error al generar el equipo con IA.', 'error');
        } finally {
            setIsGeneratingTeam(false);
        }
    };
    
    const handleAddGeminiAndCreateTeam = async () => {
        if (!currentRace) {
            showToast('No hay una próxima carrera para la cual crear un equipo.', 'error');
            return;
        }
        setIsAddingGemini(true);
        try {
            const gemini = await addGeminiParticipant();
            if (gemini) {
                showToast('Generando equipo para Gemini AI...', 'info');
                const budget = sport === 'f1' ? F1_BUDGET : MOTOGP_BUDGET;
                const riderLimit = sport === 'f1' ? F1_RIDER_LIMIT : MOTOGP_RIDER_LIMIT;
                const aiTeam = await createAITeam(riders, constructors, sport, budget, riderLimit);
                if (!aiTeam) throw new Error("La IA no pudo generar un equipo.");
                const success = await onUpdateTeam(gemini.id, aiTeam.riders, aiTeam.constructor, currentRace.id);
                if (success) showToast(`Equipo de Gemini AI para ${currentRace.gp_name} creado y guardado.`, 'success');
                else throw new Error("No se pudo guardar el equipo generado por la IA.");
            }
        } catch (error: any) {
            showToast(error.message || 'Ocurrió un error en el proceso.', 'error');
        } finally {
            setIsAddingGemini(false);
        }
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
                            <select value={currentSelection} onChange={(e) => handleSelectChange(i, e.target.value)} className={`w-full bg-gray-700 text-white p-1 rounded-md text-sm focus:outline-none focus:ring-1 ${theme.focusRing}`}>
                                <option value="">- Seleccionar piloto -</option>
                                {sortedRiders.map(r => (
                                    <option key={r.id} value={r.id} disabled={selectedIds.has(String(r.id)) && currentSelection !== String(r.id)}>
                                        {r.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="space-y-4">
             <div className="flex border-b border-gray-700">
                <button onClick={() => setActiveTab('races')} className={`py-2 px-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'races' ? theme.tabActive : theme.tabInactive}`}>Gestión de Carreras</button>
                <button onClick={() => setActiveTab('riders')} className={`py-2 px-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'riders' ? theme.tabActive : theme.tabInactive}`}>Gestión de Pilotos</button>
            </div>

            {activeTab === 'races' && (
                <div className="animate-fadeIn">
                    <div className="border-b border-gray-700 pb-4">
                        <h2 className="text-xl font-bold mb-2">Gestión de Gemini AI</h2>
                        {geminiParticipant ? (
                            <div className="space-y-2">
                                <p className="text-sm text-green-400">Gemini AI ya está en la liga.</p>
                                <button onClick={handleGenerateGeminiTeam} disabled={!selectedRace || isGeneratingTeam} className={`w-full flex items-center justify-center gap-2 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 disabled:bg-gray-600 ${theme.button}`}>
                                    {isGeneratingTeam ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <SparklesIcon className="w-5 h-5" />}
                                    {isGeneratingTeam ? 'Generando Equipo...' : `Generar Equipo para ${selectedRace?.gp_name || 'Jornada Sel.'}`}
                                </button>
                            </div>
                        ) : (
                            <button onClick={handleAddGeminiAndCreateTeam} disabled={isAddingGemini} className={`w-full flex items-center justify-center gap-2 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 disabled:bg-gray-600 ${theme.button}`}>
                                {isAddingGemini ? <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <SparklesIcon className="w-5 h-5" />}
                                {isAddingGemini ? 'Añadiendo y Creando Equipo...' : 'Añadir a Gemini AI y Crear Equipo'}
                            </button>
                        )}
                    </div>
                    <div className="pt-4">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xl font-bold">Editar Resultados</h2>
                            <div className="flex items-center gap-2">
                                <button onClick={handleFetchWithAI} disabled={!selectedRace || isFetchingPoints} className="flex items-center gap-1.5 text-sm text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isFetchingPoints ? <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <SparklesIcon className="w-4 h-4" />}
                                    <span>{isFetchingPoints ? 'Buscando...' : 'Buscar Resultados'}</span>
                                </button>
                                <button onClick={onClearPoints} disabled={!selectedRace} className={`text-sm text-gray-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${theme.hoverText}`}>Limpiar</button>
                            </div>
                        </div>
                        <select value={selectedRace?.id ?? ''} onChange={(e) => { const race = races.find(r => r.id === Number(e.target.value)); if (race) onSelectRace(race); }} className="w-full bg-gray-900 text-white p-2 rounded-md mb-2" disabled={races.length === 0}>
                            <option value="" disabled>{races.length === 0 ? 'No hay carreras' : 'Selecciona jornada...'}</option>
                            {sortedRaces.map(race => <option key={race.id} value={race.id}>{race.gp_name}</option>)}
                        </select>
                        {selectedRace && (
                            <div className="mt-2">
                                <label htmlFor="round-date" className="block text-sm font-medium text-gray-300 mb-1">Fecha Límite (Cierre de Mercado)</label>
                                <input id="round-date" type="datetime-local" value={editedRaceDate} onChange={(e) => setEditedRaceDate(e.target.value)} onBlur={handleRaceDateChange} className={`w-full bg-gray-900 text-white p-2 rounded-md focus:outline-none focus:ring-2 ${theme.focusRing}`} />
                            </div>
                        )}
                        <div className="max-h-[45vh] overflow-y-auto pr-2 mt-4">
                            {sport === 'motogp' && (
                                <div className="space-y-6">
                                    {renderResultSelects("Carrera Principal (Top 15)", 15, mainRaceResults, setMainRaceResults)}
                                    {renderResultSelects("Carrera Sprint (Top 9)", 9, sprintRaceResults, setSprintRaceResults)}
                                    <button onClick={() => handleSaveResults(mainRaceResults, sprintRaceResults, MOTOGP_MAIN_RACE_POINTS, MOTOGP_SPRINT_RACE_POINTS)} disabled={!selectedRace || isSavingResults} className={`w-full mt-4 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 disabled:bg-gray-600 ${theme.button}`}>
                                        {isSavingResults ? 'Guardando...' : 'Guardar Resultados'}
                                    </button>
                                </div>
                            )}
                            {sport === 'f1' && (
                                <div className="space-y-6">
                                    {renderResultSelects("Carrera Principal (Top 10)", 10, f1MainRaceResults, setF1MainRaceResults)}
                                    {renderResultSelects("Carrera Sprint (Top 8)", 8, f1SprintRaceResults, setF1SprintRaceResults)}
                                    <button onClick={() => handleSaveResults(f1MainRaceResults, f1SprintRaceResults, F1_MAIN_RACE_POINTS, F1_SPRINT_RACE_POINTS)} disabled={!selectedRace || isSavingResults} className={`w-full mt-4 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 disabled:bg-gray-600 ${theme.button}`}>
                                        {isSavingResults ? 'Guardando...' : 'Guardar Resultados'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'riders' && (
                <div className="animate-fadeIn">
                    <div className="flex flex-col sm:flex-row gap-2 mb-4">
                        <div className="relative flex-grow">
                             <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                            <input type="text" placeholder="Buscar piloto..." value={riderSearch} onChange={(e) => setRiderSearch(e.target.value)} className={`w-full bg-gray-900 text-white p-2 pl-10 rounded-md focus:outline-none focus:ring-2 ${theme.focusRing}`} />
                        </div>
                        <button onClick={() => setEditingRider('new')} className={`flex items-center justify-center gap-2 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 ${theme.button}`}>
                            <PlusIcon className="w-5 h-5"/> Añadir Piloto
                        </button>
                    </div>

                    <div className="max-h-[60vh] overflow-y-auto pr-2 space-y-2">
                        {filteredRiders.map(rider => (
                            <div key={rider.id} className="bg-gray-900/50 p-2 rounded-md flex justify-between items-center">
                                <div>
                                    <p className="font-semibold">{rider.name}</p>
                                    <p className="text-xs text-gray-400">{rider.team} | {sport === 'f1' ? `$${(rider.price/10).toFixed(1)}M` : `€${rider.price.toLocaleString('es-ES')}`}</p>
                                </div>
                                <button onClick={() => setEditingRider(rider)} className={`p-2 rounded-full text-gray-400 hover:text-white hover:bg-gray-700 transition-colors`}>
                                    <PencilIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        ))}
                         {filteredRiders.length === 0 && <p className="text-center text-gray-500 py-8">No se encontraron pilotos.</p>}
                    </div>
                </div>
            )}
            
            {editingRider && (
                <EditRiderModal
                    rider={editingRider === 'new' ? null : editingRider}
                    onClose={() => setEditingRider(null)}
                    onSave={handleSaveRider}
                    constructors={constructors}
                    sport={sport}
                />
            )}
        </div>
    );
};