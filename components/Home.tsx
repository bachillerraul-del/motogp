import React, { useMemo } from 'react';
import type { Race } from '../types';
import { Countdown } from './Countdown';
import { CalendarIcon } from './Icons';

interface HomeProps {
    races: Race[];
    currentRace: Race | null;
    onGoToBuilder: () => void;
}

const formatDate = (dateString: string) => {
    if (!dateString) return 'Fecha no disponible';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
};

export const Home: React.FC<HomeProps> = ({ races, currentRace, onGoToBuilder }) => {

    const deadlineDate = useMemo(() => currentRace?.race_date ? new Date(currentRace.race_date) : null, [currentRace]);
    const [timeRemaining, setTimeRemaining] = React.useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const isMarketOpen = deadlineDate ? new Date() < deadlineDate : false;

    React.useEffect(() => {
        if (!deadlineDate || new Date() >= deadlineDate) {
             setTimeRemaining({ days: 0, hours: 0, minutes: 0, seconds: 0 });
            return;
        };

        const calculate = () => {
            const total = deadlineDate.getTime() - new Date().getTime();
            if (total <= 0) {
                 clearInterval(timer);
                 return { days: 0, hours: 0, minutes: 0, seconds: 0 };
            }
            return {
                days: Math.floor(total / (1000 * 60 * 60 * 24)),
                hours: Math.floor((total / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((total / 1000 / 60) % 60),
                seconds: Math.floor((total / 1000) % 60),
            };
        };

        setTimeRemaining(calculate());
        const timer = setInterval(() => {
            setTimeRemaining(calculate());
        }, 1000);

        return () => clearInterval(timer);
    }, [deadlineDate]);

    const sortedRaces = useMemo(() => [...races].sort((a, b) => a.round - b.round), [races]);
    const nextRaceIndex = useMemo(() => {
        if (!races || races.length === 0) return -1;
        const now = new Date();
        return sortedRaces.findIndex(race => race.race_date && new Date(race.race_date) > now);
    }, [sortedRaces]);


    return (
        <div className="max-w-5xl mx-auto animate-fadeIn">
            <div className="text-center mb-10">
                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Bienvenido a <span className="text-red-600">MotoGP</span> Fantasy</h1>
                <p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">La temporada está en marcha. ¿Tienes lo que se necesita para ser el mejor manager?</p>
            </div>

            {currentRace && deadlineDate ? (
                <div className="bg-gray-800 rounded-lg shadow-2xl shadow-red-600/10 p-6 md:p-8 mb-12 border-2 border-red-600/50">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="text-center md:text-left">
                            <p className="text-sm font-bold text-red-500 uppercase tracking-wider">Próxima Carrera</p>
                            <h2 className="text-3xl md:text-4xl font-bold text-white mt-1">{currentRace.gp_name}</h2>
                            <p className="text-gray-400">{currentRace.location}</p>
                             <p className="text-gray-300 mt-2 font-semibold">{formatDate(currentRace.race_date)}</p>
                        </div>
                        <div className="flex-shrink-0">
                            {isMarketOpen ? (
                                <button
                                    onClick={onGoToBuilder}
                                    className="bg-red-600 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all duration-300 hover:bg-red-700 hover:scale-105 transform shadow-lg"
                                >
                                    ¡Crear Equipo Ahora!
                                </button>
                            ) : (
                                <div className="text-center bg-gray-700/50 py-3 px-6 rounded-lg">
                                     <p className="font-bold text-white text-lg">Mercado Cerrado</p>
                                     <p className="text-sm text-gray-400">La carrera está en curso o ha finalizado.</p>
                                </div>
                            )}
                        </div>
                    </div>
                    {isMarketOpen && (
                        <div className="mt-8 pt-6 border-t border-gray-700">
                             <h3 className="text-lg font-semibold text-center text-red-500 mb-4 uppercase tracking-wider">Cierre de Mercado en</h3>
                             <Countdown timeRemaining={timeRemaining} />
                        </div>
                    )}
                </div>
            ) : (
                 <div className="text-center py-10 bg-gray-800 rounded-lg mb-12">
                    <p className="text-gray-300 text-xl font-semibold">La temporada ha concluido.</p>
                    <p className="text-sm text-gray-400 mt-2">¡Gracias por jugar! Nos vemos el próximo año.</p>
                </div>
            )}

            <div className="mt-12">
                <div className="flex items-center gap-4 mb-6 border-b-2 border-gray-700 pb-3">
                     <CalendarIcon className="w-8 h-8 text-red-500"/>
                     <h2 className="text-3xl font-bold text-white">Calendario de la Temporada</h2>
                </div>

                 {races.length > 0 ? (
                    <div className="space-y-4">
                        {sortedRaces.map((race, index) => {
                            const isNext = index === nextRaceIndex;
                            const isPast = nextRaceIndex === -1 ? (race.race_date ? new Date(race.race_date) < new Date() : false) : index < nextRaceIndex;

                            return (
                                <div
                                    key={race.id}
                                    className={`
                                        p-4 rounded-lg shadow-lg flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all duration-300
                                        ${isNext ? 'bg-gray-800 border-l-4 border-red-500 shadow-red-600/20' : 'bg-gray-800/60'}
                                        ${isPast ? 'opacity-60' : ''}
                                    `}
                                >
                                    <div className="flex items-center gap-4">
                                        <span className={`text-2xl font-bold w-12 text-center p-2 rounded-md ${isNext ? 'text-red-500' : 'text-gray-400'}`}>
                                            {String(race.round).padStart(2, '0')}
                                        </span>
                                        <div>
                                            <h3 className={`text-xl font-bold ${isNext ? 'text-white' : 'text-gray-200'}`}>{race.gp_name}</h3>
                                            <p className="text-sm text-gray-400">{race.location}</p>
                                        </div>
                                    </div>
                                    <div className="sm:ml-auto text-left sm:text-right w-full sm:w-auto mt-2 sm:mt-0 border-t sm:border-none border-gray-700 pt-2 sm:pt-0">
                                        <p className={`font-semibold ${isNext ? 'text-red-400' : 'text-gray-300'}`}>
                                            {formatDate(race.race_date)}
                                        </p>
                                        {isNext && <p className="text-xs text-red-500 uppercase font-bold tracking-wider mt-1">Próxima Carrera</p>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="text-center py-10 bg-gray-800 rounded-lg">
                        <CalendarIcon className="w-12 h-12 mx-auto text-gray-500 mb-4" />
                        <p className="text-gray-400">El calendario de carreras no está disponible.</p>
                    </div>
                )}
            </div>
        </div>
    );
};
