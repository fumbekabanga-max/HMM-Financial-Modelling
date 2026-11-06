"""
Comprehensive test suite for financial data preprocessing and log-return calculations.

Tests cover:
- Valid data processing
- Unsorted dates reordering
- Missing value dropping and warnings
- Duplicate date deduplication (keeping latest)
- Invalid non-numeric prices
- Zero and negative prices (P_t <= 0)
- Insufficient observation thresholds
- Exact mathematical accuracy of logarithmic returns
- FastAPI /api/data/preprocess endpoint integration
"""

import io
import math
import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.data_service import DataPreprocessor, DataValidationError

client = TestClient(app)


def _generate_valid_csv(num_rows: int = 40, start_date: str = "2023-01-01", base_price: float = 100.0) -> str:
    """Helper to generate a clean, valid financial CSV string."""
    dates = pd.date_range(start=start_date, periods=num_rows, freq="B")  # Business days
    prices = [round(base_price * (1.0 + 0.005 * i), 2) for i in range(num_rows)]
    df = pd.DataFrame({"Date": dates.strftime("%Y-%m-%d"), "Close": prices})
    return df.to_csv(index=False)


# =========================================================================
# Unit Tests for DataPreprocessor Service
# =========================================================================

def test_valid_data():
    """Verify that a valid financial time series is parsed and formatted correctly."""
    csv_str = _generate_valid_csv(num_rows=40, start_date="2023-01-02", base_price=150.0)
    preprocessor = DataPreprocessor(min_observations=30)
    result = preprocessor.preprocess_csv(csv_str)

    assert result.original_count == 40
    assert result.cleaned_count == 40
    assert len(result.data_points) == 40
    assert len(result.returns) == 39  # First observation has no return
    assert result.date_range.start == "2023-01-02"
    assert result.data_points[0].log_return is None
    assert result.data_points[1].log_return is not None
    assert len(result.warnings) == 0


def test_unsorted_dates():
    """Verify that chronologically unsorted observations are reordered correctly."""
    dates = pd.date_range(start="2023-01-01", periods=35, freq="D")
    prices = [100.0 + i for i in range(35)]
    df = pd.DataFrame({"Date": dates.strftime("%Y-%m-%d"), "Close": prices})
    
    # Shuffle order
    shuffled_df = df.sample(frac=1.0, random_state=42).reset_index(drop=True)
    csv_str = shuffled_df.to_csv(index=False)

    preprocessor = DataPreprocessor(min_observations=30)
    result = preprocessor.preprocess_csv(csv_str)

    # Verify chronological order restored
    result_dates = [dp.date for dp in result.data_points]
    assert result_dates == sorted(result_dates)
    assert any("sorted by Date" in w for w in result.warnings)


def test_missing_values():
    """Verify handling of missing/blank dates and prices."""
    dates = pd.date_range(start="2023-01-01", periods=35, freq="D")
    rows = [f"{d.strftime('%Y-%m-%d')},{100.0 + i}" for i, d in enumerate(dates)]
    # Add dirty rows with missing date or missing price
    rows.append(",105.0")         # Missing Date
    rows.append("2023-02-10,")     # Missing Price
    rows.append(" , ")             # Both empty
    
    csv_str = "Date,Close\n" + "\n".join(rows)

    preprocessor = DataPreprocessor(min_observations=30)
    result = preprocessor.preprocess_csv(csv_str)

    assert result.original_count == 38
    assert result.cleaned_count == 35
    assert len(result.returns) == 34
    assert any("Dropped" in w for w in result.warnings)


def test_duplicate_dates():
    """
    Verify that duplicate Date entries are handled by retaining
    the latest observation for each date.
    """
    dates = pd.date_range(start="2023-01-01", periods=35, freq="D")
    rows = [f"{d.strftime('%Y-%m-%d')},100.0" for d in dates]
    # Add duplicate for 2023-01-10 with price 120.0
    rows.append("2023-01-10,120.0")

    csv_str = "Date,Close\n" + "\n".join(rows)

    preprocessor = DataPreprocessor(min_observations=30)
    result = preprocessor.preprocess_csv(csv_str)

    assert result.original_count == 36
    assert result.cleaned_count == 35
    # The retained price for 2023-01-10 must be the latest one (120.0)
    dp_10 = next(dp for dp in result.data_points if dp.date == "2023-01-10")
    assert dp_10.close == 120.0
    assert any("duplicate Date record" in w for w in result.warnings)


