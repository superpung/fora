#!/usr/bin/env python3
"""What counts as a person, and how to read one out of a printed cell.

Every conference publishes its programme as prose or as a picture of a table,
and every one of them writes things in the speaker column that are not people:
a role ("主持人：执行主席"), a placeholder ("京东（人员待定）"), a group
("参与者：报告嘉宾及论坛主席"), an organization ("华为公司"), or the numbering of
the list the name sits in ("1. 胡欣蔚 …"). Left alone they end up in the dataset
as people, and the app then offers you a speaker page for a bullet number.

The typography is its own problem: 李 智 广西师范大学 is one person whose given
name is spaced away from the surname, not a person called 李 who works somewhere
called "智 广西师范大学". Jean-Pierre Talpin INRIA is a person and their lab.

So the builders read every printed name through `read_person`, which returns
either a person or the reason it is not one. Nothing is guessed: a name is only
ever cleaned up (a prefix stripped, a space closed, an affiliation split off),
never invented, and what it refuses is reported so the caller can record it as a
flag rather than lose it silently.

`source/validate.py` runs the same rules over the built datasets, so a
conference added later cannot quietly reintroduce any of this.
"""
import re

__all__ = ["read_person", "person_problem", "ROLE_WORDS"]

# Roles a programme prints in front of a name, or instead of one.
ROLE_WORDS = (
    "主持人", "主持", "嘉宾", "特邀嘉宾", "讲者", "报告人", "演讲嘉宾", "汇报人",
    "参与者", "与谈人", "对话嘉宾", "点评人", "执行主席", "论坛主席", "大会主席",
    "全体嘉宾", "全体", "各位嘉宾", "报告嘉宾", "圆桌嘉宾",
    "Moderator", "Panelists", "Panelist", "Speakers", "Speaker", "Chair", "Chairs", "Host",
)
_ROLE_PREFIX = re.compile(r"^(?:%s)\s*[：:]\s*" % "|".join(map(re.escape, ROLE_WORDS)))
# A name that is only roles / groups: "参与者：报告嘉宾及论坛主席", "全体嘉宾".
_ROLE_ONLY = re.compile(r"^(?:%s)(?:\s*[、，,/及和与]\s*(?:%s))*$" % (
    "|".join(map(re.escape, ROLE_WORDS)), "|".join(map(re.escape, ROLE_WORDS))))
# Not a name yet: the programme says so itself.
_PLACEHOLDER = re.compile(
    r"待定|待公布|待确认|暂定|另行通知|虚位以待|^TBD$|^TBA$|^To be (?:announced|confirmed)$",
    re.I,
)
# An organization standing where a person is expected.
_ORG = re.compile(
    r"公司|大学|大學|学院|學院|研究所|研究院|实验室|集团|中心|基金会|社区|委员会|学会|协会|"
    r"University|Institute|Laborator|College|Academy|Foundation|Committee|Inc\.?$|Ltd\.?$|LLC$|Corp\.?$"
)
# The numbering of the list a name sits in: "1. 胡欣蔚 …", "(2) 秦彬娟".
_LIST_MARK = re.compile(r"^\s*[（(]?\d+\s*[.、）)]\s*")
# A trailing acronym is the speaker's lab, not part of their name: INRIA, CMU.
_TRAILING_ACRONYM = re.compile(r"^(.*?[a-z].*?)\s+([A-Z][A-Z&.]{1,}\.?)$")
# How many words of a Latin name to try before its institution, shortest first:
# "Shing-Chi Cheung | Hong Kong University of Science".
_LATIN_NAME_WORDS = (2, 3)

_CJK = r"一-鿿㐀-䶿"
_CJK_RUN = re.compile(rf"^([{_CJK}·•]+)\s*(.*)$")
# A CJK surname spaced away from the given name: "李 智 广西师范大学". Chinese
# given names are one or two characters, so anything longer is an affiliation.
_SPACED_NAME = re.compile(rf"^([{_CJK}]{{1,2}})\s+([{_CJK}]{{1,2}})(?:\s+(.*))?$")


def _clean(s):
    return re.sub(r"\s+", " ", (s or "").replace("\xa0", " ")).strip(" 　·,，、;；")


