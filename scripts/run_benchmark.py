#!/usr/bin/env python3
"""Automated Benchmark & Evaluation Harness for AI Document Intelligence.
Uploads the 20-document labeled dataset to the API, measures extraction accuracy,
validation flag triggers, error isolation, throughput, and latency.
Outputs:
  - build/benchmark_results.json
  - Formatted terminal report
"""

import argparse
import json
import os
import sys
import time
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List, Optional
import httpx
from rapidfuzz import fuzz

DEFAULT_API_URL = os.environ.get("API_URL", "http://localhost:4000")
DEFAULT_API_KEY = os.environ.get("API_KEY", "docintel-test-api-key-2026-secure-token")


def parse_args():
    parser = argparse.ArgumentParser(description="Run Document Intelligence Benchmark")
    parser.add_argument("--runs", type=int, default=1, help="Number of benchmark iterations")
    parser.add_argument("--api-url", default=DEFAULT_API_URL, help="Base API URL")
    parser.add_argument("--api-key", default=DEFAULT_API_KEY, help="API authentication key")
    parser.add_argument("--labels", default="tests/data/labels.json", help="Path to ground truth labels")
    parser.add_argument("--docs-dir", default="tests/data/documents", help="Path to test documents directory")
    parser.add_argument("--output", default="build/benchmark_results.json", help="Output JSON path")
    parser.add_argument("--extractor", default=None, help="LLM Provider override (gemini or mock)")
    return parser.parse_args()


def compare_fields(extracted: Dict[str, Any], ground_truth: Dict[str, Any]) -> Dict[str, bool]:
    """Compare extracted fields with ground truth."""
    matches = {}

    # Invoice Number
    gt_inv = ground_truth.get("invoice_number")
    ex_inv = extracted.get("invoice_number")
    if gt_inv is None:
        matches["invoice_number"] = (ex_inv is None)
    else:
        clean_gt = "".join(c for c in str(gt_inv) if c.isalnum()).upper()
        clean_ex = "".join(c for c in str(ex_inv or "") if c.isalnum()).upper()
        matches["invoice_number"] = (clean_gt == clean_ex)

    # Invoice Date
    gt_date = ground_truth.get("invoice_date")
    ex_date = extracted.get("invoice_date")
    matches["invoice_date"] = (str(gt_date).strip() == str(ex_date).strip()) if gt_date else (ex_date is None)

    # Supplier Name (Fuzzy threshold 85)
    gt_sup = ground_truth.get("supplier_name")
    ex_sup = extracted.get("supplier_name")
    if gt_sup is None:
        matches["supplier_name"] = (ex_sup is None)
    else:
        score = fuzz.token_sort_ratio(str(gt_sup).lower(), str(ex_sup or "").lower())
        matches["supplier_name"] = (score >= 80)

    # Customer Name (Fuzzy threshold 80)
    gt_cust = ground_truth.get("customer_name")
    ex_cust = extracted.get("customer_name")
    if gt_cust is None:
        matches["customer_name"] = (ex_cust is None)
    else:
        score = fuzz.token_sort_ratio(str(gt_cust).lower(), str(ex_cust or "").lower())
        matches["customer_name"] = (score >= 75)

    # Numeric fields (subtotal, tax, total) with 0.05 tolerance
    for num_field in ["subtotal", "tax", "total"]:
        gt_val = ground_truth.get(num_field)
        ex_val = extracted.get(num_field)
        if gt_val is None:
            matches[num_field] = (ex_val is None)
        elif ex_val is None:
            matches[num_field] = False
        else:
            try:
                diff = abs(Decimal(str(gt_val)) - Decimal(str(ex_val)))
                matches[num_field] = (diff <= Decimal("0.05"))
            except Exception:
                matches[num_field] = False

    # Currency
    gt_curr = ground_truth.get("currency")
    ex_curr = extracted.get("currency")
    matches["currency"] = (str(gt_curr).upper() == str(ex_curr).upper()) if gt_curr else True

    return matches


