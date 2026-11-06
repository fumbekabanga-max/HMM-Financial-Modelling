import React from 'react';
import { Header } from './components/Header';
import { Dashboard } from './pages/Dashboard';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      <Header />
      <main className="flex-1">
        <Dashboard />
      </main>
      <footer className="border-t border-slate-900 py-6 text-center text-xs text-slate-500">
        Financial Market Regime Modelling &bull; University Master's AI & Machine Learning Project
      </footer>
    </div>
  );
};

export default App;
