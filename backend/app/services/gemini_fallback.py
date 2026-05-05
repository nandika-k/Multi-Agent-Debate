import json

from google import genai


def build_gemini_client(api_key: str) -> genai.Client:
    return genai.Client(api_key=api_key)


def extract_json_payload(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        lines = cleaned.splitlines()
        if lines and lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        cleaned = "\n".join(lines).strip()

    try:
        json.loads(cleaned)
        return cleaned
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise ValueError("Gemini response did not contain a JSON object") from None
        candidate = cleaned[start : end + 1]
        json.loads(candidate)
        return candidate
