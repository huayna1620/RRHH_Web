import { useEffect, useMemo, useRef, useState, type JSX } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import jsPDF from "jspdf";
import { Cell, Pie, PieChart, Tooltip } from "recharts";
import { ExportMenu } from "@/components/export/ExportMenu";
import { exportRows, makeFileName, type ExportFormat } from "@/components/export/exportUtils";
import {
  createDocument,
  createDocumentTemplate,
  deleteDocumentTemplate,
  getDocument,
  getDocumentTemplates,
  getDocuments,
  rejectDocument,
  sendDocumentByEmail,
  sendForSignature,
  signDocument,
} from "@/modules/documents/services/documentsApi";
import { getEmployees } from "@/modules/employees/services/employeesApi";
import type { EmployeeListItem } from "@/modules/employees/types/employee.types";
import type { DocumentTemplate, EmployeeDocument } from "@/modules/documents/types/documents.types";

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastState = { type: "success" | "error"; message: string } | null;
type ConfirmState = { title: string; message: string; danger?: boolean; onConfirm: () => void } | null;

type TplForm = {
  name: string; type: string; category: string;
  htmlContent: string; description: string;
  requiresSign: boolean; requiresHrSign: boolean; isActive: boolean;
};

type DocForm = {
  employeeId: string; type: string; title: string;
  templateId: string; htmlContent: string; expiresAtUtc: string;
  variableValues: Record<string, string>;
};

type FormErrors = Partial<Record<string, string>>;

type EmailForm = { to: string; subject: string; message: string };

// ─── Catalog ──────────────────────────────────────────────────────────────────

type CatalogEntry = {
  id: number; name: string; category: string; type: string;
  description: string; requiresSign: boolean; requiresHrSign: boolean; icon: string;
};

const CATALOG: CatalogEntry[] = [
  // Contratos
  { id:  1, icon:"📋", category:"Contratos",                  type:"Contrato",     requiresSign:true,  requiresHrSign:true,  name:"Contrato de trabajo indefinido",          description:"Contrato a tiempo indefinido para personal en planilla."                                },
  { id:  2, icon:"📋", category:"Contratos",                  type:"Contrato",     requiresSign:true,  requiresHrSign:true,  name:"Contrato de trabajo temporal",             description:"Contrato laboral con fecha de término definida."                                        },
  { id:  3, icon:"📋", category:"Contratos",                  type:"Contrato",     requiresSign:true,  requiresHrSign:true,  name:"Contrato por locación de servicios",       description:"Para prestadores de servicios independientes y consultores."                           },
  { id:  4, icon:"📋", category:"Contratos",                  type:"Contrato",     requiresSign:true,  requiresHrSign:true,  name:"Contrato de prácticas preprofesionales",   description:"Para practicantes en proceso de formación universitaria."                              },
  { id:  5, icon:"📋", category:"Contratos",                  type:"Contrato",     requiresSign:true,  requiresHrSign:true,  name:"Contrato de prácticas profesionales",      description:"Para practicantes con carrera técnica o universitaria concluida."                     },
  { id:  6, icon:"📋", category:"Contratos",                  type:"Contrato",     requiresSign:true,  requiresHrSign:true,  name:"Adenda de contrato",                       description:"Modificación formal a las condiciones de un contrato vigente."                        },
  { id:  7, icon:"📋", category:"Contratos",                  type:"Contrato",     requiresSign:true,  requiresHrSign:true,  name:"Renovación de contrato",                   description:"Prórroga o renovación de un contrato con nuevas condiciones."                         },
  // Políticas y cumplimiento
  { id:  8, icon:"🔒", category:"Políticas y cumplimiento",   type:"Política",     requiresSign:true,  requiresHrSign:false, name:"Política de confidencialidad",             description:"Compromiso de no divulgar información sensible de la empresa."                       },
  { id:  9, icon:"🔒", category:"Políticas y cumplimiento",   type:"Política",     requiresSign:true,  requiresHrSign:false, name:"Compromiso de protección de datos",        description:"Consentimiento de tratamiento de datos personales del colaborador."                  },
  { id: 10, icon:"🔒", category:"Políticas y cumplimiento",   type:"Política",     requiresSign:true,  requiresHrSign:false, name:"Política de uso de equipos",               description:"Normas para el uso correcto de equipos asignados por la empresa."                    },
  { id: 11, icon:"🔒", category:"Políticas y cumplimiento",   type:"Política",     requiresSign:true,  requiresHrSign:false, name:"Política de seguridad de la información",  description:"Lineamientos de ciberseguridad y manejo de información digital."                     },
  { id: 12, icon:"🔒", category:"Políticas y cumplimiento",   type:"Declaración",  requiresSign:true,  requiresHrSign:false, name:"Declaración de conflicto de interés",      description:"Declaración jurada sobre ausencia de conflictos de interés."                        },
  { id: 13, icon:"🔒", category:"Políticas y cumplimiento",   type:"Acuse",        requiresSign:true,  requiresHrSign:false, name:"Recepción de reglamento interno",          description:"Constancia de recepción del reglamento interno de trabajo."                         },
  { id: 14, icon:"🔒", category:"Políticas y cumplimiento",   type:"Política",     requiresSign:true,  requiresHrSign:false, name:"Código de ética y conducta",               description:"Compromisos de conducta ética y profesional del trabajador."                        },
  // Documentos laborales
  { id: 15, icon:"📬", category:"Documentos laborales",       type:"Carta",        requiresSign:false, requiresHrSign:true,  name:"Carta de nombramiento",                    description:"Comunicación oficial de designación a un nuevo cargo o función."                    },
  { id: 16, icon:"📬", category:"Documentos laborales",       type:"Carta",        requiresSign:false, requiresHrSign:true,  name:"Carta de ascenso",                         description:"Comunicación formal de promoción de cargo con nuevo nivel salarial."                },
  { id: 17, icon:"📬", category:"Documentos laborales",       type:"Carta",        requiresSign:false, requiresHrSign:true,  name:"Carta de cambio de sede",                  description:"Notificación formal de cambio de lugar de trabajo del colaborador."                 },
  { id: 18, icon:"📬", category:"Documentos laborales",       type:"Carta",        requiresSign:false, requiresHrSign:true,  name:"Carta de cambio de cargo",                 description:"Comunicación de reasignación de funciones dentro de la empresa."                   },
  { id: 19, icon:"📬", category:"Documentos laborales",       type:"Carta",        requiresSign:false, requiresHrSign:true,  name:"Carta de vacaciones aprobadas",            description:"Autorización formal del periodo vacacional del colaborador."                        },
  { id: 20, icon:"📬", category:"Documentos laborales",       type:"Carta",        requiresSign:true,  requiresHrSign:true,  name:"Carta de amonestación",                    description:"Comunicación formal de sanción disciplinaria con detalle de la falta."             },
  { id: 21, icon:"📬", category:"Documentos laborales",       type:"Carta",        requiresSign:false, requiresHrSign:true,  name:"Carta de felicitación",                    description:"Reconocimiento formal al colaborador por logros destacados."                        },
  { id: 22, icon:"📬", category:"Documentos laborales",       type:"Constancia",   requiresSign:false, requiresHrSign:true,  name:"Constancia de trabajo",                    description:"Certificación de la relación laboral activa del colaborador."                       },
  { id: 23, icon:"📬", category:"Documentos laborales",       type:"Certificado",  requiresSign:false, requiresHrSign:true,  name:"Certificado laboral",                      description:"Certificación detallada del cargo, funciones y periodo laborado."                  },
  // Anexos y autorizaciones
  { id: 24, icon:"📎", category:"Anexos y autorizaciones",    type:"Anexo",        requiresSign:true,  requiresHrSign:true,  name:"Anexo de beneficios",                      description:"Detalle de los beneficios contractuales y extralegales del colaborador."           },
  { id: 25, icon:"📎", category:"Anexos y autorizaciones",    type:"Anexo",        requiresSign:true,  requiresHrSign:true,  name:"Anexo salarial",                           description:"Estructura detallada de la remuneración mensual acordada."                         },
  { id: 26, icon:"📎", category:"Anexos y autorizaciones",    type:"Acuerdo",      requiresSign:true,  requiresHrSign:true,  name:"Acuerdo de teletrabajo",                   description:"Términos y condiciones para el trabajo remoto o modalidad híbrida."               },
  { id: 27, icon:"📎", category:"Anexos y autorizaciones",    type:"Autorización", requiresSign:true,  requiresHrSign:false, name:"Permiso de uso de imagen",                 description:"Autorización del colaborador para uso de su imagen en comunicaciones."            },
  { id: 28, icon:"📎", category:"Anexos y autorizaciones",    type:"Autorización", requiresSign:true,  requiresHrSign:false, name:"Autorización de descuento por planilla",   description:"Consentimiento para aplicar descuentos o retenciones en planilla."                 },
  { id: 29, icon:"📎", category:"Anexos y autorizaciones",    type:"Autorización", requiresSign:true,  requiresHrSign:false, name:"Consentimiento de firma digital",           description:"Aceptación del uso de firma electrónica en documentos laborales."                  },
  { id: 30, icon:"📎", category:"Anexos y autorizaciones",    type:"Acta",         requiresSign:true,  requiresHrSign:true,  name:"Entrega y recepción de equipos",           description:"Registro de equipos, credenciales y activos asignados al colaborador."            },
  // Evaluación y talento
  { id: 31, icon:"⭐", category:"Evaluación y talento",       type:"Evaluación",   requiresSign:true,  requiresHrSign:true,  name:"Evaluación de desempeño",                  description:"Formulario de evaluación de resultados y competencias del periodo."               },
  { id: 32, icon:"⭐", category:"Evaluación y talento",       type:"Evaluación",   requiresSign:true,  requiresHrSign:false, name:"Acta de retroalimentación",                description:"Registro del proceso de feedback entre líder y colaborador."                       },
  { id: 33, icon:"⭐", category:"Evaluación y talento",       type:"Carta",        requiresSign:true,  requiresHrSign:true,  name:"Carta de objetivos del periodo",           description:"Compromisos de desempeño y metas acordadas para el nuevo periodo."               },
  { id: 34, icon:"⭐", category:"Evaluación y talento",       type:"Plan",         requiresSign:true,  requiresHrSign:true,  name:"Plan de mejora individual",                description:"Acompañamiento para colaboradores en proceso de mejora continua."                 },
  // Salud y seguridad
  { id: 35, icon:"🦺", category:"Salud y seguridad",          type:"Registro",     requiresSign:true,  requiresHrSign:false, name:"Registro de capacitación",                 description:"Constancia de participación en programa de formación o capacitación."             },
  { id: 36, icon:"🦺", category:"Salud y seguridad",          type:"Compromiso",   requiresSign:true,  requiresHrSign:false, name:"Compromiso de seguridad y salud",          description:"Declaración de compromisos en materia de seguridad y salud en el trabajo."       },
  { id: 37, icon:"🦺", category:"Salud y seguridad",          type:"Declaración",  requiresSign:true,  requiresHrSign:false, name:"Declaración médica ocupacional",           description:"Declaración del estado de salud general para aptitud al puesto."                 },
  { id: 38, icon:"🦺", category:"Salud y seguridad",          type:"Constancia",   requiresSign:true,  requiresHrSign:false, name:"Constancia de inducción",                  description:"Acreditación de la inducción corporativa al nuevo colaborador."                   },
];

const CATALOG_CATEGORIES = [...new Set(CATALOG.map((e) => e.category))];
const DOC_TYPES = ["Contrato","Carta","Política","Certificado","Acuerdo","Evaluación","Anexo","Autorización","Constancia","Declaración","Acta","Registro","Plan","Otro"];
const VARIABLES = ["{{NOMBRE_COMPLETO}}","{{DNI}}","{{CARGO}}","{{ÁREA}}","{{SEDE}}","{{FECHA_INGRESO}}","{{SUELDO}}","{{CORREO}}","{{JEFE_DIRECTO}}","{{EMPRESA}}","{{FECHA_ACTUAL}}","{{CÓDIGO_EMPLEADO}}","{{DEPARTAMENTO}}","{{NRO_DOCUMENTO}}","{{CONTRATO_INICIO}}"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" });
}

function initials(name: string): string {
  return name.split(" ").slice(0, 2).map((w) => w[0] ?? "").join("").toUpperCase();
}

function avatarBg(name: string): string {
  const colors = ["bg-indigo-500","bg-emerald-500","bg-blue-500","bg-violet-500","bg-teal-500","bg-cyan-500"];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return colors[h % colors.length];
}

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  draft:             { label: "Borrador",        bg: "bg-slate-100",  text: "text-slate-600",  dot: "bg-slate-400"  },
  pending_signature: { label: "Pendiente firma", bg: "bg-amber-100",  text: "text-amber-700",  dot: "bg-amber-500"  },
  signed:            { label: "Firmado",         bg: "bg-emerald-100",text: "text-emerald-700",dot: "bg-emerald-500"},
  rejected:          { label: "Rechazado",       bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-500"    },
  expired:           { label: "Vencido",         bg: "bg-red-100",    text: "text-red-700",    dot: "bg-red-500"    },
  expiring_soon:     { label: "Por vencer",      bg: "bg-orange-100", text: "text-orange-700", dot: "bg-orange-500" },
};

