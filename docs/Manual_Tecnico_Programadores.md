# Manual Tecnico para Programadores - Sistema RRHH

## 1. Alcance
Este manual documenta el estado actual del proyecto para facilitar mantenimiento, onboarding tecnico y evolucion controlada del sistema sin romper flujos criticos de negocio.

## 2. Stack y arquitectura

## 2.1 Backend
- Plataforma: .NET 8
- API: ASP.NET Core Web API
- Persistencia: Entity Framework Core + SQL Server
- Seguridad: JWT + ApiToken personalizado
- Observabilidad: Serilog (consola + archivo)
- Docs API: Swagger
- Versionado API: v1 (`/api/v1`)

Arquitectura por capas:
- `Hrms.Domain`: entidades de negocio y contratos base.
- `Hrms.Application`: contratos de servicios, DTOs y modelos de aplicacion.
- `Hrms.Infrastructure`: implementaciones de servicios, repositorios, integraciones, seguridad, jobs.
- `Hrms.Api`: composicion, controladores, middlewares y pipeline HTTP.

## 2.2 Frontend
- Framework: React + TypeScript + Vite
- Estilos: Tailwind CSS
- Routing: React Router
- Data fetching: axios + manejo de tokens
- Organizacion: `src/modules` por dominio funcional

## 3. Estructura de carpetas (resumen operativo)
- `backend/src/Hrms.Api`: entrypoint, controllers, middleware, config.
- `backend/src/Hrms.Application`: interfaces y DTOs.
- `backend/src/Hrms.Domain`: entidades, enums, contratos base.
- `backend/src/Hrms.Infrastructure`: EF Core, servicios, seguridad, calendarios, reportes, correo, webhooks.
- `frontend/src/modules`: paginas, hooks, servicios por modulo.
- `frontend/src/services`: cliente HTTP y autenticacion.

## 4. Pipeline de arranque backend (Program.cs)
1. Carga configuracion y logging (Serilog).
2. Registra servicios via DI.
3. Configura autenticacion y autorizacion por permisos.
4. Configura API versioning y Swagger.
5. Aplica middlewares globales (errores, rate limit, auth, etc.).
6. Expone endpoints de salud y API.
7. Ejecuta migraciones y seed al iniciar.

Puntos clave:
- `GlobalExceptionMiddleware` para respuesta uniforme de errores.
- CORS configurable por `AllowedOrigins`.
- Rate limiting por politica (`login`, `api`, `heavy`).

## 5. Seguridad y autorizacion

## 5.1 Modos de autenticacion
- JWT Bearer para usuarios de aplicacion.
- ApiToken Bearer (`hrms_...`) para integraciones externas.

## 5.2 Autorizacion
- Basada en claims de permiso (`AppPermissions`).
- Roles predefinidos en seed (`SUPER_ADMIN`, `HR_MANAGER`, `EMPLOYEE`).
- Scopes en ApiToken mapeados a permisos internos.

## 5.3 Consideraciones de seguridad
- Tokens de integracion se almacenan hasheados.
- Tokens OAuth de calendario se guardan cifrados (Data Protection).
- Existe validacion de URL para webhooks (mitigacion SSRF basica).

## 6. Persistencia y modelo de datos

## 6.1 Base de datos
- SQL Server via EF Core.
- `HrmsDbContext` centraliza DbSets de todos los modulos.
- Convenciones + configuracion explicita de indices, constraints y relaciones.

## 6.2 Entidades principales por dominio
- Seguridad: `User`, `Role`, `Permission`, `RefreshToken`, `ApiToken`.
- RRHH: `Employee`, `Area`, `Position`, `Branch`, `ContractType`.
- Asistencia: `AttendanceRecord`, `AttendanceIncident`.
- Tiempo: `VacationRequest`, `LeaveRequest`, `Holiday`.
- Nomina: `PayrollRecord`, `PayrollConcept`, `PayrollLoan`, `PayrollLoanInstallment`.
- Talento: `RecruitmentCandidate`, `JobPosting`.
- Gestion: `Notification`, `AuditLog`, `GeneralSetting`.
- Desarrollo de talento: `OnboardingTemplate/Process/Task`, `EvaluationCycle/Assignment`.
- Documental: `DocumentTemplate`, `GeneratedDocument`, `DocumentSignature`.
- Integraciones: `WebhookSubscription`, `WebhookDelivery`, `CalendarConnection`, `CalendarFeedToken`, `CalendarSyncEvent`.

## 6.3 Reglas de integridad detectadas
- Indices unicos para claves naturales importantes (correo normalizado, codigo empleado, documento, etc.).
- Constraints de estado para evitar transiciones invalidas.
- Restricciones de borrado segun entidad (`Restrict`, `Cascade`, `SetNull`).
- Soft delete en entidades auditables.

## 7. Modulos backend y logica principal

## 7.1 Empleados
Servicios: `EmployeeService`.

Reglas:
- Documento valido y unico.
- Edad minima.
- Fechas coherentes (nacimiento/ingreso).
- Salario no negativo.
- Borrado logico.

## 7.2 Asistencia e incidencias
Servicios: `AttendanceService`, `AttendanceIncidentService`.

Reglas:
- Check-in/check-out con validaciones de secuencia.
- Deteccion automatica de tardanza/ausencia/salida anticipada.
- Justificacion y expiracion de incidencias por ventana configurable.

Job asociado:
- `AttendanceIncidentExpirationService` (expira incidencias pendientes).

