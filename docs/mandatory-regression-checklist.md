# Mandatory Regression Checklist

## Objetivo

Este checklist define que debe verificarse antes de cerrar cualquier punto posterior a la Fase 1.

Regla principal:

- ningun punto siguiente se considera cerrado si rompe un flujo baseline aprobado

Este documento no reemplaza:

- `docs/runtime-baseline.md`
- `docs/runtime-contract-map.md`
- `docs/regression-baseline.md`

Los complementa con una regla de cierre obligatoria.

## Regla de cierre

Todo punto futuro debe cerrar con estas cuatro secciones:

1. que quedo implementado
2. que validaciones pasaron o fallaron
3. que riesgos o deuda quedaron abiertos
4. pregunta de control antes de seguir

Ademas, antes de declarar un punto como cerrado, debe pasar este checklist.

## Checklist universal obligatorio

### A. Contrato visual

- [ ] la UI visible sigue igual
- [ ] no se altero markup, layout, tabs, tablas, modales, labels o estilos
- [ ] si hubo una necesidad tecnica de cableado visual minimo, no cambio el comportamiento visible sin aprobacion explicita

### B. Contrato canonico

- [ ] el cambio toca un modulo canonico y no fortalece `src/features/production/*`
- [ ] se revisaron los servicios duenos del flujo segun `docs/runtime-contract-map.md`
- [ ] no se asumio un shape de API distinto al contrato runtime actual

### C. Regresion minima

- [ ] si hubo cambios frontend: `npm run lint`
- [ ] si hubo cambios frontend: `npm run build`
- [ ] si hubo cambios backend: `backend npm run build`
- [ ] si el punto toca auth, usuarios, maquinas, OTs, programacion o reportes: `backend npm run test:baseline`
- [ ] si el entorno esta levantado: `node scripts/smoke-baseline.mjs`

### D. Integridad funcional

- [ ] no se rompio login anfitrion
- [ ] no se rompio identificacion de operario por DNI
- [ ] no se rompio el flujo activo de `reports/*`
- [ ] no se rompio el flujo activo de `operator/*`
- [ ] no se rompio compatibilidad actual de `OrdersService`
- [ ] no se rompio la regla de operario sin login directo

## Matriz obligatoria por area tocada

## 1. Si el punto toca auth, sesion o permisos

Debe revisarse:

- `StateService`
- `auth.guard.ts`
- `index.tsx`
- `BackendApiService` si cambia algun endpoint de auth

Debe pasar:

- login anfitrion
- `auth/me`
- guards de rutas protegidas
- acceso a panel operador
- `backend npm run test:baseline`
- `node scripts/smoke-baseline.mjs`

## 2. Si el punto toca OTs o gestion

Debe revisarse:

- `OrdersService`
- componentes de OTs afectados
- mapping `raw_payload`

Debe pasar:

- listado de OTs
- gestion de OTs
- busqueda por OT
- preservacion de `raw_payload`
- compatibilidad de `schedule*`
- `backend npm run test:baseline`
- `node scripts/smoke-baseline.mjs`

## 3. Si el punto toca Programacion

Debe revisarse en conjunto:

- `ScheduleComponent`
- `OrdersService`
- `StateService`
- `AdminService`

Debe pasar:

- carga de maquinas por area
- carga de OTs en gestion
- hidratacion de `_jobs`
- guardado de programacion
- preservacion de `schedule*` en `raw_payload`
- actualizacion de estado de maquina
- `backend npm run test:baseline`
- `node scripts/smoke-baseline.mjs`

## 4. Si el punto toca Produccion o Reportes

Debe revisarse:

- `ProductionService`
- componente de reporte afectado
- controller y service backend del proceso afectado

Debe pasar:

- listado del modulo afectado
- detalle del modulo afectado
- creacion o actualizacion si aplica
- mapping frontend normalizado
- `backend npm run test:baseline`
- `node scripts/smoke-baseline.mjs`

## 5. Si el punto toca panel operador

Debe revisarse:

- `StateService`
- `OperatorSelectorComponent`
- `OperatorMachineSelectorComponent`
- `OperatorFormComponent`
- proceso de backend afectado

Debe pasar:

- identificacion por DNI
- filtro por areas asignadas
- filtro por maquinas compatibles
- persistencia del reporte generado
- reaparicion del reporte en `reports/*`
- `backend npm run test:baseline`
- `node scripts/smoke-baseline.mjs`

## 6. Si el punto toca Admin

Debe revisarse:

- `AdminService`
- `StateService`
- componente admin afectado

Debe pasar:

- refresh de catalogos
- persistence backend del modulo admin tocado
- lectura posterior del estado actualizado
- compatibilidad con `ScheduleComponent` si toca maquinas
- `backend npm run test:baseline` cuando aplique
- `node scripts/smoke-baseline.mjs` cuando toque usuarios, maquinas o config critica

## Criterios de bloqueo

Un punto no puede marcarse como cerrado si ocurre cualquiera de estos casos:

- falla `npm run lint` por una regresion introducida en el punto
- falla `npm run build` del frontend por una regresion introducida en el punto
- falla `backend npm run build` por una regresion introducida en el punto
- falla `backend npm run test:baseline`
- falla `node scripts/smoke-baseline.mjs` por contrato roto
- la UI visible cambio sin aprobacion explicita
- el cambio refuerza `src/features/production/*`
- se rompe compatibilidad de `OrdersService` o `ProductionService` en flujos activos

## Tratamiento de bloqueos de entorno

Un punto puede quedar "tecnicamente listo pero no cerrado" solo si:

- la falla proviene del entorno y no del codigo tocado
- el bloqueo se documenta explicitamente en el checkpoint
- se deja claro que no cuenta como green completo

Ejemplos validos:

- backend apagado para `smoke-baseline`
- base sin datos minimos para una validacion puntual
- `health/ready` degradado pero `health/live`, login y contratos funcionales responden

Ejemplos no validos:

- omitir pruebas por tiempo
- asumir que "si compila, funciona"
- marcar como verde un flujo no ejercitado cuando el punto lo tocaba directamente

## Plantilla obligatoria de checkpoint

Cada punto siguiente debe cerrar con esta estructura:

```text
Que quedo implementado
- ...

Validaciones
- ...

Riesgos o deuda abierta
- ...

Pregunta de control
¿Aprobamos este punto o ajustamos algo antes de seguir al siguiente?
```

## Decision operativa

Desde este punto en adelante:

- el baseline ya no es solo una referencia
- pasa a ser una condicion de cierre
- si un cambio rompe un flujo aprobado, el punto se reabre antes de avanzar
