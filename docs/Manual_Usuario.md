# Manual de Usuario - Sistema RRHH

## 1. Proposito del sistema
Este sistema centraliza la operacion de Recursos Humanos en una sola plataforma para reducir tareas manuales, errores de planilla y tiempos de respuesta administrativos.

Con este sistema puedes:
- Administrar usuarios y permisos.
- Registrar y mantener empleados.
- Controlar asistencia e incidencias.
- Gestionar vacaciones y licencias.
- Procesar nomina y boletas.
- Administrar reclutamiento, onboarding y evaluaciones.
- Generar documentos y gestionar firma.
- Consultar reportes, auditoria y notificaciones.

## 2. Perfiles de uso
- RRHH Administrador: opera la mayor parte del sistema.
- Jefatura o supervisor: aprueba solicitudes y revisa reportes.
- Empleado: consulta informacion y registra solicitudes segun permisos.
- TI/Soporte: configura acceso, seguridad e integraciones.

Nota: las pantallas visibles dependen de los permisos asignados al usuario.

## 3. Navegacion general
El sistema organiza funciones por modulos en el menu lateral.

Flujo recomendado de trabajo diario:
1. Revisar notificaciones y pendientes.
2. Atender incidencias de asistencia.
3. Procesar solicitudes de vacaciones/licencias.
4. Validar cambios de empleados.
5. Ejecutar tareas del periodo (nomina/reportes).

## 4. Glosario basico
- Incidencia: evento de asistencia que requiere revision (tardanza, ausencia, salida anticipada).
- Solicitud: pedido formal de vacaciones/licencia.
- Aprobacion: validacion oficial de una solicitud.
- Nomina: calculo mensual de pagos y descuentos.
- Concepto de nomina: item que suma o descuenta en planilla.
- Prestamo: deuda del empleado descontada por cuotas.
- Ciclo: periodo de evaluacion de desempeno.

## 5. Modulos y uso paso a paso

## 5.1 Usuarios, Roles y Permisos
Objetivo: controlar quien puede ver y hacer cada accion.

Uso recomendado:
1. Crear rol por funcion real (ejemplo: RRHH, Jefe, Analista).
2. Asignar permisos minimos necesarios.
3. Crear usuario y asociar rol.
4. Verificar acceso con una prueba breve.

Buenas practicas:
- Evitar dar permisos masivos sin necesidad.
- Revisar trimestralmente usuarios inactivos o con permisos excesivos.

## 5.2 Empleados
Objetivo: mantener ficha laboral completa y confiable.

Operaciones comunes:
- Registrar empleado nuevo.
- Editar datos personales/laborales.
- Actualizar estado laboral.
- Consultar historial y datos para reportes.

Datos clave a validar antes de guardar:
- Documento y codigo unicos.
- Fecha de nacimiento y contratacion coherentes.
- Informacion salarial correcta.

Caso real:
1. Llega un nuevo ingreso.
2. RRHH registra ficha y datos contractuales.
3. El sistema habilita su relacion con asistencia, vacaciones y nomina.

## 5.3 Asistencia e Incidencias
Objetivo: controlar jornada y detectar excepciones.

Flujo operativo:
1. Registrar entrada/salida o revisar registros recibidos.
2. Identificar incidencias generadas.
3. Solicitar o revisar justificacion.
4. Aprobar/rechazar segun politica interna.

Recomendaciones:
- Revisar incidencias diariamente.
- No dejar incidencias abiertas al cierre de nomina.
- Documentar razones de aprobacion/rechazo.

## 5.4 Vacaciones
Objetivo: administrar descansos con reglas y saldo disponible.

Flujo:
1. Empleado solicita rango de fechas.
2. Sistema valida cruce con feriados y otras solicitudes.
3. Responsable aprueba o rechaza.
4. Si se aprueba, se descuenta saldo y puede reflejarse en calendario.

Errores comunes:
- Solicitar fechas que se cruzan con licencias previas.
- Solicitar mas dias que el saldo disponible.

## 5.5 Licencias
Objetivo: gestionar permisos por tipo (salud, maternidad, etc.).

Flujo:
1. Registrar solicitud indicando tipo y periodo.
2. Validar limites anuales del tipo de licencia.
3. Aprobar/rechazar.
4. Dejar trazabilidad para auditoria y reportes.

