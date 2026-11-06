import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const MethodologyDisclaimer: React.FC = () => {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 text-xs text-slate-400 space-y-2">
      <div className="flex items-center gap-2 text-amber-400 font-semibold">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>Methodological Disclaimer</span>
      </div>
      <p className="leading-relaxed">
        Regime labels are assigned according to estimated mean returns. Because HMM estimation is
        unsupervised, a regime may contain few or no observations in a particular sample. Results
        should therefore be interpreted together with posterior probabilities and model diagnostics.
        The model does not guarantee future market movements.
      </p>
    </div>
  );
};
