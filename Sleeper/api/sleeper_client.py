"""Async client for the Sleeper fantasy football API."""

import httpx

BASE_URL = "https://api.sleeper.app/v1"

_client: httpx.AsyncClient | None = None


def _get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(base_url=BASE_URL, timeout=15.0)
    return _client


async def get_nfl_state() -> dict:
    r = await _get_client().get("/state/nfl")
    r.raise_for_status()
    return r.json()


async def get_league(league_id: str) -> dict:
    r = await _get_client().get(f"/league/{league_id}")
    r.raise_for_status()
    return r.json()


async def get_rosters(league_id: str) -> list[dict]:
    r = await _get_client().get(f"/league/{league_id}/rosters")
    r.raise_for_status()
    return r.json()


async def get_users(league_id: str) -> list[dict]:
    r = await _get_client().get(f"/league/{league_id}/users")
    r.raise_for_status()
    return r.json()


async def get_matchups(league_id: str, week: int) -> list[dict]:
    r = await _get_client().get(f"/league/{league_id}/matchups/{week}")
    r.raise_for_status()
    return r.json()


async def get_traded_picks(league_id: str) -> list[dict]:
    r = await _get_client().get(f"/league/{league_id}/traded_picks")
    r.raise_for_status()
    return r.json()
