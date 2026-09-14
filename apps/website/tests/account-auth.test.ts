import { afterAll, beforeEach, describe, expect, it } from 'vitest'

/**
 * Regression tests for the account-claim hole.
 *
 * A `Customer` row is created without a credential whenever somebody buys
 * without making an account (the Stripe webhook) or signs in with Google.
 * `registerAccount` used to attach the caller's chosen password to such a row,
 * which meant anyone who knew a buyer's email address could claim their account
 * and read their orders, licence keys and support history.
 *
 * These are integration tests on purpose - the defect lived in what the code
 * wrote to the database, so a mocked repository would have hidden it.
 */

const { prisma } = await import('@/lib/db')
const { registerAccount, createResetTokenForEmail, resetPasswordWithToken, loginAccount } = await import(
  '@/lib/account-auth'
)

const STRONG_PASSWORD = 'Corr3ctHorseBattery'

async function clearDatabase() {
  await prisma.credential.deleteMany()
  await prisma.passwordResetToken.deleteMany()
  await prisma.customerSession.deleteMany()
  await prisma.accountActivity.deleteMany()
  // Prisma lower-cases only the first letter, so the model `OAuthIdentity`
  // becomes `oAuthIdentity` - not `oauthIdentity`.
  await prisma.oAuthIdentity.deleteMany()
  await prisma.customer.deleteMany()
}

/** Exactly what the Stripe webhook does for a guest buyer. */
async function createBuyerWithoutPassword(email: string) {
  return prisma.customer.create({
    data: { email, status: 'ACTIVE', fullName: 'Real Buyer' },
  })
}

beforeEach(clearDatabase)
afterAll(async () => {
  await clearDatabase()
  await prisma.$disconnect()
})

describe('registerAccount: claiming an existing account', () => {
  it('refuses to attach a password to a customer that has none', async () => {
    const buyer = await createBuyerWithoutPassword('buyer@example.com')

    await expect(
      registerAccount({ email: 'buyer@example.com', password: STRONG_PASSWORD })
    ).rejects.toThrow('ACCOUNT_CLAIM_REQUIRES_EMAIL')

    // The whole point: the attacker's password must not have been written.
    const credential = await prisma.credential.findUnique({ where: { customerId: buyer.id } })
    expect(credential).toBeNull()
  })

  it('cannot be bypassed with different casing or surrounding whitespace', async () => {
    const buyer = await createBuyerWithoutPassword('buyer@example.com')

    await expect(
      registerAccount({ email: '  BuYeR@Example.COM  ', password: STRONG_PASSWORD })
    ).rejects.toThrow('ACCOUNT_CLAIM_REQUIRES_EMAIL')

    expect(await prisma.credential.findUnique({ where: { customerId: buyer.id } })).toBeNull()
  })

  it('leaves the real owner a working way in, via the emailed reset link', async () => {
    const buyer = await createBuyerWithoutPassword('buyer@example.com')

    // This is the path the register route now triggers on the user's behalf.
    const token = await createResetTokenForEmail('buyer@example.com')
    expect(token).toBeTruthy()

    await resetPasswordWithToken(token as string, STRONG_PASSWORD)

    const credential = await prisma.credential.findUnique({ where: { customerId: buyer.id } })
    expect(credential).not.toBeNull()

    // And the password they chose then actually works.
    const login = await loginAccount({ email: 'buyer@example.com', password: STRONG_PASSWORD })
    expect(login.customer.id).toBe(buyer.id)
  })

  it('does not let a stale reset token be reused', async () => {
    await createBuyerWithoutPassword('buyer@example.com')
    const token = await createResetTokenForEmail('buyer@example.com')

    await resetPasswordWithToken(token as string, STRONG_PASSWORD)
    await expect(resetPasswordWithToken(token as string, 'AnotherPassword1')).rejects.toThrow(
      'TOKEN_INVALID'
    )
  })
})

describe('registerAccount: normal sign-up still works', () => {
  it('creates the customer and the credential for a brand new address', async () => {
    const customer = await registerAccount({
      email: 'New.Person@Example.com',
      password: STRONG_PASSWORD,
      fullName: 'New Person',
    })

    expect(customer.email).toBe('new.person@example.com')

    const credential = await prisma.credential.findUnique({ where: { customerId: customer.id } })
    expect(credential).not.toBeNull()
    expect(credential?.passwordHash).not.toContain(STRONG_PASSWORD)
  })

  it('lets the new account sign in immediately', async () => {
    await registerAccount({ email: 'new@example.com', password: STRONG_PASSWORD })
    const login = await loginAccount({ email: 'new@example.com', password: STRONG_PASSWORD })
    expect(login.token).toBeTruthy()
  })

  it('rejects a second sign-up for an address that already has a password', async () => {
    await registerAccount({ email: 'taken@example.com', password: STRONG_PASSWORD })

    await expect(
      registerAccount({ email: 'taken@example.com', password: 'Different1Password' })
    ).rejects.toThrow('ACCOUNT_EXISTS')
  })

  it('rejects the wrong password on an existing account', async () => {
    await registerAccount({ email: 'new@example.com', password: STRONG_PASSWORD })

    await expect(
      loginAccount({ email: 'new@example.com', password: 'WrongPassword123' })
    ).rejects.toThrow('INVALID_CREDENTIALS')
  })
})
