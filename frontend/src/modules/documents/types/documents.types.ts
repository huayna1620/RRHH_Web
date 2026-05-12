export interface DocumentTemplate {
  id: string;
  name: string;
  type: string;
  category: string;
  htmlContent: string;
  variables: string[];
  requiresEmployeeSignature: boolean;
  requiresHrSignature: boolean;
  format: string;
  description: string | null;
  isActive: boolean;
}

export interface CreateTemplatePayload {
  name: string;
  type: string;
  htmlContent: string;
  description: string;
  category?: string;
  requiresEmployeeSignature?: boolean;
  requiresHrSignature?: boolean;
  format?: string;
}

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeCode: string;
  templateId: string | null;
  title: string;
  type: string;
  htmlContent: string;
  status: "draft" | "pending_signature" | "signed" | "rejected";
  sentForSignatureAtUtc: string | null;
  signedAtUtc: string | null;
  expiresAtUtc: string | null;
  signedByUserName: string | null;
  signatureHash: string | null;
  rejectionReason: string | null;
  createdAtUtc: string;
}

export interface CreateDocumentPayload {
  employeeId: string;
  templateId: string | null;
  title: string;
  type: string;
  htmlContent: string;
  expiresAtUtc: string | null;
}

export interface SendDocumentEmailPayload {
  to?: string | null;
  subject?: string | null;
  message?: string | null;
}
