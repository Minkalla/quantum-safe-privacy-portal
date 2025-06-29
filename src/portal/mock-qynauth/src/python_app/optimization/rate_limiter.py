"""
PQC Rate Limiter

This module provides rate limiting and throttling utilities for
Post-Quantum Cryptography operations to prevent abuse and ensure fair usage.

Compliance:
- NIST SP 800-53 (SC-13): Cryptographic Protection
- NIST SP 800-53 (AU-3): Audit and Accountability
"""

import asyncio
import time
import functools
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from collections import defaultdict
from enum import Enum

from ..monitoring.pqc_logger import pqc_logger

class RateLimitStrategy(Enum):
    """Rate limiting strategies."""
    FIXED_WINDOW = "fixed_window"
    SLIDING_WINDOW = "sliding_window"
    TOKEN_BUCKET = "token_bucket"

@dataclass
class RateLimitConfig:
    """Rate limit configuration."""
    max_requests: int
    time_window: float  # seconds
    strategy: RateLimitStrategy = RateLimitStrategy.SLIDING_WINDOW
    burst_allowance: int = 0  # Additional requests allowed in burst
    cooldown_period: float = 0.0  # Cooldown after limit exceeded

@dataclass
class RateLimitState:
    """Rate limit state for a user/operation."""
    requests: List[float] = field(default_factory=list)
    tokens: float = 0.0
    last_refill: float = field(default_factory=time.time)
    blocked_until: float = 0.0
    total_requests: int = 0
    blocked_requests: int = 0

class PQCRateLimiter:
    """
    Rate limiter for PQC operations with multiple strategies.
    
    This class provides rate limiting capabilities with different strategies
    to prevent abuse and ensure fair usage of PQC operations.
    """
    
    def __init__(self, default_config: Optional[RateLimitConfig] = None):
        """
        Initialize PQC rate limiter.
        
        Args:
            default_config: Default rate limit configuration
        """
        self.default_config = default_config or RateLimitConfig(
            max_requests=100,
            time_window=60.0,
            strategy=RateLimitStrategy.SLIDING_WINDOW
        )
        
        self._user_states: Dict[str, RateLimitState] = defaultdict(RateLimitState)
        self._operation_configs: Dict[str, RateLimitConfig] = {}
        self._lock = asyncio.Lock()
        self._stats = defaultdict(int)
        
        pqc_logger.log_pqc_operation(
            "info",
            "PQC rate limiter initialized",
            pqc_operation="rate_limiter_init",
            default_max_requests=self.default_config.max_requests,
            default_time_window=self.default_config.time_window,
            default_strategy=self.default_config.strategy.value
        )
    
    def configure_operation(self, operation: str, config: RateLimitConfig):
        """
        Configure rate limiting for a specific operation.
        
        Args:
            operation: PQC operation name
            config: Rate limit configuration
        """
        self._operation_configs[operation] = config
        
        pqc_logger.log_pqc_operation(
            "info",
            f"Rate limit configured for operation: {operation}",
            pqc_operation="rate_limit_config",
            operation=operation,
            max_requests=config.max_requests,
            time_window=config.time_window,
            strategy=config.strategy.value
        )
    
    def _get_config(self, operation: str) -> RateLimitConfig:
        """Get rate limit configuration for an operation."""
        return self._operation_configs.get(operation, self.default_config)
    
    def _cleanup_old_requests(self, requests: List[float], time_window: float):
        """Remove requests outside the time window."""
        current_time = time.time()
        cutoff_time = current_time - time_window
        
        while requests and requests[0] < cutoff_time:
            requests.pop(0)
    
    def _check_fixed_window(self, state: RateLimitState, config: RateLimitConfig) -> bool:
        """Check rate limit using fixed window strategy."""
        current_time = time.time()
        window_start = int(current_time / config.time_window) * config.time_window
        
        requests_in_window = sum(
            1 for req_time in state.requests
            if req_time >= window_start
        )
        
        return requests_in_window < config.max_requests
    
    def _check_sliding_window(self, state: RateLimitState, config: RateLimitConfig) -> bool:
        """Check rate limit using sliding window strategy."""
        self._cleanup_old_requests(state.requests, config.time_window)
        return len(state.requests) < config.max_requests
    
    def _check_token_bucket(self, state: RateLimitState, config: RateLimitConfig) -> bool:
        """Check rate limit using token bucket strategy."""
        current_time = time.time()
        
        time_passed = current_time - state.last_refill
        tokens_to_add = time_passed * (config.max_requests / config.time_window)
        state.tokens = min(config.max_requests + config.burst_allowance, 
                          state.tokens + tokens_to_add)
        state.last_refill = current_time
        
        if state.tokens >= 1.0:
            state.tokens -= 1.0
            return True
        
        return False
    
    async def check_rate_limit(self, user_id: str, operation: str = "default") -> bool:
        """
        Check if request is within rate limits.
        
        Args:
            user_id: User identifier
            operation: PQC operation name
            
        Returns:
            True if request is allowed, False if rate limited
        """
        config = self._get_config(operation)
        current_time = time.time()
        
        async with self._lock:
            state = self._user_states[f"{user_id}:{operation}"]
            
            if state.blocked_until > current_time:
                state.blocked_requests += 1
                self._stats['requests_blocked_cooldown'] += 1
                
                pqc_logger.log_pqc_operation(
                    "warning",
                    f"Request blocked due to cooldown: {user_id}",
                    pqc_operation="rate_limit_cooldown",
                    user_id=user_id,
                    operation=operation,
                    remaining_cooldown=state.blocked_until - current_time
                )
                
                return False
            
            allowed = False
            
            if config.strategy == RateLimitStrategy.FIXED_WINDOW:
                allowed = self._check_fixed_window(state, config)
            elif config.strategy == RateLimitStrategy.SLIDING_WINDOW:
                allowed = self._check_sliding_window(state, config)
            elif config.strategy == RateLimitStrategy.TOKEN_BUCKET:
                allowed = self._check_token_bucket(state, config)
            
            if allowed:
                state.requests.append(current_time)
                state.total_requests += 1
                self._stats['requests_allowed'] += 1
                
                pqc_logger.log_pqc_operation(
                    "debug",
                    f"Request allowed: {user_id}",
                    pqc_operation="rate_limit_allow",
                    user_id=user_id,
                    operation=operation,
                    total_requests=state.total_requests
                )
                
                return True
            else:
                state.blocked_requests += 1
                self._stats['requests_blocked'] += 1
                
                if config.cooldown_period > 0:
                    state.blocked_until = current_time + config.cooldown_period
                
                pqc_logger.log_pqc_operation(
                    "warning",
                    f"Rate limit exceeded: {user_id}",
                    pqc_operation="rate_limit_exceed",
                    user_id=user_id,
                    operation=operation,
                    blocked_requests=state.blocked_requests,
                    cooldown_applied=config.cooldown_period > 0
                )
                
                return False
    
    async def reset_user_limits(self, user_id: str, operation: Optional[str] = None):
        """
        Reset rate limits for a user.
        
        Args:
            user_id: User identifier
            operation: Specific operation to reset (None for all)
        """
        async with self._lock:
            if operation:
                key = f"{user_id}:{operation}"
                if key in self._user_states:
                    del self._user_states[key]
                    self._stats['limits_reset'] += 1
            else:
                keys_to_remove = [
                    key for key in self._user_states.keys()
                    if key.startswith(f"{user_id}:")
                ]
                for key in keys_to_remove:
                    del self._user_states[key]
                    self._stats['limits_reset'] += 1
        
        pqc_logger.log_pqc_operation(
            "info",
            f"Rate limits reset for user: {user_id}",
            pqc_operation="rate_limit_reset",
            user_id=user_id,
            operation=operation or "all"
        )
    
    async def get_user_status(self, user_id: str, operation: str = "default") -> Dict[str, Any]:
        """
        Get rate limit status for a user.
        
        Args:
            user_id: User identifier
            operation: PQC operation name
            
        Returns:
            Dictionary with rate limit status
        """
        config = self._get_config(operation)
        current_time = time.time()
        
        async with self._lock:
            state = self._user_states[f"{user_id}:{operation}"]
            
            if config.strategy == RateLimitStrategy.SLIDING_WINDOW:
                self._cleanup_old_requests(state.requests, config.time_window)
            
            remaining_requests = max(0, config.max_requests - len(state.requests))
            
            return {
                "user_id": user_id,
                "operation": operation,
                "max_requests": config.max_requests,
                "time_window": config.time_window,
                "current_requests": len(state.requests),
                "remaining_requests": remaining_requests,
                "total_requests": state.total_requests,
                "blocked_requests": state.blocked_requests,
                "blocked_until": state.blocked_until,
                "is_blocked": state.blocked_until > current_time,
                "strategy": config.strategy.value,
                "tokens": getattr(state, 'tokens', 0.0)
            }
    
    async def get_stats(self) -> Dict[str, Any]:
        """
        Get rate limiter statistics.
        
        Returns:
            Dictionary with rate limiter statistics
        """
        async with self._lock:
            active_users = len(set(
                key.split(':')[0] for key in self._user_states.keys()
            ))
            
            return {
                "active_users": active_users,
                "active_states": len(self._user_states),
                "configured_operations": len(self._operation_configs),
                "default_config": {
                    "max_requests": self.default_config.max_requests,
                    "time_window": self.default_config.time_window,
                    "strategy": self.default_config.strategy.value
                },
                "stats": dict(self._stats)
            }

