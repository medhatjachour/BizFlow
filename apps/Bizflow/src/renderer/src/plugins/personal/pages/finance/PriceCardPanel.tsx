// ─── Personal Work: price card ───────────────────────────────────────────────
// The same short service list priced three ways off the rate engine, so a quote
// can be answered on the spot: standard, retainer (loyalty) and rush. Every tier
// is floored at the minimum project price, because the cheapest way to lose money
// is to discount below what the work costs you.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useState } from 'react'
import { AlertTriangle, Copy, Plus, Tag, Trash2 } from 'lucide-react'
import { useLanguage } from '@renderer/contexts/LanguageContext'
import { useQuietToast } from '../hooks/useQuietRuntime'
import Button from '@renderer/components/ui/Button'
import FormInput from '@renderer/components/ui/FormInput'
import SectionCard from '../components/SectionCard'
import StatCard from '../components/StatCard'
import EmptyState from '../components/EmptyState'
import BreakdownList from '../components/BreakdownList'
import MetricStrip from '../components/MetricStrip'
import StatusPill from '../components/StatusPill'
import { useAsync } from '../hooks/useAsync'
import { copyText, formatMoney, formatNumber } from '../utils'

interface ServiceRow {
  name: string
  hours: string
  price: string
}

interface PriceCardLine {
  name: string
  hours: number
  base: number
  price: number
}

interface PriceCardTier {
  id: string
  multiplier: number
  lines: PriceCardLine[]
  subtotal: number
  total: number
  floorApplied: boolean
}

interface PriceCardResult {
  engine: {
    baselineHourlyRate: number
    floorHourlyRate: number
    minimumProjectPrice: number
    currency: string
  }
  card: {
    baselineHourlyRate: number
    floorHourlyRate: number
    minimumProjectPrice: number
    currency: string
    tiers: PriceCardTier[]
  }
}

const TIER_LABEL: Record<string, string> = {
  standard: 'pwPriceTierStandard',
  retainer: 'pwPriceTierRetainer',
  rush: 'pwPriceTierRush'
}

const emptyService = (): ServiceRow => ({ name: '', hours: '8', price: '' })

