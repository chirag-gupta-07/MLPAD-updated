"""
Standalone CLI script to reset the full MPLADS platform to its pristine demonstration baseline.
Usage:
    python reset_demo.py
"""

import sys
import os

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.app.db.reset_demo import reset_all_databases_to_demo_state

if __name__ == "__main__":
    print("\n============================================================")
    print("  MPLADS PLATFORM: RESTORING ORIGINAL DEMO STATE FOR JUDGES")
    print("============================================================\n")
    res = reset_all_databases_to_demo_state()
    print("\n[SUCCESS] " + res["message"])
    print("All test modifications wiped clean. Ready for live demonstration!\n")
