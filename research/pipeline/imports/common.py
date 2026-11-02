import csv
import math
import re
from pathlib import Path


def code(value, width):
    if not re.fullmatch(r"[0-9]{%d}" % width, value):
        raise ValueError(f"Ongeldige classificatiecode: {value!r}")
    return value


def year(value):
    result = int(value)
    if not 1900 <= result <= 2100:
        raise ValueError("Ongeldig jaar")
    return result


def count(value):
    value = value.strip()
    if value in ("", "<5", "<10", "-", ".", "..", "NA"):
        return None
    result = float(value.replace(",", "."))
    if not math.isfinite(result) or result < 0:
        raise ValueError("Ongeldig aantal")
    return result


def rows(path):
    with Path(path).open(encoding="utf-8-sig", newline="") as stream:
        yield from csv.DictReader(stream, delimiter=";")
