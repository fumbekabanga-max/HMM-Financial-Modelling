import React from 'react';
import type { HMMFitResponse } from '../types';
import { CheckCircle2, XCircle, Cpu, Sliders } from 'lucide-react';

interface ModelInfoPanelProps {
  hmm: HMMFitResponse;
  randomSeed?: number;
}

export const ModelInfoPanel: React.FC<ModelInfoPanelProps> = ({ hmm, randomSeed = 42 }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Cpu className="w-4 h-4 text-indigo-400" />
          <h3 className="text-sm font-bold text-white tracking-wide">Model Diagnostics & Hyperparameters</h3>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">hmmlearn.GaussianHMM</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {/* Model Architecture */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 space-y-1">
          <span className="text-slate-400 block text-[11px]">Architecture</span>
          <span className="font-semibold text-white">Gaussian HMM</span>
          <span className="text-[10px] text-slate-500 block">3 Hidden States</span>
        </div>

        {/* Training Algorithm */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 space-y-1">
          <span className="text-slate-400 block text-[11px]">Training Algorithm</span>
          <span className="font-semibold text-white">Baum-Welch (EM)</span>
          <span className="text-[10px] text-slate-500 block">Tol: 1e-4 &bull; Seed: {randomSeed}</span>
        </div>

        {/* State Decoding */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 space-y-1">
          <span className="text-slate-400 block text-[11px]">Optimal Decoding</span>
          <span className="font-semibold text-white">Viterbi Dynamic Prog.</span>
          <span className="text-[10px] text-slate-500 block">Global optimal path</span>
        </div>

        {/* Convergence Status */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 space-y-1">
          <span className="text-slate-400 block text-[11px]">Convergence Status</span>
          <div className="flex items-center gap-1.5 font-semibold">
            {hmm.converged ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Converged</span>
              </>
            ) : (
              <>
                <XCircle className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-rose-400">Not Converged</span>
              </>
            )}
          </div>
          <span className="text-[10px] text-slate-500 block">{hmm.n_iter} iterations executed</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center text-xs pt-1 border-t border-slate-800/60 text-slate-400">
        <div className="flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-slate-500" />
          <span><b>Log-Likelihood ln P(Y | &theta;):</b> <span className="font-mono text-white">{hmm.log_likelihood.toFixed(4)}</span></span>
        </div>
        <div className="text-[11px] text-slate-500 mt-1 sm:mt-0">
          State Mapping: {Object.entries(hmm.regime_mapping).map(([k, v]) => `#${k}&rarr;${v}`).join(', ')}
        </div>
      </div>
    </div>
  );
};
