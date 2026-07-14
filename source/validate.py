#!/usr/bin/env python3
"""Validate every conference dataset against schema/schema.json. Requires jsonschema.

This is the regression gate: after any schema change, every existing conference
must still validate. It checks all datasets under web/src/data/conferences/.
"""
import json, pathlib, sys
import jsonschema

ROOT = pathlib.Path(__file__).resolve().parent.parent
schema = json.loads((ROOT / "schema" / "schema.json").read_text())
jsonschema.Draft202012Validator.check_schema(schema)
validator = jsonschema.Draft202012Validator(schema)

conf_dir = ROOT / "web" / "src" / "data" / "conferences"
files = sorted(conf_dir.glob("*.json"))
if not files:
    print("no conference datasets found in", conf_dir)
    sys.exit(1)

all_ok = True
for f in files:
    data = json.loads(f.read_text())
    errs = sorted(validator.iter_errors(data), key=lambda e: list(e.path))
    if errs:
        all_ok = False
        print(f"✗ {f.name}: {len(errs)} errors")
        for e in errs[:30]:
            print("   -", list(e.path), e.message[:120])
    else:
        print(f"✓ {f.name}: conforms to the schema")
sys.exit(0 if all_ok else 1)
