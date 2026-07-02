# Test results

Two rounds of testing against the Contentstack Digital Concierge agent
(`cs019f084cd4d97000af9910cba84d6b8e`, region `AZURE_EU`), both using the
Italian prompt **"Voglio Vedere dei divani in pelle"** ("I want to see leather
sofas").

| File | What it is |
|------|-----------|
| `raw_api_100_calls.xlsx` / `.json` | **100 calls** made directly to the `/execute` endpoint (raw HTTP + SSE parsing), each with a fresh thread id. |
| `sdk_streamtext_50_calls.xlsx` / `.json` | **50 calls** made through `@contentstack/agents-sdk` using `streamText()`. |

## Summary

### Raw API — 100 calls
- ✅ **100 / 100 success**, 0 errors, 0 timeouts.
- Every call returned the product **"Skin Sofa"** (99× uid `cs019f08640a…413f`,
  1× a different uid for the same product name).
- **0 non-sofa** recommendations.
- Response time: avg ~9.6s.

### SDK `streamText` — 50 calls
- ✅ **50 / 50 success**, 0 errors, 0 timeouts — SDK verified working.
- Streaming confirmed every run (94–246 text deltas per call).
- Returned **1–5 sofas per call** (mostly 3–4); 9 distinct sofa products
  surfaced (Skin, Emile, Albert, Augusto, LUCIO Indoor, Surf, Marteen).
- Response time: min 7.3s · avg 11.0s · max 30.5s.
- The only name without the word "sofa" was **"Lido"** (a sofa product named
  after its collection); every `ui_message` referred exclusively to sofas.

Both rounds stayed 100% on-topic (leather sofas) — no other product category
ever appeared.
