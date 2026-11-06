import type {
  AnalysisResult,
  HealthResponse,
  HMMFitResponse,
  PreprocessResponse,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

/**
 * Checks the operational health status of the FastAPI backend.
 */
export async function checkBackendHealth(): Promise<HealthResponse> {
  const url = `${API_BASE_URL}/api/health`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Health check returned status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    // If relative proxy failed in dev, try direct port 8000
    if (!API_BASE_URL) {
      try {
        const directResponse = await fetch('http://127.0.0.1:8000/api/health');
        if (directResponse.ok) {
          return await directResponse.json();
        }
      } catch {
        // Fall through
      }
    }
    throw error;
  }
}

/**
 * Uploads raw financial CSV data to POST /api/data/preprocess.
 */
export async function preprocessFinancialData(file: File): Promise<PreprocessResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const url = `${API_BASE_URL}/api/data/preprocess`;
  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorDetail = `Preprocessing failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorDetail = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // Keep default error text
    }
    throw new Error(errorDetail);
  }

  return await response.json();
}

/**
 * Calls POST /api/hmm/fit with cleaned continuous log returns.
 */
export async function fitHMMModel(
  returns: number[],
  options: {
    n_states?: number;
    covariance_type?: string;
    n_iter?: number;
    tol?: number;
    random_state?: number;
  } = {}
): Promise<HMMFitResponse> {
  const payload = {
    returns,
    n_states: options.n_states ?? 3,
    covariance_type: options.covariance_type ?? 'full',
    n_iter: options.n_iter ?? 100,
    tol: options.tol ?? 0.0001,
    random_state: options.random_state ?? 42,
  };

  const url = `${API_BASE_URL}/api/hmm/fit`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    let errorDetail = `HMM training failed with status ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) {
        errorDetail = typeof errJson.detail === 'string' ? errJson.detail : JSON.stringify(errJson.detail);
      }
    } catch {
      // Keep default error text
    }
    throw new Error(errorDetail);
  }

  return await response.json();
}

/**
 * End-to-end analytical workflow: Preprocess CSV -> Train 3-State HMM -> Compile Dashboard Result.
 */
export async function runMarketAnalysis(
  file: File,
  onProgress?: (step: 'preprocessing' | 'fitting') => void
): Promise<AnalysisResult> {
  // Step 1: Preprocess Data
  if (onProgress) onProgress('preprocessing');
  const preprocessRes = await preprocessFinancialData(file);

  // Step 2: Fit 3-State Gaussian HMM
  if (onProgress) onProgress('fitting');
  const hmmRes = await fitHMMModel(preprocessRes.returns);

  // Compute overall summary statistics from the actual return series
  const rets = preprocessRes.returns;
  const n = rets.length;
  const mean = n > 0 ? rets.reduce((a, b) => a + b, 0) / n : 0;
  const variance = n > 1 ? rets.reduce((acc, r) => acc + Math.pow(r - mean, 2), 0) / (n - 1) : 0;
  const volatility = Math.sqrt(variance);

  // Derive latest inferred regime information from the authoritative backend results
  const latestRegime = hmmRes.states.length > 0 ? hmmRes.states[hmmRes.states.length - 1] : 'Unknown';
  const latestPosteriors = hmmRes.posterior_probabilities.length > 0 
    ? hmmRes.posterior_probabilities[hmmRes.posterior_probabilities.length - 1] 
    : { Bear: 0, Stable: 0, Bull: 0 };

  const regimeProb =
    latestRegime === 'Bear'
      ? latestPosteriors.Bear
      : latestRegime === 'Stable'
      ? latestPosteriors.Stable
      : latestRegime === 'Bull'
      ? latestPosteriors.Bull
      : 0;
  const asOfDate = preprocessRes.data_points.length > 0
    ? preprocessRes.data_points[preprocessRes.data_points.length - 1].date
    : preprocessRes.date_range.end;

  return {
    preprocess: preprocessRes,
    hmm: hmmRes,
    overall_mean_return: mean,
    overall_volatility: volatility,
    current_regime: latestRegime,
    current_regime_probability: regimeProb,
    as_of_date: asOfDate,
  };
}
