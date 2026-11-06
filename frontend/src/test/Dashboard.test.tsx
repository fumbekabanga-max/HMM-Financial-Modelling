import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import App from '../App';
import * as api from '../services/api';
import type { AnalysisResult } from '../types';

// Mock AnalysisResult matching backend structure
const mockAnalysisResult: AnalysisResult = {
  preprocess: {
    original_count: 35,
    cleaned_count: 35,
    date_range: { start: '2023-01-03', end: '2023-02-17' },
    data_points: [
      { date: '2023-01-03', close: 380.82, log_return: null },
      { date: '2023-01-04', close: 383.76, log_return: 0.007691 },
      { date: '2023-01-05', close: 379.38, log_return: -0.011479 },
    ],
    returns: [0.007691, -0.011479],
    warnings: [],
  },
  hmm: {
    n_states: 3,
    converged: true,
    n_iter: 30,
    log_likelihood: 95.4321,
    ordered_regimes: ['Bear', 'Stable', 'Bull'],
    regime_mapping: { '0': 'Stable', '1': 'Bear', '2': 'Bull' },
    transition_matrix: [
      [0.85, 0.10, 0.05],
      [0.08, 0.84, 0.08],
      [0.04, 0.06, 0.90],
    ],
    initial_probabilities: [0.33, 0.33, 0.34],
    states: ['Bull', 'Bear'],
    state_ids: [2, 1],
    posterior_probabilities: [
      { Bear: 0.05, Stable: 0.15, Bull: 0.80 },
      { Bear: 0.88, Stable: 0.10, Bull: 0.02 },
    ],
    regime_statistics: {
      Bear: {
        regime: 'Bear',
        original_state_id: 1,
        mean_return: -0.011479,
        volatility: 0.025,
        count: 1,
        proportion: 0.5,
        expected_duration_days: 6.67,
      },
      Stable: {
        regime: 'Stable',
        original_state_id: 0,
        mean_return: 0.0005,
        volatility: 0.005,
        count: 0,
        proportion: 0.0,
        expected_duration_days: 6.25,
      },
      Bull: {
        regime: 'Bull',
        original_state_id: 2,
        mean_return: 0.007691,
        volatility: 0.012,
        count: 1,
        proportion: 0.5,
        expected_duration_days: 10.0,
      },
    },
    warnings: [],
  },
  overall_mean_return: -0.001894,
  overall_volatility: 0.013555,
  current_regime: 'Bear',
  current_regime_probability: 0.88,
  as_of_date: '2023-01-05',
};

describe('Financial Market Regime Modelling Dashboard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('1. Renders the application header and initial empty state', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', { name: /Financial Market Regime Modelling/i })
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Hidden Markov Model-Based Financial Market Analysis/i)
    ).toBeInTheDocument();

    expect(
      screen.getByText(/Upload historical financial data to begin market regime analysis/i)
    ).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /Select CSV File/i })).toBeInTheDocument();
  });

  it('2. Handles file selection and updates the UI with selected filename', () => {
    render(<App />);

    const file = new File(['Date,Close\n2023-01-01,100\n'], 'my_portfolio.csv', {
      type: 'text/csv',
    });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText('my_portfolio.csv')).toBeInTheDocument();
    const analyseBtn = screen.getByRole('button', { name: /Analyse Market/i });
    expect(analyseBtn).not.toBeDisabled();
  });

  it('3. Displays clear validation error message when the backend returns an error', async () => {
    vi.spyOn(api, 'runMarketAnalysis').mockRejectedValueOnce(
      new Error('Insufficient observations: Dataset contains 12 records, minimum of 30 required.')
    );

    render(<App />);

    const file = new File(['Date,Close\n2023-01-01,100\n'], 'short.csv', { type: 'text/csv' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    const analyseBtn = screen.getByRole('button', { name: /Analyse Market/i });
    fireEvent.click(analyseBtn);

    await waitFor(() => {
      expect(screen.getByText(/Validation Error:/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Insufficient observations: Dataset contains 12 records/i)
      ).toBeInTheDocument();
    });
  });

  it('4. Successfully renders full dashboard results after market analysis', async () => {
    vi.spyOn(api, 'runMarketAnalysis').mockResolvedValueOnce(mockAnalysisResult);

    render(<App />);

    const file = new File(['Date,Close\n2023-01-01,100\n'], 'test.csv', { type: 'text/csv' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    expect(screen.getByText('test.csv')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Analyse Market/i }));

    await waitFor(() => {
      // Current Regime Panel — scope assertion to avoid duplicate with MetricCards
      const regimePanelHeading = screen.getByText(/Latest Inferred Regime/i);
      const regimePanel = regimePanelHeading.closest('div[class*="bg-slate-900"]') as HTMLElement;
      expect(within(regimePanel).getByText(/Bear Market/i)).toBeInTheDocument();
      // 88.0% appears in both CurrentRegimePanel and MetricCards; assert it is present at least once
      expect(screen.getAllByText('88.0%').length).toBeGreaterThanOrEqual(1);

      // Metric Cards
      expect(screen.getByText('35')).toBeInTheDocument();
      expect(screen.getByText(/2023-01-03/i)).toBeInTheDocument();

      // Charts & Visualizations
      expect(screen.getByText(/Historical Logarithmic Returns by Regime/i)).toBeInTheDocument();
      expect(screen.getByText(/Viterbi Decoded Regime Timeline/i)).toBeInTheDocument();
      expect(screen.getByText(/Transition Probability Matrix/i)).toBeInTheDocument();

      // Statistics Table
      expect(screen.getByText(/Regime Characteristics & Descriptive Statistics/i)).toBeInTheDocument();

      // Model Diagnostics
      expect(screen.getByText(/Model Diagnostics & Hyperparameters/i)).toBeInTheDocument();
      expect(screen.getByText(/95.4321/i)).toBeInTheDocument();

      // Methodology Disclaimer
      expect(screen.getByText(/Methodological Disclaimer/i)).toBeInTheDocument();
    });
  });

  it('5. Prominently displays the current inferred regime and posterior probability without claiming future guarantees', async () => {
    vi.spyOn(api, 'runMarketAnalysis').mockResolvedValueOnce(mockAnalysisResult);

    render(<App />);

    const file = new File(['Date,Close\n2023-01-01,100\n'], 'test.csv', { type: 'text/csv' });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(fileInput, { target: { files: [file] } });

    fireEvent.click(screen.getByRole('button', { name: /Analyse Market/i }));

    await waitFor(() => {
      expect(screen.getByText(/Latest Inferred Regime/i)).toBeInTheDocument();
      expect(screen.getByText(/Posterior Probability/i)).toBeInTheDocument();
      expect(screen.getByText(/Non-predictive historical diagnostic measure/i)).toBeInTheDocument();
    });
  });
});