def test_invalid_non_numeric_prices():
    """Verify that non-numeric prices are filtered out with warnings."""
    dates = pd.date_range(start="2023-01-01", periods=35, freq="D")
    rows = [f"{d.strftime('%Y-%m-%d')},{100.0 + i}" for i, d in enumerate(dates)]
    # Add dirty strings
    rows.append("2023-02-15,INVALID")
    rows.append("2023-02-16,N/A")
    rows.append("2023-02-17,--")

    csv_str = "Date,Close\n" + "\n".join(rows)

    preprocessor = DataPreprocessor(min_observations=30)
    result = preprocessor.preprocess_csv(csv_str)

    assert result.cleaned_count == 35
    assert any("non-numeric" in w for w in result.warnings)


def test_zero_or_negative_prices():
    """Verify that prices <= 0 are dropped as log(P_t) is mathematically undefined."""
    dates = pd.date_range(start="2023-01-01", periods=35, freq="D")
    rows = [f"{d.strftime('%Y-%m-%d')},{100.0 + i}" for i, d in enumerate(dates)]
    # Non-positive prices
    rows.append("2023-02-15,0.0")
    rows.append("2023-02-16,-15.50")

    csv_str = "Date,Close\n" + "\n".join(rows)

    preprocessor = DataPreprocessor(min_observations=30)
    result = preprocessor.preprocess_csv(csv_str)

    assert result.cleaned_count == 35
    assert all(dp.close > 0 for dp in result.data_points)
    assert any("zero or negative Close prices" in w for w in result.warnings)


def test_insufficient_observations():
    """Verify error raised when valid records fall below min_observations threshold."""
    # Only 10 valid rows
    csv_str = _generate_valid_csv(num_rows=10)
    preprocessor = DataPreprocessor(min_observations=30)

    with pytest.raises(DataValidationError, match="Insufficient observations"):
        preprocessor.preprocess_csv(csv_str)


def test_correct_log_return_calculation():
    """
    Verify exact analytical calculation of logarithmic returns:
    r_t = ln(P_t / P_{t-1}).
    """
    # 35 rows with constant geometric growth P_t = 100 * (1.05)^t
    num_rows = 35
    multiplier = 1.05
    prices = [100.0 * (multiplier ** i) for i in range(num_rows)]
    dates = pd.date_range(start="2023-01-01", periods=num_rows, freq="D")
    df = pd.DataFrame({"Date": dates.strftime("%Y-%m-%d"), "Close": prices})
    csv_str = df.to_csv(index=False)

    preprocessor = DataPreprocessor(min_observations=30)
    result = preprocessor.preprocess_csv(csv_str)

    expected_return = math.log(multiplier)  # ln(1.05) ~= 0.048790
    
    # First data point must have no return
    assert result.data_points[0].log_return is None

    # All subsequent data points must match expected return
    for dp in result.data_points[1:]:
        assert dp.log_return == pytest.approx(expected_return, abs=1e-5)

    # Returns array should have length 34 and match
    assert len(result.returns) == 34
    for r in result.returns:
        assert r == pytest.approx(expected_return, abs=1e-5)


def test_case_insensitive_columns():
    """Verify detection of various common column namings."""
    dates = pd.date_range(start="2023-01-01", periods=32, freq="D")
    prices = [50.0 + i for i in range(32)]
    df = pd.DataFrame({"timestamp": dates.strftime("%Y-%m-%d"), "Adj Close": prices})
    csv_str = df.to_csv(index=False)

    preprocessor = DataPreprocessor(min_observations=30)
    result = preprocessor.preprocess_csv(csv_str)
    assert result.cleaned_count == 32


# =========================================================================
# Integration Tests for POST /api/data/preprocess Endpoint
# =========================================================================

def test_api_preprocess_endpoint_success():
    """Verify successful multipart CSV upload via FastAPI TestClient."""
    csv_content = _generate_valid_csv(num_rows=35)
    files = {"file": ("sample_prices.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}

    response = client.post("/api/data/preprocess", files=files)
    assert response.status_code == 200
    data = response.json()

    assert data["original_count"] == 35
    assert data["cleaned_count"] == 35
    assert len(data["returns"]) == 34
    assert "date_range" in data
    assert "data_points" in data


def test_api_preprocess_endpoint_insufficient_data():
    """Verify 422 Unprocessable Entity when dataset is too small."""
    csv_content = _generate_valid_csv(num_rows=15)
    files = {"file": ("short.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}

    response = client.post("/api/data/preprocess", files=files)
    assert response.status_code == 422
    assert "Insufficient observations" in response.json()["detail"]


def test_api_preprocess_endpoint_empty_file():
    """Verify 422 Unprocessable Entity when uploading an empty file."""
    files = {"file": ("empty.csv", io.BytesIO(b""), "text/csv")}

    response = client.post("/api/data/preprocess", files=files)
    assert response.status_code == 422
    assert "empty" in response.json()["detail"]