pqc_rate_limiter = PQCRateLimiter()

def rate_limit(max_requests: int = 100, time_window: float = 60.0,
               strategy: RateLimitStrategy = RateLimitStrategy.SLIDING_WINDOW,
               operation: str = "default"):
    """
    Decorator for rate limiting PQC operations.
    
    Args:
        max_requests: Maximum requests allowed
        time_window: Time window in seconds
        strategy: Rate limiting strategy
        operation: Operation name for rate limiting
    """
    config = RateLimitConfig(
        max_requests=max_requests,
        time_window=time_window,
        strategy=strategy
    )
    
    pqc_rate_limiter.configure_operation(operation, config)
    
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        async def wrapper(*args, **kwargs):
            user_id = kwargs.get('user_id', 'unknown')
            if not user_id and args:
                if isinstance(args[0], str):
                    user_id = args[0]
            
            allowed = await pqc_rate_limiter.check_rate_limit(user_id, operation)
            
            if not allowed:
                raise Exception(f"Rate limit exceeded for user {user_id} on operation {operation}")
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator

async def check_user_rate_limit(user_id: str, operation: str = "default") -> bool:
    """Check if user is within rate limits."""
    return await pqc_rate_limiter.check_rate_limit(user_id, operation)

async def reset_user_rate_limits(user_id: str, operation: Optional[str] = None):
    """Reset rate limits for a user."""
    await pqc_rate_limiter.reset_user_limits(user_id, operation)

async def get_rate_limit_status(user_id: str, operation: str = "default") -> Dict[str, Any]:
    """Get rate limit status for a user."""
    return await pqc_rate_limiter.get_user_status(user_id, operation)
