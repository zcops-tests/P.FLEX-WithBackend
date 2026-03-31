# Runtime Contract Map

## Objetivo

Este documento describe los contratos runtime actuales entre UI, servicios frontend y backend activo.

No es un diseno futuro. Es una fotografia del sistema tal como funciona hoy para evitar:

- tocar un servicio canonico sin entender quien lo consume
- asumir shapes de API que no existen
- mover logica entre modulos que hoy estan acoplados
- romper flujos que ya funcionan al intentar "ordenarlos"

## Regla de lectura

- "UI" significa componente o ruta activa visible.
- "Servicio frontend" significa clase inyectable que concentra estado, adapters o llamadas al backend.
- "Backend" significa endpoint o modulo real ya registrado.
- "Contrato" significa shape, mapping o regla que hoy se espera en runtime.

## Transporte y envelope global

### ApiClientService

Archivo:

- `src/services/api-client.service.ts`

Rol runtime:

- construye `baseUrl`
- agrega `Authorization` con bearer token
- reintenta una vez ante `401` usando `refresh-token`
- desempaqueta automaticamente respuestas con envelope global

Contrato real del API:

- el backend responde normalmente como:
  - `success`
  - `data`
  - `meta`
  - `error`
- `ApiClientService` retorna `parsed.data` cuando detecta ese envelope
- cualquier servicio que use `BackendApiService` ya trabaja contra `data`, no contra el envelope completo

Implicancia:

- no hay que mapear `response.data.data`
- no hay que asumir que `fetch` directo y `BackendApiService` devuelven el mismo shape

## Rutas activas y punto de entrada de contratos

| Ruta | Componente activo | Servicio frontend canonico | Backend principal |
| --- | --- | --- | --- |
| `/login` | `LoginComponent` | `StateService` | `auth` |
| `/mode-selector` | `ModeSelectorComponent` | `StateService` | no persiste por si mismo |
| `/dashboard` | `DashboardComponent` | `StateService` y servicios locales del modulo | multiple fuentes |
| `/ots` | `OtListComponent` | `OrdersService` | `work-orders` |
| `/schedule` | `ScheduleComponent` | `OrdersService`, `StateService`, `AdminService` | `work-orders` y `machines` |
| `/reports/print` | `ReportsPrintComponent` | `ProductionService` | `production/printing` |
| `/reports/diecut` | `ReportsDiecutComponent` | `ProductionService` | `production/diecutting` |
| `/reports/rewind` | `ReportsRewindComponent` | `ProductionService` | `production/rewinding` |
| `/reports/packaging` | `ReportsPackagingComponent` | `ProductionService` | `production/packaging` |
| `/operator` | `OperatorSelectorComponent` | `StateService` | `users/operator-identification` |
| `/operator/select-machine/:type` | `OperatorMachineSelectorComponent` | `StateService` | usa catalogo bootstrap de maquinas |
| `/operator/report/:type/:machine` | `OperatorFormComponent` | `ProductionService`, `OrdersService`, `StateService` | `production/*` y `work-orders` |
| `/operator/packaging` | `ReportsPackagingComponent` modo operador | `ProductionService`, `OrdersService`, `StateService` | `production/packaging` |
| `/admin` | `AdminComponent` y subcomponentes | `AdminService`, `StateService` | `users`, `roles`, `permissions`, `machines`, `areas`, `system-config` |

## Guard y contrato de acceso

Archivos:

- `index.tsx`
- `src/guards/auth.guard.ts`
- `src/services/state.service.ts`

Contrato actual:

- `authGuard` solo deja pasar si `StateService.isLoggedIn()` y la sesion no expiro
- `roleGuard` ya no depende realmente de roles fijos; prioriza `data.permissions`
- `inventoryRoleGuard` resuelve permisos por tipo de inventario
- `StateService.postLoginRoute()` decide a donde aterriza la sesion

Invariantes actuales:

- el operario no puede usar sesion interactiva
- un anfitrion con `operator.host` puede entrar al panel del operador
- una misma cuenta puede ver workspace manager, panel operador o ambos segun permisos

## Mapa detallado por servicio

## 1. StateService

Archivo:

- `src/services/state.service.ts`

Rol runtime:

- fuente de verdad de sesion, permisos y contexto de operario activo
- bootstrap global post-login
- normalizacion de roles, areas, maquinas y session storage

Consumidores directos mas criticos:

- guards
- sidebar
- admin
- operator selector
- operator machine selector
- operator form
- schedule
- cualquier componente que consulte `currentUser`, permisos o maquinas

Lee del backend:

