"""
Financial data preprocessing and log-return calculation service.

Prepares raw historical financial data for Hidden Markov Model (HMM) regime inference.
"""

from typing import List, Optional, Tuple, Union
import io
import numpy as np
import pandas as pd

from app.models.schemas import DataPoint, DateRange, PreprocessResponse


class DataValidationError(ValueError):
    """Exception raised when input financial data fails validation rules."""
    pass


class DataPreprocessor:
    """
    Robust financial time series preprocessor.
    
    Performs data hygiene, date parsing, chronological ordering, duplicate resolution,
    missing value handling, price validation, and continuous log-return calculation.
    """

    MIN_OBSERVATIONS: int = 30

    def __init__(self, min_observations: int = 30):
        """
        Initialize preprocessor.
        
        Args:
            min_observations: Minimum number of valid observations required
                              for statistically sound HMM estimation (default: 30).
        """
        self.min_observations = min_observations

    def preprocess_csv(self, csv_data: Union[str, bytes]) -> PreprocessResponse:
        """
        Parse and preprocess raw CSV data into a structured PreprocessResponse.
        
        Args:
            csv_data: Raw CSV string or bytes from a file upload.
            
        Returns:
            PreprocessResponse containing cleaned time series and returns.
            
        Raises:
            DataValidationError: If data does not meet validation criteria.
        """
        if isinstance(csv_data, bytes):
            text = csv_data.decode("utf-8-sig", errors="replace").strip()
        else:
            text = csv_data.strip()

        if not text:
            raise DataValidationError("The provided CSV file or data stream is completely empty.")

        try:
            # Use Python engine with sep=None to detect comma, semicolon, or tab separators
            df = pd.read_csv(io.StringIO(text), sep=None, engine="python")
        except Exception as e:
            raise DataValidationError(f"Failed to parse CSV format: {str(e)}")

        return self.preprocess_dataframe(df)

    def preprocess_dataframe(self, df: pd.DataFrame) -> PreprocessResponse:
        """
        Preprocess a pandas DataFrame of financial price records.
        
        Args:
            df: DataFrame containing at minimum Date and Close columns.
            
        Returns:
            PreprocessResponse with validated records and log returns.
        """
        if df.empty:
            raise DataValidationError("The uploaded dataset contains 0 rows.")

        original_count = len(df)
        warnings: List[str] = []

        # Step 1: Detect required Date and Close columns (case-insensitive)
        date_col, close_col = self._resolve_columns(df)

        # Work on a copy with standardized column names
        work_df = pd.DataFrame({
            "raw_date": df[date_col],
            "raw_close": df[close_col],
        })

        # Step 2: Parse dates
        parsed_dates = pd.to_datetime(work_df["raw_date"], errors="coerce")
        invalid_dates_count = int(parsed_dates.isna().sum())
        if invalid_dates_count == original_count:
            raise DataValidationError(
                f"Column '{date_col}' contains no valid, parseable date values."
            )
        if invalid_dates_count > 0:
            warnings.append(
                f"Dropped {invalid_dates_count} row(s) containing unparseable or blank Date values."
            )
        work_df["date"] = parsed_dates

        # Step 3: Validate numeric prices
        numeric_close = pd.to_numeric(work_df["raw_close"], errors="coerce")
        invalid_prices_count = int(numeric_close.isna().sum())
        if invalid_prices_count == original_count:
            raise DataValidationError(
                f"Column '{close_col}' contains no numeric price values."
            )
        if invalid_prices_count > 0:
            warnings.append(
                f"Dropped {invalid_prices_count} row(s) containing non-numeric or missing Close prices."
            )
        work_df["close"] = numeric_close

        # Step 4: Drop missing/unparseable rows
        valid_mask = work_df["date"].notna() & work_df["close"].notna()
        work_df = work_df[valid_mask].copy()

        # Step 5: Price positivity check (P_t > 0)
        non_positive_mask = work_df["close"] <= 0
        non_positive_count = int(non_positive_mask.sum())
        if non_positive_count > 0:
            work_df = work_df[~non_positive_mask].copy()
            warnings.append(
                f"Dropped {non_positive_count} row(s) with zero or negative Close prices (prices must be > 0)."
            )

        if work_df.empty:
            raise DataValidationError("No valid positive price observations remain after initial validation.")

        # Step 6: Duplicate Date handling
        # Strategy: Keep the last record encountered in the input order for duplicate dates
        # (reflecting the latest settlement update in market files)
        duplicated_mask = work_df.duplicated(subset=["date"], keep=False)
        duplicate_records_count = int(work_df.duplicated(subset=["date"], keep="last").sum())
        if duplicate_records_count > 0:
            dup_dates = work_df[duplicated_mask]["date"].dt.strftime("%Y-%m-%d").unique().tolist()
            sample_dates = ", ".join(dup_dates[:3]) + ("..." if len(dup_dates) > 3 else "")
            warnings.append(
                f"Resolved {duplicate_records_count} duplicate Date record(s) (e.g. {sample_dates}) "
                f"by retaining the latest observation for each date."
            )
            work_df = work_df.drop_duplicates(subset=["date"], keep="last").reset_index(drop=True)

        # Step 7: Chronological sorting
        was_sorted = work_df["date"].is_monotonic_increasing
        work_df = work_df.sort_values(by="date", kind="stable").reset_index(drop=True)
        if not was_sorted:
            warnings.append("Observations were not in chronological order and have been sorted by Date.")

        cleaned_count = len(work_df)

        # Step 8: Minimum observation check for HMM feasibility
        if cleaned_count < self.min_observations:
            raise DataValidationError(
                f"Insufficient observations: The cleaned dataset contains {cleaned_count} observations, "
                f"but a minimum of {self.min_observations} is required to fit a 3-state Hidden Markov Model."
            )

        # Step 9: Calculate Logarithmic Returns
        # Formula: r_t = ln(P_t / P_{t-1})
        # Note: The first observation t=0 has no previous price, resulting in NaN return.
        prices = work_df["close"].to_numpy(dtype=float)
        shifted_prices = np.roll(prices, 1)
        
        # Calculate returns for t=1..T-1
        log_returns = np.full(cleaned_count, np.nan)
        log_returns[1:] = np.log(prices[1:] / shifted_prices[1:])

        # Extract pure returns array (length: cleaned_count - 1) for HMM consumption
        clean_returns = [round(float(r), 6) for r in log_returns[1:]]

        # Step 10: Format DataPoint objects
        date_strings = work_df["date"].dt.strftime("%Y-%m-%d").tolist()
        data_points: List[DataPoint] = []
        for i in range(cleaned_count):
            r_val = None if i == 0 else round(float(log_returns[i]), 6)
            data_points.append(
                DataPoint(
                    date=date_strings[i],
                    close=round(float(prices[i]), 4),
                    log_return=r_val,
                )
            )

        date_range = DateRange(
            start=date_strings[0],
            end=date_strings[-1],
        )

        return PreprocessResponse(
            original_count=original_count,
            cleaned_count=cleaned_count,
            date_range=date_range,
            data_points=data_points,
            returns=clean_returns,
            warnings=warnings,
        )

    @staticmethod
    def _resolve_columns(df: pd.DataFrame) -> Tuple[str, str]:
        """
        Locate Date and Close columns using case-insensitive matching.
        """
        col_map = {str(col).strip().lower(): str(col) for col in df.columns}

        # Date candidates in order of preference
        date_candidates = ["date", "timestamp", "datetime", "time"]
        date_col: Optional[str] = None
        for candidate in date_candidates:
            if candidate in col_map:
                date_col = col_map[candidate]
                break

        # Close candidates in order of preference
        close_candidates = ["close", "adj close", "adj_close", "adjusted close", "price"]
        close_col: Optional[str] = None
        for candidate in close_candidates:
            if candidate in col_map:
                close_col = col_map[candidate]
                break

        missing = []
        if not date_col:
            missing.append("'Date'")
        if not close_col:
            missing.append("'Close'")

        if missing:
            raise DataValidationError(
                f"Missing required column(s): {', '.join(missing)}. "
                f"Available columns: {list(df.columns)}"
            )

        return date_col, close_col
