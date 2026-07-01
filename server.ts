/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini Client safely
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey && apiKey !== "MY_GEMINI_API_KEY") {
  try {
    ai = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    console.log("Successfully initialized Gemini AI client.");
  } catch (err) {
    console.error("Failed to initialize Gemini AI client:", err);
  }
} else {
  console.log("No valid GEMINI_API_KEY found. Utilizing high-fidelity local AI rule-engine simulator for decisions and narration.");
}

// Robust Exponential Backoff Utility for throttling and 429 prevention
async function callGeminiWithRetry<T>(
  fn: () => Promise<T>,
  retries = 5,
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (err: any) {
    const isRateLimit = err?.status === 429 || 
                        err?.statusCode === 429 || 
                        (err?.message && err.message.includes("429")) || 
                        (err?.message && err.message.includes("Too Many Requests"));
    
    if (retries > 0 && (isRateLimit || err?.status >= 500 || !err?.status)) {
      console.warn(`Gemini API throttled (status 429 or network error). Retrying in ${delay}ms... (Attempts remaining: ${retries})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return callGeminiWithRetry(fn, retries - 1, delay * 2);
    }
    throw err;
  }
}

// --------------------------------------------------------
// Local AI Simulation Engine (Mocks for Fallback / Sandbox)
// --------------------------------------------------------
const MOCK_STRATEGIES = ["EXPAND", "TALL_TECH", "MILITARY_RUSH", "DEFENSIVE_TURTLE", "DIPLOMACY_TRADE"];
const MOCK_THEMES = ["ECONOMY", "SCIENCE", "MILITARY_LAND", "MILITARY_NAVAL", "INFRASTRUCTURE"];
const MOCK_EXPLORATION = ["RESOURCE_RICH_AREAS", "COASTLINES", "ENEMY_BORDERS", "INLAND_GAPS"];
const MOCK_CITY_ROLES = ["CORE_GROWTH", "INDUSTRIAL_HUB", "SCIENCE_CENTER", "FORTRESS_BORDER", "NAVAL_PORT"];
const MOCK_POSTURES = ["ALLY", "FRIENDLY", "NEUTRAL", "RIVAL", "TARGET"];
const MOCK_WAR_PLANS = ["BLITZ_CAPTURE_CAPITAL", "SIEGE_BORDER_CITIES", "RAID_ECONOMY", "DEFEND_AND_COUNTER", "FORCED_PEACE", "NONE"];

function generateMockDecisions(gameState: any): any {
  const { turn, civs, cities } = gameState;
  
  // Create randomized decisions heavily influenced by current actual game state
  const updatedCivs = civs.map((civ: any) => {
    const isAtWar = civs.some((other: any) => other.id !== civ.id && civ.warPlans?.[other.id] && civ.warPlans?.[other.id] !== "NONE");
    
    // Choose grand strategy
    let grandStrategy = civ.grandStrategy || "EXPAND";
    if (turn > 5 && Math.random() < 0.25) {
      if (isAtWar) {
        grandStrategy = Math.random() < 0.6 ? "MILITARY_RUSH" : "DEFENSIVE_TURTLE";
      } else {
        grandStrategy = MOCK_STRATEGIES[Math.floor(Math.random() * MOCK_STRATEGIES.length)];
      }
    }

    // Choose research theme
    let researchTheme = civ.researchTheme || "SCIENCE";
    if (Math.random() < 0.2) {
      if (grandStrategy === "MILITARY_RUSH") researchTheme = "MILITARY_LAND";
      else if (grandStrategy === "TALL_TECH") researchTheme = "SCIENCE";
      else researchTheme = MOCK_THEMES[Math.floor(Math.random() * MOCK_THEMES.length)];
    }

    // Map city roles
    const cityRoles: Record<string, string> = {};
    cities
      .filter((city: any) => city.ownerId === civ.id)
      .forEach((city: any, idx: number) => {
        if (idx === 0) cityRoles[city.name] = "CORE_GROWTH";
        else if (city.isUnderSiege) cityRoles[city.name] = "FORTRESS_BORDER";
        else cityRoles[city.name] = MOCK_CITY_ROLES[Math.floor(Math.random() * MOCK_CITY_ROLES.length)];
      });

    // Diplomatic postures & War plans
    const diplomaticPostures: Record<string, string> = {};
    const warPlans: Record<string, string> = {};

    civs.forEach((other: any) => {
      if (other.id === civ.id) return;
      
      // Posture
      let currentPosture = civ.diplomaticPostures?.[other.id] || "NEUTRAL";
      if (Math.random() < 0.15) {
        if (civ.score > other.score * 1.5) {
          currentPosture = Math.random() < 0.5 ? "TARGET" : "RIVAL";
        } else {
          currentPosture = MOCK_POSTURES[Math.floor(Math.random() * MOCK_POSTURES.length)];
        }
      }
      diplomaticPostures[other.id] = currentPosture;

      // War plans
      if (currentPosture === "TARGET") {
        warPlans[other.id] = Math.random() < 0.5 ? "BLITZ_CAPTURE_CAPITAL" : "SIEGE_BORDER_CITIES";
      } else if (currentPosture === "ALLY" || currentPosture === "FRIENDLY") {
        warPlans[other.id] = "NONE";
      } else {
        warPlans[other.id] = Math.random() < 0.2 ? "DEFEND_AND_COUNTER" : "NONE";
      }
    });

    return {
      id: civ.id,
      grandStrategy,
      researchTheme,
      explorationFocus: civ.explorationFocus || MOCK_EXPLORATION[Math.floor(Math.random() * MOCK_EXPLORATION.length)],
      cityRoles,
      diplomaticPostures,
      warPlans
    };
  });

  // Construct dynamic narratives
  const activeCivNames = civs.filter((c: any) => !c.isDead).map((c: any) => c.name);
  let headline = `ERA OF STEADY EXPANSION CONTRASTS REGIONAL RIVALRIES`;
  let summary = `The active civilizations (${activeCivNames.join(", ")}) concentrate on establishing basic border walls and securing nearby fertile hexes. No major global crises are reported.`;
  
  // Highlight an ongoing war
  const warPairs: string[] = [];
  civs.forEach((c: any) => {
    civs.forEach((o: any) => {
      if (c.id !== o.id && !c.isDead && !o.isDead) {
        if (c.warPlans?.[o.id] && c.warPlans?.[o.id] !== "NONE") {
          warPairs.push(`${c.name} vs ${o.name}`);
        }
      }
    });
  });

  if (warPairs.length > 0) {
    headline = `Borders Bleed as Major Conflicts Errupt across the Frontier!`;
    summary = `Tensions break into open declarations. The clashing armies of ${warPairs[0]} are mobilizing heavy infantry, and spectators gather at the high-ground fortifications to watch the siege unfold.`;
  } else if (turn > 20) {
    headline = `GREAT TECH RUSH INITIATES SCIENTIFIC RECAPS`;
    summary = `Factions have begun securing heavy research universities. In-house scholars predict a scientific breakthrough that will unlock naval sailing and long-range archers.`;
  }

  return {
    civs: updatedCivs,
    worldNarrator: {
      headline,
      summary,
      optionalGlobalEvent: Math.random() < 0.1 ? ["BARBARIAN_INCIDENT", "GOLDEN_AGE", "RESOURCE_BOOM"][Math.floor(Math.random() * 3)] : "NONE"
    }
  };
}


// --------------------------------------------------------
// API endpoints
// --------------------------------------------------------

// Handles full strategic decisions & narration in one batched call to save token overhead
app.post("/api/gemini/decide", async (req, res) => {
  const gameState = req.body;
  if (!gameState) {
    return res.status(400).json({ error: "Missing game state payload" });
  }

  // If Gemini client is not initialized, fallback seamlessly to local mock rules
  if (!ai) {
    const mockResponse = generateMockDecisions(gameState);
    return res.json(mockResponse);
  }

  try {
    const formattedCivs = gameState.civs.map((c: any) => {
      // Find neighbors who have cities close to this civ (e.g. within 6 tiles)
      const thisCivCities = gameState.cities.filter((ci: any) => ci.ownerId === c.id);
      const neighborRelations = gameState.civs
        .filter((other: any) => other.id !== c.id)
        .map((other: any) => {
          const otherCities = gameState.cities.filter((ci: any) => ci.ownerId === other.id);
          let minDistance = 999;
          thisCivCities.forEach((tc: any) => {
            otherCities.forEach((oc: any) => {
              const dist = Math.max(Math.abs(tc.x - oc.x), Math.abs(tc.y - oc.y));
              if (dist < minDistance) minDistance = dist;
            });
          });
          const militaryStrengthRatio = (gameState.units.filter((u: any) => u.ownerId === c.id).length + 1) / 
                                        (gameState.units.filter((u: any) => u.ownerId === other.id).length + 1);

          return {
            civId: other.id,
            name: other.name,
            closestCityDistance: minDistance === 999 ? "Undiscovered / Far" : minDistance,
            militaryBalanceRatio: militaryStrengthRatio.toFixed(2), // > 1 means c is stronger
            pastPosture: c.diplomaticPostures?.[other.id] || "NEUTRAL",
            currentWarState: c.warPlans?.[other.id] && c.warPlans?.[other.id] !== "NONE" ? "AT_WAR" : "PEACE"
          };
        });

      return {
        id: c.id,
        name: c.name,
        leader: c.leader,
        gold: c.gold,
        science: c.science,
        score: c.score,
        isDead: c.isDead,
        grandStrategy: c.grandStrategy,
        researchTheme: c.researchTheme,
        researchedTechs: c.researchedTechs,
        citiesCount: thisCivCities.length,
        unitsCount: gameState.units.filter((u: any) => u.ownerId === c.id).length,
        neighborRelations
      };
    });

    const formattedCities = gameState.cities.map((ci: any) => ({
      name: ci.name,
      ownerId: ci.ownerId,
      population: ci.population,
      role: ci.role,
      isUnderSiege: ci.isUnderSiege,
    }));

    const prompt = `
Analyze the current state of our Freeciv-style 4X strategy spectator simulation game.
Turn Number: ${gameState.turn}

Civilizations status with military and neighbor contact info:
${JSON.stringify(formattedCivs, null, 2)}

Active Cities on map:
${JSON.stringify(formattedCities, null, 2)}

Task:
Generate a refined strategic posture, research direction, city roles, and diplomatic stance for each active civilization.
Also, provide an overarching "worldNarrator" commentary written like an enthusiastic sports commentator at an ancient world championship!

IMPORTANT NARRATIVE GUIDELINES:
Our arena interface features real-time UI components that you should directly reference in your sports commentary to connect with what the spectator sees on screen:
1. Turn Phase Stepper: We visualize four phases in sequence ('Research', 'City Growth', 'Unit Movement', 'Diplomacy'). Mention these as the action shifts (e.g., "As the simulation moves into the Diplomacy phase...").
2. On-Map Capital Banners: Capitals fly stance badges (Green handshake for ALLY, Red swords for war/RIVAL). Reference these flags flying over capitals!
3. Economic Floating Overlays: When cities harvest resources, "+G" (Gold, yellow) or "+S" (Science, purple/violet) icons float above them. Describe these gold/science sparks rising from the cities as they boom!
4. Active War Fronts: We summarize active fronts (e.g. "Northern Front", "Southern Border Front") showing total units committed on each side. Refer to these fronts and frontlines explicitly!

Few-Shot Examples of Strategic, Diplomatic & Narrative Logic:

Example 1 (Peaceful Expansion with Economic Boom):
Civ Rome has high gold/science, distance to Han is 12 (far), distance to Viking is 15.
Logically: Rome has plenty of space and should focus on expansion and economy rather than rush wars.
Response extract:
{
  "civs": [
    {
      "id": "rome",
      "grandStrategy": "EXPAND",
      "researchTheme": "ECONOMY",
      "explorationFocus": "RESOURCE_RICH_AREAS",
      "cityRoles": { "Rome": "CORE_GROWTH" },
      "diplomaticPostures": { "han": "FRIENDLY", "viking": "NEUTRAL" },
      "warPlans": { "han": "NONE", "viking": "NONE" }
    }
  ],
  "worldNarrator": {
    "headline": "GOLD SPARKS RISE OVER ROME IN GREAT RECONSTRUCTION ERA!",
    "summary": "As we transition from the City Growth phase, golden '+G' overlays are erupting above Rome! Their peaceful posture towards the Han Empire is cemented by a green handshake badge on the capital.",
    "optionalGlobalEvent": "GOLDEN_AGE"
  }
}

Example 2 (Military Aggression and Border Clash):
Viking is close to Rome (distance: 3 hexes). Viking score is 45, Rome is 38. Viking militaryBalanceRatio is 2.50 (Viking is way stronger).
Logically: Viking Clans see Rome as an easy target right on their border! They will declare war.
Response extract:
{
  "civs": [
    {
      "id": "viking",
      "grandStrategy": "MILITARY_RUSH",
      "researchTheme": "MILITARY_LAND",
      "explorationFocus": "ENEMY_BORDERS",
      "cityRoles": { "Nidaros": "INDUSTRIAL_HUB" },
      "diplomaticPostures": { "rome": "TARGET", "han": "NEUTRAL" },
      "warPlans": { "rome": "BLITZ_CAPTURE_CAPITAL", "han": "NONE" }
    }
  ],
  "worldNarrator": {
    "headline": "RED WAR BANNERS RAISED! VIKINGS MARCH ON ROMAN BORDER FRONTIER!",
    "summary": "The Unit Movement phase explodes! Red swords clash above Nidaros as the Viking longships set sail. Spectators are witnessing heavy defensive sieges as Roman shields brace on the Southern Border front!",
    "optionalGlobalEvent": "BARBARIAN_INCIDENT"
  }
}

Ensure your response conforms strictly to this JSON format (do not return any markdown codeblocks or extra text besides the JSON itself):
{
  "civs": [
    {
      "id": "rome",
      "grandStrategy": "EXPAND | TALL_TECH | MILITARY_RUSH | DEFENSIVE_TURTLE | DIPLOMACY_TRADE",
      "researchTheme": "ECONOMY | SCIENCE | MILITARY_LAND | MILITARY_NAVAL | INFRASTRUCTURE",
      "explorationFocus": "RESOURCE_RICH_AREAS | COASTLINES | ENEMY_BORDERS | INLAND_GAPS",
      "cityRoles": {
        "Rome": "CORE_GROWTH | INDUSTRIAL_HUB | SCIENCE_CENTER | FORTRESS_BORDER | NAVAL_PORT"
      },
      "diplomaticPostures": {
        "han": "ALLY | FRIENDLY | NEUTRAL | RIVAL | TARGET"
      },
      "warPlans": {
        "han": "BLITZ_CAPTURE_CAPITAL | SIEGE_BORDER_CITIES | RAID_ECONOMY | DEFEND_AND_COUNTER | FORCED_PEACE | NONE"
      }
    }
  ],
  "worldNarrator": {
    "headline": "A short, engaging, capitalized sports-style headline",
    "summary": "1 to 2 sentences of descriptive storytelling in sports terms (alliances, trade offers, betrayal, battles, city falls, or gold booms).",
    "optionalGlobalEvent": "BARBARIAN_INCIDENT | GOLDEN_AGE | RESOURCE_BOOM | NONE"
  }
}

Rules of Diplomacy & War:
1. "grandStrategy", "researchTheme", "explorationFocus", "cityRoles", "diplomaticPostures" and "warPlans" must use the exact string values specified.
2. If diplomaticPosture toward another civ is "TARGET", a warPlan OTHER than "NONE" must be chosen (e.g. "BLITZ_CAPTURE_CAPITAL").
3. If they are in "ALLY" or "FRIENDLY" posture, warPlans must be "NONE".
4. If a civ was previously AT_WAR but now has "FORCED_PEACE" or diplomaticPosture "FRIENDLY", a peace treaty is being offered.
5. Create extremely dramatic, entertaining narration reflecting these stances!
`;

    // Always use ai.models.generateContent and process.env.GEMINI_API_KEY with exponential backoff
    const response = await callGeminiWithRetry(() => ai!.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            civs: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  grandStrategy: { type: Type.STRING },
                  researchTheme: { type: Type.STRING },
                  explorationFocus: { type: Type.STRING },
                  cityRoles: {
                    type: Type.OBJECT,
                    description: "Key-value pair mapping city names to CityRole labels",
                  },
                  diplomaticPostures: {
                    type: Type.OBJECT,
                    description: "Key-value pair mapping opponent civ IDs to DiplomaticPosture labels",
                  },
                  warPlans: {
                    type: Type.OBJECT,
                    description: "Key-value pair mapping opponent civ IDs to WarPlan labels",
                  },
                },
                required: ["id", "grandStrategy", "researchTheme", "explorationFocus", "cityRoles", "diplomaticPostures", "warPlans"],
              },
            },
            worldNarrator: {
              type: Type.OBJECT,
              properties: {
                headline: { type: Type.STRING },
                summary: { type: Type.STRING },
                optionalGlobalEvent: { type: Type.STRING },
              },
              required: ["headline", "summary", "optionalGlobalEvent"],
            },
          },
          required: ["civs", "worldNarrator"],
        },
      },
    }));

    const text = response.text;
    if (text) {
      const parsed = JSON.parse(text);
      return res.json(parsed);
    } else {
      throw new Error("Empty text response from Gemini");
    }
  } catch (err) {
    console.warn("Gemini API call failed, falling back to local simulation:", err);
    const mockResponse = generateMockDecisions(gameState);
    return res.json(mockResponse);
  }
});

// --------------------------------------------------------
// Interactive AI Advisor Oracle & Portraits
// --------------------------------------------------------

app.post("/api/gemini/advisor-chat", async (req, res) => {
  const { gameState, civId, message } = req.body;
  if (!civId || !message) {
    return res.status(400).json({ error: "Missing civId or message" });
  }

  const civ = gameState?.civs?.find((c: any) => c.id === civId);
  if (!civ) {
    return res.status(404).json({ error: "Civilization not found" });
  }

  // Define personas and leaders
  const personas: Record<string, { leader: string; title: string; tone: string; focus: string }> = {
    rome: {
      leader: "Julius Caesar",
      title: "Imperator of Rome",
      tone: "majestically strategic, ambitious, and authoritative. Speak with classical Roman grandeur, occasionally referencing the power of legions, order, and roads.",
      focus: "expanding borders, building fortresses, researching engineering, and conquering rivals."
    },
    han: {
      leader: "Emperor Wu",
      title: "Heavenly Ruler of Han",
      tone: "highly composed, scholarly, philosophical, and diplomatic. Speak with ancient Confucian wisdom, focusing on internal prosperity, writing, and currency.",
      focus: "boosting science and economy, establishing markets, and maintaining secure neutral boundaries."
    },
    maya: {
      leader: "Pacal the Great",
      title: "Ahau of Palenque",
      tone: "visionary, spiritual, deeply observant of the heavens and calendar cycles. Speak with poetic and mystical focus on irrigation, massive temple engineering, and divine destiny.",
      focus: "advanced architectural engineering, irrigation, philosophy, and stargazing."
    },
    viking: {
      leader: "Ragnar Lodbrok",
      title: "Saga-King of the North",
      tone: "bold, adventure-seeking, raw, and aggressive. Speak with a boisterous warrior spirit, referencing sailing, longships, bronze weapons, and epic raids.",
      focus: "coastal exploration, naval dominance, training iron-armed warriors, and raiding coastal targets."
    }
  };

  const persona = personas[civId] || {
    leader: civ.leader,
    title: "Grand Advisor",
    tone: "professional, strategic, and concise.",
    focus: "success and victory."
  };

  // Compile full live game context
  const liveCities = gameState?.cities?.filter((c: any) => c.ownerId === civId) || [];
  const liveUnits = gameState?.units?.filter((u: any) => u.ownerId === civId) || [];
  const otherCivs = gameState?.civs?.filter((c: any) => c.id !== civId && !c.isDead) || [];

  const contextPrompt = `
You are roleplaying as ${persona.leader}, the ${persona.title} in a high-fidelity Freeciv-style strategy spectator simulation.
Your personality is ${persona.tone}.
Your primary strategic focus is ${persona.focus}.

Here is the LIVE situation of your empire on Turn ${gameState?.turn || 1}:
- Gold: ${civ.gold}
- Science Progress: ${civ.science}
- Leaderboard Score: ${civ.score}
- Researched Technologies: ${JSON.stringify(civ.researchedTechs)}
- Currently Researching: ${civ.currentTech}
- Active Cities under your banner: ${JSON.stringify(liveCities.map((c: any) => `${c.name} (Pop ${c.population}, Role: ${c.role})`))}
- Active Garrisons: ${liveUnits.length} units mobilized.
- Neighbors and Diplomatic Postures:
${otherCivs.map((other: any) => {
  const posture = civ.diplomaticPostures?.[other.id] || "NEUTRAL";
  const warPlan = civ.warPlans?.[other.id] || "NONE";
  return `  * vs ${other.name} (${other.leader}): Posture is ${posture}, War Plan is ${warPlan}`;
}).join("\n")}

Respond to the user's query as ${persona.leader}. You can discuss:
1. Tactical advice based on the LIVE situation of your empire.
2. Real-world historical context of your civilization or leaders (use Google Search to get grounded, highly accurate, and engaging details!).
3. Freeciv / Civilization strategy tips and gameplay guides matching your current strategic assets (use Google Search grounding to retrieve real guides and recommendations!).

Format your response in a visually engaging way. Keep the response to 2-3 concise, majestic, and thematic paragraphs.
If you use Google Search grounding, blend the facts seamlessly into your roleplay so it sounds natural but informative!

User's Query: "${message}"
`;

  // Fallback helper for simulated replies
  const getSimulatedReply = () => {
    const simulatedReplies: Record<string, string[]> = {
      rome: [
        `Veni, vidi, vici! Our scouts report fertile valleys on our borders. We should expand Rome's borders and pave grand roads! Our current research into ${civ.currentTech || "Engineering"} will lay the foundations of an invincible Pax Romana. What more would you ask of your Imperator?`,
        `By the Gods, order shall prevail! With ${civ.gold} gold in our treasury, we can easily fund a legion to march against any who dare defy Rome. What are your commands?`
      ],
      han: [
        `Welcome, honored scholar. Prosperity arises from internal peace and diligent study. We currently hold ${civ.gold} gold and are pursuing ${civ.currentTech || "Writing"}. Let us look to the long-term enrichment of the Silk Road and writing academies.`,
        `With Confucian grace, we observe our neighbors. A composed empire never rushes into headless war. Let us cultivate deep philosophies to surpass all others in score.`
      ],
      maya: [
        `The stars align over the temples of Palenque. Our grand city and crop irrigation works stand secure. As we decipher the secrets of ${civ.currentTech || "Astronomy"}, we must build massive libraries to store the wisdom of the cosmos.`,
        `Our gods guide our hands. Pacal welcomes your council under the sacred celestial tree. How can we direct our people next?`
      ],
      viking: [
        `Aha! Raise the sails and grab the axes! The cold winds of Nidaros call us to conquer! With ${liveUnits.length} garrisons mobilized and sails set, no coastline is safe. Let us gather gold through iron!`,
        `Ragnar hears your voice, friend of the longships! Why talk of treaties when we can craft swords and claim our glory? Let's plunder our rivals' shores!`
      ]
    };

    const replies = simulatedReplies[civId] || [`${persona.leader} is currently contemplating grand strategies...`];
    return replies[Math.floor(Math.random() * replies.length)];
  };

  // Fallback if Gemini is not initialized
  if (!ai) {
    return res.json({ response: getSimulatedReply() });
  }

  try {
    const response = await callGeminiWithRetry(() => ai!.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contextPrompt,
      config: {
        tools: [{ googleSearch: {} }],
        systemInstruction: `You are the specific civilization leader in a spectator strategy game simulation. You roleplay perfectly and answer queries utilizing live data. Speak with appropriate historical authority and incorporate Google Search results seamlessly without showing raw markdown urls.`
      }
    }));

    return res.json({ response: response.text });
  } catch (err) {
    console.error("Advisor chat call failed, falling back to simulated response:", err);
    return res.json({ response: getSimulatedReply() });
  }
});