## 5.6 Nomina, Conceptos y Prestamos
Objetivo: calcular pagos y descuentos del periodo de forma consistente.

Proceso mensual recomendado:
1. Cerrar revision de asistencia/incidencias.
2. Verificar conceptos activos (bonos/descuentos).
3. Generar nomina del mes.
4. Revisar casos atipicos.
5. Aprobar nomina.
6. Marcar pago y emitir boletas/reportes.

Prestamos:
- Registrar monto, condiciones y cuotas.
- Verificar cronograma.
- Confirmar que descuentos se apliquen al pagar nomina.

## 5.7 Reclutamiento y Ofertas
Objetivo: ordenar el proceso de contratacion.

Flujo:
1. Crear oferta laboral.
2. Registrar candidatos.
3. Mover candidatos por etapas (postulado, entrevista, oferta, etc.).
4. Registrar resultado final.
5. Si se contrata, convertir candidato a empleado.

## 5.8 Onboarding
Objetivo: asegurar incorporacion ordenada del nuevo colaborador.

Flujo:
1. Seleccionar plantilla de onboarding.
2. Crear proceso para el empleado.
3. Asignar tareas por responsable.
4. Marcar tareas completadas y cerrar proceso.

## 5.9 Evaluaciones
Objetivo: medir desempeno de forma estructurada.

Flujo:
1. Crear ciclo de evaluacion.
2. Activar ciclo.
3. Asignar evaluaciones (auto y evaluador).
4. Registrar puntajes.
5. Cerrar ciclo y revisar resultados.

## 5.10 Documentos y Firma
Objetivo: generar y formalizar documentos internos.

Flujo:
1. Crear/seleccionar plantilla.
2. Generar documento para empleado.
3. Enviar a firma.
4. Firmar o rechazar.
5. Guardar estado final para trazabilidad.

## 5.11 Notificaciones, Reportes y Auditoria
Objetivo: seguimiento y control de gestion.

Uso sugerido:
- Notificaciones: atender pendientes diarios.
- Reportes: revisar indicadores semanales/mensuales.
- Auditoria: consultar cambios sensibles cuando exista duda.

## 6. Escenarios guiados de aprendizaje

### Escenario A: ingreso de un empleado nuevo
1. Crear usuario (si corresponde).
2. Registrar ficha de empleado.
3. Verificar area, puesto y contrato.
4. Crear onboarding.
5. Confirmar aparicion en procesos de asistencia y nomina.

### Escenario B: solicitud de vacaciones
1. Registrar solicitud.
2. Validar que no haya cruces.
3. Aprobar.
4. Confirmar descuento de saldo.
5. Verificar impacto en reportes.

### Escenario C: cierre mensual de nomina
1. Resolver incidencias pendientes.
2. Verificar conceptos y prestamos.
3. Generar nomina del mes.
4. Revisar outliers.
5. Aprobar y pagar.
6. Emitir boletas.

## 7. Errores frecuentes y solucion
- No veo un modulo en menu: revisar permisos del rol.
- No permite aprobar una solicitud: validar estado actual y reglas del proceso.
- Diferencias en nomina: revisar incidencias, conceptos y cuotas de prestamos del periodo.
- Datos de empleado no actualizan: verificar campos obligatorios y unicidad.

## 8. Checklist operativo para administracion

Checklist diario:
1. Revisar notificaciones.
2. Atender incidencias nuevas.
3. Resolver solicitudes pendientes.

Checklist semanal:
1. Revisar altas/bajas de personal.
2. Auditar permisos de usuarios clave.
3. Verificar consistencia de reportes.

Checklist mensual:
1. Cerrar incidencias.
2. Ejecutar y validar nomina.
3. Emitir reportes de gestion.
4. Revisar hallazgos de auditoria.

## 9. Buenas practicas de adopcion
- Estandarizar responsables por modulo.
- Definir tiempos maximos de atencion por solicitud.
- Capacitar por escenarios reales, no solo por pantalla.
- Documentar decisiones de excepcion en comentarios internos.

## 10. Limites y notas importantes
- Algunas funciones dependen de configuracion y permisos.
- Integraciones (correo, webhooks, calendario externo) pueden requerir habilitacion de TI.
- Si un flujo no aparece, validar primero el rol del usuario antes de reportar error.