- `POST /auth/login`
- `GET /auth/me`
- `GET /roles`
- `GET /machines`
- `GET /users`
- `GET /areas`
- `GET /shifts`
- `GET /permissions`
- `GET /system-config`
- `POST /users/operator-identification`

Escribe en frontend:

- `currentUser`
- `currentShift`
- `activeOperator`
- `adminUsers`
- `adminRoles`
- `adminMachines`
- `plantAreas`
- `plantShifts`
- `permissions`
- `config`

Persistencia local:

- `pflex_user_session`
- `pflex_session`
- `pflex_access_token`
- `pflex_refresh_token`

Contratos y transformaciones importantes:

- `mapAuthUser()` normaliza `role`, `roleName`, `roleCode` y `permissionCodes`
- `mapOperatorUser()` convierte `username` a `dni` de operario hospedado
- `toUiMachineType()` y `toUiMachineStatus()` son parte del contrato de visualizacion reutilizado por admin y schedule
- `identifyOperatorByDni()` persiste el operador activo en la sesion local

Invariantes que no deben romperse:

- `canUseInteractiveSession()` debe seguir bloqueando sesiones de rol operario
- `hasPermission()` es la fuente principal para guards y menus
- `loadBootstrapData()` refresca la base de estado compartida para otros modulos

Acoplamientos conocidos:

- `OrdersService` depende indirectamente de `adminMachines` para hidratar programacion
- `AdminService` vuelve a poblar parte del mismo estado que `StateService` ya bootstrappea

## 2. OrdersService

Archivo:

- `src/features/orders/services/orders.service.ts`

Rol runtime:

- servicio canonico de OTs
- dueno actual de la programacion persistida
- adapter entre `WorkOrder` backend y modelo frontend `OT`

Consumidores directos mas criticos:

- `OtListComponent`
- `ScheduleComponent`
- `OperatorFormComponent`
- `ReportsPackagingComponent`

Lee del backend:

- `GET /work-orders`
- `GET /work-orders/management`
- `GET /work-orders/:id`

Escribe al backend:

- `POST /work-orders`
- `POST /work-orders/bulk-upsert`
- `PUT /work-orders/:id`
- `PATCH /work-orders/:id/status`
- `POST /work-orders/:id/management/enter`
- `POST /work-orders/:id/management/exit`
- `DELETE /work-orders/:id`

Contrato real del backend:

- `work-orders` devuelve la OT mas `raw_payload`
- el backend no expone `scheduleMachineId`, `scheduleStartTime`, `scheduleDurationMinutes`, `scheduleOperator`, `scheduleNotes` y `scheduleDateTime` al nivel superior
- esos campos viven dentro de `raw_payload`

Contrato runtime real en frontend:

- `mapWorkOrder()` reconstruye `schedule*` desde `raw_payload`
- `mapOtToPayload()` vuelve a persistir `schedule*` dentro de `raw_payload`
- `fechaPrd` se espeja contra `fecha_programada_produccion`
- `Estado_pedido` se traduce hacia `status` del backend y viceversa

Implicancia critica:

- hoy `Programacion` no persiste contra un backend de planning
- persiste reescribiendo la OT

Invariantes que no deben romperse:

- `OT` visible debe seguir resolviendose desde `ot_number`
- `mapWorkOrder()` debe seguir devolviendo un shape que `ScheduleComponent` espera
- `saveOt()` puede crear o actualizar y opcionalmente activar la OT en gestion

Acoplamientos conocidos:

- `ScheduleComponent` depende de `schedule*` reconstruido por `OrdersService`
- importacion de OTs y gestion comparten el mismo modelo `OT`

## 3. ScheduleComponent

Archivo:

- `src/features/planning/schedule.component.ts`

Rol runtime:

- UI oficial de programacion
- componente visible congelado
- capa de orquestacion sobre OTs, maquinas y validaciones visuales

Fuentes frontend que consume:

- `OrdersService`
- `StateService`
- `AdminService`
- `QualityService`
- `NotificationService`

Contrato de lectura:

- toma maquinas desde `state.adminMachines()`
- toma OTs en gestion desde `ordersService.reloadManagementOrders()`
- reconstruye `_jobs` usando `mapWorkOrderToScheduledJob()`
- resuelve maquina por:
  - `scheduleMachineId`
  - `codmaquina`
  - `maquina`

Contrato de escritura:

- `saveJob()` no crea una entidad de planning
- llama `ordersService.saveOt()` con:
  - `fechaPrd`
  - `maquina`
  - `codmaquina`
  - `Linea_produccion`
  - `Estado_pedido = PLANIFICADO`
  - `scheduleMachineId`
  - `scheduleStartTime`
  - `scheduleDurationMinutes`
  - `scheduleOperator`
  - `scheduleNotes`
  - `scheduleDateTime`
