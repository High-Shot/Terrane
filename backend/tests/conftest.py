import os
import sys
from pathlib import Path

# server.py reads MONGO_URL / DB_NAME at import time and constructs a Motor
# client. Motor connects lazily (no I/O until the first operation), so these
# placeholders let the module import cleanly for pure-function unit tests.
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "terrane_test")

# Make backend/server.py importable when pytest is run from the repo root.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
