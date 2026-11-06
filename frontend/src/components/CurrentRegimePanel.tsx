import React from 'react';
import { REGIME_BG_CLASSES, REGIME_COLORS } from '../utils/constants';
import { Activity, AlertCircle, ShieldCheck } from 'lucide-react';

interface CurrentRegimePanelProps {
  currentRegime: string;
  posteriorProbability: number;
  asOfDate: string;
}

export const CurrentRegimePanel: React.FC<CurrentRegimePanelProps> = ({
  currentRegime,
  posteriorProbability,
  asOfDate,
}) => {
  const badgeClass =
    REGIME_BG_CLASSES[currentRegime as keyof typeof REGIME_BG_CLASSES] ||
    'bg-slate-800 text-slate-300 border-slate-700';

  const regimeColor = REGIME_COLORS[currentRegime as keyof typeof REGIME_COLORS] || '#64748b';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
      <div className="flex items-start gap-4">
        <div
          className="p-3.5 rounded-xl border flex items-center justify-center shrink-0 shadow-inner"
          style={{
            backgroundColor: `${regimeColor}15`,
            borderColor: `${regimeColor}40`,
            color: regimeColor,
          }}
        >
          <Activity className="w-7 h-7" />
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
              Latest Inferred Regime
            </span>
            <span className="text-[11px] text-slate-500">&bull; as of {asOfDate}</span>
          </div>

          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {currentRegime} Market
            </h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeClass}`}>
              Active State
            </span>
          </div>

          <p className="text-xs text-slate-400 max-w-xl">
            Inferred by global Viterbi path decoding on continuous historical logarithmic returns.
          </p>
        </div>
      </div>

      {/* Posterior Probability & Diagnostic Box */}
      <div className="bg-slate-950 border border-slate-800/80 rounded-xl p-4 w-full md:w-auto min-w-[260px] space-y-2">
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400 font-medium">Posterior Probability</span>
          <span className="text-white font-bold text-base">
            {(posteriorProbability * 100).toFixed(1)}%
          </span>
        </div>

        {/* Confidence progress bar */}
        <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.min(100, Math.max(0, posteriorProbability * 100))}%`,
              backgroundColor: regimeColor,
            }}
          />
        </div>

        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" />
          <span>Smoothed conditional likelihood P(S_T | Y_{'{1:T}'})</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-amber-400/90 pt-0.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Non-predictive historical diagnostic measure</span>
        </div>
      </div>
    </div>
  );
};
