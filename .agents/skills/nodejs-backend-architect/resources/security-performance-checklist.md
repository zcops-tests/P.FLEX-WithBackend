# Security and Performance Checklist

## Security

- Validate all external input.
- Enforce authorization explicitly per sensitive action.
- Keep secrets and private keys out of source code.
- Use secure password hashing and token handling.
- Prevent privilege escalation through tenant or resource checks.
- Verify webhook signatures and replay tolerance.
- Use allowlists and size limits for uploads.

## Performance

- Check for N+1 queries.
- Check for missing indexes.
- Check for large payloads and unbounded queries.
- Check for blocking CPU work in request handlers.
- Move retryable or heavy work to queues or workers.
- Use caching only when invalidation is defined.
- Add backpressure, concurrency limits, and timeouts where needed.
