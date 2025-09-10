import React, { useMemo } from 'react';
import type { Race, Sport, Participant, TeamSnapshot, Rider, AllRiderPoints } from '../types';
import { Countdown } from './Countdown';
import { CalendarIcon, UserCircleIcon, ClipboardDocumentListIcon, TrophyIcon } from './Icons';
import { getLatestTeam, getTeamForRace } from '../lib/utils';

interface HomeProps {
    races: Race[];
    currentRace: Race | null;
    onGoToBuilder: () => void;
    sport: Sport;
    currentUser: Participant | null;
    participants: Participant[];
    teamSnapshots: TeamSnapshot[];
    riders: Rider[];
    allRiderPoints: AllRiderPoints;
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

export const Home: React.FC<HomeProps> = (props) => {
    const { 
        races, currentRace, onGoToBuilder, sport, currentUser,
        participants, teamSnapshots, riders, allRiderPoints
    } = props;

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

    const sportName = sport === 'f1' ? 'Formula 1' : 'MotoGP';

    // RENDER DASHBOARD FOR LOGGED-IN USER
    if (currentUser) {
        const calculateTotalScore = (participantId: number): number => {
            return races.reduce((totalScore, race) => {
                const teamForRace = getTeamForRace(participantId, race.id, teamSnapshots);
                const racePointsMap = allRiderPoints[race.id] || {};
                const raceScore = teamForRace.reduce((acc, riderId) => acc + (racePointsMap[riderId] || 0), 0);
                return totalScore + raceScore;
            }, 0);
        };

        const sortedParticipants = useMemo(() => {
            return [...participants]
                .map(p => ({ ...p, score: calculateTotalScore(p.id) }))
                .sort((a, b) => b.score - a.score);
        }, [participants, races, teamSnapshots, allRiderPoints]);

        const currentUserData = sortedParticipants.find(p => p.id === currentUser.id);
        const rank = currentUserData ? sortedParticipants.findIndex(p => p.id === currentUser.id) + 1 : null;
        const totalScore = currentUserData?.score ?? 0;

        const latestTeamIds = getLatestTeam(currentUser.id, races, teamSnapshots);
        const currentTeamRiders = riders.filter(r => latestTeamIds.includes(r.id));
        const ridersById = useMemo(() => new Map(riders.map(r => [r.id, r])), [riders]);


        return (
            <div className="max-w-6xl mx-auto animate-fadeIn">
                <div className="mb-10">
                    <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Hola, <span className="text-red-600">{currentUser.name}</span></h1>
                    <p className="mt-2 text-lg text-gray-300">Este es tu panel de control para la Fantasy League.</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Profile & Team */}
                    <div className="lg:col-span-2 space-y-8">
                        {/* Profile Widget */}
                        <div className="bg-gray-800 rounded-lg shadow-lg p-6 flex items-center gap-6">
                            <UserCircleIcon className="w-16 h-16 text-red-500 flex-shrink-0" />
                            <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="text-center sm:text-left bg-gray-900/50 p-4 rounded-lg">
                                    <p className="text-sm text-gray-400 uppercase">Puntuación Total</p>
                                    <p className="text-3xl font-bold text-white">{totalScore}</p>
                                </div>
                                <div className="text-center sm:text-left bg-gray-900/50 p-4 rounded-lg">
                                    <p className="text-sm text-gray-400 uppercase">Clasificación</p>
                                    <p className="text-3xl font-bold text-white">{rank ? `#${rank}` : 'N/A'}</p>
                                </div>
                            </div>
                        </div>

                        {/* Team Widget */}
                        <div className="bg-gray-800 rounded-lg shadow-lg p-6">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <ClipboardDocumentListIcon className="w-8 h-8 text-red-500" />
                                    <h2 className="text-2xl font-bold text-white">Mi Equipo Actual</h2>
                                </div>
                                <button
                                    onClick={onGoToBuilder}
                                    className="bg-red-600 text-white font-bold py-2 px-4 rounded-lg transition-colors hover:bg-red-700"
                                >
                                    Modificar Equipo
                                </button>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {latestTeamIds.length > 0 ? (
                                    latestTeamIds.map(riderId => {
                                        const rider = ridersById.get(riderId);
                                        if (!rider) return null;
                                        return (
                                            <div key={rider.id} className="bg-gray-900/50 p-3 rounded-md">
                                                <p className="font-bold text-white truncate">{rider.name}</p>
                                                <p className="text-sm text-gray-400 truncate">{rider.team}</p>
                                            </div>
                                        )
                                    })
                                ) : (
                                    <p className="text-gray-400 col-span-full text-center py-4">Aún no has creado un equipo.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Next Race */}
                    <div className="lg:col-span-1">
                        {currentRace && deadlineDate ? (
                             <div className="bg-gray-800 rounded-lg shadow-2xl shadow-red-600/10 p-6 border-2 border-red-600/50 h-full flex flex-col justify-between">
                                <div className="text-center">
                                    <p className="text-sm font-bold text-red-500 uppercase tracking-wider">Próxima Carrera</p>
                                    <h2 className="text-3xl font-bold text-white mt-1">{currentRace.gp_name}</h2>
                                    <p className="text-gray-400">{formatDate(currentRace.race_date)}</p>
                                </div>
                                {isMarketOpen ? (
                                    <div className="mt-6 pt-6 border-t border-gray-700">
                                         <h3 className="text-lg font-semibold text-center text-red-500 mb-4 uppercase tracking-wider">Cierre de Mercado</h3>
                                         <Countdown timeRemaining={timeRemaining} />
                                    </div>
                                ) : (
                                    <div className="text-center bg-gray-700/50 py-3 px-6 rounded-lg mt-6">
                                         <p className="font-bold text-white text-lg">Mercado Cerrado</p>
                                         <p className="text-sm text-gray-400">La carrera está en curso o ha finalizado.</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                             <div className="text-center py-10 bg-gray-800 rounded-lg h-full flex flex-col justify-center">
                                <p className="text-gray-300 text-xl font-semibold">La temporada ha concluido.</p>
                                <p className="text-sm text-gray-400 mt-2">¡Gracias por jugar!</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }


    // RENDER GENERIC HOME FOR NEW VISITORS
    return (
        <div className="max-w-5xl mx-auto animate-fadeIn">
            <div className="text-center mb-10">
                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Bienvenido a <span className="text-red-600">{sportName}</span> Fantasy</h1>
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
        </div>
    );
};