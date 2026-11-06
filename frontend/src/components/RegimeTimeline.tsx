import React from 'react';
import type { DataPoint } from '../types';
import { REGIME_COLORS } from '../utils/constants';

interface RegimeTimelineProps {
  dataPoints: DataPoint[];
  states: string[];
}

export const RegimeTimeline: React.FC<RegimeTimelineProps> = ({ dataPoints, states }) => {
  const validPoints = dataPoints.slice(1);
  const total = states.length;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-3">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide">Viterbi Decoded Regime Timeline</h3>
          <p className="text-xs text-slate-400">Chronological sequence of most probable discrete market states</p>
        </div>
        <div className="text-xs text-slate-400">
          <span>{validPoints[0]?.date}</span>
          <span className="mx-2">&rarr;</span>
          <span>{validPoints[validPoints.length - 1]?.date}</span>
        </div>
      </div>

      {/* Ribbon Bar */}
      <div className="w-full h-8 rounded-lg overflow-hidden flex bg-slate-950 border border-slate-800 shadow-inner">
        {states.map((regime, idx) => {
          const dp = validPoints[idx];
          const color = REGIME_COLORS[regime as keyof typeof REGIME_COLORS] || '#64748b';
          const returnStr = dp?.log_return !== null && dp?.log_return !== undefined 
            ? `${(dp.log_return * 100).toFixed(2)}%` 
            : 'N/A';

          return (
            <div
              key={idx}
              className="h-full flex-1 hover:opacity-100 hover:scale-y-110 transition-all cursor-pointer relative group"
              style={{ backgroundColor: color, opacity: 0.85 }}
            >
              {/* Tooltip on hover */}
              <div className="hidden group-hover:block absolute bottom-10 left-1/2 -translate-x-1/2 bg-slate-950 border border-slate-700 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap z-50 shadow-xl pointer-events-none">
                <div><b>Date:</b> {dp?.date}</div>
                <div><b>Regime:</b> {regime}</div>
                <div><b>Return:</b> {returnStr}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
        <span>T = 1 ({validPoints[0]?.date})</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: REGIME_COLORS.Bear }} />
            Bear
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: REGIME_COLORS.Stable }} />
            Stable
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: REGIME_COLORS.Bull }} />
            Bull
          </span>
        </div>
        <span>T = {total} ({validPoints[validPoints.length - 1]?.date})</span>
      </div>
    </div>
  );
};
