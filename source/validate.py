#!/usr/bin/env python3
"""Validate every conference dataset against schema/schema.json, and check that
every person in it is a person. Requires jsonschema.

This is the regression gate: after any schema change, every existing conference
must still validate. It checks all datasets under web/src/data/conferences/.

The schema cannot say what a NAME is, only that there is one — so a role, a
placeholder or the numbering of a list will pass it and then turn up in the app
as a speaker with a page of their own. Every name is therefore read through the
same rules the builders use (source/people.py), and a conference added later
cannot quietly reintroduce any of it.
"""
import json, pathlib, sys
import jsonschema

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from people import person_problem  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent.parent
schema = json.loads((ROOT / "schema" / "schema.json").read_text())
jsonschema.Draft202012Validator.check_schema(schema)
validator = jsonschema.Draft202012Validator(schema)

conf_dir = ROOT / "web" / "src" / "data" / "conferences"
files = sorted(conf_dir.glob("*.json"))
if not files:
    print("no conference datasets found in", conf_dir)
    sys.exit(1)

# Where a person can appear. Anything under one of these keys with a plain
# string `name` is somebody the app will offer a speaker page for.
PERSON_KEYS = {"speakers", "chairs", "members", "hosts", "organizers", "guests"}


def people_in(node, path="", under=None):
    """Every (path, person) in the dataset, wherever people are listed."""
    if isinstance(node, dict):
        if under in PERSON_KEYS and isinstance(node.get("name"), str):
            yield path, node
        for k, v in node.items():
            yield from people_in(v, f"{path}.{k}" if path else k, k)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            yield from people_in(v, f"{path}[{i}]", under)


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

    not_people = [(path, p["name"], why)
                  for path, p in people_in(data)
                  if (why := person_problem(p["name"]))]
    if not_people:
        all_ok = False
        print(f"✗ {f.name}: {len(not_people)} names that are not people")
        for path, name, why in not_people[:30]:
            print(f"   - {path}: {name!r} — {why}")
    else:
        print(f"✓ {f.name}: every name reads as a person")
sys.exit(0 if all_ok else 1)
