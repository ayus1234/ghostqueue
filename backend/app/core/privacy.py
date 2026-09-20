"""Privacy compliance guardrails and ephemeral dataset handling utilities."""
import re
from typing import List
import pandas as pd

POTENTIAL_PII_PATTERNS = [
    r"ssn",
    r"social_security",
    r"credit_card",
    r"card_number",
    r"cvv",
    r"password",
    r"passcode",
    r"pin",
    r"patient_name",
    r"first_name",
    r"last_name",
    r"email_address",
]


def check_for_pii_headers(columns: List[str]) -> List[str]:
    """Inspect column headers for potential personally identifiable information (PII)."""
    warnings: List[str] = []
    for col in columns:
        cleaned = col.strip().lower()
        for pattern in POTENTIAL_PII_PATTERNS:
            if re.search(pattern, cleaned):
                warnings.append(
                    f"Column '{col}' matches potential PII pattern '{pattern}'. Ensure sensitive data is redacted before analysis."
                )
                break
    return warnings
