from __future__ import annotations

import json
import os
import re

from app.models.common import DebateSide

try:
    import google.auth.credentials
    from google.cloud import texttospeech
    from google.oauth2 import service_account
except (ModuleNotFoundError, ImportError):  # pragma: no cover - depends on optional install
    texttospeech = None
    service_account = None

_CITATION_RE = re.compile(r"\[S\d+\]")

_VOICE_MAP = {
    DebateSide.PRO: "en-US-Neural2-D",
    DebateSide.CON: "en-US-Neural2-F",
}


class TTSService:
    def __init__(self) -> None:
        self._client: texttospeech.TextToSpeechClient | None = None
        self._cache: dict[str, bytes] = {}

    def synthesize(self, entry_id: str, text: str, side: DebateSide) -> bytes:
        if entry_id in self._cache:
            return self._cache[entry_id]

        clean = _CITATION_RE.sub("", text).strip()
        client = self._get_client()

        response = client.synthesize_speech(
            input=texttospeech.SynthesisInput(text=clean),
            voice=texttospeech.VoiceSelectionParams(
                language_code="en-US",
                name=_VOICE_MAP[side],
            ),
            audio_config=texttospeech.AudioConfig(
                audio_encoding=texttospeech.AudioEncoding.MP3,
            ),
        )
        self._cache[entry_id] = response.audio_content
        return response.audio_content

    def _get_client(self) -> texttospeech.TextToSpeechClient:
        if texttospeech is None:
            raise RuntimeError(
                "google-cloud-texttospeech package is not importable in the current environment; "
                "ensure the server is started from the project venv"
            )
        if self._client is None:
            try:
                creds_json = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS_JSON")
                if creds_json:
                    info = json.loads(creds_json)
                    creds = service_account.Credentials.from_service_account_info(
                        info,
                        scopes=["https://www.googleapis.com/auth/cloud-platform"],
                    )
                    self._client = texttospeech.TextToSpeechClient(credentials=creds)
                else:
                    self._client = texttospeech.TextToSpeechClient()
            except Exception as exc:
                raise RuntimeError(
                    f"Google Cloud TTS client failed to initialise: {exc}"
                ) from exc
        return self._client
