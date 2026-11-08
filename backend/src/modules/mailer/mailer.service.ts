// backend/src/modules/mailer/mailer.service.ts
// Servicio de mensajería por correo electrónico con Nodemailer (US3.2 CA06)

import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { promises as dnsPromises } from 'dns';
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

// ── Helpers y validación previa de correo electrónico (US3.2 CA06) ───────────

function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMessage));
    }, ms);

    promise
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

interface DnsCacheEntry {
  hasDns: boolean;
  expiresAt: number;
  reason?: string;
}

const DNS_CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos de caché en memoria
const dnsResolutionCache = new Map<string, DnsCacheEntry>();

function isDefinitiveDnsError(err: any): boolean {
  const code = err?.code;
  return code === 'ENOTFOUND' || code === 'ENODATA';
}

/**
 * Consulta registros MX o, en su defecto, registros A para un dominio con timeout de 3 segundos
 * y almacenamiento en caché en memoria por 10 minutos.
 *
 * Distingue errores definitivos (ENOTFOUND, ENODATA) de transitorios (timeout propio, ETIMEOUT,
 * ESERVFAIL, ECONNREFUSED y cualquier otro):
 * - Errores definitivos: marcan el dominio como inválido y se cachean 10 min.
 * - Errores transitorios: no se marcan inválidos, no se cachean y devuelven hasDns: true con reason 'no verificado'.
 */
export async function checkDomainDns(domain: string): Promise<{ hasDns: boolean; reason?: string }> {
  const now = Date.now();
  const cached = dnsResolutionCache.get(domain);
  if (cached && cached.expiresAt > now) {
    return { hasDns: cached.hasDns, reason: cached.reason };
  }

  // 1. Intentar registros MX con timeout de 3 segundos
  try {
    const mxRecords = await withTimeout(
      dnsPromises.resolveMx(domain),
      3000,
      `Tiempo de espera agotado (3 s) consultando registros MX para ${domain}`
    );
    if (mxRecords && mxRecords.length > 0) {
      dnsResolutionCache.set(domain, { hasDns: true, expiresAt: now + DNS_CACHE_TTL_MS });
      return { hasDns: true };
    }
  } catch (mxErr: any) {
    if (!isDefinitiveDnsError(mxErr)) {
      // Error transitorio (timeout propio, ETIMEOUT, ESERVFAIL, ECONNREFUSED u otro): no cachear ni invalidar
      return { hasDns: true, reason: 'no verificado' };
    }
    // Error definitivo (ENOTFOUND, ENODATA): continuar para intentar registros A
  }

  // 2. Si no hay registros MX (error definitivo), intentar registros A con timeout de 3 segundos
  try {
    const aRecords = await withTimeout(
      dnsPromises.resolve4(domain),
      3000,
      `Tiempo de espera agotado (3 s) consultando registros A para ${domain}`
    );
    if (aRecords && aRecords.length > 0) {
      dnsResolutionCache.set(domain, { hasDns: true, expiresAt: now + DNS_CACHE_TTL_MS });
      return { hasDns: true };
    }
  } catch (aErr: any) {
    if (!isDefinitiveDnsError(aErr)) {
      // Error transitorio (timeout propio, ETIMEOUT, ESERVFAIL, ECONNREFUSED u otro): no cachear ni invalidar
      return { hasDns: true, reason: 'no verificado' };
    }
    // Error definitivo en registros A
  }

  // Ambos (MX y A) fallaron con errores definitivos (ENOTFOUND / ENODATA)
  const reason = `El dominio ${domain} no posee registros MX ni A`;
  dnsResolutionCache.set(domain, { hasDns: false, expiresAt: now + DNS_CACHE_TTL_MS, reason });
  return { hasDns: false, reason };
}

export interface EmailValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Valida un correo electrónico antes del despacho:
 * - Formato válido.
 * - Dominio no reservado (example.com/.net/.org, .test, .invalid, .localhost, .local).
 * - Dominio con registro MX o, si no, A (dns.promises, timeout 3 s, caché en memoria 10 min).
 */
