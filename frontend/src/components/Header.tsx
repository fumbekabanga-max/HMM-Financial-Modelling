import React from 'react';
import { Activity, Layers, Cpu } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-start sm:items-center space-x-3.5">
          <div className="p-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl shrink-0 mt-1 sm:mt-0">
            <Activity className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-white">
                Financial Market Regime Modelling
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold uppercase tracking-wider">
                HMM
              </span>
            </div>
            <p className="text-xs font-semibold text-slate-300">
              Hidden Markov Model-Based Financial Market Analysis
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 max-w-2xl">
              This application uses historical financial returns to infer latent market regimes (Bear, Stable, and Bull) using a 3-state Gaussian Hidden Markov Model.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs text-slate-300 self-end md:self-center shrink-0">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-[11px] font-medium">3 Latent States</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-medium">Baum-Welch / Viterbi</span>
          </div>
        </div>
      </div>
    </header>
  );
};
