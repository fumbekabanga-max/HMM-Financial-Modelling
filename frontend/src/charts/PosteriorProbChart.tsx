import React from 'react';
import Plot from 'react-plotly.js';
import type { DataPoint, PosteriorPoint } from '../types';
import { PLOTLY_DARK_LAYOUT, REGIME_COLORS } from '../utils/constants';

interface PosteriorProbChartProps {
  dataPoints: DataPoint[];
  posteriors: PosteriorPoint[];
}

export const PosteriorProbChart: React.FC<PosteriorProbChartProps> = ({ dataPoints, posteriors }) => {
  // Discard t=0 to align with returns/posteriors length
  const dates = dataPoints.slice(1).map((dp) => dp.date);
  const bearProbs = posteriors.map((p) => p.Bear * 100);
  const stableProbs = posteriors.map((p) => p.Stable * 100);
  const bullProbs = posteriors.map((p) => p.Bull * 100);

  const traces = [
    {
      x: dates,
      y: bearProbs,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'P(Bear)',
      line: { color: REGIME_COLORS.Bear, width: 2 },
      hovertemplate: '<b>Date</b>: %{x}<br><b>P(Bear)</b>: %{y:.1f}%<extra></extra>',
    },
    {
      x: dates,
      y: stableProbs,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'P(Stable)',
      line: { color: REGIME_COLORS.Stable, width: 2 },
      hovertemplate: '<b>Date</b>: %{x}<br><b>P(Stable)</b>: %{y:.1f}%<extra></extra>',
    },
    {
      x: dates,
      y: bullProbs,
      type: 'scatter' as const,
      mode: 'lines' as const,
      name: 'P(Bull)',
      line: { color: REGIME_COLORS.Bull, width: 2 },
      hovertemplate: '<b>Date</b>: %{x}<br><b>P(Bull)</b>: %{y:.1f}%<extra></extra>',
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide">Posterior Regime Probabilities P(S_t | Y_{'{1:T}'})</h3>
          <p className="text-xs text-slate-400">Smoothed state probabilities derived via Forward-Backward inference</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5" style={{ backgroundColor: REGIME_COLORS.Bear }} />
            <span className="text-slate-300 text-[11px]">Bear</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5" style={{ backgroundColor: REGIME_COLORS.Stable }} />
            <span className="text-slate-300 text-[11px]">Stable</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-0.5" style={{ backgroundColor: REGIME_COLORS.Bull }} />
            <span className="text-slate-300 text-[11px]">Bull</span>
          </div>
        </div>
      </div>

      <div className="w-full h-[280px]">
        <Plot
          data={traces}
          layout={{
            ...PLOTLY_DARK_LAYOUT,
            autosize: true,
            showlegend: false,
            xaxis: {
              ...PLOTLY_DARK_LAYOUT.xaxis,
              title: { text: 'Date', font: { size: 10, color: '#64748b' } },
            },
            yaxis: {
              ...PLOTLY_DARK_LAYOUT.yaxis,
              title: { text: 'Probability (%)', font: { size: 10, color: '#64748b' } },
              range: [0, 105],
              ticksuffix: '%',
            },
          }}
          useResizeHandler={true}
          style={{ width: '100%', height: '100%' }}
          config={{ responsive: true, displayModeBar: false }}
        />
      </div>
    </div>
  );
};
