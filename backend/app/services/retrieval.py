from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Iterable
from urllib.parse import urlparse

import httpx
from bs4 import BeautifulSoup
from ddgs import DDGS

from app.models.common import SourceType


@dataclass
class RetrievedDocument:
    url: str
    title: str
    publisher: str
    source_type: SourceType
    published_at: datetime | None
    summary: str
    snippets: list[str]
    body_excerpt: str | None
    trust_score: float
    relevance_score: float
    recency_score: float

    @property
    def weighted_score(self) -> float:
        type_bonus = {
            SourceType.PRIMARY: 0.1,
            SourceType.RESEARCH: 0.08,
            SourceType.DATA: 0.08,
            SourceType.NEWS: 0.05,
            SourceType.ANALYSIS: 0.04,
        }[self.source_type]
        snippet_quality = min(0.1, 0.03 * len(self.snippets))
        return round(
            (0.45 * self.trust_score)
            + (0.25 * self.relevance_score)
            + (0.15 * self.recency_score)
            + type_bonus
            + snippet_quality,
            4,
        )


class RetrievalService:
    def __init__(self, trusted_domains: tuple[str, ...], results_per_query: int, timeout_seconds: float, connect_timeout_seconds: float) -> None:
        self.trusted_domains = trusted_domains
        self.results_per_query = results_per_query
        self.client = httpx.Client(
            follow_redirects=True,
            timeout=httpx.Timeout(timeout_seconds, connect=connect_timeout_seconds),
            headers={
                "User-Agent": (
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36"
                )
            },
        )

    def search_documents(self, resolution: str, target_max: int) -> list[RetrievedDocument]:
        broad_results = self._search_queries(self._broad_queries(resolution), resolution, trusted_only=False)
        trusted_results: list[RetrievedDocument] = []
        if len(broad_results) < target_max:
            trusted_results = self._search_queries(self._trusted_queries(resolution), resolution, trusted_only=True)

        combined = self._dedupe_documents([*broad_results, *trusted_results])
        relevant = [d for d in combined if d.relevance_score >= self._MIN_RELEVANCE]
        ranked = sorted(relevant, key=lambda document: document.weighted_score, reverse=True)
        return ranked[:target_max]

    def _search_queries(self, queries: Iterable[str], resolution: str, trusted_only: bool) -> list[RetrievedDocument]:
        documents: list[RetrievedDocument] = []
        seen_urls: set[str] = set()

        with DDGS() as ddgs:
            for query in queries:
                try:
                    results = ddgs.text(query, max_results=self.results_per_query)
                except Exception:
                    continue

                for result in results:
                    url = result.get("href") or result.get("url")
                    if not url or url in seen_urls:
                        continue
                    if trusted_only and not self._is_trusted(url):
                        continue

                    document = self._fetch_document(
                        url=url,
                        resolution=resolution,
                        fallback_title=result.get("title") or "Untitled source",
                        fallback_summary=result.get("body") or "",
                    )
                    if document is None:
                        continue

                    seen_urls.add(url)
                    documents.append(document)
        return documents

    def _fetch_document(self, url: str, resolution: str, fallback_title: str, fallback_summary: str) -> RetrievedDocument | None:
        soup: BeautifulSoup | None = None
        try:
            response = self.client.get(url)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, "html.parser")
        except Exception:
            pass

        if soup is not None:
            title = self._extract_title(soup) or fallback_title
            summary = self._extract_summary(soup) or fallback_summary.strip()
            body_excerpt = self._extract_body_excerpt(soup)
            published_at = self._extract_date(soup)
        else:
            title = fallback_title
            summary = fallback_summary.strip()
            body_excerpt = None
            published_at = None

        snippets = self._build_snippets(body_excerpt, summary)
        if not snippets and not summary:
            return None

        relevance_score = self._score_relevance(resolution, title, summary, body_excerpt)
        recency_score = self._score_recency(published_at)

        return RetrievedDocument(
            url=url,
            title=title,
            publisher=self._infer_publisher(url),
            source_type=self._infer_source_type(url),
            published_at=published_at,
            summary=summary or snippets[0],
            snippets=snippets,
            body_excerpt=body_excerpt,
            trust_score=self._score_trust(url),
            relevance_score=relevance_score,
            recency_score=recency_score,
        )

    _QUERY_STOPWORDS: frozenset[str] = frozenset({
        "resolved", "that", "the", "a", "an", "is", "are", "be", "been",
        "should", "would", "will", "more", "than", "to", "of", "in", "on",
        "and", "or", "not", "no", "its", "their", "our", "this", "these",
        "does", "do", "has", "have", "had", "was", "were", "for", "with",
        "from", "which", "when", "where", "what", "how", "why", "who",
        "public", "society", "overall", "general", "today", "modern",
    })

    _MIN_RELEVANCE: float = 0.25

    def _core_keywords(self, resolution: str) -> str:
        trimmed = resolution.replace("Resolved:", "").strip()
        tokens = [w.strip(".,;:!?\"'()[]{}") for w in trimmed.split()]
        keywords = [t for t in tokens if t.lower() not in self._QUERY_STOPWORDS and len(t) > 3]
        return " ".join(keywords[:7])

    def _trusted_queries(self, resolution: str) -> list[str]:
        keywords = self._core_keywords(resolution)
        publishers = " OR ".join(
            domain.split(".")[0]
            for domain in self.trusted_domains[:6]
            if "." in domain
        )
        return [
            f"{keywords} ({publishers})",
            f"{keywords} report study evidence",
        ]

    def _broad_queries(self, resolution: str) -> list[str]:
        trimmed = resolution.replace("Resolved:", "").strip()
        keywords = self._core_keywords(resolution)
        return [
            f"{keywords} research evidence",
            f"{keywords} study",
            f"{trimmed} debate",
        ]

    def _dedupe_documents(self, documents: list[RetrievedDocument]) -> list[RetrievedDocument]:
        deduped: list[RetrievedDocument] = []
        seen_keys: set[str] = set()
        for document in documents:
            normalized_url = document.url.rstrip("/")
            fingerprint = f"{document.title.strip().lower()}|{document.summary.strip().lower()[:140]}"
            key = f"{normalized_url}|{fingerprint}"
            if key in seen_keys:
                continue
            seen_keys.add(key)
            deduped.append(document)
        return deduped

    def _extract_title(self, soup: BeautifulSoup) -> str | None:
        if soup.title and soup.title.string:
            return soup.title.string.strip()
        og_title = soup.find("meta", attrs={"property": "og:title"})
        if og_title and og_title.get("content"):
            return og_title["content"].strip()
        return None

    def _extract_summary(self, soup: BeautifulSoup) -> str | None:
        candidates = [
            soup.find("meta", attrs={"name": "description"}),
            soup.find("meta", attrs={"property": "og:description"}),
        ]
        for candidate in candidates:
            if candidate and candidate.get("content"):
                return candidate["content"].strip()
        return None

    def _extract_body_excerpt(self, soup: BeautifulSoup) -> str | None:
        for tag in soup(["script", "style", "noscript"]):
            tag.decompose()
        article = soup.find("article") or soup.find("main") or soup.body
        if article is None:
            return None
        paragraphs = [paragraph.get_text(" ", strip=True) for paragraph in article.find_all("p")[:6]]
        text = " ".join(part for part in paragraphs if part)
        text = " ".join(text.split())
        return text[:1200] if text else None

    def _build_snippets(self, body_excerpt: str | None, summary: str) -> list[str]:
        snippets: list[str] = []
        if summary:
            snippets.append(summary[:280])
        if body_excerpt:
            chunks = [body_excerpt[i : i + 280] for i in range(0, min(len(body_excerpt), 560), 280)]
            snippets.extend(chunks[:2])
        return snippets[:3]

    def _extract_date(self, soup: BeautifulSoup) -> datetime | None:
        date_candidates = [
            soup.find("meta", attrs={"property": "article:published_time"}),
            soup.find("meta", attrs={"name": "parsely-pub-date"}),
            soup.find("time"),
        ]
        for candidate in date_candidates:
            if candidate is None:
                continue
            value = candidate.get("content") or candidate.get("datetime") or candidate.text
            if not value:
                continue
            try:
                return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(UTC)
            except ValueError:
                continue
        return None

    def _infer_publisher(self, url: str) -> str:
        return urlparse(url).netloc.replace("www.", "")

    def _infer_source_type(self, url: str) -> SourceType:
        hostname = urlparse(url).netloc.lower()
        if hostname.endswith(".gov") or ".gov." in hostname:
            return SourceType.PRIMARY
        if hostname.endswith(".edu") or ".edu." in hostname:
            return SourceType.RESEARCH
        if any(token in hostname for token in ("who.int", "oecd.org", "worldbank.org", "imf.org")):
            return SourceType.DATA
        return SourceType.NEWS

    def _score_trust(self, url: str) -> float:
        return 0.95 if self._is_trusted(url) else 0.65

    def _score_relevance(self, resolution: str, title: str, summary: str, body_excerpt: str | None) -> float:
        tokens = {token.strip(".,:;!?()[]{}\"'").lower() for token in resolution.split() if len(token) > 3}
        haystack = " ".join(part for part in (title, summary, body_excerpt or "") if part).lower()
        if not tokens:
            return 0.5
        hits = sum(1 for token in tokens if token in haystack)
        return round(min(1.0, hits / max(3, len(tokens) * 0.6)), 4)

    def _score_recency(self, published_at: datetime | None) -> float:
        if published_at is None:
            return 0.45
        age_days = max(0, (datetime.now(UTC) - published_at).days)
        if age_days <= 30:
            return 1.0
        if age_days <= 180:
            return 0.8
        if age_days <= 365:
            return 0.6
        return 0.4

    def _is_trusted(self, url: str) -> bool:
        hostname = urlparse(url).netloc.lower()
        return any(hostname.endswith(domain) or f".{domain}" in hostname for domain in self.trusted_domains)
