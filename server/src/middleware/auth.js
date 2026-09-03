const { verifyAccessToken } = require('../lib/jwt');
const { prisma } = require('../lib/db');

/**
 * Every protected route runs through this. A bad/expired/missing token
 * always gets a generic 401 — never a message revealing whether the user
 * exists, to avoid account enumeration.
 */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'unauthorized' });

  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) return res.status(401).json({ error: 'unauthorized' });

  req.user = user;
  next();
}

module.exports = { requireAuth };
