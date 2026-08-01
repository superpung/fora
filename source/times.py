#!/usr/bin/env python3
"""What counts as a clock time, and how to read one out of a printed cell.

`start` and `end` are documented in the schema as `HH:MM`, but a description is
not a constraint, and the programmes do not cooperate. ChinaSoft's competition
timetables print `9:00` without the leading zero, and a submission deadline as
`24:00` — a real thing to say in a table, and not a reading any clock shows.

Both went into the dataset as printed, and everything downstream believed them:

  * `9:00` sorts AFTER `14:00`, because these are strings. A nine-o'clock talk
    therefore came last in every export of that day.
  * `"9:00".replace(":", "") + "00"` is `90000` — five digits where iCalendar
    needs six. Exporting those forums produced a calendar file no client can
    read, and nothing anywhere said so.

So the builders read every printed time through `read_time`, which returns
either a valid `HH:MM` or the reason it is not one. Nothing is guessed: padding
a `9` to `09` changes no information, and the one case that cannot be
represented exactly — `24:00`, midnight ending the named day — is stored as the
last minute of that day AND reported, so the caller records what the source
actually printed in `flags` instead of losing it.

`source/validate.py` runs the same rule over the built datasets, so a conference
added later cannot quietly reintroduce a time that is not a time.
"""
import re

__all__ = ["read_time", "time_problem", "CLOCK"]

#: The only shape a stored time may have.
CLOCK = re.compile(r"^([01]\d|2[0-3]):([0-5]\d)$")

# What a programme prints. The hour may be unpadded; the separator may be a
# full-width colon or a dot.
_PRINTED = re.compile(r"^(\d{1,2})\s*[:：.]\s*(\d{1,2})$")


def _clean(s):
    return re.sub(r"\s+", " ", str(s or "")).strip()


def time_problem(value):
    """Why `value` is not a stored clock time, or None if it is fine.

    Used by the validator: it checks the value already in the dataset, so it is
    deliberately strict — no padding, no repair, no `24:00`.
    """
    if value is None:
        return None
    if not isinstance(value, str):
        return f"time is {type(value).__name__}, not a string: {value!r}"
    if not CLOCK.fullmatch(value):
        return f"not HH:MM: {value!r}"
    return None


def read_time(raw):
    """Read one printed time.

    Returns `(value, problem)`. `value` is `HH:MM` or None; `problem` is a
    sentence for the caller's `flags` whenever the printed form was not already
    a plain clock time — including the cases that were repaired, so a repair is
    never silent.
    """
    text = _clean(raw)
    if not text:
        return None, None

    m = _PRINTED.match(text)
    if not m:
        return None, f"unreadable time {text!r}"
    hh, mm = int(m.group(1)), int(m.group(2))

    if mm > 59:
        return None, f"minute out of range in {text!r}"

    # Midnight at the END of the day. ISO 8601 allows it, a clock never shows
    # it, and the tables use it for deadlines ("报名截止 24:00"). Stored as the
    # last minute of that day so it still sorts and renders where it belongs —
    # a deadline at the end of the day — with the source's own spelling kept in
    # the caller's flags.
    if hh == 24 and mm == 0:
        return "23:59", f"source prints {text!r} (midnight ending the day); stored as 23:59"

    if hh > 23:
        return None, f"hour out of range in {text!r}"

    padded = f"{hh:02d}:{mm:02d}"
    # Padding is not a repair worth reporting: no information differs between
    # "9:00" and "09:00", and every table with a single-digit hour would
    # otherwise flag every row.
    return padded, None
