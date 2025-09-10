import React, { useState } from 'react';
import type { Participant, Sport } from '../types';
import { MotoIcon, UserPlusIcon, F1Icon } from './Icons';

interface LoginProps {
    participants: Participant[];
    onLogin: (participant: Participant) => void;
    onGoToBuilderForNew: (name: string) => void;
    sport: Sport;
}

const ParticipantCard: React.FC<{ participant: Participant; onSelect: () => void }> = ({ participant, onSelect }) => (
    <div
        onClick={onSelect}
        className="bg-gray-800 rounded-lg p-6 text-center transition-all duration-300 hover:bg-red-600 hover:scale-105 cursor-pointer shadow-lg"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()}
        aria-label={`Iniciar sesión como ${participant.name}`}
    >
        <p className="text-xl font-bold text-white">{participant.name}</p>
    </div>
);

export const Login: React.FC<LoginProps> = ({ participants, onLogin, onGoToBuilderForNew, sport }) => {
    const [isCreating, setIsCreating] = useState(false);
    const [newName, setNewName] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleNewUserSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const trimmedName = newName.trim();

        if (!trimmedName) {
            setError('El nombre no puede estar vacío.');
            return;
        }

        const nameExists = participants.some(p => p.name.toLowerCase() === trimmedName.toLowerCase());
        if (nameExists) {
            setError('Este nombre ya está en uso. Por favor, elige otro.');
            return;
        }

        onGoToBuilderForNew(trimmedName);
    };

    const SportIcon = sport === 'f1' ? F1Icon : MotoIcon;
    const sportName = sport === 'f1' ? 'F1' : 'MotoGP';

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center justify-center p-4 animate-fadeIn">
            <header className="text-center mb-10">
                <div className="flex justify-center items-center gap-4 mb-4">
                    <SportIcon className="w-12 h-12 text-red-600"/>
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white uppercase">
                        <span className="text-red-600">{sportName}</span> Fantasy
                    </h1>
                </div>
                <p className="text-2xl text-gray-300">Selecciona tu perfil para empezar</p>
            </header>

            <main className="w-full max-w-4xl">
                {participants.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
                        {participants.map(p => (
                            <ParticipantCard key={p.id} participant={p} onSelect={() => onLogin(p)} />
                        ))}
                    </div>
                )}
                
                <div className="text-center border-t border-gray-700 pt-8">
                    {!isCreating ? (
                        <>
                           <p className="text-lg text-gray-400 mb-4">¿No tienes un perfil?</p>
                            <button
                                onClick={() => setIsCreating(true)}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform duration-200 hover:scale-105 inline-flex items-center gap-3"
                            >
                                <UserPlusIcon className="w-6 h-6" />
                                Crear Nuevo Equipo
                            </button>
                        </>
                    ) : (
                         <form onSubmit={handleNewUserSubmit} className="max-w-md mx-auto space-y-4">
                            <h3 className="text-lg text-gray-300">Introduce tu nombre para crear un nuevo perfil</h3>
                            <div>
                                <label htmlFor="new-participant-name" className="sr-only">Tu Nombre</label>
                                <input
                                    id="new-participant-name"
                                    type="text"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="w-full bg-gray-800 border border-gray-600 text-white p-3 rounded-md text-center text-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                                    placeholder="Tu Nombre"
                                    required
                                    autoFocus
                                />
                            </div>
                            {error && <p className="text-sm text-red-500">{error}</p>}
                            <div className="flex gap-4">
                                <button type="button" onClick={() => { setIsCreating(false); setError(null); }} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300">
                                    Cancelar
                                </button>
                                <button type="submit" className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300">
                                    Continuar
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </main>
        </div>
    );
};