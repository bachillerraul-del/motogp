import React, { useMemo, useState, useEffect } from 'react';
import type { Race, Sport, Participant, Rider } from '../types';
import { Countdown } from './Countdown';
import { ExclamationTriangleIcon } from './Icons';
import { getLatestTeam } from '../lib/utils';
import { MOTOGP_BUDGET, F1_BUDGET, F1_RIDER_LIMIT, MOTOGP_RIDER_LIMIT } from '../constants';
import { useFantasy } from '../contexts/FantasyDataContext';


interface HomeProps {
    currentRace: Race | null;
    onGoToBuilder: () => void;
    onGoToResults: () => void;
    sport: Sport;
    currentUser: Participant | null;
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

export const Home: React.FC<HomeProps> = ({ currentRace, onGoToBuilder, onGoToResults, sport, currentUser }) => {
    const { teamSnapshots, riders, constructors, races } = useFantasy();

    const deadlineDate = useMemo(() => currentRace?.race_date ? new Date(currentRace.race_date) : null, [currentRace]);
    const [timeRemaining, setTimeRemaining] = React.useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const isMarketOpen = deadlineDate ? new Date() < deadlineDate : false;
    const [isCarriedOverTeamInvalid, setIsCarriedOverTeamInvalid] = useState(false);

    useEffect(() => {
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
    
    useEffect(() => {
        if (currentUser && riders.length > 0 && constructors.length > 0 && teamSnapshots.length > 0 && isMarketOpen) {
            const { riderIds, constructorId } = getLatestTeam(currentUser.id, races, teamSnapshots);
            if (riderIds.length > 0 && constructorId) {
                const ridersById = new Map(riders.map(r => [r.id, r]));
                const constructorsById = new Map(constructors.map(c => [c.id, c]));

                const riderCost = riderIds.reduce((total, id) => total + (ridersById.get(id)?.price || 0), 0);
                const constructorCost = constructorsById.get(constructorId)?.price || 0;
                const teamCost = riderCost + constructorCost;

                const BUDGET = sport === 'f1' ? F1_BUDGET : MOTOGP_BUDGET;
                const RIDER_LIMIT = sport === 'f1' ? F1_RIDER_LIMIT : MOTOGP_RIDER_LIMIT;

                if (riderIds.length !== RIDER_LIMIT || teamCost > BUDGET) {
                    setIsCarriedOverTeamInvalid(true);
                } else {
                    setIsCarriedOverTeamInvalid(false);
                }
            }
        } else {
            setIsCarriedOverTeamInvalid(false);
        }
    }, [currentUser, riders, constructors, teamSnapshots, races, sport, isMarketOpen]);


    const sportName = sport === 'f1' ? 'Formula 1' : 'MotoGP';
    const theme = {
        primaryColor: sport === 'f1' ? 'text-red-600' : 'text-orange-500',
        primaryButton: sport === 'f1' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600',
        secondaryButton: sport === 'f1' ? 'bg-gray-700 hover:bg-red-900' : 'bg-gray-700 hover:bg-orange-900',
        primaryBorder: sport === 'f1' ? 'border-red-600/50' : 'border-orange-500/50',
        primaryShadow: sport === 'f1' ? 'shadow-red-600/10' : 'shadow-orange-500/10',
        countdownColor: sport === 'f1' ? 'text-red-500' : 'text-orange-400',
        iconColor: sport === 'f1' ? 'text-red-500' : 'text-orange-500',
    };

    if (currentUser) {
        
        const { riderIds, constructorId } = getLatestTeam(currentUser.id, races, teamSnapshots);
        const ridersById = useMemo(() => new Map(riders.map(r => [r.id, r])), [riders]);
        const constructorsById = useMemo(() => new Map(constructors.map(c => [c.id, c])), [constructors]);
        const teamConstructor = constructorId ? constructorsById.get(constructorId) : null;
        
        return (
            <div className="max-w-4xl mx-auto animate-fadeIn">
                 {isCarriedOverTeamInvalid && (
                    <div className="bg-yellow-500/10 border-l-4 border-yellow-500 text-yellow-300 p-4 rounded-lg mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="flex items-center gap-3">
                            <ExclamationTriangleIcon className="w-8 h-8 flex-shrink-0" />
                            <div>
                                <h3 className="font-bold">¡Atención! Tu equipo necesita una revisión.</h3>
                                <p className="text-sm">Debido a los cambios de precios, tu equipo actual excede el presupuesto o no es válido.</p>
                            </div>
                        </div>
                        <button
                            onClick={onGoToBuilder}
                            className="bg-yellow-500 hover:bg-yellow-600 text-white font-bold py-2 px-4 rounded-lg transition-colors w-full sm:w-auto flex-shrink-0"
                        >
                            Modificar Equipo
                        </button>
                    </div>
                )}
                <div className="mb-10">
                    <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Hola, <span className={theme.primaryColor}>{currentUser.name}</span></h1>
                    <p className="mt-2 text-lg text-gray-300">Bienvenido a tu panel de control de la Fantasy League.</p>
                </div>

                <div>
                    <div>
                        {currentRace && deadlineDate ? (
                             <div className={`bg-gray-800 rounded-lg shadow-2xl p-6 border-2 h-full flex flex-col justify-between ${theme.primaryBorder} ${theme.primaryShadow}`}>
                                <div className="text-center">
                                    <p className={`text-sm font-bold uppercase tracking-wider ${theme.primaryColor}`}>Próxima Carrera</p>
                                    <h2 className="text-3xl font-bold text-white mt-1">{currentRace.gp_name}</h2>
                                    <p className="text-gray-400">{formatDate(currentRace.race_date)}</p>
                                </div>
                                
                                {isMarketOpen ? (
                                    <div className="my-6 py-6 border-y border-gray-700">
                                         <h3 className={`text-lg font-semibold text-center mb-4 uppercase tracking-wider ${theme.primaryColor}`}>Cierre de Mercado</h3>
                                         <Countdown timeRemaining={timeRemaining} sport={sport}/>
                                    </div>
                                ) : (
                                    <div className="text-center bg-gray-700/50 py-3 px-6 rounded-lg my-6">
                                         <p className="font-bold text-white text-lg">Mercado Cerrado</p>
                                         <p className="text-sm text-gray-400">La carrera está en curso.</p>
                                    </div>
                                )}
                                
                                <div>
                                    <h3 className="font-bold text-white text-lg mb-3">Mi Equipo Actual</h3>
                                     <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
                                        {riderIds.length > 0 ? (
                                            riderIds.map(riderId => {
                                                const rider = ridersById.get(riderId);
                                                if (!rider) return null;
                                                return (
                                                    <div key={rider.id} className="bg-gray-900/50 p-2 rounded-md text-sm">
                                                        <p className="font-bold text-white truncate">{rider.name}</p>
                                                        <p className="text-xs text-gray-400 truncate">{rider.team}</p>
                                                    </div>
                                                )
                                            })
                                        ) : (
                                            <p className="text-gray-400 col-span-full text-center py-4">Aún no has creado un equipo.</p>
                                        )}
                                        {teamConstructor && (
                                             <div className="bg-gray-700/50 p-2 rounded-md text-sm">
                                                <p className="font-bold text-white truncate">{teamConstructor.name}</p>
                                                <p className="text-xs text-gray-400">Escudería</p>
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <button onClick={onGoToBuilder} className={`${theme.primaryButton} w-full text-white font-bold py-3 px-4 rounded-lg transition-colors`}>Modificar Equipo</button>
                                        <button onClick={onGoToResults} className={`${theme.secondaryButton} w-full text-white font-bold py-3 px-4 rounded-lg transition-colors`}>Ver Resultados</button>
                                    </div>
                                </div>
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

    // Fallback for non-logged-in users remains the same
    return (
        <div className="max-w-5xl mx-auto animate-fadeIn">
            <div className="text-center mb-10">
                <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Bienvenido a <span className={theme.primaryColor}>{sportName}</span> Fantasy</h1>
                <p className="mt-4 text-lg text-gray-300 max-w-2xl mx-auto">La temporada está en marcha. ¿Tienes lo que se necesita para ser el mejor manager?</p>
            </div>

            {currentRace && deadlineDate ? (
                <div className={`bg-gray-800 rounded-lg shadow-2xl p-6 md:p-8 mb-12 border-2 ${theme.primaryBorder} ${theme.primaryShadow}`}>
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="text-center md:text-left">
                            <p className={`text-sm font-bold uppercase tracking-wider ${theme.primaryColor}`}>Próxima Carrera</p>
                            <h2 className="text-3xl md:text-4xl font-bold text-white mt-1">{currentRace.gp_name}</h2>
                            <p className="text-gray-400">{currentRace.location}</p>
                             <p className="text-gray-300 mt-2 font-semibold">{formatDate(currentRace.race_date)}</p>
                        </div>
                        <div className="flex-shrink-0">
                            {isMarketOpen ? (
                                <button
                                    onClick={onGoToBuilder}
                                    className={`${theme.primaryButton} text-white font-bold py-4 px-8 rounded-lg text-lg transition-all duration-300 hover:scale-105 transform shadow-lg`}
                                >
                                    ¡Únete a la Liga!
                                </button>
                            ) : (
                                <div className="text-center bg-gray-700/50 py-3 px-6 rounded-lg">
                                     <p className="font-bold text-white text-lg">Mercado Cerrado</p>
                                     <p className="text-sm text-gray-400">La carrera está en curso.</p>
                                </div>
                            )}
                        </div>
                    </div>
                    {isMarketOpen && (
                        <div className="mt-8 pt-6 border-t border-gray-700">
                             <h3 className={`text-lg font-semibold text-center mb-4 uppercase tracking-wider ${theme.primaryColor}`}>Cierre de Mercado en</h3>
                             <Countdown timeRemaining={timeRemaining} sport={sport} />
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