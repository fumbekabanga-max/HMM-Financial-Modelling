"""
Comprehensive test suite for the Hidden Markov Model (HMM) Financial Regime Engine.

Tests cover all 14 required areas:
1. Successful fitting on valid continuous return data.
2. Production of exactly 3 states.
3. Transition matrix shape (3x3).
4. Transition matrix row stochasticity (sum to ~1.0).
5. Posterior probability matrix dimensions (T x 3).
6. Posterior probability row stochasticity (sum to ~1.0).
7. Regime mapping produces exactly: Bear, Stable, Bull.
8. Deterministic regime labeling driven by estimated emission means, not arbitrary state indices.
9. Accurate calculation of regime descriptive statistics (mean, volatility, counts, durations).
10. Rejection of invalid data (NaNs, infinities, zero variance constant returns).
11. Rejection of insufficient observations (< 30).
12. Exact reproducibility given fixed random seed.
13. Inclusion of model convergence diagnostic information.
14. Verification of the POST /api/hmm/fit API endpoint via FastAPI TestClient.
"""

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.hmm_service import HMMModelService, HMMValidationError

client = TestClient(app)


def _generate_synthetic_regimes(
    n_per_regime: int = 40,
    random_state: int = 42,
) -> np.ndarray:
    """
    Generate synthetic return observations from 3 distinct Gaussian regimes:
    - Bear: negative mean, high volatility
    - Stable: near-zero mean, low volatility
    - Bull: positive mean, moderate volatility
    """
    rng = np.random.RandomState(random_state)
    bear_returns = rng.normal(loc=-0.020, scale=0.030, size=n_per_regime)
    stable_returns = rng.normal(loc=0.0005, scale=0.005, size=n_per_regime)
    bull_returns = rng.normal(loc=0.015, scale=0.012, size=n_per_regime)
    
    # Concatenate into a multi-phase market regime series
    return np.concatenate([bear_returns, stable_returns, bull_returns])


# =========================================================================
# Unit Tests for HMMModelService
# =========================================================================

def test_hmm_fits_valid_data():
    """1. Verify HMM successfully fits valid return series without errors."""
    returns = _generate_synthetic_regimes(n_per_regime=35).tolist()
    service = HMMModelService()
    result = service.fit_model(returns, random_state=42)

    assert result is not None
    assert len(result.states) == len(returns)
    assert len(result.posterior_probabilities) == len(returns)


def test_three_states_produced():
    """2. Verify that exactly three states are produced."""
    returns = _generate_synthetic_regimes(n_per_regime=30).tolist()
    service = HMMModelService()
    result = service.fit_model(returns, n_states=3)

    assert result.n_states == 3
    assert len(result.ordered_regimes) == 3
    assert set(result.ordered_regimes) == {"Bear", "Stable", "Bull"}


def test_transition_matrix_shape():
    """3. Verify transition matrix has shape 3 x 3."""
    returns = _generate_synthetic_regimes(n_per_regime=30).tolist()
    service = HMMModelService()
    result = service.fit_model(returns)

    assert len(result.transition_matrix) == 3
    for row in result.transition_matrix:
        assert len(row) == 3


def test_transition_matrix_row_stochastic():
    """4. Verify each row of the transition matrix sums to approximately 1.0."""
    returns = _generate_synthetic_regimes(n_per_regime=35).tolist()
    service = HMMModelService()
    result = service.fit_model(returns)

    for row_idx, row in enumerate(result.transition_matrix):
        row_sum = sum(row)
        assert row_sum == pytest.approx(1.0, abs=1e-4), f"Row {row_idx} sums to {row_sum}"
        for val in row:
            assert val >= 0.0, f"Negative probability found: {val}"


def test_posterior_probabilities_dimensions():
    """5. Verify posterior probabilities have dimensions matching observation count T."""
    returns = _generate_synthetic_regimes(n_per_regime=30).tolist()
    service = HMMModelService()
    result = service.fit_model(returns)

    assert len(result.posterior_probabilities) == len(returns)
    first_pt = result.posterior_probabilities[0]
    assert hasattr(first_pt, "Bear")
    assert hasattr(first_pt, "Stable")
    assert hasattr(first_pt, "Bull")


def test_posterior_probability_row_stochastic():
    """6. Verify posterior probability rows sum to approximately 1.0 for all observations."""
    returns = _generate_synthetic_regimes(n_per_regime=35).tolist()
    service = HMMModelService()
    result = service.fit_model(returns)

    for t, pt in enumerate(result.posterior_probabilities):
        total = pt.Bear + pt.Stable + pt.Bull
        assert total == pytest.approx(1.0, abs=1e-4), f"Posteriors at t={t} sum to {total}"
        assert pt.Bear >= 0.0
        assert pt.Stable >= 0.0
        assert pt.Bull >= 0.0


def test_regime_mapping_keys_and_values():
    """7. Verify regime mapping produces exactly: Bear, Stable, and Bull."""
    returns = _generate_synthetic_regimes(n_per_regime=30).tolist()
    service = HMMModelService()
    result = service.fit_model(returns)

    mapped_values = list(result.regime_mapping.values())
    assert set(mapped_values) == {"Bear", "Stable", "Bull"}
    assert set(result.regime_mapping.keys()) == {"0", "1", "2"}


