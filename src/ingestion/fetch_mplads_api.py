"""
Automated REST API Data Fetcher for MPLADS e-SAKSHI Portal (MoSPI).
Connects to official endpoints, iterates across states/tenures, and caches raw data.
"""

import json
import logging
import ssl
import time
import urllib.request
from pathlib import Path
from typing import Dict, Any, List, Optional
import pandas as pd

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_URL = "https://mplads.mospi.gov.in"

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Content-Type": "application/json; charset=utf-8",
    "Accept": "application/json, text/javascript, */*; q=0.01",
    "X-Requested-With": "XMLHttpRequest"
}


def _create_ssl_context() -> ssl.SSLContext:
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def fetch_endpoint(endpoint: str, payload: Dict[str, Any], timeout: int = 15) -> Optional[Any]:
    """
    Executes a POST request to an MPLADS REST endpoint with JSON payload.
    """
    url = f"{BASE_URL}{endpoint}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=HEADERS)
    ctx = _create_ssl_context()
    
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=timeout) as resp:
            if resp.status == 200:
                raw_text = resp.read().decode("utf-8", errors="ignore")
                return json.loads(raw_text)
            else:
                logger.warning(f"Endpoint {endpoint} returned status {resp.status}")
                return None
    except Exception as e:
        logger.error(f"Error requesting {endpoint}: {e}")
        return None


def get_all_states() -> List[Dict[str, Any]]:
    """
    Fetches the master list of all 36 Indian States and UTs.
    """
    res = fetch_endpoint("/rest/PreLoginDashboardData/getStateData", {"combo": ["0", "0", "0", "2"], "house": "LS"})
    return res if res and isinstance(res, list) else []


def get_macro_tiles() -> Dict[str, Any]:
    """
    Fetches national-level macro financial and work statistics.
    """
    res = fetch_endpoint("/rest/PreLoginDashboardData/getTilesData", {"uname": "0,0,0,2"})
    return res if res and isinstance(res, dict) else {}


def save_raw_cache(data: Any, output_path: Path) -> None:
    """
    Saves raw fetched data as JSON/Parquet.
    """
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    logger.info(f"Saved raw payload to {output_path}")
