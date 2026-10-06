/**
 * Product catalog, read live from the store's Shopify site (products.json is
 * public). Prices and availability stay in sync with the website without
 * any manual entry. Cached in memory for a few minutes per server instance.
 */
const SHOP_URL = (process.env.SHOP_URL || 'https://aronaperfume.com').replace(/\/+$/, '');
const TTL_MS = 3 * 60 * 1000;

let cache = { at: 0, items: [] };

// Shopify titles use decorative Unicode (𝐂𝐎𝐔𝐂𝐎𝐔 𝐓𝐎𝐈 𝟻𝟶 𝙼𝙻, ꜱᴜᴍᴍᴇʀ ᴛɪᴍᴇ).
// NFKC turns the math alphabets into plain letters; small caps need a map.
const SMALL_CAPS = { ᴀ: 'A', ʙ: 'B', ᴄ: 'C', ᴅ: 'D', ᴇ: 'E', ꜰ: 'F', ɢ: 'G', ʜ: 'H', ɪ: 'I', ᴊ: 'J', ᴋ: 'K', ʟ: 'L', ᴍ: 'M', ɴ: 'N', ᴏ: 'O', ᴘ: 'P', ʀ: 'R', ꜱ: 'S', ᴛ: 'T', ᴜ: 'U', ᴠ: 'V', ᴡ: 'W', ʏ: 'Y', ᴢ: 'Z' };

function cleanTitle(s) {
  return String(s || '')
    .normalize('NFKC')
    .replace(/[ᴀ-ᴫꜰ-ꟿɐ-ʯ]/g, (c) => SMALL_CAPS[c] || c)
    .replace(/\s+/g, ' ')
    .replace(/\(\s*/g, '(').replace(/\s*\)/g, ')')
    .replace(/(\d+)\s*ML/gi, '$1 ML')
    .trim()
    .toUpperCase();
}

async function getCatalog() {
  if (Date.now() - cache.at < TTL_MS && cache.items.length) return cache.items;
  try {
    const res = await fetch(`${SHOP_URL}/products.json?limit=250`, { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(`shop responded ${res.status}`);
    const data = await res.json();
    const items = [];
    for (const p of data.products || []) {
      for (const v of p.variants || []) {
        const name = cleanTitle(v.title && v.title !== 'Default Title' ? `${p.title} ${v.title}` : p.title);
        items.push({
          id: String(v.id),
          name,
          price: Number(v.price),
          available: v.available !== false,
          image: (v.featured_image?.src || p.images?.[0]?.src || null),
        });
      }
    }
    // Available first, then by name.
    items.sort((a, b) => (b.available - a.available) || a.name.localeCompare(b.name));
    cache = { at: Date.now(), items };
    return items;
  } catch (e) {
    console.error('catalog fetch failed', e.message);
    return cache.items; // last good copy (possibly empty)
  }
}

module.exports = { getCatalog, cleanTitle };
