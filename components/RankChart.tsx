import React from 'react';
import type { Sport } from '../types';

interface RankPoint {
    raceRound: number;
    rank: number;
}

interface RankChartProps {
    data: RankPoint[];
    sport: Sport;
}

export const RankChart: React.FC<RankChartProps> = ({ data, sport }) => {
    if (data.length < 2) {
        return (
            <div className="flex items-center justify-center h-24 bg-gray-700/30 rounded-lg">
                <p className="text-gray-500 text-xs">No hay suficientes datos para el gráfico.</p>
            </div>
        );
    }
    
    const theme = {
        line: sport === 'f1' ? 'stroke-red-500' : 'stroke-orange-500',
        dot: sport === 'f1' ? 'fill-red-500' : 'fill-orange-500',
        text: 'fill-gray-400 text-[10px]',
    };

    const width = 300;
    const height = 100;
    const padding = { top: 10, right: 10, bottom: 20, left: 25 };

    const ranks = data.map(d => d.rank);
    const rounds = data.map(d => d.raceRound);

    const minRank = Math.max(...ranks); // Inverted Y-axis: lower rank is better (higher on chart)
    const maxRank = Math.min(...ranks);
    const minRound = Math.min(...rounds);
    const maxRound = Math.max(...rounds);
    
    const yScale = (rank: number) => {
        if (maxRank === minRank) return padding.top;
        return padding.top + ((rank - maxRank) / (minRank - maxRank)) * (height - padding.top - padding.bottom);
    };

    const xScale = (round: number) => {
        if (maxRound === minRound) return padding.left;
        return padding.left + ((round - minRound) / (maxRound - minRound)) * (width - padding.left - padding.right);
    };

    const pathData = data.map(d => `${xScale(d.raceRound)},${yScale(d.rank)}`).join(' L ');

    return (
        <div className="bg-gray-700/30 p-2 rounded-lg">
             <h5 className="text-xs font-bold text-gray-300 mb-1">Evolución del Ranking</h5>
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" aria-labelledby="rank-chart-title" role="img">
                <title id="rank-chart-title">Gráfico de Evolución del Ranking</title>

                {/* Y-Axis Labels */}
                <text className={theme.text} x={padding.left - 4} y={yScale(maxRank) + 4} textAnchor="end">{maxRank}</text>
                <text className={theme.text} x={padding.left - 4} y={yScale(minRank) + 4} textAnchor="end">{minRank}</text>

                 {/* X-Axis Labels */}
                {data.map(({ raceRound }) => (
                     <text key={raceRound} className={theme.text} x={xScale(raceRound)} y={height - padding.bottom + 12} textAnchor="middle">
                        R{raceRound}
                    </text>
                ))}

                {/* Data Line */}
                <path d={`M ${pathData}`} className={`${theme.line} fill-none`} strokeWidth="1.5" />

                {/* Data Points */}
                {data.map(({ raceRound, rank }) => (
                    <circle key={raceRound} cx={xScale(raceRound)} cy={yScale(rank)} r="2.5" className={theme.dot}>
                         <title>Jornada {raceRound}: {rank}º</title>
                    </circle>
                ))}
            </svg>
        </div>
    );
};
