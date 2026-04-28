import React, { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

const S_COLOR = { war:'#ff2222', potential:'#f59e0b', stable:'#10b981' };
const IMPACT_COLOR = { direct:'#ff3333', indirect:'#f59e0b', tertiary:'#10b981' };
const SECTOR_ICON  = { tech:'💻', petroleum:'🛢️', agri:'🌾', defense:'⚔️', shipping:'🚢', finance:'💰', pharma:'💊', mining:'⛏️', auto:'🚗', telecom:'📡', energy:'⚡', insurance:'🛡️', tourism:'✈️', retail:'🛍️' };
const TYPE_ICON    = { strait:'🌊', canal:'⚓', sea_lane:'🚢', air_route:'✈️' };

export function ConflictPanel({ conflict: c, onClose }) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!c) return null;

  const color = S_COLOR[c.status] || '#888';
  const tabs = [
    { id:'overview',   label:'OVERVIEW' },
    { id:'routes',     label:`ROUTES (${c.chokepoints?.length||0})` },
    { id:'companies',  label:`MARKETS` },
    { id:'news',       label:`INTEL (${c.recentNews?.length||0})` },
  ];

  return (
    <div style={{
      width: 380, background:'var(--bg-deep)', borderLeft:'1px solid var(--border)',
      display:'flex', flexDirection:'column', overflow:'hidden', flexShrink:0,
      animation:'slideInRight 0.3s cubic-bezier(0.4,0,0.2,1)',
    }}>
      {/* Header */}
      <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border)', background:'var(--bg-panel)', flexShrink:0 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div style={{ flex:1, paddingRight:10 }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:9, color, letterSpacing:'0.15em', marginBottom:5 }}>
              IMPACT ANALYSIS · {c.region?.toUpperCase()}
            </div>
            <div style={{ fontWeight:700, fontSize:13, color:'var(--text-primary)', lineHeight:1.3, marginBottom:8 }}>
              {c.title}
            </div>
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <RiskGauge risk={c.risk} color={color} />
              <div>
                <StatusBadge status={c.status} />
                <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--text-dim)', marginTop:3 }}>
                  {c.country}
                </div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--text-dim)', marginTop:1 }}>
                  {c.newsCount} news sources
                </div>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'transparent', border:'1px solid var(--border)', color:'var(--text-secondary)', cursor:'pointer', width:24, height:24, borderRadius:2, fontFamily:'var(--font-mono)', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>✕</button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--border)', flexShrink:0, background:'var(--bg-panel)' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
            flex:1, padding:'8px 2px', background: activeTab===t.id ? 'var(--bg-deep)':'transparent',
            border:'none', borderBottom: activeTab===t.id ? `2px solid ${color}`:'2px solid transparent',
            color: activeTab===t.id ? color:'var(--text-dim)',
            fontFamily:'var(--font-display)', fontSize:8, letterSpacing:'0.1em', cursor:'pointer', transition:'all 0.15s',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Panel body */}
      <div style={{ flex:1, overflowY:'auto', padding:'12px' }}>
        {activeTab === 'overview' && <OverviewTab c={c} color={color} />}
        {activeTab === 'routes'   && <RoutesTab   c={c} />}
        {activeTab === 'companies'&& <CompaniesTab c={c} />}
        {activeTab === 'news'     && <NewsTab      c={c} />}
      </div>
    </div>
  );
}

