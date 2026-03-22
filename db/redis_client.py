import json
import os
import redis
from datetime import datetime

FACT_KEYS = ["약속", "갈등", "관계상태", "반복패턴", "원인"]


def get_redis():
    return redis.Redis(
        host=os.getenv("REDIS_HOST", "localhost"),
        port=int(os.getenv("REDIS_PORT", 6379)),
        decode_responses=True,
    )


# ── 세션 메타 ──────────────────────────────────────────────────────────

def save_meta(session_id, persona, scenario):
    get_redis().set(
        f"session:{session_id}:meta",
        json.dumps({"persona": persona, "scenario": scenario}, ensure_ascii=False),
    )


def get_meta(session_id):
    raw = get_redis().get(f"session:{session_id}:meta")
    return json.loads(raw) if raw else None


# ── 대화 이력 (LLM ↔ 사용자) ──────────────────────────────────────────

def append_history(session_id, role, content):
    entry = json.dumps(
        {"role": role, "content": content, "ts": datetime.now().isoformat()},
        ensure_ascii=False,
    )
    get_redis().rpush(f"session:{session_id}:history", entry)


def get_history(session_id, last_n=None):
    raw_list = get_redis().lrange(f"session:{session_id}:history", 0, -1)
    history = [{"role": h["role"], "content": h["content"]} for h in (json.loads(x) for x in raw_list)]
    return history[-last_n:] if last_n else history


def get_history_count(session_id):
    return get_redis().llen(f"session:{session_id}:history")


# ── Fact (dict 형식) ──────────────────────────────────────────────────

def get_facts(session_id):
    raw = get_redis().get(f"session:{session_id}:facts")
    if raw:
        return json.loads(raw)
    return {k: [] for k in FACT_KEYS}


def save_facts(session_id, facts_dict):
    get_redis().set(
        f"session:{session_id}:facts",
        json.dumps(facts_dict, ensure_ascii=False),
    )


def merge_facts(session_id, new_facts):
    """새 fact만 추가 (중복 제외)"""
    existing = get_facts(session_id)
    for key in FACT_KEYS:
        for item in new_facts.get(key, []):
            if item and item not in existing[key]:
                existing[key].append(item)
    save_facts(session_id, existing)


# ── 요약본 (최신 2개 유지) ────────────────────────────────────────────

def append_summary(session_id, content, turns_covered):
    entry = json.dumps(
        {"content": content, "turns_covered": turns_covered, "ts": datetime.now().isoformat()},
        ensure_ascii=False,
    )
    r = get_redis()
    r.rpush(f"session:{session_id}:summaries", entry)
    r.ltrim(f"session:{session_id}:summaries", -2, -1)  # 최신 2개만


def get_summaries(session_id):
    raw_list = get_redis().lrange(f"session:{session_id}:summaries", 0, -1)
    return [json.loads(x) for x in raw_list]


# ── 패널 이력 ─────────────────────────────────────────────────────────

def append_panel_history(session_id, speaker, content):
    entry = json.dumps(
        {"speaker": speaker, "content": content, "ts": datetime.now().isoformat()},
        ensure_ascii=False,
    )
    get_redis().rpush(f"session:{session_id}:panel_history", entry)


def get_panel_history(session_id, last_n=3):
    raw_list = get_redis().lrange(f"session:{session_id}:panel_history", 0, -1)
    items = [json.loads(x) for x in raw_list]
    return items[-last_n:] if last_n else items


# ── 심리 상태 ─────────────────────────────────────────────────────────

def save_state(session_id, state):
    get_redis().set(
        f"session:{session_id}:state",
        json.dumps(state, ensure_ascii=False),
    )


def get_state(session_id):
    raw = get_redis().get(f"session:{session_id}:state")
    return json.loads(raw) if raw else None


# ── 세션 삭제 ─────────────────────────────────────────────────────────

def delete_session(session_id):
    r = get_redis()
    keys = r.keys(f"session:{session_id}:*")
    if keys:
        r.delete(*keys)
