import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combines class names using clsx and tailwind-merge
 * @param {...*} inputs - Class names or objects to merge
 * @returns {string} - Merged class names
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number as Indian Rupees
 * @param {number} amount - Amount to format
 * @returns {string} - Formatted currency string
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
  }).format(amount);
}

/**
 * Formats weight in grams to a readable string
 * @param {number} weight - Weight in grams
 * @returns {string} - Formatted weight string
 */
export function formatWeight(weight) {
  if (weight >= 1000) {
    return `${(weight / 1000).toFixed(1)}kg`;
  }
  return `${weight}g`;
}

export const formatDate = (timestamp) => {
  if (!timestamp) return 'N/A';
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(new Date(timestamp));
};

export const isWithinLast6Months = (timestamp) => {
  if (!timestamp) return false;
  const date = new Date(timestamp);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  return date >= sixMonthsAgo;
};
