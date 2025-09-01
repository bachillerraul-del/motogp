import React, { useState, useCallback, useEffect } from 'react';
import { Header } from './components/Header';
import { TeamBuilder } from './components/TeamBuilder';
import { Results } from './components/Results';
import { Toast } from './components/Toast';
import { supabase } from './lib/supabaseClient';
import type { Participant, Rider } from './types';

type View = 'builder' | 'results';

const App: React.FC = () => {
    const [view, setView] = useState<View>('builder');
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ id: number; message: string; type: 'success' | 'error' } | null>(null);

    const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        setToast({ id: Date.now(), message, type });
    }, []);

    useEffect(() => {
        const fetchParticipants = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('participants')
                .select('*')
                .order('id');

            if (error) {
                console.error('Error fetching participants:', error);
                showToast('No se pudieron cargar los participantes.', 'error');
            } else {
                setParticipants(data || []);
            }
            setLoading(false);
        };
        fetchParticipants();
    }, [showToast]);

    const addParticipantToLeague = useCallback(async (name: string, team: Rider[]) => {
        const newParticipantData = {
            name,
            team_ids: team.map(r => r.id),
        };

        const { data, error } = await supabase
            .from('participants')
            .insert(newParticipantData)
            .select()
            .single();

        if (error) {
            console.error('Error adding participant:', error);
            showToast('Error al añadir participante.', 'error');
        } else if (data) {
            setParticipants(prev => [...prev, data]);
            showToast(`'${name}' ha sido añadido a la liga.`, 'success');
            setView('results');
        }
    }, [showToast]);

    const handleUpdateParticipant = async (participant: Participant) => {
        const { id, ...updateData } = participant;
        const { error } = await supabase
            .from('participants')
            .update(updateData)
            .eq('id', id);

        if (error) {
            console.error('Error updating participant:', error);
            showToast('Error al actualizar participante.', 'error');
        } else {
            setParticipants(prev => prev.map(p => p.id === id ? participant : p));
        }
    };
    
    const handleDeleteParticipant = async (participantId: number) => {
        const { error } = await supabase
            .from('participants')
            .delete()
            .eq('id', participantId);
        
        if (error) {
             console.error('Error deleting participant:', error);
            showToast('Error al eliminar participante.', 'error');
        } else {
            setParticipants(prev => prev.filter(p => p.id !== participantId));
            showToast('Participante eliminado.', 'success');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center">
                <svg className="animate-spin h-10 w-10 text-red-600 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p className="text-xl">Cargando datos de la liga...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
            <Toast toast={toast} onClose={() => setToast(null)} />
            <Header currentView={view} setView={setView} />
            <main className="container mx-auto p-4 md:p-8">
                {view === 'builder' && (
                    <TeamBuilder 
                        onAddToLeague={addParticipantToLeague}
                        showToast={showToast}
                    />
                )}
                {view === 'results' && (
                    <Results 
                        participants={participants}
                        onUpdateParticipant={handleUpdateParticipant}
                        onDeleteParticipant={handleDeleteParticipant}
                    />
                )}
            </main>
        </div>
    );
};

export default App;