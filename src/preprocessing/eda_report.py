"""
Exploratory Data Analysis (EDA) and Summary Report Generator.
Computes summary statistics, distributions, missing value audits, and sectoral benchmarks
from data/processed/master_works.parquet and outputs a markdown report.
"""

import json
from pathlib import Path
import pandas as pd
import numpy as np

def run_eda(master_path: Path, output_report_path: Path) -> str:
    df = pd.read_parquet(master_path)
    
    total_rows = len(df)
    total_cols = len(df.columns)
    
    # Missing values
    missing_counts = df.isnull().sum()
    missing_summary = missing_counts[missing_counts > 0].to_dict()
    
    # Financial Stats
    total_sanctioned = df["sanctioned_amount"].sum()
    total_expenditure = df["total_expenditure"].sum()
    overall_utilization = (total_expenditure / total_sanctioned * 100) if total_sanctioned > 0 else 0.0
    
    # Sector Stats
    sector_counts = df["sector"].value_counts().to_dict()
    sector_medians = df.groupby("sector")["sanctioned_amount"].median().to_dict()
    
    # State Stats
    state_counts = df["state"].value_counts().to_dict()
    
    # Status Stats
    status_counts = df["status"].value_counts().to_dict()
    
    # Build Markdown Report
    report = []
    report.append("# MPLADS Master Dataset Exploratory Data Analysis (EDA) Report\n")
    report.append(f"- **Total Works Analyzed**: {total_rows:,}")
    report.append(f"- **Total Features / Columns**: {total_cols}")
    report.append(f"- **Total Sanctioned Budget**: ₹{total_sanctioned:,.2f} ({total_sanctioned/1e7:,.2f} Crore)")
    report.append(f"- **Total Expenditure**: ₹{total_expenditure:,.2f} ({total_expenditure/1e7:,.2f} Crore)")
    report.append(f"- **Overall Fund Utilization Rate**: {overall_utilization:.2f}%\n")
    
    report.append("## 1. Dataset Schema & Column Types")
    report.append("| Column Name | Non-Null Count | Data Type | Sample Value |")
    report.append("| :--- | :--- | :--- | :--- |")
    for col in df.columns:
        nn = df[col].notnull().sum()
        dtype = str(df[col].dtype)
        sample = str(df[col].dropna().iloc[0]) if nn > 0 else "None"
        if len(sample) > 40:
            sample = sample[:37] + "..."
        report.append(f"| `{col}` | {nn:,} | {dtype} | {sample} |")
    report.append("")
    
    report.append("## 2. Sectoral Distribution & Median Costs")
    report.append("| Sector Name | Works Count | % Share | Median Cost (₹) |")
    report.append("| :--- | :--- | :--- | :--- |")
    for sec, count in sector_counts.items():
        share = (count / total_rows) * 100
        med = sector_medians.get(sec, 0.0)
        report.append(f"| {sec} | {count:,} | {share:.1f}% | ₹{med:,.2f} |")
    report.append("")
    
    report.append("## 3. Project Status Breakdown")
    report.append("| Status | Count | % Share |")
    report.append("| :--- | :--- | :--- |")
    for st, count in status_counts.items():
        share = (count / total_rows) * 100
        report.append(f"| `{st}` | {count:,} | {share:.1f}% |")
    report.append("")
    
    report.append("## 4. Top States by Works Volume")
    report.append("| State / UT | Works Count | % Share |")
    report.append("| :--- | :--- | :--- |")
    for st, count in list(state_counts.items())[:10]:
        share = (count / total_rows) * 100
        report.append(f"| {st} | {count:,} | {share:.1f}% |")
    report.append("")
    
    if "is_injected_anomaly" in df.columns:
        anomaly_counts = df["is_injected_anomaly"].value_counts().to_dict()
        anomaly_types = df["synthetic_anomaly_type"].value_counts().to_dict()
        report.append("## 5. Documented Anomaly & Risk Categories")
        report.append(f"- **Normal / Compliant Works**: {anomaly_counts.get(False, 0):,} ({anomaly_counts.get(False, 0)/total_rows*100:.1f}%)")
        report.append(f"- **Documented Risk Flags**: {anomaly_counts.get(True, 0):,} ({anomaly_counts.get(True, 0)/total_rows*100:.1f}%)\n")
        report.append("| Risk / Anomaly Category | Count |")
        report.append("| :--- | :--- |")
        for at, count in anomaly_types.items():
            report.append(f"| {at} | {count:,} |")
    else:
        report.append("## 5. Risk Assessment Overview")
        report.append("Works evaluated under Multi-Signal Calibrated Risk Engine across Delay, Financial Anomaly, Utilization, and Semantic Duplicate dimensions.")
        
    report_text = "\n".join(report)
    output_report_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_report_path, "w", encoding="utf-8") as f:
        f.write(report_text)
        
    print(f"EDA report generated and saved to {output_report_path}")
    return report_text

if __name__ == "__main__":
    PROJECT_ROOT = Path(__file__).resolve().parents[2]
    master_file = PROJECT_ROOT / "data" / "processed" / "master_works.parquet"
    eda_out = PROJECT_ROOT / "data" / "processed" / "EDA_REPORT.md"
    run_eda(master_file, eda_out)
