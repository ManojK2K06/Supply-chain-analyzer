const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const Parser = require('rss-parser');
const cron = require('node-cron');

const app = express();
const rssParser = new Parser({ timeout: 8000, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; GeopoliticalRadar/1.0)' } });
app.use(cors());
app.use(express.json());

// ─── IN-MEMORY CACHE ──────────────────────────────────────────────────────────
let cache = { conflicts: [], news: [], weather: [], military: [], lastUpdated: null, errors: [] };

// ─── INDUSTRIES ───────────────────────────────────────────────────────────────
const INDUSTRIES = [
  { id:'all',          label:'All Industries' },
  { id:'tech',         label:'Technology & Semiconductors' },
  { id:'petroleum',    label:'Petroleum & Natural Gas' },
  { id:'agri',         label:'Agriculture & Food' },
  { id:'defense',      label:'Defense & Aerospace' },
  { id:'shipping',     label:'Shipping & Logistics' },
  { id:'finance',      label:'Banking & Finance' },
  { id:'pharma',       label:'Pharmaceuticals & Healthcare' },
  { id:'mining',       label:'Mining & Metals' },
  { id:'auto',         label:'Automotive & EV' },
  { id:'telecom',      label:'Telecommunications' },
  { id:'energy',       label:'Renewables & Energy' },
  { id:'textile',      label:'Textiles & Apparel' },
  { id:'chemicals',    label:'Chemicals & Plastics' },
  { id:'construction', label:'Construction & Real Estate' },
  { id:'tourism',      label:'Tourism & Aviation' },
  { id:'retail',       label:'Retail & E-Commerce' },
  { id:'food_processing',label:'Food Processing & Beverages' },
  { id:'insurance',    label:'Insurance' },
  { id:'maritime',     label:'Maritime & Ports' },
  { id:'rare_earth',   label:'Rare Earth & Critical Minerals' },
];

// ─── COMPANY DEPENDENCY GRAPH ─────────────────────────────────────────────────
// dependsOn[] = upstream suppliers; reverse map gives "who gets hurt downstream"
const COMPANIES = {
  // Foundries & Fab Equipment
  TSM:  { name:'TSMC',              sector:'tech',      description:'Makes 90% of world\'s advanced chips (<7nm). Closure = global chip famine in 3 months.',  dependsOn:[] },
  ASML: { name:'ASML',              sector:'tech',      description:'Sole maker of EUV lithography machines. Without ASML no advanced chip fab on Earth works.', dependsOn:['TSM'] },
  AMAT: { name:'Applied Materials', sector:'tech',      description:'Fab equipment supplier for every major foundry worldwide.',                                  dependsOn:['TSM'] },
  LRCX: { name:'Lam Research',      sector:'tech',      description:'Etch & deposition equipment. Critical for TSMC, Samsung, Intel production lines.',           dependsOn:['TSM'] },
  // Fabless Chip Designers
  NVDA: { name:'Nvidia',            sector:'tech',      description:'ALL GPUs fabbed by TSMC. AI, gaming, data center grind to halt within 90 days.',             dependsOn:['TSM','ASML'] },
  AMD:  { name:'AMD',               sector:'tech',      description:'CPUs/GPUs fabbed by TSMC. PC, server, and cloud infrastructure at risk.',                    dependsOn:['TSM','ASML'] },
  QCOM: { name:'Qualcomm',          sector:'tech',      description:'ALL smartphone chips from TSMC. Global mobile device production stops.',                     dependsOn:['TSM'] },
  INTC: { name:'Intel',             sector:'tech',      description:'Own fabs but relies on TSMC for leading nodes. Major neon gas consumer (Ukraine source).',   dependsOn:['TSM'] },
  MU:   { name:'Micron',            sector:'tech',      description:'DRAM/NAND memory. Taiwan fabs + China revenue = double exposure.',                           dependsOn:['TSM'] },
  // Big Tech (chip consumers)
  AAPL: { name:'Apple',             sector:'tech',      description:'ALL iPhone A-series chips from TSMC Taiwan. 60% of supply chain through Asia.',              dependsOn:['TSM','QCOM','NVDA'] },
  GOOGL:{ name:'Alphabet/Google',   sector:'tech',      description:'TPU AI chips from TSMC. YouTube, Cloud, Search need massive continuous GPU supply.',          dependsOn:['NVDA','AMD','TSM'] },
  MSFT: { name:'Microsoft',         sector:'tech',      description:'Azure AI runs on Nvidia H100s. Xbox chips are AMD-designed, TSMC-fabricated.',               dependsOn:['NVDA','AMD','TSM'] },
  META: { name:'Meta',              sector:'tech',      description:'Llama AI training requires thousands of Nvidia H100s. Data centers chip-dependent.',          dependsOn:['NVDA','TSM'] },
  AMZN: { name:'Amazon',            sector:'tech',      description:'AWS Nvidia GPUs + custom Graviton chips (TSMC-made). 60% of goods ship via Asia.',           dependsOn:['NVDA','TSM','ZIM'] },
  // Automotive
  TSLA: { name:'Tesla',             sector:'auto',      description:'FSD chips (Samsung, same supply chain). Lithium/cobalt from DRC and Chile.',                 dependsOn:['TSM','NVDA','ALB'] },
  TM:   { name:'Toyota',            sector:'auto',      description:'40% of parts sourced from Asia. 2021 chip shortage halted production globally.',             dependsOn:['TSM','INTC'] },
  F:    { name:'Ford',              sector:'auto',      description:'F-150 Lightning uses LFP batteries. Full Taiwan chip dependency for SYNC/ADAS systems.',     dependsOn:['TSM','ALB'] },
  GM:   { name:'GM',                sector:'auto',      description:'Ultium EV platform requires cobalt/lithium. TSMC chip dependencies on every vehicle.',       dependsOn:['TSM','ALB'] },
  // Defense
  LMT:  { name:'Lockheed Martin',   sector:'defense',   description:'F-35, Patriot, HIMARS. War escalation drives procurement surge. Titanium from Ukraine.',     dependsOn:[] },
  RTX:  { name:'RTX (Raytheon)',    sector:'defense',   description:'Patriot missiles, Stinger MANPADS. Conflict = massive orders, but supply chain stressed.',   dependsOn:[] },
  NOC:  { name:'Northrop Grumman',  sector:'defense',   description:'B-21 stealth bomber, GBSD ICBM. Rare earth minerals critical for electronics.',             dependsOn:[] },
  BA:   { name:'Boeing',            sector:'defense',   description:'Commercial + military aircraft. 30% of titanium historically from Russia/Ukraine.',           dependsOn:['INTC'] },
  GD:   { name:'General Dynamics',  sector:'defense',   description:'Abrams tanks, Stryker APCs. Steel and aluminum prices spike from conflict zones.',           dependsOn:[] },
  // Oil & Gas
  XOM:  { name:'ExxonMobil',        sector:'petroleum', description:'Largest US oil major. Hormuz closure = crude oil +50-100% in weeks.',                       dependsOn:[] },
  CVX:  { name:'Chevron',           sector:'petroleum', description:'Major Middle East + Kazakhstan operations. Hormuz blockade = massive revenue swing.',         dependsOn:[] },
  BP:   { name:'BP',                sector:'petroleum', description:'Middle East + Gulf ops. Red Sea disruption adds weeks and cost to every tanker.',             dependsOn:[] },
  SHEL: { name:'Shell',             sector:'petroleum', description:'LNG market leader. Red Sea attacks force costly Africa re-routing.',                          dependsOn:[] },
  TTE:  { name:'TotalEnergies',     sector:'petroleum', description:'Hormuz + Russia exposure. LNG contracts routed through Middle East.',                         dependsOn:[] },
  HAL:  { name:'Halliburton',       sector:'petroleum', description:'Oilfield services in Middle East. Regional war = direct operational disruption.',             dependsOn:[] },
  SLB:  { name:'Schlumberger',      sector:'petroleum', description:'Global oilfield services. Conflict zones = extraction and drilling disruption.',              dependsOn:[] },
  MPC:  { name:'Marathon Petroleum',sector:'petroleum', description:'US refiner heavily dependent on crude input. Price spikes when Hormuz threatened.',           dependsOn:['XOM','CVX'] },
  VLO:  { name:'Valero Energy',     sector:'petroleum', description:'Gulf Coast refiner. Oil price volatility from Middle East = margin compression.',             dependsOn:['XOM'] },
  // Shipping & Logistics
  ZIM:  { name:'ZIM Integrated',    sector:'shipping',  description:'Israeli shipper — rerouting ALL vessels around Africa since Oct 2023 Houthi attacks.',       dependsOn:[] },
  FDX:  { name:'FedEx',             sector:'shipping',  description:'Air freight + ground. Middle East air corridor closures add days and significant costs.',    dependsOn:[] },
  UPS:  { name:'UPS',               sector:'shipping',  description:'Global logistics. Air route disruptions through conflict zones = cascading delays.',          dependsOn:[] },
  CHRW: { name:'C.H. Robinson',     sector:'shipping',  description:'3PL freight broker. Supply chain disruptions spike freight rates — revenue swing.',           dependsOn:[] },
  // Agriculture
  ADM:  { name:'Archer-Daniels-Midland', sector:'agri', description:'World\'s largest grain trader. Ukraine = 30% of global wheat exports blocked.',             dependsOn:[] },
  BG:   { name:'Bunge Global',      sector:'agri',      description:'Major grain & oilseed processor. Black Sea disruption = direct core business shock.',        dependsOn:[] },
  MOS:  { name:'Mosaic',            sector:'agri',      description:'Fertilizer giant. Russia/Belarus supply 40% of global potash. Sanctions = shortage.',        dependsOn:[] },
  CF:   { name:'CF Industries',     sector:'agri',      description:'Nitrogen fertilizer maker. Natural gas price spikes from Ukraine = input cost explosion.',   dependsOn:[] },
  // Mining & Materials
  RIO:  { name:'Rio Tinto',         sector:'mining',    description:'Iron ore, aluminum, copper. Global shipping lanes critical for ore transport.',               dependsOn:[] },
  BHP:  { name:'BHP',               sector:'mining',    description:'Iron ore, copper, nickel. South China Sea closure = Australia export catastrophe.',           dependsOn:[] },
  VALE: { name:'Vale',              sector:'mining',    description:'World\'s largest iron ore producer. Ships through conflict-adjacent sea lanes.',              dependsOn:[] },
  MP:   { name:'MP Materials',      sector:'mining',    description:'Only US rare earth miner. China controls 85% of processing — conflict = supply shock.',       dependsOn:[] },
  ALB:  { name:'Albemarle',         sector:'mining',    description:'Largest lithium producer globally. EV battery supply chain at risk.',                         dependsOn:[] },
  GOLD: { name:'Barrick Gold',      sector:'mining',    description:'Conflict drives gold price surge. Also has operations in conflict-adjacent Africa.',           dependsOn:[] },
  NUE:  { name:'Nucor',             sector:'mining',    description:'US steel producer. Ukraine war = global steel supply/price shock.',                           dependsOn:[] },
  // Finance
  JPM:  { name:'JPMorgan Chase',    sector:'finance',   description:'Sanctions regimes, EM exposure, energy price volatility affect balance sheet.',               dependsOn:[] },
  GS:   { name:'Goldman Sachs',     sector:'finance',   description:'Commodities trading desk profits from volatility. EM debt at risk.',                          dependsOn:[] },
  // Aviation
  DAL:  { name:'Delta Airlines',    sector:'tourism',   description:'Airspace closures over conflict zones = detours + massive fuel cost surge.',                  dependsOn:['XOM','CVX'] },
  UAL:  { name:'United Airlines',   sector:'tourism',   description:'Trans-Pacific routes through contested airspace. Fuel cost = #1 variable.',                  dependsOn:['XOM'] },
  // Retail
  WMT:  { name:'Walmart',           sector:'retail',    description:'70% of goods manufactured in China/Asia. Shipping disruption = empty shelves in weeks.',     dependsOn:['ZIM','FDX','AMZN'] },
  TGT:  { name:'Target',            sector:'retail',    description:'60%+ imports from Asia. Malacca closure = 2-3 week supply cliff for consumers.',             dependsOn:['ZIM','FDX'] },
  // Pharma
  PFE:  { name:'Pfizer',            sector:'pharma',    description:'80% of active pharmaceutical ingredients (APIs) from China/India. Conflict = API shortage.', dependsOn:[] },
  JNJ:  { name:'J&J',               sector:'pharma',    description:'Medical devices + pharma. Taiwan chips are embedded in most modern medical equipment.',       dependsOn:['TSM'] },
  // Insurance
  CB:   { name:'Chubb',             sector:'insurance', description:'War risk + marine insurance. Houthi attacks triggering massive war risk premium surge.',     dependsOn:[] },
  MKL:  { name:'Markel',            sector:'insurance', description:'Specialty insurer. Shipping war risk premiums up +300% since Red Sea attacks began.',        dependsOn:[] },
};

// Build reverse dependency (who depends downstream on a given ticker)
const DEPENDENTS = (() => {
  const d = {};
  for (const [t, data] of Object.entries(COMPANIES)) {
    for (const dep of (data.dependsOn || [])) {
      if (!d[dep]) d[dep] = [];
      d[dep].push(t);
    }
  }
  return d;
})();

function computeCascade(directTickers) {
  const direct  = new Set(directTickers.filter(t => COMPANIES[t]));
  const indirect = new Set();
  const tertiary = new Set();
  for (const t of direct)   (DEPENDENTS[t] || []).forEach(d => { if (!direct.has(d))   indirect.add(d); });
  for (const t of indirect) (DEPENDENTS[t] || []).forEach(d => { if (!direct.has(d) && !indirect.has(d)) tertiary.add(d); });
  const fmt = (set, impact) => [...set].map(t => ({ ticker:t, ...COMPANIES[t], impact })).filter(x => x.name);
  return { direct: fmt(direct,'direct'), indirect: fmt(indirect,'indirect'), tertiary: fmt(tertiary,'tertiary') };
}

// ─── CHOKEPOINTS DATABASE ─────────────────────────────────────────────────────
const CHOKEPOINTS = [
  {
    id:'strait_hormuz', name:'Strait of Hormuz', type:'strait', emoji:'🛢️',
    lat:26.6, lng:56.2,
    path:[[26.35,57.3],[26.55,56.8],[26.7,56.2],[26.85,55.7]],
    description:'21% of global petroleum (17-18M bbl/day). Iran borders this strait. A blockade spikes crude +50-100% within days and causes immediate global energy crisis.',
    throughput:'21% of global oil supply', dailyVolume:'17-18M barrels/day',
    keywords:['iran','hormuz','persian gulf','middle east war','gulf war'],
    blockedBy:['Iranian naval blockade','Mining of the strait','Houthi missile strikes on tankers'],
    affectedCommodities:['Crude Oil','LNG','Refined Products','Petrochemicals','Aviation Fuel'],
    affectedIndustries:['petroleum','energy','chemicals','auto','shipping'],
    directTickers:['XOM','CVX','BP','SHEL','TTE','HAL','SLB','MPC','VLO'],
    alternativeRoute:'Saudi Abqaiq-Yanbu pipeline (limited — only 7M bbl/day capacity)',
    closureCost:'Oil +50-100%; $200B+ disruption in 90 days',
    riskColor:'#ff2222',
  },
  {
    id:'strait_malacca', name:'Strait of Malacca', type:'strait', emoji:'🚢',
    lat:2.5, lng:101.5,
    path:[[1.2,103.9],[2.0,102.4],[3.2,101.0],[4.5,99.8],[5.5,98.6]],
    description:'Busiest shipping lane on Earth. 25% of global trade, 80% of China & Japan oil imports. Closure triggers immediate fuel rationing across Asia.',
    throughput:'25% of global trade', dailyVolume:'80,000+ vessels/year',
    keywords:['south china sea','taiwan','singapore','indonesia','malacca','piracy'],
    blockedBy:['China-US naval confrontation','PLA exercise closure','Piracy escalation'],
    affectedCommodities:['Consumer Electronics','Oil','LNG','Coal','Palm Oil','Semiconductors'],
    affectedIndustries:['tech','petroleum','shipping','auto','retail','agri'],
    directTickers:['AAPL','NVDA','TSM','XOM','AMZN','ZIM','WMT','TGT','RIO','BHP'],
    alternativeRoute:'Lombok Strait or Sunda Strait (+3-5 days, +$300K fuel/voyage)',
    closureCost:'$6T+ trade at risk; Asian recession within weeks',
    riskColor:'#ff2222',
  },
  {
    id:'suez_canal', name:'Suez Canal', type:'canal', emoji:'⚓',
    lat:30.5, lng:32.3,
    path:[[29.9,32.55],[30.5,32.37],[31.0,32.25],[31.25,32.15]],
    description:'12% of global trade, 30% of container shipping. Already disrupted — Houthi attacks forcing ships around Africa (+$1M fuel/voyage). Full closure = $9.6B/day disruption.',
    throughput:'12% of global trade, 30% of containers', dailyVolume:'~50 ships/day',
    keywords:['gaza','israel','egypt','houthi','red sea','suez','north africa'],
    blockedBy:['Houthi Red Sea missile attacks','Regional war spillover','Physical canal blockage'],
    affectedCommodities:['Container Cargo','Oil','LNG','Grain','Electronics','Auto Parts'],
    affectedIndustries:['shipping','retail','petroleum','agri','tech','auto'],
    directTickers:['ZIM','FDX','UPS','AMZN','WMT','TGT','XOM','BP','SHEL'],
    alternativeRoute:'Cape of Good Hope (+10-14 days, +~$1M fuel)',
    closureCost:'$9.6B/day global trade disruption',
    riskColor:'#ff2222',
  },
  {
    id:'bab_el_mandeb', name:'Bab el-Mandeb Strait', type:'strait', emoji:'🎯',
    lat:12.6, lng:43.4,
    path:[[11.6,43.5],[12.2,43.4],[12.8,43.3],[13.4,43.1]],
    description:'Houthis have attacked 100+ vessels since Nov 2023. Most major shipping lines rerouting around Africa. Gateway between Red Sea and Gulf of Aden.',
    throughput:'10% of global trade', dailyVolume:'19,000 ships/year',
    keywords:['houthi','yemen','red sea','somalia','djibouti','horn of africa'],
    blockedBy:['Houthi drone & missile attacks','Iranian weapons supply','Anti-ship mines'],
    affectedCommodities:['Container Cargo','Oil','LNG','Food Aid','Consumer Goods'],
    affectedIndustries:['shipping','petroleum','agri','retail','food_processing'],
    directTickers:['ZIM','FDX','UPS','DAL','UAL','AMZN','XOM','BP'],
    alternativeRoute:'Cape of Good Hope only alternative',
    closureCost:'$1T+ annual trade at full disruption',
    riskColor:'#f59e0b',
  },
  {
    id:'taiwan_strait_lane', name:'Taiwan Strait', type:'sea_lane', emoji:'💻',
    lat:24.5, lng:119.8,
    path:[[22.0,120.5],[23.5,120.1],[25.0,119.7],[26.5,119.9]],
    description:'48% of container ships + Taiwan\'s semiconductor exports. TSMC makes 90% of chips under 7nm. PLA blockade = largest economic shock in modern history. Global AI industry collapses in 90 days.',
    throughput:'48% of global container ships', dailyVolume:'~50 large vessels/day',
    keywords:['taiwan','pla','china military','taipei','tsmc','strait crisis'],
    blockedBy:['PLA naval blockade','Chinese military exercises','Missile strikes on Taiwanese ports'],
    affectedCommodities:['Semiconductors','iPhones','Advanced Chips','DRAM','Display Panels'],
    affectedIndustries:['tech','auto','defense','telecom','shipping','retail'],
    directTickers:['TSM','NVDA','AAPL','AMD','QCOM','INTC','ASML','AMAT','LRCX','MU'],
    alternativeRoute:'Luzon Strait — partial only. No substitute for Taiwan chips.',
    closureCost:'$2.5T semiconductor market; global electronics halts within 3 months',
    riskColor:'#f59e0b',
  },
  {
    id:'south_china_sea_lanes', name:'South China Sea', type:'sea_lane', emoji:'⚔️',
    lat:13.0, lng:113.0,
    path:[[1.5,104.0],[5.0,107.5],[10.0,111.0],[15.0,114.5],[20.0,116.5]],
    description:'$3.4T annual trade. China, Philippines, Vietnam, Malaysia have overlapping claims. Active maritime standoffs weekly. Water cannon incidents between China and Philippines now routine.',
    throughput:'$3.4T annual trade (30% of global)', dailyVolume:'100,000+ ships/year',
    keywords:['south china sea','philippines','spratly','scarborough','vietnam sea','sea dispute'],
    blockedBy:['Chinese naval exclusion zones','Artificial island fortress construction','Philippines confrontations'],
    affectedCommodities:['Oil','LNG','Electronics','Coal','Iron Ore','Consumer Goods'],
    affectedIndustries:['petroleum','tech','shipping','mining','auto'],
    directTickers:['XOM','NVDA','TSM','RIO','BHP','VALE','ZIM','AMZN'],
    alternativeRoute:'Indonesian straits (Lombok, Sunda) — significant detours',
    closureCost:'$3.4T annual trade; Asian commodity prices spike across the board',
    riskColor:'#f59e0b',
  },
  {
    id:'black_sea_bosphorus', name:'Black Sea / Bosphorus', type:'strait', emoji:'🌾',
    lat:41.1, lng:29.0,
    path:[[40.97,28.75],[41.05,28.95],[41.12,29.05],[41.22,29.12]],
    description:'Ukraine + Russia = 28% of global wheat, 75% of sunflower oil. Russian naval blockade and mines have devastated Black Sea grain trade, causing global food price inflation of 40%+.',
    throughput:'Critical grain corridor; 2.5% of global trade', dailyVolume:'45,000 ships/year through Bosphorus',
    keywords:['ukraine','russia','black sea','odesa','crimea','grain corridor','bosphorus'],
    blockedBy:['Russian naval blockade','Anti-ship mine warfare','Turkish Bosphorus closure'],
    affectedCommodities:['Wheat','Sunflower Oil','Steel','Russian Oil','Fertilizers','Corn'],
    affectedIndustries:['agri','petroleum','chemicals','food_processing'],
    directTickers:['ADM','BG','MOS','CF','NUE'],
    alternativeRoute:'Danube River (very limited); Romanian/Bulgarian ports (partial)',
    closureCost:'Global food prices surged 40%+ from 2022 partial blockade',
    riskColor:'#f59e0b',
  },
  {
    id:'panama_canal', name:'Panama Canal', type:'canal', emoji:'🌊',
    lat:9.08, lng:-79.68,
    path:[[8.88,-79.55],[9.05,-79.65],[9.22,-79.77],[9.38,-79.88]],
    description:'5% of global maritime trade. 2023-24 drought cut vessels from 36 to 18/day. Climate change making closures more frequent. $270B annual trade at risk.',
    throughput:'5% of global maritime trade', dailyVolume:'~40 ships/day (reduced by drought)',
    keywords:['panama','venezuela','latin america','caribbean','canal drought'],
    blockedBy:['Drought/water shortage (climate-driven)','Infrastructure sabotage','Regional instability'],
    affectedCommodities:['LNG','Grain','Coal','Chemicals','Vehicles'],
    affectedIndustries:['shipping','petroleum','agri','auto','chemicals'],
    directTickers:['ZIM','FDX','UPS','CHRW','ADM','XOM'],
    alternativeRoute:'Cape Horn (+7-10 days) or Suez Canal',
    closureCost:'$270B annual trade; US East Coast and East Asia most impacted',
    riskColor:'#10b981',
  },
];

// Match conflict text → chokepoints
function matchChokepoints(title, region, country) {
  const text = `${title} ${region} ${country}`.toLowerCase();
  return CHOKEPOINTS.filter(cp => cp.keywords.some(kw => text.includes(kw)));
}

// ─── LOCATION PATTERNS ────────────────────────────────────────────────────────
const LOCATIONS = [
  { re:/ukraine|kyiv|kharkiv|donbas|zaporizhzhia|odesa|kherson|mariupol/i,    country:'Ukraine',         region:'Eastern Europe',  lat:49.0, lng:31.0 },
  { re:/russia.*attack|russian.*forces|kremlin.*war|moscow.*military/i,       country:'Russia',          region:'Eastern Europe',  lat:55.7, lng:37.6 },
  { re:/israel|gaza|hamas|west bank|tel aviv|rafah|netanyahu|idf/i,           country:'Israel/Palestine',region:'Middle East',      lat:31.5, lng:34.5 },
  { re:/taiwan|taipei|tsmc.*china|pla.*strait|china.*blockade/i,              country:'Taiwan',          region:'East Asia',        lat:23.7, lng:120.9 },
  { re:/south china sea|spratly|scarborough|philippines.*china/i,             country:'South China Sea', region:'Southeast Asia',   lat:13.0, lng:113.0 },
  { re:/iran|tehran|persian gulf|hormuz|irgc|nuclear.*iran/i,                 country:'Iran',            region:'Middle East',      lat:32.4, lng:53.7 },
  { re:/houthi|yemen|red sea attack|bab.el.mandeb/i,                          country:'Yemen/Red Sea',   region:'Middle East',      lat:14.0, lng:43.0 },
  { re:/sudan|khartoum|rsf.*sudan|saf.*sudan|darfur/i,                        country:'Sudan',           region:'Africa',           lat:15.5, lng:32.5 },
  { re:/myanmar|burma|junta|tatmadaw|shan|rakhine|sagaing/i,                  country:'Myanmar',         region:'Southeast Asia',   lat:19.7, lng:96.1 },
  { re:/ethiopia|tigray|amhara|oromia|addis ababa/i,                          country:'Ethiopia',        region:'Africa',           lat:9.1,  lng:40.5 },
  { re:/sahel|mali|burkina faso|niger.*coup|jihadist.*africa|jnim|isgs/i,     country:'Sahel Region',    region:'Africa',           lat:15.0, lng:2.0 },
  { re:/kashmir|india.*pakistan border|pakistan.*india.*military/i,           country:'Kashmir',         region:'South Asia',       lat:34.0, lng:74.0 },
  { re:/lebanon|hezbollah|beirut.*attack/i,                                   country:'Lebanon',         region:'Middle East',      lat:33.8, lng:35.5 },
  { re:/syria|damascus|idlib|aleppo/i,                                        country:'Syria',           region:'Middle East',      lat:34.8, lng:38.9 },
  { re:/somalia|mogadishu|al.shabaab|horn of africa/i,                        country:'Somalia',         region:'Africa',           lat:5.1,  lng:46.2 },
  { re:/haiti|port.au.prince.*gang|gang.*haiti/i,                             country:'Haiti',           region:'Caribbean',        lat:18.9, lng:-72.3 },
  { re:/venezuela.*guyana|guyana.*essequibo|maduro.*military/i,               country:'Venezuela',       region:'South America',    lat:6.4,  lng:-66.5 },
  { re:/congo|drc|kinshasa|m23|kivu/i,                                        country:'DR Congo',        region:'Africa',           lat:-4.0, lng:21.8 },
  { re:/afghanistan|taliban|kabul/i,                                          country:'Afghanistan',     region:'South Asia',       lat:33.9, lng:67.7 },
  { re:/north korea|pyongyang|dprk|kim.*missile/i,                            country:'North Korea',     region:'East Asia',        lat:40.0, lng:127.0 },
  { re:/nagorno.karabakh|armenia.*azerbaijan|azerbaijan.*armenia/i,           country:'Caucasus',        region:'Caucasus',         lat:39.8, lng:46.8 },
  { re:/mozambique|cabo delgado|isis.*mozambique/i,                           country:'Mozambique',      region:'Africa',           lat:-18.0,lng:35.0 },
];

function extractLocation(text) {
  for (const loc of LOCATIONS) {
    if (loc.re.test(text)) return loc;
  }
  return null;
}

// ─── CONFLICT KEYWORDS ────────────────────────────────────────────────────────
const CONFLICT_KW = [
  'war','attack','invasion','conflict','military operation','troops','missile strike',
  'airstrike','air strike','offensive','ceasefire','battle','killed','casualties',
  'bombing','shelling','insurgency','rebel','coup','blockade','escalation','frontline',
  'drone strike','naval clash','siege','occupation','ground offensive','artillery',
  'armed forces','warplane','fighter jet','warship','destroyer','submarine',
];

function isConflict(title, summary) {
  const text = (title + ' ' + (summary || '')).toLowerCase();
  return CONFLICT_KW.filter(kw => text.includes(kw)).length >= 2;
}

function conflictStatus(text) {
  const t = text.toLowerCase();
  if (['war ','invasion','occupation','siege','ground offensive','artillery strike'].some(k => t.includes(k))) return 'war';
  if (['attack','airstrike','air strike','killed','offensive','shelling','drone strike'].some(k => t.includes(k))) return 'war';
  if (['tension','threat','escalation','military buildup','exercises','standoff','dispute'].some(k => t.includes(k))) return 'potential';
  return 'potential';
}

function riskScore(newsCount, fatalities, status, chokepointCount) {
  let s = 15;
  if (status === 'war') s += 40;
  if (status === 'potential') s += 20;
  s += Math.min(25, newsCount * 2.5);
  s += Math.min(15, Math.floor((fatalities || 0) / 20));
  s += Math.min(15, chokepointCount * 5);
  return Math.min(99, Math.round(s));
}

function industryTickers(text) {
  const t = text.toLowerCase();
  const out = new Set();
  if (/oil|gas|petroleum|opec|energy|barrel|brent|crude/.test(t)) ['XOM','CVX','BP','SHEL','TTE','HAL','SLB'].forEach(x => out.add(x));
  if (/wheat|grain|food|agri|fertilizer|harvest|sunflower/.test(t)) ['ADM','BG','MOS','CF'].forEach(x => out.add(x));
  if (/semiconductor|chip|taiwan|tsmc|nvidia|tech|silicon/.test(t)) ['TSM','NVDA','AMD','AAPL','INTC','ASML'].forEach(x => out.add(x));
  if (/gold|mining|mineral|copper|lithium|cobalt/.test(t)) ['GOLD','RIO','BHP','ALB','MP'].forEach(x => out.add(x));
  if (/ship|port|vessel|suez|freight|cargo|tanker/.test(t)) ['ZIM','FDX','UPS','CHRW'].forEach(x => out.add(x));
  if (/defense|military|weapon|missile|nato|army/.test(t)) ['LMT','RTX','NOC','BA','GD'].forEach(x => out.add(x));
  if (/bank|finance|sanction|swift|currency/.test(t)) ['JPM','GS'].forEach(x => out.add(x));
  if (/airline|aviation|airspace|flight/.test(t)) ['DAL','UAL'].forEach(x => out.add(x));
  return [...out];
}

function tagIndustries(text) {
  const t = text.toLowerCase();
  const tags = [];
  const map = {
    tech:     ['semiconductor','chip','nvidia','tsmc','technology','cyber','silicon','ai','intel'],
    petroleum:['oil','gas','opec','crude','brent','pipeline','lng','petroleum','refinery'],
    agri:     ['wheat','grain','food','agriculture','crop','fertilizer','harvest','rice','corn'],
    defense:  ['military','army','missile','weapon','nato','defense','warship','aircraft','troops'],
    shipping: ['shipping','port','container','suez','logistics','cargo','freight','tanker'],
    finance:  ['bank','sanction','swift','dollar','inflation','fed','imf','currency'],
    pharma:   ['vaccine','pharma','health','who','pandemic','medicine','drug'],
    mining:   ['gold','copper','lithium','uranium','cobalt','mining','iron ore'],
    auto:     ['electric vehicle','ev','auto','tesla','battery','car','automotive'],
    telecom:  ['5g','telecom','huawei','spectrum','satellite','internet'],
    energy:   ['solar','wind','renewable','nuclear','energy','power grid'],
    rare_earth:['rare earth','critical mineral','cobalt','lithium','neodymium'],
  };
  for (const [id, kws] of Object.entries(map)) {
    if (kws.some(kw => t.includes(kw))) tags.push(id);
  }
  return tags.length ? tags : ['all'];
}

function newsRisk(title) {
  const t = title.toLowerCase();
  if (['war ','attack','invasion','airstrike','missiles fired','killed','explosion'].some(k => t.includes(k))) return 'critical';
  if (['conflict','military','troops','escalation','offensive','missile','blockade'].some(k => t.includes(k))) return 'high';
  if (['sanction','tension','protest','crisis','dispute','threat'].some(k => t.includes(k))) return 'medium';
  return 'low';
}

// ─── RSS FEEDS ────────────────────────────────────────────────────────────────
const NEWS_FEEDS = [
  { url:'https://feeds.reuters.com/reuters/worldNews',            source:'Reuters' },
  { url:'https://feeds.bbci.co.uk/news/world/rss.xml',            source:'BBC World' },
  { url:'https://www.aljazeera.com/xml/rss/all.xml',              source:'Al Jazeera' },
  { url:'https://rss.nytimes.com/services/xml/rss/nyt/World.xml', source:'NYT World' },
  { url:'https://www.defensenews.com/arc/outboundfeeds/rss/',     source:'Defense News' },
  { url:'https://oilprice.com/rss/main',                          source:'OilPrice' },
  { url:'https://www.geopoliticalmonitor.com/feed/',              source:'Geopolitical Monitor' },
  { url:'https://reliefweb.int/updates/rss.xml',                  source:'ReliefWeb' },
];

const WEATHER_FEEDS = [
  { url:'https://www.nhc.noaa.gov/nhc_at2.xml',  source:'NOAA Atlantic' },
  { url:'https://www.nhc.noaa.gov/nhc_ep2.xml',  source:'NOAA Pacific' },
  { url:'https://weather.com/news/news/rss',      source:'Weather Channel' },
];

const EXTREME_KW = [
  'hurricane','typhoon','cyclone','tornado','earthquake','tsunami','flood','drought',
  'wildfire','heatwave','blizzard','ice storm','monsoon','landslide','volcanic eruption',
  'extreme heat','record temperature','catastrophic flood','emergency','natural disaster',
];

const WEATHER_SUPPLY = {
  hurricane: { industries:['petroleum','agri','shipping','construction'],  tickers:['XOM','CVX','ADM','ZIM','BG'] },
  typhoon:   { industries:['tech','shipping','agri'],                       tickers:['TSM','AAPL','ZIM','TM'] },
  cyclone:   { industries:['agri','mining','shipping','petroleum'],          tickers:['BHP','RIO','VALE','ADM'] },
  earthquake:{ industries:['tech','petroleum','auto','chemicals'],           tickers:['TSM','TM','XOM','INTC'] },
  flood:     { industries:['agri','textile','auto','shipping'],              tickers:['ADM','BG','TM','GM'] },
  drought:   { industries:['agri','energy','shipping'],                      tickers:['ADM','BG','MOS','CF','XOM'] },
  wildfire:  { industries:['petroleum','construction','agri','energy'],      tickers:['XOM','CVX','WMT'] },
  heatwave:  { industries:['agri','energy','shipping'],                      tickers:['ADM','CF','XOM'] },
  tsunami:   { industries:['tech','auto','petroleum','shipping'],            tickers:['TSM','TM','XOM','ZIM'] },
};

function weatherImpact(title) {
  const t = title.toLowerCase();
  for (const [ev, data] of Object.entries(WEATHER_SUPPLY)) {
    if (t.includes(ev)) return { eventType: ev, ...data };
  }
  return { eventType:'extreme_event', industries:['agri','shipping','energy'], tickers:['ADM','ZIM','XOM'] };
}

// ─── SCRAPE FUNCTIONS ─────────────────────────────────────────────────────────
async function fetchRSS(feed) {
  try {
    const d = await rssParser.parseURL(feed.url);
    return (d.items || []).slice(0, 15).map(item => ({
      id: item.guid || item.link || `${feed.source}-${Math.random()}`,
      title: (item.title || '').trim(),
      summary: (item.contentSnippet || item.content || '').replace(/<[^>]+>/g,'').trim().slice(0,400),
      url: item.link,
      source: feed.source,
      publishedAt: item.isoDate || item.pubDate || new Date().toISOString(),
    }));
  } catch { return []; }
}

async function fetchGDELT() {
  try {
    const url = 'https://api.gdeltproject.org/api/v2/doc/doc?query=conflict%20war%20military%20attack&mode=artlist&maxrecords=30&timespan=6h&format=json';
    const res = await axios.get(url, { timeout: 8000 });
    if (!res.data?.articles) return [];
    return res.data.articles.map(a => ({
      id: a.url,
      title: (a.title || '').trim(),
      summary: '',
      url: a.url,
      source: a.domain || 'GDELT',
      publishedAt: a.seendate
        ? new Date(a.seendate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/,'$1-$2-$3T$4:$5:$6Z')).toISOString()
        : new Date().toISOString(),
    }));
  } catch { return []; }
}

