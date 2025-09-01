import React, { useState } from 'react';
import { Header } from './components/Header';
import { TeamBuilder } from './components/TeamBuilder';
import { Results } from './components/Results';

type View = 'builder' | 'results';

const App: React.FC = () => {
    const [view, setView] = useState<View>('builder');

    return (
        <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
            <Header currentView={view} setView={setView} />
            <main className="container mx-auto p-4 md:p-8">
                {view === 'builder' && <TeamBuilder />}
                {view === 'results' && <Results />}
            </main>
        </div>
    );
};

export default App;