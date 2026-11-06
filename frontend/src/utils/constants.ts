export const REGIME_COLORS = {
  Bear: '#f43f5e',   // Rose 500
  Stable: '#f59e0b', // Amber 500
  Bull: '#10b981',   // Emerald 500
} as const;

export const REGIME_BG_CLASSES = {
  Bear: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
  Stable: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  Bull: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
} as const;

export const PLOTLY_DARK_LAYOUT = {
  paper_bgcolor: 'transparent',
  plot_bgcolor: 'transparent',
  font: {
    color: '#94a3b8',
    family: 'system-ui, -apple-system, sans-serif',
    size: 11,
  },
  margin: { t: 30, r: 20, b: 40, l: 50 },
  xaxis: {
    gridcolor: '#1e293b',
    linecolor: '#334155',
    zerolinecolor: '#334155',
  },
  yaxis: {
    gridcolor: '#1e293b',
    linecolor: '#334155',
    zerolinecolor: '#334155',
  },
};
