import React from 'react';
import Plot from 'react-plotly.js';
import type { RegimeStat } from '../types';
import { PLOTLY_DARK_LAYOUT, REGIME_COLORS } from '../utils/constants';

interface RegimeDistributionChartProps {
  statistics: Record<string, RegimeStat>;
  totalObservations: number;
}

export const RegimeDistributionChart: React.FC<RegimeDistributionChartProps> = ({
  statistics,
  totalObservations,
}) => {
  const regimes: Array<'Bear' | 'Stable' | 'Bull'> = ['Bear', 'Stable', 'Bull'];
  const labels = regimes;
  const values = regimes.map((r) => statistics[r]?.count ?? 0);
  const colors = regimes.map((r) => REGIME_COLORS[r]);

  const data = [
    {
      labels,
      values,
      type: 'pie' as const,
      hole: 0.65,
      marker: { colors },
      textinfo: 'percent' as const,
      textposition: 'outside' as const,
      hoverinfo: 'label+value+percent' as const,
      hovertemplate: '<b>%{label}</b>: %{value} days (%{percent})<extra></extra>',
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg flex flex-col justify-between">
      <div>
        <h3 className="text-sm font-bold text-white tracking-wide">Regime Distribution Share</h3>
        <p className="text-xs text-slate-400">Proportion of trading days spent in each regime state</p>
      </div>

      <div className="w-full h-[280px] relative">
        <Plot
          data={data}
          layout={{
            ...PLOTLY_DARK_LAYOUT,
            autosize: true,
            showlegend: true,
            legend: {
              orientation: 'h',
              yanchor: 'bottom',
              y: -0.2,
              xanchor: 'center',
              x: 0.5,
              font: { color: '#94a3b8', size: 10 },
            },
            margin: { t: 10, r: 10, b: 40, l: 10 },
          }}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          config={{ responsive: true, displayModeBar: false }}
        />

        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-6">
          <span className="text-xl font-bold text-white">{totalObservations}</span>
          <span className="text-[10px] uppercase tracking-wider text-slate-400">Total Days</span>
        </div>
      </div>
    </div>
  );
};
