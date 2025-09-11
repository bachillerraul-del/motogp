import React from 'react';
import { Sport } from '../types';

interface CountdownProps {
    timeRemaining: {
        days: number;
        hours: number;
        minutes: number;
        seconds: number;
    };
    sport: Sport;
}

const TimeBlock: React.FC<{ value: number; label: string }> = ({ value, label }) => (
    <div className="flex flex-col items-center">
        <span className="text-2xl md:text-4xl font-bold text-white bg-gray-900/50 px-3 py-2 rounded-lg">{String(value).padStart(2, '0')}</span>
        <span className="text-xs md:text-sm text-gray-400 uppercase mt-1">{label}</span>
    </div>
);

export const Countdown: React.FC<CountdownProps> = ({ timeRemaining, sport }) => {
    const colonColor = sport === 'f1' ? 'text-red-500' : 'text-orange-400';
    return (
        <div className="flex items-center justify-center space-x-2 md:space-x-4">
            <TimeBlock value={timeRemaining.days} label="Días" />
            <span className={`text-2xl md:text-4xl font-bold ${colonColor}`}>:</span>
            <TimeBlock value={timeRemaining.hours} label="Horas" />
            <span className={`text-2xl md:text-4xl font-bold ${colonColor}`}>:</span>
            <TimeBlock value={timeRemaining.minutes} label="Minutos" />
            <span className={`text-2xl md:text-4xl font-bold ${colonColor}`}>:</span>
            <TimeBlock value={timeRemaining.seconds} label="Segundos" />
        </div>
    );
};