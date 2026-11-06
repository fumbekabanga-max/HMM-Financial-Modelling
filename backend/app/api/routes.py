from fastapi import APIRouter, File, HTTPException, UploadFile, status
from app.models.schemas import (
    ErrorDetail,
    HealthResponse,
    HMMFitRequest,
    HMMFitResponse,
    PreprocessResponse,
)
from app.services.data_service import DataPreprocessor, DataValidationError
from app.services.hmm_service import HMMModelService, HMMValidationError

router = APIRouter()
preprocessor = DataPreprocessor(min_observations=30)
hmm_service = HMMModelService()


@router.get("/health", response_model=HealthResponse, tags=["Health"])
async def health_check() -> HealthResponse:
    """
    Health check endpoint for system readiness.
    Verifies that the FastAPI backend server is operating properly.
    """
    return HealthResponse(status="ok")


@router.post(
    "/data/preprocess",
    response_model=PreprocessResponse,
    responses={
        422: {"model": ErrorDetail},
        status.HTTP_400_BAD_REQUEST: {"model": ErrorDetail},
    },
    tags=["Data Preprocessing"],
    summary="Validate and preprocess financial CSV time series into stationary log returns",
)
async def preprocess_financial_data(
    file: UploadFile = File(..., description="CSV file containing historical 'Date' and 'Close' columns"),
) -> PreprocessResponse:
    """
    Accepts raw historical financial CSV data, validates integrity, handles
    missing values and duplicates, and computes continuous log-returns r_t = ln(P_t / P_{t-1}).
    
    The resulting return series is clean and ready for Hidden Markov Model (HMM) training.
    """
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No filename provided in upload payload.",
        )

    try:
        content = await file.read()
        return preprocessor.preprocess_csv(content)
    except DataValidationError as dve:
        raise HTTPException(
            status_code=422,
            detail=str(dve),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to process CSV file: {str(exc)}",
        )


@router.post(
    "/hmm/fit",
    response_model=HMMFitResponse,
    responses={
        422: {"model": ErrorDetail},
        status.HTTP_400_BAD_REQUEST: {"model": ErrorDetail},
    },
    tags=["HMM Modelling"],
    summary="Fit a 3-state Gaussian Hidden Markov Model on return series and infer market regimes",
)
async def fit_hmm(payload: HMMFitRequest) -> HMMFitResponse:
    """
    Fits a 3-state Gaussian HMM on stationary continuous log returns.
    
    Infers latent market regimes, decodes optimal Viterbi state path, computes
    smoothed posterior probabilities P(S_t | Y_{1:T}), and deterministically labels
    states into Bear, Stable, and Bull based on emission mean returns.
    """
    try:
        return hmm_service.fit_model(
            returns=payload.returns,
            n_states=payload.n_states,
            covariance_type=payload.covariance_type,
            n_iter=payload.n_iter,
            tol=payload.tol,
            random_state=payload.random_state,
        )
    except HMMValidationError as hve:
        raise HTTPException(
            status_code=422,
            detail=str(hve),
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to train Hidden Markov Model: {str(exc)}",
        )
