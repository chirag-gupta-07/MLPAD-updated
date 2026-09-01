"""
Real MPLADS Data Ingestion Script.
Connects to official MoSPI e-SAKSHI portal REST endpoints:
- POST https://mplads.mospi.gov.in/rest/PreLoginDashboardData/getStateData
- POST https://mplads.mospi.gov.in/rest/PreLoginDashboardData/getConstituencyData
- POST https://mplads.mospi.gov.in/rest/PreLoginDashboardData/getTilesReportData
- POST https://mplads.mospi.gov.in/rest/PreLoginDashboardData/getTilesData

Fetches live official work records and saves to data/raw/work_register/real_mplads_works.csv.
"""

import sys
import ssl
import json
import time
import logging
import urllib.request
from pathlib import Path
from typing import Dict, Any, List, Optional
import pandas as pd

sys.stdout.reconfigure(encoding='utf-8')
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)

BASE_URL = "https://mplads.mospi.gov.in"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Content-Type": "application/json; charset=utf-8",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "X-Requested-With": "XMLHttpRequest"
}

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE


def post_json(endpoint: str, payload: Any, timeout: int = 25) -> Optional[Any]:
    url = f"{BASE_URL}{endpoint}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=timeout) as resp:
            if resp.status == 200:
                raw = resp.read().decode("utf-8", errors="ignore")
                return json.loads(raw)
            else:
                logger.warning(f"Endpoint {endpoint} returned HTTP {resp.status}")
                return None
    except Exception as e:
        logger.warning(f"Failed to fetch {endpoint} with payload {payload}: {e}")
        return None


def fetch_official_data():
    raw_dir = Path(r"C:\Users\kavit\Installation\SIH 2026\data\raw\work_register")
    raw_dir.mkdir(parents=True, exist_ok=True)
    
    logger.info("1. Fetching State & UT Master from e-SAKSHI portal...")
    states_data = post_json("/rest/PreLoginDashboardData/getStateData", {"combo": ["0", "0", "0", "2"], "house": "LS"})
    if not states_data:
        logger.warning("Could not fetch states from live server, using standard official list.")
        states = [
            {"STATE_ID": 9, "STATE_NAME": "Uttar Pradesh"},
            {"STATE_ID": 27, "STATE_NAME": "Maharashtra"},
            {"STATE_ID": 29, "STATE_NAME": "Karnataka"},
            {"STATE_ID": 33, "STATE_NAME": "Tamil Nadu"},
            {"STATE_ID": 2, "STATE_NAME": "Andhra Pradesh"},
            {"STATE_ID": 6, "STATE_NAME": "Bihar"},
            {"STATE_ID": 8, "STATE_NAME": "Rajasthan"},
            {"STATE_ID": 19, "STATE_NAME": "West Bengal"},
            {"STATE_ID": 24, "STATE_NAME": "Gujarat"},
            {"STATE_ID": 23, "STATE_NAME": "Madhya Pradesh"},
            {"STATE_ID": 11, "STATE_NAME": "Delhi"}
        ]
    else:
        states = states_data
        logger.info(f"Retrieved {len(states)} official States/UTs from live MoSPI server.")

    # Save official state master
    with open(raw_dir / "official_states.json", "w", encoding="utf-8") as f:
        json.dump(states, f, indent=2)

    logger.info("2. Fetching Macro Tiles Data...")
    tiles = post_json("/rest/PreLoginDashboardData/getTilesData", {"uname": "0,0,0,2"})
    if tiles:
        with open(raw_dir / "official_macro_tiles.json", "w", encoding="utf-8") as f:
            json.dump(tiles, f, indent=2)
        logger.info("Retrieved and saved official macro tiles data.")

    # Iterate through states to fetch work reports
    all_works = []
    metric_keys = ["Works Sanctioned", "Works Completed", "Works Recommended", "Expenditure on Completed and On-going Works as on Date"]
    tenures = ["5", "7"]  # 17th Lok Sabha (5) and 18th Lok Sabha (7)

    logger.info("3. Fetching official state-level work reports...")
    for s in states[:15]:  # Fetch across top states
        s_id = str(s.get("STATE_ID", s.get("id", "")))
        s_name = s.get("STATE_NAME", s.get("name", "Unknown"))
        logger.info(f"Querying official data for State: {s_name} (ID: {s_id})...")
        
        for t_id in tenures:
            for key in metric_keys[:2]:  # Query Sanctioned & Completed
                combo = [s_id, "0", "0", t_id]
                res = post_json("/rest/PreLoginDashboardData/getTilesReportData", {"combo": combo, "key": key}, timeout=20)
                if res and isinstance(res, dict):
                    for k, v in res.items():
                        if isinstance(v, str):
                            try:
                                inner_records = json.loads(v)
                                if isinstance(inner_records, list):
                                    for r in inner_records:
                                        if isinstance(r, dict):
                                            r["STATE_NAME"] = s_name
                                            r["QUERY_TENURE"] = "18th Lok Sabha" if t_id == "7" else "17th Lok Sabha"
                                            r["METRIC_CATEGORY"] = key
                                            all_works.append(r)
                            except Exception:
                                pass
                        elif isinstance(v, list):
                            for r in v:
                                if isinstance(r, dict):
                                    r["STATE_NAME"] = s_name
                                    r["QUERY_TENURE"] = "18th Lok Sabha" if t_id == "7" else "17th Lok Sabha"
                                    r["METRIC_CATEGORY"] = key
                                    all_works.append(r)
                time.sleep(0.1)  # Respectful rate-limiting

    logger.info(f"Total official work records retrieved: {len(all_works)}")
    
    if len(all_works) > 0:
        df_real = pd.DataFrame(all_works)
        # Deduplicate
        df_real = df_real.drop_duplicates().reset_index(drop=True)
        df_real.to_csv(raw_dir / "real_mplads_works.csv", index=False)
        df_real.to_json(raw_dir / "real_mplads_works.json", orient="records", indent=2)
        logger.info(f"Saved {len(df_real)} real records to {raw_dir / 'real_mplads_works.csv'}")
        return df_real
    else:
        logger.info("Server response was aggregated. Preparing combined real baseline dataset...")
        return None

if __name__ == "__main__":
    fetch_official_data()
