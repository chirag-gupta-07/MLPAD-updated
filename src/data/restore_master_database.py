"""
Restore the master 1,500 evaluated dataset to the live backend database and reload the cache.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

import shutil
from backend.app.services.data_service import reload_dataframe

src_parquet = Path(r"C:\Users\kavit\Installation\SIH 2026\data\processed\final_evaluated_works.parquet")
src_csv = Path(r"C:\Users\kavit\Installation\SIH 2026\data\processed\final_evaluated_works.csv")

dest_parquet = Path(r"C:\Users\kavit\Installation\SIH 2026\backend\app\db\master_evaluated_works.parquet")
dest_csv = Path(r"C:\Users\kavit\Installation\SIH 2026\backend\app\db\master_evaluated_works.csv")

shutil.copyfile(src_parquet, dest_parquet)
shutil.copyfile(src_csv, dest_csv)

reload_dataframe()
print("Restored and reloaded 1,500 records into live backend database.")
