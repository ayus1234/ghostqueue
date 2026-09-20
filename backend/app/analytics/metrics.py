"""Analytics interface preserving backward compatibility and exposing canonical analytics."""
import pandas as pd
from app.analytics.engine import run_full_analysis, calculate_summary_metrics
from app.ingestion.mapper import map_columns, detect_record_type


def analyze_dataframe(df: pd.DataFrame, filename: str = "dataset.csv") -> dict:
    """Analyze DataFrame using canonical schema mapping and return dictionary response."""
    format_str = "json" if filename.lower().endswith(".json") else "csv"
    analysis = run_full_analysis(df, filename=filename, format_str=format_str)
    return analysis.model_dump()