def test_deterministic_regime_labeling_by_mean_return():
    """
    8. Verify regime labels are determined by estimated emission mean returns
    (lowest -> Bear, median -> Stable, highest -> Bull) rather than fixed state indices.
    """
    returns = _generate_synthetic_regimes(n_per_regime=40).tolist()
    service = HMMModelService()
    result = service.fit_model(returns, random_state=42)

    bear_stats = result.regime_statistics["Bear"]
    stable_stats = result.regime_statistics["Stable"]
    bull_stats = result.regime_statistics["Bull"]

    # Strictly ordered by estimated mean return
    assert bear_stats.mean_return < stable_stats.mean_return, (
        f"Bear mean ({bear_stats.mean_return}) must be < Stable mean ({stable_stats.mean_return})"
    )
    assert stable_stats.mean_return < bull_stats.mean_return, (
        f"Stable mean ({stable_stats.mean_return}) must be < Bull mean ({bull_stats.mean_return})"
    )


def test_state_statistics_accuracy():
    """9. Verify regime statistics (counts, proportions, volatilities, expected durations) are calculated correctly."""
    returns = _generate_synthetic_regimes(n_per_regime=35).tolist()
    service = HMMModelService()
    result = service.fit_model(returns)

    total_decoded = sum(stat.count for stat in result.regime_statistics.values())
    assert total_decoded == len(returns)

    total_prop = sum(stat.proportion for stat in result.regime_statistics.values())
    assert total_prop == pytest.approx(1.0, abs=1e-3)

    for name, stat in result.regime_statistics.items():
        assert stat.volatility > 0.0
        assert stat.expected_duration_days >= 1.0


def test_invalid_data_rejection():
    """10. Verify invalid return data (NaNs, infinities, zero-variance constant series) is rejected."""
    service = HMMModelService()
    valid_returns = _generate_synthetic_regimes(n_per_regime=30).tolist()

    # NaN inclusion
    nan_returns = valid_returns.copy()
    nan_returns[5] = float("nan")
    with pytest.raises(HMMValidationError, match="non-finite"):
        service.fit_model(nan_returns)

    # Inf inclusion
    inf_returns = valid_returns.copy()
    inf_returns[10] = float("inf")
    with pytest.raises(HMMValidationError, match="non-finite"):
        service.fit_model(inf_returns)

    # Constant return series (variance = 0)
    constant_returns = [0.001] * 50
    with pytest.raises(HMMValidationError, match="zero variance"):
        service.fit_model(constant_returns)


def test_insufficient_observations_rejection():
    """11. Verify rejection when return series has fewer than MIN_OBSERVATIONS (30)."""
    service = HMMModelService()
    short_returns = [0.01, -0.02, 0.005] * 5  # Only 15 observations

    with pytest.raises(HMMValidationError, match="Insufficient return observations"):
        service.fit_model(short_returns)


def test_reproducibility_with_fixed_seed():
    """12. Verify repeated runs with the same random seed produce identical results."""
    returns = _generate_synthetic_regimes(n_per_regime=35).tolist()
    service = HMMModelService()

    run1 = service.fit_model(returns, random_state=42)
    run2 = service.fit_model(returns, random_state=42)

    assert run1.log_likelihood == run2.log_likelihood
    assert run1.transition_matrix == run2.transition_matrix
    assert run1.states == run2.states
    assert [p.Bear for p in run1.posterior_probabilities] == [p.Bear for p in run2.posterior_probabilities]


def test_model_convergence_info():
    """13. Verify model convergence metadata is present and reported."""
    returns = _generate_synthetic_regimes(n_per_regime=35).tolist()
    service = HMMModelService()
    result = service.fit_model(returns, n_iter=100)

    assert isinstance(result.converged, bool)
    assert result.n_iter > 0
    assert isinstance(result.log_likelihood, float)


# =========================================================================
# Integration Test for POST /api/hmm/fit
# =========================================================================

def test_api_hmm_fit_endpoint():
    """14. Verify POST /api/hmm/fit endpoint accepts returns and returns valid HMMFitResponse."""
    returns = _generate_synthetic_regimes(n_per_regime=35).tolist()
    payload = {
        "returns": returns,
        "n_states": 3,
        "covariance_type": "full",
        "n_iter": 100,
        "tol": 1e-4,
        "random_state": 42,
    }

    response = client.post("/api/hmm/fit", json=payload)
    assert response.status_code == 200
    data = response.json()

    assert data["n_states"] == 3
    assert data["converged"] is True
    assert set(data["ordered_regimes"]) == {"Bear", "Stable", "Bull"}
    assert "transition_matrix" in data
    assert "posterior_probabilities" in data
    assert len(data["states"]) == len(returns)
    assert "Bear" in data["regime_statistics"]
    assert "Stable" in data["regime_statistics"]
    assert "Bull" in data["regime_statistics"]


def test_api_hmm_fit_endpoint_validation_error():
    """Verify POST /api/hmm/fit returns 422 for invalid payloads."""
    # Series too short
    payload = {
        "returns": [0.01, -0.01],
        "n_states": 3,
    }
    response = client.post("/api/hmm/fit", json=payload)
    assert response.status_code == 422
    assert "Insufficient return observations" in response.json()["detail"]