export default function PriceCardPanel() {
  const { t } = useLanguage()
  const toast = useQuietToast()

  const [services, setServices] = useState<ServiceRow[]>([emptyService()])
  const [retainerDiscountPercent, setRetainerDiscountPercent] = useState('10')
  const [rushSurchargePercent, setRushSurchargePercent] = useState('25')

  const payload = useMemo(
    () => ({
      services: services
        .filter((service) => service.name.trim() !== '')
        .map((service) => ({
          name: service.name.trim(),
          hours: Number(service.hours || 0),
          price: Number(service.price || 0)
        })),
      retainerDiscountPercent: Number(retainerDiscountPercent || 0),
      rushSurchargePercent: Number(rushSurchargePercent || 0)
    }),
    [services, retainerDiscountPercent, rushSurchargePercent]
  )

  const card = useAsync<PriceCardResult>(
    () => window.api.personal.finance.priceCard(payload) as Promise<PriceCardResult>,
    [payload]
  )

  const engine = card.data?.engine
  const tiers = card.data?.card.tiers ?? []
  const currency = card.data?.card.currency ?? 'USD'
  const money = (value: number) => formatMoney(value, currency)
  const hasLines = tiers.some((tier) => tier.lines.length > 0)

  const updateService = (index: number, patch: Partial<ServiceRow>) =>
    setServices((current) =>
      current.map((service, i) => (i === index ? { ...service, ...patch } : service))
    )

  const tierTitle = (tier: PriceCardTier) => t(TIER_LABEL[tier.id] ?? 'pwPriceTierStandard')

  const cardText = () => {
    if (!card.data) return ''
    const lines: string[] = [`${t('pwPriceCard')} — ${currency}`]
    lines.push(`${t('pwBaseline')}: ${money(card.data.card.baselineHourlyRate)}/h`)
    for (const tier of tiers) {
      lines.push('', `${tierTitle(tier)} (×${formatNumber(tier.multiplier, 2)})`)
      for (const line of tier.lines) {
        lines.push(`  ${line.name} — ${formatNumber(line.hours)}h — ${money(line.price)}`)
      }
      lines.push(`  ${t('pwPriceTotal')}: ${money(tier.total)}`)
    }
    return lines.join('\n')
  }

  const copyCard = async () => {
    const ok = await copyText(cardText())
    if (ok) toast.success(t('pwCopied'))
    else toast.error(t('pwCopyFailed'))
  }

  return (
    <div className="space-y-4">
      <MetricStrip size="three">
        <StatCard
          label={t('pwBaseline')}
          value={engine ? `${money(engine.baselineHourlyRate)}/h` : '—'}
          sub={t('pwPriceCardHint')}
        />
        <StatCard
          label={t('pwFloorRate')}
          value={engine ? `${money(engine.floorHourlyRate)}/h` : '—'}
          sub={t('pwFloorRateHint')}
          tone="warning"
        />
        <StatCard
          label={t('pwMinProjectPrice')}
          value={engine ? money(engine.minimumProjectPrice) : '—'}
        />
      </MetricStrip>

      <SectionCard
        title={t('pwPriceCard')}
        description={t('pwPriceCardHint')}
        icon={<Tag className="h-3.5 w-3.5" />}
        actions={
          <Button size="xs" variant="secondary" onClick={copyCard} disabled={!hasLines}>
            <Copy className="h-3.5 w-3.5" />
            <span className="ms-1.5">{t('pwPriceCardCopy')}</span>
          </Button>
        }
      >
        <div className="space-y-3">
          {services.map((service, index) => (
            <div
              key={index}
              className="grid grid-cols-1 items-end gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]"
            >
              <FormInput
                size="sm"
                label={t('pwPriceServiceName')}
                value={service.name}
                onChange={(value) => updateService(index, { name: value })}
              />
              <FormInput
                size="sm"
                label={t('pwPriceServiceHours')}
                type="number"
                min={0}
                step="0.5"
                value={service.hours}
                onChange={(value) => updateService(index, { hours: value })}
              />
              <FormInput
                size="sm"
                label={t('pwPriceServicePrice')}
                type="number"
                min={0}
                step="0.01"
                value={service.price}
                onChange={(value) => updateService(index, { price: value })}
                helperText={index === 0 ? t('pwPriceServicePriceHint') : undefined}
              />
              <Button
                size="xs"
                variant="danger"
                onClick={() => setServices((current) => current.filter((_, i) => i !== index))}
                disabled={services.length === 1}
                aria-label={t('pwDelete')}
                title={t('pwDelete')}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}

          <div className="flex flex-wrap items-end gap-3">
            <Button
              size="xs"
              variant="secondary"
              onClick={() => setServices((current) => [...current, emptyService()])}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="ms-1.5">{t('pwPriceAddService')}</span>
            </Button>
            <div className="w-40">
              <FormInput
                size="sm"
                label={t('pwPriceDiscount')}
                type="number"
                min={0}
                max={90}
                step="0.5"
                value={retainerDiscountPercent}
                onChange={setRetainerDiscountPercent}
              />
            </div>
            <div className="w-40">
              <FormInput
                size="sm"
                label={t('pwPriceSurcharge')}
                type="number"
                min={0}
                step="0.5"
                value={rushSurchargePercent}
                onChange={setRushSurchargePercent}
              />
            </div>
          </div>
        </div>
      </SectionCard>

      {card.error ? (
        <SectionCard>
          <p className="text-sm text-red-600 dark:text-red-400">{card.error}</p>
        </SectionCard>
      ) : !hasLines ? (
        <SectionCard>
          <EmptyState
            message={card.loading ? undefined : t('pwPriceCardEmpty')}
            loading={card.loading}
          />
        </SectionCard>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {tiers.map((tier) => (
            <SectionCard
              key={tier.id}
              title={tierTitle(tier)}
              actions={
                <StatusPill tone="accent" dot={false}>
                  ×{formatNumber(tier.multiplier, 2)}
                </StatusPill>
              }
            >
              <div className="space-y-3">
                <BreakdownList
                  rows={[
                    ...tier.lines.map((line) => ({
                      label: line.name,
                      hint: `${formatNumber(line.hours, 2)}h`,
                      value: money(line.price)
                    })),
                    {
                      label: t('pwPriceTotal'),
                      value: money(tier.total),
                      tone: 'total' as const
                    }
                  ]}
                />
                {tier.floorApplied && (
                  <p className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    {t('pwPriceFloorNote', { amount: money(card.data!.card.minimumProjectPrice) })}
                  </p>
                )}
              </div>
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  )
}
