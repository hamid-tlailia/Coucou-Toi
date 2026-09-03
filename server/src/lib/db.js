const { PrismaClient } = require('@prisma/client');

// Single shared client — Prisma pools connections internally.
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['error', 'warn', 'query'],
});

module.exports = { prisma };
