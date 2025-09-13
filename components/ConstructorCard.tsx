import React, { useMemo } from 'react';
import type { Constructor, Rider, Sport } from '../types';
import { PlusIcon, ArrowUpIcon, ArrowDownIcon, RemoveIcon } from './Icons';

interface ConstructorCardProps {
    constructorItem: Constructor;
    onAdd: (constructor: Constructor) => void;
    onSelect: (constructor: Constructor) => void;
    isAffordable: boolean;
    isSelected: boolean;
    priceChange: number;
    currencyPrefix: string;
    currencySuffix: string;
    sport: Sport;
    riders: Rider[];
}

export const ConstructorCard: React.FC<ConstructorCardProps> = ({
    constructorItem, onAdd, onSelect, isAffordable, isSelected,
    priceChange, currencyPrefix, currencySuffix, sport, riders
}) => {
    
    const formatPrice = (price: number): string => {
        const value = currencySuffix === 'M' ? (price / 10).toFixed(1) : price.toLocaleString('es-ES');
        return `${currencyPrefix}${value}${currencySuffix}`;
    }

    const getButtonText = () => {
        if (isSelected) return 'Quitar Escudería';
        if (!isAffordable) return 'Excede Presupuesto';
        return 'Seleccionar Escudería';
    };

    const buttonTheme = sport === 'f1'
        ? 'bg-red-600 hover:bg-red-700'
        : 'bg-orange-500 hover:bg-orange-600';
    
    const cardTheme = sport === 'f1'
        ? 'hover:shadow-red-600/30'
        : 'hover:shadow-orange-500/30';

    const constructorRiders = useMemo(() =>
        riders.filter(r => {
            if (r.constructor_id) return r.constructor_id === constructorItem.id;
            return r.team === constructorItem.name;
        }).map(r => r.name).join(', '),
    [riders, constructorItem]);

    return (
        <div className={`bg-gray-800 rounded-lg shadow-lg p-4 flex flex-col justify-between transition-all duration-300 ${cardTheme} ${isSelected ? 'ring-2 ring-green-500' : ''}`}>
            <div 
                className="cursor-pointer group"
                onClick={() => onSelect(constructorItem)}
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect(constructorItem)}
                role="button"
                tabIndex={0}
                aria-label={`Ver detalles de ${constructorItem.name}`}
            >
                <div className="flex justify-between items-start mb-2">
                    <div>
                        <h3 className="text-xl font-bold text-white group-hover:underline">{constructorItem.name}</h3>
                        <p className="text-sm text-gray-400 truncate" title={constructorRiders}>
                            {constructorRiders || 'Sin pilotos asignados'}
                        </p>
                    </div>
                    <div className="text-right flex-shrink-0 ml-2">
                        <p className="text-lg font-semibold text-white">{formatPrice(constructorItem.price)}</p>
                         {priceChange !== 0 && (
                            <span className={`text-xs font-bold flex items-center justify-end gap-1 ${priceChange > 0 ? 'text-green-400' : 'text-red-500'}`}>
                                {priceChange > 0 ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />}
                                <span>{formatPrice(Math.abs(priceChange))}</span>
                            </span>
                        )}
                    </div>
                </div>
            </div>
            <button
                onClick={() => onAdd(constructorItem)}
                disabled={!isSelected && !isAffordable}
                className={`mt-auto w-full flex items-center justify-center text-white font-bold py-2 px-4 rounded-lg transition-colors duration-300
                    ${isSelected
                        ? 'bg-fuchsia-600 hover:bg-fuchsia-700'
                        : `${buttonTheme} disabled:bg-gray-600 disabled:cursor-not-allowed`
                    }
                `}
            >
                {isSelected ? <RemoveIcon className="w-5 h-5 mr-2" /> : <PlusIcon className="w-5 h-5 mr-2" />}
                {getButtonText()}
            </button>
        </div>
    );
};