# Regression Baseline

## Objetivo

Esta red de regresion existe para detectar rapido si una fase rompe los flujos activos sin depender de cambios de UI.

La cobertura se divide en dos capas:

- `regression:baseline`
  - validacion estatica y pruebas backend focalizadas sobre la logica critica
- `smoke:baseline:api`
  - smoke runtime no mutante sobre el API real del stack levantado

## Cobertura de la suite backend focalizada

El comando `npm --prefix backend run test:baseline` cubre:

- autenticacion y sesion
- usuarios
- maquinas
- work orders y gestion
- impresion
- troquelado
- rebobinado
- empaquetado

Objetivo:

- validar reglas de negocio y contratos internos sin depender de datos reales del entorno

## Cobertura del smoke runtime por API

El comando `npm run smoke:baseline:api` verifica:

- health live y ready
- login del anfitrion
- `auth/me`
- permisos efectivos del anfitrion
- listado de usuarios
- identificacion de operario por DNI
- listado de maquinas
- listado de turnos
- listado de OTs
- listado de OTs en gestion
- shape actual del contrato de programacion basado en `WorkOrder + raw_payload`
- listado de reportes de impresion
- listado de reportes de troquelado
- listado de reportes de rebobinado
- listado de reportes de empaquetado
- detalle del primer elemento disponible en cada modulo consultado

Objetivo:

- validar que el stack levantado responde con los contratos activos reales del sistema
- desempaquetar correctamente el envelope global `{ success, data, meta, error }` del API
- diferenciar entre ruptura contractual y degradacion de infraestructura

Nota sobre programacion actual:

- el API de `work-orders` no expone `schedule*` al nivel superior
- el contrato vigente entrega OT + `raw_payload` + `fecha_programada_produccion`
- `OrdersService` reconstruye `scheduleMachineId`, `scheduleStartTime`, `scheduleDurationMinutes`, `scheduleOperator`, `scheduleNotes` y `scheduleDateTime` desde `raw_payload`
- el smoke valida ese contrato real y no un shape inexistente del backend

Nota sobre `health/ready`:

- `health/live` es bloqueo duro del smoke
- `health/ready` se registra como advertencia si devuelve `503`
- si `ready` falla pero login, consultas y listados reales siguen funcionando, el smoke cierra con warnings y no como falso negativo contractual

## Variables de entorno soportadas por el smoke

El runner acepta estas variables:

- `SMOKE_API_BASE_URL`
  - default: `http://localhost:3000/api/v1`
- `SMOKE_HOST_DNI`
  - fallback: `DEV_ADMIN_USERNAME` desde `backend/.env`
- `SMOKE_HOST_PASSWORD`
  - fallback: `DEV_ADMIN_PASSWORD` desde `backend/.env`
- `SMOKE_OPERATOR_DNI`
  - opcional
  - si no llega, el runner intenta descubrir el primer operario activo desde `/users`

## Comandos operativos

### Baseline estatico y logico

```powershell
npm run regression:baseline
```

### Smoke runtime del stack

Prerequisito:

- backend levantado y accesible
- base con datos semilla suficientes

Ejecucion:

```powershell
npm run smoke:baseline:api
```

### Smoke runtime con overrides

```powershell
$env:SMOKE_API_BASE_URL='http://localhost:3000/api/v1'
$env:SMOKE_HOST_DNI='48604998'
$env:SMOKE_HOST_PASSWORD='tu-password'
$env:SMOKE_OPERATOR_DNI='12345678'
npm run smoke:baseline:api
```

## Politica de uso en fases siguientes

- ningun punto posterior se considera cerrado si rompe `regression:baseline`
- si el entorno esta levantado, tambien debe pasar `smoke:baseline:api`
- si un punto toca auth, usuarios, maquinas, OTs, programacion o reportes, se debe rerunear la red completa
- si el smoke runtime falla por datos faltantes del entorno y no por contrato roto, debe documentarse como bloqueo de entorno y no como green falso

Checklist obligatorio complementario:

- consultar `docs/mandatory-regression-checklist.md`
- ese documento define la matriz obligatoria por area tocada y los criterios de bloqueo para cerrar puntos siguientes
