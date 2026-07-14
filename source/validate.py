#!/usr/bin/env python3
"""Validate data/ccfchip2026.json against schema/schema.json. Requires jsonschema."""
import json, pathlib, sys
import jsonschema

ROOT = pathlib.Path(__file__).resolve().parent.parent
schema = json.loads((ROOT / "schema" / "schema.json").read_text())
data = json.loads((ROOT / "data" / "ccfchip2026.json").read_text())

jsonschema.Draft202012Validator.check_schema(schema)
v = jsonschema.Draft202012Validator(schema)
errs = sorted(v.iter_errors(data), key=lambda e: list(e.path))
if not errs:
    print("VALID ✓  data/ccfchip2026.json conforms to the schema")
    sys.exit(0)
print(f"{len(errs)} errors:")
for e in errs[:30]:
    print(" -", list(e.path), e.message[:120])
sys.exit(1)
