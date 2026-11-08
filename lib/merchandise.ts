export const DEFAULT_SIZES = ["S", "M", "L", "XL", "XXL"];

/**
 * T-shirts always offer a Small option, even when an older catalogue record was
 * saved without one.
 */
export function normalizeSizes(item: {
  category?: string;
  availableSizes?: string[] | null;
}): string[] {
  const sizes =
    Array.isArray(item.availableSizes) && item.availableSizes.length
      ? item.availableSizes.filter(Boolean)
      : DEFAULT_SIZES;

  if (item.category === "tshirt") {
    return Array.from(new Set(["S", ...sizes]));
  }
  return sizes;
}
