"""Semantic chunk segmentation for multi-page documents and invoice batches."""

import re
from typing import Iterable, Iterator, List, Optional
from app.contracts import PageText, Chunk

# Invoice identification regex patterns
INVOICE_HEADER_PATTERNS = [
    re.compile(r"\bINVOICE\b", re.IGNORECASE),
    re.compile(r"\bTAX\s+INVOICE\b", re.IGNORECASE),
    re.compile(r"\bBILL\s+TO\b", re.IGNORECASE),
    re.compile(r"\bFAKTURA\b", re.IGNORECASE),
    re.compile(r"\bFACTURA\b", re.IGNORECASE),
]

INVOICE_NUMBER_PATTERNS = [
    re.compile(r"(?:invoice|inv|bill)\s*(?:no|number|num|#)?\s*[:#]\s*([A-Z0-9_-]{3,30})", re.IGNORECASE),
    re.compile(r"(?:invoice|inv|bill)\s+(?:no|number|num|#)\s*[:.\s]+([A-Z0-9_-]{3,30})", re.IGNORECASE),
    re.compile(r"#\s*([A-Z0-9_-]{4,30})\b", re.IGNORECASE),
]

PAGE_OF_PAGES_PATTERN = re.compile(
    r"(?:page|pg\.?)\s*(\d+)\s*(?:of|\/)\s*(\d+)", re.IGNORECASE
)

MAX_PAGES_PER_CHUNK = 20
MAX_CHARS_PER_CHUNK = 60000

def _detect_invoice_number(text: str) -> Optional[str]:
    for pat in INVOICE_NUMBER_PATTERNS:
        for m in pat.finditer(text):
            candidate = m.group(1).strip()
            # Exclude false positives
            if not re.match(r"^(?:date|due|terms|total|tax|invoice|number|bill)$", candidate, re.IGNORECASE):
                return candidate.upper()
    return None

def _is_continuation_page(text: str) -> bool:
    m = PAGE_OF_PAGES_PATTERN.search(text)
    if m:
        current_page = int(m.group(1))
        if current_page > 1:
            return True
    return False

def _has_invoice_header(text: str) -> bool:
    for pat in INVOICE_HEADER_PATTERNS:
        if pat.search(text):
            return True
    return False

def segment_pages(pages: Iterable[PageText]) -> Iterator[Chunk]:
    """Segments an iterable stream of PageText objects into semantic Chunks."""
    chunk_index = 0
    current_pages: List[PageText] = []
    current_invoice_num: Optional[str] = None
    current_chars = 0

    for page in pages:
        p_text = page.text
        p_chars = len(p_text)
        has_header = _has_invoice_header(p_text)
        detected_inv = _detect_invoice_number(p_text)
        is_cont = _is_continuation_page(p_text)

        should_split = False

        if current_pages:
            # 1. Hard caps reached
            if len(current_pages) >= MAX_PAGES_PER_CHUNK or (current_chars + p_chars) >= MAX_CHARS_PER_CHUNK:
                should_split = True
            # 2. Distinct new invoice detected and NOT explicitly a continuation page
            elif has_header and not is_cont:
                if detected_inv and current_invoice_num and detected_inv != current_invoice_num:
                    should_split = True

        if should_split and current_pages:
            combined_text = "\n\n--- Page Break ---\n\n".join(p.text for p in current_pages)
            yield Chunk(
                chunk_index=chunk_index,
                page_start=current_pages[0].page_no,
                page_end=current_pages[-1].page_no,
                text=combined_text
            )
            chunk_index += 1
            current_pages = []
            current_chars = 0
            current_invoice_num = None

        current_pages.append(page)
        current_chars += p_chars
        if detected_inv and not current_invoice_num:
            current_invoice_num = detected_inv

    if current_pages:
        combined_text = "\n\n--- Page Break ---\n\n".join(p.text for p in current_pages)
        yield Chunk(
            chunk_index=chunk_index,
            page_start=current_pages[0].page_no,
            page_end=current_pages[-1].page_no,
            text=combined_text
        )
