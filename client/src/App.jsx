import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MapView }       from './components/MapView';
import { Sidebar }       from './components/Sidebar';
import { Header }        from './components/Header';
import { ConflictPanel } from './components/ConflictPanel';

const API = '';

function useApi(url) {
  const [data, setData]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [rev, setRev]       = useState(0);

  useEffect(() => {
    if (!url) return;
    let alive = true;
    setLoading(true);
    window.fetch(url)
      .then(r => r.json())
      .then(json => { if (alive) setData(json); })
      .catch(e => console.warn('fetch error', url, e.message))
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [url, rev]);

  const refetch = useCallback(() => setRev(r => r + 1), []);
  return { data, loading, refetch };
}

export default function App() {
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [selectedIndustry, setSelectedIndustry] = useState('all');
  const [activePanel,      setActivePanel]      = useState('conflicts');
  const [showMilitary,     setShowMilitary]     = useState(true);
  const [showChokepoints,  setShowChokepoints]  = useState(true);
  const [filterStatus,     setFilterStatus]     = useState('all');
  const [newsUrl, setNewsUrl] = useState(`${API}/api/news?industry=all&limit=80`);

  const { data: conflictsData, loading: conflictsLoading, refetch: refetchConflicts } = useApi(`${API}/api/conflicts`);
  const { data: newsData,      loading: newsLoading,      refetch: refetchNews }      = useApi(newsUrl);
  const { data: weatherData }    = useApi(`${API}/api/weather`);
  const { data: militaryData }   = useApi(`${API}/api/military-activity`);
  const { data: chokepointsData }= useApi(`${API}/api/chokepoints`);
  const { data: industriesData } = useApi(`${API}/api/industries`);

  useEffect(() => {
    setNewsUrl(`${API}/api/news?industry=${selectedIndustry}&limit=80`);
  }, [selectedIndustry]);

  useEffect(() => {
    const t = setInterval(() => { refetchConflicts(); refetchNews(); }, 20 * 60 * 1000);
    return () => clearInterval(t);
  }, [refetchConflicts, refetchNews]);

  const handleRefresh = useCallback(async () => {
    try { await window.fetch(`${API}/api/refresh`, { method: 'POST' }); } catch {}
    setTimeout(() => { refetchConflicts(); refetchNews(); }, 3500);
  }, [refetchConflicts, refetchNews]);

  const allConflicts       = conflictsData?.conflicts || [];
  const filteredConflicts  = filterStatus === 'all' ? allConflicts : allConflicts.filter(c => c.status === filterStatus);
  const allNews            = newsData?.news || [];
  const allWeather         = weatherData?.weather || [];
  const allMilitary        = militaryData?.activities || [];
  const allChokepoints     = chokepointsData?.chokepoints || [];
  const lastUpdated        = conflictsData?.lastUpdated;

  const stats = {
    war:       allConflicts.filter(c => c.status === 'war').length,
    potential: allConflicts.filter(c => c.status === 'potential').length,
    stable:    allConflicts.filter(c => c.status === 'stable').length,
    total:     allConflicts.length,
  };

  const mapChokepoints = React.useMemo(() => {
    const active = new Set(allConflicts.flatMap(c => (c.chokepoints || []).map(cp => cp.id)));
    return allChokepoints.map(cp => ({ ...cp, isActive: active.has(cp.id) }));
  }, [allChokepoints, allConflicts]);

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100vh', background:'var(--bg-void)', overflow:'hidden' }}>
      <div className="scanlines" />

      <Header
        stats={stats}
        lastUpdated={lastUpdated}
        onRefresh={handleRefresh}
        showMilitary={showMilitary}
        onToggleMilitary={() => setShowMilitary(v => !v)}
        showChokepoints={showChokepoints}
        onToggleChokepoints={() => setShowChokepoints(v => !v)}
        weatherCount={allWeather.length}
      />

      <div style={{ display:'flex', flex:1, overflow:'hidden' }}>
        <Sidebar
          activePanel={activePanel}
          setActivePanel={setActivePanel}
          conflicts={filteredConflicts}
          news={allNews}
          weather={allWeather}
          industries={industriesData || []}
          selectedIndustry={selectedIndustry}
          setSelectedIndustry={setSelectedIndustry}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          selectedConflict={selectedConflict}
          setSelectedConflict={(c) => { setSelectedConflict(c); setActivePanel('conflicts'); }}
          loading={conflictsLoading || newsLoading}
        />

        <div style={{ flex:1, position:'relative' }}>
          <MapView
            conflicts={filteredConflicts}
            military={allMilitary}
            chokepoints={mapChokepoints}
            showMilitary={showMilitary}
            showChokepoints={showChokepoints}
            weatherEvents={allWeather}
            selectedConflict={selectedConflict}
            onConflictSelect={(c) => { setSelectedConflict(c); setActivePanel('conflicts'); }}
          />
          <LiveBadge count={allConflicts.length} lastUpdated={lastUpdated} />
        </div>

        {selectedConflict && (
          <ConflictPanel
            conflict={selectedConflict}
            onClose={() => setSelectedConflict(null)}
          />
        )}
      </div>
    </div>
  );
}

function LiveBadge({ count, lastUpdated }) {
  if (!count) return null;
  const ago = lastUpdated ? new Date(lastUpdated).toUTCString().slice(17,22) + ' UTC' : '';
  return (
    <div style={{
      position:'absolute', bottom:20, left:'50%', transform:'translateX(-50%)',
      background:'rgba(6,13,20,0.92)', border:'1px solid rgba(220,30,30,0.35)',
      padding:'5px 16px', borderRadius:2, display:'flex', alignItems:'center', gap:10,
      fontFamily:'var(--font-mono)', fontSize:10, color:'var(--text-secondary)',
      backdropFilter:'blur(6px)', zIndex:500, pointerEvents:'none', whiteSpace:'nowrap',
    }}>
      <span style={{ width:6, height:6, borderRadius:'50%', background:'#ff2222', boxShadow:'0 0 6px #ff2222', animation:'pulse-red 1.5s ease-in-out infinite', flexShrink:0 }}/>
      <span style={{ color:'#ff4444', fontWeight:700 }}>{count} LIVE CONFLICTS</span>
      <span style={{ color:'#334455' }}>·</span>
      <span>AUTO-SCRAPE EVERY 20 MIN</span>
      {ago && <><span style={{ color:'#334455' }}>·</span><span style={{ color:'#445566' }}>{ago}</span></>}
    </div>
  );
}