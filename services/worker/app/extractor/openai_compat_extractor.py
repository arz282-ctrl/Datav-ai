"""OpenAI-compatible extractor targeting Modal-hosted GLM or any /v1/chat/completions endpoint."""

import json
import os
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field

from app.contracts import ExtractionResult, InvoiceData, LineItemData
from app.extractor.prompts import EXTRACTION_SYSTEM_PROMPT, build_extraction_prompt
from app.extractor.mock_extractor import MockExtractor


# Reuse the same schema definition as the Gemini extractor for consistency
class _SchemaLineItem(BaseModel):
    description: Optional[str] = None
    quantity: Optional[float] = None
    unit_price: Optional[float] = None
    amount: Optional[float] = None


class _SchemaInvoice(BaseModel):
    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None
    supplier_name: Optional[str] = None
    customer_name: Optional[str] = None
    subtotal: Optional[float] = None
    tax: Optional[float] = None
    total: Optional[float] = None
    currency: Optional[str] = None
    line_items: List[_SchemaLineItem] = Field(default_factory=list)
    self_confidence: Optional[float] = Field(
        default=None, description="Model self-reported confidence 0.0 to 1.0"
    )


# JSON schema for structured output (sent to compatible endpoints)
_INVOICE_JSON_SCHEMA = _SchemaInvoice.model_json_schema()


class OpenAICompatExtractor:
    """Calls any OpenAI-compatible chat/completions endpoint for structured invoice extraction.

    Configuration via environment variables:
        OPENAI_COMPAT_BASE_URL  – e.g. https://…modal.direct/v1
        OPENAI_COMPAT_MODEL     – e.g. nvidia/GLM-5.3-Flash-NVFP4
        OPENAI_COMPAT_API_KEY   – Bearer token (use "modal-no-auth" if none)
        OPENAI_COMPAT_MAX_TOKENS – max response tokens (default 2048)
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        model: Optional[str] = None,
        api_key: Optional[str] = None,
        max_tokens: int = 2048,
    ):
        self.base_url = base_url or os.environ.get(
            "OPENAI_COMPAT_BASE_URL",
            os.environ.get(
                "MODAL_GLM_BASE_URL",
                "https://rareware-space--ep-glm-5-3-flash-nvfp4-server.us-west.modal.direct/v1",
            ),
        )
        self.model = model or os.environ.get(
            "OPENAI_COMPAT_MODEL",
            os.environ.get("MODAL_GLM_MODEL", "nvidia/GLM-5.3-Flash-NVFP4"),
        )
        self.api_key = api_key or os.environ.get(
            "OPENAI_COMPAT_API_KEY",
            os.environ.get("MODAL_GLM_API_KEY", "modal-no-auth"),
        )
        self.max_tokens = int(
            os.environ.get("OPENAI_COMPAT_MAX_TOKENS", str(max_tokens))
        )
        self._client = None

    def _get_client(self):
        if self._client is None:
            from openai import AsyncOpenAI

            self._client = AsyncOpenAI(
                base_url=self.base_url,
                api_key=self.api_key,
                timeout=120.0,
            )
        return self._client

    async def _call_model(self, prompt_text: str) -> str:
        client = self._get_client()

        # Build the JSON schema instruction into the system prompt since not all
        # OpenAI-compat endpoints support response_format with json_schema.
        schema_instruction = (
            "\n\nYou MUST respond with ONLY valid JSON matching this schema:\n"
            + json.dumps(_INVOICE_JSON_SCHEMA, indent=2)
        )

        response = await client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT + schema_instruction},
                {"role": "user", "content": prompt_text},
            ],
            max_tokens=self.max_tokens,
            temperature=0.0,
            stream=False,
        )
        return response.choices[0].message.content

    async def extract(self, chunk_text: str) -> ExtractionResult:
        prompt_text = build_extraction_prompt(chunk_text)

        try:
            raw_json = await self._call_model(prompt_text)
            # Strip markdown fences if model wraps response
            cleaned = raw_json.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3]
                cleaned = cleaned.strip()
            parsed_data = _SchemaInvoice.model_validate_json(cleaned)
        except Exception as e:
            # Degrade to mock extractor on failure
            mock = MockExtractor(model_name="mock-fallback-openai-compat")
            result = await mock.extract(chunk_text)
            result.confidence["fallback_error"] = str(e)
            return result

        items = [
            LineItemData(
                description=it.description,
                quantity=it.quantity,
                unit_price=it.unit_price,
                amount=it.amount,
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
            line_items=items,
        )

        confidence_dict: Dict[str, Any] = {
            "model_self_reported_confidence": parsed_data.self_confidence,
            "extraction_source": "openai_compat",
            "model_name": self.model,
        }

        return ExtractionResult(
            invoice=invoice,
            confidence=confidence_dict,
            model=self.model,
        )
