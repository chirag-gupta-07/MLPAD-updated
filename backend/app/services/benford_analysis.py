"""
Benford's Law Statistical Fraud Detection for MPLADS Financial Data.
Analyzes first-digit distributions of payment amounts and expenditures
to detect fabricated or manipulated financial records.
"""
import logging
import math
from typing import Dict, Any, List, Optional
import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# Expected Benford's Law first-digit frequencies
BENFORD_EXPECTED = {
    1: 0.301, 2: 0.176, 3: 0.125, 4: 0.097,
    5: 0.079, 6: 0.067, 7: 0.058, 8: 0.051, 9: 0.046
}


def get_first_digit(value: float) -> Optional[int]:
    """Extract first significant digit from a number."""
    if value <= 0 or not np.isfinite(value):
        return None
    s = f"{abs(value):.10f}"
    for ch in s:
        if ch.isdigit() and ch != '0':
            return int(ch)
    return None


def benford_chi_square(observed_counts: Dict[int, int], total: int) -> Dict[str, Any]:
    """Run chi-square goodness-of-fit test against Benford distribution."""
    try:
        from scipy.stats import chisquare
    except ImportError:
        # Manual chi-square if scipy not available
        chi2 = 0.0
        for d in range(1, 10):
            obs = observed_counts.get(d, 0)
            exp = BENFORD_EXPECTED[d] * total
            if exp > 0:
                chi2 += (obs - exp) ** 2 / exp
        # Approximate p-value (df=8)
        p_value = max(0.001, 1.0 - min(chi2 / 20.0, 0.999))  # Rough approximation
        return {"chi_square": round(chi2, 4), "p_value": round(p_value, 4), "df": 8}
    
    observed = [observed_counts.get(d, 0) for d in range(1, 10)]
    expected = [BENFORD_EXPECTED[d] * total for d in range(1, 10)]
    
    stat, p_val = chisquare(observed, expected)
    return {"chi_square": round(float(stat), 4), "p_value": round(float(p_val), 6), "df": 8}


def analyze_benford_compliance(df: pd.DataFrame, column: str = "total_expenditure",
                                group_by: str = "district") -> Dict[str, Any]:
    """Analyze Benford's Law compliance grouped by district or contractor."""
    results = {"column_analyzed": column, "grouped_by": group_by, "entities": []}
    
    if column not in df.columns or group_by not in df.columns:
        results["error"] = f"Column '{column}' or '{group_by}' not found"
        return results
    
    # Filter to positive values only
    valid = df[df[column] > 0].copy()
    valid["_first_digit"] = valid[column].apply(get_first_digit)
    valid = valid[valid["_first_digit"].notnull()]
    
    for group_name, group_df in valid.groupby(group_by):
        if len(group_df) < 30:  # Need enough samples for chi-square
            continue
        
        digit_counts = group_df["_first_digit"].value_counts().to_dict()
        total = len(group_df)
        
        chi_result = benford_chi_square(digit_counts, total)
        
        # Observed vs expected distribution
        distribution = {}
        for d in range(1, 10):
            obs_pct = round(digit_counts.get(d, 0) / total * 100, 1)
            exp_pct = round(BENFORD_EXPECTED[d] * 100, 1)
            distribution[str(d)] = {"observed_pct": obs_pct, "expected_pct": exp_pct, "deviation": round(obs_pct - exp_pct, 1)}
        
        is_suspicious = chi_result["p_value"] < 0.05
        
        results["entities"].append({
            "name": str(group_name),
            "sample_size": total,
            "chi_square": chi_result["chi_square"],
            "p_value": chi_result["p_value"],
            "is_suspicious": is_suspicious,
            "verdict": "ANOMALOUS" if is_suspicious else "COMPLIANT",
            "digit_distribution": distribution
        })
    
    # Sort by suspiciousness
    results["entities"].sort(key=lambda x: x["p_value"])
    results["total_entities_analyzed"] = len(results["entities"])
    results["suspicious_count"] = sum(1 for e in results["entities"] if e["is_suspicious"])
    
    return results
