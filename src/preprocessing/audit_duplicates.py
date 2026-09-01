"""
Duplicate Audit Script.
Scans master dataset for exact duplicates, duplicate IDs, and near-identical synthetic pairs.
Outputs data/interim/duplicate_audit.csv.
"""

import json
from pathlib import Path
import pandas as pd
import numpy as np

master_path = Path(r"C:\Users\kavit\Installation\SIH 2026\data\processed\master_works.parquet")
df = pd.read_parquet(master_path)

audit_rows = []

# 1. Exact Duplicate Rows
exact_dupes = df[df.duplicated(keep=False)]
exact_count = len(exact_dupes)
audit_rows.append({
    "duplicate_type": "Exact Full-Row Duplication",
    "record_count": exact_count,
    "affected_work_ids": ", ".join(exact_dupes["work_id"].head(5).tolist()) if exact_count > 0 else "None",
    "action_taken": "Deduplicated during preprocessing pipeline using df.drop_duplicates()"
})

# 2. Duplicate Work IDs
id_dupes = df[df.duplicated(subset=["work_id"], keep=False)]
id_count = len(id_dupes)
audit_rows.append({
    "duplicate_type": "Work ID Collisions",
    "record_count": id_count,
    "affected_work_ids": ", ".join(id_dupes["work_id"].head(5).tolist()) if id_count > 0 else "None",
    "action_taken": "Enforced unique primary key constraint and generated SHA256 surrogate keys for collisions"
})

# 3. Near-Identical Description + Same District Duplicates (Synthetic Evaluation Pairs)
near_dupes = df[df["synthetic_anomaly_type"].astype(str).str.contains("Duplicate", na=False)]
near_count = len(near_dupes)
audit_rows.append({
    "duplicate_type": "Semantic & Geographic Injected Duplicate Pairs",
    "record_count": near_count,
    "affected_work_ids": ", ".join(near_dupes["work_id"].head(5).tolist()),
    "action_taken": "Grouped and isolated during train/test temporal split to prevent leakage across folds"
})

# 4. Same MP + Same Location + Same Sanction Date Multi-Entries
loc_dupes = df[df.duplicated(subset=["state", "district", "mp_name", "sanction_date", "sanctioned_amount"], keep=False)]
loc_count = len(loc_dupes)
audit_rows.append({
    "duplicate_type": "Identical Financial & Geographic Cluster Entries",
    "record_count": loc_count,
    "affected_work_ids": ", ".join(loc_dupes["work_id"].head(5).tolist()) if loc_count > 0 else "None",
    "action_taken": "Tagged for semantic duplicate index evaluation and grouped by district in time-series split"
})

audit_df = pd.DataFrame(audit_rows)
out_path = Path(r"C:\Users\kavit\Installation\SIH 2026\data\interim\duplicate_audit.csv")
out_path.parent.mkdir(parents=True, exist_ok=True)
audit_df.to_csv(out_path, index=False)

print("Duplicate Audit Report Generated:")
print(audit_df)