async function fetchACLED() {
  try {
    const from = new Date(Date.now() - 14*24*60*60*1000).toISOString().slice(0,10);
    const to   = new Date().toISOString().slice(0,10);
    const url  = `https://api.acleddata.com/acled/read?limit=30&fields=event_date,country,admin1,event_type,actor1,actor2,fatalities,latitude,longitude,notes&event_date_where=BETWEEN&event_date_from=${from}&event_date_to=${to}`;
    const res  = await axios.get(url, { timeout: 8000 });
    if (!res.data?.data) return [];
    return res.data.data.map(e => ({
      id: `acled-${e.event_date}-${e.country}-${Math.random()}`,
      title: `${e.event_type}: ${e.actor1}${e.actor2 ? ' vs '+e.actor2 : ''} — ${e.admin1}, ${e.country}`,
      summary: (e.notes || '').slice(0, 300),
      country: e.country, region:'',
      lat: parseFloat(e.latitude), lng: parseFloat(e.longitude),
      fatalities: parseInt(e.fatalities) || 0,
      eventType: e.event_type,
      publishedAt: new Date(e.event_date).toISOString(),
      source:'ACLED', url:'https://acleddata.com', isACLED: true,
    })).filter(e => !isNaN(e.lat) && !isNaN(e.lng));
  } catch { return []; }
}

