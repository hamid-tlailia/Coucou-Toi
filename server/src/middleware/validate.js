/**
 * Wraps a zod schema so every route validates its input BEFORE it touches
 * the database — closes the door on injection via unexpected field types
 * (Prisma parametrizes queries, so classic SQLi isn't the risk; malformed
 * payloads and mass-assignment are).
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      return res.status(400).json({ error: 'validation_failed', details: result.error.flatten() });
    }
    req[source] = result.data;
    next();
  };
}

module.exports = { validate };