export async function validateEmail(email: string): Promise<EmailValidationResult> {
  const trimmed = (email || '').trim();
  if (!trimmed) {
    return { valid: false, reason: 'Dirección de correo vacía' };
  }

  // 1. Formato válido
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, reason: 'Formato de correo inválido' };
  }

  const atIndex = trimmed.lastIndexOf('@');
  if (atIndex <= 0 || atIndex === trimmed.length - 1) {
    return { valid: false, reason: 'Formato de correo inválido' };
  }

  const domain = trimmed.slice(atIndex + 1).toLowerCase().trim();

  // 2. Dominio no reservado (example.com/.net/.org, .test, .invalid, .localhost, .local)
  const isReserved =
    domain === 'example.com' ||
    domain.endsWith('.example.com') ||
    domain === 'example.net' ||
    domain.endsWith('.example.net') ||
    domain === 'example.org' ||
    domain.endsWith('.example.org') ||
    domain === 'test' ||
    domain.endsWith('.test') ||
    domain === 'invalid' ||
    domain.endsWith('.invalid') ||
    domain === 'localhost' ||
    domain.endsWith('.localhost') ||
    domain === 'local' ||
    domain.endsWith('.local');

  if (isReserved) {
    return {
      valid: false,
      reason: `El dominio "${domain}" es un dominio reservado no enrutable`,
    };
  }

  // 3. Dominio con registro MX o, si no, A
  const dnsResult = await checkDomainDns(domain);
  if (!dnsResult.hasDns) {
    return {
      valid: false,
      reason: dnsResult.reason || `El dominio "${domain}" no tiene registros MX ni A`,
    };
  }

  return { valid: true };
}

export class MailerService {
  private transporter: Transporter | null = null;

  /**
   * Transporte perezoso: no se conecta ni inicializa al arrancar la aplicación.
   * Timeouts: connectionTimeout de 20 s, greetingTimeout de 20 s, socketTimeout de 30 s.
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
        connectionTimeout: 20000,
        greetingTimeout: 20000,
        socketTimeout: 30000,
      });
    }
    return this.transporter;
  }

  /**
   * Envía un correo con política de control de destino según MAIL_MODE ('test' o 'real'):
   * - En 'test' (o si falta/otro valor), todo se redirige a MAIL_TEST_TO con asunto "[PRUEBA] ...".
   *   Si MAIL_TEST_TO no está configurado, la operación se omite de forma segura (skipped: true).
   * - En 'real', se envía directamente a la dirección de correo original de la persona.
   * En ambos modos se valida previamente el correo ORIGINAL (formato, dominio no reservado, MX o A).
   * Si no supera la validación previa, no se envía y se retorna error (para quedar 'Fallido').
   */
  async sendMail(options: SendMailOptions): Promise<SendMailResult> {
    const originalTo = options.to?.trim();

    if (!originalTo) {
      return {
        success: false,
        skipped: true,
        motivo: 'Destinatario sin dirección de correo',
      };
    }

    // Validación previa del correo ORIGINAL (también en modo test)
    const validation = await validateEmail(originalTo);
    if (!validation.valid) {
      const atIndex = originalTo.lastIndexOf('@');
      const domain = atIndex >= 0 ? originalTo.slice(atIndex + 1).toLowerCase().trim() : 'inválido';
      console.warn(
        `[MAILER] Validación fallida para dominio "${domain}": ${validation.reason}`
      );
      return {
        success: false,
        skipped: false,
        error: validation.reason || 'Correo o dominio inválido',
      };
    }

    // Modo por MAIL_MODE ('test' o 'real'); si falta o es otro valor, 'test'.
    const rawMode = (process.env.MAIL_MODE || '').trim().toLowerCase();
    const isRealMode = rawMode === 'real';

    let finalTo = originalTo;
    let finalSubject = options.subject;
    let textContent = options.text;
    let htmlContent = options.html;

    if (!isRealMode) {
      const testRecipient = process.env.MAIL_TEST_TO?.trim();
      if (!testRecipient) {
        console.warn(
          '[MAILER] Envío omitido en modo test: MAIL_TEST_TO no está configurado.'
        );
        return {
          success: false,
          skipped: true,
          motivo: 'MAIL_TEST_TO no configurado en modo test',
        };
      }

      finalTo = testRecipient;
      finalSubject = finalSubject.startsWith('[PRUEBA]')
        ? finalSubject
        : `[PRUEBA] ${finalSubject}`;

      textContent = `[AVISO DE PRUEBA — Destinatario original: ${originalTo}]\n\n${options.text}`;
      htmlContent = `<div style="background-color: #fef3c7; color: #92400e; padding: 10px 14px; border-radius: 6px; margin-bottom: 16px; font-family: sans-serif; font-size: 12px; border: 1px solid #fde68a;"><strong>⚠️ MODO DE PRUEBA:</strong> Este mensaje fue redirigido a este buzón de prueba porque MAIL_MODE está configurado en 'test'.<br/><strong>Destinatario original:</strong> ${escapeHtml(originalTo)}</div>${options.html}`;
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