// ─── OVERVIEW TAB ─────────────────────────────────────────────────────────────
function OverviewTab({ c, color }) {
  const impact = c.aiInsights?.companyImpact || {};
  const totalCompanies = (impact.direct?.length||0) + (impact.indirect?.length||0);

  return (
    <>
      <Section title="SITUATION">
        <p style={{ fontSize:12, color:'var(--text-secondary)', lineHeight:1.7 }}>{c.description}</p>
        {c.latestHeadline && (
          <a href={c.latestUrl} target="_blank" rel="noopener noreferrer" style={{ display:'block', marginTop:8, padding:'6px 8px', background:'rgba(255,255,255,0.03)', border:'1px solid var(--border)', borderLeft:'2px solid var(--red-core)', fontSize:11, color:'var(--text-primary)', textDecoration:'none', lineHeight:1.4 }}>
            📰 {c.latestHeadline}
          </a>
        )}
      </Section>

      <Section title="RISK FACTORS">
        <RiskBreakdown c={c} />
      </Section>

      {c.chokepoints?.length > 0 && (
        <Section title={`STRATEGIC ROUTES AT RISK (${c.chokepoints.length})`}>
          {c.chokepoints.map(cp => (
            <div key={cp.id} style={{ padding:'7px 9px', marginBottom:4, background:'rgba(255,51,51,0.05)', border:'1px solid rgba(255,51,51,0.2)', borderLeft:`3px solid ${cp.riskColor}`, borderRadius:2 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <span style={{ fontWeight:600, fontSize:12 }}>{cp.emoji} {cp.name}</span>
                <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color: cp.riskColor }}>{cp.throughput.split(' ')[0]}</span>
              </div>
              <div style={{ fontSize:10, color:'var(--text-dim)', marginTop:2 }}>{cp.throughput}</div>
            </div>
          ))}
        </Section>
      )}

      {c.aiInsights?.macroEconomicImpact && (
        <Section title="AI MACRO IMPACT ANALYSIS">
          <div style={{ padding:'8px', background:'rgba(34,187,255,0.05)', border:'1px solid rgba(34,187,255,0.15)', borderRadius:2 }}>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color:'#22bbff', lineHeight:1.5 }}>
              🤖 {c.aiInsights.macroEconomicImpact}
            </span>
          </div>
        </Section>
      )}

      {totalCompanies > 0 && (
        <Section title={`MARKET EXPOSURE — ${totalCompanies} COMPANIES`}>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:6 }}>
            {[
              { label:'DIRECT HIT',  count:impact.direct?.length||0,   color:'#ff3333', desc:'Primary exposure' },
              { label:'INDIRECT',    count:impact.indirect?.length||0,  color:'#f59e0b', desc:'Supply chain cascade' }
            ].map(tier => (
              <div key={tier.label} style={{ padding:'8px', background:`${tier.color}0d`, border:`1px solid ${tier.color}33`, borderRadius:2, textAlign:'center' }}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:18, fontWeight:900, color:tier.color }}>{tier.count}</div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:7, color:tier.color, letterSpacing:'0.1em', marginBottom:2 }}>{tier.label}</div>
                <div style={{ fontFamily:'var(--font-mono)', fontSize:8, color:'var(--text-dim)' }}>{tier.desc}</div>
              </div>
            ))}
          </div>
        </Section>
      )}
    </>
  );
}

// ─── ROUTES TAB ───────────────────────────────────────────────────────────────
function RoutesTab({ c }) {
  if (!c.chokepoints?.length) return <Empty msg="No strategic routes directly linked to this conflict zone." />;
  return (
    <>
      <div style={{ padding:'6px 8px', marginBottom:10, background:'rgba(255,51,51,0.06)', border:'1px solid rgba(255,51,51,0.2)', borderRadius:2 }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:8, color:'var(--text-dim)', letterSpacing:'0.12em' }}>
          {c.chokepoints.length} STRATEGIC ROUTE{c.chokepoints.length>1?'S':''} IDENTIFIED — SHOWN ON MAP
        </div>
      </div>
      {c.chokepoints.map(cp => (
        <div key={cp.id} style={{ marginBottom:12, background:'var(--bg-panel)', border:'1px solid var(--border)', borderLeft:`3px solid ${cp.riskColor}`, borderRadius:2, overflow:'hidden' }}>
          <div style={{ padding:'10px 12px', borderBottom:'1px solid var(--border)', background:'rgba(255,255,255,0.02)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
              <div style={{ fontFamily:'var(--font-display)', fontSize:10, fontWeight:700, color:'var(--text-primary)' }}>
                {cp.emoji} {TYPE_ICON[cp.type]} {cp.name}
              </div>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color:cp.riskColor, padding:'2px 6px', background:`${cp.riskColor}15`, border:`1px solid ${cp.riskColor}44`, borderRadius:2 }}>
                {cp.type.toUpperCase().replace('_',' ')}
              </span>
            </div>
            <p style={{ fontSize:11, color:'var(--text-secondary)', lineHeight:1.6, margin:0 }}>{cp.description}</p>
          </div>
        </div>
      ))}
    </>
  );
}

