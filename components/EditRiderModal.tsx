import React, { useState, useEffect } from 'react';
import type { Rider, Constructor, Sport } from '../types';
import { Modal } from './Modal';

interface EditRiderModalProps {
    rider: Rider | null;
    constructors: Constructor[];
    onClose: () => void;
    onSave: (rider: Rider | Omit<Rider, 'id'>) => Promise<void>;
    sport: Sport;
}

const createDefaultRider = (constructorId: number): Omit<Rider, 'id'> => ({
    name: '',
    team: '',
    bike: '',
    price: 0,
    initial_price: 0,
    condition: null,
    constructor_id: constructorId,
    is_official: true,
});

export const EditRiderModal: React.FC<EditRiderModalProps> = ({ rider, constructors, onClose, onSave, sport }) => {
    const [formData, setFormData] = useState<Rider | Omit<Rider, 'id'>>(() => 
        rider || createDefaultRider(constructors[0]?.id || 0)
    );

    useEffect(() => {
        setFormData(rider || createDefaultRider(constructors[0]?.id || 0));
    }, [rider, constructors]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;

        if (name === 'is_official') {
            setFormData(prev => ({
                ...prev,
                is_official: value === 'true',
            }));
            return;
        }

        const isNumeric = ['price', 'initial_price', 'constructor_id'].includes(name);

        setFormData(prev => ({
            ...prev,
            [name]: isNumeric ? parseInt(value, 10) || 0 : (name === 'condition' && value === '' ? null : value),
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const theme = {
        focusRing: sport === 'f1' ? 'focus:ring-red-500' : 'focus:ring-orange-500',
        button: sport === 'f1' ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-500 hover:bg-orange-600',
    };

    const title = rider ? `Editar ${rider.name}` : 'Crear Nuevo Piloto';

    return (
        <Modal isOpen={true} onClose={onClose} title={title} sport={sport}>
             <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">Nombre</label>
                        <input id="name" name="name" type="text" value={formData.name} onChange={handleChange} className={`w-full bg-gray-900 text-white p-2 rounded-md ${theme.focusRing}`} required />
                    </div>
                     <div>
                        <label htmlFor="team" className="block text-sm font-medium text-gray-300 mb-1">Nombre Equipo (Display)</label>
                        <input id="team" name="team" type="text" value={formData.team} onChange={handleChange} className={`w-full bg-gray-900 text-white p-2 rounded-md ${theme.focusRing}`} required />
                    </div>
                     <div>
                        <label htmlFor="bike" className="block text-sm font-medium text-gray-300 mb-1">Motor/Chasis</label>
                        <input id="bike" name="bike" type="text" value={formData.bike} onChange={handleChange} className={`w-full bg-gray-900 text-white p-2 rounded-md ${theme.focusRing}`} required />
                    </div>
                     <div>
                        <label htmlFor="constructor_id" className="block text-sm font-medium text-gray-300 mb-1">Escudería (Constructor)</label>
                        <select id="constructor_id" name="constructor_id" value={formData.constructor_id} onChange={handleChange} className={`w-full bg-gray-900 text-white p-2 rounded-md ${theme.focusRing}`} required>
                            {constructors.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    </div>
                     <div>
                        <label htmlFor="price" className="block text-sm font-medium text-gray-300 mb-1">Precio Actual</label>
                        <input id="price" name="price" type="number" value={formData.price} onChange={handleChange} className={`w-full bg-gray-900 text-white p-2 rounded-md ${theme.focusRing}`} required />
                    </div>
                     <div>
                        <label htmlFor="initial_price" className="block text-sm font-medium text-gray-300 mb-1">Precio Inicial</label>
                        <input id="initial_price" name="initial_price" type="number" value={formData.initial_price} onChange={handleChange} className={`w-full bg-gray-900 text-white p-2 rounded-md ${theme.focusRing}`} required />
                    </div>
                    <div>
                        <label htmlFor="condition" className="block text-sm font-medium text-gray-300 mb-1">Estado</label>
                        <select id="condition" name="condition" value={formData.condition || ''} onChange={handleChange} className={`w-full bg-gray-900 text-white p-2 rounded-md ${theme.focusRing}`}>
                            <option value="">Disponible</option>
                            <option value="Rider is injured">Lesionado</option>
                            <option value="Rider is unavailable">No Disponible</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="is_official" className="block text-sm font-medium text-gray-300 mb-1">Categoría</label>
                        <select id="is_official" name="is_official" value={String(formData.is_official)} onChange={handleChange} className={`w-full bg-gray-900 text-white p-2 rounded-md ${theme.focusRing}`}>
                            <option value="true">Oficial</option>
                            <option value="false">Reserva</option>
                        </select>
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                     <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Cancelar</button>
                     <button type="submit" className={`text-white font-bold py-2 px-4 rounded-lg transition-colors ${theme.button}`}>Guardar Cambios</button>
                </div>
            </form>
        </Modal>
    );
};