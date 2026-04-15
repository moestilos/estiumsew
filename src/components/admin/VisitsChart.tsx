/**
 * VisitsChart – Gráfica de rosco (donut) para visitas de los últimos 7 días.
 * Segmentos SVG animados con path + stroke-dashoffset, sin dependencias.
 */
import { useState, useEffect } from 'react';

interface DayData { fecha: string; visitas: number; }
interface VisitsData { days: DayData[]; total: number; hoy: number; ayer: number; }

const COLORS = ['#4A3830', '#6B5048', '#8B6B5E', '#A07B6B', '#B68A79', '#C49384', '#C9907A'];

function polarToCart(cx: number, cy: number, r: number, deg: number) {
  const rad = (deg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arcPath(cx: number, cy: number, r: number, start: number, end: number) {
  const s    = polarToCart(cx, cy, r, start);
  const e    = polarToCart(cx, cy, r, end);
  const large = end - start > 180 ? 1 : 0;
  return `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

function arcLen(r: number, deg: number) {
  return (deg / 360) * 2 * Math.PI * r;
}

function fmtDate(fecha: string) {
  const d = new Date(fecha + 'T12:00:00');
  return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
}

export default function VisitsChart() {
  const [data,     setData]     = useState<VisitsData | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [animated, setAnimated] = useState(false);
  const [hovered,  setHovered]  = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/admin/visits')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false); setTimeout(() => setAnimated(true), 100); })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="vc-loading"><div className="vc-skel" /></div>;
  if (!data || !data.days.length) return <div className="vc-empty">Sin datos de visitas aún</div>;

  const last7  = data.days.slice(-7);
  const total7 = last7.reduce((s, d) => s + d.visitas, 0);
  const maxDay = Math.max(...last7.map(d => d.visitas), 1);

  /* ── Donut math ──────────────────────────────── */
  const CX = 100, CY = 100;
  const SW = 18;               // stroke width
  const r  = 78 - SW / 2;     // midpoint radius ≈ 69

  const active    = last7.filter(d => d.visitas > 0).length;
  const GAP       = active > 1 ? 3 : 0;
  const usableDeg = 360 - active * GAP;

  let angle = 0;
  const segs = last7.map((day, i) => {
    const pct   = total7 > 0 ? day.visitas / total7 : 0;
    const sweep = pct * usableDeg;
    const start = angle;
    const end   = angle + sweep;
    if (day.visitas > 0) angle = end + GAP;
    const len  = arcLen(r, sweep);
    const path = sweep > 0.5 ? arcPath(CX, CY, r, start, end) : '';
    return { ...day, pct, sweep, start, end, path, len, color: COLORS[i] };
  });

  const trend    = data.hoy - data.ayer;
  const trendPct = data.ayer > 0 ? Math.round(Math.abs(trend / data.ayer) * 100) : null;
  const avg30    = Math.round(data.total / 30);
  const peak30   = Math.max(...data.days.map(d => d.visitas));

  const centerVal   = hovered !== null ? segs[hovered].visitas : data.hoy;
  const centerLabel = hovered !== null ? fmtDate(segs[hovered].fecha).toUpperCase() : 'HOY';

  return (
    <div className="vc">

      {/* ── Header ── */}
      <div className="vc-head">
        <span className="vc-ttl">Visitas</span>
        <span className="vc-badge">Últimos 7 días</span>
      </div>

      {/* ── Body: donut + leyenda ── */}
      <div className="vc-body">

        {/* Rosco SVG */}
        <div className="vc-ring-wrap">
          <svg viewBox="0 0 200 200" className="vc-ring">

            {/* Track (anillo de fondo) */}
            <circle
              cx={CX} cy={CY} r={r}
              fill="none"
              stroke="rgba(180,130,105,0.07)"
              strokeWidth={SW}
            />

            {total7 > 0 ? (
              segs.map((seg, i) =>
                seg.path ? (
                  <path
                    key={seg.fecha}
                    d={seg.path}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={hovered === i ? SW + 6 : SW}
                    strokeLinecap="butt"
                    strokeDasharray={seg.len}
                    strokeDashoffset={animated ? 0 : seg.len}
                    style={{
                      transition: `stroke-dashoffset 0.85s cubic-bezier(0.16,1,0.3,1) ${i * 0.09}s,
                                   stroke-width 0.2s ease,
                                   filter 0.2s ease`,
                      cursor: 'pointer',
                      filter: hovered === i ? 'drop-shadow(0 0 6px rgba(201,144,122,0.45))' : 'none',
                    } as React.CSSProperties}
                    onMouseEnter={() => setHovered(i)}
                    onMouseLeave={() => setHovered(null)}
                  />
                ) : null
              )
            ) : (
              <circle
                cx={CX} cy={CY} r={r}
                fill="none"
                stroke="rgba(180,130,105,0.1)"
                strokeWidth={SW}
                strokeDasharray={`${0.95 * 2 * Math.PI * r} ${2 * Math.PI * r}`}
              />
            )}

            {/* Número central */}
            <text
              x={CX} y={CY - 10}
              textAnchor="middle"
              fontSize="36"
              fontFamily="'Playfair Display', serif"
              fill="#f5ede8"
            >
              {centerVal}
            </text>

            {/* Label central */}
            <text
              x={CX} y={CY + 9}
              textAnchor="middle"
              fontSize="9"
              fontFamily="Inter, sans-serif"
              fill="#7A6A62"
              letterSpacing="1.8"
            >
              {centerLabel}
            </text>

            {/* Trend (solo cuando no hay hover) */}
            {hovered === null && trendPct !== null && (
              <text
                x={CX} y={CY + 26}
                textAnchor="middle"
                fontSize="11"
                fontFamily="Inter, sans-serif"
                fill={trend >= 0 ? '#8FA88A' : '#c87070'}
              >
                {trend >= 0 ? '▲' : '▼'} {trendPct}%
              </text>
            )}
          </svg>
        </div>

        {/* Leyenda con mini-barras */}
        <div className="vc-legend">
          {last7.map((day, i) => (
            <div
              key={day.fecha}
              className={`vcl${hovered === i ? ' vcl-h' : ''}`}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            >
              <span className="vcl-dot" style={{ background: COLORS[i] }} />
              <span className="vcl-date">{fmtDate(day.fecha)}</span>
              <span className="vcl-track">
                <span
                  className="vcl-fill"
                  style={{
                    width: animated ? `${(day.visitas / maxDay) * 100}%` : '0%',
                    background: COLORS[i],
                    transition: `width 0.7s cubic-bezier(0.16,1,0.3,1) ${0.18 + i * 0.07}s`,
                  }}
                />
              </span>
              <span className="vcl-n">{day.visitas}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Stats footer ── */}
      <div className="vc-foot">
        <div className="vc-stat">
          <span className="vc-sv">{data.total.toLocaleString('es-ES')}</span>
          <span className="vc-sl">total mes</span>
        </div>
        <div className="vc-sep" />
        <div className="vc-stat">
          <span className="vc-sv">{avg30}</span>
          <span className="vc-sl">media / día</span>
        </div>
        <div className="vc-sep" />
        <div className="vc-stat">
          <span className="vc-sv">{peak30}</span>
          <span className="vc-sl">pico máx.</span>
        </div>
      </div>

      <style>{`
        .vc {
          background: #241e1a;
          border: 1px solid rgba(180,130,105,.18);
          border-radius: 20px;
          padding: 22px 26px;
        }

        /* Header */
        .vc-head  { display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; }
        .vc-ttl   { font-size:.65rem; font-weight:500; letter-spacing:2.5px; text-transform:uppercase; color:#7A6A62; }
        .vc-badge {
          font-size:.65rem; font-weight:500; letter-spacing:.5px;
          background:rgba(201,144,122,.1); color:#C9907A;
          padding:3px 10px; border-radius:20px;
          border: 1px solid rgba(201,144,122,.15);
        }

        /* Body layout */
        .vc-body      { display:flex; align-items:center; gap:16px; }
        .vc-ring-wrap { flex-shrink:0; width:190px; }
        .vc-ring      { width:100%; height:auto; overflow:visible; }

        /* Leyenda */
        .vc-legend { flex:1; display:flex; flex-direction:column; gap:6px; min-width:0; }
        .vcl {
          display:flex; align-items:center; gap:8px;
          padding:5px 8px; border-radius:7px;
          transition:background .15s; cursor:default;
        }
        .vcl-h     { background:rgba(201,144,122,.07); }
        .vcl-dot   { width:7px; height:7px; border-radius:50%; flex-shrink:0; }
        .vcl-date  { font-size:.69rem; color:#a89890; width:52px; flex-shrink:0; }
        .vcl-track { flex:1; height:3px; background:rgba(180,130,105,.1); border-radius:2px; overflow:hidden; }
        .vcl-fill  { height:100%; border-radius:2px; }
        .vcl-n     { font-size:.72rem; color:#f5ede8; width:22px; text-align:right; font-variant-numeric:tabular-nums; }

        /* Stats footer */
        .vc-foot { display:flex; align-items:center; margin-top:18px; padding-top:16px; border-top:1px solid rgba(180,130,105,.1); }
        .vc-stat { flex:1; text-align:center; }
        .vc-sv   { display:block; font-family:'Playfair Display',serif; font-size:1.4rem; color:#f5ede8; line-height:1; }
        .vc-sl   { display:block; font-size:.58rem; color:#7A6A62; letter-spacing:1.5px; text-transform:uppercase; margin-top:4px; }
        .vc-sep  { width:1px; height:32px; background:rgba(180,130,105,.1); }

        /* Loading / empty */
        .vc-loading { height:220px; display:flex; align-items:center; justify-content:center; }
        .vc-skel {
          width:100%; height:160px; border-radius:12px;
          background:linear-gradient(90deg,#241e1a 25%,#2e2420 50%,#241e1a 75%);
          background-size:200% 100%; animation:shimmer 1.4s infinite;
        }
        @keyframes shimmer { to { background-position:-200% 0; } }
        .vc-empty { padding:40px; text-align:center; color:#7A6A62; font-size:.85rem; }

        /* Móvil */
        @media (max-width:540px) {
          .vc-body      { flex-direction:column; }
          .vc-ring-wrap { width:160px; }
          .vc-legend    { width:100%; }
        }
      `}</style>
    </div>
  );
}
