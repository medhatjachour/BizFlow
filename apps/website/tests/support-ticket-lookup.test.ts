import { afterAll, beforeEach, describe, expect, it } from 'vitest'

/**
 * Regression tests for anonymous support-ticket disclosure.
 *
 * A ticket id is short, time-based (millisecond timestamp plus 3 random bytes)
 * and is handed around in emails and in the copy button on the support form.
 * `GET /api/support/tickets/[publicId]` used to return the customer's address
 * and the whole conversation to any caller, so an id was effectively a bearer
 * token for somebody else's support history.
 *
 * The lookup now needs the address the ticket was raised from, so these tests
 * exercise the real route handler rather than the helper underneath it - the
 * missing check was in the route.
 */

const { prisma } = await import('@/lib/db')
const { createSupportTicket } = await import('@/lib/commerce-db')
const { GET } = await import('@/app/api/support/tickets/[publicId]/route')

async function callLookup(publicId: string, email?: string) {
  const query = email === undefined ? '' : `?email=${encodeURIComponent(email)}`
  const request = new Request(
    `https://www.bizflow.medhatjachour.tech/api/support/tickets/${publicId}${query}`
  )
  const response = await GET(request, { params: Promise.resolve({ publicId }) })
  return { status: response.status, body: (await response.json()) as Record<string, unknown> }
}

async function clearDatabase() {
  await prisma.supportMessage.deleteMany()
  await prisma.supportTicket.deleteMany()
  await prisma.credential.deleteMany()
  await prisma.customer.deleteMany()
}

beforeEach(clearDatabase)
afterAll(async () => {
  await clearDatabase()
  await prisma.$disconnect()
})

describe('support ticket lookup', () => {
  it('returns the ticket when the id and the email both match', async () => {
    const ticket = await createSupportTicket({
      email: 'owner@example.com',
      subject: 'Printer will not print',
      category: 'installation',
      message: 'Nothing comes out of the thermal printer.',
      priority: 'high',
    })

    const { status, body } = await callLookup(ticket.publicId, 'owner@example.com')

    expect(status).toBe(200)
    expect(body.ok).toBe(true)
    expect((body.ticket as { subject: string }).subject).toBe('Printer will not print')
  })

  it('refuses the lookup when the email does not match', async () => {
    const ticket = await createSupportTicket({
      email: 'owner@example.com',
      subject: 'Printer will not print',
      category: 'installation',
      message: 'Nothing comes out of the thermal printer.',
    })

    const { status, body } = await callLookup(ticket.publicId, 'attacker@example.com')

    expect(status).toBe(404)
    // Nothing about the real ticket may leak on a rejected lookup.
    expect(JSON.stringify(body)).not.toContain('owner@example.com')
    expect(JSON.stringify(body)).not.toContain('Printer will not print')
  })

  it('refuses the lookup when no email is supplied at all', async () => {
    const ticket = await createSupportTicket({
      email: 'owner@example.com',
      subject: 'Printer will not print',
      category: 'installation',
      message: 'Nothing comes out of the thermal printer.',
    })

    const { status } = await callLookup(ticket.publicId)

    expect(status).toBe(400)
  })

  it('answers 404 for an unknown id regardless of the email', async () => {
    const wrongEmail = await callLookup('BF-NOPE-000000', 'anyone@example.com')
    const rightShape = await callLookup('BF-NOPE-000000', 'owner@example.com')

    expect(wrongEmail.status).toBe(404)
    expect(rightShape.status).toBe(404)
    // A wrong email and an unknown id must be indistinguishable. requestId is
    // unique per request by design, so compare everything except that.
    const withoutRequestId = (body: Record<string, unknown>) => {
      const copy = { ...body }
      delete copy.requestId
      return copy
    }
    expect(withoutRequestId(wrongEmail.body)).toEqual(withoutRequestId(rightShape.body))
  })

  it('tolerates casing and surrounding whitespace on the email', async () => {
    const ticket = await createSupportTicket({
      email: 'owner@example.com',
      subject: 'Receipt is blank',
      category: 'bug',
      message: 'The receipt prints but the totals are missing.',
    })

    const { status } = await callLookup(ticket.publicId, '  OWNER@Example.COM  ')

    expect(status).toBe(200)
  })

  it('does not let one ticket holder read another ticket', async () => {
    const mine = await createSupportTicket({
      email: 'mine@example.com',
      subject: 'My ticket',
      category: 'general',
      message: 'This is my own question about the licence.',
    })
    const theirs = await createSupportTicket({
      email: 'theirs@example.com',
      subject: 'Confidential pricing',
      category: 'billing',
      message: 'Our negotiated rate is 150 per seat.',
    })

    const { status, body } = await callLookup(theirs.publicId, 'mine@example.com')

    expect(status).toBe(404)
    expect(JSON.stringify(body)).not.toContain('Confidential pricing')
    // The first ticket still works for its own owner.
    expect((await callLookup(mine.publicId, 'mine@example.com')).status).toBe(200)
  })
})
