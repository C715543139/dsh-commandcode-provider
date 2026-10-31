/**
 * Quota-model conversion: express the account's plan quota in the monthly
 * allowance of ONE selected model.
 *
 * Command Code's Go, GOAT and Pro plans meter usage in *credits*, not dollars.
 * The official usage-limits page defines the ratio:
 *
 * - the plan publishes a base credit pool (`plan.monthlyCredits` in the report:
 *   Go 10, GOAT 70, Pro 80 on the current `-v1` plan);
 * - every model publishes a monthly allowance in USD for that plan
 *   (`planAllowanceUsd` on the pricing page / `allowance` in the vendored price
 *   rows), e.g. GOAT: Ling 3.1 Flash $100, GLM-5.2 $70, standard $20;
 * - one dollar of usage on a model with allowance A consumes
 *   `baseCredits / A` credits, so the inverse maps one credit to
 *   `A / baseCredits` dollars of that model's usage.
 *
 * On GOAT this makes the 14-credit five-hour window worth $20 on a $100 model
 * and $14 on a $70 model, exactly as the GOAT plan page states. `Max`, `Teams
 * Pro`, `Provider` and unknown plans have no per-model allowance; there the
 * ratio is undefined and every surface keeps the plan's raw credit figures.
 *
 * This module is dependency-free and bundled into the browser client.
 *
 * @module dsh-commandcode-provider/quota-model
 */

/** The plan tiers that publish per-model monthly allowances. */
const ALLOWANCE_TIERS: readonly string[] = ['go', 'goat', 'pro']

/**
 * The plan fields the conversion needs. Structural on purpose: the Host's
 * report type and the browser's projection can both pass their plan object
 * without this module importing the adapter.
 */
export interface QuotaPlanBasis {
  /** The plan's base monthly credit pool (the unit the billing endpoint reports). */
  monthlyCredits: number | null
  /**
   * The selected model's monthly allowance in USD for THIS plan, resolved by
   * the Host. Absent when no quota model is configured, when the plan has no
   * per-model allowance, or when the model has no allowance row.
   */
  quotaAllowance?: number | undefined
}

/**
 * The tiers whose models can be chosen for quota display. The requirement is
 * "models available on the GOAT plan", i.e. every Go-tier model plus the
 * GOAT-tier ones; Pro-first models are not included. Free models carry no
 * monthly allowance and are filtered out by the caller instead of here.
 */
export function isGoatQuotaTier(tier: string | undefined): boolean {
  return tier === 'go' || tier === 'goat'
}

/** Whether a plan tier publishes a per-model monthly allowance at all. */
export function hasAllowanceTier(tier: string | undefined): boolean {
  return tier !== undefined && ALLOWANCE_TIERS.includes(tier)
}

/**
 * Credits → the selected model's dollars, or undefined when the conversion is
 * not defined (no model, unknown plan, zero/missing values).
 *
 * A zero/negative allowance is deliberately NOT a ratio: it would turn every
 * figure into `$0.00` and read as a fully exhausted quota. The surfaces must
 * keep the raw credits instead, which is also what an unselected model shows.
 */
export function quotaRatio(plan: QuotaPlanBasis | undefined): number | undefined {
  if (plan === undefined) return undefined
  const base = plan.monthlyCredits
  const allowance = plan.quotaAllowance
  if (base === null || !Number.isFinite(base) || base <= 0) return undefined
  if (allowance === undefined || !Number.isFinite(allowance) || allowance <= 0) return undefined
  return allowance / base
}

/** Apply a ratio to a credit figure; an undefined ratio keeps the raw value. */
export function quotaValue(value: number, ratio: number | undefined): number {
  return ratio === undefined ? value : value * ratio
}
