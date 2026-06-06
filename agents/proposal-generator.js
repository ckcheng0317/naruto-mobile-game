import Anthropic from "@anthropic-ai/sdk";
import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const PROPOSAL_SYSTEM_PROMPT = `You are a senior game UI developer writing project proposals.
You create winning proposals that convert clients and protect the developer's time.

Agency profile:
- Solo developer with AI-assisted workflow
- Specializes in mobile game UI (HTML5/CSS3/JS)
- Portfolio: Naruto-themed mobile game UI demo
- Turnaround: 48-72 hours for basic, 5-7 days for standard, 2 weeks for premium
- Pricing: $500-$3,000 USD

Proposal principles:
1. Show you understand THEIR game's vision, not just generic UI
2. Break scope into clear milestones with payment gates
3. Include specific deliverables (number of screens, file formats)
4. Offer a small risk-free entry point (paid discovery call OR $200 pilot screen)
5. Protect yourself: 50% upfront, clear revision limits, IP transfer on final payment
6. Always include a "Quick Win" option at lower price to reduce friction`;

async function generateProposal(clientInfo) {
  console.log(`\n📄 Generating proposal for: ${clientInfo.clientName}\n`);

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 6000,
    thinking: { type: "adaptive" },
    system: PROPOSAL_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Generate a complete project proposal for this client:

Client Information:
${JSON.stringify(clientInfo, null, 2)}

Create a comprehensive proposal as a JSON object:
{
  "proposalId": "PROP-${Date.now()}",
  "clientName": "client name",
  "projectTitle": "specific project name",
  "executiveSummary": "2-3 sentence overview of what you'll deliver and why it matters for their game",

  "packages": [
    {
      "name": "Quick Win",
      "price": 499,
      "deliveryDays": 3,
      "description": "what's included",
      "screens": 3,
      "revisions": 1,
      "bestFor": "clients who want to test quality first"
    },
    {
      "name": "Standard",
      "price": 1299,
      "deliveryDays": 7,
      "description": "what's included",
      "screens": 7,
      "revisions": 2,
      "bestFor": "most clients"
    },
    {
      "name": "Premium",
      "price": 2499,
      "deliveryDays": 14,
      "description": "what's included",
      "screens": 12,
      "revisions": 3,
      "bestFor": "studios needing a complete UI system"
    }
  ],
  "recommended": "Standard",

  "deliverables": {
    "quick_win": ["list of specific deliverables"],
    "standard": ["list of specific deliverables"],
    "premium": ["list of specific deliverables"]
  },

  "milestones": [
    { "phase": "Phase 1", "description": "what gets done", "days": 2, "payment": "50% upfront" },
    { "phase": "Phase 2", "description": "what gets done", "days": 5, "payment": "25% on approval" },
    { "phase": "Phase 3", "description": "final delivery", "days": 7, "payment": "25% on delivery" }
  ],

  "terms": {
    "payment": "50% upfront, 50% on delivery",
    "revisions": "2 rounds included, additional at $75/hr",
    "ipTransfer": "Full IP transfer upon final payment",
    "sourcFiles": "All source files (HTML/CSS/JS) included",
    "timeline": "Starts within 24h of deposit",
    "outOfScope": ["list of things NOT included"]
  },

  "whyUs": {
    "speedAdvantage": "explanation of AI-assisted workflow speed",
    "portfolioEvidence": "specific Naruto UI elements that prove capability for their game type",
    "riskMitigation": "how to reduce their risk"
  },

  "callToAction": "Specific next step to close the deal",
  "expiresIn": "72 hours",

  "fullProposalText": "A complete human-readable proposal text formatted with markdown, including all sections above in a compelling narrative format. Should be 400-600 words."
}

Return ONLY valid JSON.`,
      },
    ],
  });

  let proposalJson = "";
  for (const block of response.content) {
    if (block.type === "text") proposalJson += block.text;
  }

  proposalJson = proposalJson.trim();
  if (proposalJson.startsWith("```")) {
    proposalJson = proposalJson.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
  }

  const proposal = JSON.parse(proposalJson);

  const proposalsDir = join(ROOT, "business/proposals");
  const { mkdirSync } = await import("fs");
  mkdirSync(proposalsDir, { recursive: true });

  const filename = `${proposal.proposalId}-${clientInfo.clientName.replace(/\s+/g, "-")}.json`;
  writeFileSync(join(proposalsDir, filename), JSON.stringify(proposal, null, 2));

  const projectsPath = join(ROOT, "business/projects.json");
  const projects = JSON.parse(readFileSync(projectsPath, "utf8"));

  projects.projects.push({
    id: proposal.proposalId,
    clientName: clientInfo.clientName,
    status: "proposal_sent",
    proposalFile: filename,
    recommendedPackage: proposal.recommended,
    recommendedPrice: proposal.packages.find((p) => p.name === proposal.recommended)?.price,
    createdAt: new Date().toISOString(),
  });
  projects.totalProjects = projects.projects.length;
  projects.lastUpdated = new Date().toISOString();

  writeFileSync(projectsPath, JSON.stringify(projects, null, 2));

  console.log(`\n✅ Proposal generated: ${filename}`);
  console.log(`   Recommended package: ${proposal.recommended}`);
  const rec = proposal.packages.find((p) => p.name === proposal.recommended);
  console.log(`   Price: $${rec?.price} | Delivery: ${rec?.deliveryDays} days`);
  console.log(`\n📋 Executive Summary:\n${proposal.executiveSummary}\n`);

  return proposal;
}

