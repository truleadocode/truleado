/**
 * Finance Input Validators
 *
 * Server-side validation for all financial inputs.
 * Uses strict rules for amounts, currencies, and required fields.
 */

import { validationError } from '@/graphql/errors';

/**
 * ISO 4217 currency codes (common subset).
 */
const VALID_CURRENCIES = new Set([
  'AED', 'ARS', 'AUD', 'BDT', 'BHD', 'BRL', 'CAD', 'CHF', 'CLP', 'CNY',
  'COP', 'CZK', 'DKK', 'EGP', 'EUR', 'GBP', 'HKD', 'HUF', 'IDR', 'ILS',
  'INR', 'JPY', 'KRW', 'KWD', 'LKR', 'MAD', 'MXN', 'MYR', 'NGN', 'NOK',
  'NZD', 'PEN', 'PHP', 'PKR', 'PLN', 'QAR', 'RON', 'RUB', 'SAR', 'SEK',
  'SGD', 'THB', 'TRY', 'TWD', 'UAH', 'USD', 'UYU', 'VND', 'ZAR',
]);

const VALID_EXPENSE_CATEGORIES = new Set([
  'ad_spend', 'travel', 'shipping', 'production', 'platform_fees', 'miscellaneous',
]);

/**
 * Validate a monetary amount.
 * Must be positive with at most 2 decimal places.
 */
export function validateAmount(amount: number, fieldName = 'amount'): void {
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw validationError(`${fieldName} must be a valid number`, fieldName);
  }
  if (amount <= 0) {
    throw validationError(`${fieldName} must be positive`, fieldName);
  }
  // Check decimal precision (allow up to 2 decimal places)
  const parts = String(amount).split('.');
  if (parts[1] && parts[1].length > 2) {
    throw validationError(`${fieldName} must have at most 2 decimal places`, fieldName);
  }
}

/**
 * Validate a currency code against ISO 4217.
 */
export function validateCurrency(currency: string, fieldName = 'currency'): void {
  if (!currency || typeof currency !== 'string') {
    throw validationError(`${fieldName} is required`, fieldName);
  }
  const upper = currency.toUpperCase();
  if (!VALID_CURRENCIES.has(upper)) {
    throw validationError(`${fieldName} "${currency}" is not a valid ISO 4217 currency code`, fieldName);
  }
}

/**
 * Validate an expense category.
 */
export function validateExpenseCategory(category: string, fieldName = 'category'): void {
  if (!category || !VALID_EXPENSE_CATEGORIES.has(category.toLowerCase())) {
    throw validationError(
      `${fieldName} must be one of: ${Array.from(VALID_EXPENSE_CATEGORIES).join(', ')}`,
      fieldName
    );
  }
}

/**
 * Validate a budget control type.
 */
export function validateBudgetControlType(
  type: string | undefined | null,
  fieldName = 'budgetControlType'
): void {
  if (type != null && type.toLowerCase() !== 'soft' && type.toLowerCase() !== 'hard') {
    throw validationError(`${fieldName} must be "soft" or "hard"`, fieldName);
  }
}

/**
 * Validate a required string field.
 */
export function validateRequiredString(
  value: string | undefined | null,
  fieldName: string
): void {
  if (!value || typeof value !== 'string' || value.trim().length === 0) {
    throw validationError(`${fieldName} is required`, fieldName);
  }
}
