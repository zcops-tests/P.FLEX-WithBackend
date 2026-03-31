# Runtime Baseline

## Objetivo

Este documento fija la linea base funcional, tecnica y operativa del proyecto antes de seguir con la implementacion por fases.

Debe responder, sin ambiguedad, estas preguntas:

- que modulos estan activos hoy
- que modulos son canonicos
- que modulos son legacy
- que servicio o modulo es dueno de cada flujo
- donde viven hoy los datos reales
- que inconsistencias estructurales existen
- que no se debe tocar para no romper UI o flujos ya operativos

Este documento es la referencia de seguridad para las siguientes fases. Si una decision futura contradice esta linea base, debe justificarse explicitamente antes de implementarse.

Documento complementario:

- consultar `docs/runtime-contract-map.md` para el detalle UI -> servicio -> backend de los contratos runtime activos
- consultar `docs/mandatory-regression-checklist.md` para la regla obligatoria de cierre de puntos siguientes

## Reglas globales de esta ola

- La UI visible actual se considera congelada como contrato.
- No se modifica markup, layout, tabs, tablas, modales, textos visibles ni estilos, salvo instruccion explicita del usuario con una plantilla HTML concreta.
- Toda logica nueva debe apoyarse primero en modulos canonicos activos.
- `src/features/production/*` queda tratado como legado y no debe recibir nueva logica de negocio.
- Si una necesidad funcional parece estar en `production/*`, se migra al flujo canonico en lugar de reforzar el legacy.

## Vista general del sistema activo

### Frontend canonico activo

Las rutas activas cargadas desde `index.tsx` confirman que las superficies funcionales actuales son:

- `src/features/access/*`
  - entrada de sesion y selector de modo
- `src/features/dashboard/*`
  - tablero principal
- `src/features/orders/*`
  - gestion de OTs y snapshot operativo
- `src/features/planning/*`
  - UI actual de programacion
- `src/features/reports/*`
  - listados, detalle y supervision de reportes reales
- `src/features/operator/*`
  - captura operativa via anfitrion + identificacion por DNI
- `src/features/admin/*`
  - usuarios, roles, maquinas, configuracion
- `src/features/inventory/*`
  - layout, clises, troqueles y stock
- `src/features/quality/*`
  - incidencias
- `src/features/analytics/*`
  - indicadores
- `src/features/audit/*`
  - auditoria
- `src/features/system/*`
  - sync center
- `src/core/layout/*`
  - sidebar y shell de navegacion
- `src/services/*`
  - estado global, API backend, auditoria local, notificaciones y utilidades comunes

### Backend activo confirmado

El backend registrado en `backend/src/app.module.ts` confirma modulos reales para:

- `auth`
- `users`
- `roles`
- `permissions`
- `areas`
- `machines`
- `shifts`
- `system-config`
- `work-orders`
- `production/printing`
- `production/diecutting`
- `production/rewinding`
- `production/packaging`
- `inventory/clises`
- `inventory/dies`
- `inventory/racks`
- `inventory/stock`
- `quality`
- `analytics`
- `audit`
- `sync`
- `imports`
- `exports`
- `staging`
- `files`
- `outbox`
- `observability`

### Backend no confirmado como modulo activo

No existe actualmente un `PlanningModule` registrado en `backend/src/app.module.ts`.

Conclusiones operativas:

- `planning` existe hoy como UI activa en frontend.
- la persistencia de programacion no vive en un modulo backend dedicado.
- la pantalla actual de programacion se sostiene hoy sobre OTs y campos de agenda embebidos.

## Matriz de rutas activas

### Acceso y shell

- `/login`
  - pantalla de login
  - protegida por `guestGuard`
- `/mode-selector`
  - selector de contexto autenticado
  - protegida por `authGuard`

### Modulos principales

- `/dashboard`
  - componente: dashboard
  - permiso: `dashboard.view`
- `/ots`
  - componente: listado de OTs
  - permiso: `workorders.view`
- `/schedule`
  - componente: `ScheduleComponent`
  - permiso: `planning.view`

### Reportes

- `/reports/print`
  - permiso: `reports.print.view`
