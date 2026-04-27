import React from 'react';
import { formatDistanceToNow } from 'date-fns';

const S_COLOR = { war:'#ff2222', potential:'#f59e0b', stable:'#10b981' };
const S_BG    = { war:'rgba(220,30,30,0.1)', potential:'rgba(245,158,11,0.1)', stable:'rgba(16,185,129,0.1)' };
const S_LABEL = { war:'WAR', potential:'RISK', stable:'STABLE' };
const RISK_C  = { critical:'#ff2222', high:'#ff6644', medium:'#f59e0b', low:'#10b981' };
const IND_ICON = { tech:'💻',petroleum:'🛢️',agri:'🌾',defense:'⚔️',shipping:'🚢',finance:'💰',pharma:'💊',mining:'⛏️',auto:'🚗',telecom:'📡',energy:'⚡',textile:'🧵',chemicals:'🧪',construction:'🏗️',tourism:'✈️',retail:'🛍️',food_processing:'🏭',insurance:'🛡️',maritime:'⚓',rare_earth:'💠',all:'🌐' };
const WX_ICON  = { hurricane:'🌀',typhoon:'🌀',cyclone:'🌀',earthquake:'⚡',flood:'🌊',drought:'☀️',wildfire:'🔥',heatwave:'🌡️',tsunami:'🌊',extreme_event:'⚠️' };

