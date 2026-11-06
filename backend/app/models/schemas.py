from typing import Dict, List, Optional
from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Schema for system health check endpoint."""
    status: str = Field(default="ok", description="Operational status of backend service")


class DateRange(BaseModel):
    """Start and end dates of the validated time series."""
    start: str = Field(description="First observation date in YYYY-MM-DD format")
    end: str = Field(description="Last observation date in YYYY-MM-DD format")


class DataPoint(BaseModel):
    """Individual daily observation with date, close price, and calculated log-return."""
    date: str = Field(description="Observation date (YYYY-MM-DD)")
    close: float = Field(description="Closing price")
    log_return: Optional[float] = Field(
        default=None,
        description="Logarithmic return ln(P_t / P_{t-1}). Null for the initial observation t=0."
    )


class PreprocessResponse(BaseModel):
    """Structured response returned by /api/data/preprocess."""
    original_count: int = Field(description="Total observations received in the raw input")
    cleaned_count: int = Field(description="Total valid observations after hygiene and deduplication")
    date_range: DateRange = Field(description="Chronological start and end date of the series")
    data_points: List[DataPoint] = Field(description="List of cleaned daily observations")
    returns: List[float] = Field(
        description="Array of continuous log-returns (length: cleaned_count - 1), directly consumable by HMM"
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Informative alerts regarding missing values, reordering, or duplicate handling"
    )


class ErrorDetail(BaseModel):
    """Standard error response format for invalid inputs."""
    detail: str = Field(description="High-level error description")
    errors: List[str] = Field(default_factory=list, description="Specific validation failure reasons")


# =========================================================================
# Phase 3: Hidden Markov Model (HMM) Schemas
# =========================================================================

class HMMFitRequest(BaseModel):
    """Request payload for training the Hidden Markov Model."""
    returns: List[float] = Field(
        description="Array of continuous log returns produced by the preprocessing service"
    )
    n_states: int = Field(
        default=3,
        ge=3,
        le=3,
        description="Number of hidden market regimes to model (exactly 3 for Bear, Stable, Bull)"
    )
    covariance_type: str = Field(
        default="full",
        description="Covariance structure for Gaussian emissions ('full', 'diag', 'spherical')"
    )
    n_iter: int = Field(
        default=100,
        ge=10,
        le=2000,
        description="Maximum number of Expectation-Maximization (Baum-Welch) iterations"
    )
    tol: float = Field(
        default=1e-4,
        gt=0,
        description="Convergence tolerance threshold for log-likelihood improvement"
    )
    random_state: int = Field(
        default=42,
        description="Fixed random seed ensuring reproducible EM initialization"
    )


class RegimeStat(BaseModel):
    """Statistical summary and characteristics for an inferred market regime."""
    regime: str = Field(description="Deterministic economic regime name ('Bear', 'Stable', 'Bull')")
    original_state_id: int = Field(description="Underlying unsupervised HMM component ID from hmmlearn")
    mean_return: float = Field(description="Estimated Gaussian emission mean return mu_k")
    volatility: float = Field(description="Estimated Gaussian emission volatility (standard deviation sigma_k)")
    count: int = Field(description="Total number of observations decoded into this regime by Viterbi")
    proportion: float = Field(description="Empirical share of time series spent in this regime (count / T)")
    expected_duration_days: float = Field(
        description="Theoretical expected regime persistence 1 / (1 - a_{kk}) in trading days"
    )


class PosteriorPoint(BaseModel):
    """Smoothed posterior state probabilities P(S_t = k | Y_{1:T}) for an observation."""
    Bear: float = Field(description="Posterior probability of being in Bear regime at time t")
    Stable: float = Field(description="Posterior probability of being in Stable regime at time t")
    Bull: float = Field(description="Posterior probability of being in Bull regime at time t")


class HMMFitResponse(BaseModel):
    """Structured response containing fitted HMM parameters, decoded regimes, and diagnostics."""
    n_states: int = Field(default=3, description="Number of hidden states")
    converged: bool = Field(description="Whether the Baum-Welch EM algorithm converged within n_iter")
    n_iter: int = Field(description="Number of EM iterations executed until convergence")
    log_likelihood: float = Field(description="Final log-likelihood ln P(Y_{1:T} | theta) of observations")
    ordered_regimes: List[str] = Field(
        default=["Bear", "Stable", "Bull"],
        description="Canonical economic regime ordering based on ascending mean returns"
    )
    regime_mapping: Dict[str, str] = Field(
        description="Mapping from original HMM state ID (as string) to canonical regime name"
    )
    transition_matrix: List[List[float]] = Field(
        description="3x3 row-stochastic transition probability matrix ordered by [Bear, Stable, Bull]"
    )
    initial_probabilities: List[float] = Field(
        description="Initial state probability vector pi ordered by [Bear, Stable, Bull]"
    )
    states: List[str] = Field(
        description="Viterbi-decoded optimal sequence of economic regimes ('Bear', 'Stable', 'Bull')"
    )
    state_ids: List[int] = Field(
        description="Original unsupervised HMM state sequence before deterministic remapping"
    )
    posterior_probabilities: List[PosteriorPoint] = Field(
        description="Sequence of smoothed posterior state probabilities P(S_t | Y_{1:T})"
    )
    regime_statistics: Dict[str, RegimeStat] = Field(
        description="Regime-specific descriptive statistics and persistence metrics"
    )
    warnings: List[str] = Field(
        default_factory=list,
        description="Informative notices regarding convergence or variance properties"
    )
