import pytest
from unittest.mock import AsyncMock, patch
from app.contracts import IngestJobPayload, CorruptedDocumentError, CorruptedDocumentErrorCode
from app.pipeline import run_ingest

@pytest.mark.asyncio
@pytest.mark.unit
async def test_corrupted_file_produces_failed_without_raising(tmp_path):
    corrupt_file = str(tmp_path / "corrupt.pdf")
    with open(corrupt_file, "wb") as f:
        f.write(b"NOT A REAL PDF")

    payload = IngestJobPayload(
        documentId="doc-test-123",
        storedPath=corrupt_file,
        fileExt="pdf",
        originalName="corrupt.pdf"
    )

    mock_parser = lambda path: (_ for _ in ()).throw(
        CorruptedDocumentError(CorruptedDocumentErrorCode.CORRUPT_PDF, "Truncated or corrupted PDF structure")
    )

    with patch("app.pipeline.iter_pdf_pages", side_effect=mock_parser), \
         patch("app.pipeline.update_document_status", new_callable=AsyncMock) as mock_status, \
         patch("app.pipeline.update_job_progress", new_callable=AsyncMock) as mock_prog:

        # Must complete cleanly without raising exception
        await run_ingest(payload)

        # Status must have been updated to FAILED
        mock_status.assert_called()
        last_status_call = mock_status.call_args_list[-1]
        assert last_status_call.kwargs.get("status") == "FAILED"
        assert last_status_call.kwargs.get("error_code") == CorruptedDocumentErrorCode.CORRUPT_PDF.value