- `updateMachineStatus()` llama `adminService.updateMachine()`

Contrato visible que no debe alterarse:

- tabs actuales: `IMPRESION`, `TROQUELADO`, `REBOBINADO`
- modal actual de asignacion
- selector visual de estado de maquina
- grid y layout actuales

Invariantes que no deben romperse:

- `filteredMachines` filtra por `Machine.type` ya normalizado a UI
- la persistencia de programacion depende de que `OrdersService` siga reconstruyendo `schedule*`
- la hidratacion de agenda puede esperar a que existan maquinas en `StateService`

Acoplamientos conocidos:

- si cambia el mapping de maquinas en `StateService` o `AdminService`, `ScheduleComponent` puede dejar de resolver maquinas programadas
- si cambia el mapping de `OrdersService`, `_jobs` puede quedar vacio sin que la UI cambie

## 4. ProductionService

Archivo:

- `src/features/reports/services/production.service.ts`

Rol runtime:

- contrato frontend canonico de reportes productivos reales
- adapter entre backend `production/*` y modelos de `reports`

Consumidores directos mas criticos:

- `ReportsPrintComponent`
- `ReportsDiecutComponent`
- `ReportsRewindComponent`
- `ReportsPackagingComponent`
- `OperatorFormComponent`

Lee del backend:

- `GET /production/printing/reports`
- `GET /production/printing/reports/:id`
- `GET /production/diecutting/reports`
- `GET /production/diecutting/reports/:id`
- `GET /production/rewinding/reports`
- `GET /production/rewinding/reports/:id`
- `GET /production/packaging/reports`
- `GET /production/packaging/reports/:id`

Escribe al backend:

- `POST /production/printing/reports`
- `POST /production/diecutting/reports`
- `POST /production/rewinding/reports`
- `POST /production/packaging/reports`
- `PUT /production/packaging/reports/:id`

Contrato de cache local:

- guarda BehaviorSubjects separados para:
  - print
  - diecut
  - rewind
  - packaging
- auto-recarga cuando cambia `currentUser`

Transformaciones importantes:

- `mapPrintReport()`
  - normaliza `activities`, `clise`, `die`, `productionStatus`
- `mapDiecutReport()`
  - normaliza `goodUnits`, `waste`, `activities`, `dieStatus`
- `mapRewindReport()`
  - normaliza `rolls`, `labelsPerRoll`, `totalLabels`, `qualityCheck`
- `mapPackagingReport()`
  - normaliza `status`, `rolls`, `meters`, `demasiaRolls`, `demasiaMeters`

Invariantes que no deben romperse:

- la UI activa espera modelos ya normalizados; no debe consumir DTOs backend crudos
- `create*Report()` crea y luego vuelve a consultar detalle para rehidratar correctamente
- solo `packaging` tiene update supervisado directo en este servicio

Acoplamientos conocidos:

- `reports/*` y `operator/*` comparten el mismo servicio canonico
- cualquier cambio en DTO backend debe cubrir el mapping aqui antes de tocar la UI

## 5. AdminService

Archivo:

- `src/features/admin/services/admin.service.ts`

Rol runtime:

- orquestador canonico del panel admin
- aplica logica de negocio frontend sobre usuarios, roles, maquinas, permisos, areas y configuracion

Consumidores directos mas criticos:

- `AdminUsersComponent`
- `AdminRolesComponent`
- `AdminMachinesComponent`
- `AdminConfigComponent`
- `ScheduleComponent` para update de estado de maquina

Lee del backend:

- `GET /users`
- `GET /roles`
- `GET /machines`
- `GET /permissions`
- `GET /areas`

Escribe al backend:

- usuarios:
  - `POST /users`
  - `PUT /users/:id`
  - `DELETE /users/:id`
  - `POST /users/:id/areas`
  - `DELETE /users/:id/areas/:areaId`
- roles:
  - `POST /roles`
  - `PUT /roles/:id`
  - `DELETE /roles/:id`
- maquinas:
  - `POST /machines`
  - `PUT /machines/:id`
  - `DELETE /machines/:id`
- configuracion:
  - `PUT /system-config`

Transformaciones importantes:

- `mapUser()` normaliza rol, permisos y areas asignadas
- `mapRole()` normaliza permisos y determina `isSystem`
- `mapMachine()` usa `StateService.toUiMachineType()` y `toUiMachineStatus()`
- `resolveRequiredOperatorPlantArea()` depende del catalogo bootstrapeado de areas

Contrato real de maquinas:

