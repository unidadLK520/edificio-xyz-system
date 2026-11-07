// backend/src/modules/mailer/mailer.service.ts
// Servicio de mensajería por correo electrónico con Nodemailer (US3.2 CA06)

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import type { SendMailOptions, SendMailResult } from './mailer.types';

/**
 * Escapa caracteres especiales en cadenas de texto para prevenir inyecciones HTML en correos.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Genera el cuerpo HTML enriquecido para un comunicado oficial del edificio.
 */
export function buildComunicadoEmailHtml(titulo: string, contenido: string): string {
  const safeTitulo = escapeHtml(titulo);
  const safeContenido = escapeHtml(contenido).replace(/\r?\n/g, '<br/>');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${safeTitulo}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f7f6f3; margin: 0; padding: 24px; color: #262422;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2ded5; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
    <tr>
      <td style="background-color: #581c87; padding: 24px 32px; color: #ffffff;">
        <h1 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">🏢 Edificio XYZ — Comunicado Oficial</h1>
      </td>
    </tr>
    <tr>
      <td style="padding: 32px;">
        <h2 style="margin: 0 0 16px 0; font-size: 18px; color: #1e1b4b; font-weight: 700;">${safeTitulo}</h2>
        <div style="font-size: 14px; line-height: 1.6; color: #334155; margin-bottom: 24px;">
          ${safeContenido}
        </div>
        <hr style="border: none; border-top: 1px solid #e2ded5; margin: 24px 0 16px 0;" />
        <p style="margin: 0; font-size: 12px; color: #64748b; line-height: 1.4;">
          Este comunicado ha sido emitido formalmente por la Administración del Edificio XYZ.<br/>
          Por favor no responda a este mensaje automático.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Genera el cuerpo en texto plano para clientes de correo sin soporte HTML.
 */
export function buildComunicadoEmailText(titulo: string, contenido: string): string {
  return `🏢 EDIFICIO XYZ — COMUNICADO OFICIAL\n========================================\n\n${titulo}\n\n${contenido}\n\n========================================\nEste comunicado ha sido emitido formalmente por la Administración del Edificio XYZ.\nPor favor no responda a este mensaje automático.`;
}

export class MailerService {
  private transporter: Transporter | null = null;

  /**
   * Transporte perezoso: no se conecta ni inicializa al arrancar la aplicación.
   * Timeouts estrictos de 10 segundos en conexión, socket y saludo SMTP.
   * Nunca registra MAIL_PASS ni el objeto de transporte en logs.
   */
  private getTransporter(): Transporter {
    if (!this.transporter) {
      const host = process.env.MAIL_HOST;
      const port = process.env.MAIL_PORT ? parseInt(process.env.MAIL_PORT, 10) : 587;
      const secure = process.env.MAIL_SECURE === 'true' || port === 465;
      const user = process.env.MAIL_USER;
      const pass = process.env.MAIL_PASS;

      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: user && pass ? { user, pass } : undefined,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 10000,
      });
    }
    return this.transporter;
  }

  /**
   * Envía un correo con política de seguridad estricta para entornos no productivos.
   * En desarrollo/test, todo mensaje se redirige exclusivamente a MAIL_TEST_TO con asunto "[PRUEBA] ...".
   * Si MAIL_TEST_TO no está configurado fuera de producción, la operación se omite de forma segura.
   */
  async sendMail(options: SendMailOptions): Promise<SendMailResult> {
    const isProduction = process.env.NODE_ENV === 'production';
    const originalTo = options.to?.trim();

    if (!originalTo) {
      return {
        success: false,
        skipped: true,
        motivo: 'Destinatario sin dirección de correo',
      };
    }

    let finalTo = originalTo;
    let finalSubject = options.subject;
    let textContent = options.text;
    let htmlContent = options.html;

    if (!isProduction) {
      const testRecipient = process.env.MAIL_TEST_TO?.trim();
      if (!testRecipient) {
        console.warn(
          '[MAILER] Envío omitido en entorno de no producción: MAIL_TEST_TO no está configurado.'
        );
        return {
          success: false,
          skipped: true,
          motivo: 'MAIL_TEST_TO no configurado fuera de producción',
        };
      }

      finalTo = testRecipient;
      finalSubject = finalSubject.startsWith('[PRUEBA]')
        ? finalSubject
        : `[PRUEBA] ${finalSubject}`;

      textContent = `[AVISO DE PRUEBA — Destinatario original: ${originalTo}]\n\n${options.text}`;
      htmlContent = `<div style="background-color: #fef3c7; color: #92400e; padding: 10px 14px; border-radius: 6px; margin-bottom: 16px; font-family: sans-serif; font-size: 12px; border: 1px solid #fde68a;"><strong>⚠️ MODO DE PRUEBA:</strong> Este mensaje fue redirigido a este buzón de prueba porque el sistema no se encuentra en producción.<br/><strong>Destinatario original:</strong> ${escapeHtml(originalTo)}</div>${options.html}`;
    }

    const from = process.env.MAIL_FROM || 'Edificio XYZ <noreply@edificioxyz.com>';

    try {
      const transporter = this.getTransporter();
      const info = await transporter.sendMail({
        from,
        to: finalTo,
        subject: finalSubject,
        text: textContent,
        html: htmlContent,
      });

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (err: any) {
      // Registrar únicamente el mensaje del error sin imprimir contraseñas ni la configuración SMTP
      console.error(
        '[MAILER] Error al enviar correo:',
        err?.message || 'Fallo desconocido en transporte SMTP'
      );
      return {
        success: false,
        error: err?.message || 'Error en envío SMTP',
      };
    }
  }
}

export const mailerService = new MailerService();
