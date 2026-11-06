import React from 'react';
import { UploadCloud, FileSpreadsheet, BarChart3, ShieldCheck } from 'lucide-react';

interface EmptyStateProps {
  onLoadSample: () => void;
  isLoadingSample: boolean;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onLoadSample, isLoadingSample }) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 sm:p-12 text-center space-y-6 shadow-xl max-w-3xl mx-auto">
      <div className="mx-auto w-16 h-16 rounded-2xl bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
        <UploadCloud className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h3 className="text-xl sm:text-2xl font-bold text-white">
          Upload historical financial data to begin market regime analysis.
        </h3>
        <p className="text-sm text-slate-400 max-w-lg mx-auto leading-relaxed">
          Provide a CSV file containing at minimum <code className="text-blue-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">Date</code> and <code className="text-blue-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">Close</code> columns.
          The pipeline will validate prices, compute stationary logarithmic returns, and train a 3-state Gaussian HMM.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-xl mx-auto text-xs text-slate-400 pt-2">
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 space-y-1">
          <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-white block">CSV Validation</span>
          <span>Deduplicates dates, checks positivity (P &gt; 0), calculates r_t</span>
        </div>
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 space-y-1">
          <BarChart3 className="w-4 h-4 text-indigo-400" />
          <span className="font-semibold text-white block">Baum-Welch (EM)</span>
          <span>Infers 3 latent states and transition probability matrix</span>
        </div>
        <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 space-y-1">
          <ShieldCheck className="w-4 h-4 text-amber-400" />
          <span className="font-semibold text-white block">Regime Sorting</span>
          <span>Deterministic ordering into Bear, Stable, and Bull</span>
        </div>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={onLoadSample}
          disabled={isLoadingSample}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
        >
          {isLoadingSample ? (
            <span>Loading benchmark sample...</span>
          ) : (
            <>
              <FileSpreadsheet className="w-4 h-4" />
              <span>Load S&P 500 Benchmark Sample (2022&ndash;2023)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
