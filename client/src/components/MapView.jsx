import React, { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, useMap, Marker, Popup, CircleMarker, Polyline, ZoomControl, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;

const STATUS = {
  war:      { fill:'#dc1e1e', glow:'#ff2222', border:'#ff4444' },
  potential:{ fill:'#d97706', glow:'#f59e0b', border:'#fbbf24' },
  stable:   { fill:'#059669', glow:'#10b981', border:'#34d399' },
};

const ROUTE_STYLE = {
  strait:   { weight:3.5, opacity:0.88 },
  canal:    { weight:4.5, opacity:0.92 },
  sea_lane: { weight:2.5, opacity:0.72, dashArray:'9,6' },
};

function conflictIcon(status, risk) {
  const sz = Math.max(18, Math.min(36, 13 + (risk || 40) / 8));
  const c  = STATUS[status] || STATUS.potential;
  const cx = (sz + 16) / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${sz+16}" height="${sz+16}" viewBox="0 0 ${sz+16} ${sz+16}">
    <defs><filter id="gf${sz}"><feGaussianBlur stdDeviation="2" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <circle cx="${cx}" cy="${cx}" r="${sz/2+5}" fill="${c.fill}1a" stroke="${c.glow}" stroke-width="0.8" filter="url(#gf${sz})"/>
    <circle cx="${cx}" cy="${cx}" r="${sz/2}" fill="${c.fill}" stroke="${c.border}" stroke-width="2" filter="url(#gf${sz})"/>
    <circle cx="${cx}" cy="${cx}" r="${sz/5}" fill="white" opacity="0.8"/>
  </svg>`;
  return L.divIcon({ html:svg, className:'', iconSize:[sz+16,sz+16], iconAnchor:[cx,cx], popupAnchor:[0,-(sz/2+10)] });
}

function militaryIcon(type, intensity) {
  const c   = { high:'#ff6644', medium:'#ffaa44', low:'#44aaff' }[intensity] || '#fff';
  const sym = { air:'✈', naval:'⚓', ground:'⊕' }[type] || '●';
  return L.divIcon({
    html:`<div style="background:${c}22;border:1px solid ${c};color:${c};font-size:11px;width:22px;height:22px;display:flex;align-items:center;justify-content:center;border-radius:2px;box-shadow:0 0 8px ${c}66">${sym}</div>`,
    className:'', iconSize:[22,22], iconAnchor:[11,11], popupAnchor:[0,-14],
  });
}

function weatherIcon(eventType) {
  const sym = { hurricane:'🌀',typhoon:'🌀',cyclone:'🌀',earthquake:'⚡',flood:'🌊',drought:'☀️',wildfire:'🔥',heatwave:'🌡️',tsunami:'🌊' }[eventType] || '⚠️';
  return L.divIcon({
    html:`<div style="font-size:20px;filter:drop-shadow(0 0 6px rgba(34,187,255,0.9));cursor:pointer;line-height:1">${sym}</div>`,
    className:'', iconSize:[26,26], iconAnchor:[13,13], popupAnchor:[0,-16],
  });
}

function MapFly({ target }) {
  const map = useMap();
  const prev = useRef(null);
  useEffect(() => {
    if (target && target.id !== prev.current) {
      prev.current = target.id;
      map.flyTo([target.lat, target.lng], 5, { duration:1.2, easeLinearity:0.3 });
    }
  }, [target, map]);
  return null;
}

const WEATHER_LOCATIONS = {
  hurricane:  [{ lat:25,  lng:-85  }, { lat:18,  lng:-70  }],
  typhoon:    [{ lat:20,  lng:130  }, { lat:15,  lng:120  }],
  cyclone:    [{ lat:-15, lng:80   }, { lat:-20, lng:150  }],
  earthquake: [{ lat:35,  lng:138  }, { lat:37,  lng:36   }],
  flood:      [{ lat:24,  lng:90   }, { lat:30,  lng:75   }],
  drought:    [{ lat:15,  lng:20   }, { lat:38,  lng:-100 }],
  wildfire:   [{ lat:37,  lng:-120 }, { lat:-33, lng:150  }],
  heatwave:   [{ lat:45,  lng:10   }, { lat:30,  lng:78   }],
  tsunami:    [{ lat:35,  lng:141  }, { lat:5,   lng:95   }],
};

function getWeatherCoords(item, index) {
  const type = item.supplyImpact?.eventType;
  if (!type) return null;
  const locs = WEATHER_LOCATIONS[type];
  if (!locs || locs.length === 0) return null;
  return locs[index % locs.length];
}

export function MapView({ conflicts, military, chokepoints, showMilitary, showChokepoints, weatherEvents, selectedConflict, onConflictSelect }) {

  const validConflicts  = (conflicts      || []).filter(c => c && typeof c.lat === 'number' && typeof c.lng === 'number' && !isNaN(c.lat) && !isNaN(c.lng));
  const validMilitary   = (military       || []).filter(m => m && typeof m.lat === 'number' && !isNaN(m.lat));
  const validChokepoints= (chokepoints    || []).filter(cp => cp && Array.isArray(cp.path) && cp.path.length >= 2);
  const validWeather    = (weatherEvents  || []).filter(w => w && w.supplyImpact);

  return (
    <MapContainer
      center={[20, 15]}
      zoom={2}
      minZoom={2}
      zoomControl={false}
      style={{ height:'100%', width:'100%', background:'#020508' }}
      maxBounds={[[-85,-200],[85,200]]}
      maxBoundsViscosity={1.0}
    >
      {/*
        Using MapTiler's tile server which uses India-correct borders
        (Kashmir and Arunachal Pradesh shown as part of India).
        Falling back to Stadia dark tiles which also use Indian government-
        approved boundary data for India.
        CartoDB dark_all uses OSM data which shows disputed borders incorrectly.
      */}
      <TileLayer
        url="https://tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
        attribution=""
        opacity={0}
      />
      <TileLayer
        url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
        attribution=""
        className="map-dark-tiles"
      />

      <ZoomControl position="bottomright" />
      <MapFly target={selectedConflict} />

      {showChokepoints && validChokepoints.map(cp => {
        const style = ROUTE_STYLE[cp.type] || ROUTE_STYLE.sea_lane;
        const midIdx = Math.floor(cp.path.length / 2);
        const midPoint = cp.path[midIdx];
        return (
          <React.Fragment key={cp.id}>
            <Polyline
              positions={cp.path}
              pathOptions={{ color: cp.riskColor || '#ff3333', ...style }}
            >
              <Tooltip sticky permanent={false}>
                <div style={{ background:'#0d1b28', border:`1px solid ${cp.riskColor}`, color:'#e8eaf0', padding:'6px 10px', minWidth:180, fontFamily:'sans-serif' }}>
                  <div style={{ fontSize:10, color:cp.riskColor, letterSpacing:'0.1em', marginBottom:2 }}>{cp.emoji} {(cp.type||'').toUpperCase().replace('_',' ')}</div>
                  <div style={{ fontSize:13, fontWeight:700, marginBottom:2 }}>{cp.name}</div>
                  <div style={{ fontSize:10, color:'#8899aa' }}>{cp.throughput}</div>
                </div>
              </Tooltip>
            </Polyline>
            <CircleMarker
              center={midPoint}
              radius={6}
              pathOptions={{ color: cp.riskColor || '#ff3333', fillColor: cp.riskColor || '#ff3333', fillOpacity:1, weight:1.5 }}
            >
              <Popup maxWidth={320}>
                <ChokepointPopup cp={cp} />
              </Popup>
            </CircleMarker>
          </React.Fragment>
        );
      })}

      {validConflicts.map(c => (
        <CircleMarker
          key={`ring-${c.id}`}
          center={[c.lat, c.lng]}
          radius={c.status === 'war' ? 36 : 22}
          pathOptions={{
            color: STATUS[c.status]?.fill || '#888',
            fillColor: STATUS[c.status]?.fill || '#888',
            fillOpacity: 0.05,
            weight: 1,
            dashArray: c.status === 'potential' ? '5,7' : undefined,
            opacity: 0.3,
          }}
        />
      ))}

      {validConflicts.map(c => (
        <Marker
          key={c.id}
          position={[c.lat, c.lng]}
          icon={conflictIcon(c.status, c.risk)}
          eventHandlers={{ click: () => onConflictSelect(c) }}
        >
          <Popup maxWidth={280}>
            <div style={{ fontFamily:'sans-serif', padding:'10px', background:'#0d1b28', color:'#e8eaf0', minWidth:240 }}>
              <div style={{ fontSize:9, color: STATUS[c.status]?.border || '#aaa', letterSpacing:'0.12em', marginBottom:4, fontWeight:700 }}>
                {{ war:'🔴 ACTIVE WAR', potential:'🟡 RISK ZONE', stable:'🟢 MONITORING' }[c.status] || c.status?.toUpperCase()}
              </div>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:5, lineHeight:1.3 }}>{c.title}</div>
              <div style={{ fontSize:10, color:'#8899aa', marginBottom:6, lineHeight:1.5 }}>{(c.description || '').slice(0,120)}{c.description?.length > 120 ? '…' : ''}</div>
              <div style={{ fontSize:10, color:'#ff4444', marginBottom:8, fontFamily:'monospace' }}>
                RISK: {c.risk}% · {c.region} · {c.newsCount || 0} sources
              </div>
              {c.chokepoints?.length > 0 && (
                <div style={{ fontSize:10, color:'#f59e0b', marginBottom:6 }}>
                  ⚓ {c.chokepoints.map(cp => cp.name).join(', ')}
                </div>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onConflictSelect(c); }}
                style={{ width:'100%', padding:'6px', background:'rgba(220,30,30,0.15)', border:'1px solid #dc1e1e', color:'#ff2222', fontSize:9, cursor:'pointer', letterSpacing:'0.1em', borderRadius:2, fontFamily:'monospace' }}
              >
                VIEW FULL IMPACT ANALYSIS →
              </button>
            </div>
          </Popup>
        </Marker>
      ))}

      {showMilitary && validMilitary.map(m => (
        <Marker key={m.id} position={[m.lat, m.lng]} icon={militaryIcon(m.type, m.intensity)}>
          <Popup>
            <div style={{ fontFamily:'sans-serif', padding:'8px', background:'#0d1b28', color:'#e8eaf0', minWidth:190 }}>
              <div style={{ fontSize:9, color:'#64b4ff', letterSpacing:'0.12em', marginBottom:3, fontWeight:700 }}>MILITARY ACTIVITY</div>
              <div style={{ fontSize:12, fontWeight:600, marginBottom:2 }}>{m.country}</div>
              <div style={{ fontSize:10, color:'#8899aa' }}>{m.description}</div>
              <div style={{ fontSize:9, color:'#64b4ff', marginTop:4, fontFamily:'monospace' }}>{(m.type||'').toUpperCase()} · {(m.intensity||'').toUpperCase()} INTENSITY</div>
            </div>
          </Popup>
        </Marker>
      ))}

      {validWeather.map((w, i) => {
        const coords = getWeatherCoords(w, i);
        if (!coords) return null;
        return (
          <Marker key={`wx-${i}`} position={[coords.lat, coords.lng]} icon={weatherIcon(w.supplyImpact.eventType)}>
            <Popup>
              <div style={{ fontFamily:'sans-serif', padding:'8px', background:'#0a1520', color:'#e8eaf0', minWidth:210 }}>
                <div style={{ fontSize:9, color:'#22bbff', letterSpacing:'0.1em', marginBottom:3, fontWeight:700 }}>⚠ EXTREME WEATHER</div>
                <div style={{ fontSize:11, fontWeight:600, marginBottom:4, lineHeight:1.4 }}>{w.title}</div>
                <div style={{ fontSize:9, color:'#8899aa', marginBottom:4 }}>Type: {w.supplyImpact.eventType}</div>
                <div style={{ fontSize:9, color:'#8899aa' }}>Sectors: {w.supplyImpact.industries?.join(', ')}</div>
                <div style={{ display:'flex', gap:3, flexWrap:'wrap', marginTop:5 }}>
                  {(w.supplyImpact.tickers || []).map(t => (
                    <a key={t} href={`https://finance.yahoo.com/quote/${t}`} target="_blank" rel="noopener noreferrer"
                      style={{ fontSize:9, fontWeight:700, color:'#f59e0b', padding:'1px 5px', background:'rgba(245,158,11,0.12)', border:'1px solid rgba(245,158,11,0.35)', borderRadius:2, textDecoration:'none' }}>
                      {t}
                    </a>
                  ))}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

