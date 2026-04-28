const express = require('express');
const cors = require('cors');
const axios = require('axios');
const Parser = require('rss-parser');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const rssParser = new Parser({ timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GeopoliticalRadar/3.0)' } });
app.use(cors());
app.use(express.json());

// ─── GEMINI AI SETUP ──────────────────────────────────────────────────────────
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key_for_build');
const aiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

// ─── IN-MEMORY CACHE (Serverless instance) ────────────────────────────────────
let cache = { conflicts: [], news: [], weather: [], military: [], lastUpdated: null, errors: [] };

// ─── GEOGRAPHIC & STRUCTURAL CONSTANTS (Required for Map Rendering) ───────────
const INDUSTRIES = [
  { id:'all', label:'All Industries' }, { id:'tech', label:'Technology & Semiconductors' },
  { id:'petroleum', label:'Petroleum & Natural Gas' }, { id:'defense', label:'Defense & Aerospace' },
  { id:'shipping', label:'Shipping & Logistics' }, { id:'finance', label:'Banking & Finance' },
  { id:'agri', label:'Agriculture & Food' }
];

const CHOKEPOINTS = [
  { id:'strait_hormuz', name:'Strait of Hormuz', type:'strait', lat:26.6, lng:56.2, riskColor:'#ff2222', keywords:['iran','hormuz','persian gulf'] },
  { id:'strait_malacca', name:'Strait of Malacca', type:'strait', lat:2.5, lng:101.5, riskColor:'#ff2222', keywords:['south china sea','taiwan'] },
  { id:'suez_canal', name:'Suez Canal', type:'canal', lat:30.5, lng:32.3, riskColor:'#ff2222', keywords:['gaza','israel','houthi','red sea','suez'] },
  { id:'taiwan_strait_lane', name:'Taiwan Strait', type:'sea_lane', lat:24.5, lng:119.8, riskColor:'#f59e0b', keywords:['taiwan','pla','china military'] }
];

const LOCATIONS = [
  { re:/ukraine|kyiv|kharkiv/i, country:'Ukraine', region:'Eastern Europe', lat:49.0, lng:31.0 },
  { re:/russia|kremlin|moscow/i, country:'Russia', region:'Eastern Europe', lat:55.7, lng:37.6 },
  { re:/israel|gaza|hamas/i, country:'Israel/Palestine', region:'Middle East', lat:31.5, lng:34.5 },
  { re:/taiwan|taipei|tsmc/i, country:'Taiwan', region:'East Asia', lat:23.7, lng:120.9 },
  { re:/iran|tehran|hormuz/i, country:'Iran', region:'Middle East', lat:32.4, lng:53.7 },
  { re:/houthi|yemen|red sea/i, country:'Yemen/Red Sea', region:'Middle East', lat:14.0, lng:43.0 },
  { re:/sudan|khartoum/i, country:'Sudan', region:'Africa', lat:15.5, lng:32.5 }
];

const CONFLICT_KW = ['war','attack','invasion','conflict','missile strike','airstrike','bombing','escalation','drone strike'];

function extractLocation(text) {
  for (const loc of LOCATIONS) {
    if (loc.re.test(text)) return loc;
  }
  return null;
}

function isConflict(title, summary) {
  const text = (title + ' ' + (summary || '')).toLowerCase();
  return CONFLICT_KW.filter(kw => text.includes(kw)).length >= 1;
}

// ─── DYNAMIC AI SUPPLY CHAIN GENERATION ───────────────────────────────────────
async function analyzeImpactWithGemini(conflictTitle, conflictSummary) {
  if (!process.env.GEMINI_API_KEY) return { companyImpact: { direct: [], indirect: [] }, macroEconomicImpact: "API Key missing." };
  
  const prompt = `
    You are a geopolitical financial analyst. Read the following live news summary:
    Title: ${conflictTitle}
    Summary: ${conflictSummary}

    Analyze the real-world supply chain and economic impact. Identify real, publicly traded global companies that are directly impacted (e.g., operations in the zone) and indirectly impacted (downstream supply chain reliance).
    
    Return a strictly formatted JSON object matching this exact schema:
    {
      "companyImpact": {
        "direct": [
          { "ticker": "XOM", "name": "ExxonMobil", "impact": "direct", "description": "Reason for direct impact." }
        ],
        "indirect": [
          { "ticker": "AAPL", "name": "Apple", "impact": "indirect", "description": "Reason for downstream/indirect impact." }
        ]
      },
      "macroEconomicImpact": "One sentence summary of global trade impact."
    }
    Ensure the response is raw JSON only, with no markdown formatting.
  `;

  try {
    const result = await aiModel.generateContent(prompt);
    const responseText = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(responseText);
  } catch (error) {
    console.error('[Gemini API Error]', error.message);
    return { companyImpact: { direct: [], indirect: [] }, macroEconomicImpact: "Analysis unavailable due to timeout or error." };
  }
}

// ─── LIVE DATA SCRAPING (ACLED & NEWS) ────────────────────────────────────────
async function fetchACLED() {
  try {
    // Fetch real conflict data from the last 14 days
    const from = new Date(Date.now() - 14*24*60*60*1000).toISOString().slice(0,10);
    const to   = new Date().toISOString().slice(0,10);
    const url  = `https://api.acleddata.com/acled/read?limit=50&fields=event_date,country,event_type,actor1,fatalities,latitude,longitude&event_date_where=BETWEEN&event_date_from=${from}&event_date_to=${to}`;
    const res  = await axios.get(url, { timeout: 8000 });
    return res.data?.data || [];
  } catch (error) {
    console.error('[ACLED Error]', error.message);
    return [];
  }
}

async function scrapePremiumNewsLocally() {
  const targetSources = ['Bloomberg', 'NYTimes', 'Wall Street Journal', 'Reuters'];
  let scrapedNews = [];

  for (const source of targetSources) {
    try {
        const query = encodeURIComponent(`geopolitics OR conflict OR supply chain source:${source}`);
        const url = `https://news.google.com/rss/search?q=${query}&hl=en-US&gl=US&ceid=US:en`;
        const feed = await rssParser.parseURL(url);
        
        const items = feed.items.slice(0, 5).map(item => ({
            id: item.guid || item.link,
            title: (item.title || '').trim(),
            summary: (item.contentSnippet || item.content || '').replace(/<[^>]+>/g,'').trim().slice(0,200),
            url: item.link,
            source: source,
            publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
        }));
        scrapedNews.push(...items);
    } catch (error) {
        console.error(`[Scraper Error] Failed ${source}.`);
    }
  }
  return scrapedNews;
}

// ─── DYNAMIC DATA AGGREGATION ─────────────────────────────────────────────────
async function buildDynamicData(allNews, acledData) {
  const map = {};
  const dynamicMilitaryZones = [];

  // 1. Generate Live Military Zones from ACLED data
  acledData.forEach((e, index) => {
    // Only map events with actual coordinates and high intensity
    if (e.latitude && e.longitude && parseInt(e.fatalities) > 0) {
      dynamicMilitaryZones.push({
        id: `m-live-${index}`,
        lat: parseFloat(e.latitude),
        lng: parseFloat(e.longitude),
        type: e.event_type.toLowerCase().includes('explosion') ? 'air' : 'ground',
        country: e.country,
        description: `${e.event_type} involving ${e.actor1}`,
        intensity: parseInt(e.fatalities) > 10 ? 'high' : 'medium'
      });
    }
  });

  // 2. Aggregate Live News into Conflicts
  for (const item of allNews) {
    if (!isConflict(item.title, item.summary)) continue;
    const loc = extractLocation(item.title + ' ' + item.summary);
    if (!loc) continue;
    
    const key = loc.country;
    if (!map[key]) {
      map[key] = {
        id: `c-${key.toLowerCase().replace(/\W+/g,'-')}`,
        country: key, lat: loc.lat, lng: loc.lng,
        region: loc.region, title: item.title.slice(0,90),
        status: 'high', newsItems: [],
      };
    }
    map[key].newsItems.push(item);
  }

  const conflicts = Object.values(map).sort((a,b) => b.newsItems.length - a.newsItems.length);
  const finalConflicts = [];

  // Limit Gemini API calls to top 2 to avoid Vercel 10s Serverless Timeout
  for (let i = 0; i < conflicts.length; i++) {
    const c = conflicts[i];
    const sortedNews = [...c.newsItems].sort((a,b) => new Date(b.publishedAt) - new Date(a.publishedAt));
    const combinedSummary = sortedNews.slice(0,2).map(n => n.title).join('. ');

    let aiAnalysis = { companyImpact: { direct: [], indirect: [] }, macroEconomicImpact: "Pending analysis." };
    
    if (i < 2) {
        aiAnalysis = await analyzeImpactWithGemini(c.title, combinedSummary);
    }

    finalConflicts.push({
      ...c,
      risk: Math.min(99, 40 + (c.newsItems.length * 5)),
      description: combinedSummary,
      latestHeadline: sortedNews[0]?.title || '',
      latestUrl: sortedNews[0]?.url || '',
      newsCount: c.newsItems.length,
      recentNews: sortedNews.slice(0, 6),
      lastActivity: sortedNews[0]?.publishedAt || new Date().toISOString(),
      aiInsights: aiAnalysis
    });
  }

  return { 
    conflicts: finalConflicts.sort((a,b) => b.risk - a.risk), 
    militaryZones: dynamicMilitaryZones.slice(0, 15) // Cap to avoid cluttering map
  };
}

// ─── MAIN REFRESH ─────────────────────────────────────────────────────────────
async function refreshAll() {
  console.log('[Radar] Hydrating Cache Dynamically...');
  const errors = [];

  const rawNews = await scrapePremiumNewsLocally();
  const acledData = await fetchACLED();
  
  const { conflicts, militaryZones } = await buildDynamicData(rawNews, acledData);

  cache.news = rawNews;
  cache.conflicts = conflicts;
  cache.military = militaryZones;
  cache.lastUpdated = new Date().toISOString();
  cache.errors = errors;
}

// ─── VERCEL COLD START MIDDLEWARE ─────────────────────────────────────────────
app.use(async (req, res, next) => {
  if (req.path.startsWith('/api') && req.path !== '/api/refresh' && cache.conflicts.length === 0) {
    console.log('[Serverless] Cold start detected. Fetching live data...');
    await refreshAll();
  }
  next();
});

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.get('/api/health', (req,res) => res.json({ status:'ok', lastUpdated:cache.lastUpdated, counts:{ conflicts:cache.conflicts.length, military:cache.military.length }, errors:cache.errors }));
app.get('/api/industries', (req,res) => res.json(INDUSTRIES));
app.get('/api/chokepoints', (req,res) => res.json({ chokepoints: CHOKEPOINTS, lastUpdated: cache.lastUpdated }));

app.get('/api/conflicts', (req,res) => {
  let data = cache.conflicts;
  const { status } = req.query;
  if (status && status !== 'all') data = data.filter(c => c.status === status);
  res.json({ conflicts: data, lastUpdated: cache.lastUpdated });
});

app.get('/api/conflicts/:id', (req,res) => {
  const c = cache.conflicts.find(x => x.id === req.params.id);
  if (!c) return res.status(404).json({ error:'Not found' });
  res.json(c);
});

app.get('/api/news', (req,res) => {
  const { limit=60 } = req.query;
  res.json({ news: cache.news.slice(0, parseInt(limit)), lastUpdated: cache.lastUpdated });
});

app.get('/api/military-activity', (req,res) => res.json({ activities: cache.military, lastUpdated: cache.lastUpdated }));

// ─── VERCEL CRON TRIGGER ──────────────────────────────────────────────────────
app.get('/api/refresh', async (req,res) => { 
  try {
    await refreshAll();
    res.status(200).json({ status:'success', message:'Live Cache hydrated via Vercel Cron' });
  } catch(e) {
    res.status(500).json({ status:'error', message: e.message });
  }
});

module.exports = app;