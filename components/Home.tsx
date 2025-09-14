
import React, { useMemo, useState, useEffect } from 'react';
import type { Race, Sport, Participant } from '../types';
import { Countdown } from './Countdown';
import { ExclamationTriangleIcon } from './Icons';
import { getLatestTeam } from '../lib/utils';
import { MOTOGP_BUDGET, F1_BUDGET, F1_RIDER_LIMIT, MOTOGP_RIDER_LIMIT } from '../constants';
import { useFantasy } from '../contexts/FantasyDataContext';
import { PriceChangesDashboard } from './PriceChangesDashboard';


interface HomeProps {
    nextRace: Race | null;
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

export const Home: React.FC<HomeProps> = ({ nextRace, onGoToBuilder, onGoToResults, sport, currentUser }) => {
    const { teamSnapshots, riders, constructors, races } = useFantasy();

    const [marketStatus, setMarketStatus] = useState<{
        isOpen: boolean;
        isLocked: boolean;
        reopensAt: Date | null;
        closesAt: Date | null;
        raceToShow: Race | null;
    }>({ isOpen: false, isLocked: false, reopensAt: null, closesAt: null, raceToShow: nextRace });

    const [timeRemaining, setTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [reopenTimeRemaining, setReopenTimeRemaining] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [isCarriedOverTeamInvalid, setIsCarriedOverTeamInvalid] = useState(false);

    const lastPastRace = useMemo(() => {
        const now = new Date();
        return [...races]
            .filter(r => new Date(r.race_date) < now)
            .sort((a, b) => new Date(b.race_date).getTime() - new Date(a.race_date).getTime())[0];
    }, [races]);

    useEffect(() => {
        const calculateTimeParts = (totalMillis: number) => {
            if (totalMillis <= 0) {
                return { days: 0, hours: 0, minutes: 0, seconds: 0 };
            }
            return {
                days: Math.floor(totalMillis / (1000 * 60 * 60 * 24)),
                hours: Math.floor((totalMillis / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((totalMillis / 1000 / 60) % 60),
                seconds: Math.floor((totalMillis / 1000) % 60),
            };
        };

        const timer = setInterval(() => {
            const now = new Date();
            const deadlineDate = nextRace?.race_date ? new Date(nextRace.race_date) : null;

            const marketReopensAt = lastPastRace
                ? new Date(new Date(lastPastRace.race_date).getTime() + 48 * 60 * 60 * 1000)
                : null;

            const isAfterLockout = marketReopensAt ? now > marketReopensAt : true;
            const isBeforeNextRace = deadlineDate ? now < deadlineDate : false;

            const isOpen = isAfterLockout && isBeforeNextRace;
            const isLocked = !!marketReopensAt && now < marketReopensAt;
            
            const raceToShow = isLocked ? lastPastRace : nextRace;

            setMarketStatus({
                isOpen,
                isLocked,
                reopensAt: marketReopensAt,
                closesAt: deadlineDate,
                raceToShow: raceToShow || null,
            });

            const closeTotal = deadlineDate ? deadlineDate.getTime() - now.getTime() : 0;
            setTimeRemaining(calculateTimeParts(closeTotal));

            const reopenTotal = marketReopensAt ? marketReopensAt.getTime() - now.getTime() : 0;
            setReopenTimeRemaining(calculateTimeParts(reopenTotal));

        }, 1000);

        return () => clearInterval(timer);
    }, [nextRace, lastPastRace]);
    
    useEffect(() => {
        if (currentUser && riders.length > 0 && constructors.length > 0 && teamSnapshots.length > 0 && marketStatus.isOpen) {
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
    }, [currentUser, riders, constructors, teamSnapshots, races, sport, marketStatus.isOpen]);


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

    const { raceToShow } = marketStatus;

    if (currentUser) {
        
        const { riderIds, constructorId } = getLatestTeam(currentUser.id, races, teamSnapshots);
        const ridersById = useMemo(() => new Map(riders.map(r => [r.id, r])), [riders]);
        const constructorsById = useMemo(() => new Map(constructors.map(c => [c.id, c])), [constructors]);
        const teamConstructor = constructorId ? constructorsById.get(constructorId) : null;
        
        return (
            <div className="max-w-4xl mx-auto animate-fadeIn space-y-8">
                 {isCarriedOverTeamInvalid && (
                    <div className="bg-yellow-500/10 border-l-4 border-yellow-500 text-yellow-300 p-4 rounded-lg flex flex-col sm:flex-row justify-between items-center gap-4">
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
                <div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">Hola, <span className={theme.primaryColor}>{currentUser.name}</span></h1>
                    <p className="mt-2 text-lg text-gray-300">Bienvenido a tu panel de control de la Fantasy League.</p>
                </div>

                <div>
                    <div>
                        {raceToShow ? (
                             <div className={`bg-gray-800 rounded-lg shadow-2xl p-6 border-2 h-full flex flex-col justify-between ${theme.primaryBorder} ${theme.primaryShadow}`}>
                                <div className="text-center">
                                    <p className={`text-sm font-bold uppercase tracking-wider ${theme.primaryColor}`}>{marketStatus.isLocked ? 'Carrera Reciente' : 'Próxima Carrera'}</p>
                                    <h2 className="text-3xl font-bold text-white mt-1">{raceToShow.gp_name}</h2>
                                    <p className="text-gray-400">{formatDate(raceToShow.race_date)}</p>
                                </div>
                                
                                {marketStatus.isOpen ? (
                                    <div className="my-6 py-6 border-y border-gray-700">
                                         <h3 className={`text-lg font-semibold text-center mb-4 uppercase tracking-wider ${theme.primaryColor}`}>Cierre de Mercado</h3>
                                         <Countdown timeRemaining={timeRemaining} sport={sport}/>
                                    </div>
                                ) : marketStatus.isLocked ? (
                                     <div className="text-center bg-gray-700/50 py-3 px-6 rounded-lg my-6">
                                         <p className="font-bold text-white text-lg">Mercado Bloqueado</p>
                                         <p className="text-sm text-gray-400 mb-2">Abriendo en:</p>
                                         <Countdown timeRemaining={reopenTimeRemaining} sport={sport} />
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
                                        <button onClick={onGoToBuilder} className={`${theme.primaryButton} w-full text-white font-bold py-3 px-4 rounded-lg transition-colors`}>
                                            {marketStatus.isOpen ? 'Modificar Equipo' : 'Ver Equipo'}
                                        </button>
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
                 {marketStatus.isLocked && (
                    <PriceChangesDashboard 
                        riders={riders}
                        constructors={constructors}
                        sport={sport}
                        currencyPrefix={sport === 'f1' ? '$' : '€'}
                        currencySuffix={sport === 'f1' ? 'M' : ''}
                    />
                )}
            </div>
        );
    }

    return null; // Fallback for non-logged-in users can be handled by parent
};
