const { prisma } = require('../lib/db');
const { planOf } = require('../lib/plans');

/**
 * The quota check and the increment happen in ONE transaction, so two
 * concurrent "create order" requests from a flaky connection can't both
 * slip through when only one slot is left (a classic race condition that
 * would otherwise let a free-tier user quietly exceed 10 orders).
 */
async function withQuota(userId, fn) {
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.findUniqueOrThrow({ where: { id: userId } });

    // Roll the monthly counter over if we've crossed the reset date.
    let quotaUsed = user.quotaUsed;
    let quotaResetAt = user.quotaResetAt;
    if (new Date() >= quotaResetAt) {
      quotaUsed = 0;
      quotaResetAt = nextMonthFirst();
      await tx.user.update({ where: { id: userId }, data: { quotaUsed, quotaResetAt } });
    }

    const plan = planOf(user.plan);
    if (quotaUsed >= plan.quota) {
      const err = new Error('quota_exceeded');
      err.status = 402; // Payment Required — precise, machine-readable signal for the app
      throw err;
    }

    const result = await fn(tx, user);
    await tx.user.update({ where: { id: userId }, data: { quotaUsed: quotaUsed + 1 } });
    return result;
  });
}

function nextMonthFirst() {
  const d = new Date();
  d.setUTCMonth(d.getUTCMonth() + 1, 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

module.exports = { withQuota };
