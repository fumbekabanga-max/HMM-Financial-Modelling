import React from 'react';
import type { RegimeStat } from '../types';
import { REGIME_BG_CLASSES, REGIME_COLORS } from '../utils/constants';
import { Info } from 'lucide-react';

interface RegimeStatsTableProps {
  statistics: Record<string, RegimeStat>;
}

export const RegimeStatsTable: React.FC<RegimeStatsTableProps> = ({ statistics }) => {
  const regimes: Array<'Bear' | 'Stable' | 'Bull'> = ['Bear', 'Stable', 'Bull'];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide">Regime Characteristics & Descriptive Statistics</h3>
          <p className="text-xs text-slate-400">
            Estimated Gaussian emission parameters and empirical occupation metrics
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <Info className="w-3.5 h-3.5 text-blue-400" />
          <span>Annualized metrics assume 252 trading days</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider font-semibold">
              <th className="pb-3 pl-2">Regime</th>
              <th className="pb-3">Raw State ID</th>
              <th className="pb-3 text-right">Mean Return (Daily)</th>
              <th className="pb-3 text-right">Mean Return (Ann.)</th>
              <th className="pb-3 text-right">Volatility (Daily)</th>
              <th className="pb-3 text-right">Volatility (Ann.)</th>
              <th className="pb-3 text-right">Observations</th>
              <th className="pb-3 text-right">Share (%)</th>
              <th className="pb-3 text-right pr-2">Expected Duration</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {regimes.map((regimeName) => {
              const stat = statistics[regimeName];
              const badgeClass =
                REGIME_BG_CLASSES[regimeName as keyof typeof REGIME_BG_CLASSES] ||
                'bg-slate-800 text-slate-300';
              const dotColor = REGIME_COLORS[regimeName];

              if (!stat) {
                return (
                  <tr key={regimeName} className="text-slate-500">
                    <td className="py-3 pl-2 font-sans font-semibold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dotColor }} />
                      {regimeName}
                    </td>
                    <td colSpan={8} className="py-3 text-center italic">
                      No parameters available
                    </td>
                  </tr>
                );
              }

              const annMean = stat.mean_return * 252 * 100;
              const annVol = stat.volatility * Math.sqrt(252) * 100;
              const isZeroCount = stat.count === 0;

              return (
                <tr
                  key={regimeName}
                  className={`hover:bg-slate-800/30 transition-colors ${
                    isZeroCount ? 'text-slate-500' : 'text-slate-200'
                  }`}
                >
                  <td className="py-3.5 pl-2 font-sans font-semibold">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: dotColor }} />
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold border ${badgeClass}`}>
                        {regimeName}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 text-slate-400">
                    State #{stat.original_state_id}
                  </td>
                  <td className="py-3.5 text-right font-semibold">
                    {stat.mean_return >= 0 ? '+' : ''}{(stat.mean_return * 100).toFixed(3)}%
                  </td>
                  <td className="py-3.5 text-right">
                    {annMean >= 0 ? '+' : ''}{annMean.toFixed(1)}%
                  </td>
                  <td className="py-3.5 text-right font-semibold">
                    {(stat.volatility * 100).toFixed(2)}%
                  </td>
                  <td className="py-3.5 text-right">
                    {annVol.toFixed(1)}%
                  </td>
                  <td className="py-3.5 text-right font-sans">
                    {isZeroCount ? (
                      <span className="text-amber-400/90 font-semibold" title="Unsupervised HMM found zero occurrences in this sample">
                        0 days
                      </span>
                    ) : (
                      <span>{stat.count} days</span>
                    )}
                  </td>
                  <td className="py-3.5 text-right font-sans">
                    {(stat.proportion * 100).toFixed(1)}%
                  </td>
                  <td className="py-3.5 text-right pr-2 text-slate-300 font-sans">
                    {stat.expected_duration_days.toFixed(1)} days
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Note about zero counts */}
      <div className="text-[11px] text-slate-500 bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 flex items-start gap-2">
        <Info className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
        <span>
          <b>Note:</b> Because HMM parameter estimation is entirely unsupervised, a state with low empirical occurrence in a particular sample window may be assigned zero Viterbi observations. Its mathematical emission parameters ($\mu_k, \sigma_k$) remain valid conditional distributions.
        </span>
      </div>
    </div>
  );
};
