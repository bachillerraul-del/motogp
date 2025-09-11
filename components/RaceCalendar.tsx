import React, { useMemo } from 'react';
import type { Race, Sport } from '../types';
import { CalendarIcon } from './Icons';

interface RaceCalendarProps {
    races: Race[];
    sport: Sport;
}

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-ES', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });
};

export const RaceCalendar: React.FC<RaceCalendarProps> = ({ races, sport }) => {
    const nextRaceIndex = useMemo(() => {
        const now = new Date();
        return races.findIndex(race => new Date(race.race_date) > now);
    }, [races]);

    if (races.length === 0) {
        return (
            <div className="text-center py-10 bg-gray-800 rounded-lg">
                <CalendarIcon className="w-12 h-12 mx-auto text-gray-500 mb-4" />
                <p className="text-gray-400">El calendario de carreras no está disponible en este momento.</p>
                <p className="text-sm text-gray-500 mt-2">Por favor, inténtalo de nuevo más tarde.</p>
            </div>
        )
    }

    const theme = {
        primaryColor: sport === 'f1' ? 'text-red-500' : 'text-orange-500',
        primaryBorder: sport === 'f1' ? 'border-red-600' : 'border-orange-500',
        nextRaceBorder: sport === 'f1' ? 'border-red-500' : 'border-orange-500',
        nextRaceShadow: sport === 'f1' ? 'shadow-red-600/20' : 'shadow-orange-500/20',
        nextRaceText: sport === 'f1' ? 'text-red-400' : 'text-orange-400',
        nextRaceTextMuted: sport === 'f1' ? 'text-red-500' : 'text-orange-500',
    }

    return (
        <div className="max-w-4xl mx-auto">
            <div className={`flex items-center gap-4 mb-6 border-b-2 pb-3 ${theme.primaryBorder}`}>
                 <CalendarIcon className={`w-8 h-8 ${theme.primaryColor}`}/>
                 <h2 className="text-3xl font-bold text-white">Calendario de la Temporada</h2>
            </div>
           
            <div className="space-y-4">
                {races.map((race, index) => {
                    const isNextRace = index === nextRaceIndex;
                    const isPastRace = new Date(race.race_date) < new Date() && !isNextRace;

                    return (
                        <div
                            key={race.id}
                            className={`
                                p-4 rounded-lg shadow-lg flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all duration-300
                                ${isNextRace ? `bg-gray-800 border-l-4 ${theme.nextRaceBorder} ${theme.nextRaceShadow}` : 'bg-gray-800/60'}
                                ${isPastRace ? 'opacity-60' : ''}
                            `}
                        >
                            <div className="flex items-center gap-4">
                                <span className={`text-2xl font-bold w-12 text-center p-2 rounded-md ${isNextRace ? theme.primaryColor : 'text-gray-400'}`}>
                                    {String(race.round).padStart(2, '0')}
                                </span>
                                <div>
                                    <h3 className={`text-xl font-bold ${isNextRace ? 'text-white' : 'text-gray-200'}`}>{race.gp_name}</h3>
                                    <p className="text-sm text-gray-400">{race.location}</p>
                                </div>
                            </div>
                            <div className="sm:ml-auto text-left sm:text-right w-full sm:w-auto mt-2 sm:mt-0 border-t sm:border-none border-gray-700 pt-2 sm:pt-0">
                                <p className={`font-semibold ${isNextRace ? `${theme.nextRaceText} animate-pulse` : 'text-gray-300'}`}>
                                    {formatDate(race.race_date)}
                                </p>
                                {isNextRace && <p className={`text-xs uppercase font-bold tracking-wider mt-1 ${theme.nextRaceTextMuted}`}>Próxima Carrera</p>}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};