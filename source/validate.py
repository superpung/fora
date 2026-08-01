#!/usr/bin/env python3
"""Validate every conference dataset against schema/schema.json, and check that
every person in it is a person and every time is a time. Requires jsonschema.

This is the regression gate: after any schema change, every existing conference
must still validate. It checks all datasets under web/src/data/conferences/.

A JSON Schema can say a field is a string, not what the string has to MEAN, and
both gaps have already shipped bugs:

  * `name` — a role, a placeholder or the numbering of a list passes the schema
    and then turns up in the app as a speaker with a page of their own.
  * `start` / `end` — the schema says "HH:MM" in a *description*, so `9:00` and
    `24:00` passed. `9:00` sorts after `14:00`, and the calendar export turned
    it into a five-digit time no client can read.

Every name and every time is therefore read through the same rules the builders
use (source/people.py, source/times.py), so a conference added later cannot
quietly reintroduce any of it.
"""
import json, pathlib, sys
import jsonschema

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from people import person_problem  # noqa: E402
from times import time_problem  # noqa: E402

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

# Clock fields. Every one of them is a wall-clock reading at the venue, and the
# app sorts, renders and exports them as such.
TIME_KEYS = {"start", "end"}


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


def times_in(node, path=""):
    """Every (path, value) stored in a start/end field, anywhere in the file."""
    if isinstance(node, dict):
        for k, v in node.items():
            here = f"{path}.{k}" if path else k
            if k in TIME_KEYS and not isinstance(v, (dict, list)):
                yield here, v
            else:
                yield from times_in(v, here)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            yield from times_in(v, f"{path}[{i}]")


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

    bad_times = [(path, value, why)
                 for path, value in times_in(data)
                 if (why := time_problem(value))]
    if bad_times:
        all_ok = False
        print(f"✗ {f.name}: {len(bad_times)} values that are not clock times")
        for path, value, why in bad_times[:30]:
            print(f"   - {path}: {value!r} — {why}")
    else:
        print(f"✓ {f.name}: every start/end is a clock time")
sys.exit(0 if all_ok else 1)
