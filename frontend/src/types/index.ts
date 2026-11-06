export interface HealthResponse {
  status: string;
}

export type RegimeType = 'Bear' | 'Stable' | 'Bull';

export interface DateRange {
  start: string;
  end: string;
}

export interface DataPoint {
  date: string;
  close: number;
  log_return: number | null;
}

export interface PreprocessResponse {
  original_count: number;
  cleaned_count: number;
  date_range: DateRange;
  data_points: DataPoint[];
  returns: number[];
  warnings: string[];
}

export interface RegimeStat {
  regime: string;
  original_state_id: number;
  mean_return: number;
  volatility: number;
  count: number;
  proportion: number;
  expected_duration_days: number;
}

export interface PosteriorPoint {
  Bear: number;
  Stable: number;
  Bull: number;
}

export interface HMMFitResponse {
  n_states: number;
  converged: boolean;
  n_iter: number;
  log_likelihood: number;
  ordered_regimes: string[];
  regime_mapping: Record<string, string>;
  transition_matrix: number[][];
  initial_probabilities: number[];
  states: string[];
  state_ids: number[];
  posterior_probabilities: PosteriorPoint[];
  regime_statistics: Record<string, RegimeStat>;
  warnings: string[];
}

export interface AnalysisResult {
  preprocess: PreprocessResponse;
  hmm: HMMFitResponse;
  overall_mean_return: number;
  overall_volatility: number;
  current_regime: string;
  current_regime_probability: number;
  as_of_date: string;
}

export type AnalysisStep = 'idle' | 'preprocessing' | 'fitting' | 'complete' | 'error';
