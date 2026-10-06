import React, { useState, memo } from 'react';
import { View, I18nManager } from 'react-native';
import Svg, { Path, Defs, LinearGradient as SvgGrad, Stop, Circle, Rect, Line } from 'react-native-svg';
import { usePrefs } from '../context/Prefs';
import { Txt } from './ui';

// Time runs in reading direction: right-to-left in Arabic.
const flip = I18nManager.isRTL ? { transform: [{ scaleX: -1 }] } : null;

function useWidth() {
  const [w, setW] = useState(0);
  return [w, (e) => setW(Math.round(e.nativeEvent.layout.width))];
}

/** Smooth area chart (Catmull-Rom → Bézier) with a glowing last point. */
export const AreaChart = memo(function AreaChart({ values, color, height = 150, gridColor }) {
  const { th } = usePrefs();
  const [w, onLayout] = useWidth();
  const max = Math.max(1, ...values);
  const pad = 8;
  const pts = values.map((v, i) => [
    values.length === 1 ? w / 2 : (i / (values.length - 1)) * (w - pad * 2) + pad,
    height - pad - (v / max) * (height - pad * 3),
  ]);

  let d = '';
  pts.forEach(([x, y], i) => {
    if (i === 0) { d = `M${x},${y}`; return; }
    const [x0, y0] = pts[i - 2] || pts[i - 1];
    const [x1, y1] = pts[i - 1];
    const [x3, y3] = pts[i + 1] || [x, y];
    const c1x = x1 + (x - x0) / 6, c1y = y1 + (y - y0) / 6;
    const c2x = x - (x3 - x1) / 6, c2y = y - (y3 - y1) / 6;
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${x},${y}`;
  });
  const last = pts[pts.length - 1];

  return (
    <View onLayout={onLayout} style={[{ height }, flip]}>
      {w > 0 && pts.length > 0 && (
        <Svg width={w} height={height}>
          <Defs>
            <SvgGrad id="area" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={color} stopOpacity="0.38" />
              <Stop offset="1" stopColor={color} stopOpacity="0" />
            </SvgGrad>
          </Defs>
          {[0.25, 0.5, 0.75].map((f) => (
            <Line key={f} x1={0} x2={w} y1={height * f} y2={height * f} stroke={gridColor || th.border} strokeDasharray="4 6" />
          ))}
          <Path d={`${d} L${last[0]},${height} L${pts[0][0]},${height} Z`} fill="url(#area)" />
          <Path d={d} stroke={color} strokeWidth={2.6} fill="none" strokeLinecap="round" />
          <Circle cx={last[0]} cy={last[1]} r={9} fill={color} opacity={0.25} />
          <Circle cx={last[0]} cy={last[1]} r={4.5} fill={color} />
        </Svg>
      )}
    </View>
  );
});

/** Paired bars per day: a = primary series, b = secondary series. */
export const PairBars = memo(function PairBars({ data, colorA, colorB, height = 120 }) {
  const [w, onLayout] = useWidth();
  const max = Math.max(1, ...data.map((d) => Math.max(d.a, d.b)));
  const slot = data.length ? w / data.length : 0;
  const bw = Math.max(3, Math.min(10, slot / 3.2));
  return (
    <View onLayout={onLayout} style={[{ height }, flip]}>
      {w > 0 && (
        <Svg width={w} height={height}>
          {data.map((d, i) => {
            const x = i * slot + slot / 2;
            const ha = Math.max(2, (d.a / max) * (height - 6));
            const hb = Math.max(2, (d.b / max) * (height - 6));
            return (
              <React.Fragment key={i}>
                <Rect x={x - bw - 1} y={height - ha} width={bw} height={ha} rx={bw / 2} fill={colorA} opacity={d.a ? 1 : 0.25} />
                <Rect x={x + 1} y={height - hb} width={bw} height={hb} rx={bw / 2} fill={colorB} opacity={d.b ? 1 : 0.25} />
              </React.Fragment>
            );
          })}
        </Svg>
      )}
    </View>
  );
});

/** Progress ring with a centered label. */
export function Ring({ pct, size = 92, stroke = 9, color, label, sub }) {
  const { th } = usePrefs();
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, pct || 0));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Svg width={size} height={size}>
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={th.raised} strokeWidth={stroke} fill="none" />
          <Circle cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
            strokeDasharray={`${c * p} ${c}`} strokeLinecap="round" />
        </Svg>
      </View>
      {/* Kept inside the ring's hole whatever the text length. */}
      <View style={{ width: size - stroke * 2 - 12, alignItems: 'center' }}>
        <Txt w="x" size={18} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.5} style={{ textAlign: 'center' }}>{label}</Txt>
        {!!sub && <Txt size={10} color={th.muted} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6} style={{ textAlign: 'center' }}>{sub}</Txt>}
      </View>
    </View>
  );
}

/** Horizontal share bar with label + value. */
export function ShareBar({ label, value, pct, color, icon }) {
  const { th } = usePrefs();
  return (
    <View style={{ marginBottom: 13 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, alignItems: 'center' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
          {icon}
          <Txt w="m" size={13.5}>{label}</Txt>
        </View>
        <Txt w="b" size={13} color={th.muted}>{value}</Txt>
      </View>
      <View style={{ height: 8, borderRadius: 6, backgroundColor: th.raised, overflow: 'hidden' }}>
        <View style={{ width: `${Math.max(pct > 0 ? 3 : 0, pct)}%`, height: '100%', backgroundColor: color, borderRadius: 6 }} />
      </View>
    </View>
  );
}