export function Sidebar({ activePanel, setActivePanel, conflicts, news, weather, industries, selectedIndustry, setSelectedIndustry, filterStatus, setFilterStatus, selectedConflict, setSelectedConflict, loading }) {
  const tabs = [
    { id:'conflicts', label:'⚠ ZONES', count: conflicts.length },
    { id:'news',      label:'📡 INTEL', count: news.length },
    { id:'weather',   label:'🌩 WEATHER', count: weather.length },
  ];

  return (
    <div style={{ width:340, background:'var(--bg-deep)', borderRight:'1px solid var(--border)', display:'flex', flexDirection:'column', overflow:'hidden', flexShrink:0 }}>

      {/* Tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActivePanel(t.id)} style={{
            flex:1, padding:'10px 4px', background: activePanel===t.id ? 'var(--bg-panel)':'transparent',
            border:'none', borderBottom: activePanel===t.id ? '2px solid var(--red-core)':'2px solid transparent',
            color: activePanel===t.id ? 'var(--red-bright)':'var(--text-dim)',
            fontFamily:'var(--font-display)', fontSize:9, letterSpacing:'0.12em', cursor:'pointer', transition:'all 0.2s',
            display:'flex', flexDirection:'column', alignItems:'center', gap:2,
          }}>
            <span>{t.label}</span>
            <span style={{ fontFamily:'var(--font-mono)', fontSize:11, color: activePanel===t.id ? 'var(--red-bright)':'var(--text-dim)' }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* Industry grid filter */}
      <div style={{ padding:'8px 10px', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
        <div style={{ fontFamily:'var(--font-display)', fontSize:8, color:'var(--text-dim)', letterSpacing:'0.15em', marginBottom:5 }}>SECTOR FILTER</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:2, maxHeight:80, overflowY:'auto' }}>
          {(industries||[]).map(ind => (
            <button key={ind.id} title={ind.label} onClick={() => setSelectedIndustry(ind.id)} style={{
              padding:'3px 2px', background: selectedIndustry===ind.id ? 'var(--red-dim)':'var(--bg-panel)',
              border:`1px solid ${selectedIndustry===ind.id ? 'var(--red-core)':'var(--border)'}`,
              color: selectedIndustry===ind.id ? 'var(--red-bright)':'var(--text-dim)',
              fontSize:13, cursor:'pointer', borderRadius:2, transition:'all 0.15s',
              display:'flex', flexDirection:'column', alignItems:'center', gap:1,
            }}>
              {IND_ICON[ind.id]||'🔹'}
              <span style={{ fontFamily:'var(--font-mono)', fontSize:6, letterSpacing:'0.04em' }}>
                {ind.id==='all'?'ALL':ind.id.slice(0,4).toUpperCase()}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Panel content */}
      {activePanel === 'conflicts' && (
        <>
          <div style={{ padding:'6px 10px', borderBottom:'1px solid var(--border)', display:'flex', gap:3, flexShrink:0 }}>
            {['all','war','potential','stable'].map(st => (
              <button key={st} onClick={() => setFilterStatus(st)} style={{
                flex:1, padding:'4px 0', background: filterStatus===st ? (S_BG[st]||'var(--bg-panel)'):'transparent',
                border:`1px solid ${filterStatus===st ? (S_COLOR[st]||'var(--border-bright)'):'var(--border)'}`,
                color: filterStatus===st ? (S_COLOR[st]||'var(--text-primary)'):'var(--text-dim)',
                fontFamily:'var(--font-display)', fontSize:8, letterSpacing:'0.07em', cursor:'pointer', borderRadius:2, transition:'all 0.15s',
              }}>
                {st==='all'?'ALL':S_LABEL[st]}
              </button>
            ))}
          </div>
          <div style={{ flex:1, overflowY:'auto', padding:'6px' }}>
            {loading ? <Skeleton/> : conflicts.length===0
              ? <Empty msg="NO CONFLICTS DETECTED — SCRAPING…"/>
              : conflicts.map(c => (
                <ConflictCard key={c.id} conflict={c} selected={selectedConflict?.id===c.id} onClick={() => setSelectedConflict(c)} />
              ))
            }
          </div>
        </>
      )}

      {activePanel === 'news' && (
        <div style={{ flex:1, overflowY:'auto', padding:'6px' }}>
          {loading ? <Skeleton/> : news.length===0
            ? <Empty msg="FETCHING INTEL FEEDS…"/>
            : news.map(n => <NewsCard key={n.id||n.url} item={n} />)
          }
        </div>
      )}

      {activePanel === 'weather' && (
        <div style={{ flex:1, overflowY:'auto', padding:'6px' }}>
          {weather.length===0
            ? <Empty msg="NO EXTREME WEATHER EVENTS DETECTED"/>
            : weather.map((w,i) => <WeatherCard key={i} item={w} />)
          }
          <div style={{ padding:'8px', marginBottom:4, background:'rgba(34,187,255,0.05)', border:'1px solid rgba(34,187,255,0.15)', borderRadius:2 }}>
            <div style={{ fontFamily:'var(--font-display)', fontSize:8, color:'#22bbff', letterSpacing:'0.12em', marginBottom:4 }}>SUPPLY CHAIN RISK — WEATHER</div>
            <div style={{ fontFamily:'var(--font-mono)', fontSize:9, color:'#8899aa', lineHeight:1.6 }}>
              Extreme weather events are cross-referenced against global supply chains. Droughts affect grain/fertilizer. Typhoons disrupt semiconductor fabs. Hurricanes impact Gulf of Mexico oil infrastructure.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ConflictCard({ conflict:c, selected, onClick }) {
  return (
    <div onClick={onClick} style={{
      padding:'9px 11px', marginBottom:3,
      background: selected ? 'var(--bg-card-hover)':'var(--bg-panel)',
      border:`1px solid ${selected ? S_COLOR[c.status]:'var(--border)'}`,
      borderLeft:`3px solid ${S_COLOR[c.status]||'#888'}`,
      cursor:'pointer', borderRadius:2, transition:'all 0.15s', animation:'fadeIn 0.3s ease',
    }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
        <span style={{ fontFamily:'var(--font-display)', fontSize:8, color:S_COLOR[c.status], padding:'1px 6px', background:S_BG[c.status], border:`1px solid ${S_COLOR[c.status]}44`, borderRadius:2 }}>
          {S_LABEL[c.status]||'UNKNOWN'}
        </span>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:10, color: c.risk>80?'var(--red-bright)':c.risk>50?'var(--yellow-war)':'var(--text-dim)' }}>
          {c.risk}%
        </span>
      </div>
      <div style={{ fontWeight:600, fontSize:11, color:'var(--text-primary)', marginBottom:3, lineHeight:1.3 }}>{c.title}</div>
      <div style={{ fontSize:10, color:'var(--text-secondary)', marginBottom:5, lineHeight:1.4 }}>
        {(c.description||'').slice(0,85)}…
      </div>
      {/* Chokepoints */}
      {c.chokepoints?.length > 0 && (
        <div style={{ fontSize:9, color:'#f59e0b', marginBottom:4, fontFamily:'var(--font-mono)' }}>
          ⚓ {c.chokepoints.map(cp=>cp.name).join(' · ')}
        </div>
      )}
      {/* Company impact summary */}
      {c.companyImpact && (
        <div style={{ fontSize:9, color:'var(--text-dim)', fontFamily:'var(--font-mono)' }}>
          📈 {c.companyImpact.direct?.length||0} direct · {c.companyImpact.indirect?.length||0} indirect · {c.companyImpact.tertiary?.length||0} tertiary
        </div>
      )}
      {/* Industry tags */}
      <div style={{ display:'flex', gap:2, flexWrap:'wrap', marginTop:4 }}>
        {(c.affectedIndustries||[]).slice(0,5).map(ind => (
          <span key={ind} style={{ fontFamily:'var(--font-mono)', fontSize:7, padding:'1px 4px', background:'rgba(220,30,30,0.08)', border:'1px solid rgba(220,30,30,0.18)', color:'var(--text-secondary)', borderRadius:2 }}>
            {IND_ICON[ind]} {ind}
          </span>
        ))}
      </div>
    </div>
  );
}

function NewsCard({ item:n }) {
  const ago = n.publishedAt ? formatDistanceToNow(new Date(n.publishedAt), { addSuffix:true }) : '';
  return (
    <div style={{ padding:'7px 9px', marginBottom:3, background:'var(--bg-panel)', border:'1px solid var(--border)', borderLeft:`2px solid ${RISK_C[n.risk]||'var(--border)'}`, borderRadius:2, animation:'fadeIn 0.3s ease' }}>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:2 }}>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:8, color:'var(--text-dim)', letterSpacing:'0.08em' }}>{n.source}</span>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:7, color:'var(--text-dim)' }}>{ago}</span>
      </div>
      <a href={n.url} target="_blank" rel="noopener noreferrer" style={{ display:'block', fontSize:11, fontWeight:600, color:'var(--text-primary)', textDecoration:'none', lineHeight:1.4, marginBottom:4 }}>
        {n.title}
      </a>
      <div style={{ display:'flex', gap:2, flexWrap:'wrap' }}>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:7, padding:'1px 4px', background:`${RISK_C[n.risk]||'#fff'}15`, border:`1px solid ${RISK_C[n.risk]||'#fff'}33`, color:RISK_C[n.risk]||'var(--text-dim)', borderRadius:2 }}>
          {n.risk?.toUpperCase()}
        </span>
        {(n.industries||[]).slice(0,3).map(ind => (
          <span key={ind} style={{ fontFamily:'var(--font-mono)', fontSize:7, padding:'1px 4px', background:'rgba(255,255,255,0.04)', border:'1px solid var(--border)', color:'var(--text-dim)', borderRadius:2 }}>
            {IND_ICON[ind]} {ind}
          </span>
        ))}
      </div>
    </div>
  );
}

