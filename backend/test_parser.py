"""
test_parser.py — Manual smoke test for the Module 2 intent parser.

Run from the backend/ directory:
    python test_parser.py

Prints structured parse results for a range of inputs so you can
verify intent detection, category matching, and content extraction.
"""

import sys
import os
import json

sys.path.insert(0, os.path.dirname(__file__))

from parser import parse_input

DIVIDER = "─" * 62


def run(label: str, raw: str) -> None:
    result = parse_input(raw)
    print(f"\n  Input   : {raw!r}")
    print(f"  ↳ intent   : {result['intent']}")
    print(f"    category : {result['category']}")
    print(f"    content  : {result['content']}")
    print(f"    tags     : {result['tags']}")


def section(title: str) -> None:
    print(f"\n{DIVIDER}")
    print(f"  {title}")
    print(DIVIDER)


def main():
    section("ADD intents — trigger + category + content")
    run("basic add",          "new anime Blue Lock")
    run("different trigger",  "add book Atomic Habits")
    run("save food",          "save food Hyderabadi Biryani")
    run("log reminder",       "log reminder Call dentist tomorrow")
    run("watch trigger",      "watching movie Interstellar")
    run("multi-word content", "note book The Name of the Wind by Patrick Rothfuss")
    run("finished trigger",   "finished anime Attack on Titan")

    section("RETRIEVE intents — trigger + category, no content")
    run("list anime",         "list anime")
    run("show books",         "show book")
    run("find reminders",     "find reminder")
    run("get my movies",      "get my movie")

    section("UNKNOWN intents — no match or ambiguous")
    run("no trigger or cat",  "hello world")
    run("empty string",       "")
    run("trigger, no cat",    "add something")
    run("category, no trig",  "anime")

    section("EDGE CASES — capitalisation, extra whitespace, punctuation")
    run("mixed case input",   "New ANIME Blue Lock")
    run("extra whitespace",   "  new   anime   Blue   Lock  ")
    run("with punctuation",   "new anime: Blue Lock!")
    run("multi-word category","add manga Berserk")

    print(f"\n{DIVIDER}")
    print("  Done — inspect output above to verify correctness.")
    print(DIVIDER)


if __name__ == "__main__":
    main()