app.post("/api/gemini/generate-portrait", async (req, res) => {
  const { prompt, civId } = req.body;
  if (!civId) {
    return res.status(400).json({ error: "Missing civId" });
  }

  // Detailed styling descriptions
  const prompts: Record<string, string> = {
    rome: "A grand, high-fidelity digital illustration of Julius Caesar, Imperator of Rome, looking over a glowing tactical simulation map of a hexagonal board game. Roman flags, marble colonnade background, dramatic lighting, crimson colors, cinematic fantasy style.",
    han: "A serene, highly detailed portrait of Emperor Wu, the legendary ruler of the Han Dynasty, holding a scroll of ancient writing next to a window overlooking a fertile valley with circular pagodas. Jade colors, soft atmospheric glow, elegant cinematic style.",
    maya: "A mystical, visionary digital painting of Pacal the Great, Ahau of Palenque, wearing an ornate jade and feather headdress in front of a massive stone Mayan pyramid under a starry galaxy sky. Mystical purple-blue twilight colors, majestic cosmic style.",
    viking: "A fierce, bold digital artwork of Ragnar Lodbrok, Saga-King of the Vikings, holding a dual-edged iron battleaxe on the deck of a wooden longship sailing through rough stormy ocean waves. Orange sunset glow, high contrast dramatic fantasy art."
  };

  const finalPrompt = prompt || prompts[civId] || "A majestic ancient civilization leader looking over a tactical simulation map, strategy game, fantasy illustration.";

  // If Gemini client is not initialized or fails, we generate/provide a beautiful custom vector-styled visual fallback representing the leader so the app remains perfectly functional!
  if (!ai) {
    return res.json({ imageUrl: null, fallbackCivId: civId });
  }

  try {
    const response = await callGeminiWithRetry(() => ai!.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: {
        parts: [
          {
            text: finalPrompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: "1:1",
        },
      },
    }));

    let base64Image = "";
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        base64Image = part.inlineData.data;
        break;
      }
    }

    if (base64Image) {
      return res.json({ imageUrl: `data:image/png;base64,${base64Image}` });
    } else {
      throw new Error("No image data in response parts");
    }
  } catch (err) {
    console.warn("Failed to generate image using Gemini, returning fallback:", err);
    return res.json({ imageUrl: null, fallbackCivId: civId });
  }
});

// --------------------------------------------------------
// Vite Development or Static Production Asset Setup
// --------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Mount Vite as a middleware in development mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware mounted successfully.");
  } else {
    // Serve static files from compiled dist directory in production
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Production static file server configured.");
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`AI Spectator Strategy game backend running on http://localhost:${PORT}`);
  });
}

startServer();
