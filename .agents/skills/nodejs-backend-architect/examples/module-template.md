# Example Module Template

```text
src/
  modules/
    orders/
      http/
        orders.controller.ts
        orders.routes.ts
        orders.dto.ts
      application/
        create-order.use-case.ts
        cancel-order.use-case.ts
      domain/
        order.entity.ts
        order.errors.ts
        order.policies.ts
      infrastructure/
        order.repository.ts
        order.sql.ts
        payment.gateway.ts
      jobs/
        order-events.worker.ts
```

Guideline:
- Keep transport, application, domain, infrastructure, and jobs separate.