def person_problem(name):
    """Why `name` is not a person's NAME, or None if it reads like one.

    Takes a name that has already been separated from its affiliation — which is
    what a built dataset holds, so `validate.py` can run this over every person
    in every conference and this file stays the single place that decides what a
    person is. `read_person` does the separating first, then asks this.
    """
    n = _clean(name)
    if not n:
        return "empty"
    if _LIST_MARK.match(n) and not _clean(_LIST_MARK.sub("", n)):
        return "list numbering, not a name"
    if _PLACEHOLDER.search(n):
        return "a placeholder, not a name yet"
    stripped = _clean(_ROLE_PREFIX.sub("", n))
    if not stripped:
        return "a role with no name after it"
    if _ROLE_ONLY.match(stripped):
        return "a role or a group, not a person"
    if _ORG.search(stripped):
        return "an organization, not a person"
    if re.fullmatch(rf"[{_CJK}]", stripped):
        return "a single character, not a full name"
    if not re.search(rf"[{_CJK}A-Za-z]", stripped):
        return "no letters in it"
    return None


def read_person(name, affiliation=None, **extra):
    """`(person, problem)` for one printed name.

    Exactly one of the two is set. The person carries the cleaned name, the
    affiliation the cell printed (or the one recovered while cleaning), and
    whatever the caller passes as `extra` (bio, photo, chair_role…), with None
    values dropped. `problem` is the sentence a caller should put in `flags`.
    """
    printed = _clean(name)
    aff = _clean(affiliation) or None
    if not printed:
        return None, "empty"
    if _PLACEHOLDER.search(printed) or _PLACEHOLDER.search(aff or ""):
        return None, f"a placeholder, not a name yet: {printed!r}"

    n = _clean(_LIST_MARK.sub("", printed))
    role = None
    m = _ROLE_PREFIX.match(n)
    if m:
        role = m.group(0).rstrip("：: ").strip()
        n = _clean(n[m.end():])
    if not n:
        return None, f"a role with no name after it: {printed!r}"
    if _ROLE_ONLY.match(n):
        return None, f"a role or a group, not a person: {printed!r}"

    # ---- separate the name from what is printed next to it ----
    if re.match(rf"^[{_CJK}]", n):
        spaced = _SPACED_NAME.match(n)
        run = _CJK_RUN.match(n)
        head, rest = run.group(1), _clean(run.group(2))
        if spaced and len(head) <= 2:
            # "李 智 广西师范大学": a surname spaced away from the given name, not
            # a person called 李 who works at "智 广西师范大学".
            n = spaced.group(1) + spaced.group(2)
            rest = _clean(spaced.group(3) or "")
        else:
            n = head
        if rest:
            aff = rest if not aff else aff
    else:
        acro = _TRAILING_ACRONYM.match(n)
        if acro and not aff:
            # "Jean-Pierre Talpin INRIA": the lab is not part of the name.
            n, aff = _clean(acro.group(1)), _clean(acro.group(2))
        elif not aff and _ORG.search(n):
            # "Shing-Chi Cheung Hong Kong University of Science": a Latin name
            # running straight into a Latin institution. The name is the
            # SHORTEST leading run of capitalised words that leaves an
            # institution behind — two, then three, and no further: past that
            # the split would be doing the source's reading for it.
            words = n.split()
            for k in _LATIN_NAME_WORDS:
                if len(words) <= k:
                    break
                head, rest = " ".join(words[:k]), " ".join(words[k:])
                if all(w[:1].isupper() for w in words[:k]) and _ORG.search(rest):
                    n, aff = head, rest
                    break

    # A single character with the rest of the name spilled into the affiliation
    # column — the same typography as above, already split by the caller.
    if aff:
        short = re.fullmatch(rf"([{_CJK}]{{1,2}})\s+(.+)", aff)
        if short and re.fullmatch(rf"[{_CJK}]", n):
            n, aff = n + short.group(1), _clean(short.group(2)) or None

    problem = person_problem(n)
    if problem:
        return None, f"{problem}: {printed!r}"

    person = {"name": n}
    if aff:
        person["affiliation_raw"] = aff
    if role and "chair_role" not in extra:
        person["chair_role"] = role
    for k, v in extra.items():
        if v is not None:
            person[k] = v
    return person, None
