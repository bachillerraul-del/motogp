import React from 'react';
import type { Sport } from '../types';

interface PricePoint {
    raceRound: number;
    price: number;
}

interface PriceChartProps {
    data: PricePoint[];
    sport: Sport;
    currencyPrefix: string;
    currencySuffix: string;
}

const formatPriceLabel = (price: number, currencyPrefix: string, currencySuffix: string): string => {
    const value = currencySuffix === 'M' ? (price / 10).toFixed(1) : price;
    return `${currencyPrefix}${value}${currencySuffix}`;
};


export const PriceChart: React.FC<PriceChartProps> = ({ data, sport, currencyPrefix, currencySuffix }) => {
    if (data.length < 2) {
        return (
            <div className="flex items-center justify-center h-48 bg-gray-900/50 rounded-lg">
                <p className="text-gray-500">No hay suficientes datos para mostrar la evolución del precio.</p>
            </div>
        );
    }
    
    const theme = {
        line: sport === 'f1' ? 'stroke-red-500' : 'stroke-orange-500',
        dot: sport === 'f1' ? 'fill-red-500' : 'fill-orange-500',
        grid: 'stroke-gray-700',
        text: 'fill-gray-400 text-xs',
    };

    const width = 500;
    const height = 200;
    const padding = { top: 20, right: 30, bottom: 30, left: 50 };

    const prices = data.map(d => d.price);
    const rounds = data.map(d => d.raceRound);

    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const minRound = Math.min(...rounds);
    const maxRound = Math.max(...rounds);
    
    // Y-axis scale (price)
    const yScale = (price: number) => {
        if (maxPrice === minPrice) return padding.top;
        return height - padding.bottom - ((price - minPrice) / (maxPrice - minPrice)) * (height - padding.top - padding.bottom);
    };

    // X-axis scale (round)
    const xScale = (round: number) => {
        if (maxRound === minRound) return padding.left;
        return padding.left + ((round - minRound) / (maxRound - minRound)) * (width - padding.left - padding.right);
    };

    const pathData = data.map(d => `${xScale(d.raceRound)},${yScale(d.price)}`).join(' L ');

    const yAxisLabels = () => {
        const labels = [];
        const numLabels = 4;
        const step = (maxPrice - minPrice) / (numLabels - 1);
        for (let i = 0; i < numLabels; i++) {
            const price = minPrice + i * step;
            labels.push({
                y: yScale(price),
                label: formatPriceLabel(price, currencyPrefix, currencySuffix),
            });
        }
        return labels;
    };

    return (
        <div className="bg-gray-900/50 p-4 rounded-lg">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" aria-labelledby="chart-title" role="img">
                <title id="chart-title">Gráfico de Evolución de Precio</title>

                {/* Y-Axis Grid Lines & Labels */}
                {yAxisLabels().map(({ y, label }) => (
                    <g key={y}>
                        <line className={theme.grid} x1={padding.left} y1={y} x2={width - padding.right} y2={y} strokeDasharray="2,2" />
                        <text className={theme.text} x={padding.left - 8} y={y + 3} textAnchor="end">{label}</text>
                    </g>
                ))}

                 {/* X-Axis Labels */}
                {data.map(({ raceRound }) => (
                     <text key={raceRound} className={theme.text} x={xScale(raceRound)} y={height - padding.bottom + 15} textAnchor="middle">
                        {raceRound === 0 ? 'Inicio' : `R${raceRound}`}
                    </text>
                ))}

                {/* Data Line */}
                <path d={`M ${pathData}`} className={`${theme.line} fill-none`} strokeWidth="2" />

                {/* Data Points */}
                {data.map(({ raceRound, price }) => (
                    <circle key={raceRound} cx={xScale(raceRound)} cy={yScale(price)} r="3" className={theme.dot}>
                         <title>
                            {raceRound === 0 ? 'Precio Inicial' : `Jornada ${raceRound}`}: {formatPriceLabel(price, currencyPrefix, currencySuffix)}
                        </title>
                    </circle>
                ))}
            </svg>
        </div>
    );
};