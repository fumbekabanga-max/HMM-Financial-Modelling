"""
Hidden Markov Model (HMM) Financial Regime Inference Service.

Implements a 3-state Gaussian HMM for financial time series regime detection,
utilizing Expectation-Maximization (Baum-Welch) parameter estimation,
Viterbi optimal state path decoding, and deterministic regime relabeling
(Bear, Stable, Bull) based on estimated emission mean returns.
"""

from typing import Any, Dict, List, Optional, Tuple, Union
import numpy as np
from hmmlearn.hmm import GaussianHMM

from app.models.schemas import HMMFitResponse, PosteriorPoint, RegimeStat


class HMMValidationError(ValueError):
    """Exception raised when returns series or model hyperparameters fail validation."""
    pass


class HMMModelService:
    """
    Gaussian Hidden Markov Model engine for market regime detection.
    
    Provides parameter estimation, state decoding, stochastic matrix verification,
    and deterministic mapping from arbitrary unsupervised state IDs to canonical
    economic regimes: Bear, Stable, and Bull.
    """

    MIN_OBSERVATIONS: int = 30
    REQUIRED_STATES: int = 3
    CANONICAL_REGIMES: Tuple[str, str, str] = ("Bear", "Stable", "Bull")

    def fit_model(
        self,
        returns: Union[List[float], np.ndarray],
        n_states: int = 3,
        covariance_type: str = "full",
        n_iter: int = 100,
        tol: float = 1e-4,
        random_state: int = 42,
    ) -> HMMFitResponse:
        """
        Fit a 3-state Gaussian HMM on continuous log returns and infer market regimes.
        
        Args:
            returns: List or 1D array of stationary log returns.
            n_states: Number of latent states (must be exactly 3).
            covariance_type: Covariance structure ('full', 'diag', 'spherical').
            n_iter: Maximum Baum-Welch EM iterations.
            tol: Log-likelihood convergence tolerance threshold.
            random_state: Random seed for initialization reproducibility.
            
        Returns:
            HMMFitResponse containing model parameters, Viterbi path, posteriors,
            and canonical regime statistics.
            
        Raises:
            HMMValidationError: On invalid input data or hyperparameter violations.
        """
        # Step 1: Input Validation
        X = self._validate_returns(returns, n_states)

        # Step 2: Initialize and Train Gaussian HMM via Baum-Welch EM
        # Set min_covar=1e-6 to reflect typical financial return variances (~1e-4) and prevent collapse
        try:
            model = GaussianHMM(
                n_components=n_states,
                covariance_type=covariance_type,
                n_iter=n_iter,
                tol=tol,
                min_covar=1e-6,
                random_state=random_state,
            )
            model.fit(X)
        except Exception:
            # Fallback to quantile-anchored initialization if unsupervised K-Means produces singular clusters
            try:
                p20, p50, p80 = np.percentile(X, [20, 50, 80])
                init_means = np.array([[p20], [p50], [p80]])
                init_var = max(float(np.var(X)), 1e-6)

                model = GaussianHMM(
                    n_components=n_states,
                    covariance_type=covariance_type,
                    n_iter=n_iter,
                    tol=tol,
                    min_covar=1e-6,
                    random_state=random_state,
                    init_params="",
                )
                model.means_ = init_means
                if covariance_type == "full":
                    model.covars_ = np.array([[[init_var]], [[init_var]], [[init_var]]])
                else:
                    model.covars_ = np.array([[init_var], [init_var], [init_var]])
                model.transmat_ = np.array([[0.8, 0.1, 0.1], [0.1, 0.8, 0.1], [0.1, 0.1, 0.8]])
                model.startprob_ = np.array([1 / 3, 1 / 3, 1 / 3])
                model.fit(X)
            except Exception as exc:
                raise HMMValidationError(f"Failed to fit Gaussian HMM: {str(exc)}")

        converged = bool(model.monitor_.converged)
        n_iter_done = int(model.monitor_.iter)
        log_likelihood = float(model.score(X))
        warnings: List[str] = []

        if not converged:
            warnings.append(
                f"Baum-Welch EM algorithm did not converge within {n_iter} iterations "
                f"(tolerance: {tol}). Consider increasing n_iter."
            )

        # Step 3: Extract Raw Model Parameters
        raw_means = model.means_.flatten()
        raw_covars = self._extract_covariances(model, covariance_type)
        raw_vols = np.sqrt(np.maximum(raw_covars, 1e-12))
        raw_transmat = model.transmat_
        raw_startprob = model.startprob_

        # Step 4: Deterministic Regime Mapping
        # Unsupervised EM assigns arbitrary component numbers {0, 1, 2}.
        # Sort state IDs in strictly ascending order of estimated mean return:
        # lowest mu -> Bear, median mu -> Stable, highest mu -> Bull.
        sorted_state_ids = np.argsort(raw_means).tolist()
        bear_id = int(sorted_state_ids[0])
        stable_id = int(sorted_state_ids[1])
        bull_id = int(sorted_state_ids[2])

        ordered_state_ids = [bear_id, stable_id, bull_id]
        regime_mapping = {
            str(bear_id): "Bear",
            str(stable_id): "Stable",
            str(bull_id): "Bull",
        }

        # Step 5: Viterbi State Decoding (Global Optimal Sequence)
        raw_state_sequence = model.predict(X)
        decoded_regime_names = [regime_mapping[str(sid)] for sid in raw_state_sequence]

        # Step 6: Posterior State Probabilities P(S_t = k | Y_{1:T}) via Forward-Backward
        raw_posteriors = model.predict_proba(X)
        posterior_points: List[PosteriorPoint] = []
        for t in range(len(X)):
            p_bear = float(raw_posteriors[t, bear_id])
            p_stable = float(raw_posteriors[t, stable_id])
            p_bull = float(raw_posteriors[t, bull_id])
            
            # Ensure row stochasticity: sum(P_t) = 1.0
            row_sum = p_bear + p_stable + p_bull
            if row_sum > 0:
                p_bear /= row_sum
                p_stable /= row_sum
                p_bull /= row_sum

            posterior_points.append(
                PosteriorPoint(
                    Bear=round(p_bear, 6),
                    Stable=round(p_stable, 6),
                    Bull=round(p_bull, 6),
                )
            )

        # Step 7: Construct Reordered Transition Matrix & Initial Probabilities
        # Matrix is ordered canonically: [Bear, Stable, Bull]
        ordered_transmat: List[List[float]] = []
        for from_id in ordered_state_ids:
            row: List[float] = []
            for to_id in ordered_state_ids:
                row.append(float(raw_transmat[from_id, to_id]))
            
            # Normalize row to ensure exact stochasticity
            row_sum = sum(row)
            if row_sum > 0:
                row = [r / row_sum for r in row]
            ordered_transmat.append([round(r, 6) for r in row])

        ordered_startprob: List[float] = [
            float(raw_startprob[sid]) for sid in ordered_state_ids
        ]
        startprob_sum = sum(ordered_startprob)
        if startprob_sum > 0:
            ordered_startprob = [p / startprob_sum for p in ordered_startprob]
        ordered_startprob = [round(p, 6) for p in ordered_startprob]

        # Step 8: Calculate Regime Statistics & Duration
        total_obs = len(X)
        regime_statistics: Dict[str, RegimeStat] = {}

        for idx, regime_name in enumerate(self.CANONICAL_REGIMES):
            orig_sid = ordered_state_ids[idx]
            regime_count = int(np.sum(raw_state_sequence == orig_sid))
            regime_prop = regime_count / total_obs if total_obs > 0 else 0.0

            # Persistence & expected duration in trading days: E[D_k] = 1 / (1 - a_{kk})
            a_kk = ordered_transmat[idx][idx]
            if a_kk < 0.9999:
                expected_duration = round(float(1.0 / (1.0 - a_kk)), 2)
            else:
                expected_duration = 999.0  # Absorbing state approximation

            regime_statistics[regime_name] = RegimeStat(
                regime=regime_name,
                original_state_id=orig_sid,
                mean_return=round(float(raw_means[orig_sid]), 6),
                volatility=round(float(raw_vols[orig_sid]), 6),
                count=regime_count,
                proportion=round(float(regime_prop), 4),
                expected_duration_days=expected_duration,
            )

        return HMMFitResponse(
            n_states=n_states,
            converged=converged,
            n_iter=n_iter_done,
            log_likelihood=round(log_likelihood, 4),
            ordered_regimes=list(self.CANONICAL_REGIMES),
            regime_mapping=regime_mapping,
            transition_matrix=ordered_transmat,
            initial_probabilities=ordered_startprob,
            states=decoded_regime_names,
            state_ids=[int(s) for s in raw_state_sequence],
            posterior_probabilities=posterior_points,
            regime_statistics=regime_statistics,
            warnings=warnings,
        )

    def _validate_returns(
        self,
        returns: Union[List[float], np.ndarray],
        n_states: int,
    ) -> np.ndarray:
        """
        Validate input returns array and hyperparameters.
        """
        if n_states != self.REQUIRED_STATES:
            raise HMMValidationError(
                f"Invalid number of states: {n_states}. The model requires exactly "
                f"{self.REQUIRED_STATES} states to map to Bear, Stable, and Bull."
            )

        if returns is None or len(returns) == 0:
            raise HMMValidationError("The return series is completely empty.")

        try:
            arr = np.asarray(returns, dtype=float)
        except Exception as e:
            raise HMMValidationError(f"Could not convert return series to float array: {str(e)}")

        if arr.ndim != 1:
            arr = arr.flatten()

        n_obs = len(arr)
        if n_obs < self.MIN_OBSERVATIONS:
            raise HMMValidationError(
                f"Insufficient return observations: Provided {n_obs} observations, "
                f"but at least {self.MIN_OBSERVATIONS} are required to reliably estimate a "
                f"3-state Gaussian HMM."
            )

        if not np.all(np.isfinite(arr)):
            raise HMMValidationError(
                "Return series contains invalid non-finite values (NaN or Infinity)."
            )

        var = np.var(arr)
        if np.isclose(var, 0.0) or np.all(arr == arr[0]):
            raise HMMValidationError(
                "Return series is constant with zero variance. Cannot estimate Gaussian emission models."
            )

        return arr.reshape(-1, 1)

    @staticmethod
    def _extract_covariances(model: GaussianHMM, covariance_type: str) -> np.ndarray:
        """
        Safely extract diagonal covariance variances from fitted model.
        """
        covars = model.covars_
        if covariance_type == "full":
            # Shape: (n_components, 1, 1) -> (n_components,)
            return covars.reshape(-1)
        elif covariance_type == "diag":
            # Shape: (n_components, 1) -> (n_components,)
            return covars.reshape(-1)
        elif covariance_type == "spherical":
            # Shape: (n_components,)
            return covars.reshape(-1)
        return covars.flatten()
