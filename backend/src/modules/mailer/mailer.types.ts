// backend/src/modules/mailer/mailer.types.ts
// Tipos para el servicio de envío de correos electrónicos (US3.2 CA06)

export interface SendMailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export interface SendMailResult {
  success: boolean;
  messageId?: string;
  error?: string;
  skipped?: boolean;
  motivo?: string;
}
