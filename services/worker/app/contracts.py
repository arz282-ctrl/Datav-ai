"""Shared contracts, data models, error codes, and queue interfaces for the AI Document Intelligence System.
All sub-agents and pipeline modules code against these exact interfaces.
"""

from __future__ import annotations
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, Iterator, List, Literal, Optional, Tuple, Union
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# Queue Configuration & Payloads
# ---------------------------------------------------------------------------
QUEUE_PREFIX = "docint"
QUEUE_INGEST = f"{QUEUE_PREFIX}:ingest"
QUEUE_REVALIDATE = f"{QUEUE_PREFIX}:revalidate"

class IngestJobPayload(BaseModel):
    documentId: str
    storedPath: str
    fileExt: str
    originalName: str

class RevalidateReason(str, Enum):
    MANUAL_CORRECTION = "manual_correction"
    LEDGER_ADDED = "ledger_added"
    REPROCESS = "reprocess"

class RevalidateJobPayload(BaseModel):
    documentId: str
    invoiceIds: Optional[List[str]] = None
    reason: RevalidateReason = RevalidateReason.MANUAL_CORRECTION

class RevalidateJobResult(BaseModel):
    status: str
    flagCount: int

# ---------------------------------------------------------------------------
# Error Definitions
# ---------------------------------------------------------------------------
class CorruptedDocumentErrorCode(str, Enum):
    CORRUPT_PDF = "CORRUPT_PDF"
    CORRUPT_IMAGE = "CORRUPT_IMAGE"
    CORRUPT_SPREADSHEET = "CORRUPT_SPREADSHEET"
    ENCRYPTED_FILE = "ENCRYPTED_FILE"
    EMPTY_FILE = "EMPTY_FILE"
    UNSUPPORTED_TYPE = "UNSUPPORTED_TYPE"
    OCR_FAILED = "OCR_FAILED"

class CorruptedDocumentError(Exception):
    """Raised when a document is damaged, unreadable, or structurally corrupted."""
    def __init__(self, code: CorruptedDocumentErrorCode, message: str):
        self.code = code
        self.message = message
        super().__init__(f"[{code.value}] {message}")

# ---------------------------------------------------------------------------
# Agent-1 Parser & OCR Models
# ---------------------------------------------------------------------------
class PageSource(str, Enum):
    NATIVE = "native"
    OCR = "ocr"

class OCRResult(BaseModel):
    text: str
    confidence: float # 0.0 - 100.0

class PageText(BaseModel):
    page_no: int # 1-indexed
    text: str
    source: PageSource
    ocr_confidence: Optional[float] = None # 0.0 - 100.0 if OCR

class Chunk(BaseModel):
    chunk_index: int
    page_start: int
    page_end: int
    text: str

class LedgerRowData(BaseModel):
    row_index: int
    sheet_name: str
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None # ISO format YYYY-MM-DD
    supplier_name: Optional[str] = None
    total_amount: Optional[float] = None
    currency: Optional[str] = None
    raw_row: Dict[str, Any] = Field(default_factory=dict)

# ---------------------------------------------------------------------------
# Agent-2 Extraction & Grounding Models
# ---------------------------------------------------------------------------
class LineItemData(BaseModel):
    description: Optional[str] = None
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    amount: Optional[float] = None

class InvoiceData(BaseModel):
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None # ISO format YYYY-MM-DD
    supplier_name: Optional[str] = None
    customer_name: Optional[str] = None
    subtotal: Optional[float] = None
    tax: Optional[float] = None
    total: Optional[float] = None
    currency: Optional[str] = None
    line_items: List[LineItemData] = Field(default_factory=list)

class ExtractionResult(BaseModel):
    invoice: InvoiceData
    confidence: Dict[str, Any] = Field(default_factory=dict)
    model: str

# ---------------------------------------------------------------------------
# Agent-3 Validation & Flags Models
# ---------------------------------------------------------------------------
class RuleCode(str, Enum):
    MISSING_FIELD = "MISSING_FIELD"
    UNGROUNDED_VALUE = "UNGROUNDED_VALUE"
    MATH_MISMATCH = "MATH_MISMATCH"
    DUPLICATE_INVOICE = "DUPLICATE_INVOICE"
    CROSS_VERIFY_MISMATCH = "CROSS_VERIFY_MISMATCH"

class Severity(str, Enum):
    ERROR = "ERROR"
    WARNING = "WARNING"
    INFO = "INFO"

class Flag(BaseModel):
    rule_code: RuleCode
    severity: Severity
    field_name: Optional[str] = None
    message: str

class CrossVerifyStatus(str, Enum):
    MATCHED = "MATCHED"
    TOTAL_MISMATCH = "TOTAL_MISMATCH"
    DATE_MISMATCH = "DATE_MISMATCH"
    CURRENCY_MISMATCH = "CURRENCY_MISMATCH"
    MULTIPLE_MISMATCH = "MULTIPLE_MISMATCH"

class CrossVerifyLink(BaseModel):
    source_invoice_id: str
    target_type: Literal["LEDGER_ROW", "EXTRACTED_INVOICE"]
    target_id: str
    match_status: CrossVerifyStatus
    diff_details: Dict[str, Any] = Field(default_factory=dict)