- `/reports/diecut`
  - permiso: `reports.diecut.view`
- `/reports/rewind`
  - permiso: `reports.rewind.view`
- `/reports/packaging`
  - permiso: `reports.packaging.view`
  - modo de ruta: `manager`

### Inventario

- `/inventory/layout`
  - permiso: `inventory.layout.view`
- `/inventory/clise`
  - permiso: `inventory.clises.view`
- `/inventory/die`
  - permiso: `inventory.dies.view`
- `/inventory/stock`
  - permiso: `inventory.stock.view`
- `/inventory/ink`
  - permiso: `inventory.ink.view`
  - hoy sigue visible por permiso, aunque el modulo es placeholder

### Calidad, analitica, auditoria y sistema

- `/incidents`
  - permiso: `quality.incidents.view`
- `/analytics`
  - permiso: `analytics.view`
- `/audit`
  - permiso: `audit.view`
- `/sync`
  - permiso: `sync.manage`
- `/admin`
  - permiso: `admin.panel.view`

### Flujo operador

- `/operator`
  - selector de proceso para anfitrion
  - permiso: `operator.host`
- `/operator/select-machine/:type`
  - selector de maquina
  - permiso: `operator.host`
- `/operator/report/:type/:machine`
  - formulario operativo de impresion, troquelado y rebobinado
  - permiso: `operator.host`
- `/operator/packaging`
  - reutiliza `ReportsPackagingComponent`
  - permiso: `operator.host`
  - modo de ruta: `operator`

## Superficies canonicas por capacidad

### 1. Autenticacion y sesion

Dueno canonico:

- frontend: `StateService`
- backend: `auth`, `users`, `permissions`, `roles`

Comportamiento actual:

- login con DNI como username principal
- el operario no inicia sesion directamente
- el operario se identifica por DNI desde una sesion anfitriona con permiso `operator.host`
- permisos dinamicos resueltos por backend

### 2. OTs y gestion operativa

Dueno canonico:

- frontend: `OrdersService`
- backend: `work-orders`

Responsabilidades actuales:

- listar OTs en gestion
- buscar OTs en base
- crear o actualizar OTs
- importar OTs
- entrar y salir de gestion
- mantener campos de agenda embebidos en `raw_payload`

### 3. Programacion

Dueno canonico hoy:

- frontend: `ScheduleComponent` + `OrdersService`
- backend: `work-orders` de manera indirecta

Estado real hoy:

- la UI de `Programacion` esta activa y es la oficial
- no existe un backend dedicado de planning activo
- `ScheduleComponent` arma `_jobs` a partir de OTs
- la persistencia actual se hace guardando:
  - `scheduleMachineId`
  - `scheduleStartTime`
  - `scheduleDurationMinutes`
  - `scheduleOperator`
  - `scheduleNotes`
  - `scheduleDateTime`
  - `fechaPrd`
  - `Linea_produccion`
  - `Estado_pedido`
- esos datos viven hoy en la OT y en su `raw_payload`

Conclusion:

- `planning` hoy es un comportamiento embebido en `orders`, no un dominio backend separado

### 4. Produccion real

Dueno canonico:

- captura: `operator/*`
- supervision y consulta: `reports/*`
- servicio frontend: `ProductionService`
- backend: `production/printing`, `production/diecutting`, `production/rewinding`, `production/packaging`

Comportamiento actual:

- impresion, troquelado, rebobinado y empaquetado se registran contra backend real
- la UI activa de reportes es `reports/*`, no `production/*`
- `ProductionService` es el contrato frontend canonico para reportes productivos

### 5. Administracion

Dueno canonico:

- frontend: `AdminService`
- backend: `users`, `roles`, `permissions`, `machines`, `areas`, `system-config`

Comportamiento actual:

- usuarios, roles, maquinas, permisos y areas ya consultan backend real
- configuracion tiene soporte parcial: la UI expone mas controles de los que hoy soporta backend

### 6. Inventario tecnico

Dueno canonico:

- frontend: `inventory/*`
- backend: `inventory/clises`, `inventory/dies`, `inventory/racks`, `inventory/stock`

