"""Tests for CSV and JSON ingestion layers."""
import pytest
from app.ingestion.csv_parser import parse_csv_bytes
from app.ingestion.json_parser import parse_json_bytes
from app.ingestion.parser import parse_dataset
from app.core.exceptions import (
    EmptyDatasetError,
    MalformedDatasetError,
    UnsupportedJsonStructureError,
    UnsupportedFormatError,
)


def test_parse_csv_valid():
    content = b"queue,offered,abandoned\nSupport,100,20\nSales,50,5\n"
    df = parse_csv_bytes(content)
    assert len(df) == 2
    assert list(df.columns) == ["queue", "offered", "abandoned"]
    assert df.iloc[0]["offered"] == 100


def test_parse_csv_empty():
    with pytest.raises(EmptyDatasetError):
        parse_csv_bytes(b"")

    with pytest.raises(EmptyDatasetError):
        parse_csv_bytes(b"   \n\n  ")


def test_parse_csv_encoding_latin1():
    # Content with non-ascii character
    content = "queue,offered,abandoned\nCafé_Support,50,5\n".encode("latin-1")
    df = parse_csv_bytes(content)
    assert len(df) == 1
    assert "Café_Support" in df.iloc[0]["queue"]


def test_parse_json_array_of_objects():
    content = b'[{"queue": "Tier 1", "offered": 80, "abandoned": 10}]'
    df = parse_json_bytes(content)
    assert len(df) == 1
    assert df.iloc[0]["queue"] == "Tier 1"


def test_parse_json_wrapped_data():
    content = b'{"data": [{"queue": "Billing", "offered": 60, "abandoned": 8}]}'
    df = parse_json_bytes(content)
    assert len(df) == 1
    assert df.iloc[0]["queue"] == "Billing"


def test_parse_json_empty():
    with pytest.raises(EmptyDatasetError):
        parse_json_bytes(b"")

    with pytest.raises(EmptyDatasetError):
        parse_json_bytes(b"[]")


def test_parse_json_malformed():
    with pytest.raises(MalformedDatasetError):
        parse_json_bytes(b"{not valid json")


def test_parse_json_unsupported_structure():
    with pytest.raises(UnsupportedJsonStructureError):
        parse_json_bytes(b'"just a string"')

    with pytest.raises(UnsupportedJsonStructureError):
        parse_json_bytes(b"[1, 2, 3]")


def test_unified_parser_unsupported_extension():
    with pytest.raises(UnsupportedFormatError):
        parse_dataset("image.png", b"fake binary content")
