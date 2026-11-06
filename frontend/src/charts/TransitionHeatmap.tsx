import React from 'react';
import Plot from 'react-plotly.js';
import { PLOTLY_DARK_LAYOUT } from '../utils/constants';

interface TransitionHeatmapProps {
  transitionMatrix: number[][];
  regimes?: string[];
}

export const TransitionHeatmap: React.FC<TransitionHeatmapProps> = ({
  transitionMatrix,
  regimes = ['Bear', 'Stable', 'Bull'],
}) => {
  // Format annotations for heatmap cells
  const annotations = [];
  for (let i = 0; i < regimes.length; i++) {
    for (let j = 0; j < regimes.length; j++) {
      const val = transitionMatrix[i]?.[j] ?? 0;
      annotations.push({
        x: regimes[j],
        y: regimes[i],
        text: (val * 100).toFixed(1) + '%',
        font: {
          color: val > 0.5 ? '#ffffff' : '#94a3b8',
          size: 13,
          weight: 600,
        },
        showarrow: false,
      });
    }
  }

  const data = [
    {
      z: transitionMatrix,
      x: regimes,
      y: regimes,
      type: 'heatmap' as const,
      colorscale: [
        [0, '#0f172a'],      // Slate 900
        [0.3, '#1e293b'],    // Slate 800
        [0.6, '#1e3a8a'],    // Blue 900
        [1, '#2563eb'],      // Blue 600
      ],
      showscale: false,
      hovertemplate:
        '<b>From</b>: %{y}<br><b>To</b>: %{x}<br><b>Transition Probability</b>: %{z:.4f}<extra></extra>',
    },
  ];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg flex flex-col justify-between">
      <div>
        <h3 className="text-sm font-bold text-white tracking-wide">Transition Probability Matrix (A)</h3>
        <p className="text-xs text-slate-400">Row-stochastic probabilities P(S_t = j | S_{'{t-1}'} = i)</p>
      </div>

      <div className="w-full h-[280px]">
        <Plot
          data={data}
          layout={{
            ...PLOTLY_DARK_LAYOUT,
            autosize: true,
            annotations,
            xaxis: {
              ...PLOTLY_DARK_LAYOUT.xaxis,
              title: { text: 'Next Regime (t)', font: { size: 10, color: '#64748b' } },
              side: 'bottom',
            },
            yaxis: {
              ...PLOTLY_DARK_LAYOUT.yaxis,
              title: { text: 'Current Regime (t-1)', font: { size: 10, color: '#64748b' } },
              autorange: 'reversed', // Top-to-bottom matrix display
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