// ─── CONFLICT AGGREGATOR ──────────────────────────────────────────────────────
function buildConflicts(allNews, acled) {
  const map = {};

  // Process ACLED events
  for (const e of acled) {
    const key = e.country;
    if (!map[key]) {
      const loc = extractLocation(e.title + ' ' + e.country) || { lat: e.lat, lng: e.lng, region: 'Unknown' };
      map[key] = {
        id: `c-${key.toLowerCase().replace(/\W+/g,'-')}`,
        country: key, lat: e.lat, lng: e.lng,
        region: loc.region || 'Unknown',
        title: `${e.eventType || 'Armed Conflict'} — ${key}`,
        status: 'war',
        newsItems: [], acledEvents: [],
        totalFatalities: 0, sources: ['ACLED'],
      };
    }
    map[key].acledEvents.push(e);
    map[key].totalFatalities += e.fatalities;
  }

  // Process news
  for (const item of allNews) {
    if (!isConflict(item.title, item.summary)) continue;
    const loc = extractLocation(item.title + ' ' + item.summary);
    if (!loc) continue;
    const key = loc.country;
    if (!map[key]) {
      map[key] = {
        id: `c-${key.toLowerCase().replace(/\W+/g,'-')}`,
        country: key, lat: loc.lat, lng: loc.lng,
        region: loc.region,
        title: item.title.slice(0,90),
        status: conflictStatus(item.title + ' ' + item.summary),
        newsItems: [], acledEvents: [],
        totalFatalities: 0, sources: [],
      };
    }
    map[key].newsItems.push(item);
    if (!map[key].sources.includes(item.source)) map[key].sources.push(item.source);
    if (map[key].newsItems.length === 1) map[key].title = item.title.slice(0,90);
    // Upgrade status
    const s = conflictStatus(item.title + ' ' + item.summary);
    if (s === 'war' && map[key].status !== 'war') map[key].status = 'war';
  }

  return Object.values(map)
    .filter(c => c.newsItems.length + c.acledEvents.length > 0)
    .map(c => {
      const cps = matchChokepoints(c.title, c.region, c.country);
      const allTickers = [...new Set([
        ...cps.flatMap(cp => cp.directTickers),
        ...industryTickers(c.title + ' ' + c.region + ' ' + c.country),
      ])];
      const cascade = computeCascade(allTickers);
      const score = riskScore(c.newsItems.length, c.totalFatalities, c.status, cps.length);
      const sorted = [...c.newsItems].sort((a,b) => new Date(b.publishedAt) - new Date(a.publishedAt));
      const allIndustries = [...new Set(cps.flatMap(cp => cp.affectedIndustries))];
      const allCommodities = [...new Set(cps.flatMap(cp => cp.affectedCommodities))];

      return {
        ...c,
        risk: score,
        description: sorted[0]?.summary || sorted[0]?.title || `Ongoing conflict in ${c.country}`,
        latestHeadline: sorted[0]?.title || '',
        latestUrl: sorted[0]?.url || '',
        newsCount: c.newsItems.length,
        acledCount: c.acledEvents.length,
        chokepoints: cps,
        companyImpact: cascade,
        affectedIndustries: allIndustries,
        affectedSupply: allCommodities,
        recentNews: sorted.slice(0, 6),
        lastActivity: sorted[0]?.publishedAt || new Date().toISOString(),
      };
    })
    .sort((a,b) => b.risk - a.risk);
}