## 7.3 Vacaciones y licencias
Servicios: `VacationService`, `LeaveService`.

Reglas:
- Validacion de solape.
- Verificacion de dias habiles y feriados.
- Limites anuales por configuracion.
- Flujo de estados con aprobacion/rechazo/cancelacion.

## 7.4 Nomina, conceptos y prestamos
Servicios: `PayrollService`, `PayrollConceptService`, `PayrollLoanService`.

Reglas:
- Generacion por periodo (anio/mes).
- Composicion de ingresos y descuentos automaticos/manuales.
- Integracion con incidencias y cuotas de prestamos.
- Flujo de estado de nomina (draft/approved/paid).
- Generacion de boletas PDF y exportables.

## 7.5 Reclutamiento y ofertas
Servicios: `RecruitmentService`, `JobPostingService`.

Reglas:
- Flujo de estados de candidato con transiciones permitidas.
- Razon obligatoria de rechazo.
- Conversion a empleado solo en estado contratado y una sola vez.

## 7.6 Onboarding, evaluaciones y documentos
Servicios: `OnboardingService`, `EvaluationService`, `DocumentService`.

Reglas:
- Procesos por plantilla para onboarding.
- Ciclos de evaluacion (draft/active/closed).
- Firma documental con hash y estados controlados.

## 7.7 Integraciones
Servicio: `IntegrationService`, `CalendarSyncService`, proveedores OAuth.

Funcionalidad:
- Emision/revocacion/rotacion de ApiTokens.
- Gestion y entrega de webhooks con firma y reintentos.
- Feed ICS publico por token.
- Sincronizacion de eventos de vacaciones/licencias con Google/Microsoft.

Job asociado:
- `WebhookDeliveryRetentionService` para limpieza de historico.

## 8. Endpoints y controladores (mapa)
Controladores principales:
- `AuthController`, `AccountController`.
- `UsersController`, `RolesController`, `PermissionsController`.
- `EmployeesController`, `AreasController`, `PositionsController`, `ConfigurationController`.
- `AttendanceController`, `AttendanceIncidentsController`, `HolidaysController`.
- `VacationsController`, `LeavesController`.
- `PayrollController`, `PayrollConceptsController`, `PayrollLoansController`.
- `RecruitmentController`, `JobPostingsController`.
- `ReportsController`, `AnalyticsController`, `AuditLogsController`.
- `NotificationsController`, `OnboardingController`, `EvaluationsController`, `DocumentsController`.
- `IntegrationsController`.

Convencion de rutas:
- Prefijo versionado: `/api/v1/{recurso}`.
- Endpoints publicos limitados (ejemplo: feed ICS tokenizado).

## 9. Integracion frontend-backend

Flujo general:
1. Front realiza login y almacena access/refresh token.
2. `httpClient` agrega token Bearer en requests.
3. Ante 401, intenta refresh.
4. Se renderizan rutas segun autenticacion y permisos.

Dependencia funcional:
- Modulos de `frontend/src/modules` consumen endpoints homonimos.
- Sidebar/topbar condicionan visibilidad segun permisos.
- Reportes e integraciones dependen fuertemente de backend.

## 10. Configuracion relevante
- `ConnectionStrings:DefaultConnection`.
- `Jwt` (issuer, audience, signing key, expiraciones).
- `Cors:AllowedOrigins`.
- `Smtp` (si notificaciones por correo estan activas).
- OAuth providers (Google/Microsoft) para calendario.
- Parametros de negocio en `GeneralSettings`.

## 11. Flujos transversales importantes

### 11.1 Flujo de aprobacion (vacaciones/licencias)
1. Registro de solicitud.
2. Validaciones de reglas y solapes.
3. Cambio de estado por aprobador.
4. Emision de notificaciones y eventos.

### 11.2 Flujo de cierre de nomina
1. Preparar datos de asistencia/incidencias.
2. Generar planilla.
3. Revisar excepciones.
4. Aprobar y pagar.
5. Emitir boletas/exportables.

### 11.3 Flujo de integraciones por evento
1. Evento de negocio en modulo core.
2. Construccion payload.
3. Entrega webhook (con firma/reintento).
4. Registro en historial de delivery.

## 12. Riesgos tecnicos y zonas delicadas
- Alto acoplamiento en reglas de nomina con asistencia y prestamos.
- Complejidad de estados (candidato, documento, evaluacion, vacaciones/licencias).
- Integraciones externas sensibles a configuracion y conectividad.
- Duplicados de archivos en frontend que pueden introducir confusion de mantenimiento.
- Ausencia visible de bateria de pruebas robusta.

## 13. Guia de mantenimiento seguro
1. No cambiar reglas de estado sin matriz de transiciones.
2. Probar nomina con datasets controlados antes de liberar.
3. Versionar contratos de webhooks si hay consumidores externos.
4. Registrar migraciones DB con checklist de rollback.
5. Auditar permisos en cada release.

## 14. Recomendaciones tecnicas prioritarias
1. Implementar tests unitarios de servicios criticos (nomina, vacaciones/licencias, reclutamiento).
2. Agregar tests de integracion API para endpoints sensibles.
3. Limpiar artefactos frontend duplicados en `src`.
4. Fortalecer observabilidad (metricas y trazas por modulo).
5. Documentar runbook de operacion y recovery.

## 15. Supuestos y limitaciones de este manual
- El manual describe el estado actual del codigo revisado.
- No confirma configuraciones reales de produccion.
- Si existen ramas locales no visibles, pueden existir diferencias funcionales.
