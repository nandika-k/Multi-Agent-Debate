import shutil
import sys
from pathlib import Path
from uuid import uuid4

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

LOCAL_TMP = ROOT / "tests_runtime"
LOCAL_TMP.mkdir(parents=True, exist_ok=True)


@pytest.fixture
def workspace_tmp_path():
    path = LOCAL_TMP / uuid4().hex
    path.mkdir(parents=True, exist_ok=True)
    try:
        yield path
    finally:
        shutil.rmtree(path, ignore_errors=True)
