const express = require('express');
const fetch   = require('node-fetch');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

// ── Keys (set as env vars on Render) ─────────────────────────────────
const GEMINI_KEY = process.env.GEMINI_KEY || 'AIzaSyAmbYYXK7USu-TqvAtrQeRxMlJuYxHUb_c';
const EIA_KEY    = process.env.EIA_KEY    || 'DEMO_KEY';

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Cache layer (avoids hammering APIs on every browser refresh) ──────
let cache = {
  diesel:  { data: null, ts: 0 },
  market:  { data: null, ts: 0 },
};
const DIESEL_TTL = 5  * 60 * 1000;   // 5 min
const MARKET_TTL = 5  * 60 * 1000;   // 5 min

// ── /api/diesel  →  EIA at-pump retail prices ─────────────────────────
app.get('/api/diesel', async (req, res) => {
  try {
    if (cache.diesel.data && Date.now() - cache.diesel.ts < DIESEL_TTL) {
      return res.json({ ...cache.diesel.data, cached: true });
    }

    const url = `https://api.eia.gov/v2/petroleum/pri/gnd/data/?api_key=${EIA_KEY}&frequency=weekly&data[0]=value&facets[product][]=EPD2D&sort[0][column]=period&sort[0][direction]=desc&length=50`;
    const r = await fetch(url, { timeout: 10000 });
    if (!r.ok) throw new Error('EIA ' + r.status);
    const json = await r.json();

    const result = { ok: true, data: json.response?.data || [], ts: new Date().toISOString() };
    cache.diesel = { data: result, ts: Date.now() };
    res.json(result);
  } catch (e) {
    console.error('EIA error:', e.message);
    res.status(502).json({ ok: false, error: e.message });
  }
});

// ── /api/market  →  Gemini + Google Search grounding ──────────────────
app.post('/api/market', async (req, res) => {
  try {
    if (cache.market.data && Date.now() - cache.market.ts < MARKET_TTL) {
      return res.json({ ...cache.market.data, cached: true });
    }

    const today = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    const prompt = `Today is ${today}. Search the web right now and return ONLY a valid JSON object — no markdown, no backticks, no explanation — with REAL current US trucking freight market data.

IMPORTANT RULES:
- All diesel prices = RETAIL AT-PUMP prices paid by truck drivers (from EIA or GasBuddy)
- Freight rates = national DAT spot rates per mile (from DAT, FreightWaves, or similar)
- News = real headlines from today or this week from FMCSA, DOT, FreightWaves, TTNews, ATA
- Return numbers as plain floats, not strings

{
  "rates": {
    "reefer":  {"current":0.00,"high":0.00,"low":0.00,"change":0.00,"loads":0,"best":"City, ST"},
    "dryvan":  {"current":0.00,"high":0.00,"low":0.00,"change":0.00,"loads":0,"best":"City, ST"},
    "flatbed": {"current":0.00,"high":0.00,"low":0.00,"change":0.00,"loads":0,"best":"City, ST"}
  },
  "heatmap": [
    {"abbr":"WA","rate":0.00},{"abbr":"OR","rate":0.00},{"abbr":"CA","rate":0.00},{"abbr":"NV","rate":0.00},{"abbr":"ID","rate":0.00},{"abbr":"MT","rate":0.00},{"abbr":"WY","rate":0.00},{"abbr":"UT","rate":0.00},{"abbr":"CO","rate":0.00},{"abbr":"AZ","rate":0.00},
    {"abbr":"ND","rate":0.00},{"abbr":"SD","rate":0.00},{"abbr":"NE","rate":0.00},{"abbr":"KS","rate":0.00},{"abbr":"OK","rate":0.00},{"abbr":"TX","rate":0.00},{"abbr":"NM","rate":0.00},{"abbr":"MN","rate":0.00},{"abbr":"IA","rate":0.00},{"abbr":"MO","rate":0.00},
    {"abbr":"WI","rate":0.00},{"abbr":"IL","rate":0.00},{"abbr":"IN","rate":0.00},{"abbr":"MI","rate":0.00},{"abbr":"OH","rate":0.00},{"abbr":"KY","rate":0.00},{"abbr":"TN","rate":0.00},{"abbr":"AR","rate":0.00},{"abbr":"LA","rate":0.00},{"abbr":"MS","rate":0.00},
    {"abbr":"AL","rate":0.00},{"abbr":"GA","rate":0.00},{"abbr":"FL","rate":0.00},{"abbr":"SC","rate":0.00},{"abbr":"NC","rate":0.00},{"abbr":"VA","rate":0.00},{"abbr":"WV","rate":0.00},{"abbr":"PA","rate":0.00},{"abbr":"NY","rate":0.00},{"abbr":"NJ","rate":0.00},
    {"abbr":"ME","rate":0.00},{"abbr":"NH","rate":0.00},{"abbr":"VT","rate":0.00},{"abbr":"MA","rate":0.00},{"abbr":"RI","rate":0.00},{"abbr":"CT","rate":0.00},{"abbr":"DE","rate":0.00},{"abbr":"MD","rate":0.00},{"abbr":"DC","rate":0.00},{"abbr":"AK","rate":0.00}
  ],
  "news": [
    {"source":"BREAKING","type":"breaking","headline":"real headline here","time":"X min ago"},
    {"source":"FMCSA","type":"fmcsa","headline":"real headline","time":"X min ago"},
    {"source":"DOT","type":"dot","headline":"real headline","time":"X hr ago"},
    {"source":"MARKET","type":"market","headline":"real headline","time":"X hr ago"},
    {"source":"ATA","type":"ata","headline":"real headline","time":"X hr ago"},
    {"source":"FMCSA","type":"fmcsa","headline":"real headline","time":"X hr ago"},
    {"source":"DOT","type":"dot","headline":"real headline","time":"X hr ago"},
    {"source":"MARKET","type":"market","headline":"real headline","time":"X hr ago"}
  ],
  "stats": {
    "natAvgDiesel":  0.000,
    "totalLoads":    0,
    "tlRatio":       0.0,
    "fuelSurcharge": 0.0
  }
}`;

    const geminiResp = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          tools:    [{ googleSearch: {} }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
        }),
        timeout: 30000
      }
    );

    if (!geminiResp.ok) {
      const err = await geminiResp.json();
      throw new Error(err.error?.message || 'Gemini ' + geminiResp.status);
    }

    const geminiData = await geminiResp.json();
    const text = geminiData.candidates?.[0]?.content?.parts
      ?.map(p => p.text || '').join('') || '';

    // Extract JSON — strip any markdown fences just in case
    const clean = text.replace(/```json|```/g, '').trim();
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in Gemini response');

    const parsed = JSON.parse(jsonMatch[0]);
    const result = { ok: true, ...parsed, ts: new Date().toISOString() };
    cache.market = { data: result, ts: Date.now() };
    res.json(result);

  } catch (e) {
    console.error('Gemini error:', e.message);
    res.status(502).json({ ok: false, error: e.message });
  }
});

// ── Health check ──────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ ok: true, ts: new Date().toISOString() }));

app.listen(PORT, () => console.log(`FreightPulse server running on port ${PORT}`));
