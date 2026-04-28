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
    { id:'news',      label:'📡 INTEL', count: news.length }
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
      
      {/* Chokepoints */}
      {c.chokepoints?.length > 0 && (
        <div style={{ fontSize:9, color:'#f59e0b', marginBottom:4, fontFamily:'var(--font-mono)' }}>
          ⚓ {c.chokepoints.map(cp=>cp.name).join(' · ')}
        </div>
      )}
      {/* AI Company impact summary */}
      {c.aiInsights?.companyImpact && (
        <div style={{ fontSize:9, color:'var(--text-dim)', fontFamily:'var(--font-mono)' }}>
          🤖 {c.aiInsights.companyImpact.direct?.length||0} direct · {c.aiInsights.companyImpact.indirect?.length||0} indirect downstream
        </div>
      )}
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
    </div>
  );
}

function Empty({ msg }) {
  return (
    <div style={{ padding:20, textAlign:'center', color:'var(--text-dim)', fontFamily:'var(--font-mono)', fontSize:10, lineHeight:2 }}>
      <div style={{ fontSize:24, marginBottom:8 }}>📡</div>
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