# backend/cache.py
"""Simple in-memory cache utilities for FastAPI endpoints.
This is a lightweight alternative to fastapi-cache2 for the current project.
It provides a @cached decorator that stores results in a dict keyed by
function name and arguments. Cache entries expire after a TTL (default 60s).
"""
import time
import functools
import inspect
from typing import Any, Callable, Dict, Tuple

_cache_store: Dict[Tuple[str, Tuple[Any, ...], Tuple[Tuple[str, Any], ...]], Tuple[Any, float]] = {}

# Specific cache for dashboard data to allow manual invalidation/updates
_dashboard_cache: Dict[str, Tuple[Any, float]] = {}

def cached(ttl: int = 60):
    """Cache decorator for FastAPI endpoint functions.
    Args:
        ttl: Time‑to‑live in seconds.
    """
    def decorator(func: Callable):
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            key = (func.__name__, args, tuple(sorted(kwargs.items())))
            now = time.time()
            if key in _cache_store:
                result, timestamp = _cache_store[key]
                if now - timestamp < ttl:
                    return result
            
            if inspect.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
                
            _cache_store[key] = (result, now)
            return result
        return wrapper
    return decorator

def get_cached_dashboard(username: str) -> Any:
    """Retrieve cached dashboard data if valid."""
    if username in _dashboard_cache:
        data, timestamp = _dashboard_cache[username]
        # Default 60s TTL for dashboard
        if time.time() - timestamp < 60:
            return data
    return None

def cache_dashboard(username: str, data: Any):
    """Cache dashboard data manually."""
    _dashboard_cache[username] = (data, time.time())

def invalidate_user_cache(username: str):
    """Invalidate all caches for a user (dashboard and others if possible)."""
    if username in _dashboard_cache:
        del _dashboard_cache[username]
    
    # Also try to clear decorated cache entries for this user
    # This is a bit hacky as we need to know the keys, but for now we just clear dashboard
    pass