function ChokepointPopup({ cp }) {
  return (
    <div style={{ fontFamily:'sans-serif', padding:'12px', background:'#0d1b28', color:'#e8eaf0', minWidth:260, maxWidth:320 }}>
      <div style={{ fontSize:9, color:cp.riskColor, letterSpacing:'0.14em', marginBottom:4, fontWeight:700 }}>
        {cp.emoji} STRATEGIC {(cp.type||'').toUpperCase().replace('_',' ')}
      </div>
      <div style={{ fontSize:14, fontWeight:700, marginBottom:5 }}>{cp.name}</div>
      <div style={{ fontSize:10, color:'#8899aa', marginBottom:8, lineHeight:1.6 }}>{(cp.description||'').slice(0,150)}…</div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:4, marginBottom:8 }}>
        {[['THROUGHPUT', cp.throughput], ['VOLUME', cp.dailyVolume]].map(([l,v]) => (
          <div key={l} style={{ background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)', padding:'5px 7px', borderRadius:2 }}>
            <div style={{ fontSize:7, color:'#445566', letterSpacing:'0.1em', marginBottom:2 }}>{l}</div>
            <div style={{ fontSize:9, color:cp.riskColor, fontFamily:'monospace', fontWeight:700 }}>{v}</div>
          </div>
        ))}
      </div>
      <div style={{ fontSize:10, color:'#ff6644', background:'rgba(255,100,68,0.09)', padding:'5px 7px', borderRadius:2, border:'1px solid rgba(255,100,68,0.22)', fontFamily:'monospace' }}>
        💸 {cp.closureCost}
      </div>
      {cp.alternativeRoute && (
        <div style={{ marginTop:6, fontSize:10, color:'#10b981', background:'rgba(16,185,129,0.08)', padding:'5px 7px', borderRadius:2, border:'1px solid rgba(16,185,129,0.2)' }}>
          🔄 {cp.alternativeRoute}
        </div>
      )}
    </div>
  );
}