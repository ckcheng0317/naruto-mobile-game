import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const OUTREACH_SYSTEM_PROMPT = `You are a conversion-focused copywriter for a solo game UI developer.
You write outreach messages that feel personal, human, and genuinely helpful — never spammy.

The sender is a solo developer who:
- Built a complete Naruto-themed mobile game UI in days using AI tools
- Can deliver polished game UI in 48-72 hours
- Charges $500-$3,000 depending on scope
- Genuinely loves indie game development
- Portfolio: a live Naruto mobile game UI demo

Key rules for outreach:
1. Lead with genuine observation about THEIR project, not a sales pitch
2. Keep under 100 words for cold outreach (under 150 for warm)
3. One clear call-to-action (usually: "Can I send you a demo?")
4. Sound like a developer, not a marketer
5. Mention the specific game type or visual style they're going for
6. NEVER say "I noticed you're looking for..." or "I came across your profile"
7. Use lowercase for casual platforms (Discord, Twitter), proper capitalization for email`;

async function generateOutreach(lead, strategy = null) {
  console.log(`\n✉️  Generating outreach for: ${lead.name}\n`);

  const contextBlock = strategy
    ? `Conversion strategy: ${JSON.stringify(strategy, null, 2)}`
    : "";

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 3000,
    thinking: { type: "adaptive" },
    system: OUTREACH_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Write outreach messages for this lead:

Lead: ${JSON.stringify(lead, null, 2)}
${contextBlock}

Create a JSON object with 3 outreach variants:
{
  "platform": "${lead.platform}",
  "leadName": "${lead.name}",
  "variant_a": {
    "type": "direct_value",
    "subject": "email subject line (if email platform)",
    "message": "the message text",
    "callToAction": "specific CTA used",
    "tone": "casual|professional|enthusiastic"
  },
  "variant_b": {
    "type": "curiosity",
    "subject": "email subject line (if email platform)",
    "message": "the message text",
    "callToAction": "specific CTA used",
    "tone": "casual|professional|enthusiastic"
  },
  "variant_c": {
    "type": "social_proof",
    "subject": "email subject line (if email platform)",
    "message": "the message text",
    "callToAction": "specific CTA used",
    "tone": "casual|professional|enthusiastic"
  },
  "recommended": "a|b|c",
  "bestTime": "when to send (day/time context)",
  "followUp": {
    "day3": "follow-up message text",
    "day7": "second follow-up text"
  }
}

Portfolio to reference: Live Naruto mobile game UI with character cards, battle HUD, chakra systems, gacha shop, clan social hub. Demo available at GitHub Pages.

Return ONLY valid JSON.`,
      },
    ],
  });

  let outreachJson = "";
  for (const block of response.content) {
    if (block.type === "text") outreachJson += block.text;
  }

  outreachJson = outreachJson.trim();
  if (outreachJson.startsWith("```")) {
    outreachJson = outreachJson.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
  }

  const outreach = JSON.parse(outreachJson);

  const rec = outreach[`variant_${outreach.recommended}`];
  console.log(`✅ Generated 3 outreach variants. Recommended: Variant ${outreach.recommended.toUpperCase()}`);
  console.log(`\nMessage preview:\n${rec.message.substring(0, 200)}...\n`);

  return outreach;
}

async function generateBatchOutreach(count = 5) {
  const dataPath = join(ROOT, "business/leads.json");
  const data = JSON.parse(readFileSync(dataPath, "utf8"));

  const hotLeads = data.leads
    .filter((l) => l.priority === "hot" && !l.outreachSent)
    .slice(0, count);

  if (hotLeads.length === 0) {
    console.log("No hot leads without outreach found. Run lead-generator.js first.");
    return [];
  }

  console.log(`\n📧 Generating outreach for ${hotLeads.length} hot leads...\n`);

  const results = [];
  for (const lead of hotLeads) {
    try {
      const outreach = await generateOutreach(lead);
      results.push({ lead, outreach });

      lead.outreachGenerated = outreach;
      lead.outreachGeneratedAt = new Date().toISOString();
      lead.status = "outreach_ready";
    } catch (err) {
      console.error(`Failed for ${lead.name}:`, err.message);
    }
  }

  writeFileSync(dataPath, JSON.stringify(data, null, 2));
  console.log(`\n✅ Outreach generated for ${results.length} leads and saved.\n`);

  return results;
}

async function generateEmailSequence(lead, projectType) {
  console.log(`\n📋 Generating full email sequence for: ${lead.name}\n`);

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system: OUTREACH_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Create a 5-email nurture sequence for a lead who expressed interest but hasn't committed yet.

Lead: ${lead.name} - making a ${lead.gameType || projectType} game
Their stage: ${lead.currentStage || "early development"}
Their pain: ${lead.painPoint || "needs better UI"}

Sequence JSON format:
{
  "sequenceName": "descriptive name",
  "emails": [
    {
      "day": 0,
      "subject": "subject line",
      "body": "full email body",
      "goal": "what this email achieves"
    }
  ]
}

Day 0: Send portfolio demo link + specific observation about their game
Day 2: Share a relevant case study or before/after UI comparison concept
Day 5: Free mini-value (quick UI tip specific to their game type)
Day 10: Limited-time offer or urgency angle
Day 15: Break-up email (last attempt, no hard feelings)

Return ONLY valid JSON.`,
      },
    ],
  });

  let seqJson = "";
  for (const block of response.content) {
    if (block.type === "text") seqJson += block.text;
  }

  seqJson = seqJson.trim();
  if (seqJson.startsWith("```")) {
    seqJson = seqJson.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
  }

  return JSON.parse(seqJson);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const mode = args[0] || "batch";

  if (mode === "batch") {
    generateBatchOutreach(5).catch(console.error);
  } else if (mode === "single") {
    const testLead = {
      name: "PixelDragon Studios",
      platform: "Twitter/X",
      gameType: "anime action RPG",
      currentStage: "prototype",
      painPoint: "ugly placeholder UI blocking their demo reel",
      estimatedBudget: "mid ($800-2000)",
      priority: "hot",
    };
    generateOutreach(testLead).catch(console.error);
  }
}

export { generateOutreach, generateBatchOutreach, generateEmailSequence };
