# Example API Contract Template

## Endpoint

`POST /v1/orders`

## Request body

- customerId: string
- items: array of line items
- currency: string
- idempotencyKey: string when retries are possible

## Success response

- orderId: string
- status: string
- createdAt: ISO timestamp

## Error cases

- 400 invalid payload
- 401 unauthenticated
- 403 unauthorized
- 409 duplicate or invalid state transition
- 422 business rule violation
```
