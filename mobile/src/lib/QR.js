import React, { useMemo } from 'react';
import Svg, { Rect } from 'react-native-svg';
import { makeQR } from './qrcore';

/**
 * Renders a QR code as native vector shapes — no image, no network call.
 * The encoder was verified against the `qrcode-generator` reference
 * implementation and round-tripped through a real decoder (jsQR),
 * including Arabic UTF-8 payloads.
 */
export default function QR({ value, size = 150, dark = '#241726', light = '#FFFFFF' }) {
  const { matrix, cells } = useMemo(() => {
    const m = makeQR(value);
    const n = m.length, q = 4, total = n + q * 2;
    const rects = [];
    for (let y = 0; y < n; y++) {
      let x = 0;
      while (x < n) {
        if (m[y][x]) {
          let w = 1;
          while (x + w < n && m[y][x + w]) w++;
          rects.push({ x: x + q, y: y + q, w });
          x += w;
        } else x++;
      }
    }
    return { matrix: total, cells: rects };
  }, [value]);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${matrix} ${matrix}`}>
      <Rect x={0} y={0} width={matrix} height={matrix} fill={light} />
      {cells.map((c, i) => (
        <Rect key={i} x={c.x} y={c.y} width={c.w} height={1} fill={dark} />
      ))}
    </Svg>
  );
}

export function qrSvgMarkup(value, px, dark = '#241726', light = '#FFFFFF') {
  const m = makeQR(value);
  const n = m.length, q = 4, total = n + q * 2;
  let r = '';
  for (let y = 0; y < n; y++) {
    let x = 0;
    while (x < n) {
      if (m[y][x]) {
        let w = 1;
        while (x + w < n && m[y][x + w]) w++;
        r += `<rect x="${x + q}" y="${y + q}" width="${w}" height="1"/>`;
        x += w;
      } else x++;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="${light}"/><g fill="${dark}">${r}</g></svg>`;
}
