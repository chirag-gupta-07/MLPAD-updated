"""
Restore the master 1,500 evaluated dataset to the live backend database and reload the cache.
"""
import sys
PROJECT_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(PROJECT_ROOT))

import shutil
from backend.app.services.data_service import reload_dataframe

src_parquet = PROJECT_ROOT / "data" / "processed" / "final_evaluated_works.parquet"
src_csv = PROJECT_ROOT / "data" / "processed" / "final_evaluated_works.csv"

dest_parquet = PROJECT_ROOT / "backend" / "app" / "db" / "master_evaluated_works.parquet"
dest_csv = PROJECT_ROOT / "backend" / "app" / "db" / "master_evaluated_works.csv"

shutil.copyfile(src_parquet, dest_parquet)
shutil.copyfile(src_csv, dest_csv)

reload_dataframe()
print("Restored and reloaded 1,500 records into live backend database.")