// ─── MILITARY STATIC ZONES (augmented) ───────────────────────────────────────
const MILITARY_ZONES = [
  { id:'m1', lat:47.5, lng:37.0,  type:'ground', country:'Russia/Ukraine',  description:'Active front line — Donetsk Oblast', intensity:'high' },
  { id:'m2', lat:31.4, lng:34.3,  type:'air',    country:'Israel/Gaza',     description:'Active air operations Gaza Strip',   intensity:'high' },
  { id:'m3', lat:23.5, lng:121.0, type:'naval',  country:'PLA Navy',        description:'PLA naval drills near Taiwan',       intensity:'medium' },
  { id:'m4', lat:14.0, lng:43.0,  type:'naval',  country:'Houthis/US Navy', description:'Red Sea attack zone',                intensity:'high' },
  { id:'m5', lat:15.0, lng:2.0,   type:'ground', country:'Sahel (JNIM)',    description:'Jihadist insurgency operations',     intensity:'medium' },
  { id:'m6', lat:35.0, lng:36.0,  type:'air',    country:'Israel/Syria',    description:'Israeli strikes in Syrian airspace', intensity:'medium' },
  { id:'m7', lat:68.0, lng:15.0,  type:'air',    country:'Russia/NATO',     description:'Arctic surveillance flights',        intensity:'low' },
  { id:'m8', lat:12.5, lng:53.0,  type:'naval',  country:'US CENTCOM',      description:'Operation Prosperity Guardian',      intensity:'high' },
  { id:'m9', lat:40.0, lng:127.0, type:'air',    country:'DPRK',            description:'North Korea ballistic missile zone', intensity:'medium' },
];

