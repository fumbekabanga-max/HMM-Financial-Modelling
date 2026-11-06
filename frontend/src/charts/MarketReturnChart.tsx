import React from 'react';
import Plot from 'react-plotly.js';
import type { DataPoint } from '../types';
import { PLOTLY_DARK_LAYOUT, REGIME_COLORS } from '../utils/constants';

interface MarketReturnChartProps {
  dataPoints: DataPoint[];
  states: string[];
}

export const MarketReturnChart: React.FC<MarketReturnChartProps> = ({ dataPoints, states }) => {
  // Discard t=0 which has no return
  const validPoints = dataPoints.slice(1);

  // Group into regime traces for a clean, interactive legend
  const regimes: Array<'Bear' | 'Stable' | 'Bull'> = ['Bear', 'Stable', 'Bull'];
  const traces = regimes.map((regime) => {
    const regimeDates: string[] = [];
    const regimeReturns: number[] = [];

    validPoints.forEach((dp, idx) => {
      if (states[idx] === regime) {
        regimeDates.push(dp.date);
        regimeReturns.push(dp.log_return !== null ? dp.log_return * 100 : 0);
      }
    });

    return {
      x: regimeDates,
      y: regimeReturns,
      type: 'bar' as const,
      name: `${regime} Regime`,
      marker: {
        color: REGIME_COLORS[regime],
        opacity: 0.85,
      },
      hovertemplate: '<b>Date</b>: %{x}<br><b>Return</b>: %{y:.2f}%<br><b>Regime</b>: ' + regime + '<extra></extra>',
    };
  });

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5 shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide">Historical Logarithmic Returns by Regime</h3>
          <p className="text-xs text-slate-400">Continuous daily returns r_t (%) colored by inferred Viterbi state</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          {regimes.map((regime) => (
            <div key={regime} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: REGIME_COLORS[regime] }} />
              <span className="text-slate-300 text-[11px] font-medium">{regime}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="w-full h-[320px]">
        <Plot
          data={traces}
          layout={{
            ...PLOTLY_DARK_LAYOUT,
            autosize: true,
            barmode: 'relative',
            showlegend: false,
            xaxis: {
              ...PLOTLY_DARK_LAYOUT.xaxis,
              title: { text: 'Date', font: { size: 10, color: '#64748b' } },
            },
            yaxis: {
              ...PLOTLY_DARK_LAYOUT.yaxis,
              title: { text: 'Daily Return (%)', font: { size: 10, color: '#64748b' } },
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
