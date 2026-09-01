"""
Explainable AI (XAI) and Reason Attribution Engine for MPLADS Works.
Generates evidence-backed structured reasons exposing:
- Metric Name
- Observed Value
- Comparison / Peer Baseline
- Peer Group Scope
- Risk Signal Severity (HIGH, MEDIUM, LOW)
- Actionable Supervisory Recommendations
"""

import json
import logging
from pathlib import Path
from typing import Dict, Any, List, Tuple
import pandas as pd
import numpy as np

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def generate_work_explanation(row: pd.Series) -> Dict[str, Any]:
    reasons = []
    recommended_actions = []
    
    comp_risk = float(row.get("composite_risk_score", 0.0))
    sanctioned = float(row.get("sanctioned_amount", 0.0))
    expenditure = float(row.get("total_expenditure", 0.0))
    cost_dev = float(row.get("cost_deviation", 0.0))
    peer_ratio = float(row.get("cost_vs_peer_median_ratio", 1.0))
    peer_median = float(row.get("progressive_peer_median", row.get("peer_median_cost", sanctioned)))
    peer_level = str(row.get("peer_group_level", "State+Sector"))
    
    delay_days = float(row.get("delay_days", 0.0))
    progress_pct = float(row.get("completion_percentage", 0.0))
    status = str(row.get("status", "UNKNOWN"))
    dup_score = float(row.get("duplicate_risk_score", 0.0))
    fund_rel_ratio = float(row.get("fund_release_ratio", 0.0))
    
    # 1. Financial Anomaly Reason
    if cost_dev > 0.15:
        overrun_inr = max(0.0, expenditure - sanctioned)
        reasons.append({
            "metric": "Expenditure vs Sanctioned Budget",
            "observed_value": f"₹{expenditure:,.0f}",
            "comparison_value": f"₹{sanctioned:,.0f} (Sanctioned)",
            "peer_group": f"{row.get('district', '')}, {row.get('state', '')}",
            "deviation": f"+{cost_dev*100:.1f}% (+₹{overrun_inr:,.0f})",
            "severity": "HIGH" if cost_dev > 0.30 else "MEDIUM",
            "text": f"Total expenditure exceeds sanctioned budget by {cost_dev*100:.1f}% (Overrun of ₹{overrun_inr:,.0f})."
        })
        recommended_actions.append("Conduct physical verification of measurement book (MB) and revised sanction approvals.")
        
    if peer_ratio >= 1.8:
        reasons.append({
            "metric": "Peer-Group Cost Ratio",
            "observed_value": f"₹{sanctioned:,.0f}",
            "comparison_value": f"₹{peer_median:,.0f} (Median)",
            "peer_group": f"{peer_level} ({row.get('sector', '')})",
            "deviation": f"{peer_ratio:.1f}x higher than peer baseline",
            "severity": "HIGH",
            "text": f"Sanctioned cost is {peer_ratio:.1f}x higher than the {peer_level} median for {row.get('sector', 'this sector')}."
        })
        recommended_actions.append("Review detailed project estimate (DPR) and Schedule of Rates (SoR) conformity.")

    # 2. Schedule Delay & Stall Reason
    if status == "STALLED" or (progress_pct < 15.0 and row.get("work_age_days", 0) > 250):
        reasons.append({
            "metric": "Physical Progress Latency",
            "observed_value": f"{progress_pct:.1f}% progress after {int(row.get('work_age_days', 0))} days",
            "comparison_value": ">= 80% Expected",
            "peer_group": str(row.get("implementing_agency", "District Agency")),
            "deviation": "Severe execution stall",
            "severity": "HIGH",
            "text": f"Project is stalled with only {progress_pct:.1f}% progress recorded after {int(row.get('work_age_days', 0))} elapsed days."
        })
        recommended_actions.append("Issue notice to implementing agency for immediate physical milestone inspection.")
    elif delay_days > 45.0 and status != "COMPLETED":
        reasons.append({
            "metric": "Schedule Overrun",
            "observed_value": f"{int(delay_days)} days overdue",
            "comparison_value": f"{int(row.get('planned_duration_days', 365))} days target",
            "peer_group": str(row.get("sector", "Sector")),
            "deviation": f"+{int(delay_days)} days beyond deadline",
            "severity": "MEDIUM",
            "text": f"Work is running {int(delay_days)} days beyond target completion date."
        })
        recommended_actions.append("Direct District Planning Officer to expedite milestone clearance.")

    # 3. Duplicate Work Reason
    if dup_score >= 50.0:
        matches_json = row.get("duplicate_matches_json", "[]")
        try:
            matches = json.loads(matches_json) if isinstance(matches_json, str) else []
        except Exception:
            matches = []
        pair_id = matches[0].get("paired_work_id", "Nearby Work") if len(matches) > 0 else "Nearby Work"
        reasons.append({
            "metric": "Semantic & Spatial Similarity",
            "observed_value": f"{dup_score:.0f}% similarity score",
            "comparison_value": f"Work {pair_id}",
            "peer_group": f"{row.get('district', '')} Spatial Radius",
            "deviation": "Near-identical scope and budget in same district",
            "severity": "HIGH" if dup_score >= 70.0 else "MEDIUM",
            "text": f"High multi-dimensional similarity ({dup_score:.0f}%) detected with work {pair_id} in {row.get('district', '')}."
        })
        recommended_actions.append(f"Cross-verify foundation photos and geotagged records against work {pair_id}.")

    # 4. Fund Utilization Reason
    if fund_rel_ratio >= 0.75 and progress_pct <= 10.0 and status != "COMPLETED":
        reasons.append({
            "metric": "Disbursal vs Execution Gap",
            "observed_value": f"{fund_rel_ratio*100:.0f}% funds released",
            "comparison_value": f"{progress_pct:.0f}% progress recorded",
            "peer_group": str(row.get("implementing_agency", "Agency")),
            "deviation": "Full fund release with minimal execution",
            "severity": "HIGH",
            "text": f"{fund_rel_ratio*100:.0f}% of funds released to the implementing agency with only {progress_pct:.0f}% physical progress."
        })
        recommended_actions.append("Audit contractor escrow ledger and hold future installment tranches.")

    # Compliant fallback
    if len(reasons) == 0:
        reasons.append({
            "metric": "Overall Compliance",
            "observed_value": "All parameters normal",
            "comparison_value": "Within peer bounds",
            "peer_group": f"{row.get('sector', '')} / {row.get('state', '')}",
            "deviation": "None",
            "severity": "LOW",
            "text": "Project expenditure, progress, and execution timelines are consistent with historical peer baselines."
        })
        recommended_actions.append("Routine progress monitoring under standard MPLADS guidelines.")

    risk_level = row.get("risk_level", "LOW")
    if risk_level == "HIGH":
        summary = f"High-risk work flagged with composite risk score of {comp_risk:.1f}/100. Primary concern: {reasons[0]['text'].lower()}"
    elif risk_level == "MEDIUM":
        summary = f"Moderate risk work with composite risk score of {comp_risk:.1f}/100 requiring supervisory tracking."
    else:
        summary = f"Compliant work with composite risk score of {comp_risk:.1f}/100."

    return {
        "work_id": str(row.get("work_id", "")),
        "composite_risk_score": comp_risk,
        "risk_level": risk_level,
        "summary": summary,
        "risk_factors": reasons,
        "recommended_actions": list(set(recommended_actions)),
        "data_quality_score": float(row.get("data_quality_score", 95.0)),
        "model_confidence": str(row.get("model_confidence", "HIGH"))
    }