// ─── MAIN REFRESH ─────────────────────────────────────────────────────────────
async function refreshAll() {
  console.log('[Radar] Refreshing all data sources…');
  const errors = [];

  // News
  let rawNews = [];
  for (const feed of NEWS_FEEDS) {
    const items = await fetchRSS(feed);
    rawNews.push(...items);
    if (!items.length) errors.push(`Failed: ${feed.source}`);
  }
  const gdelt = await fetchGDELT();
  rawNews.push(...gdelt);
  const seen = new Set();
  rawNews = rawNews
    .filter(n => { if (!n.title || seen.has(n.title)) return false; seen.add(n.title); return true; })
    .sort((a,b) => new Date(b.publishedAt) - new Date(a.publishedAt));

  // ACLED
  const acled = await fetchACLED();

  // Weather
  let rawWeather = [];
  for (const feed of WEATHER_FEEDS) {
    const items = await fetchRSS(feed);
    rawWeather.push(...items.filter(i => EXTREME_KW.some(kw => (i.title+i.summary).toLowerCase().includes(kw))));
  }
  // Also pull extreme weather from news feeds
  rawNews.forEach(n => {
    if (EXTREME_KW.some(kw => (n.title+n.summary).toLowerCase().includes(kw))) rawWeather.push(n);
  });
  const seenW = new Set();
  rawWeather = rawWeather
    .filter(w => { if (seenW.has(w.title)) return false; seenW.add(w.title); return true; })
    .map(w => ({ ...w, supplyImpact: weatherImpact(w.title) }))
    .slice(0, 25);

  cache.news      = rawNews.map(n => ({ ...n, industries: tagIndustries(n.title+' '+n.summary), risk: newsRisk(n.title) }));
  cache.conflicts = buildConflicts(rawNews, acled);
  cache.weather   = rawWeather;
  cache.military  = MILITARY_ZONES;
  cache.lastUpdated = new Date().toISOString();
  cache.errors    = errors;

  console.log(`[Radar] ✓ conflicts:${cache.conflicts.length} news:${cache.news.length} weather:${cache.weather.length} acled:${acled.length}`);
}

