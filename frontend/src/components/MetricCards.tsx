import React from 'react';
import type { AnalysisResult } from '../types';
import { REGIME_BG_CLASSES } from '../utils/constants';
import { Calendar, Database, Percent, TrendingUp, Activity } from 'lucide-react';

interface MetricCardsProps {
  result: AnalysisResult;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ result }) => {
  const { preprocess, overall_mean_return, overall_volatility, current_regime, current_regime_probability } = result;

  const regimeClass =
    REGIME_BG_CLASSES[current_regime as keyof typeof REGIME_BG_CLASSES] ||
    'bg-slate-800 text-slate-300 border-slate-700';

  // Annualized metrics (252 trading days)
  const annualizedMean = overall_mean_return * 252 * 100;
  const annualizedVol = overall_volatility * Math.sqrt(252) * 100;

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {/* 1. Observation Count */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md space-y-1">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-medium uppercase tracking-wider">Observations</span>
          <Database className="w-4 h-4 text-blue-400" />
        </div>
        <div className="text-xl sm:text-2xl font-bold text-white">{preprocess.cleaned_count}</div>
        <div className="text-[10px] text-slate-500">
          {preprocess.original_count !== preprocess.cleaned_count
            ? `${preprocess.original_count} raw rows cleaned`
            : 'All rows validated'}
        </div>
      </div>

      {/* 2. Date Range */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md space-y-1">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-medium uppercase tracking-wider">Date Range</span>
          <Calendar className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="text-xs sm:text-sm font-semibold text-white truncate pt-1">
          {preprocess.date_range.start}
        </div>
        <div className="text-xs text-slate-400 truncate">
          &rarr; {preprocess.date_range.end}
        </div>
      </div>

      {/* 3. Current Inferred Regime */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md space-y-1">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-medium uppercase tracking-wider">Current Regime</span>
          <Activity className="w-4 h-4 text-indigo-400" />
        </div>
        <div className="pt-0.5">
          <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-bold border ${regimeClass}`}>
            {current_regime}
          </span>
        </div>
        <div className="text-[10px] text-slate-500">Viterbi state at T</div>
      </div>

      {/* 4. Current Posterior Probability */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md space-y-1">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-medium uppercase tracking-wider">State Confidence</span>
          <Percent className="w-4 h-4 text-purple-400" />
        </div>
        <div className="text-xl sm:text-2xl font-bold text-white">
          {(current_regime_probability * 100).toFixed(1)}%
        </div>
        <div className="text-[10px] text-slate-500">P(S_T = {current_regime} | Y)</div>
      </div>

      {/* 5. Average Return */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md space-y-1">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-medium uppercase tracking-wider">Mean Return</span>
          <TrendingUp className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="text-lg sm:text-xl font-bold text-white">
          {(overall_mean_return * 100).toFixed(3)}%
        </div>
        <div className="text-[10px] text-slate-500">
          Ann: {annualizedMean >= 0 ? '+' : ''}{annualizedMean.toFixed(1)}%
        </div>
      </div>

      {/* 6. Overall Volatility */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-md space-y-1">
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-medium uppercase tracking-wider">Overall Volatility</span>
          <Activity className="w-4 h-4 text-amber-400" />
        </div>
        <div className="text-lg sm:text-xl font-bold text-white">
          {(overall_volatility * 100).toFixed(2)}%
        </div>
        <div className="text-[10px] text-slate-500">
          Ann: {annualizedVol.toFixed(1)}%
        </div>
      </div>
    </div>
  );
};