// ─── COMPANIES TAB ────────────────────────────────────────────────────────────
function CompaniesTab({ c }) {
  const impact = c.aiInsights?.companyImpact || {};
  const [openTier, setOpenTier] = useState('direct');

  const tiers = [
    { id:'direct',   label:'DIRECT HIT',  color:'#ff3333', companies: impact.direct||[],   desc:'Companies whose operations, inputs, or exports are immediately disrupted by this event.' },
    { id:'indirect', label:'INDIRECT',    color:'#f59e0b', companies: impact.indirect||[], desc:'Companies that depend on direct-hit companies or routes downstream.' }
  ];

  const total = (impact.direct?.length||0) + (impact.indirect?.length||0);

  if (total === 0) {
    return <Empty msg="AI is pending supply chain cascade generation or no data found." />;
  }

  return (
    <>
      <div style={{ marginBottom:10, padding:'10px 12px', background:'var(--bg-panel)', border:'1px solid var(--border)', borderRadius:2 }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:9, color:'var(--text-dim)', letterSpacing:'0.13em', marginBottom:6 }}>AI GENERATED CASCADE</div>
        <div style={{ display:'flex', alignItems:'center', gap:4 }}>
          {tiers.map((t, i) => (
            <React.Fragment key={t.id}>
              <div style={{ flex:1, textAlign:'center', padding:'6px 4px', background:`${t.color}12`, border:`1px solid ${t.color}44`, borderRadius:2 }}>
                <div style={{ fontFamily:'var(--font-display)', fontSize:16, fontWeight:900, color:t.color }}>{t.companies.length}</div>
                <div style={{ fontFamily:'var(--font-display)', fontSize:7, color:t.color, letterSpacing:'0.08em' }}>{t.label}</div>
              </div>
              {i < tiers.length-1 && (
                <div style={{ color:'var(--text-dim)', fontSize:14, fontWeight:700 }}>→</div>
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {tiers.map(tier => (
        <div key={tier.id} style={{ marginBottom:8 }}>
          <button
            onClick={() => setOpenTier(openTier === tier.id ? null : tier.id)}
            style={{ width:'100%', padding:'8px 12px', background: openTier===tier.id ? `${tier.color}12`:'var(--bg-panel)', border:`1px solid ${openTier===tier.id ? tier.color:'var(--border)'}`, borderRadius:2, display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', transition:'all 0.2s' }}
          >
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ width:10, height:10, borderRadius:'50%', background:tier.color, boxShadow:`0 0 6px ${tier.color}`, display:'inline-block' }}/>
              <span style={{ fontFamily:'var(--font-display)', fontSize:10, color:tier.color, letterSpacing:'0.1em' }}>{tier.label}</span>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color:'var(--text-secondary)' }}>{tier.companies.length} companies</span>
            </div>
            <span style={{ color:'var(--text-dim)', fontSize:12 }}>{openTier===tier.id ? '▲':'▼'}</span>
          </button>

          {openTier === tier.id && (
            <div style={{ border:`1px solid ${tier.color}33`, borderTop:'none', borderRadius:'0 0 2px 2px', overflow:'hidden', animation:'fadeIn 0.2s ease' }}>
              <div style={{ padding:'8px 10px', background:`${tier.color}06`, borderBottom:`1px solid ${tier.color}22` }}>
                <p style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--text-dim)', margin:0, lineHeight:1.5 }}>{tier.desc}</p>
              </div>
              {tier.companies.map(co => (
                <CompanyRow key={co.ticker} company={co} color={tier.color} />
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

function CompanyRow({ company: co, color }) {
  return (
    <div style={{ padding:'8px 10px', borderBottom:'1px solid rgba(255,255,255,0.04)', display:'flex', alignItems:'flex-start', gap:8, background:'rgba(255,255,255,0.01)' }}>
      <a
        href={`https://finance.yahoo.com/quote/${co.ticker}`}
        target="_blank" rel="noopener noreferrer"
        style={{ fontFamily:'var(--font-display)', fontSize:12, fontWeight:700, color, padding:'3px 6px', background:`${color}15`, border:`1px solid ${color}44`, borderRadius:2, textDecoration:'none', flexShrink:0, minWidth:52, textAlign:'center' }}
      >
        {co.ticker}
      </a>
      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontSize:11, fontWeight:600, color:'var(--text-primary)', marginBottom:2 }}>
          {co.name}
          {co.sector && (
            <span style={{ marginLeft:6, fontSize:9, fontFamily:'var(--font-mono)', color:'var(--text-dim)', padding:'1px 4px', background:'rgba(255,255,255,0.05)', borderRadius:2 }}>
              {SECTOR_ICON[co.sector]||'🔹'} {co.sector}
            </span>
          )}
        </div>
        <div style={{ fontSize:10, color:'var(--text-secondary)', lineHeight:1.5 }}>{co.description}</div>
      </div>
    </div>
  );
}

// ─── NEWS TAB ────────────────────────────────────────────────────────────────
function NewsTab({ c }) {
  if (!c.recentNews?.length) return <Empty msg="No recent news articles scraped for this conflict zone." />;
  return (
    <>
      <div style={{ padding:'5px 8px', marginBottom:8, background:'rgba(220,30,30,0.06)', border:'1px solid rgba(220,30,30,0.18)', borderRadius:2 }}>
        <span style={{ fontFamily:'var(--font-display)', fontSize:8, color:'var(--text-dim)', letterSpacing:'0.12em' }}>LIVE-SCRAPED ARTICLES</span>
      </div>
      {c.recentNews.map((n, i) => {
        const ago = n.publishedAt ? formatDistanceToNow(new Date(n.publishedAt), { addSuffix:true }) : '';
        return (
          <a key={i} href={n.url} target="_blank" rel="noopener noreferrer" style={{ display:'block', padding:'9px 10px', marginBottom:5, background:'var(--bg-panel)', border:'1px solid var(--border)', borderLeft:'2px solid var(--red-core)', borderRadius:2, textDecoration:'none' }}>
            <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:8, color:'var(--text-dim)', letterSpacing:'0.08em' }}>{n.source}</span>
              <span style={{ fontFamily:'var(--font-mono)', fontSize:8, color:'var(--text-dim)' }}>{ago}</span>
            </div>
            <div style={{ fontSize:12, fontWeight:600, color:'var(--text-primary)', lineHeight:1.4, marginBottom:4 }}>{n.title}</div>
            <div style={{ fontSize:10, color:'var(--text-secondary)' }}>{n.summary?.slice(0, 120)}…</div>
          </a>
        );
      })}
    </>
  );
}

// ─── SHARED COMPONENTS ────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ marginBottom:14 }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:8, color:'var(--text-dim)', letterSpacing:'0.15em', marginBottom:6, paddingBottom:5, borderBottom:'1px solid var(--border)', display:'flex', alignItems:'center', gap:6 }}>
        <span style={{ width:14, height:1, background:'var(--red-core)', display:'inline-block' }}/>
        {title}
      </div>
      {children}
    </div>
  );
}

function StatusBadge({ status }) {
  const c = { war:'#ff2222', potential:'#f59e0b', stable:'#10b981' }[status]||'#888';
  return (
    <span style={{ fontFamily:'var(--font-display)', fontSize:9, color:c, padding:'2px 7px', background:`${c}15`, border:`1px solid ${c}44`, borderRadius:2, letterSpacing:'0.08em' }}>
      {status?.toUpperCase()}
    </span>
  );
}

function RiskGauge({ risk, color }) {
  const r = 20; const circ = 2 * Math.PI * r;
  return (
    <div style={{ position:'relative', width:54, height:54, flexShrink:0, textAlign:'center' }}>
      <svg width="54" height="54" viewBox="0 0 54 54">
        <circle cx="27" cy="27" r={r} fill="none" stroke="var(--border)" strokeWidth="4"/>
        <circle cx="27" cy="27" r={r} fill="none" stroke={color} strokeWidth="4" strokeDasharray={`${(risk/100)*circ} ${circ}`} strokeLinecap="round" style={{ transformOrigin:'27px 27px', transform:'rotate(-90deg)' }}/>
        <text x="27" y="31" textAnchor="middle" style={{ fontFamily:'var(--font-display)', fontSize:13, fontWeight:900, fill:color }}>{risk}</text>
      </svg>
      <div style={{ fontFamily:'var(--font-mono)', fontSize:7, color:'var(--text-dim)', marginTop:-4 }}>RISK%</div>
    </div>
  );
}

function RiskBreakdown({ c }) {
  const factors = [
    { label:'Conflict Intensity',    val: c.status==='war' ? Math.min(95, 50+c.risk*0.4) : Math.min(70, c.risk*0.7) },
    { label:'Market Exposure',       val: Math.min(99, ((c.aiInsights?.companyImpact?.direct?.length||0)+(c.aiInsights?.companyImpact?.indirect?.length||0))*15) },
    { label:'Strategic Routes',      val: Math.min(99, (c.chokepoints?.length||0)*28) },
    { label:'News Intensity',        val: Math.min(99, (c.newsCount||0)*4) },
  ];
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
      {factors.map(f => (
        <div key={f.label}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'var(--text-secondary)' }}>{f.label}</span>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:9, color: f.val>70?'#ff2222':f.val>40?'#f59e0b':'#10b981' }}>{Math.round(f.val)}%</span>
          </div>
          <div style={{ height:3, background:'var(--bg-panel)', borderRadius:2, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${f.val}%`, background: f.val>70?'#ff2222':f.val>40?'#f59e0b':'#10b981', borderRadius:2, transition:'width 1s ease' }}/>
          </div>
        </div>
      ))}
    </div>
  );
}

function Empty({ msg }) {
  return (
    <div style={{ padding:24, textAlign:'center', color:'var(--text-dim)', fontFamily:'var(--font-mono)', fontSize:10, lineHeight:2 }}>
      <div style={{ fontSize:28, marginBottom:8 }}>📭</div>
      {msg}
    </div>
  );
}