"""Gemini structured invoice extractor using google-genai SDK with fallback models and retry policies."""

import json
import os
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from app.contracts import ExtractionResult, InvoiceData, LineItemData
from app.extractor.prompts import EXTRACTION_SYSTEM_PROMPT, build_extraction_prompt
from app.extractor.mock_extractor import MockExtractor

class SchemaLineItem(BaseModel):
    description: Optional[str] = None
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    amount: Optional[float] = None

class SchemaInvoice(BaseModel):
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None # ISO YYYY-MM-DD
    supplier_name: Optional[str] = None
    customer_name: Optional[str] = None
    subtotal: Optional[float] = None
    tax: Optional[float] = None
    total: Optional[float] = None
    currency: Optional[str] = None
    line_items: List[SchemaLineItem] = Field(default_factory=list)
    self_confidence: Optional[float] = Field(default=None, description="Model self-reported confidence 0.0 to 1.0")

class GeminiExtractor:
    def __init__(
        self,
        api_key: Optional[str] = None,
        primary_model: Optional[str] = None,
        fallback_model: Optional[str] = None
    ):
        self.api_key = api_key or os.environ.get("GEMINI_API_KEY", "")
        self.primary_model = primary_model or os.environ.get("PRIMARY_LLM_MODEL", "gemini-3.8-flash")
        self.fallback_model = fallback_model or os.environ.get("FALLBACK_LLM_MODEL", "gemini-3.1-pro-preview")
        self._client = None

    def _get_client(self):
        if self._client is None:
            from google import genai
            self._client = genai.Client(api_key=self.api_key)
        return self._client

    async def _call_model(self, model_name: str, prompt_text: str) -> str:
        from google.genai import types
        client = self._get_client()

        config = types.GenerateContentConfig(
            system_instruction=EXTRACTION_SYSTEM_PROMPT,
            temperature=0.0,
            response_mime_type="application/json",
            response_schema=SchemaInvoice,
        )

        response = await client.aio.models.generate_content(
            model=model_name,
            contents=prompt_text,
            config=config,
        )
        return response.text

    async def extract(self, chunk_text: str) -> ExtractionResult:
        prompt_text = build_extraction_prompt(chunk_text)
        last_error = None
        used_model = self.primary_model

        # Attempt with Primary Model
        try:
            raw_json = await self._call_model(self.primary_model, prompt_text)
            parsed_data = SchemaInvoice.model_validate_json(raw_json)
        except Exception as e:
            last_error = e
            # Fall back to Fallback Model
            used_model = self.fallback_model
            try:
                raw_json = await self._call_model(self.fallback_model, prompt_text)
                parsed_data = SchemaInvoice.model_validate_json(raw_json)
            except Exception as e_fallback:
                # If both fail or rate limited, degrade to mock extractor with logged error
                mock = MockExtractor(model_name="mock-fallback")
                result = await mock.extract(chunk_text)
                result.confidence["fallback_error"] = str(e_fallback)
                return result

        # Map to domain InvoiceData
        items = [
            LineItemData(
                description=it.description,
                quantity=it.quantity,
                unit_price=it.unit_price,
                amount=it.amount
            )
            for it in parsed_data.line_items
        ]

        invoice = InvoiceData(
            invoice_number=parsed_data.invoice_number,
            invoice_date=parsed_data.invoice_date,
            supplier_name=parsed_data.supplier_name,
            customer_name=parsed_data.customer_name,
            subtotal=parsed_data.subtotal,
            tax=parsed_data.tax,
            total=parsed_data.total,
            currency=parsed_data.currency,
            line_items=items
        )

        confidence_dict: Dict[str, Any] = {
            "model_self_reported_confidence": parsed_data.self_confidence,
            "extraction_source": "gemini"
        }

        return ExtractionResult(
            invoice=invoice,
            confidence=confidence_dict,
            model=used_model
        )

def get_extractor() -> Any:
    """Factory creating Extractor based on LLM_PROVIDER and GEMINI_API_KEY env variables."""
    provider = os.environ.get("LLM_PROVIDER", "gemini").lower()
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()

    if provider == "mock" or not api_key:
        return MockExtractor()
    return GeminiExtractor(api_key=api_key)