def add_explanations_to_dataset(evaluated_path: Path, output_final_path: Path) -> pd.DataFrame:
    logger.info(f"Generating evidence-based explainability profiles for {evaluated_path}...")
    df = pd.read_parquet(evaluated_path)
    
    explanations = [generate_work_explanation(row) for _, row in df.iterrows()]
    
    df["risk_summary_text"] = [exp["summary"] for exp in explanations]
    df["risk_factors_json"] = [json.dumps(exp["risk_factors"]) for exp in explanations]
    df["recommended_actions_json"] = [json.dumps(exp["recommended_actions"]) for exp in explanations]
    
    output_final_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(output_final_path.with_suffix(".parquet"), index=False)
    df.to_csv(output_final_path.with_suffix(".csv"), index=False)
    
    backend_db = Path(r"C:\Users\kavit\Installation\SIH 2026\backend\app\db\master_evaluated_works.parquet")
    df.to_parquet(backend_db, index=False)
    df.to_csv(backend_db.with_suffix(".csv"), index=False)
    
    logger.info(f"Explainability profiles generated. Updated {output_final_path.with_suffix('.parquet')}")
    return df


if __name__ == "__main__":
    final_file = Path(r"C:\Users\kavit\Installation\SIH 2026\data\processed\final_evaluated_works.parquet")
    add_explanations_to_dataset(final_file, final_file)
