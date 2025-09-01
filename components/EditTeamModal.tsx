import React, { useState, useEffect } from 'react';
import type { Rider, Participant } from '../types';
import { TEAM_SIZE } from '../constants';
import { CloseIcon } from './Icons';

interface EditTeamModalProps {
    participant: Participant;
    riders: Rider[];
    onSave: (participantId: number, teamIds: number[]) => void;
    onClose: () => void;
}

export const EditTeamModal: React.FC<EditTeamModalProps> = ({ participant, riders, onSave, onClose }) => {
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set(participant.team_ids));

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose]);

    const handleRiderClick = (riderId: number) => {
        const newSelectedIds = new Set(selectedIds);
        if (newSelectedIds.has(riderId)) {
            newSelectedIds.delete(riderId);
        } else {
            if (newSelectedIds.size < TEAM_SIZE) {
                newSelectedIds.add(riderId);
            }
        }
        setSelectedIds(newSelectedIds);
    };

    const handleSave = () => {
        onSave(participant.id, Array.from(selectedIds));
    };

    return (
        <div 
            className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-4"
            onClick={onClose}
            aria-modal="true"
            role="dialog"
        >
            <div 
                className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex items-center justify-between p-4 border-b border-gray-700">
                    <h2 className="text-xl font-bold">Editar Equipo de <span className="text-red-500">{participant.name}</span></h2>
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-white transition-colors">
                        <CloseIcon className="w-6 h-6" />
                    </button>
                </header>
                
                <div className="p-6 overflow-y-auto">
                    <p className="mb-4 text-gray-300">Selecciona {TEAM_SIZE} pilotos. Tienes {selectedIds.size} seleccionados.</p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {riders.map(rider => {
                            const isSelected = selectedIds.has(rider.id);
                            const isFull = selectedIds.size >= TEAM_SIZE && !isSelected;

                            return (
                                <button
                                    key={rider.id}
                                    onClick={() => handleRiderClick(rider.id)}
                                    disabled={isFull}
                                    className={`p-3 rounded-lg text-left transition-all duration-200
                                        ${isSelected ? 'bg-red-600 text-white ring-2 ring-red-400' : 'bg-gray-700 hover:bg-gray-600'}
                                        ${isFull ? 'opacity-50 cursor-not-allowed' : ''}
                                    `}
                                >
                                    <span className="font-semibold block">{rider.name}</span>
                                    <span className="text-xs text-gray-400">{rider.team}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <footer className="p-4 border-t border-gray-700 mt-auto flex justify-end items-center gap-3">
                     <button
                        onClick={onClose}
                        className="bg-gray-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 hover:bg-gray-500"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={selectedIds.size !== TEAM_SIZE}
                        className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300 hover:bg-red-700 disabled:bg-gray-500 disabled:cursor-not-allowed"
                    >
                        Guardar Equipo ({selectedIds.size}/{TEAM_SIZE})
                    </button>
                </footer>
            </div>
        </div>
    );
};