async function generateContractFromProposal(proposal, selectedPackage) {
  console.log(`\n📝 Generating contract for: ${proposal.clientName} - ${selectedPackage}\n`);

  const pkg = proposal.packages.find((p) => p.name === selectedPackage);
  if (!pkg) throw new Error(`Package "${selectedPackage}" not found in proposal`);

  const response = await client.messages.create({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system: PROPOSAL_SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `Generate a simple but legally sound freelance contract for:

Client: ${proposal.clientName}
Package: ${selectedPackage}
Price: $${pkg.price}
Delivery: ${pkg.deliveryDays} days
Project: ${proposal.projectTitle}

Create a JSON with:
{
  "contractTitle": "Service Agreement",
  "parties": { "provider": "...", "client": "..." },
  "scope": "detailed scope statement",
  "deliverables": ["list"],
  "timeline": "start and end dates from today",
  "payment": { "total": amount, "deposit": amount, "final": amount, "dueDate": "..." },
  "revisions": "policy",
  "ipClause": "IP transfer terms",
  "terminationClause": "cancellation terms",
  "disputeResolution": "how disputes are handled",
  "fullContractText": "Complete contract text in plain English, ready to copy-paste into DocuSign or email"
}

Return ONLY valid JSON.`,
      },
    ],
  });

  let contractJson = "";
  for (const block of response.content) {
    if (block.type === "text") contractJson += block.text;
  }

  contractJson = contractJson.trim();
  if (contractJson.startsWith("```")) {
    contractJson = contractJson.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
  }

  const contract = JSON.parse(contractJson);

  const contractsDir = join(ROOT, "business/contracts");
  const { mkdirSync } = await import("fs");
  mkdirSync(contractsDir, { recursive: true });

  const filename = `contract-${proposal.proposalId}-${Date.now()}.json`;
  writeFileSync(join(contractsDir, filename), JSON.stringify(contract, null, 2));

  console.log(`✅ Contract generated: ${filename}`);
  return contract;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const testClient = {
    clientName: "ShadowByte Games",
    gameType: "Mobile anime RPG",
    currentStage: "Alpha — gameplay done, needs UI polish",
    specificNeeds: "Battle HUD, inventory system, character select screen",
    deadline: "3 weeks",
    budget: "~$1,500",
    platform: "iOS and Android (HTML5 wrapper)",
    aestheticReference: "Dark souls meets anime — dark theme with golden accents",
    contactEmail: "dev@shadowbyte.io",
  };

  generateProposal(testClient).catch(console.error);
}

export { generateProposal, generateContractFromProposal };