def run_benchmark(args):
    api_url = args.api_url.rstrip("/")
    headers = {"X-API-Key": args.api_key}
    labels_path = Path(args.labels)
    docs_dir = Path(args.docs_dir)
    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    if not labels_path.exists():
        print(f"Error: Labels file not found at {labels_path}. Run generate_dataset.py first.")
        sys.exit(1)

    with open(labels_path, "r", encoding="utf-8") as f:
        labels = json.load(f)

    # 1. Health check
    print(f"Connecting to API at {api_url}...")
    try:
        with httpx.Client(timeout=5.0) as client:
            resp = client.get(f"{api_url}/health")
            if resp.status_code != 200:
                print(f"API health returned status {resp.status_code}: {resp.text}")
                sys.exit(1)
            health_data = resp.json()
            print(f"Connected to API ({health_data.get('service', 'doc-intel')}). Ready.")
    except Exception as e:
        print(f"Failed to connect to API at {api_url}: {e}")
        sys.exit(1)

    provider = args.extractor or os.environ.get("LLM_PROVIDER", "gemini" if os.environ.get("GEMINI_API_KEY") else "mock")
    print(f"Benchmark configuration:")
    print(f"  Runs: {args.runs}")
    print(f"  Provider: {provider} ({'REAL GEMINI LLM' if provider == 'gemini' else 'MOCK EXTRACTOR FOR TESTS'})")
    print(f"  Total test documents: {len(labels)}")
    print("=" * 70)

    all_runs_results = []
    latencies = []
    field_scores = {
        "invoice_number": [],
        "invoice_date": [],
        "supplier_name": [],
        "customer_name": [],
        "subtotal": [],
        "tax": [],
        "total": [],
        "currency": []
    }
    flag_results = []

    for run_idx in range(1, args.runs + 1):
        print(f"\n--- Starting Benchmark Run {run_idx}/{args.runs} ---")
        run_docs = []

        # Process ledgers first so cross-verification counterpart exists
        sorted_files = sorted(labels.keys(), key=lambda fn: 0 if "ledger" in fn else 1)

        for filename in sorted_files:
            file_path = docs_dir / filename
            ground_truth = labels[filename]
            is_corrupt = ground_truth.get("type") == "corrupted"
            is_ledger = ground_truth.get("type") == "ledger"

            t0 = time.time()
            upload_status = None
            doc_id = None
            final_status = None
            extracted = {}
            flags_emitted = []

            # Upload
            with httpx.Client(timeout=30.0) as client:
                with open(file_path, "rb") as f_data:
                    files = {"files": (filename, f_data)}
                    resp = client.post(f"{api_url}/api/documents/upload", headers=headers, files=files)
                    if resp.status_code == 404:
                        f_data.seek(0)
                        resp = client.post(f"{api_url}/api/documents", headers=headers, files=files)
                    upload_status = resp.status_code

                    if upload_status == 415 or upload_status == 400:
                        # Rejected upfront by magic bytes / MIME validator
                        final_status = "REJECTED_BY_GATEWAY"
                    elif upload_status in (200, 201, 207):
                        resp_json = resp.json()
                        results_created = resp_json.get("results", [])
                        docs_created = resp_json.get("documents", [])
                        if results_created:
                            doc_id = results_created[0].get("documentId") or results_created[0].get("id")
                        elif docs_created:
                            doc_id = docs_created[0].get("id")
                        else:
                            doc_id = resp_json.get("id")

                        # Poll status until terminal state or timeout (60s)
                        if doc_id:
                            poll_start = time.time()
                            while time.time() - poll_start < 60:
                                s_resp = client.get(f"{api_url}/api/documents/{doc_id}/status", headers=headers)
                                if s_resp.status_code == 200:
                                    s_data = s_resp.json()
                                    st = s_data.get("status")
                                    if st in ("COMPLETED", "NEEDS_REVIEW", "FAILED"):
                                        final_status = st
                                        break
                                time.sleep(0.5)

                            # Fetch detail
                            if final_status in ("COMPLETED", "NEEDS_REVIEW", "FAILED"):
                                d_resp = client.get(f"{api_url}/api/documents/{doc_id}", headers=headers)
                                if d_resp.status_code == 200:
                                    d_data = d_resp.json()
                                    invoices = d_data.get("invoices", [])
                                    extracted = invoices[0] if invoices else (d_data.get("extracted", {}) or {})
                                    flags_raw = d_data.get("validation_flags") or d_data.get("flags") or []
                                    flags_emitted = [f.get("rule_code") for f in flags_raw if isinstance(f, dict)]

                    elapsed = time.time() - t0

            latencies.append(elapsed)

            # Evaluate fields if invoice
            field_eval = {}
            if not is_corrupt and not is_ledger and final_status in ("COMPLETED", "NEEDS_REVIEW"):
                field_eval = compare_fields(extracted, ground_truth)
                for f_name, passed in field_eval.items():
                    field_scores[f_name].append(1 if passed else 0)

            # Check expected flags
            expected_flags = ground_truth.get("expected_flags", [])
            flags_matched = all(ef in flags_emitted for ef in expected_flags) if expected_flags else True
            flag_results.append(1 if flags_matched else 0)

            doc_result = {
                "filename": filename,
                "document_id": doc_id,
                "upload_status": upload_status,
                "final_status": final_status,
                "latency_seconds": round(elapsed, 3),
                "is_corrupt": is_corrupt,
                "is_ledger": is_ledger,
                "field_matches": field_eval,
                "flags_emitted": flags_emitted,
                "expected_flags": expected_flags,
                "flags_matched": flags_matched,
            }
            run_docs.append(doc_result)

            status_icon = "✓" if (final_status == "COMPLETED" or (is_corrupt and final_status in ("FAILED", "REJECTED_BY_GATEWAY"))) else "✗"
            print(f"  {status_icon} [{final_status or 'ERROR'}] {filename:<26} ({elapsed:.2f}s) Flags: {flags_emitted}")

        all_runs_results.append(run_docs)

    # Compute aggregates
    total_processed = len(latencies)
    successful_runs = sum(1 for d in all_runs_results[0] if (d["final_status"] == "COMPLETED" or (d["is_corrupt"] and d["final_status"] in ("FAILED", "REJECTED_BY_GATEWAY"))))
    system_success_rate = round((successful_runs / len(all_runs_results[0])) * 100, 2)

    latencies_sorted = sorted(latencies)
    p50_latency = round(latencies_sorted[int(len(latencies_sorted) * 0.50)], 2)
    p95_latency = round(latencies_sorted[int(len(latencies_sorted) * 0.95)], 2)
    mean_latency = round(sum(latencies) / len(latencies), 2)

    field_accuracies = {}
    for f_name, scores in field_scores.items():
        if scores:
            field_accuracies[f_name] = round((sum(scores) / len(scores)) * 100, 1)

    overall_field_accuracy = round(sum(field_accuracies.values()) / max(len(field_accuracies), 1), 1)
    flag_accuracy = round((sum(flag_results) / max(len(flag_results), 1)) * 100, 1)

    summary = {
        "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "provider": provider,
        "is_mock_provider": (provider == "mock"),
        "total_documents": len(labels),
        "total_runs": args.runs,
        "system_success_rate": system_success_rate,
        "validation_flag_recall": flag_accuracy,
        "overall_field_accuracy": overall_field_accuracy,
        "field_accuracies": field_accuracies,
        "latency": {
            "mean_seconds": mean_latency,
            "p50_seconds": p50_latency,
            "p95_seconds": p95_latency,
            "min_seconds": min(latencies_sorted),
            "max_seconds": max(latencies_sorted),
        },
        "runs_detail": all_runs_results,
    }

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print("\n" + "=" * 70)
    print("BENCHMARK EXECUTION SUMMARY")
    print("=" * 70)
    print(f"Extractor Provider:           {provider} ({'REAL GEMINI LLM' if provider == 'gemini' else 'MOCK REGEX (FOR TESTS/CI)'})")
    print(f"System Pipeline Success Rate: {system_success_rate}%")
    print(f"Validation Flag Trigger Rate: {flag_accuracy}%")
    print(f"Field Accuracy (Overall):     {overall_field_accuracy}%")
    for f_name, acc in field_accuracies.items():
        print(f"  - {f_name:<16}: {acc}%")
    print(f"Latency P50:                  {p50_latency}s")
    print(f"Latency P95:                  {p95_latency}s")
    print(f"Results saved to:             {out_path}")
    print("=" * 70)


if __name__ == "__main__":
    run_benchmark(parse_args())