const categoryStyle: Record<string, string> = {
  "Contratos":                "bg-blue-50 text-blue-700 border-blue-200",
  "Políticas y cumplimiento": "bg-red-50 text-red-700 border-red-200",
  "Documentos laborales":     "bg-purple-50 text-purple-700 border-purple-200",
  "Anexos y autorizaciones":  "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Evaluación y talento":     "bg-amber-50 text-amber-700 border-amber-200",
  "Salud y seguridad":        "bg-teal-50 text-teal-700 border-teal-200",
};

function getEffectiveStatus(doc: EmployeeDocument): string {
  if (doc.status === "signed" && doc.expiresAtUtc) {
    const days = (new Date(doc.expiresAtUtc).getTime() - Date.now()) / 86400000;
    if (days < 0) return "expired";
    if (days <= 30) return "expiring_soon";
  }
  return doc.status;
}

function daysUntil(iso: string): number {
  return Math.round((new Date(iso).getTime() - Date.now()) / 86400000);
}

function defaultHtmlFor(entry: CatalogEntry): string {
  return `<h2>${entry.name.toUpperCase()}</h2>

<p class="letter-date">Lima, {{FECHA_ACTUAL}}</p>

<p>Señor(a):<br>
<strong>{{NOMBRE_COMPLETO}}</strong><br>
{{CARGO}} - {{AREA}}</p>

<p>De nuestra consideración:</p>

<p>Por medio del presente, <strong>{{EMPRESA}}</strong>, a través del área de Recursos Humanos, emite el documento <strong>${entry.name}</strong> conforme a la información registrada en el sistema SAE - RRHH.</p>

<section class="employee-data">
  <dl>
    <dt>Colaborador</dt><dd>{{NOMBRE_COMPLETO}}</dd>
    <dt>DNI / CE</dt><dd>{{DNI}}</dd>
    <dt>Codigo</dt><dd>{{CODIGO_EMPLEADO}}</dd>
    <dt>Cargo</dt><dd>{{CARGO}}</dd>
    <dt>Area</dt><dd>{{AREA}}</dd>
    <dt>Sede</dt><dd>{{SEDE}}</dd>
    <dt>Ingreso</dt><dd>{{FECHA_INGRESO}}</dd>
  </dl>
</section>

<p>{{MENSAJE}}</p>

<p>El presente documento se emite para los fines administrativos y laborales que correspondan, dejando constancia de su generación, trazabilidad y resguardo documental dentro de SAE - RRHH.</p>

<p>Atentamente,</p>

<section class="signature-grid">
  <div class="signature-box">
    <strong>{{NOMBRE_COMPLETO}}</strong>
    <small>DNI: {{DNI}}</small>
    <small>Colaborador</small>
  </div>
  <div class="signature-box">
    <strong>Recursos Humanos</strong>
    <small>{{EMPRESA}}</small>
    <small>Representante autorizado</small>
  </div>
</section>`;
}

function blankTplForm(): TplForm {
  return { name:"", type:"", category:"", htmlContent:"", description:"", requiresSign:true, requiresHrSign:false, isActive:true };
}

function blankDocForm(): DocForm {
  return { employeeId:"", type:"", title:"", templateId:"", htmlContent:"", expiresAtUtc:"", variableValues: {} };
}

function removeAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeVariableName(value: string): string {
  return removeAccents(value.replace(/[{}]/g, "").trim()).toUpperCase().replace(/\s+/g, "_");
}

function extractVariables(html: string): string[] {
  const matches = html.matchAll(/\{\{\s*([^{}]+?)\s*\}\}/g);
  const byKey = new Map<string, string>();
  for (const match of matches) {
    const raw = match[1]?.trim();
    if (!raw) continue;
    const key = normalizeVariableName(raw);
    if (!byKey.has(key)) byKey.set(key, raw);
  }
  return Array.from(byKey.values()).sort((a, b) => a.localeCompare(b, "es"));
}

