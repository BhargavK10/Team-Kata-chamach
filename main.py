import argparse
import json
import sys
from typing import Optional

from models import RiskAnalysisInput
from engine import RiskAnalysisEngine


def process_single(
    engine: RiskAnalysisEngine,
    company: str,
    source: str,
    date: str,
    raw_text: str,
    indent: Optional[int] = 2,
) -> str:
    """Analyze a single corporate risk data point and return raw JSON."""
    item = RiskAnalysisInput(
        company_name=company,
        source_type=source,
        date=date,
        raw_text=raw_text,
    )
    result = engine.analyze(item)
    return result.model_dump_json(indent=indent)


def process_file(
    engine: RiskAnalysisEngine,
    input_file_path: str,
    output_file_path: Optional[str] = None,
):
    """Process a stream of inputs from a JSON or JSONL file."""
    results = []
    with open(input_file_path, "r", encoding="utf-8") as f:
        # Check if full JSON array or JSONL
        first_char = f.read(1)
        f.seek(0)
        if first_char == "[":
            data = json.load(f)
            items = [RiskAnalysisInput(**d) for d in data]
        else:
            items = []
            for line in f:
                line = line.strip()
                if line:
                    data = json.loads(line)
                    # Support both schema keys
                    comp = data.get("company_name") or data.get("company") or data.get("target_company")
                    src = data.get("source_type") or data.get("source")
                    dt = data.get("date") or data.get("timestamp") or "N/A"
                    txt = data.get("raw_text") or data.get("raw_content") or data.get("text")
                    items.append(
                        RiskAnalysisInput(
                            company_name=comp,
                            source_type=src,
                            date=dt,
                            raw_text=txt,
                        )
                    )

    for item in items:
        res = engine.analyze(item)
        results.append(res.model_dump())

    output_json = json.dumps(results, indent=2)
    if output_file_path:
        with open(output_file_path, "w", encoding="utf-8") as f:
            f.write(output_json)
        print(f"Processed {len(results)} items written to {output_file_path}", file=sys.stderr)
    else:
        print(output_json)


def main():
    parser = argparse.ArgumentParser(
        description="Automated Corporate Risk Analysis Engine",
        formatter_class=argparse.ArgumentDefaultsHelpFormatter,
    )
    parser.add_argument("--company", help="Target company name (e.g., 'Apple Inc.', 'Tesla')")
    parser.add_argument("--source", default="Public Feed", help="Data source type (e.g., 'SEC Filing', 'Reuters')")
    parser.add_argument("--date", default="2026-10-11", help="Timestamp of the data")
    parser.add_argument("--text", help="Raw content text to analyze")

    parser.add_argument("--file", help="Path to input JSON/JSONL stream file to batch process")
    parser.add_argument("--output", help="Path to write output JSON results")

    parser.add_argument(
        "--provider",
        choices=["auto", "gemini", "openai", "heuristic"],
        default="auto",
        help="LLM provider or rule-based heuristic fallback",
    )
    parser.add_argument("--model", help="Override default model name")
    parser.add_argument("--compact", action="store_true", help="Print single-line compact JSON without indentation")

    args = parser.parse_args()

    engine = RiskAnalysisEngine(provider=args.provider, model=args.model)

    indent = None if args.compact else 2

    # File batch processing mode
    if args.file:
        process_file(engine, args.file, args.output)
        return

    # Single text mode via command line
    if args.company and args.text:
        json_output = process_single(
            engine=engine,
            company=args.company,
            source=args.source,
            date=args.date,
            raw_text=args.text,
            indent=indent,
        )
        # Rule 5: Output strictly in exact JSON schema without markdown or conversational preamble
        print(json_output)
        return

    # Stdin stream processing mode
    if not sys.stdin.isatty():
        for line in sys.stdin:
            line = line.strip()
            if not line:
                continue
            record = json.loads(line)
            comp = record.get("company_name") or record.get("company")
            src = record.get("source_type") or record.get("source") or "Public Stream"
            dt = record.get("date") or record.get("timestamp") or "N/A"
            txt = record.get("raw_text") or record.get("text")
            if comp and txt:
                print(process_single(engine, comp, src, dt, txt, indent=indent))
        return

    # If no arguments provided, show brief help or default demo
    parser.print_help(sys.stderr)


if __name__ == "__main__":
    main()
