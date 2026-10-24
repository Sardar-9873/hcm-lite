/**
 * Pakistan Tax Slabs on Gross * 12:
 * 0 to 600k: 0
 * 600k to 1.2M: 5% of excess over 600k
 * 1.2M to 2.4M: 30k + 15% of excess over 1.2M
 * 2.4M to 3.6M: 210k + 25% of excess over 2.4M
 * Above 3.6M: 510k + 35% of excess over 3.6M
 */
function calculateAnnualTax(annualGross) {
  if (annualGross <= 600000) return 0;
  if (annualGross <= 1200000) return (annualGross - 600000) * 0.05;
  if (annualGross <= 2400000) return 30000 + (annualGross - 1200000) * 0.15;
  if (annualGross <= 3600000) return 210000 + (annualGross - 2400000) * 0.25;
  return 510000 + (annualGross - 3600000) * 0.35;
}

module.exports = { calculateAnnualTax };