- UI trabaja con:
  - `name`
  - `code`
  - `area`
  - `status`
- backend sigue pidiendo `type` y `area_id`
- `AdminService` deriva `type` desde el area seleccionada

Contrato real de configuracion hoy:

- `updateConfig()` solo persiste:
  - `plant_name`
  - `auto_logout_minutes`
  - `password_expiry_warning_days`
  - `password_policy_days`
  - `operator_message`

Invariantes que no deben romperse:

- asignacion de areas de operario depende de normalizacion canonica
- maquinas deben seguir derivando `type` desde `area`
- `refresh()` rellena el estado compartido que consume parte del resto del sistema

Acoplamientos conocidos:

- `ScheduleComponent` usa `adminService.updateMachine()` para el selector de estado
- `StateService` y `AdminService` duplican parte del bootstrap de catalogos

## BackendApiService como registro de endpoints

Archivo:

- `src/services/backend-api.service.ts`

Rol runtime:

- fachada de endpoints
- no contiene logica de negocio
- solo traduce metodo HTTP + ruta + query/body

Importancia para las siguientes fases:

- si se introduce un nuevo backend dedicado, su primer punto de integracion visible suele ser aqui
- tocar este servicio sin actualizar adapters superiores rompe contratos en cascada

Regla:

- no mover transformaciones de negocio aqui
- mantenerlo como thin client

## Mapa UI -> servicio -> backend por flujo critico

### Login anfitrion

1. `LoginComponent`
2. `StateService.login()`
3. `BackendApiService.login()`
4. `POST /auth/login`
5. `StateService.loadBootstrapData()`
6. multiples `GET` de catalogos y sesion

### Identificacion de operario

1. `OperatorSelectorComponent`
2. `StateService.identifyOperatorByDni()`
3. `BackendApiService.identifyOperatorByDni()`
4. `POST /users/operator-identification`
5. se persiste `activeOperator` en sesion local

### Programacion actual

1. `ScheduleComponent`
2. `OrdersService.reloadManagementOrders()`
3. `GET /work-orders/management`
4. `OrdersService.mapWorkOrder()`
5. `ScheduleComponent.mapWorkOrderToScheduledJob()`
6. al guardar:
7. `OrdersService.saveOt()`
8. `POST` o `PUT /work-orders`
9. opcional `POST /work-orders/:id/management/enter`

### Reportes productivos

1. `reports/*` u `operator/*`
2. `ProductionService`
3. `BackendApiService`
4. `production/printing|diecutting|rewinding|packaging`

### Maquinas en admin y schedule

1. `AdminMachinesComponent` o `ScheduleComponent`
2. `AdminService.addMachine()` o `updateMachine()`
3. `BackendApiService.createMachine()` o `updateMachine()`
4. `machines`
5. `AdminService.refresh()`
6. `StateService.adminMachines`
7. `ScheduleComponent.filteredMachines`

## Zonas de alto riesgo

### 1. OrdersService + ScheduleComponent

Riesgo:

- cualquier cambio al mapping `raw_payload <-> schedule*` puede dejar vacia la agenda sin romper compilacion

### 2. StateService + guards

Riesgo:

- cambiar normalizacion de roles o permisos puede romper navegacion, login o acceso a panel operador

### 3. AdminService + maquinas

Riesgo:

- cambiar derivacion `area -> type` puede volver a clasificar mal maquinas en programacion y operador

### 4. ProductionService adapters

Riesgo:

- cambiar shapes backend sin actualizar adapters rompe listados y detalles aunque la UI siga igual

## Reglas de trabajo para puntos siguientes

- si el cambio toca `Programacion`, revisar primero `ScheduleComponent`, `OrdersService`, `StateService` y `AdminService` juntos
- si el cambio toca reportes, revisar primero `ProductionService` y luego el controller/backend correspondiente
- si el cambio toca auth o permisos, revisar `StateService`, `auth.guard.ts` e `index.tsx` como un mismo paquete
- si el cambio toca maquinas, revisar `AdminService`, `StateService` y `ScheduleComponent`
- si el cambio toca OTs, validar siempre que `raw_payload` siga preservando snapshot de agenda

## Decision operativa derivada de este mapa

Hoy el sistema se sostiene sobre estos contratos canonicos:

- sesion y permisos: `StateService`
- OTs y programacion embebida: `OrdersService`
- produccion real: `ProductionService`
- admin y catalogos: `AdminService`
- transporte y envelope: `ApiClientService` + `BackendApiService`

Mientras no exista una migracion cerrada y validada, cualquier nueva logica debe respetar esos contratos antes de intentar sustituirlos.
