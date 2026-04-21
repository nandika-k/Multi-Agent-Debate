import json
import sqlite3
from contextlib import contextmanager
from typing import Iterator

from app.core.settings import settings
from app.models.common import DebateSide
from app.models.debate import DebateDetailResponse, DebateRecord, DebateSummary
from app.models.event import DebateEvent
from app.models.source import EvidencePacket, SourceCard
from app.models.transcript import TranscriptEntry


class DebateRepository:
    def __init__(self) -> None:
        settings.data_dir.mkdir(parents=True, exist_ok=True)
        self.db_path = settings.db_path

    @contextmanager
    def connection(self) -> Iterator[sqlite3.Connection]:
        connection = sqlite3.connect(self.db_path)
        connection.row_factory = sqlite3.Row
        try:
            yield connection
            connection.commit()
        finally:
            connection.close()

    def initialize(self) -> None:
        with self.connection() as conn:
            conn.executescript(
                """
                CREATE TABLE IF NOT EXISTS debates (
                    debate_id TEXT PRIMARY KEY,
                    payload TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS evidence_packets (
                    packet_id TEXT PRIMARY KEY,
                    debate_id TEXT NOT NULL,
                    side TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    UNIQUE(debate_id, side)
                );

                CREATE TABLE IF NOT EXISTS sources (
                    source_row_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    debate_id TEXT NOT NULL,
                    side TEXT NOT NULL,
                    source_id TEXT NOT NULL,
                    payload TEXT NOT NULL,
                    UNIQUE(debate_id, side, source_id)
                );

                CREATE TABLE IF NOT EXISTS evidence_packet_sources (
                    packet_source_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    debate_id TEXT NOT NULL,
                    packet_id TEXT NOT NULL,
                    source_id TEXT NOT NULL,
                    UNIQUE(debate_id, packet_id, source_id)
                );

                CREATE TABLE IF NOT EXISTS transcript_entries (
                    entry_id TEXT PRIMARY KEY,
                    debate_id TEXT NOT NULL,
                    round_type TEXT NOT NULL,
                    side TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    payload TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS debate_events (
                    event_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    debate_id TEXT NOT NULL,
                    event_type TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    payload TEXT NOT NULL
                );
                """
            )

    def save_debate(self, debate: DebateRecord) -> DebateSummary:
        with self.connection() as conn:
            conn.execute(
                """
                INSERT INTO debates (debate_id, payload)
                VALUES (?, ?)
                ON CONFLICT(debate_id) DO UPDATE SET payload = excluded.payload
                """,
                (debate.debate_id, debate.model_dump_json()),
            )
        return DebateSummary.model_validate(debate.model_dump())

    def get_debate(self, debate_id: str) -> DebateRecord | None:
        with self.connection() as conn:
            row = conn.execute("SELECT payload FROM debates WHERE debate_id = ?", (debate_id,)).fetchone()
        if row is None:
            return None
        return DebateRecord.model_validate_json(row["payload"])

    def save_packet(self, debate_id: str, packet: EvidencePacket) -> None:
        with self.connection() as conn:
            conn.execute(
                """
                INSERT INTO evidence_packets (packet_id, debate_id, side, payload)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(debate_id, side) DO UPDATE SET
                    packet_id = excluded.packet_id,
                    payload = excluded.payload
                """,
                (packet.packet_id, debate_id, packet.side.value, packet.model_dump_json()),
            )

    def replace_shared_sources(self, debate_id: str, sources: list[SourceCard]) -> None:
        with self.connection() as conn:
            conn.execute("DELETE FROM sources WHERE debate_id = ? AND side = 'shared'", (debate_id,))
            for source in sources:
                conn.execute(
                    """
                    INSERT INTO sources (source_id, debate_id, side, payload)
                    VALUES (?, ?, 'shared', ?)
                    ON CONFLICT(debate_id, side, source_id) DO UPDATE SET payload = excluded.payload
                    """,
                    (source.source_id, debate_id, source.model_dump_json()),
                )

    def replace_packet_source_links(self, debate_id: str, packet_id: str, source_ids: list[str]) -> None:
        with self.connection() as conn:
            conn.execute(
                "DELETE FROM evidence_packet_sources WHERE debate_id = ? AND packet_id = ?",
                (debate_id, packet_id),
            )
            for source_id in source_ids:
                conn.execute(
                    """
                    INSERT INTO evidence_packet_sources (debate_id, packet_id, source_id)
                    VALUES (?, ?, ?)
                    ON CONFLICT(debate_id, packet_id, source_id) DO NOTHING
                    """,
                    (debate_id, packet_id, source_id),
                )

    def append_transcript_entry(self, debate_id: str, entry: TranscriptEntry) -> None:
        with self.connection() as conn:
            conn.execute(
                """
                INSERT INTO transcript_entries (entry_id, debate_id, round_type, side, created_at, payload)
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    entry.entry_id,
                    debate_id,
                    entry.round_type.value,
                    entry.side.value,
                    entry.created_at.isoformat(),
                    entry.model_dump_json(),
                ),
            )

    def append_event(self, event: DebateEvent) -> DebateEvent:
        with self.connection() as conn:
            cursor = conn.execute(
                """
                INSERT INTO debate_events (debate_id, event_type, created_at, payload)
                VALUES (?, ?, ?, ?)
                """,
                (
                    event.debate_id,
                    event.event_type.value,
                    event.created_at.isoformat(),
                    event.model_dump_json(exclude={"event_id"}),
                ),
            )
            event_id = int(cursor.lastrowid)
        return event.model_copy(update={"event_id": event_id})

    def get_packets(self, debate_id: str) -> list[EvidencePacket]:
        with self.connection() as conn:
            rows = conn.execute(
                "SELECT payload FROM evidence_packets WHERE debate_id = ? ORDER BY side",
                (debate_id,),
            ).fetchall()
        return [EvidencePacket.model_validate_json(row["payload"]) for row in rows]

    def get_sources(self, debate_id: str) -> list[SourceCard]:
        with self.connection() as conn:
            rows = conn.execute(
                "SELECT payload FROM sources WHERE debate_id = ? AND side = 'shared' ORDER BY source_id",
                (debate_id,),
            ).fetchall()
        return [SourceCard.model_validate_json(row["payload"]) for row in rows]

    def get_source(self, debate_id: str, source_id: str) -> SourceCard | None:
        with self.connection() as conn:
            row = conn.execute(
                """
                SELECT payload
                FROM sources
                WHERE debate_id = ? AND side = 'shared' AND source_id = ?
                LIMIT 1
                """,
                (debate_id, source_id),
            ).fetchone()
        if row is None:
            return None
        return SourceCard.model_validate_json(row["payload"])

    def get_source_sides(self, debate_id: str, source_id: str) -> list[DebateSide]:
        with self.connection() as conn:
            rows = conn.execute(
                """
                SELECT packets.side
                FROM evidence_packet_sources AS links
                JOIN evidence_packets AS packets
                  ON links.packet_id = packets.packet_id AND links.debate_id = packets.debate_id
                WHERE links.debate_id = ? AND links.source_id = ?
                ORDER BY packets.side
                """,
                (debate_id, source_id),
            ).fetchall()
        return [DebateSide(row["side"]) for row in rows]

    def get_transcript(self, debate_id: str) -> list[TranscriptEntry]:
        with self.connection() as conn:
            rows = conn.execute(
                "SELECT payload FROM transcript_entries WHERE debate_id = ? ORDER BY created_at, entry_id",
                (debate_id,),
            ).fetchall()
        return [TranscriptEntry.model_validate_json(row["payload"]) for row in rows]

    def get_events(self, debate_id: str) -> list[DebateEvent]:
        with self.connection() as conn:
            rows = conn.execute(
                "SELECT event_id, payload FROM debate_events WHERE debate_id = ? ORDER BY event_id",
                (debate_id,),
            ).fetchall()
        return [
            DebateEvent.model_validate_json(row["payload"]).model_copy(update={"event_id": row["event_id"]})
            for row in rows
        ]

    def get_debate_detail(self, debate_id: str) -> DebateDetailResponse | None:
        debate = self.get_debate(debate_id)
        if debate is None:
            return None
        return DebateDetailResponse(
            debate=DebateSummary.model_validate(debate.model_dump()),
            scope=debate.scope,
            packets=self.get_packets(debate_id),
            transcript=self.get_transcript(debate_id),
            sources=self.get_sources(debate_id),
            events=self.get_events(debate_id),
        )