// ─── ROUTES ───────────────────────────────────────────────────────────────────
app.get('/api/health',     (req,res) => res.json({ status:'ok', lastUpdated:cache.lastUpdated, counts:{ conflicts:cache.conflicts.length, news:cache.news.length, weather:cache.weather.length }, errors:cache.errors }));
app.get('/api/industries', (req,res) => res.json(INDUSTRIES));
app.get('/api/chokepoints',(req,res) => res.json({ chokepoints: CHOKEPOINTS, lastUpdated: cache.lastUpdated }));
app.get('/api/conflicts',  (req,res) => {
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
  const { industry, limit=60 } = req.query;
  let data = cache.news;
  if (industry && industry !== 'all') data = data.filter(n => n.industries?.includes(industry));
  res.json({ news: data.slice(0, parseInt(limit)), lastUpdated: cache.lastUpdated });
});
app.get('/api/weather',           (req,res) => res.json({ weather: cache.weather, lastUpdated: cache.lastUpdated }));
app.get('/api/military-activity', (req,res) => res.json({ activities: cache.military, lastUpdated: cache.lastUpdated }));
app.post('/api/refresh', (req,res) => { refreshAll().catch(console.error); res.json({ status:'triggered' }); });

// ─── CRON every 20 min ────────────────────────────────────────────────────────
cron.schedule('*/20 * * * *', () => refreshAll().catch(console.error));

const PORT = process.env.PORT || 3001;
app.listen(PORT, async () => {
  console.log(`[Radar] Running on :${PORT}`);
  await refreshAll();
});
