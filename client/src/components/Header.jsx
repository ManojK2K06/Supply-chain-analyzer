import React, { useState, useEffect } from 'react';

export function Header({ stats, lastUpdated, onRefresh, showMilitary, onToggleMilitary, showChokepoints, onToggleChokepoints, weatherCount, activeTab, setActiveTab }) {
  const [time, setTime] = useState(new Date());
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const handleRefresh = async () => {
    setSyncing(true);
    await onRefresh();
    setTimeout(() => setSyncing(false), 1500);
  };

  const ago = lastUpdated
    ? Math.round((Date.now() - new Date(lastUpdated)) / 60000) + 'm ago'
    : '—';

  return (
    <header style={{ height: 58, background: '#060d14', borderBottom: '1px solid rgba(220,30,30,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', flexShrink: 0, zIndex: 200, position: 'relative' }}>

      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <RadarSVG />
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 900, color: '#ff2222', letterSpacing: '0.14em' }}>GEOPOLITICAL RADAR</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#334455', letterSpacing: '0.2em' }}>LIVE CONFLICT · ROUTES · MARKETS · WEATHER</div>
        </div>
      </div>

      {/* Center stats */}
      <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
        <Pill n={stats.war}       label="WAR"       color="#ff2222" />
        <Pill n={stats.potential} label="RISK"       color="#f59e0b" />
        <Pill n={stats.total}     label="TRACKED"    color="#8899aa" />
        {weatherCount > 0 && <Pill n={weatherCount} label="WEATHER" color="#22bbff" />}
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Btn active={showChokepoints} onClick={onToggleChokepoints} label="⚓ ROUTES" />
        <Btn active={showMilitary}    onClick={onToggleMilitary}    label="✈ MILITARY" />
        <button
          onClick={handleRefresh}
          style={{ padding: '4px 12px', background: 'transparent', border: '1px solid rgba(220,30,30,0.4)', color: syncing ? '#ff2222' : '#667788', fontFamily: 'var(--font-display)', fontSize: 9, letterSpacing: '0.1em', cursor: 'pointer', borderRadius: 2, transition: 'all 0.2s' }}
        >
          {syncing ? '⟳ SYNCING' : '⟳ SYNC'}
        </button>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: '#aabbcc' }}>{time.toUTCString().slice(17, 25)} UTC</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: '#334455' }}>SYNC {ago}</div>
        </div>
      </div>
    </header>
  );
}

function Pill({ n, label, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: `${color}11`, border: `1px solid ${color}33`, borderRadius: 2 }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: color, boxShadow: `0 0 5px ${color}`, flexShrink: 0, animation: color === '#ff2222' ? 'pulse-red 1.5s ease-in-out infinite' : 'none' }} />
      <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color, lineHeight: 1 }}>{n}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: '#445566', letterSpacing: '0.1em' }}>{label}</span>
    </div>
  );
}

function Btn({ active, onClick, label }) {
  return (
    <button onClick={onClick} style={{
      padding: '4px 10px', background: active ? 'rgba(220,30,30,0.12)' : 'transparent',
      border: `1px solid ${active ? '#dc1e1e' : 'rgba(220,30,30,0.2)'}`,
      color: active ? '#ff2222' : '#556677',
      fontFamily: 'var(--font-display)', fontSize: 9, letterSpacing: '0.08em',
      cursor: 'pointer', borderRadius: 2, transition: 'all 0.2s',
    }}>{label}</button>
  );
}

function RadarSVG() {
  return (
    <svg width="38" height="38" viewBox="0 0 38 38">
      <circle cx="19" cy="19" r="17" fill="none" stroke="rgba(220,30,30,0.15)" strokeWidth="1"/>
      <circle cx="19" cy="19" r="11" fill="none" stroke="rgba(220,30,30,0.25)" strokeWidth="1"/>
      <circle cx="19" cy="19" r="5"  fill="none" stroke="rgba(220,30,30,0.4)"  strokeWidth="1"/>
      <circle cx="19" cy="19" r="2"  fill="#ff2222"/>
      <line x1="19" y1="19" x2="19" y2="2" stroke="#dc1e1e" strokeWidth="1.5"
        style={{ transformOrigin:'19px 19px', animation:'spin-slow 4s linear infinite' }}/>
    </svg>
  );
}