Comportamiento actual:

- clises, troqueles y stock tienen backend real
- existe relacion tecnica `CliseDieLink`
- `inventory/ink` sigue siendo placeholder

## Matriz de servicios frontend canonicos

### `StateService`

Responsabilidades:

- usuario actual
- permisos efectivos
- rol y nombre normalizados
- contexto de operario activo
- identificacion por DNI
- areas asignadas al operario
- estado admin transversal

Es el dueno del contexto de sesion y autorizacion en frontend.

### `OrdersService`

Responsabilidades:

- OTs en gestion
- snapshot completo de base
- busqueda por OT
- upsert de OT
- persistencia de agenda actual en campos `schedule*`
- traduccion entre payload importado y modelo frontend `OT`

Es el dueno actual de la persistencia de programacion, aunque eso cambie despues.

### `ProductionService`

Responsabilidades:

- cargar reportes reales de impresion
- cargar reportes reales de troquelado
- cargar reportes reales de rebobinado
- cargar reportes reales de empaquetado
- crear reportes
- consultar detalle
- actualizar empaquetado
- mapear DTOs backend a modelos frontend de `reports`

Es el contrato productivo canonico del frontend.

### `AdminService`

Responsabilidades:

- usuarios
- roles
- maquinas
- permisos
- areas
- configuracion global

Es el punto de entrada canonico del panel administrativo.

## Flujos canonicos actuales

### Flujo de operador

Secuencia actual:

1. un usuario anfitrion inicia sesion
2. entra a `/operator`
3. identifica un operario por DNI
4. `StateService` resuelve nombre y areas permitidas del operario
5. el anfitrion selecciona proceso
6. selecciona maquina
7. registra reporte
8. el reporte se persiste en backend real de produccion

Nota:

- el operario no autentica por password
- el acceso al panel depende del permiso `operator.host`

### Flujo de supervision de reportes

Secuencia actual:

1. usuario con permiso entra a `/reports/*`
2. el componente consume `ProductionService`
3. `ProductionService` consulta backend de produccion
4. el componente muestra listado y detalle real

### Flujo actual de programacion

Secuencia actual:

1. usuario entra a `/schedule`
2. `ScheduleComponent` consulta OTs desde `OrdersService`
3. `ScheduleComponent` hidrata `_jobs` leyendo campos de agenda embebidos en la OT
4. al guardar, vuelve a escribir agenda dentro de la OT
5. la OT queda con estado planificado y snapshot de agenda

Conclusion:

- hoy la programacion es una capa funcional sobre OTs, no un dominio backend propio

## Estructura de datos y propiedad real

### OT

La OT sigue siendo hoy la entidad operativa principal visible en UI.

La OT almacena:

- datos comerciales y productivos importados
- estado operativo
- datos visibles de gestion
- snapshot actual de agenda
- cantidades propias de la OT
- relacion con reportes

Campos relevantes ya presentes:

- `nro_ficha`
- `descripcion`
- `troquel`
- `acabado`
- `troquel_ficha`
- `acabado_ficha`
- `col_ficha`
- `p_cant_rollo_ficha`
- `scheduleMachineId`
- `scheduleStartTime`
- `scheduleDurationMinutes`
- `scheduleOperator`
- `scheduleNotes`
- `scheduleDateTime`

### Clise

Datos tecnicos relevantes ya presentes:

- `item_code`
- `ficha_fler`
- medidas y cliente
- relacion `die_links`

### Die

Datos tecnicos relevantes ya presentes:

- `serie`
- `tipo_troquel`
- `ubicacion`
- medidas y cliente

### Relacion tecnica existente

Ya existe una relacion estructural activa:

- `CliseDieLink`

Uso actual:

- sirve para vinculo tecnico de inventario
- no es todavia la fuente oficial de compatibilidad por ficha

## Legacy confirmado

Las siguientes pantallas quedan oficialmente tratadas como legado:

- `src/features/production/production-print.component.ts`
- `src/features/production/production-diecut.component.ts`
- `src/features/production/production-rewind.component.ts`
- `src/features/production/production-packaging.component.ts`

