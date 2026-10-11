#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
python3 scripts/prepare_records.py
python3 scripts/validate.py
python3 scripts/build_packets.py
python3 scripts/summarize_human_results.py
