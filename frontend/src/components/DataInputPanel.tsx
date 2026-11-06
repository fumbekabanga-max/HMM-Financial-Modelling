import React, { useRef } from 'react';
import { Upload, FileText, Play, AlertCircle, RefreshCw } from 'lucide-react';
import type { AnalysisStep } from '../types';

interface DataInputPanelProps {
  selectedFile: File | null;
  onFileSelect: (file: File | null) => void;
  onAnalyse: () => void;
  analysisStep: AnalysisStep;
  errorMessage: string | null;
  onClearError: () => void;
}

export const DataInputPanel: React.FC<DataInputPanelProps> = ({
  selectedFile,
  onFileSelect,
  onAnalyse,
  analysisStep,
  errorMessage,
  onClearError,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onClearError();
    if (e.target.files && e.target.files[0]) {
      onFileSelect(e.target.files[0]);
    }
  };

  const isAnalyzing = analysisStep === 'preprocessing' || analysisStep === 'fitting';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
        <div>
          <h3 className="text-sm font-bold text-white tracking-wide">Historical Financial Data Input</h3>
          <p className="text-xs text-slate-400">
            Upload CSV with <code className="text-blue-300">Date</code> and <code className="text-blue-300">Close</code> columns
          </p>
        </div>
        <div className="text-[11px] text-slate-500 font-mono">
          Minimum 30 observations required
        </div>
      </div>

      {/* Upload Box / File Row */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileChange}
          className="hidden"
          disabled={isAnalyzing}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isAnalyzing}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all disabled:opacity-50 cursor-pointer"
        >
          <Upload className="w-4 h-4 text-blue-400" />
          <span>Select CSV File</span>
        </button>

        {/* Selected file badge */}
        <div className="w-full sm:flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-300 min-h-[38px] overflow-hidden">
          {selectedFile ? (
            <>
              <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-medium truncate">{selectedFile.name}</span>
              <span className="text-[10px] text-slate-500 shrink-0">
                ({(selectedFile.size / 1024).toFixed(1)} KB)
              </span>
            </>
          ) : (
            <span className="text-slate-500 italic">No file selected yet</span>
          )}
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onAnalyse}
          disabled={!selectedFile || isAnalyzing}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
        >
          {isAnalyzing ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-white" />
              <span>
                {analysisStep === 'preprocessing'
                  ? 'Step 1/2: Preprocessing...'
                  : 'Step 2/2: Fitting HMM...'}
              </span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>Analyse Market</span>
            </>
          )}
        </button>
      </div>

      {/* Validation Error Banner */}
      {errorMessage && (
        <div className="bg-rose-950/40 border border-rose-800/80 rounded-lg p-3 text-xs text-rose-300 flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
          <div className="flex-1 space-y-1">
            <span className="font-semibold block text-rose-200">Validation Error:</span>
            <p className="leading-relaxed">{errorMessage}</p>
          </div>
        </div>
      )}
    </div>
  );
};
