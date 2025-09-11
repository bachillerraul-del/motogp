import React from 'react';
import type { Sport } from '../types';
import {
    MOTOGP_TEAM_SIZE, MOTOGP_BUDGET, MOTOGP_MAIN_RACE_POINTS, MOTOGP_SPRINT_RACE_POINTS,
    F1_TEAM_SIZE, F1_BUDGET, F1_MAIN_RACE_POINTS, F1_SPRINT_RACE_POINTS
} from '../constants';
import { BookOpenIcon, TrophyIcon, UsersIcon, ChartBarIcon } from './Icons';

interface RulesProps {
    sport: Sport;
}

interface RuleCardProps {
    title: string;
    icon: React.ReactNode;
    children: React.ReactNode;
}

const RuleCard: React.FC<RuleCardProps> = ({ title, icon, children }) => (
    <div className="bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center gap-4 mb-4">
            {icon}
            <h2 className="text-2xl font-bold text-white">{title}</h2>
        </div>
        <div className="space-y-3 text-gray-300 leading-relaxed">
            {children}
        </div>
    </div>
);

export const Rules: React.FC<RulesProps> = ({ sport }) => {
    const isF1 = sport === 'f1';
    const theme = {
        primaryColor: isF1 ? 'text-red-500' : 'text-orange-500',
        primaryBorder: isF1 ? 'border-red-600' : 'border-orange-500',
    };
    
    const rules = {
        teamSize: isF1 ? F1_TEAM_SIZE : MOTOGP_TEAM_SIZE,
        budget: isF1 ? `${(F1_BUDGET / 10).toFixed(1)}M` : MOTOGP_BUDGET.toLocaleString('es-ES'),
        currency: isF1 ? '$' : '€',
        mainRacePoints: isF1 ? F1_MAIN_RACE_POINTS : MOTOGP_MAIN_RACE_POINTS,
        sprintRacePoints: isF1 ? F1_SPRINT_RACE_POINTS : MOTOGP_SPRINT_RACE_POINTS,
    };

    const mainRacePositions = rules.mainRacePoints.length;
    const sprintRacePositions = rules.sprintRacePoints.length;

    return (
        <div className="max-w-4xl mx-auto animate-fadeIn space-y-8">
            <RuleCard title="Objetivo del Juego" icon={<BookOpenIcon className={`w-8 h-8 ${theme.primaryColor}`}/>}>
                <p>
                    El objetivo es crear el mejor equipo de fantasía para la temporada, acumulando puntos en cada Gran Premio. ¡Compite contra tus amigos y demuestra quién es el mejor estratega!
                </p>
            </RuleCard>

            <RuleCard title="Creación de Equipo" icon={<UsersIcon className={`w-8 h-8 ${theme.primaryColor}`}/>}>
                <p>
                    Cada jugador debe formar un equipo compuesto por <strong>{rules.teamSize} pilotos</strong>.
                </p>
                <p>
                    Dispones de un presupuesto máximo de <strong>{rules.currency}{rules.budget}</strong> para fichar a tus pilotos. ¡Elige sabiamente y gestiona tu dinero!
                </p>
                <p>
                    Puedes cambiar tu equipo antes de la fecha límite de cada Gran Premio, que suele ser el inicio de la carrera principal. Si no realizas cambios, tu equipo de la jornada anterior se mantendrá.
                </p>
            </RuleCard>

            <RuleCard title="Sistema de Puntuación" icon={<TrophyIcon className={`w-8 h-8 ${theme.primaryColor}`}/>}>
                <p>
                    Los puntos se basan en los resultados oficiales de las carreras. Tu puntuación total en una jornada es la suma de los puntos obtenidos por todos los pilotos de tu equipo.
                </p>
                <div>
                    <h3 className="font-bold text-white mb-2">Puntos de la Carrera Principal (Top {mainRacePositions}):</h3>
                    <ol className="list-decimal list-inside text-sm grid grid-cols-2 sm:grid-cols-3 gap-1">
                        {rules.mainRacePoints.map((p, i) => (
                            <li key={`main-${i}`}><strong>{i + 1}º:</strong> {p} pts</li>
                        ))}
                    </ol>
                </div>
                <div>
                    <h3 className="font-bold text-white mb-2">Puntos de la Carrera Sprint (Top {sprintRacePositions}):</h3>
                    <ol className="list-decimal list-inside text-sm grid grid-cols-2 sm:grid-cols-3 gap-1">
                         {rules.sprintRacePoints.map((p, i) => (
                            <li key={`sprint-${i}`}><strong>{i + 1}º:</strong> {p} pts</li>
                        ))}
                    </ol>
                </div>
            </RuleCard>

            <RuleCard title="Mercado de Pilotos" icon={<ChartBarIcon className={`w-8 h-8 ${theme.primaryColor}`}/>}>
                <p>
                    El valor de los pilotos no es estático. Después de cada Gran Premio, los precios de los pilotos se ajustarán automáticamente según su popularidad en el juego.
                </p>
                <ul className="list-disc list-inside space-y-2">
                    <li>Un piloto muy seleccionado por los jugadores <strong>subirá de precio</strong>.</li>
                    <li>Un piloto poco seleccionado <strong>bajará de precio</strong>.</li>
                </ul>
                <p>
                    Esta dinámica añade una capa extra de estrategia. ¡Fichar a una futura estrella antes de que su precio se dispare puede darte una gran ventaja!
                </p>
            </RuleCard>
        </div>
    );
};