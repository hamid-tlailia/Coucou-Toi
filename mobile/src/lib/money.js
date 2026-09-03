// Tunisian dinar formatting — 3 decimal places (millimes), symbol د.ت.
export function formatTND(amount, { withSymbol = true } = {}) {
  const n = Number(amount || 0);
  const s = n.toLocaleString('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
  return withSymbol ? `${s} د.ت` : s;
}