function WeatherCard({ item:w }) {
  const impact = w.supplyImpact;
  const ago = w.publishedAt ? formatDistanceToNow(new Date(w.publishedAt), { addSuffix:true }) : '';
  return (
    <div style={{ padding:'8px 10px', marginBottom:4, background:'rgba(34,187,255,0.05)', border:'1px solid rgba(34,187,255,0.2)', borderLeft:'3px solid #22bbff', borderRadius:2, animation:'fadeIn 0.3s ease' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:3 }}>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:8, color:'#22bbff', letterSpacing:'0.08em' }}>{w.source}</span>
        <span style={{ fontFamily:'var(--font-mono)', fontSize:7, color:'var(--text-dim)' }}>{ago}</span>
      </div>
      <div style={{ display:'flex', alignItems:'flex-start', gap:6, marginBottom:4 }}>
        <span style={{ fontSize:18 }}>{WX_ICON[impact?.eventType]||'⚠️'}</span>
        <a href={w.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, fontWeight:600, color:'#e8eaf0', textDecoration:'none', lineHeight:1.4 }}>
          {w.title}
        </a>
      </div>
      {impact && (
        <div style={{ background:'rgba(34,187,255,0.07)', border:'1px solid rgba(34,187,255,0.15)', borderRadius:2, padding:'5px 7px' }}>
          <div style={{ fontFamily:'var(--font-display)', fontSize:7, color:'#22bbff', letterSpacing:'0.12em', marginBottom:3 }}>SUPPLY CHAIN IMPACT</div>
          <div style={{ fontSize:9, color:'#8899aa', marginBottom:3 }}>
            Sectors: {impact.industries?.join(', ')}
          </div>
          <div style={{ display:'flex', gap:2, flexWrap:'wrap' }}>
            {(impact.tickers||[]).map(t => (
              <a key={t} href={`https://finance.yahoo.com/quote/${t}`} target="_blank" rel="noopener noreferrer"
                style={{ fontFamily:'var(--font-display)', fontSize:9, fontWeight:700, color:'#f59e0b', padding:'1px 5px', background:'rgba(245,158,11,0.1)', border:'1px solid rgba(245,158,11,0.3)', borderRadius:2, textDecoration:'none' }}>
                {t}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Empty({ msg }) {
  return (
    <div style={{ padding:20, textAlign:'center', color:'var(--text-dim)', fontFamily:'var(--font-mono)', fontSize:10, lineHeight:2 }}>
      <div style={{ fontSize:24, marginBottom:8, animation:'pulse-red 2s ease-in-out infinite' }}>📡</div>
      {msg}
    </div>
  );
}

function Skeleton() {
  return Array.from({length:5}).map((_,i) => (
    <div key={i} style={{ padding:12, marginBottom:3, background:'var(--bg-panel)', border:'1px solid var(--border)', borderRadius:2, opacity: 1-i*0.12 }}>
      <div style={{ height:8, background:'var(--bg-card)', borderRadius:2, marginBottom:5, width:'55%' }}/>
      <div style={{ height:11, background:'var(--bg-card)', borderRadius:2, marginBottom:4, width:'90%' }}/>
      <div style={{ height:8, background:'var(--bg-card)', borderRadius:2, width:'70%' }}/>
    </div>
  ));
}