function variableLabel(variable: string): string {
  return normalizeVariableName(variable)
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function variableInputType(variable: string): "text" | "date" | "number" | "email" {
  const key = normalizeVariableName(variable);
  if (key.includes("FECHA")) return "date";
  if (["SUELDO", "SALARIO", "MONTO", "IMPORTE"].some((item) => key.includes(item))) return "number";
  if (key.includes("CORREO") || key.includes("EMAIL")) return "email";
  return "text";
}

function formatDateInput(iso: string | null | undefined): string {
  return iso ? new Date(iso).toISOString().slice(0, 10) : "";
}

function formatTemplateDate(value: string): string {
  return value ? new Date(`${value}T00:00:00`).toLocaleDateString("es-PE", { day: "2-digit", month: "2-digit", year: "numeric" }) : "";
}

function employeeVariableValue(variable: string, employee?: EmployeeListItem): string {
  const key = normalizeVariableName(variable);
  const today = new Date().toISOString().slice(0, 10);

  if (key === "FECHA_ACTUAL") return today;
  if (key === "EMPRESA") return "Empresa Demo SAC";
  if (key === "MENSAJE") return "Se reconoce y comunica formalmente la informacion contenida en este documento, quedando registrada para los fines laborales correspondientes.";
  if (!employee) return "";

  const values: Record<string, string> = {
    NOMBRE_COMPLETO: employee.fullName,
    DNI: employee.documentNumber,
    DOCUMENTO: employee.documentNumber,
    NRO_DOCUMENTO: employee.documentNumber,
    CARGO: employee.position,
    AREA: employee.area,
    DEPARTAMENTO: employee.area,
    SEDE: employee.branch,
    FECHA_INGRESO: formatDateInput(employee.hireDate),
    SUELDO: String(employee.baseSalary ?? ""),
    SALARIO: String(employee.baseSalary ?? ""),
    CODIGO_EMPLEADO: employee.employeeCode,
  };

  return values[key] ?? "";
}

function mergeVariableDefaults(html: string, employee: EmployeeListItem | undefined, current: Record<string, string>): Record<string, string> {
  const next = { ...current };
  for (const variable of extractVariables(html)) {
    if (!next[variable]) next[variable] = employeeVariableValue(variable, employee);
  }
  return next;
}

function renderTemplate(html: string, values: Record<string, string>): string {
  return html.replace(/\{\{\s*([^{}]+?)\s*\}\}/g, (_match, raw: string) => {
    const variable = raw.trim();
    const direct = values[variable];
    if (direct) {
      return variableInputType(variable) === "date" ? formatTemplateDate(direct) : direct;
    }

    const normalized = normalizeVariableName(variable);
    const alias = Object.entries(values).find(([key]) => normalizeVariableName(key) === normalized);
    if (!alias?.[1]) return `<mark style="background:#fef3c7;color:#92400e;padding:0 3px;border-radius:3px">{{${variable}}}</mark>`;
    return variableInputType(variable) === "date" ? formatTemplateDate(alias[1]) : alias[1];
  });
}

function safeFilePart(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w.-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase() || "documento";
}

function documentFileName(doc: EmployeeDocument, ext: "html" | "pdf"): string {
  return `${safeFilePart(doc.title)}_${safeFilePart(doc.employeeCode)}.${ext}`;
}

function escapeHtml(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

type FormalDocumentModel = {
  title: string;
  type: string;
  status: string;
  employeeName: string;
  employeeCode: string;
  createdAtUtc: string;
  expiresAtUtc?: string | null;
  htmlContent: string;
  signatureHash?: string | null;
};

function formalDocumentStyles(): string {
  return `
    :root { color-scheme: light; }
    @page { size: A4; margin: 0; }
    body { margin: 0; background: #e5e7eb; color: #112946; font-family: Arial, "Segoe UI", sans-serif; }
    .sae-print-wrap { padding: 24px 0; }
    .sae-document {
      width: 794px;
      min-height: 1123px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #d8e7e8;
      box-shadow: 0 22px 54px rgba(15, 23, 42, 0.24);
      position: relative;
      overflow: hidden;
      box-sizing: border-box;
    }
    .sae-document:before {
      content: "";
      position: absolute;
      left: 0; right: 0; bottom: 0;
      height: 20px;
      background: linear-gradient(90deg, #102a46 0 78%, #009688 78% 100%);
    }
    .sae-ribbon {
      position: absolute;
      right: 43px;
      top: 0;
      width: 39px;
      height: 98px;
      background: linear-gradient(180deg, #009688, #007f78);
      clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 84%, 0 100%);
      box-shadow: 0 10px 24px rgba(15, 118, 110, .28);
    }
    .sae-paper { padding: 31px 42px 58px; box-sizing: border-box; }
    .sae-header { display: flex; align-items: center; justify-content: space-between; gap: 24px; padding-bottom: 18px; border-bottom: 1.6px solid #77c8c1; }
    .sae-brand { display: flex; align-items: center; gap: 14px; }
    .sae-logo {
      width: 65px; height: 65px; border-radius: 11px;
      background: linear-gradient(135deg, #009688, #007f78);
      color: #fff; display: flex; align-items: center; justify-content: center;
      font-size: 24px; font-weight: 900; letter-spacing: .04em; box-shadow: 0 12px 24px rgba(15, 118, 110, .24);
    }
    .sae-brand-title { margin: 0; font-size: 22px; font-weight: 900; letter-spacing: .01em; color: #173454; }
    .sae-brand-subtitle { margin: 5px 0 0; font-size: 9.5px; color: #64748b; }
    .sae-doc-code { text-align: right; font-size: 11px; color: #64748b; line-height: 1.5; }
    .sae-ornament { text-align: center; color: transparent; margin: 27px 0 10px; font-size: 0; letter-spacing: 0; }
    .sae-ornament:before, .sae-ornament:after { content: ""; display: inline-block; width: 72px; height: 1px; background: #c6e7e3; vertical-align: middle; margin: 0 12px; }
    .sae-title { text-align: center; margin: 9px auto 29px; max-width: 620px; }
    .sae-title h1 { margin: 0; font-family: Georgia, "Times New Roman", serif; font-size: 31px; line-height: 1.2; color: #173454; letter-spacing: 0; font-weight: 800; }
    .sae-title p { margin: 17px auto 0; font-size: 14px; font-weight: 800; color: #007f78; text-transform: uppercase; letter-spacing: .08em; }
    .sae-title p:before, .sae-title p:after { content: ""; display: inline-block; width: 56px; height: 1px; background: #d7eeeb; vertical-align: middle; margin: 0 12px; }
    .sae-summary {
      display: grid; grid-template-columns: repeat(2, 1fr); gap: 0;
      border: 1.5px solid #7ecdc6; border-radius: 12px; overflow: hidden;
      margin: 0 auto 34px;
      width: 620px;
      background: #ffffff;
    }
    .sae-summary-item { display: grid; grid-template-columns: 42px 1fr; gap: 12px; align-items: center; padding: 16px 20px; min-height: 78px; border-right: 1px solid #d7eeeb; border-bottom: 1px solid #d7eeeb; box-sizing: border-box; }
    .sae-summary-item:nth-child(2n) { border-right: 0; }
    .sae-summary-item:nth-child(n+3) { border-bottom: 0; }
    .sae-summary-icon { width: 30px; height: 30px; border-radius: 999px; border: 1px solid #8dd5ce; background: #effdfa; position: relative; color: transparent; font-size: 0; overflow: hidden; }
    .sae-summary-icon:before { content: ""; position: absolute; inset: 10px; border-radius: 999px; background: #009688; box-shadow: 0 0 0 5px rgba(0, 150, 136, .12); }
    .sae-summary-item span { display: block; font-size: 8.8px; font-weight: 900; color: #007f78; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 5px; }
    .sae-summary-item strong { display: block; font-family: Georgia, "Times New Roman", serif; font-size: 13px; color: #173454; line-height: 1.28; }
    .sae-body {
      font-family: Georgia, "Times New Roman", serif;
      font-size: 13.4px;
      line-height: 1.72;
      color: #173454;
      max-width: 650px;
      margin: 0 auto;
      text-align: left;
    }
    .sae-body h1, .sae-body h2, .sae-body h3 {
      font-family: "Inter", "Segoe UI", Arial, sans-serif;
      color: #0f172a;
      line-height: 1.25;
      text-align: center;
      margin: 22px 0 13px;
    }
    .sae-body h2 { font-size: 16px; letter-spacing: .045em; text-transform: uppercase; color: #007f78; }
    .sae-body .letter-date { text-align: right; margin-bottom: 18px; color: #334155; }
    .sae-body p { margin: 0 0 13px; max-width: none; text-align: justify; }
    .sae-body table { width: 100%; border-collapse: collapse; margin: 20px 0; font-family: Arial, "Segoe UI", sans-serif; font-size: 11px; }
    .sae-body td, .sae-body th { border: 1px solid #dbe7ea; padding: 8px 10px; vertical-align: top; }
    .sae-body .employee-data, .sae-body .document-card {
      font-family: "Inter", "Segoe UI", Arial, sans-serif;
      background: #f8fafc;
      border: 1px solid #dbeafe;
      border-left: 4px solid #0f766e;
      border-radius: 14px;
      padding: 16px 18px;
      margin: 20px 0 24px;
      text-align: left;
    }
    .sae-body .employee-data { border: 0; border-radius: 0; background: transparent; padding: 0; margin: 24px 0 26px; max-width: none; width: 100%; }
    .sae-body .employee-data dl { display: grid; grid-template-columns: 165px 1fr; gap: 0; margin: 0; border-top: 1px solid #cfe2e5; }
    .sae-body .employee-data dt, .sae-body .employee-data dd { border-bottom: 1px solid #cfe2e5; padding: 7px 10px; }
    .sae-body .employee-data dt { font-family: Arial, "Segoe UI", sans-serif; font-weight: 900; font-size: 11px; color: #173454; background: #fbfefe; }
    .sae-body .employee-data dd { margin: 0; color: #173454; font-size: 11.5px; background: #ffffff; }
    .sae-body .signature-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 96px;
      margin: 58px auto 0;
      max-width: 640px;
      font-family: Arial, "Segoe UI", sans-serif;
      page-break-inside: avoid;
    }
    .sae-body .signature-box { text-align: center; padding-top: 18px; border-top: 1.8px solid #7fcac3; color: #334155; position: relative; min-height: 58px; }
    .sae-body .signature-box:before { content: ""; display: none; }
    .sae-body .signature-box strong { display: block; color: #0f172a; margin-bottom: 3px; font-size: 12px; }
    .sae-body .signature-box small { display: block; color: #64748b; line-height: 1.38; font-size: 10px; }
    .sae-signature {
      margin-top: 34px; padding: 12px 14px; border: 1px dashed #cbd5e1; border-radius: 12px;
      font-size: 10.5px; color: #64748b; background: #f8fafc; overflow-wrap: anywhere;
    }
    .sae-footer {
      display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-top: 54px; padding-top: 14px;
      border-top: 1.5px solid #9bd8d2; font-size: 10px; color: #64748b;
    }
    .sae-footer:before { content: ""; width: 42px; height: 2px; border-radius: 999px; background: #009688; position: absolute; left: 50%; transform: translateX(-50%); }
    @media print {
      body { background: #fff; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .sae-print-wrap { padding: 0; }
      .sae-document { width: 210mm; min-height: 297mm; max-width: none; border: 0; box-shadow: none; }
      .sae-paper { padding: 10mm 11mm 15mm; }
    }
  `;
}

function buildFormalDocumentBody(model: FormalDocumentModel): string {
  const expires = model.expiresAtUtc ? fmtDate(model.expiresAtUtc) : "Sin vencimiento";
  return `
    <div class="sae-print-wrap">
      <article class="sae-document">
        <div class="sae-ribbon"></div>
        <section class="sae-paper">
          <header class="sae-header">
            <div class="sae-brand">
              <div class="sae-logo">SAE</div>
              <div>
                <p class="sae-brand-title">SAE - RRHH</p>
                <p class="sae-brand-subtitle">Documento laboral generado desde el sistema</p>
              </div>
            </div>
            <div class="sae-doc-code">
              <div><strong>Código:</strong> ${escapeHtml(model.employeeCode || "N/D")}</div>
              <div><strong>Emisión:</strong> ${escapeHtml(fmtDate(model.createdAtUtc))}</div>
            </div>
          </header>

          <div class="sae-ornament"></div>
          <div class="sae-title">
            <h1>${escapeHtml(model.title)}</h1>
            <p>${escapeHtml(model.type || "Documento laboral")}</p>
          </div>

          <section class="sae-summary">
            <div class="sae-summary-item"><div class="sae-summary-icon person"></div><div><span>Colaborador</span><strong>${escapeHtml(model.employeeName || "Sin colaborador")}</strong></div></div>
            <div class="sae-summary-item"><div class="sae-summary-icon calendar"></div><div><span>Emitido</span><strong>${escapeHtml(fmtDate(model.createdAtUtc))}</strong></div></div>
            <div class="sae-summary-item"><div class="sae-summary-icon flag"></div><div><span>Estado</span><strong>${escapeHtml(model.status)}</strong></div></div>
            <div class="sae-summary-item"><div class="sae-summary-icon calendar"></div><div><span>Vencimiento</span><strong>${escapeHtml(expires)}</strong></div></div>
          </section>

          <main class="sae-body">${model.htmlContent}</main>
          ${model.signatureHash ? `<div class="sae-signature"><strong>Validación digital:</strong> ${escapeHtml(model.signatureHash)}</div>` : ""}

          <footer class="sae-footer">
            <span>Generado por SAE - RRHH</span>
            <span>Página 1</span>
          </footer>
        </section>
      </article>
    </div>
  `;
}

function previewDocumentHtml(model: FormalDocumentModel): string {
  return `<style>${formalDocumentStyles()}.sae-print-wrap{padding:0}.sae-document{min-height:0;box-shadow:none;transform-origin:top center}.sae-paper{padding:24px}.sae-title h1{font-size:20px}.sae-summary{grid-template-columns:repeat(2,1fr)}.sae-body{font-size:13px}</style>${buildFormalDocumentBody(model)}`;
}

function htmlToPlainText(html: string): string {
  const el = document.createElement("div");
  el.innerHTML = html;
  el.querySelectorAll("br").forEach((br) => br.replaceWith("\n"));
  el.querySelectorAll("p, div, h1, h2, h3, li, table, tr").forEach((node) => {
    node.appendChild(document.createTextNode("\n"));
  });
  return (el.textContent ?? "")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function buildPrintableDocumentHtml(doc: EmployeeDocument): string {
  const status = statusConfig[getEffectiveStatus(doc)]?.label ?? doc.status;
  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(doc.title)}</title>
  <style>${formalDocumentStyles()}</style>
</head>
<body>
  ${buildFormalDocumentBody({
    title: doc.title,
    type: doc.type,
    status,
    employeeName: doc.employeeName,
    employeeCode: doc.employeeCode,
    createdAtUtc: doc.createdAtUtc,
    expiresAtUtc: doc.expiresAtUtc,
    htmlContent: doc.htmlContent,
    signatureHash: doc.signatureHash,
  })}
</body>
</html>`;
}

function printDocument(doc: EmployeeDocument): void {
  const win = window.open("", "_blank", "noopener,noreferrer,width=900,height=1100");
  if (!win) return;
  win.document.open();
  win.document.write(buildPrintableDocumentHtml(doc));
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 350);
}

function downloadDocumentHtml(doc: EmployeeDocument): void {
  const blob = new Blob([buildPrintableDocumentHtml(doc)], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = documentFileName(doc, "html");
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function downloadDocumentPdf(doc: EmployeeDocument): Promise<void> {
  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "-10000px";
  container.style.top = "0";
  container.style.width = "794px";
  container.innerHTML = buildPrintableDocumentHtml(doc);
  document.body.appendChild(container);

  const sheet = container.querySelector(".sae-document") as HTMLElement | null;
  if (sheet) {
    try {
      const pdfFromHtml = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait" });
      await pdfFromHtml.html(sheet, {
        x: 0,
        y: 0,
        width: 595.28,
        windowWidth: 794,
        autoPaging: "text",
        html2canvas: {
          scale: 0.75,
          useCORS: true,
          backgroundColor: "#ffffff",
        },
        callback: (instance) => instance.save(documentFileName(doc, "pdf")),
      });
      container.remove();
      return;
    } catch {
      container.remove();
    }
  } else {
    container.remove();
  }

  const pdf = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginX = 54;
  const contentWidth = pageWidth - marginX * 2;
  const teal: [number, number, number] = [13, 148, 136];
  const slate900: [number, number, number] = [15, 23, 42];
  const slate600: [number, number, number] = [71, 85, 105];
  const slate400: [number, number, number] = [148, 163, 184];
  const lightBg: [number, number, number] = [248, 250, 252];
  const border: [number, number, number] = [226, 232, 240];
  let y = 48;
  let pageNumber = 1;

  const drawHeader = () => {
    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, pageWidth, 100, "F");
    pdf.setFillColor(...teal);
    pdf.roundedRect(marginX, 28, 52, 52, 8, 8, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.setTextColor(255, 255, 255);
    pdf.text("SAE", marginX + 10, 60);
    pdf.setTextColor(...slate900);
    pdf.setFontSize(17);
    pdf.text("SAE - RRHH", marginX + 72, 48);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...slate600);
    pdf.text("Documento laboral generado desde el sistema", marginX + 72, 63);
    pdf.setDrawColor(...teal);
    pdf.setLineWidth(1.2);
    pdf.line(marginX, 96, pageWidth - marginX, 96);
    pdf.setFillColor(...teal);
    pdf.rect(pageWidth - marginX - 32, 0, 32, 74, "F");
    pdf.triangle(pageWidth - marginX - 32, 74, pageWidth - marginX - 16, 61, pageWidth - marginX, 74, "F");
    y = 132;
  };

  const drawFooter = () => {
    pdf.setDrawColor(...border);
    pdf.line(marginX, pageHeight - 42, pageWidth - marginX, pageHeight - 42);
    pdf.setFillColor(15, 36, 61);
    pdf.rect(0, pageHeight - 12, pageWidth * 0.78, 12, "F");
    pdf.setFillColor(...teal);
    pdf.rect(pageWidth * 0.78, pageHeight - 12, pageWidth * 0.22, 12, "F");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(...slate400);
    pdf.text("Generado desde SAE - RRHH", marginX, pageHeight - 24);
    pdf.text(`Pagina ${pageNumber}`, pageWidth - marginX - 34, pageHeight - 24);
  };

  const addPageIfNeeded = (height = 24) => {
    if (y + height > pageHeight - 64) {
      drawFooter();
      pdf.addPage();
      pageNumber += 1;
      drawHeader();
    }
  };

  const addWrappedText = (
    text: string,
    fontSize: number,
    lineHeight: number,
    color: [number, number, number],
    options: { bold?: boolean; width?: number; x?: number; align?: "left" | "center" | "right" } = {},
  ) => {
    pdf.setFontSize(fontSize);
    pdf.setFont("helvetica", options.bold ? "bold" : "normal");
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(text || "-", options.width ?? contentWidth) as string[];
    lines.forEach((line) => {
      addPageIfNeeded(lineHeight);
      pdf.text(line, options.x ?? marginX, y, { align: options.align ?? "left" });
      y += lineHeight;
    });
  };

  const addLabelValue = (label: string, value: string, x: number, boxY: number, width: number) => {
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(7);
    pdf.setTextColor(...slate400);
    pdf.text(label.toUpperCase(), x, boxY + 18);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.setTextColor(...slate900);
    const lines = pdf.splitTextToSize(value || "-", width - 16) as string[];
    pdf.text(lines.slice(0, 2), x, boxY + 35);
  };

  const status = statusConfig[getEffectiveStatus(doc)]?.label ?? doc.status;
  const plainContent = htmlToPlainText(doc.htmlContent);

  drawHeader();

  pdf.setDrawColor(198, 231, 227);
  pdf.line(pageWidth / 2 - 48, y - 10, pageWidth / 2 - 12, y - 10);
  pdf.line(pageWidth / 2 + 12, y - 10, pageWidth / 2 + 48, y - 10);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(...teal);
  pdf.circle(pageWidth / 2, y - 10, 3, "F");

  addWrappedText(doc.title, 22, 28, slate900, { bold: true, x: pageWidth / 2, align: "center", width: contentWidth - 40 });
  y += 4;
  addWrappedText(`${doc.type} | ${status}`, 10, 14, teal, { bold: true, x: pageWidth / 2, align: "center", width: contentWidth - 40 });
  y += 18;

  const metaY = y;
  pdf.setFillColor(...lightBg);
  pdf.setDrawColor(...border);
  pdf.roundedRect(marginX, metaY, contentWidth, 92, 12, 12, "FD");
  const colW = contentWidth / 2;
  addLabelValue("Colaborador", `${doc.employeeName} (${doc.employeeCode})`, marginX + 16, metaY + 6, colW - 24);
  addLabelValue("Emitido", fmtDate(doc.createdAtUtc), marginX + colW + 16, metaY + 6, colW - 24);
  addLabelValue("Estado", status, marginX + 16, metaY + 48, colW - 24);
  addLabelValue("Vencimiento", doc.expiresAtUtc ? fmtDate(doc.expiresAtUtc) : "Sin vencimiento", marginX + colW + 16, metaY + 48, colW - 24);
  y += 120;

  pdf.setFillColor(255, 255, 255);
  pdf.setDrawColor(...border);
  pdf.roundedRect(marginX, y, contentWidth, 28, 8, 8, "D");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(10);
  pdf.setTextColor(...slate600);
  pdf.text("Contenido del documento", marginX + 14, y + 18);
  y += 46;

  plainContent.split(/\n{2,}/).filter(Boolean).forEach((paragraph) => {
    addWrappedText(paragraph.trim(), 11, 17, slate900);
    y += 8;
  });

  y += 18;
  addPageIfNeeded(74);
  pdf.setDrawColor(...border);
  pdf.line(marginX, y, marginX + 180, y);
  pdf.line(pageWidth - marginX - 180, y, pageWidth - marginX, y);
  y += 14;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(8);
  pdf.setTextColor(...slate600);
  pdf.text("Firma del colaborador", marginX + 42, y);
  pdf.text("Firma de RRHH", pageWidth - marginX - 128, y);

  if (doc.signatureHash) {
    y += 26;
    addWrappedText(`Hash de firma: ${doc.signatureHash}`, 7, 10, slate400);
  }

  drawFooter();
  pdf.save(documentFileName(doc, "pdf"));
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }): JSX.Element | null {
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [toast, onClose]);
  if (!toast) return null;
  const isErr = toast.type === "error";
  return (
    <div className={`fixed bottom-6 right-6 z-50 flex items-start gap-3 rounded-xl px-5 py-4 shadow-2xl border max-w-sm ${isErr ? "bg-red-50 border-red-200 text-red-800" : "bg-emerald-50 border-emerald-200 text-emerald-800"}`}>
      <span className="text-lg font-bold">{isErr ? "✕" : "✓"}</span>
      <p className="text-sm leading-snug flex-1">{toast.message}</p>
      <button onClick={onClose} className="opacity-60 hover:opacity-100 text-lg ml-2">×</button>
    </div>
  );
}

// ─── ConfirmDialog ────────────────────────────────────────────────────────────

function ConfirmDialog({ state, onClose }: { state: ConfirmState; onClose: () => void }): JSX.Element | null {
  if (!state) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">{state.title}</h3>
        <p className="text-sm text-slate-600 leading-relaxed">{state.message}</p>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancelar</button>
          <button onClick={() => { state.onConfirm(); onClose(); }} className={`px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors ${state.danger ? "bg-red-600 hover:bg-red-700" : "bg-indigo-600 hover:bg-indigo-700"}`}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

// ─── KpiCard ──────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, icon, accent }: { label: string; value: string; sub: string; icon: string; accent: string }): JSX.Element {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${accent}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide truncate">{label}</p>
        <p className="text-xl font-bold text-slate-900 leading-tight mt-0.5">{value}</p>
        <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

// ─── ExpirationChip ───────────────────────────────────────────────────────────

function ExpirationChip({ expiresAtUtc }: { expiresAtUtc: string | null }): JSX.Element {
  if (!expiresAtUtc) return <span className="text-xs text-slate-400">Sin vencimiento</span>;
  const days = daysUntil(expiresAtUtc);
  if (days < 0) return (
    <div className="text-center">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">Vencido</span>
      <p className="text-xs text-slate-400 mt-0.5">{fmtDate(expiresAtUtc)}</p>
    </div>
  );
  if (days <= 30) return (
    <div className="text-center">
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-100 text-orange-700">⚠ {days}d</span>
      <p className="text-xs text-slate-400 mt-0.5">{fmtDate(expiresAtUtc)}</p>
    </div>
  );
  return <span className="text-xs text-slate-500">{fmtDate(expiresAtUtc)}</span>;
}

// ─── DocRowMenu ───────────────────────────────────────────────────────────────

function DocRowMenu({ doc, onView, onDownloadPdf, onDownloadHtml, onEmail, onSend, onSign, onReject, onAnul }: {
  doc: EmployeeDocument; onView: () => void; onSend: () => void;
  onSign: () => void; onReject: () => void; onAnul: () => void;
  onDownloadPdf: () => void; onDownloadHtml: () => void; onEmail: () => void;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const close = (fn: () => void) => () => { fn(); setOpen(false); };
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold transition-colors">•••</button>
      {open && (
        <div className="absolute right-0 mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden py-1">
          <button onClick={close(onDownloadPdf)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-emerald-700 hover:bg-emerald-50">Descargar PDF</button>
          <button onClick={close(onDownloadHtml)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">Descargar HTML</button>
          <button onClick={close(onEmail)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-indigo-700 hover:bg-indigo-50 border-b border-slate-100">Enviar por correo</button>
          <button onClick={close(onView)}   className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50">📋 Ver detalle</button>
          {doc.status === "draft"             && <button onClick={close(onSend)}  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-blue-600 hover:bg-blue-50">✉️ Enviar para firma</button>}
          {doc.status === "pending_signature" && <button onClick={close(onSign)}  className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-emerald-600 hover:bg-emerald-50">✍️ Firmar ahora</button>}
          {doc.status === "pending_signature" && <button onClick={close(onReject)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">✕ Rechazar</button>}
          {(doc.status === "draft" || doc.status === "pending_signature") && (
            <button onClick={close(onAnul)} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 border-t border-slate-100 mt-1">⊘ Anular</button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── TplRowMenu ───────────────────────────────────────────────────────────────

function TplRowMenu({ onUse, onDelete }: { onUse: () => void; onDelete: () => void }): JSX.Element {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="w-8 h-8 rounded-lg border border-slate-200 hover:bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold transition-colors">•••</button>
      {open && (
        <div className="absolute right-0 mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-100 z-20 overflow-hidden py-1">
          <button onClick={() => { onUse(); setOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-indigo-600 hover:bg-indigo-50">📄 Usar plantilla</button>
          <button onClick={() => { onDelete(); setOpen(false); }} className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50">🗑 Eliminar</button>
        </div>
      )}
    </div>
  );
}

// ─── PieChart label ───────────────────────────────────────────────────────────

interface PieLabelProps { cx: number; cy: number; midAngle: number; outerRadius: number; percent: number; name: string }
function renderPieLabel({ cx, cy, midAngle, outerRadius, percent, name }: PieLabelProps) {
  if (percent < 0.08) return null;
  const R = Math.PI / 180;
  const r = outerRadius + 14;
  const x = cx + r * Math.cos(-midAngle * R);
  const y = cy + r * Math.sin(-midAngle * R);
  return (
    <text x={x} y={y} fontSize={10} fill="#475569" textAnchor={x > cx ? "start" : "end"} dominantBaseline="central">
      {name} ({(percent * 100).toFixed(0)}%)
    </text>
  );
}

// ─── RechazarModal ────────────────────────────────────────────────────────────

function RechazarModal({ doc, isPending, onClose, onConfirm }: {
  doc: EmployeeDocument | null; isPending: boolean;
  onClose: () => void; onConfirm: (id: string, reason: string) => void;
}): JSX.Element | null {
  const [reason, setReason] = useState("");
  useEffect(() => { if (doc) setReason(""); }, [doc]);
  if (!doc) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-gradient-to-r from-red-600 to-rose-600 px-6 py-5 text-white flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl flex-shrink-0">✕</div>
            <div>
              <h2 className="text-lg font-bold">Rechazar documento</h2>
              <p className="text-sm text-red-100 mt-0.5 leading-tight">{doc.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center flex-shrink-0">×</button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-600">Indica el motivo del rechazo. Esta información quedará registrada y será visible en la trazabilidad del documento.</p>
          <div>
            <label className="text-xs font-semibold text-slate-600 block mb-1">Motivo del rechazo <span className="text-red-500">*</span></label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={4} placeholder="Explica por qué se rechaza este documento..." className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
          </div>
          <div className="flex justify-end gap-3 pt-1">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancelar</button>
            <button disabled={!reason.trim() || isPending} onClick={() => onConfirm(doc.id, reason)} className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold flex items-center gap-2 transition-colors">
              {isPending && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {isPending ? "Rechazando..." : "Confirmar rechazo"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── DetalleModal ─────────────────────────────────────────────────────────────

function DetalleModal({ docId, onClose, onSign, onSend, onReject, onEmail }: {
  docId: string | null; onClose: () => void;
  onSign: (id: string) => void; onSend: (id: string) => void;
  onReject: (doc: EmployeeDocument) => void; onEmail: (doc: EmployeeDocument) => void;
}): JSX.Element | null {
  const detailQuery = useQuery({
    queryKey: ["doc-detail", docId],
    queryFn: () => getDocument(docId!),
    enabled: !!docId,
  });
  if (!docId) return null;
  const doc = detailQuery.data;
  const effStatus = doc ? getEffectiveStatus(doc) : "draft";
  const st = statusConfig[effStatus] ?? statusConfig["draft"];

  const timeline = doc ? [
    { label: "Creado", date: doc.createdAtUtc, done: true },
    { label: "Enviado para firma", date: doc.sentForSignatureAtUtc, done: !!doc.sentForSignatureAtUtc },
    { label: doc.status === "rejected" ? "Rechazado" : "Firmado", date: doc.signedAtUtc, done: !!doc.signedAtUtc },
  ] : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="bg-gradient-to-r from-slate-700 to-slate-600 px-6 py-5 text-white flex-shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl">📄</div>
              <div>
                <h2 className="text-lg font-bold">{doc?.title ?? "Cargando..."}</h2>
                {doc && <p className="text-sm text-slate-300 mt-0.5">{doc.employeeName} · {doc.employeeCode}</p>}
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center flex-shrink-0">×</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {detailQuery.isLoading && <div className="flex justify-center py-16"><span className="w-8 h-8 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" /></div>}
          {doc && (
            <div className="p-6 space-y-5">
              {/* Cards resumen */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Tipo",       val: doc.type },
                  { label: "Emitido",    val: fmtDate(doc.createdAtUtc) },
                  { label: "Vencimiento",val: doc.expiresAtUtc ? fmtDate(doc.expiresAtUtc) : "Sin límite" },
                  { label: "Estado",     val: st.label },
                ].map(({ label, val }) => (
                  <div key={label} className="bg-slate-50 rounded-xl border border-slate-100 p-3">
                    <p className="text-xs text-slate-400">{label}</p>
                    <p className="font-bold text-sm text-slate-900 mt-0.5">{val}</p>
                  </div>
                ))}
              </div>

              {/* Estado badge */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${st.bg} ${st.text}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}
                </span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">{doc.type}</span>
              </div>

              {/* Firma digital */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Firma digital</h3>
                {doc.status === "signed" && (
                  <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 space-y-2">
                    <div className="flex items-center gap-2"><span className="text-emerald-600 font-bold text-sm">✓ Documento firmado</span></div>
                    <p className="text-sm text-slate-700"><strong>Firmado por:</strong> {doc.signedByUserName ?? "—"}</p>
                    <p className="text-sm text-slate-700"><strong>Fecha:</strong> {fmtDate(doc.signedAtUtc)}</p>
                    {doc.signatureHash && (
                      <div className="mt-2 p-2 bg-white rounded-lg border border-emerald-100">
                        <p className="text-xs text-slate-400 mb-1">Hash SHA-256 del certificado digital:</p>
                        <p className="font-mono text-xs text-slate-600 break-all">{doc.signatureHash}</p>
                      </div>
                    )}
                  </div>
                )}
                {doc.status === "pending_signature" && (
                  <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
                    <p className="text-sm font-semibold text-amber-800">⏳ Pendiente de firma</p>
                    <p className="text-xs text-amber-600 mt-1">Enviado el {fmtDate(doc.sentForSignatureAtUtc)}. En espera de confirmación de firma digital.</p>
                  </div>
                )}
                {doc.status === "draft" && (
                  <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-600">📝 Borrador — aún no enviado para firma</p>
                  </div>
                )}
                {doc.status === "rejected" && (
                  <div className="bg-red-50 rounded-xl border border-red-200 p-4">
                    <p className="text-sm font-semibold text-red-700">✕ Rechazado</p>
                    {doc.rejectionReason && <p className="text-sm text-red-600 mt-1">Motivo: {doc.rejectionReason}</p>}
                  </div>
                )}
              </div>

              {/* Trazabilidad */}
              <div>
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Trazabilidad</h3>
                <div className="space-y-2">
                  {timeline.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs ${item.done ? "bg-indigo-100 text-indigo-700" : "bg-slate-100 text-slate-400"}`}>
                        {item.done ? "✓" : "○"}
                      </div>
                      <div>
                        <p className={`text-sm font-semibold ${item.done ? "text-slate-900" : "text-slate-400"}`}>{item.label}</p>
                        {item.date && <p className="text-xs text-slate-400">{fmtDate(item.date)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">Cerrar</button>
          {doc && (
            <div className="flex flex-wrap justify-end gap-2">
              <button onClick={() => printDocument(doc)} className="px-4 py-2 rounded-lg border border-blue-200 text-blue-700 text-sm font-semibold hover:bg-blue-50 transition-colors">Imprimir</button>
              <button onClick={() => downloadDocumentPdf(doc)} className="px-4 py-2 rounded-lg border border-emerald-200 text-emerald-700 text-sm font-semibold hover:bg-emerald-50 transition-colors">Descargar PDF</button>
              <button onClick={() => downloadDocumentHtml(doc)} className="px-4 py-2 rounded-lg border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-100 transition-colors">HTML</button>
              <button onClick={() => { onEmail(doc); onClose(); }} className="px-4 py-2 rounded-lg border border-indigo-200 text-indigo-700 text-sm font-semibold hover:bg-indigo-50 transition-colors">Enviar por correo</button>
              {doc.status === "draft" && <button onClick={() => { onSend(doc.id); onClose(); }} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors">✉️ Enviar para firma</button>}
              {doc.status === "pending_signature" && <>
                <button onClick={() => { onReject(doc); onClose(); }} className="px-4 py-2 rounded-lg border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-colors">✕ Rechazar</button>
                <button onClick={() => { onSign(doc.id); onClose(); }} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition-colors">✍️ Firmar ahora</button>
              </>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── FirmaModal ───────────────────────────────────────────────────────────────

function EmailDocumentoModal({ doc, isPending, onClose, onConfirm }: {
  doc: EmployeeDocument | null;
  isPending: boolean;
  onClose: () => void;
  onConfirm: (doc: EmployeeDocument, form: EmailForm) => void;
}): JSX.Element | null {
  const [form, setForm] = useState<EmailForm>({ to: "", subject: "", message: "" });
  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (!doc) return;
    setForm({
      to: "",
      subject: `Documento laboral: ${doc.title}`,
      message: `Hola, te enviamos el documento "${doc.title}" generado desde SAE - RRHH.`,
    });
    setErrors({});
  }, [doc]);

  if (!doc) return null;

  const submit = () => {
    const nextErrors: FormErrors = {};
    if (form.to.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.to.trim())) {
      nextErrors.to = "Ingresa un correo válido o deja el campo vacío para usar el correo del colaborador.";
    }
    if (!form.subject.trim()) nextErrors.subject = "El asunto es obligatorio.";
    if (!form.message.trim()) nextErrors.message = "El mensaje es obligatorio.";
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }
    onConfirm(doc, form);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-700 to-slate-700 px-6 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/15 flex items-center justify-center text-xl">✉</div>
              <div>
                <h2 className="text-lg font-bold">Enviar documento por correo</h2>
                <p className="text-sm text-indigo-100 mt-0.5">{doc.title}</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center">×</button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
            <p className="text-sm font-semibold text-indigo-900">Destino</p>
            <p className="text-xs text-indigo-700 mt-1">Si dejas el destinatario vacío, se usará el correo registrado del colaborador.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Destinatario</label>
            <input
              value={form.to}
              onChange={(e) => { setForm((f) => ({ ...f, to: e.target.value })); setErrors((x) => ({ ...x, to: undefined })); }}
              placeholder="correo@empresa.com"
              className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-100 ${errors.to ? "border-red-300" : "border-slate-200"}`}
            />
            {errors.to && <p className="text-xs text-red-600 mt-1">{errors.to}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Asunto</label>
            <input
              value={form.subject}
              onChange={(e) => { setForm((f) => ({ ...f, subject: e.target.value })); setErrors((x) => ({ ...x, subject: undefined })); }}
              className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-100 ${errors.subject ? "border-red-300" : "border-slate-200"}`}
            />
            {errors.subject && <p className="text-xs text-red-600 mt-1">{errors.subject}</p>}
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mensaje</label>
            <textarea
              value={form.message}
              onChange={(e) => { setForm((f) => ({ ...f, message: e.target.value })); setErrors((x) => ({ ...x, message: undefined })); }}
              rows={4}
              className={`w-full rounded-xl border px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-indigo-100 resize-none ${errors.message ? "border-red-300" : "border-slate-200"}`}
            />
            {errors.message && <p className="text-xs text-red-600 mt-1">{errors.message}</p>}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-100">Cancelar</button>
          <button onClick={submit} disabled={isPending} className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold">
            {isPending && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {isPending ? "Enviando..." : "Enviar correo"}
          </button>
        </div>
      </div>
    </div>
  );
}

type SigMethod = "write" | "draw" | "upload";

function FirmaModal({ docId, isPending, onClose, onConfirm }: {
  docId: string | null; isPending: boolean;
  onClose: () => void; onConfirm: (id: string) => void;
}): JSX.Element | null {
  const [sigMethod, setSigMethod] = useState<SigMethod>("write");
  const [sigName, setSigName] = useState("");
  const [agreed, setAgreed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);

  const detailQuery = useQuery({
    queryKey: ["doc-firma", docId],
    queryFn: () => getDocument(docId!),
    enabled: !!docId,
  });

  useEffect(() => { setSigMethod("write"); setSigName(""); setAgreed(false); }, [docId]);

  useEffect(() => {
    if (sigMethod !== "draw" || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.fillStyle = "#f8fafc";
    ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  }, [sigMethod]);

  if (!docId) return null;
  const doc = detailQuery.data;

  function getPos(e: React.MouseEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }
  function onMouseDown(e: React.MouseEvent<HTMLCanvasElement>) {
    isDrawingRef.current = true;
    const { x, y } = getPos(e);
    lastXRef.current = x; lastYRef.current = y;
  }
  function onMouseMove(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!isDrawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    const { x, y } = getPos(e);
    ctx.beginPath(); ctx.moveTo(lastXRef.current, lastYRef.current);
    ctx.lineTo(x, y); ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.stroke();
    lastXRef.current = x; lastYRef.current = y;
  }
  function clearCanvas() {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.fillStyle = "#f8fafc"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  const canConfirm = agreed && (sigMethod !== "write" || sigName.trim().length > 2);

  const tabs: { key: SigMethod; icon: string; label: string }[] = [
    { key: "write", icon: "✏️", label: "Escribir" },
    { key: "draw",  icon: "🖊️", label: "Dibujar"  },
    { key: "upload",icon: "📷", label: "Imagen"   },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-5 text-white flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl flex-shrink-0">✍️</div>
            <div>
              <h2 className="text-lg font-bold">Confirmar firma digital</h2>
              <p className="text-sm text-emerald-100 mt-0.5 leading-tight">{doc?.title ?? "Cargando..."}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center flex-shrink-0">×</button>
        </div>

        <div className="p-6 space-y-5">
          <p className="text-sm text-slate-600 leading-relaxed">Al confirmar tu firma declaras que has leído y aceptas el contenido del documento. La firma será certificada con un registro SHA-256.</p>

          {/* Método tabs */}
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Método de firma</p>
            <div className="flex gap-1 bg-slate-100 rounded-xl p-1">
              {tabs.map((t) => (
                <button key={t.key} onClick={() => setSigMethod(t.key)}
                  className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-1.5 ${sigMethod === t.key ? "bg-white shadow text-slate-900" : "text-slate-500 hover:text-slate-700"}`}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Write */}
          {sigMethod === "write" && (
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Escribe tu nombre completo tal como aparece en tu DNI</label>
              <input value={sigName} onChange={(e) => setSigName(e.target.value)} placeholder="Ej: María González Ríos"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-lg italic font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50" style={{ fontFamily: "'Georgia', serif" }} />
              {sigName.trim().length > 2 && (
                <div className="mt-3 p-4 bg-slate-50 rounded-xl border border-slate-200 text-center">
                  <p className="text-2xl italic text-slate-700" style={{ fontFamily: "'Georgia', serif" }}>{sigName}</p>
                  <p className="text-xs text-slate-400 mt-2">Vista previa de tu firma</p>
                </div>
              )}
            </div>
          )}

          {/* Draw */}
          {sigMethod === "draw" && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-600">Dibuja tu firma en el recuadro</label>
                <button onClick={clearCanvas} className="text-xs text-slate-400 hover:text-slate-600">Limpiar</button>
              </div>
              <canvas ref={canvasRef} width={420} height={140}
                className="w-full rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 cursor-crosshair"
                onMouseDown={onMouseDown} onMouseMove={onMouseMove}
                onMouseUp={() => { isDrawingRef.current = false; }}
                onMouseLeave={() => { isDrawingRef.current = false; }} />
              <p className="text-xs text-slate-400 mt-1">Mantén presionado y arrastra para trazar tu firma.</p>
            </div>
          )}

          {/* Upload */}
          {sigMethod === "upload" && (
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50">
              <div className="text-4xl mb-3">📷</div>
              <p className="text-sm font-semibold text-slate-700">Carga una imagen de tu firma</p>
              <p className="text-xs text-slate-400 mt-1 mb-3">PNG o JPG, fondo blanco, máx. 2 MB</p>
              <label className="px-4 py-2 rounded-lg bg-white border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 cursor-pointer transition-colors">
                Seleccionar imagen
                <input type="file" accept="image/png,image/jpeg" className="hidden" />
              </label>
            </div>
          )}

          {/* Checkbox */}
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded accent-emerald-600 flex-shrink-0" />
            <span className="text-sm text-slate-600">
              Declaro que esta firma tiene <strong>validez legal</strong> y que he leído el contenido completo del documento antes de firmarlo.
            </span>
          </label>

          <div className="flex justify-end gap-3 pt-1">
            <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">Cancelar</button>
            <button disabled={!canConfirm || isPending} onClick={() => onConfirm(docId)}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold flex items-center gap-2 transition-colors">
              {isPending && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
              {isPending ? "Firmando..." : "Confirmar firma →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── NuevaPlantillaModal ──────────────────────────────────────────────────────

function NuevaPlantillaModal({ open, isPending, form, errors, onChange, onClose, onSave }: {
  open: boolean; isPending: boolean; form: TplForm; errors: FormErrors;
  onChange: (patch: Partial<TplForm>) => void; onClose: () => void; onSave: () => void;
}): JSX.Element | null {
  if (!open) return null;

  const detectedVars = extractVariables(form.htmlContent);
  const catStyle = categoryStyle[form.category] ?? "bg-slate-50 text-slate-600 border-slate-200";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-violet-600 px-6 py-5 text-white flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl flex-shrink-0">📋</div>
              <div>
                <h2 className="text-lg font-bold">Nueva plantilla</h2>
                <p className="text-sm text-indigo-200 mt-0.5">Crea una plantilla reutilizable para contratos, cartas, políticas y más.</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center flex-shrink-0">×</button>
          </div>
        </div>

        {/* Body 2 cols */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: form */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">

            {/* 1. Información general */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">1</span>
                Información general
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Nombre de la plantilla <span className="text-red-500">*</span></label>
                  <input value={form.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Ej: Contrato de trabajo indefinido"
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.name ? "border-red-400 bg-red-50" : "border-slate-200"}`} />
                  {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Tipo <span className="text-red-500">*</span></label>
                    <select value={form.type} onChange={(e) => onChange({ type: e.target.value })}
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white ${errors.type ? "border-red-400 bg-red-50" : "border-slate-200"}`}>
                      <option value="">— Seleccionar —</option>
                      {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {errors.type && <p className="text-xs text-red-600 mt-1">{errors.type}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Categoría <span className="text-red-500">*</span></label>
                    <select value={form.category} onChange={(e) => onChange({ category: e.target.value })}
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white ${errors.category ? "border-red-400 bg-red-50" : "border-slate-200"}`}>
                      <option value="">— Seleccionar —</option>
                      {CATALOG_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    {errors.category && <p className="text-xs text-red-600 mt-1">{errors.category}</p>}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Descripción</label>
                  <input value={form.description} onChange={(e) => onChange({ description: e.target.value })} placeholder="Descripción breve del uso de esta plantilla"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
            </div>

            {/* 2. Variables */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">2</span>
                Variables disponibles <span className="text-slate-400 text-xs font-normal normal-case ml-1">(clic para copiar)</span>
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLES.map((v) => (
                  <button key={v} type="button" onClick={() => navigator.clipboard?.writeText(v)}
                    className={`px-2 py-1 rounded-lg border text-xs font-mono transition-colors ${detectedVars.includes(v) ? "bg-indigo-50 border-indigo-300 text-indigo-700" : "bg-slate-50 border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-700"}`}>
                    {v}
                  </button>
                ))}
              </div>
              <p className="text-xs text-slate-400 mt-1.5">Las variables resaltadas ya están en tu contenido HTML.</p>
            </div>

            {/* 3. Contenido */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">3</span>
                Contenido HTML <span className="text-red-500">*</span>
              </h3>
              <textarea value={form.htmlContent} onChange={(e) => onChange({ htmlContent: e.target.value })} rows={10}
                placeholder="<h2>Título del documento</h2><p>Nombre del colaborador: {{NOMBRE_COMPLETO}}</p>..."
                className={`w-full rounded-lg border px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${errors.htmlContent ? "border-red-400 bg-red-50" : "border-slate-200"}`} />
              {errors.htmlContent && <p className="text-xs text-red-600 mt-1">{errors.htmlContent}</p>}
            </div>

            {/* 4. Configuración */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">4</span>
                Configuración
              </h3>
              <div className="space-y-3">
                {([
                  { field: "requiresSign",   label: "Requiere firma del colaborador", value: form.requiresSign   },
                  { field: "requiresHrSign", label: "Requiere firma de RRHH",         value: form.requiresHrSign },
                  { field: "isActive",       label: "Plantilla activa",               value: form.isActive       },
                ] as const).map(({ field, label, value }) => (
                  <label key={field} className="flex items-center gap-3 cursor-pointer">
                    <button type="button" role="switch" aria-checked={value}
                      onClick={() => onChange({ [field]: !value } as Partial<TplForm>)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${value ? "bg-indigo-500" : "bg-slate-200"}`}>
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${value ? "translate-x-4.5" : "translate-x-0.5"}`} />
                    </button>
                    <span className="text-sm text-slate-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Right: preview */}
          <div className="w-56 flex-shrink-0 bg-slate-50 border-l border-slate-100 p-5 overflow-y-auto hidden sm:flex flex-col gap-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Vista previa</p>
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-400">Nombre</p>
              <p className="font-semibold text-slate-900 text-sm mt-0.5 leading-tight">{form.name || "—"}</p>
            </div>
            {form.type && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">{form.type}</span>}
            {form.category && <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${catStyle}`}>{form.category}</span>}
            <div className="bg-white rounded-xl border border-slate-200 p-3 space-y-1.5">
              <p className="text-xs text-slate-400 font-semibold">Firma requerida</p>
              <p className="text-xs text-slate-700">{form.requiresSign ? "✓ Colaborador" : "✗ Colaborador"}</p>
              <p className="text-xs text-slate-700">{form.requiresHrSign ? "✓ RRHH" : "✗ RRHH"}</p>
            </div>
            {detectedVars.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-3">
                <p className="text-xs text-slate-400 font-semibold mb-1.5">Variables ({detectedVars.length})</p>
                <div className="flex flex-wrap gap-1">
                {detectedVars.map((v) => <span key={v} className="text-xs bg-indigo-50 text-indigo-600 rounded px-1 py-0.5 font-mono">{v}</span>)}
                </div>
              </div>
            )}
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${form.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
              {form.isActive ? "● Activa" : "○ Borrador"}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">Cancelar</button>
          <button disabled={isPending} onClick={onSave} className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold flex items-center gap-2 transition-colors">
            {isPending && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {isPending ? "Guardando..." : "Crear plantilla"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── NuevoDocumentoModal ──────────────────────────────────────────────────────

function NuevoDocumentoModal({ open, isPending, form, errors, templates, employees, onChange, onClose, onSave }: {
  open: boolean; isPending: boolean; form: DocForm; errors: FormErrors;
  templates: DocumentTemplate[]; employees: EmployeeListItem[];
  onChange: (patch: Partial<DocForm>) => void; onClose: () => void; onSave: () => void;
}): JSX.Element | null {
  if (!open) return null;
  const selEmployee = employees.find((e) => e.id === form.employeeId);
  const selTemplate = templates.find((t) => t.id === form.templateId);
  const variables = extractVariables(form.htmlContent);
  const previewHtml = renderTemplate(form.htmlContent, form.variableValues);
  const previewDocument = previewDocumentHtml({
    title: form.title || selTemplate?.name || "Documento laboral",
    type: form.type || selTemplate?.type || "Documento laboral",
    status: "Borrador",
    employeeName: selEmployee?.fullName ?? "Colaborador por seleccionar",
    employeeCode: selEmployee?.employeeCode ?? "N/D",
    createdAtUtc: new Date().toISOString(),
    expiresAtUtc: form.expiresAtUtc || null,
    htmlContent: previewHtml || "<p>Selecciona una plantilla o escribe contenido para ver la vista previa.</p>",
  });

  function handleTemplateChange(tplId: string) {
    const tpl = templates.find((t) => t.id === tplId);
    const html = tpl?.htmlContent ?? form.htmlContent;
    onChange({
      templateId: tplId,
      htmlContent: html,
      type: tpl?.type ?? form.type,
      title: tpl && !form.title ? tpl.name : form.title,
      variableValues: mergeVariableDefaults(html, selEmployee, form.variableValues),
    });
  }

  function handleEmployeeChange(employeeId: string): void {
    const employee = employees.find((item) => item.id === employeeId);
    onChange({
      employeeId,
      variableValues: mergeVariableDefaults(form.htmlContent, employee, form.variableValues),
    });
  }

  function updateVariable(variable: string, value: string): void {
    onChange({ variableValues: { ...form.variableValues, [variable]: value } });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-5 text-white flex-shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl flex-shrink-0">📄</div>
              <div>
                <h2 className="text-lg font-bold">Nuevo documento</h2>
                <p className="text-sm text-blue-200 mt-0.5">Genera, adjunta y envía documentos con control de vigencia y firma digital.</p>
              </div>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center flex-shrink-0">×</button>
          </div>
        </div>

        {/* Body 2 cols */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: form */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5">

            {/* 1. Colaborador e información */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">1</span>
                Colaborador e información
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Colaborador <span className="text-red-500">*</span></label>
                  <select value={form.employeeId} onChange={(e) => handleEmployeeChange(e.target.value)}
                    className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white ${errors.employeeId ? "border-red-400 bg-red-50" : "border-slate-200"}`}>
                    <option value="">— Seleccionar colaborador —</option>
                    {employees.map((e) => <option key={e.id} value={e.id}>{e.fullName} · {e.area}</option>)}
                  </select>
                  {errors.employeeId && <p className="text-xs text-red-600 mt-1">{errors.employeeId}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Tipo <span className="text-red-500">*</span></label>
                    <select value={form.type} onChange={(e) => onChange({ type: e.target.value })}
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white ${errors.type ? "border-red-400 bg-red-50" : "border-slate-200"}`}>
                      <option value="">— Seleccionar —</option>
                      {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {errors.type && <p className="text-xs text-red-600 mt-1">{errors.type}</p>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-1">Título <span className="text-red-500">*</span></label>
                    <input value={form.title} onChange={(e) => onChange({ title: e.target.value })} placeholder="Ej: Contrato Indefinido 2026"
                      className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${errors.title ? "border-red-400 bg-red-50" : "border-slate-200"}`} />
                    {errors.title && <p className="text-xs text-red-600 mt-1">{errors.title}</p>}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Fecha de vencimiento</label>
                  <input type="date" value={form.expiresAtUtc} onChange={(e) => onChange({ expiresAtUtc: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <p className="text-xs text-slate-400 mt-1">Déjalo vacío si el documento no tiene vencimiento.</p>
                </div>
              </div>
            </div>

            {/* 2. Plantilla / Contenido */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded bg-indigo-100 text-indigo-700 text-xs flex items-center justify-center font-bold">2</span>
                Origen del documento
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Plantilla base <span className="text-slate-400 font-normal">(opcional)</span></label>
                  <select value={form.templateId} onChange={(e) => handleTemplateChange(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="">— Sin plantilla (contenido manual) —</option>
                    {templates.map((t) => <option key={t.id} value={t.id}>{t.name}{!t.isActive ? " (inactiva)" : ""}</option>)}
                  </select>
                  {selTemplate && <p className="text-xs text-indigo-600 mt-1">Plantilla cargada: {selTemplate.name}</p>}
                  {templates.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      No hay plantillas guardadas todavía. Crea una desde la pestaña Plantillas o usa una plantilla base del catálogo.
                    </p>
                  )}
                </div>
                {variables.length > 0 && (
                  <div className="rounded-xl border border-teal-100 bg-teal-50/60 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900">Datos de la plantilla</h4>
                        <p className="mt-0.5 text-xs text-slate-500">Campos detectados automáticamente desde las etiquetas del contenido.</p>
                      </div>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold text-teal-700">{variables.length} campos</span>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {variables.map((variable) => {
                        const errorKey = `var:${variable}`;
                        const inputType = variableInputType(variable);
                        return (
                          <div key={variable}>
                            <label className="text-xs font-semibold text-slate-600 block mb-1">{variableLabel(variable)} <span className="text-red-500">*</span></label>
                            <input
                              type={inputType}
                              value={form.variableValues[variable] ?? ""}
                              step={inputType === "number" ? "0.01" : undefined}
                              onChange={(event) => updateVariable(variable, event.target.value)}
                              className={`w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 ${errors[errorKey] ? "border-red-400 bg-red-50" : "border-slate-200 bg-white"}`}
                            />
                            {errors[errorKey] && <p className="text-xs text-red-600 mt-1">{errors[errorKey]}</p>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">Contenido base HTML <span className="text-red-500">*</span></label>
                  <textarea value={form.htmlContent} onChange={(e) => onChange({ htmlContent: e.target.value, variableValues: mergeVariableDefaults(e.target.value, selEmployee, form.variableValues) })} rows={7}
                    placeholder="<p>Contenido del documento. Puedes usar variables como {{NOMBRE_COMPLETO}}...</p>"
                    className={`w-full rounded-lg border px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none ${errors.htmlContent ? "border-red-400 bg-red-50" : "border-slate-200"}`} />
                  {errors.htmlContent && <p className="text-xs text-red-600 mt-1">{errors.htmlContent}</p>}
                  <p className="text-xs text-slate-400 mt-1">No es necesario editar HTML para completar variables; usa los campos generados arriba.</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Vista previa del contenido final</p>
                    <span className="text-xs text-slate-400">Variables reemplazadas</span>
                  </div>
                  <div className="max-h-[520px] overflow-y-auto rounded-xl border border-slate-200 bg-slate-100 p-3"
                    dangerouslySetInnerHTML={{ __html: previewDocument }} />
                </div>
              </div>
            </div>
          </div>

          {/* Right: preview */}
          <div className="w-56 flex-shrink-0 bg-slate-50 border-l border-slate-100 p-5 overflow-y-auto hidden sm:flex flex-col gap-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Vista previa</p>
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-400">Colaborador</p>
              <p className="font-semibold text-slate-900 text-sm mt-0.5 leading-tight">{selEmployee?.fullName ?? "—"}</p>
            </div>
            {form.type && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">{form.type}</span>}
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-400">Título</p>
              <p className="font-semibold text-slate-900 text-sm mt-0.5 leading-tight">{form.title || "—"}</p>
            </div>
            {selTemplate && (
              <div className="bg-indigo-50 rounded-xl border border-indigo-100 p-3">
                <p className="text-xs text-indigo-400">Plantilla</p>
                <p className="font-semibold text-indigo-900 text-sm mt-0.5 leading-tight">{selTemplate.name}</p>
              </div>
            )}
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-400">Vencimiento</p>
              <p className="font-semibold text-slate-900 text-sm mt-0.5">{form.expiresAtUtc ? fmtDate(form.expiresAtUtc) : "Sin límite"}</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-3">
              <p className="text-xs text-slate-400">Estado inicial</p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 mt-1">● Borrador</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-100 transition-colors">Cancelar</button>
          <button disabled={isPending} onClick={onSave} className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold flex items-center gap-2 transition-colors">
            {isPending && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
            {isPending ? "Creando..." : "Crear documento"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── PaginaDocumentos (componente principal) ──────────────────────────────────

export function PaginaDocumentos(): JSX.Element {
  const queryClient = useQueryClient();
  const [toast,   setToast]   = useState<ToastState>(null);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [tab, setTab]         = useState<"documents" | "templates">("documents");

  // Filtros documentos
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter,   setTypeFilter]   = useState("");
  const [onlyExpiring, setOnlyExpiring] = useState(false);

  // Filtros biblioteca
  const [tplSearch,  setTplSearch]  = useState("");
  const [catFilter,  setCatFilter]  = useState("");

  // Modales
  const [createDocOpen,  setCreateDocOpen]  = useState(false);
  const [createTplOpen,  setCreateTplOpen]  = useState(false);
  const [detailDocId,    setDetailDocId]    = useState<string | null>(null);
  const [firmaDocId,     setFirmaDocId]     = useState<string | null>(null);
  const [rechazarDoc,    setRechazarDoc]    = useState<EmployeeDocument | null>(null);
  const [emailDoc,       setEmailDoc]       = useState<EmployeeDocument | null>(null);

  // Formularios
  const [docForm,   setDocForm]   = useState<DocForm>(blankDocForm());
  const [docErrors, setDocErrors] = useState<FormErrors>({});
  const [tplForm,   setTplForm]   = useState<TplForm>(blankTplForm());
  const [tplErrors, setTplErrors] = useState<FormErrors>({});

  // ── Queries ──
  const docsQuery     = useQuery({ queryKey: ["docs-all"],       queryFn: () => getDocuments("", "") });
  const tplsQuery     = useQuery({ queryKey: ["doc-templates"],  queryFn: getDocumentTemplates });
  const employeesQuery = useQuery({
    queryKey: ["document-employees"],
    queryFn: () => getEmployees({ search: "", areaId: "", branchId: "", isActive: true, pageNumber: 1, pageSize: 500, sortBy: "fullName", sortDirection: "asc" }),
  });

  const allDocs = docsQuery.data  ?? [];
  const allTpls = tplsQuery.data  ?? [];
  const documentEmployees = employeesQuery.data?.items ?? [];

  // ── Docs filtrados ──
  const filteredDocs = useMemo(() => {
    let items = allDocs;
    if (search) { const s = search.toLowerCase(); items = items.filter((d) => d.employeeName.toLowerCase().includes(s) || d.title.toLowerCase().includes(s) || d.employeeCode.toLowerCase().includes(s)); }
    if (statusFilter)  items = items.filter((d) => getEffectiveStatus(d) === statusFilter);
    if (typeFilter)    items = items.filter((d) => d.type === typeFilter);
    if (onlyExpiring)  items = items.filter((d) => { if (!d.expiresAtUtc) return false; const dy = daysUntil(d.expiresAtUtc); return dy >= 0 && dy <= 30; });
    return items;
  }, [allDocs, search, statusFilter, typeFilter, onlyExpiring]);

  // ── KPIs ──
  const kpis = useMemo(() => {
    const now = Date.now(); const in30 = now + 30 * 86400000;
    return {
      vigentes:   allDocs.filter((d) => d.status === "signed" && (!d.expiresAtUtc || new Date(d.expiresAtUtc).getTime() > now)).length,
      pendientes: allDocs.filter((d) => d.status === "pending_signature").length,
      porVencer:  allDocs.filter((d) => { if (!d.expiresAtUtc) return false; const t = new Date(d.expiresAtUtc).getTime(); return t > now && t <= in30; }).length,
      plantillas: allTpls.filter((t) => t.isActive).length,
    };
  }, [allDocs, allTpls]);

  // ── Pie data ──
  const pieData = useMemo(() => [
    { name: "Firmados",    value: allDocs.filter((d) => d.status === "signed").length,            fill: "#10b981" },
    { name: "Pend. firma", value: allDocs.filter((d) => d.status === "pending_signature").length, fill: "#f59e0b" },
    { name: "Borradores",  value: allDocs.filter((d) => d.status === "draft").length,             fill: "#94a3b8" },
    { name: "Rechazados",  value: allDocs.filter((d) => d.status === "rejected").length,          fill: "#ef4444" },
  ].filter((d) => d.value > 0), [allDocs]);

  // ── Próximos vencimientos ──
  const proxVenc = useMemo(() => {
    const now = Date.now();
    return allDocs.filter((d) => d.expiresAtUtc && new Date(d.expiresAtUtc).getTime() > now)
      .sort((a, b) => new Date(a.expiresAtUtc!).getTime() - new Date(b.expiresAtUtc!).getTime())
      .slice(0, 5);
  }, [allDocs]);

  // ── Catálogo filtrado ──
  const filteredCatalog = useMemo(() => {
    let items = CATALOG;
    if (catFilter)  items = items.filter((e) => e.category === catFilter);
    if (tplSearch)  { const s = tplSearch.toLowerCase(); items = items.filter((e) => e.name.toLowerCase().includes(s) || e.description.toLowerCase().includes(s)); }
    return items;
  }, [catFilter, tplSearch]);

  // ── Helpers ──
  const invalidateDocs = () => queryClient.invalidateQueries({ queryKey: ["docs-all"] });
  const invalidateTpls = () => queryClient.invalidateQueries({ queryKey: ["doc-templates"] });
  const ok   = (msg: string) => setToast({ type: "success", message: msg });
  const fail = (msg: string) => setToast({ type: "error",   message: msg });

  // ── Mutations ──
  const createDocMutation = useMutation({
    mutationFn: createDocument,
    onSuccess: async () => { await invalidateDocs(); ok("✓ Documento creado correctamente."); setCreateDocOpen(false); setDocForm(blankDocForm()); },
    onError: () => fail("No se pudo crear el documento."),
  });
  const createTplMutation = useMutation({
    mutationFn: createDocumentTemplate,
    onSuccess: async () => { await invalidateTpls(); ok("✓ Plantilla creada correctamente."); setCreateTplOpen(false); setTplForm(blankTplForm()); },
    onError: () => fail("No se pudo crear la plantilla."),
  });
  const deleteTplMutation = useMutation({
    mutationFn: deleteDocumentTemplate,
    onSuccess: async () => { await invalidateTpls(); ok("Plantilla eliminada."); },
    onError: () => fail("No se pudo eliminar."),
  });
  const sendMutation = useMutation({
    mutationFn: sendForSignature,
    onSuccess: async () => { await invalidateDocs(); ok("✓ Enviado para firma."); },
    onError: () => fail("No se pudo enviar."),
  });
  const signMutation = useMutation({
    mutationFn: signDocument,
    onSuccess: async () => { await invalidateDocs(); ok("✓ Documento firmado correctamente."); setFirmaDocId(null); },
    onError: () => fail("No se pudo firmar."),
  });
  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => rejectDocument(id, reason),
    onSuccess: async () => { await invalidateDocs(); ok("Documento rechazado."); setRechazarDoc(null); },
    onError: () => fail("No se pudo rechazar."),
  });
  const emailMutation = useMutation({
    mutationFn: ({ id, form }: { id: string; form: EmailForm }) => sendDocumentByEmail(id, {
      to: form.to.trim() || null,
      subject: form.subject.trim() || null,
      message: form.message.trim() || null,
    }),
    onSuccess: () => { ok("Documento enviado por correo."); setEmailDoc(null); },
    onError: (error: unknown) => {
      const message = (error as { response?: { data?: { message?: string } } }).response?.data?.message;
      fail(message ?? "No se pudo enviar el correo. Verifica el destinatario o la configuración SMTP.");
    },
  });

  // ── Guardar doc ──
  function handleSaveDoc(): void {
    const e: FormErrors = {};
    if (!docForm.employeeId)        e.employeeId  = "Selecciona un colaborador.";
    if (!docForm.title.trim())      e.title       = "El título es obligatorio.";
    if (!docForm.type)              e.type        = "Selecciona un tipo.";
    if (!docForm.htmlContent.trim())e.htmlContent = "El contenido es obligatorio.";
    for (const variable of extractVariables(docForm.htmlContent)) {
      const value = docForm.variableValues[variable]?.trim();
      if (!value) e[`var:${variable}`] = `Falta completar ${variableLabel(variable)}.`;
    }
    if (Object.keys(e).length > 0) { setDocErrors(e); return; }
    createDocMutation.mutate({ employeeId: docForm.employeeId, templateId: docForm.templateId || null, title: docForm.title.trim(), type: docForm.type, htmlContent: renderTemplate(docForm.htmlContent, docForm.variableValues), expiresAtUtc: docForm.expiresAtUtc || null });
  }

  // ── Guardar plantilla ──
  function handleSaveTpl(): void {
    const e: FormErrors = {};
    if (!tplForm.name.trim())        e.name        = "El nombre es obligatorio.";
    if (!tplForm.type)               e.type        = "Selecciona un tipo.";
    if (!tplForm.category)           e.category    = "Selecciona una categoría.";
    if (!tplForm.htmlContent.trim()) e.htmlContent = "El contenido es obligatorio.";
    if (Object.keys(e).length > 0)  { setTplErrors(e); return; }
    createTplMutation.mutate({ name: tplForm.name.trim(), type: tplForm.type, htmlContent: tplForm.htmlContent, description: tplForm.description.trim(), category: tplForm.category, requiresEmployeeSignature: tplForm.requiresSign, requiresHrSignature: tplForm.requiresHrSign, format: "html" });
  }

  // ── Abrir entrada del catálogo ──
  function openCatalogEntry(entry: CatalogEntry): void {
    setTplForm({ name: entry.name, type: entry.type, category: entry.category, htmlContent: defaultHtmlFor(entry), description: entry.description, requiresSign: entry.requiresSign, requiresHrSign: entry.requiresHrSign, isActive: true });
    setTplErrors({});
    setCreateTplOpen(true);
  }

  // ── Export ──
  async function handleExport(format: ExportFormat): Promise<void> {
    try {
      if (tab === "templates") {
        if (!allTpls.length) { fail("No hay plantillas para exportar."); return; }
        exportRows(format, allTpls.map((t) => ({ "Nombre": t.name, "Tipo": t.type, "Descripción": t.description ?? "", "Activo": t.isActive ? "Sí" : "No" })), makeFileName("Plantillas", []), "Plantillas de documentos", { subtitle: "Catálogo de plantillas del módulo documental.", period: "Repositorio documental", filters: [], metrics: [{ label: "Total", value: allTpls.length }, { label: "Activas", value: allTpls.filter((t) => t.isActive).length }] });
      } else {
        if (!filteredDocs.length) { fail("No hay documentos para exportar."); return; }
        exportRows(format, filteredDocs.map((d) => ({ "Colaborador": d.employeeName, "Código": d.employeeCode, "Título": d.title, "Tipo": d.type, "Estado": statusConfig[getEffectiveStatus(d)]?.label ?? d.status, "Emitido": fmtDate(d.createdAtUtc), "Vencimiento": d.expiresAtUtc ? fmtDate(d.expiresAtUtc) : "Sin vencimiento", "Firmado por": d.signedByUserName ?? "", "Hash": d.signatureHash ? d.signatureHash.substring(0, 16) + "..." : "" })), makeFileName("Documentos", [statusFilter || null]), "Documentos laborales", { subtitle: "Expediente documental con estado de firma.", period: "Repositorio documental", filters: [{ label: "Estado", value: statusFilter || "Todos" }, { label: "Tipo", value: typeFilter || "Todos" }], metrics: [{ label: "Total", value: filteredDocs.length }, { label: "Firmados", value: filteredDocs.filter((d) => d.status === "signed").length }] });
      }
    } catch { fail("No se pudo exportar."); }
  }

  const hasDocFilters = !!(search || statusFilter || typeFilter || onlyExpiring);

  // ── JSX ──
  return (
    <div className="min-h-screen bg-slate-50">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <ConfirmDialog state={confirm} onClose={() => setConfirm(null)} />

      {/* Encabezado */}
      <div className="bg-white border-b border-slate-100 px-6 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-indigo-500 shadow-sm shadow-indigo-500/30 flex items-center justify-center text-white text-xl flex-shrink-0">📄</div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Documentos</h1>
              <p className="text-sm text-slate-500 mt-0.5">Gestión documental, plantillas y firma digital</p>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button onClick={() => { setTplForm(blankTplForm()); setTplErrors({}); setCreateTplOpen(true); }} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold transition-colors">📋 Nueva plantilla</button>
            <ExportMenu fileName={makeFileName(tab === "documents" ? "Documentos" : "Plantillas", [statusFilter || null])} filtersActive={hasDocFilters} resultCount={tab === "documents" ? filteredDocs.length : allTpls.length} onExport={handleExport} />
            <button onClick={() => { setDocForm(blankDocForm()); setDocErrors({}); setCreateDocOpen(true); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold shadow-sm shadow-indigo-200 transition-colors">➕ Nuevo documento</button>
          </div>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Documentos vigentes" value={kpis.vigentes.toString()}   sub="Firmados y activos"  icon="✅" accent="bg-emerald-100" />
          <KpiCard label="Pendientes de firma"  value={kpis.pendientes.toString()} sub="En espera de firma"  icon="✍️" accent="bg-amber-100"   />
          <KpiCard label="Por vencer"           value={kpis.porVencer.toString()}  sub="Próximos 30 días"    icon="⚠️" accent="bg-orange-100"  />
          <KpiCard label="Plantillas activas"   value={kpis.plantillas.toString()} sub="En el catálogo"      icon="📋" accent="bg-indigo-100"  />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-slate-200">
          {(["documents", "templates"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`px-5 py-3 text-sm font-semibold border-b-2 -mb-px transition-colors ${tab === t ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
              {t === "documents" ? "📄 Documentos" : "📋 Plantillas"}
            </button>
          ))}
        </div>

        {/* ─── Pestaña Documentos ─── */}
        {tab === "documents" && (
          <>
            {/* Filtros */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-48">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                  <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar por empleado o título..." className="w-full rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                  <option value="">Todos los estados</option>
                  <option value="draft">Borrador</option>
                  <option value="pending_signature">Pendiente firma</option>
                  <option value="signed">Firmado</option>
                  <option value="rejected">Rechazado</option>
                  <option value="expired">Vencido</option>
                  <option value="expiring_soon">Por vencer</option>
                </select>
                <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                  <option value="">Todos los tipos</option>
                  {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <button type="button" role="switch" aria-checked={onlyExpiring} onClick={() => setOnlyExpiring((v) => !v)} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${onlyExpiring ? "bg-orange-500" : "bg-slate-200"}`}>
                    <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${onlyExpiring ? "translate-x-4.5" : "translate-x-0.5"}`} />
                  </button>
                  <span className="text-sm text-slate-700">Por vencer</span>
                </label>
                {hasDocFilters && (
                  <button onClick={() => { setSearch(""); setStatusFilter(""); setTypeFilter(""); setOnlyExpiring(false); }} className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition-colors flex items-center gap-1.5">✕ Limpiar</button>
                )}
                <span className="text-xs text-slate-400 ml-auto whitespace-nowrap">{filteredDocs.length} resultado{filteredDocs.length !== 1 ? "s" : ""}</span>
              </div>
            </div>

            {/* Tabla + panel lateral */}
            <div className="flex gap-6 items-start">
              <div className="flex-1 min-w-0 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {docsQuery.isLoading ? (
                  <div className="flex justify-center py-16"><span className="w-8 h-8 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" /></div>
                ) : filteredDocs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="text-5xl mb-3">📄</div>
                    <p className="text-base font-semibold text-slate-700">{hasDocFilters ? "Sin resultados" : "Aún no hay documentos"}</p>
                    <p className="text-sm text-slate-400 mt-1 max-w-xs">{hasDocFilters ? "Prueba con otros filtros." : "Crea el primer documento laboral."}</p>
                    {!hasDocFilters && <button onClick={() => { setDocForm(blankDocForm()); setDocErrors({}); setCreateDocOpen(true); }} className="mt-4 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors">➕ Nuevo documento</button>}
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Colaborador</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Título</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Emitido</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Vencimiento</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredDocs.map((d, idx) => {
                          const effSt = getEffectiveStatus(d);
                          const st    = statusConfig[effSt] ?? statusConfig["draft"];
                          return (
                            <tr key={d.id} className={`hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${avatarBg(d.employeeName)}`}>{initials(d.employeeName)}</div>
                                  <div><p className="font-semibold text-slate-900 leading-tight">{d.employeeName}</p><p className="text-xs text-slate-400">{d.employeeCode}</p></div>
                                </div>
                              </td>
                              <td className="px-4 py-3 max-w-48"><p className="font-medium text-slate-800 leading-tight truncate">{d.title}</p></td>
                              <td className="px-4 py-3"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">{d.type}</span></td>
                              <td className="px-4 py-3"><span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${st.bg} ${st.text}`}><span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{st.label}</span></td>
                              <td className="px-4 py-3 text-xs text-slate-500">{fmtDate(d.createdAtUtc)}</td>
                              <td className="px-4 py-3 text-center"><ExpirationChip expiresAtUtc={d.expiresAtUtc} /></td>
                              <td className="px-4 py-3 text-right">
                                <DocRowMenu doc={d}
                                  onView={()   => setDetailDocId(d.id)}
                                  onDownloadPdf={() => downloadDocumentPdf(d)}
                                  onDownloadHtml={() => downloadDocumentHtml(d)}
                                  onEmail={() => setEmailDoc(d)}
                                  onSend={()   => setConfirm({ title: "Enviar para firma",   message: `¿Enviar «${d.title}» para firma digital?`,                           danger: false, onConfirm: () => sendMutation.mutate(d.id) })}
                                  onSign={()   => setFirmaDocId(d.id)}
                                  onReject={()  => setRechazarDoc(d)}
                                  onAnul={()   => setConfirm({ title: "Anular documento",    message: `¿Anular «${d.title}»? Esta acción no se puede deshacer.`,             danger: true,  onConfirm: () => rejectMutation.mutate({ id: d.id, reason: "Anulado por RRHH" }) })} />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Panel lateral */}
              <div className="w-64 flex-shrink-0 hidden xl:flex flex-col gap-4">
                {pieData.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Distribución</h3>
                    <div className="flex justify-center">
                      <PieChart width={210} height={160}>
                        <Pie data={pieData} cx="50%" cy="50%" outerRadius={58} dataKey="value" labelLine={false} label={renderPieLabel as (props: unknown) => JSX.Element | null}>
                          {pieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                        </Pie>
                        <Tooltip formatter={(v: number) => [`${v} docs`, ""]} contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e2e8f0" }} />
                      </PieChart>
                    </div>
                    <div className="mt-2 space-y-1.5">
                      {pieData.map((d) => (
                        <div key={d.name} className="flex items-center gap-2 text-xs">
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.fill }} />
                          <span className="text-slate-600 flex-1">{d.name}</span>
                          <span className="font-bold text-slate-900">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {proxVenc.length > 0 && (
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">⚠️ Próx. vencimientos</h3>
                    <div className="space-y-2.5">
                      {proxVenc.map((d) => (
                        <div key={d.id} className="flex items-start justify-between gap-2 py-1.5 border-b border-slate-50 last:border-0">
                          <div className="min-w-0"><p className="text-xs font-semibold text-slate-800 truncate">{d.employeeName}</p><p className="text-xs text-slate-400 truncate">{d.title}</p></div>
                          <p className={`text-xs font-bold flex-shrink-0 ${daysUntil(d.expiresAtUtc!) <= 7 ? "text-red-600" : "text-orange-600"}`}>{daysUntil(d.expiresAtUtc!)}d</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Resumen</h3>
                  <div className="space-y-2">
                    {[
                      { label: "Total documentos", value: allDocs.length },
                      { label: "Firmados",          value: allDocs.filter((d) => d.status === "signed").length },
                      { label: "Borradores",        value: allDocs.filter((d) => d.status === "draft").length },
                      { label: "Rechazados",        value: allDocs.filter((d) => d.status === "rejected").length },
                    ].map(({ label, value }) => (
                      <div key={label} className="flex justify-between items-center py-1 border-b border-slate-50 last:border-0">
                        <span className="text-xs text-slate-500">{label}</span>
                        <span className="text-sm font-bold text-slate-900">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ─── Pestaña Plantillas ─── */}
        {tab === "templates" && (
          <div className="space-y-8">

            {/* Biblioteca de respaldo: solo se muestra si la base aún no tiene plantillas reales */}
            <div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
                <div className="flex-1">
                  <h2 className="text-base font-bold text-slate-900">Biblioteca de plantillas</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Catálogo predefinido de {CATALOG.length} plantillas listas para usar. Haz clic en «Usar» para guardarla en el sistema.</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">🔍</span>
                    <input value={tplSearch} onChange={(e) => setTplSearch(e.target.value)} placeholder="Buscar plantilla..." className="rounded-xl border border-slate-200 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-44" />
                  </div>
                  <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className="rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">
                    <option value="">Todas las categorías</option>
                    {CATALOG_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {(tplSearch || catFilter) && <button onClick={() => { setTplSearch(""); setCatFilter(""); }} className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-500 hover:bg-slate-50 transition-colors">✕</button>}
                </div>
              </div>

              {/* Cards por categoría */}
              {CATALOG_CATEGORIES.filter((cat) => !catFilter || catFilter === cat).map((cat) => {
                const entries = filteredCatalog.filter((e) => e.category === cat);
                if (entries.length === 0) return null;
                const cs = categoryStyle[cat] ?? "bg-slate-50 text-slate-600 border-slate-200";
                return (
                  <div key={cat} className="mb-6">
                    <div className="flex items-center gap-2 mb-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold border ${cs}`}>{cat}</span>
                      <span className="text-xs text-slate-400">{entries.length} plantilla{entries.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {entries.map((entry) => (
                        <div key={entry.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col gap-3 hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-3">
                            <div className="text-2xl flex-shrink-0">{entry.icon}</div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-slate-900 text-sm leading-tight">{entry.name}</p>
                              <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">{entry.type}</span>
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 leading-snug flex-1">{entry.description}</p>
                          <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-400">
                            {entry.requiresSign    && <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">✍️ Colaborador</span>}
                            {entry.requiresHrSign  && <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">🏢 RRHH</span>}
                          </div>
                          <button onClick={() => openCatalogEntry(entry)} className="w-full py-2 rounded-xl border border-indigo-200 text-indigo-700 text-xs font-semibold hover:bg-indigo-50 transition-colors">Usar esta plantilla →</button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}

              {filteredCatalog.length === 0 && (
                <div className="text-center py-12">
                  <div className="text-4xl mb-3">🔍</div>
                  <p className="text-base font-semibold text-slate-700">Sin resultados</p>
                  <p className="text-sm text-slate-400 mt-1">Prueba con otras palabras o limpia los filtros.</p>
                </div>
              )}
            </div>

            {/* Mis plantillas — data real */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Mis plantillas guardadas</h2>
                  <p className="text-xs text-slate-400 mt-0.5">Plantillas personalizadas creadas y guardadas en el sistema.</p>
                </div>
                <button onClick={() => { setTplForm(blankTplForm()); setTplErrors({}); setCreateTplOpen(true); }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-colors">➕ Nueva desde cero</button>
              </div>
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                {tplsQuery.isLoading ? (
                  <div className="flex justify-center py-8"><span className="w-7 h-7 border-2 border-slate-200 border-t-indigo-500 rounded-full animate-spin" /></div>
                ) : allTpls.length === 0 ? (
                  <div className="flex items-center gap-4 px-6 py-5 text-sm text-slate-500">
                    <span className="text-2xl">📭</span>
                    <span>Aún no hay plantillas guardadas. Usa «Usar esta plantilla →» en la biblioteca de arriba para crear la primera.</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100">
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo</th>
                          <th className="px-4 py-3 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Descripción</th>
                          <th className="px-4 py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {allTpls.map((t, idx) => (
                          <tr key={t.id} className={`hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"}`}>
                            <td className="px-4 py-3"><p className="font-semibold text-slate-900">{t.name}</p></td>
                            <td className="px-4 py-3"><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700">{t.type}</span></td>
                            <td className="px-4 py-3 text-xs text-slate-500 max-w-64"><p className="truncate">{t.description ?? "—"}</p></td>
                            <td className="px-4 py-3 text-center"><span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${t.isActive ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>{t.isActive ? "● Activa" : "○ Inactiva"}</span></td>
                            <td className="px-4 py-3 text-right">
                              <TplRowMenu
                                onUse={() => { setTplForm({ name: t.name + " (copia)", type: t.type, category: t.category || "Documentos laborales", htmlContent: t.htmlContent, description: t.description ?? "", requiresSign: t.requiresEmployeeSignature, requiresHrSign: t.requiresHrSignature, isActive: true }); setTplErrors({}); setCreateTplOpen(true); }}
                                onDelete={() => setConfirm({ title: "Eliminar plantilla", message: `¿Eliminar «${t.name}»?`, danger: true, onConfirm: () => deleteTplMutation.mutate(t.id) })} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </div>

      {/* ── Modales ── */}
      <DetalleModal docId={detailDocId} onClose={() => setDetailDocId(null)}
        onSign={(id) => { setDetailDocId(null); setFirmaDocId(id); }}
        onSend={(id) => { sendMutation.mutate(id); setDetailDocId(null); }}
        onReject={(doc) => { setDetailDocId(null); setRechazarDoc(doc); }}
        onEmail={(doc) => { setDetailDocId(null); setEmailDoc(doc); }} />

      <FirmaModal docId={firmaDocId} isPending={signMutation.isPending}
        onClose={() => setFirmaDocId(null)} onConfirm={(id) => signMutation.mutate(id)} />

      <RechazarModal doc={rechazarDoc} isPending={rejectMutation.isPending}
        onClose={() => setRechazarDoc(null)} onConfirm={(id, reason) => rejectMutation.mutate({ id, reason })} />

      <EmailDocumentoModal doc={emailDoc} isPending={emailMutation.isPending}
        onClose={() => setEmailDoc(null)} onConfirm={(doc, form) => emailMutation.mutate({ id: doc.id, form })} />

      <NuevaPlantillaModal open={createTplOpen} isPending={createTplMutation.isPending}
        form={tplForm} errors={tplErrors}
        onChange={(patch) => { setTplForm((f) => ({ ...f, ...patch })); setTplErrors((e) => { const n = { ...e }; Object.keys(patch).forEach((k) => delete n[k]); return n; }); }}
        onClose={() => { setCreateTplOpen(false); setTplErrors({}); }}
        onSave={handleSaveTpl} />

      <NuevoDocumentoModal open={createDocOpen} isPending={createDocMutation.isPending}
        form={docForm} errors={docErrors}
        templates={allTpls}
        employees={documentEmployees}
        onChange={(patch) => { setDocForm((f) => ({ ...f, ...patch })); setDocErrors((e) => { const n = { ...e }; Object.keys(patch).forEach((k) => delete n[k]); return n; }); }}
        onClose={() => { setCreateDocOpen(false); setDocErrors({}); }}
        onSave={handleSaveDoc} />
    </div>
  );
}
