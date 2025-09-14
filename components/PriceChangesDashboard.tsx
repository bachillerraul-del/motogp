
import React, { useMemo } from 'react';
import type { Sport, Rider, Constructor } from '../types';
import { ArrowUpIcon, ArrowDownIcon, ChartBarIcon } from './Icons';

interface PriceChangesDashboardProps {
    riders: Rider[];
    constructors: Constructor[];
    sport: Sport;
    currencyPrefix: string;
    currencySuffix: string;
}

const PriceChangeItem: React.FC<{ item: { name: string; change: number }; formatPrice: (price: number) => string; isRiser: boolean }> = ({ item, formatPrice, isRiser }) => (
    <div className="flex justify-between items-center bg-gray-900/50 p-2 rounded-md">
        <p className="font-semibold text-white text-sm truncate">{item.name}</p>
        <span className={`font-bold flex items-center gap-1 text-sm ${isRiser ? 'text-green-400' : 'text-red-500'}`}>
            {isRiser ? <ArrowUpIcon className="w-4 h-4" /> : <ArrowDownIcon className="w-4 h-4" />}
            {formatPrice(Math.abs(item.change))}
        </span>
    </div>
);

export const PriceChangesDashboard: React.FC<PriceChangesDashboardProps> = ({ riders, constructors, sport, currencyPrefix, currencySuffix }) => {
    const formatPrice = (price: number): string => {
        const value = currencySuffix === 'M' ? (price / 10).toFixed(1) : price.toLocaleString('es-ES');
        return `${currencyPrefix}${value}${currencySuffix}`;
    };

    const priceChanges = useMemo(() => {
        const allItems = [
            ...riders.map(r => ({ ...r, type: 'Rider' })),
            ...constructors.map(c => ({ ...c, type: 'Constructor' }))
        ];

        const changedItems = allItems
            .map(item => ({
                name: item.name,
                change: item.price - item.initial_price
            }))
            .filter(item => item.change !== 0);

        const risers = [...changedItems].sort((a, b) => b.change - a.change).slice(0, 3);
        const fallers = [...changedItems].sort((a, b) => a.change - b.change).slice(0, 3);

        return { risers, fallers };
    }, [riders, constructors]);

    if (priceChanges.risers.length === 0 && priceChanges.fallers.length === 0) {
        return null;
    }
    
    const theme = {
        primaryColor: sport === 'f1' ? 'text-red-500' : 'text-orange-500',
    };

    return (
        <div className="bg-gray-800 rounded-lg shadow-lg p-5">
            <div className="flex items-center gap-4 mb-4">
                <ChartBarIcon className={`w-7 h-7 ${theme.primaryColor}`} />
                <h3 className="text-xl font-bold text-white">Variaciones de Mercado</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                    <h4 className="font-bold text-green-400 mb-2">Mayores Subidas</h4>
                    <div className="space-y-2">
                        {priceChanges.risers.length > 0 ? (
                            priceChanges.risers.map(item => <PriceChangeItem key={item.name} item={item} formatPrice={formatPrice} isRiser={true} />)
                        ) : (
                            <p className="text-sm text-gray-500 text-center py-4">Sin subidas de precio.</p>
                        )}
                    </div>
                </div>
                <div>
                    <h4 className="font-bold text-red-500 mb-2">Mayores Bajadas</h4>
                    <div className="space-y-2">
                        {priceChanges.fallers.length > 0 ? (
                            priceChanges.fallers.map(item => <PriceChangeItem key={item.name} item={item} formatPrice={formatPrice} isRiser={false} />)
                        ) : (
                            <p className="text-sm text-gray-500 text-center py-4">Sin bajadas de precio.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
