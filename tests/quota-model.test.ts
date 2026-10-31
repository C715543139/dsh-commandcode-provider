/**
 * Quota-model ratio tests (node:test, zero dependencies).
 *
 * The official GOAT page defines the conversion this module implements: the
 * plan's base credit pool (70 on GOAT) maps a credit to `allowance / base`
 * dollars of a model's usage, so 14 / 35 credits are $20 / $50 on a $100 model
 * and $14 / $35 on a $70 model.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'

import { hasAllowanceTier, isGoatQuotaTier, quotaRatio, quotaValue } from '../src/quota-model.ts'

test('GOAT-eligible tiers are Go and GOAT only', () => {
  assert.equal(isGoatQuotaTier('go'), true)
  assert.equal(isGoatQuotaTier('goat'), true)
  assert.equal(isGoatQuotaTier('pro'), false)
  assert.equal(isGoatQuotaTier('provider'), false)
  assert.equal(isGoatQuotaTier('max'), false)
  assert.equal(isGoatQuotaTier(undefined), false)
})

test('only Go, GOAT and Pro publish per-model allowances', () => {
  assert.equal(hasAllowanceTier('go'), true)
  assert.equal(hasAllowanceTier('goat'), true)
  assert.equal(hasAllowanceTier('pro'), true)
  assert.equal(hasAllowanceTier('provider'), false)
  assert.equal(hasAllowanceTier('max'), false)
  assert.equal(hasAllowanceTier(undefined), false)
})

test('GOAT credits convert to the selected model’s dollars', () => {
  // A $100 model on GOAT: 14 credits → $20, 35 → $50, 70 → $100.
  const ratio = quotaRatio({ monthlyCredits: 70, quotaAllowance: 100 })
  assert.equal(ratio, 100 / 70)
  assert.equal(quotaValue(14, ratio), 20)
  assert.equal(quotaValue(35, ratio), 50)
  assert.equal(quotaValue(70, ratio), 100)

  // A standard $20 model: 14 credits → $4, 35 → $10.
  const standard = quotaRatio({ monthlyCredits: 70, quotaAllowance: 20 })
  assert.equal(quotaValue(14, standard), 4)
  assert.equal(quotaValue(35, standard), 10)
})

test('a full-allowance model is the identity mapping', () => {
  assert.equal(quotaRatio({ monthlyCredits: 70, quotaAllowance: 70 }), 1)
  assert.equal(quotaRatio({ monthlyCredits: 80, quotaAllowance: 80 }), 1)
})

test('no conversion without a model, a known pool, or a positive allowance', () => {
  assert.equal(quotaRatio(undefined), undefined)
  assert.equal(quotaRatio({ monthlyCredits: 70 }), undefined)
  assert.equal(quotaRatio({ monthlyCredits: null, quotaAllowance: 100 }), undefined)
  assert.equal(quotaRatio({ monthlyCredits: 0, quotaAllowance: 100 }), undefined)
  assert.equal(quotaRatio({ monthlyCredits: 70, quotaAllowance: 0 }), undefined)
  assert.equal(quotaRatio({ monthlyCredits: 70, quotaAllowance: -1 }), undefined)
  assert.equal(quotaRatio({ monthlyCredits: 70, quotaAllowance: Number.NaN }), undefined)
  assert.equal(quotaRatio({ monthlyCredits: Number.POSITIVE_INFINITY, quotaAllowance: 100 }), undefined)
})

test('quotaValue keeps the raw credit figure when no ratio applies', () => {
  assert.equal(quotaValue(14, undefined), 14)
  assert.equal(quotaValue(0, undefined), 0)
  assert.equal(quotaValue(14, 2), 28)
})
