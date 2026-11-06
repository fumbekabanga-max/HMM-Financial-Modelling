import React, { useState } from 'react';
import type { AnalysisResult, AnalysisStep } from '../types';
import { runMarketAnalysis } from '../services/api';
import { getSampleFile } from '../utils/sampleData';

import { DataInputPanel } from '../components/DataInputPanel';
import { MetricCards } from '../components/MetricCards';
import { CurrentRegimePanel } from '../components/CurrentRegimePanel';
import { RegimeTimeline } from '../components/RegimeTimeline';
import { RegimeStatsTable } from '../components/RegimeStatsTable';
import { ModelInfoPanel } from '../components/ModelInfoPanel';
import { MethodologyDisclaimer } from '../components/MethodologyDisclaimer';
import { EmptyState } from '../components/EmptyState';

import {
  MarketReturnChart,
  PosteriorProbChart,
  TransitionHeatmap,
  RegimeDistributionChart,
} from '../charts';

export const Dashboard: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analysisStep, setAnalysisStep] = useState<AnalysisStep>('idle');
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoadingSample, setIsLoadingSample] = useState(false);

  // Trigger analysis pipeline: CSV Preprocessing -> 3-State HMM Training -> Visualizations
  const handleAnalyse = async () => {
    if (!selectedFile) return;

    setErrorMessage(null);
    try {
      const result = await runMarketAnalysis(selectedFile, (step) => {
        setAnalysisStep(step);
      });
      setAnalysisResult(result);
      setAnalysisStep('complete');
    } catch (err: unknown) {
      setAnalysisStep('error');
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred during market analysis.';
      setErrorMessage(msg);
    }
  };

  // Helper to load benchmark dataset with one click
  
const handleLoadSample = async () => {
  setIsLoadingSample(true);
  setErrorMessage(null);
  setAnalysisResult(null);
  setAnalysisStep('idle');

  try {
    const file = getSampleFile();
    setSelectedFile(file);
    const result = await runMarketAnalysis(file, (step) => {
      setAnalysisStep(step);
    });
    setAnalysisResult(result);
    setAnalysisStep('complete');
  } catch (err: unknown) {
    setAnalysisStep('error');
    const msg =
      err instanceof Error
        ? err.message
        : 'Unable to load the benchmark sample.';
    setErrorMessage(msg);
  } finally {
    setIsLoadingSample(false);
  }
};


  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* 1. Data Input Section (Always accessible at top) */}
      <section>
        <DataInputPanel
          selectedFile={selectedFile}
          onFileSelect={(file) => {
            setSelectedFile(file);
            setAnalysisResult(null);
            setAnalysisStep('idle');
          }}
          onAnalyse={handleAnalyse}
          analysisStep={analysisStep}
          errorMessage={errorMessage}
          onClearError={() => setErrorMessage(null)}
        />
      </section>

      {/* 2. Main Content: Empty State vs Full Analysis Results */}
      {!analysisResult ? (
        <section className="py-6">
          <EmptyState onLoadSample={handleLoadSample} isLoadingSample={isLoadingSample} />
        </section>
      ) : (
        <div className="space-y-6">
          {/* Top Panel: Current Regime Banner & State Confidence */}
          <section>
            <CurrentRegimePanel
              currentRegime={analysisResult.current_regime}
              posteriorProbability={analysisResult.current_regime_probability}
              asOfDate={analysisResult.as_of_date}
            />
          </section>

          {/* Key Metric Cards */}
          <section>
            <MetricCards result={analysisResult} />
          </section>

          {/* Primary Visualization: Market Returns colored by Viterbi Regime */}
          <section>
            <MarketReturnChart
              dataPoints={analysisResult.preprocess.data_points}
              states={analysisResult.hmm.states}
            />
          </section>

          {/* Chronological Viterbi Regime Ribbon Timeline */}
          <section>
            <RegimeTimeline
              dataPoints={analysisResult.preprocess.data_points}
              states={analysisResult.hmm.states}
            />
          </section>

          {/* Dual Analytical Visualizations: Posterior Probabilities & Transition Matrix */}
          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PosteriorProbChart
              dataPoints={analysisResult.preprocess.data_points}
              posteriors={analysisResult.hmm.posterior_probabilities}
            />
            <TransitionHeatmap
              transitionMatrix={analysisResult.hmm.transition_matrix}
              regimes={analysisResult.hmm.ordered_regimes}
            />
          </section>

          {/* Statistical Breakdown: Regime Table & Distribution Donut */}
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RegimeStatsTable statistics={analysisResult.hmm.regime_statistics} />
            </div>
            <div className="lg:col-span-1">
              <RegimeDistributionChart
                statistics={analysisResult.hmm.regime_statistics}
                totalObservations={analysisResult.preprocess.cleaned_count - 1}
              />
            </div>
          </section>

          {/* Model Information & Diagnostics */}
          <section>
            <ModelInfoPanel hmm={analysisResult.hmm} />
          </section>

          {/* Academic & Methodological Disclaimer */}
          <section>
            <MethodologyDisclaimer />
          </section>
        </div>
      )}
    </div>
  );
};
