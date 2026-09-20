import sys
from pathlib import Path

# Ensure both workspace root and backend directory are in sys.path
root_path = Path(__file__).resolve().parent.parent
backend_path = root_path / "backend"

for p in [str(root_path), str(backend_path)]:
    if p not in sys.path:
        sys.path.insert(0, p)
