/**
 * Support contact details shared by every help surface.
 *
 * Kept in its own module so the English and Arabic help content can both import
 * it without creating a circular import between the two content files.
 *
 * `support@bizflow.medhatjachour.tech` was unreachable — the domain publishes no
 * MX records, so mail to it bounced and the "contact us" link silently went
 * nowhere. This is the same inbox the website sends request notifications to.
 * Switch it back to a branded address once mail hosting exists.
 */
export const SUPPORT_EMAIL = 'medhatjachour8@gmail.com'
