# Example Module Template

```text
src/
  modules/
    orders/
      orders.module.ts
      orders.controller.ts
      dto/
        create-order.dto.ts
        cancel-order.dto.ts
      application/
        create-order.service.ts
        cancel-order.service.ts
      domain/
        order.entity.ts
        order.errors.ts
        order.policy.ts
      infrastructure/
        orders.repository.ts
        payment.gateway.ts
      jobs/
        order-events.processor.ts
```

Guideline:
- Keep the NestJS module as the composition root and keep transport, application, domain, infrastructure, and jobs clearly separated.