Motivos:

- no estan cargadas por rutas activas en `index.tsx`
- duplican capacidades que hoy viven en `operator/*` y `reports/*`
- conservan logica mock, local o aleatoria
- contienen `alert()` y `Math.random()` en flujos que no deben ser reforzados

Regla:

- no reciben nueva logica de negocio
- no se usan como referencia funcional primaria
- solo se retiran cuando ya no exista ninguna dependencia indirecta

## Inconsistencias conocidas del estado actual

### 1. Programacion sin backend dedicado

- la UI de `planning` esta activa
- no existe un `PlanningModule` real registrado
- la persistencia vive en OTs

### 2. Sidebar con senales no reales

Hoy existen senales visuales no confiables:

- badge fijo de OTs: `3`
- latencia con fallback aleatorio

Estas senales no deben tomarse como fuente de verdad operativa.

### 3. Configuracion con soporte parcial

La pantalla de configuracion muestra controles que no tienen soporte backend equivalente completo.

Ejemplos:

- backups
- retencion offline
- reglas de conflicto
- algunos toggles de seguridad avanzada

### 4. `inventory/ink` placeholder

`InventoryInkComponent` sigue siendo un modulo en construccion.

### 5. Uso de `alert()` legacy en modulos activos secundarios

Persisten `alert()` en superficies que siguen activas, especialmente:

- `admin-config`
- `admin-roles`
- `quality/incidents`
- varias pantallas de inventario
- formularios de OTs

Esto no invalida la linea base, pero si marca deuda tecnica activa.

## Superficies que no deben ser alteradas visualmente

Mientras no exista una instruccion explicita del usuario:

- `ScheduleComponent`
- `ReportsPrintComponent`
- `ReportsDiecutComponent`
- `ReportsRewindComponent`
- `ReportsPackagingComponent`
- `OperatorSelectorComponent`
- `OperatorMachineSelectorComponent`
- `OperatorFormComponent`
- `AdminUsersComponent`
- `AdminRolesComponent`
- `AdminMachinesComponent`
- `AdminConfigComponent`
- `SidebarComponent`
- `DashboardComponent`

Permitido:

- cambiar servicios, adapters, contratos, validaciones, DTOs y persistencia
- cablear mejor la logica detras de la UI actual

No permitido sin aprobacion:

- redisenar estructura visible
- mover campos de lugar
- cambiar interacciones visibles
- introducir pantallas nuevas de reemplazo

## Regla de interpretacion para las siguientes fases

### Si una capacidad existe en varios lugares

Se toma como canonico:

- la ruta activa
- el servicio real que consulta backend
- el backend registrado en `app.module.ts`

Se toma como legacy:

- la pantalla no ruteada
- la pantalla con datos mock
- la pantalla que duplica un flujo ya cubierto por `reports/*` u `operator/*`

### Si un flujo existe visualmente pero no tiene backend dedicado

Se considera:

- UI canonica
- backend incompleto
- candidato a completarse sin cambiar UI

Esto aplica hoy a `Programacion`.

### Si un control existe en UI y backend no lo soporta completamente

Se considera:

- UI valida como contrato
- backend incompleto
- candidato a completarse por logica, no a eliminar por rediseno

Esto aplica hoy a partes de `AdminConfig`.

## Implicancias para la implementacion futura

Esta linea base obliga a que las siguientes fases:

- construyan `Ficha` sin desplazar visualmente a la OT
- construyan `PlanningModule` sin redisenar `ScheduleComponent`
- mantengan `reports/*` y `operator/*` como flujo productivo canonico
- no revivan `src/features/production/*`
- completen backend y adapters antes de cambiar cualquier experiencia visible

## Checklist rapido antes de tocar codigo en puntos siguientes

- el cambio toca un modulo canonico y no uno legacy
- el cambio no altera UI visible
- el cambio no rompe el flujo anfitrion + DNI
- el cambio no rompe `reports/*`
- el cambio no rompe `OrdersService` como compatibilidad actual
- si toca programacion, debe respetar que hoy depende de OTs
- si toca configuracion, debe respetar la UI actual aunque el backend se amplie
