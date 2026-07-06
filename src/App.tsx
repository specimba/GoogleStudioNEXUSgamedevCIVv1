/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Info, 
  HelpCircle, 
  X, 
  Award, 
  Coins, 
  Beaker, 
  Swords, 
  Shield, 
  Compass, 
  BookOpen, 
  Sparkles, 
  Skull, 
  Activity, 
  MapPin, 
  TrendingUp, 
  User, 
  Plus, 
  MessageSquare,
  Heart,
  Database,
  Mic,
  Volume2,
  VolumeX,
  Handshake
} from "lucide-react";
import { 
  HexTile, 
  Civilization, 
  City, 
  Unit, 
  GameEvent, 
  TurnSummary, 
  GameState, 
  TerrainType, 
  GrandStrategy, 
  ResearchTheme, 
  CityRole, 
  DiplomaticPosture, 
  WarPlan, 
  ExplorationFocus, 
  UnitType,
  CivRef
} from "./types";
import { WarDeclarationCinematic } from "./components/cinematics/WarDeclarationCinematic";
import { CityCapturedCinematic } from "./components/cinematics/CityCapturedCinematic";
import { TechResearchedCinematic } from "./components/cinematics/TechResearchedCinematic";
import {
  signInWithGoogleSheets,
  createSimulationSpreadsheet,
  syncLeaderboardToSpreadsheet,
  syncEventsToSpreadsheet,
  logoutGoogleSheets,
  initializeSheetsAuth
} from "./utils/googleSheets";

// -----------------------------------------------------------------------------
// Constants and Static Data
// -----------------------------------------------------------------------------
const MAP_WIDTH = 14;
const MAP_HEIGHT = 9;
const HEX_SIZE = 34; // Pixel radius size
const horizontalSpacing = HEX_SIZE * 1.5;
const verticalSpacing = HEX_SIZE * Math.sqrt(3);

const INITIAL_CIVS: Civilization[] = [
  {
    id: "rome",
    uniqueId: "civ_rome",
    name: "Roman Empire",
    leader: "Julius Caesar",
    color: "#ef4444", // Red
    secondaryColor: "rgba(239, 68, 68, 0.4)",
    gold: 20,
    science: 0,
    score: 11,
    isDead: false,
    grandStrategy: "EXPAND",
    researchTheme: "SCIENCE",
    explorationFocus: "INLAND_GAPS",
    diplomaticPostures: { "han": "NEUTRAL", "maya": "NEUTRAL", "viking": "NEUTRAL" },
    warPlans: { "han": "NONE", "maya": "NONE", "viking": "NONE" },
    currentTech: "Irrigation",
    researchedTechs: []
  },
  {
    id: "han",
    uniqueId: "civ_han",
    name: "Han Dynasty",
    leader: "Emperor Wu",
    color: "#10b981", // Emerald Green
    secondaryColor: "rgba(16, 185, 129, 0.4)",
    gold: 20,
    science: 0,
    score: 11,
    isDead: false,
    grandStrategy: "TALL_TECH",
    researchTheme: "ECONOMY",
    explorationFocus: "RESOURCE_RICH_AREAS",
    diplomaticPostures: { "rome": "NEUTRAL", "maya": "NEUTRAL", "viking": "NEUTRAL" },
    warPlans: { "rome": "NONE", "maya": "NONE", "viking": "NONE" },
    currentTech: "Writing",
    researchedTechs: []
  },
  {
    id: "maya",
    uniqueId: "civ_maya",
    name: "Maya civilization",
    leader: "Pacal the Great",
    color: "#a855f7", // Purple
    secondaryColor: "rgba(168, 85, 247, 0.4)",
    gold: 20,
    science: 0,
    score: 11,
    isDead: false,
    grandStrategy: "EXPAND",
    researchTheme: "SCIENCE",
    explorationFocus: "COASTLINES",
    diplomaticPostures: { "rome": "NEUTRAL", "han": "NEUTRAL", "viking": "NEUTRAL" },
    warPlans: { "rome": "NONE", "han": "NONE", "viking": "NONE" },
    currentTech: "Irrigation",
    researchedTechs: []
  },
  {
    id: "viking",
    uniqueId: "civ_viking",
    name: "Viking Clans",
    leader: "Ragnar Lodbrok",
    color: "#f97316", // Orange
    secondaryColor: "rgba(249, 115, 22, 0.4)",
    gold: 20,
    science: 0,
    score: 11,
    isDead: false,
    grandStrategy: "MILITARY_RUSH",
    researchTheme: "MILITARY_LAND",
    explorationFocus: "ENEMY_BORDERS",
    diplomaticPostures: { "rome": "NEUTRAL", "han": "NEUTRAL", "maya": "NEUTRAL" },
    warPlans: { "rome": "NONE", "han": "NONE", "maya": "NONE" },
    currentTech: "Bronze Working",
    researchedTechs: []
  }
];

const TECHNOLOGIES = [
  { id: "Irrigation", name: "Irrigation", cost: 25, theme: "ECONOMY" as ResearchTheme, benefits: "Enables building Farms" },
  { id: "Writing", name: "Writing", cost: 25, theme: "SCIENCE" as ResearchTheme, benefits: "Enables building Libraries" },
  { id: "Bronze Working", name: "Bronze Working", cost: 25, theme: "MILITARY_LAND" as ResearchTheme, benefits: "Enables production of Warriors" },
  { id: "Sailing", name: "Sailing", cost: 25, theme: "MILITARY_NAVAL" as ResearchTheme, benefits: "Enables production of Triremes" },
  { id: "Wheel", name: "Wheel", cost: 25, theme: "INFRASTRUCTURE" as ResearchTheme, benefits: "Enables laying Roads" },
  { id: "Currency", name: "Currency", cost: 60, theme: "ECONOMY" as ResearchTheme, benefits: "Enables building Markets" },
  { id: "Philosophy", name: "Philosophy", cost: 60, theme: "SCIENCE" as ResearchTheme, benefits: "Enables advanced research centers" },
  { id: "Iron Working", name: "Iron Working", cost: 60, theme: "MILITARY_LAND" as ResearchTheme, benefits: "Enables production of Legions" },
  { id: "Engineering", name: "Engineering", cost: 60, theme: "INFRASTRUCTURE" as ResearchTheme, benefits: "Enables reinforced Walls" }
];

const CITY_NAMES: Record<string, string[]> = {
  rome: ["Rome", "Antium", "Cumae", "Neapolis", "Pompeii", "Ravenna", "Mediolanum"],
  han: ["Chang'an", "Luoyang", "Chengdu", "Guangzhou", "Nanjing", "Hangzhou", "Wuhan"],
  maya: ["Tikal", "Copan", "Palenque", "Calakmul", "Chichen Itza", "Uxmal", "Mayapan"],
  viking: ["Nidaros", "Birka", "Hedeby", "Ribe", "Kaupang", "Sigtuna", "Roskilde"]
};

let lastIdCounter = 0;
function generateUniqueId(prefix: string): string {
  lastIdCounter++;
  return `${prefix}_${Date.now()}_${lastIdCounter}_${Math.random().toString(36).substring(2, 6)}`;
}

// -----------------------------------------------------------------------------
// Hex Grid Coordination & Initialization Helpers
// -----------------------------------------------------------------------------
function getHexDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
}

function getNeighbors(x: number, y: number): { x: number, y: number }[] {
  const isEven = y % 2 === 0;
  // Offset neighbors for flat-topped or pointy hex grid configuration
  const dirs = isEven 
    ? [
        { dx: -1, dy: -1 }, { dx: 0, dy: -1 },
        { dx: -1, dy: 0 },  { dx: 1, dy: 0 },
        { dx: -1, dy: 1 },  { dx: 0, dy: 1 }
      ]
    : [
        { dx: 0, dy: -1 },  { dx: 1, dy: -1 },
        { dx: -1, dy: 0 },  { dx: 1, dy: 0 },
        { dx: 0, dy: 1 },   { dx: 1, dy: 1 }
      ];

  return dirs
    .map(d => ({ x: x + d.dx, y: y + d.dy }))
    .filter(n => n.x >= 0 && n.x < MAP_WIDTH && n.y >= 0 && n.y < MAP_HEIGHT);
}

function getDynamicStartingPositions() {
  const rX = 1 + Math.floor(Math.random() * 2); // 1 or 2
  const rY = 1 + Math.floor(Math.random() * 2); // 1 or 2

  const hX = (MAP_WIDTH - 2) - Math.floor(Math.random() * 2); // 11 or 12
  const hY = 1 + Math.floor(Math.random() * 2); // 1 or 2

  const mX = 1 + Math.floor(Math.random() * 2); // 1 or 2
  const mY = (MAP_HEIGHT - 2) - Math.floor(Math.random() * 2); // 6 or 7

  const vX = (MAP_WIDTH - 2) - Math.floor(Math.random() * 2); // 11 or 12
  const vY = (MAP_HEIGHT - 2) - Math.floor(Math.random() * 2); // 6 or 7

  return {
    rome: { x: rX, y: rY },
    han: { x: hX, y: hY },
    maya: { x: mX, y: mY },
    viking: { x: vX, y: vY }
  };
}

function generateInitialGrid(startPositions?: any): HexTile[][] {
  const grid: HexTile[][] = [];
  
  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row: HexTile[] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      // Determine base terrain randomly, with structured biomes
      let terrain: TerrainType = "GRASS";
      
      // Central high mountain peaks
      if ((x === 5 || x === 6 || x === 7 || x === 8) && (y === 3 || y === 4 || y === 5)) {
        terrain = Math.random() < 0.6 ? "MOUNTAIN" : "HILL";
      }
      // Northern / Southern coastal waters
      else if (y === 0 || y === MAP_HEIGHT - 1) {
        terrain = Math.random() < 0.7 ? "OCEAN" : "COAST";
      }
      else {
        const rand = Math.random();
        if (rand < 0.15) terrain = "MOUNTAIN";
        else if (rand < 0.32) terrain = "HILL";
        else if (rand < 0.50) terrain = "FOREST";
        else if (rand < 0.60) terrain = "DESERT";
        else if (rand < 0.68) terrain = "RIVER";
        else terrain = "GRASS";
      }

      row.push({
        x,
        y,
        terrain,
        ownerCivId: null,
        improvement: null,
        cityId: null
      });
    }
    grid.push(row);
  }

  // Ensure starting locations have suitable grass/forest
  const starts = startPositions ? [
    startPositions.rome,
    startPositions.han,
    startPositions.maya,
    startPositions.viking
  ] : [
    { x: 1, y: 1 }, // Rome fallback
    { x: 12, y: 1 }, // Han fallback
    { x: 2, y: 7 }, // Maya fallback
    { x: 11, y: 7 } // Viking fallback
  ];

  starts.forEach(pos => {
    if (grid[pos.y]?.[pos.x]) {
      grid[pos.y][pos.x].terrain = "GRASS";
      // Neighbors are clear for exploration
      getNeighbors(pos.x, pos.y).forEach(n => {
        if (grid[n.y]?.[n.x]) {
          if (grid[n.y][n.x].terrain === "MOUNTAIN" || grid[n.y][n.x].terrain === "OCEAN") {
            grid[n.y][n.x].terrain = "FOREST";
          }
        }
      });
    }
  });

  return grid;
}

// -----------------------------------------------------------------------------
// Core Component
// -----------------------------------------------------------------------------
export default function App() {
  const [gameState, setGameState] = useState<GameState>(() => {
    const startPositions = getDynamicStartingPositions();
    const grid = generateInitialGrid(startPositions);
    
    // Starting units
    const initialUnits: Unit[] = [
      // Rome
      { id: "u_rome_s", uniqueId: "unit_u_rome_s", type: "SETTLER", ownerId: "rome", x: startPositions.rome.x, y: startPositions.rome.y, health: 100, hasMoved: false, combatStrength: 0 },
      { id: "u_rome_w", uniqueId: "unit_u_rome_w", type: "WARRIOR", ownerId: "rome", x: startPositions.rome.x + 1, y: startPositions.rome.y, health: 100, hasMoved: false, combatStrength: 12 },
      // Han
      { id: "u_han_s", uniqueId: "unit_u_han_s", type: "SETTLER", ownerId: "han", x: startPositions.han.x, y: startPositions.han.y, health: 100, hasMoved: false, combatStrength: 0 },
      { id: "u_han_w", uniqueId: "unit_u_han_w", type: "WARRIOR", ownerId: "han", x: startPositions.han.x - 1, y: startPositions.han.y, health: 100, hasMoved: false, combatStrength: 12 },
      // Maya
      { id: "u_maya_s", uniqueId: "unit_u_maya_s", type: "SETTLER", ownerId: "maya", x: startPositions.maya.x, y: startPositions.maya.y, health: 100, hasMoved: false, combatStrength: 0 },
      { id: "u_maya_w", uniqueId: "unit_u_maya_w", type: "WARRIOR", ownerId: "maya", x: startPositions.maya.x + 1, y: startPositions.maya.y, health: 100, hasMoved: false, combatStrength: 12 },
      // Viking
      { id: "u_viking_s", uniqueId: "unit_u_viking_s", type: "SETTLER", ownerId: "viking", x: startPositions.viking.x, y: startPositions.viking.y, health: 100, hasMoved: false, combatStrength: 0 },
      { id: "u_viking_w", uniqueId: "unit_u_viking_w", type: "WARRIOR", ownerId: "viking", x: startPositions.viking.x - 1, y: startPositions.viking.y, health: 100, hasMoved: false, combatStrength: 12 }
    ];

    // Force warrior positions to be valid neighbors
    const warriorSetups = [
      { id: "u_rome_w", x: startPositions.rome.x, y: startPositions.rome.y },
      { id: "u_han_w", x: startPositions.han.x, y: startPositions.han.y },
      { id: "u_maya_w", x: startPositions.maya.x, y: startPositions.maya.y },
      { id: "u_viking_w", x: startPositions.viking.x, y: startPositions.viking.y }
    ];

    warriorSetups.forEach(w => {
      const neighbors = getNeighbors(w.x, w.y);
      const suitable = neighbors.find(n => grid[n.y]?.[n.x]?.terrain !== "MOUNTAIN" && grid[n.y]?.[n.x]?.terrain !== "OCEAN");
      const unit = initialUnits.find(u => u.id === w.id);
      if (unit && suitable) {
        unit.x = suitable.x;
        unit.y = suitable.y;
      }
    });

    const initialEvent: GameEvent = {
      id: "e_init",
      uniqueId: "ue_e_init",
      turn: 1,
      timestamp: Date.now(),
      type: "WORLD_NARRATIVE",
      category: "NARRATIVE",
      severity: "MAJOR",
      source: "SYSTEM",
      icon: "scroll",
      headline: "The Dawn of History",
      summary: "Four great civilizations emerge from the shadows of history. The battle for territory, science, and glory has begun!",
      showInTicker: true,
      showInLog: true
    };

    return {
      turn: 1,
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
      grid,
      civs: INITIAL_CIVS.map(c => ({
        ...c,
        researchedTechs: [...c.researchedTechs],
        diplomaticPostures: { ...c.diplomaticPostures },
        warPlans: { ...c.warPlans }
      })),
      cities: [],
      units: initialUnits,
      events: [initialEvent],
      turnSummaries: [],
      isAiDeciding: false
    };
  });

  // UI state
  const [isPlaying, setIsPlaying] = useState(false);
  const isPlayingRef = useRef(isPlaying);
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);
  const [speed, setSpeed] = useState<"1x" | "2x" | "4x" | "8x">("2x");
  const [selectedCivId, setSelectedCivId] = useState<string | null>(null);
  const [selectedHex, setSelectedHex] = useState<{ x: number, y: number } | null>(null);
  const [activeCinematic, setActiveCinematic] = useState<GameEvent | null>(null);
  const [cameraFocus, setCameraFocus] = useState<{ x: number, y: number } | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [chronicleFilter, setChronicleFilter] = useState<"ALL" | "COMBAT" | "DIPLOMACY" | "ECONOMY" | "NARRATIVE">("ALL");
  const [showTacticalOverlay, setShowTacticalOverlay] = useState(false);
  const [climateOverlay, setClimateOverlay] = useState<"NONE" | "TEMPERATURE" | "HUMIDITY">("NONE");
  const boardContainerRef = useRef<HTMLDivElement | null>(null);

  // Grand AI Advisor Oracle & Visual Chronicles States
  const [sidebarTab, setSidebarTab] = useState<"chronicle" | "advisor" | "sheets" | "diplomacy">("chronicle");
  const [advisorChats, setAdvisorChats] = useState<Record<string, { sender: "user" | "advisor", text: string, timestamp: number }[]>>({});
  const [advisorInput, setAdvisorInput] = useState("");
  const [isAdvisorTyping, setIsAdvisorTyping] = useState(false);
  const [civPortraits, setCivPortraits] = useState<Record<string, string>>({});
  const [isGeneratingPortrait, setIsGeneratingPortrait] = useState(false);
  const [activePortraitModal, setActivePortraitModal] = useState<string | null>(null);

  // Dynamic Climate calculations based on latitude and terrain properties
  const getTileClimate = (x: number, y: number, terrain: TerrainType) => {
    // Equatorial warmth is at y = 4 (center latitude)
    const latRatio = Math.abs(y - 4.5) / 4.5; // 0 (equator) to 1 (polar ice caps)
    
    // Base Temperature (0 to 100)
    let temperature = Math.round(92 - latRatio * 75);
    
    // Base Humidity (0 to 100)
    let humidity = 50;
    
    if (terrain === "OCEAN" || terrain === "COAST" || terrain === "RIVER") {
      humidity = 85;
      temperature = Math.max(20, temperature - 8);
    } else if (terrain === "DESERT") {
      humidity = 8;
      temperature = Math.min(100, temperature + 18);
    } else if (terrain === "FOREST") {
      humidity = 78;
      temperature = Math.max(25, temperature - 4);
    } else if (terrain === "HILL") {
      humidity = 38;
      temperature = Math.max(15, temperature - 10);
    } else if (terrain === "MOUNTAIN") {
      humidity = 25;
      temperature = Math.max(2, temperature - 22);
    }
    
    const varTemp = Math.sin(x * 1.8 + y * 2.3) * 5;
    const varHum = Math.cos(x * 2.1 + y * 1.5) * 6;
    
    temperature = Math.max(0, Math.min(100, Math.round(temperature + varTemp)));
    humidity = Math.max(0, Math.min(100, Math.round(humidity + varHum)));
    
    return { temperature, humidity };
  };

  const getTemperatureColor = (temp: number) => {
    if (temp < 30) return "#2563eb"; // Arctic Blue
    if (temp < 45) return "#38bdf8"; // Cool blue
    if (temp < 65) return "#10b981"; // Temperate green
    if (temp < 80) return "#f59e0b"; // Warm gold
    return "#ef4444"; // Torrid red
  };

  const getHumidityColor = (hum: number) => {
    if (hum < 20) return "#eab308"; // Arid desert gold
    if (hum < 45) return "#84cc16"; // Semi-arid lime
    if (hum < 70) return "#10b981"; // Moist green
    return "#0284c7"; // Humid wet blue
  };

  const getCityProductionQueue = (city: any, grid: any[][], cities: any[], civs: any[]) => {
    const owner = civs.find(c => c.id === city.ownerId);
    const wallsBuilt = grid[city.y]?.[city.x]?.improvement === "WALLS";
    const ownCitiesCount = cities.filter(c => c.ownerId === city.ownerId).length;

    const queue: { name: string; cost: number; type: "BUILDING" | "UNIT" | "WONDER"; icon: string }[] = [];

    if (city.role === "FORTRESS_BORDER") {
      if (city.currentBuild !== "WALLS" && !wallsBuilt) {
        queue.push({ name: "Walls", cost: 30, type: "BUILDING", icon: "🛡️" });
      }
      queue.push({ name: "Legion", cost: 35, type: "UNIT", icon: "⚔️" });
      queue.push({ name: "Archer", cost: 25, type: "UNIT", icon: "🏹" });
    } else if (city.role === "CORE_GROWTH") {
      if (city.currentBuild !== "SETTLER" && ownCitiesCount < 3) {
        queue.push({ name: "Settler", cost: 45, type: "UNIT", icon: "👥" });
      }
      queue.push({ name: "Granary", cost: 30, type: "BUILDING", icon: "🌾" });
      queue.push({ name: "Aqueduct", cost: 40, type: "BUILDING", icon: "🚰" });
    } else if (city.role === "INDUSTRIAL_HUB") {
      queue.push({ name: "Forge", cost: 35, type: "BUILDING", icon: "🔥" });
      queue.push({ name: "Barracks", cost: 30, type: "BUILDING", icon: "🏟️" });
    } else if (city.role === "TEMPLE_SACRED") {
      queue.push({ name: "Shrine", cost: 25, type: "BUILDING", icon: "✨" });
      queue.push({ name: "Temple", cost: 45, type: "BUILDING", icon: "🏛️" });
    } else if (city.role === "SCIENCE_COLLEGE") {
      queue.push({ name: "Library", cost: 30, type: "BUILDING", icon: "📚" });
      queue.push({ name: "Academy", cost: 50, type: "BUILDING", icon: "🧪" });
    } else {
      queue.push({ name: "Warrior", cost: 25, type: "UNIT", icon: "🪓" });
      queue.push({ name: "Archer", cost: 25, type: "UNIT", icon: "🏹" });
    }

    return queue.slice(0, 2);
  };

  const getGeopoliticalStatus = (civ: any, state: any) => {
    if (civ.isDead) return { label: "Defeated", bg: "bg-zinc-800/80 text-zinc-500 border-zinc-900", icon: "💀" };

    const isAtWar = Object.keys(civ.warPlans || {}).some(
      otherId => civ.warPlans[otherId] && civ.warPlans[otherId] !== "NONE"
    ) || state.civs.some((other: any) => 
      other.id !== civ.id && other.warPlans && other.warPlans[civ.id] && other.warPlans[civ.id] !== "NONE"
    );

    if (isAtWar) {
      return { label: "At War", bg: "bg-red-500/10 text-red-400 border-red-500/30 animate-pulse", icon: "⚔️" };
    }

    const isAllied = Object.values(civ.diplomaticPostures || {}).some(p => p === "ALLY");
    if (isAllied) {
      return { label: "Ally", bg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", icon: "🤝" };
    }

    const isFriendly = Object.values(civ.diplomaticPostures || {}).some(p => p === "FRIENDLY");
    if (isFriendly) {
      return { label: "Friendly", bg: "bg-blue-500/10 text-blue-400 border-blue-500/30", icon: "😊" };
    }

    return { label: "Neutral", bg: "bg-zinc-800/80 text-zinc-400 border-zinc-700", icon: "🕊️" };
  };

  const jumpToCoordinate = (x: number, y: number) => {
    const center = getHexCenter(x, y);
    if (boardContainerRef.current) {
      const container = boardContainerRef.current;
      const clientWidth = container.clientWidth;
      const clientHeight = container.clientHeight;

      const wrapperWidth = 1150;
      const wrapperHeight = 860;
      const svgWidth = 1050;
      const svgHeight = 780;

      const offsetX = (wrapperWidth - svgWidth) / 2;
      const offsetY = (wrapperHeight - svgHeight) / 2;

      const pixelX = offsetX + (center.x / 850) * svgWidth;
      const pixelY = offsetY + (center.y / 640) * svgHeight;

      const targetScrollX = pixelX - clientWidth / 2;
      const targetScrollY = pixelY - clientHeight / 2;

      container.scrollTo({
        left: Math.max(0, targetScrollX),
        top: Math.max(0, targetScrollY),
        behavior: "smooth"
      });

      setSelectedHex({ x, y });
    }
  };

  // Sports Commentator Voice & Google Sheets Integration States
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const lastSpokenEventId = useRef<string | null>(null);

  // Google Sheets Workspace State
  const [googleUser, setGoogleUser] = useState<any>(null);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [activeSpreadsheet, setActiveSpreadsheet] = useState<{ id: string, url: string } | null>(null);
  const [autoSyncSheets, setAutoSyncSheets] = useState(true);
  const [sheetsLogs, setSheetsLogs] = useState<string[]>([]);

  // Timewave Zero State Variables
  const [anomalies, setAnomalies] = useState<{ id: string; x: number; y: number; type: "RIFT" | "SHARD" }[]>([]);
  const [isEschatonTriggered, setIsEschatonTriggered] = useState(false);
  const [eschatonVictor, setEschatonVictor] = useState<string | null>(null);

  // Novelty math according to McKenna's Novelty Theory curves
  const getNoveltyValue = (t: number) => {
    // Overlapping sine waves with prime cycles representing nested fractal chronological waves
    const w1 = Math.sin(t / 2.8) * 22;
    const w2 = Math.cos(t / 8.3) * 16;
    const w3 = Math.sin(t / 19.5) * 12;
    const w4 = Math.abs((t % 48) - 24) * 0.9; // saw-tooth harmonic element
    const base = 52 + w1 + w2 + w3 - w4;
    return Math.max(5, Math.min(95, Math.round(base)));
  };

  const currentNovelty = getNoveltyValue(gameState.turn);

  // Add Log entry to sheets console
  const addSheetsLog = (msg: string) => {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setSheetsLogs(prev => [`[${time}] ${msg}`, ...prev.slice(0, 49)]);
  };

  const sendAdvisorMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!selectedCivId || !advisorInput.trim() || isAdvisorTyping) return;

    const userMessage = advisorInput.trim();
    setAdvisorInput("");

    // Append user message in state
    setAdvisorChats(prev => ({
      ...prev,
      [selectedCivId]: [
        ...(prev[selectedCivId] || []),
        { sender: "user", text: userMessage, timestamp: Date.now() }
      ]
    }));

    setIsAdvisorTyping(true);

    try {
      const response = await fetch("/api/gemini/advisor-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameState,
          civId: selectedCivId,
          message: userMessage
        })
      });

      const data = await response.json();
      if (data.response) {
        setAdvisorChats(prev => ({
          ...prev,
          [selectedCivId]: [
            ...(prev[selectedCivId] || []),
            { sender: "advisor", text: data.response, timestamp: Date.now() }
          ]
        }));
      } else {
        throw new Error(data.error || "Failed to consult advisor");
      }
    } catch (err) {
      console.error(err);
      setAdvisorChats(prev => ({
        ...prev,
        [selectedCivId]: [
          ...(prev[selectedCivId] || []),
          { sender: "advisor", text: "Apologies, scribe. The strategic winds are heavy, and the gods remain silent. Let us plan our next turn with patience.", timestamp: Date.now() }
        ]
      }));
    } finally {
      setIsAdvisorTyping(false);
    }
  };

  const generatePortrait = async (civId: string) => {
    if (isGeneratingPortrait) return;
    setIsGeneratingPortrait(true);

    try {
      const response = await fetch("/api/gemini/generate-portrait", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ civId })
      });

      const data = await response.json();
      if (data.imageUrl) {
        setCivPortraits(prev => ({
          ...prev,
          [civId]: data.imageUrl
        }));
      } else {
        // Fallback procedural/SVG generation if model fails or key is missing
        setCivPortraits(prev => ({
          ...prev,
          [civId]: "fallback"
        }));
      }
    } catch (err) {
      console.error("Portrait generation failed:", err);
      setCivPortraits(prev => ({
        ...prev,
        [civId]: "fallback"
      }));
    } finally {
      setIsGeneratingPortrait(false);
    }
  };

  // Google Sheets Action Handlers
  const handleSheetsLogin = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await signInWithGoogleSheets();
      if (result) {
        setGoogleUser(result.user);
        setGoogleAccessToken(result.accessToken);
        addSheetsLog(`Authenticated as ${result.user.email || "Google User"}`);
      }
    } catch (err: any) {
      console.error("Failed to sign in to Google Workspace:", err);
      addSheetsLog(`Login failed: ${err.message || err}`);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleSheetsLogout = async () => {
    try {
      await logoutGoogleSheets();
      setGoogleUser(null);
      setGoogleAccessToken(null);
      setActiveSpreadsheet(null);
      addSheetsLog("Logged out of Google Workspace.");
    } catch (err: any) {
      console.error("Logout failed:", err);
    }
  };

  const handleCreateAndSyncSpreadsheet = async () => {
    if (!googleAccessToken) return;
    setIsGoogleLoading(true);
    addSheetsLog("Initializing brand-new Google Spreadsheet...");

    try {
      const info = await createSimulationSpreadsheet(googleAccessToken, gameState.turn);
      setActiveSpreadsheet(info);
      addSheetsLog(`Created spreadsheet! ID: ${info.spreadsheetId}`);
      
      addSheetsLog("Pushing latest Leaderboard data...");
      await syncLeaderboardToSpreadsheet(googleAccessToken, info.spreadsheetId, gameState.civs);

      addSheetsLog("Pushing Historical Chronicle Log data...");
      await syncEventsToSpreadsheet(googleAccessToken, info.spreadsheetId, gameState.events);

      addSheetsLog("Google Sheets Dashboard synced successfully!");
    } catch (err: any) {
      console.error("Spreadsheet synchronization failed:", err);
      addSheetsLog(`Sync failed: ${err.message || err}`);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleManualSync = async () => {
    if (!googleAccessToken || !activeSpreadsheet) return;
    setIsGoogleLoading(true);
    addSheetsLog("Manually updating active spreadsheet...");

    try {
      addSheetsLog("Syncing Leaderboard...");
      await syncLeaderboardToSpreadsheet(googleAccessToken, activeSpreadsheet.id, gameState.civs);

      addSheetsLog("Syncing Event Log...");
      await syncEventsToSpreadsheet(googleAccessToken, activeSpreadsheet.id, gameState.events);

      addSheetsLog("Spreadsheet successfully updated.");
    } catch (err: any) {
      console.error("Manual sync failed:", err);
      addSheetsLog(`Sync failed: ${err.message || err}`);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Google Sheets Auto-Sync effect
  useEffect(() => {
    if (gameState.turn <= 1 || !googleAccessToken || !activeSpreadsheet || !autoSyncSheets) return;

    const performSync = async () => {
      try {
        addSheetsLog(`Auto-syncing Turn ${gameState.turn} statistics...`);
        await syncLeaderboardToSpreadsheet(googleAccessToken, activeSpreadsheet.id, gameState.civs);
        await syncEventsToSpreadsheet(googleAccessToken, activeSpreadsheet.id, gameState.events);
        addSheetsLog(`Successfully auto-synced Turn ${gameState.turn}!`);
      } catch (err: any) {
        console.error("Auto-sync error:", err);
        addSheetsLog(`Auto-sync failed: ${err.message || err}`);
      }
    };

    performSync();
  }, [gameState.turn]);

  // Timewave Turn Ticks: Handle anomalies collision, spawning, and Eschaton Singularity
  useEffect(() => {
    if (gameState.turn === 1) {
      // Seed initial starting anomalies
      const initialAnoms = [
        { id: "anom_1", x: 4, y: 3, type: "RIFT" as const },
        { id: "anom_2", x: 8, y: 4, type: "SHARD" as const },
        { id: "anom_3", x: 6, y: 6, type: "RIFT" as const },
        { id: "anom_4", x: 9, y: 2, type: "SHARD" as const },
      ];
      setAnomalies(initialAnoms);
      return;
    }

    // A. Check for Eschaton Singularity at Turn 120
    if (gameState.turn >= 120 && !isEschatonTriggered) {
      setIsPlaying(false);
      // Determine victor (civ with highest score)
      const aliveCivs = gameState.civs.filter(c => !c.isDead);
      let victor = aliveCivs[0];
      aliveCivs.forEach(c => {
        if (c.score > victor.score) victor = c;
      });

      setEschatonVictor(victor ? victor.name : "All Humanity");
      setIsEschatonTriggered(true);

      // Log a cinematic event
      const eschatonEvent: GameEvent = {
        id: generateUniqueId("e_eschaton"),
        turn: gameState.turn,
        timestamp: Date.now(),
        type: "WORLD_NARRATIVE",
        category: "NARRATIVE",
        severity: "CINEMATIC",
        source: "SYSTEM",
        icon: "crown",
        headline: "THE ESCHATON SINGULARITY REACHED! TIME INTEGRATES!",
        summary: `History has reached Turn 120—the terminal point of Terence McKenna's Timewave Zero curve. The boundaries of space, technology, and identity dissolve into a single point of infinite novelty. Under the guidance of ${victor ? victor.name : "humanity's integrated spirit"}, civilization transcends!`,
        showInTicker: true,
        showInLog: true,
        triggerCinematic: true
      };

      setGameState(prev => ({
        ...prev,
        events: [...prev.events, eschatonEvent]
      }));
      return;
    }

    // B. Check for collision between units and anomalies
    const hitAnoms: typeof anomalies = [];
    gameState.units.forEach(u => {
      const found = anomalies.find(a => a.x === u.x && a.y === u.y);
      if (found) {
        hitAnoms.push(found);
      }
    });

    if (hitAnoms.length > 0) {
      setAnomalies(prev => prev.filter(a => !hitAnoms.some(h => h.id === a.id)));
      
      setGameState(prev => {
        const nextCivs = prev.civs.map(c => ({ ...c }));
        const nextUnits = prev.units.map(u => {
          const matchingHit = hitAnoms.find(h => h.x === u.x && h.y === u.y);
          if (matchingHit) {
            const owner = nextCivs.find(c => c.id === u.ownerId);
            if (owner) {
              if (matchingHit.type === "RIFT") {
                // Mutate unit! Combat strength boosted!
                const newStrength = u.combatStrength + 10;
                
                // Add a cool event log entry
                prev.events.push({
                  id: generateUniqueId(`e_rift_${u.id}`),
                  turn: prev.turn,
                  timestamp: Date.now(),
                  type: "WORLD_NARRATIVE",
                  category: "NARRATIVE",
                  severity: "MAJOR",
                  source: "AI",
                  icon: "crown",
                  headline: `TEMPORAL RIFT SYNERGY OVER ${owner.name.toUpperCase()} UNIT!`,
                  summary: `A quantum-chronology rift merged with ${owner.name}'s unit at [${u.x}, ${u.y}]. Combat power increased to ${newStrength}!`,
                  primaryCiv: { id: owner.id, name: owner.name, color: owner.color },
                  locations: [{ x: u.x, y: u.y }],
                  showInTicker: true,
                  showInLog: true
                });

                return {
                  ...u,
                  combatStrength: newStrength,
                  health: 100 // Fully heals unit!
                };
              } else {
                // Shard: Give money and science
                owner.gold += 50;
                owner.science += 25;

                prev.events.push({
                  id: generateUniqueId(`e_shard_${u.id}`),
                  turn: prev.turn,
                  timestamp: Date.now(),
                  type: "WORLD_NARRATIVE",
                  category: "ECONOMY",
                  severity: "MINOR",
                  source: "SYSTEM",
                  icon: "star",
                  headline: `${owner.name} Secured a Chrono-Shard!`,
                  summary: `Crystalline timelines collected at [${u.x}, ${u.y}], conferring +50 Gold and +25 Science!`,
                  primaryCiv: { id: owner.id, name: owner.name, color: owner.color },
                  locations: [{ x: u.x, y: u.y }],
                  showInTicker: true,
                  showInLog: true
                });
              }
            }
          }
          return u;
        });

        return {
          ...prev,
          civs: nextCivs,
          units: nextUnits
        };
      });
    }

    // C. Spawn new anomalies periodically
    const novelty = getNoveltyValue(gameState.turn);
    // Spawns 1 to 2 anomalies if high novelty (score < 50), or randomly
    const spawnChance = novelty < 40 ? 0.85 : 0.40;
    if (Math.random() < spawnChance) {
      // Find a random unoccupied tile on the grid
      const candidates: { x: number, y: number }[] = [];
      for (let y = 1; y < MAP_HEIGHT - 1; y++) {
        for (let x = 1; x < MAP_WIDTH - 1; x++) {
          const tile = gameState.grid[y][x];
          const hasCity = gameState.cities.some(c => c.x === x && c.y === y);
          const hasUnit = gameState.units.some(u => u.x === x && u.y === y);
          const hasAnom = anomalies.some(a => a.x === x && a.y === y);
          if (tile.terrain !== "MOUNTAIN" && tile.terrain !== "OCEAN" && !hasCity && !hasUnit && !hasAnom) {
            candidates.push({ x, y });
          }
        }
      }

      if (candidates.length > 0) {
        const selected = candidates[Math.floor(Math.random() * candidates.length)];
        const isRift = Math.random() < 0.35; // 35% chance Rift, 65% chance Shard
        const newAnom = {
          id: generateUniqueId("anom"),
          x: selected.x,
          y: selected.y,
          type: isRift ? ("RIFT" as const) : ("SHARD" as const)
        };
        setAnomalies(prev => [...prev, newAnom].slice(-10)); // Maximum 10 anomalies on map
      }
    }
  }, [gameState.turn]);

  // New simulation phase states and resource overlay particles
  const [activePhase, setActivePhase] = useState<"IDLE" | "RESEARCH" | "GROWTH" | "MOVEMENT" | "DIPLOMACY">("IDLE");
  const [resourceEffects, setResourceEffects] = useState<{ id: string; text: string; color: string; x: number; y: number; createdAt: number }[]>([]);

  // Cleanup resource overlay particles after they float up
  useEffect(() => {
    const timer = setInterval(() => {
      setResourceEffects(prev => prev.filter(e => Date.now() - e.createdAt < 1200));
    }, 100);
    return () => clearInterval(timer);
  }, []);

  // Animation states
  const [hexPulses, setHexPulses] = useState<{ id: string, x: number, y: number, kind: "war" | "city" }[]>([]);
  const [borderGlows, setBorderGlows] = useState<{ id: string, civIds: string[], kind: "war" | "city" }[]>([]);
  const [combatArcs, setCombatArcs] = useState<{ from: {x:number,y:number}, to: {x:number,y:number}, id: string }[]>([]);

  // System Ref logs
  const simulationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isExecutingTurnRef = useRef(false);
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll log to bottom on new event
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTo({
        top: logContainerRef.current.scrollHeight,
        behavior: "smooth"
      });
    }
  }, [gameState.events.length]);

  const activeCiv = useMemo(() => {
    return gameState.civs.find(c => c.id === selectedCivId) || null;
  }, [gameState.civs, selectedCivId]);

  const speedDuration = useMemo(() => {
    switch (speed) {
      case "1x": return 4000;
      case "2x": return 2500;
      case "4x": return 1500;
      case "8x": return 800;
    }
  }, [speed]);

  // Handle auto-sim loop (optimized, removed turn dependency)
  useEffect(() => {
    if (isPlaying) {
      const timerFn = () => {
        executeSimulationTurn();
      };
      simulationTimerRef.current = setInterval(timerFn, speedDuration);
    } else {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
        simulationTimerRef.current = null;
      }
    }
    return () => {
      if (simulationTimerRef.current) {
        clearInterval(simulationTimerRef.current);
      }
    };
  }, [isPlaying, speedDuration]);

  // Onboarding sequence steps
  const ONBOARDING_STEPS = [
    {
      title: "Welcome to the 4X Spectator Dome!",
      desc: "Watch ancient civilizations expand, research, and declare dramatic wars in real-time. Everything is automated, featuring smart high-level strategic commands."
    },
    {
      title: "Visual Decision Overlays",
      desc: "Notice the icons above cities and strategy badges on leaders. Red glows highlight war fronts, while city roles represent production focus (🌾 Growth, ⚙️ Production, 🧪 Science)."
    },
    {
      title: "Interactive Interactive Map",
      desc: "Click any hex to reveal local defense modifiers, population yield, and owned boundaries. Or select a civilization from the leaderboard to highlight their territory."
    },
    {
      title: "Ancient Sports Ticker & Timeline",
      desc: "Follow the sports-commentary commentary at the bottom. Use the scrollbar to look back at major war declarations, peace agreements, and technological breakthroughs!"
    }
  ];

  // -----------------------------------------------------------------------------
  // Pathfinding and Movement Heuristics
  // -----------------------------------------------------------------------------
  function findPathToTarget(fromX: number, fromY: number, toX: number, toY: number): { x: number, y: number } | null {
    const neighbors = getNeighbors(fromX, fromY);
    let bestHex: { x: number, y: number } | null = null;
    let minDistance = getHexDistance(fromX, fromY, toX, toY);

    neighbors.forEach(n => {
      const dist = getHexDistance(n.x, n.y, toX, toY);
      if (dist < minDistance) {
        minDistance = dist;
        bestHex = n;
      }
    });

    return bestHex;
  }

  // Recalculate borders based on city positions
  function updateBorders(cities: City[], grid: HexTile[][]): HexTile[][] {
    const nextGrid = grid.map(row => row.map(tile => ({ ...tile, ownerCivId: null })));
    
    cities.forEach(city => {
      const neighbors1 = getNeighbors(city.x, city.y);
      const neighbors2 = neighbors1.flatMap(n => getNeighbors(n.x, n.y));
      const territories = [
        { x: city.x, y: city.y },
        ...neighbors1,
        ...neighbors2
      ];

      territories.forEach(pos => {
        const tile = nextGrid[pos.y]?.[pos.x];
        if (tile && tile.terrain !== "MOUNTAIN" && tile.terrain !== "OCEAN") {
          // If already claimed, closer city wins
          if (tile.ownerCivId) {
            const currentOwnerCity = cities.find(c => c.id === tile.cityId);
            if (currentOwnerCity) {
              const currentDist = getHexDistance(pos.x, pos.y, currentOwnerCity.x, currentOwnerCity.y);
              const nextDist = getHexDistance(pos.x, pos.y, city.x, city.y);
              if (nextDist < currentDist) {
                tile.ownerCivId = city.ownerId;
                tile.cityId = city.id;
              }
            }
          } else {
            tile.ownerCivId = city.ownerId;
            tile.cityId = city.id;
          }
        }
      });
    });

    return nextGrid;
  }

  // Find war front border hexes for clashing nations
  function findWarFrontHexes(grid: HexTile[][], civA: string, civB: string): { x: number, y: number }[] {
    const front: { x: number, y: number }[] = [];
    
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const tile = grid[y][x];
        if (tile.ownerCivId === civA) {
          const hasBNeighbor = getNeighbors(x, y).some(n => grid[n.y]?.[n.x]?.ownerCivId === civB);
          if (hasBNeighbor) front.push({ x, y });
        }
      }
    }
    return front;
  }

  // -----------------------------------------------------------------------------
  // Turn Simulation Loop (Deterministic engine guided by AI/Mock labels)
  // -----------------------------------------------------------------------------
  const executeSimulationTurn = async () => {
    if (isEschatonTriggered) {
      setIsPlaying(false);
      return;
    }
    if (isExecutingTurnRef.current) return;
    isExecutingTurnRef.current = true;

    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    // Phase 1: Research
    if (!isPlayingRef.current) { isExecutingTurnRef.current = false; setActivePhase("IDLE"); return; }
    setActivePhase("RESEARCH");
    await delay(300);
    if (!isPlayingRef.current) { isExecutingTurnRef.current = false; setActivePhase("IDLE"); return; }

    // Phase 2: City Growth & Economy
    if (!isPlayingRef.current) { isExecutingTurnRef.current = false; setActivePhase("IDLE"); return; }
    setActivePhase("GROWTH");
    
    // Spawn '+G' and '+S' floating overlays for all cities
    setGameState(prev => {
      const nextCivs = prev.civs;
      const newEffects: { id: string; text: string; color: string; x: number; y: number; createdAt: number }[] = [];
      prev.cities.forEach(city => {
        const owner = nextCivs.find(c => c.id === city.ownerId);
        if (!owner || owner.isDead) return;

        const isInd = city.role === "INDUSTRIAL_HUB";
        const isSci = city.role === "SCIENCE_CENTER";

        newEffects.push({
          id: generateUniqueId(`res_g_${city.id}`),
          text: `+${isInd ? 7 : 3}G`,
          color: "#FACC15", // Gold yellow
          x: city.x,
          y: city.y,
          createdAt: Date.now()
        });

        newEffects.push({
          id: generateUniqueId(`res_s_${city.id}`),
          text: `+${isSci ? 5 : 2}S`,
          color: "#A78BFA", // Violet/purple science
          x: city.x,
          y: city.y,
          createdAt: Date.now()
        });
      });
      if (newEffects.length > 0) {
        setResourceEffects(prevEff => [...prevEff, ...newEffects]);
      }
      return prev;
    });
    
    await delay(300);
    if (!isPlayingRef.current) { isExecutingTurnRef.current = false; setActivePhase("IDLE"); return; }

    // Phase 3: Unit Movement
    if (!isPlayingRef.current) { isExecutingTurnRef.current = false; setActivePhase("IDLE"); return; }
    setActivePhase("MOVEMENT");
    await delay(300);
    if (!isPlayingRef.current) { isExecutingTurnRef.current = false; setActivePhase("IDLE"); return; }

    // Phase 4: Diplomacy
    if (!isPlayingRef.current) { isExecutingTurnRef.current = false; setActivePhase("IDLE"); return; }
    setActivePhase("DIPLOMACY");
    await delay(300);
    if (!isPlayingRef.current) { isExecutingTurnRef.current = false; setActivePhase("IDLE"); return; }

    // Execute state transformations in single atomic transaction
    setGameState(prev => {
      const nextTurn = prev.turn + 1;
      const nextCivs = prev.civs.map(c => ({ ...c, uniqueId: c.uniqueId || `civ_${c.id}` }));
      let nextCities = prev.cities.map(c => ({ ...c, uniqueId: c.uniqueId || generateUniqueId(`city_${c.id}`), isUnderSiege: false }));
      let nextUnits = prev.units.map(u => ({ ...u, uniqueId: u.uniqueId || generateUniqueId(`unit_${u.id}`), hasMoved: false }));
      let nextGrid = prev.grid.map(row => row.map(tile => ({ ...tile })));
      const newEvents: GameEvent[] = [];

      // A. Research progress & Gold accumulation
      nextCivs.forEach(civ => {
        if (civ.isDead) return;

        // Base Science + City bonuses
        const civCities = nextCities.filter(c => c.ownerId === civ.id);
        const scienceIncome = 3 + civCities.length * 2 + civCities.filter(c => c.role === "SCIENCE_CENTER").length * 3;
        civ.science += scienceIncome;

        // Base Gold + City bonuses (Proper active Gold accumulation!)
        const goldIncome = 5 + civCities.length * 3 + civCities.filter(c => c.role === "INDUSTRIAL_HUB").length * 4;
        civ.gold += goldIncome;

        const currentTechObj = TECHNOLOGIES.find(t => t.id === civ.currentTech);
        if (currentTechObj && civ.science >= currentTechObj.cost) {
          // Tech Researched!
          civ.science -= currentTechObj.cost;
          civ.researchedTechs.push(civ.currentTech);
          
          newEvents.push({
            id: generateUniqueId(`e_tech_${civ.id}`),
            turn: nextTurn,
            timestamp: Date.now(),
            type: "TECH_RESEARCHED",
            category: "TECH",
            severity: "MINOR",
            source: "AI",
            icon: "beaker",
            headline: `${civ.name} researched ${civ.currentTech}!`,
            summary: `${civ.name} has unlocked ${currentTechObj.name}. Benefit: ${currentTechObj.benefits}.`,
            primaryCiv: { id: civ.id, name: civ.name, color: civ.color },
            showInTicker: true,
            showInLog: true
          });

          // Automatically pick next technology based on ResearchTheme AI direction
          const availableTechs = TECHNOLOGIES.filter(t => !civ.researchedTechs.includes(t.id) && t.id !== civ.currentTech);
          if (availableTechs.length > 0) {
            // Prefer techs matching active AI theme
            const themeTechs = availableTechs.filter(t => t.theme === civ.researchTheme);
            const chosen = themeTechs.length > 0 ? themeTechs[0] : availableTechs[0];
            civ.currentTech = chosen.id;
          } else {
            civ.currentTech = "Completed Technology Tree";
          }
        }
      });

      // B. City management
      nextCities.forEach(city => {
        const owner = nextCivs.find(c => c.id === city.ownerId);
        if (!owner || owner.isDead) return;

        // 1. Food and Growth (with climate modifiers)
        const tile = nextGrid[city.y]?.[city.x];
        const climate = getTileClimate(city.x, city.y, tile?.terrain || "GRASS");
        
        let climateModifier = 1.0;
        if (climate.temperature >= 45 && climate.temperature <= 75 && climate.humidity >= 45 && climate.humidity <= 80) {
          climateModifier = 1.35; // Temperate Oasis bonus
        } else if (climate.temperature > 85 || climate.temperature < 20 || climate.humidity < 15) {
          climateModifier = 0.60; // Extreme weather penalty
        } else if (climate.temperature < 35 || climate.humidity < 30) {
          climateModifier = 0.85; // Minor cold/arid penalty
        }

        let foodIncome = 3;
        if (city.role === "CORE_GROWTH") foodIncome += 3;
        foodIncome = Math.round(foodIncome * climateModifier);
        city.foodProgress += foodIncome;

        const growthCost = city.population * 15;
        if (city.foodProgress >= growthCost) {
          city.population += 1;
          city.foodProgress = 0;
          
          newEvents.push({
            id: generateUniqueId(`e_growth_${city.id}`),
            turn: nextTurn,
            timestamp: Date.now(),
            type: "CITY_FOUNDED",
            category: "CITY",
            severity: "MINOR",
            source: "SYSTEM",
            icon: "city",
            headline: `${city.name} grew to Population ${city.population}!`,
            summary: `Under the role of ${city.role}, regional developers have expanded housing capabilities and food storage.`,
            primaryCiv: { id: owner.id, name: owner.name, color: owner.color },
            city: { id: city.id, name: city.name, ownerId: city.ownerId, location: { x: city.x, y: city.y } },
            showInTicker: false,
            showInLog: true
          });
        }

        // 2. Production
        let prodIncome = 3;
        if (city.role === "INDUSTRIAL_HUB") prodIncome += 3;
        city.productionProgress += prodIncome;

        // Decide builds based on role
        if (!city.currentBuild) {
          if (city.role === "FORTRESS_BORDER" && !nextGrid[city.y][city.x].improvement) {
            city.currentBuild = "WALLS";
          } else if (city.role === "CORE_GROWTH" && nextCities.filter(c => c.ownerId === owner.id).length < 3) {
            city.currentBuild = "SETTLER";
          } else {
            city.currentBuild = Math.random() < 0.5 ? "WARRIOR" : "ARCHER";
          }
          city.productionProgress = 0;
        }

        const buildCost = city.currentBuild === "SETTLER" ? 45 : city.currentBuild === "WALLS" ? 30 : 25;
        if (city.productionProgress >= buildCost) {
          // Completed build!
          const buildType = city.currentBuild;
          city.currentBuild = "";
          city.productionProgress = 0;

          if (buildType === "WALLS") {
            nextGrid[city.y][city.x].improvement = "WALLS";
            newEvents.push({
              id: generateUniqueId(`e_build_${city.id}`),
              turn: nextTurn,
              timestamp: Date.now(),
              type: "CITY_FOUNDED",
              category: "CITY",
              severity: "MINOR",
              source: "SYSTEM",
              icon: "tower",
              headline: `${city.name} built Border Walls!`,
              summary: "A heavy stone perimeter has been fortified around the regional stronghold to absorb heavy defensive attacks.",
              primaryCiv: { id: owner.id, name: owner.name, color: owner.color },
              city: { id: city.id, name: city.name, ownerId: city.ownerId, location: { x: city.x, y: city.y } },
              showInLog: true
            });
          } else {
            // Spawn Unit adjacent to city
            const neighbors = getNeighbors(city.x, city.y);
            const freeHex = neighbors.find(n => !nextUnits.some(u => u.x === n.x && u.y === n.y) && nextGrid[n.y]?.[n.x]?.terrain !== "MOUNTAIN" && nextGrid[n.y]?.[n.x]?.terrain !== "OCEAN");
            
            if (freeHex) {
              const uId = generateUniqueId(`u_${owner.id}`);
              nextUnits.push({
                id: uId,
                uniqueId: generateUniqueId(`unit_${owner.id}`),
                type: buildType as UnitType,
                ownerId: owner.id,
                x: freeHex.x,
                y: freeHex.y,
                health: 100,
                hasMoved: true,
                combatStrength: buildType === "SETTLER" ? 0 : buildType === "ARCHER" ? 14 : 12
              });

              newEvents.push({
                id: generateUniqueId(`e_spawn_${uId}`),
                turn: nextTurn,
                timestamp: Date.now(),
                type: "UNIT_CREATED",
                category: "COMBAT",
                severity: "MINOR",
                source: "SYSTEM",
                icon: buildType === "SETTLER" ? "shield" : "swords",
                headline: `${owner.name} fielded a new ${buildType}!`,
                summary: `Mobilized from the regional base at ${city.name} to enforce active strategy mandates.`,
                primaryCiv: { id: owner.id, name: owner.name, color: owner.color },
                locations: [{ x: freeHex.x, y: freeHex.y }],
                showInLog: true
              });
            }
          }
        }
      });

      // C. Unit decisions & Movement heuristics
      nextUnits = nextUnits.filter(u => {
        const owner = nextCivs.find(c => c.id === u.ownerId);
        if (!owner || owner.isDead) return false; // Clean up deceased factions

        // Weather/Climate delay check (Extreme cold or torrid heat slows down logistics)
        const currentTile = nextGrid[u.y]?.[u.x];
        const climate = getTileClimate(u.x, u.y, currentTile?.terrain || "GRASS");
        const isExtremeWeather = climate.temperature < 25 || climate.temperature > 85 || climate.humidity < 12;
        
        if (isExtremeWeather && Math.random() < 0.3) {
          newEvents.push({
            id: generateUniqueId(`e_weather_delay_${u.id}_${nextTurn}`),
            turn: nextTurn,
            timestamp: Date.now(),
            type: "WORLD_NARRATIVE",
            category: "COMBAT",
            severity: "MINOR",
            source: "SYSTEM",
            icon: "scroll",
            headline: `${owner.name.toUpperCase()} UNIT DELAYED BY WEATHER!`,
            summary: `Severe weather elements (Temp: ${climate.temperature}°C, Hum: ${climate.humidity}%) near [${u.x}, ${u.y}] have stalled the movement of the active ${u.type}. Logistics remain frozen until regional conditions clear.`,
            primaryCiv: { id: owner.id, name: owner.name, color: owner.color },
            locations: [{ x: u.x, y: u.y }],
            showInLog: true
          });
          return true; // Bypasses movement for this turn, keeping unit alive
        }

        const oldX = u.x;
        const oldY = u.y;

        // 1. Settler heuristic: find a valid settling spot (fertile, dist >= 3 from other cities)
        if (u.type === "SETTLER") {
          const isTooClose = nextCities.some(c => getHexDistance(u.x, u.y, c.x, c.y) < 3);
          const isFertile = nextGrid[u.y]?.[u.x]?.terrain === "GRASS" || nextGrid[u.y]?.[u.x]?.terrain === "FOREST" || nextGrid[u.y]?.[u.x]?.terrain === "RIVER";
          
          if (!isTooClose && isFertile) {
            // Found city!
            const names = CITY_NAMES[owner.id];
            const nameIdx = nextCities.filter(c => c.ownerId === owner.id).length;
            const cityName = names[nameIdx % names.length];
            const cityId = generateUniqueId(`c_${owner.id}`);

            nextCities.push({
              id: cityId,
              uniqueId: generateUniqueId(`city_${owner.id}`),
              name: cityName,
              ownerId: owner.id,
              x: u.x,
              y: u.y,
              population: 1,
              role: nameIdx === 0 ? "CORE_GROWTH" : "INDUSTRIAL_HUB",
              currentBuild: "",
              productionProgress: 0,
              foodProgress: 0,
              isUnderSiege: false
            });

            newEvents.push({
              id: generateUniqueId(`e_found_${cityId}`),
              turn: nextTurn,
              timestamp: Date.now(),
              type: "CITY_FOUNDED",
              category: "CITY",
              severity: "MAJOR",
              source: "AI",
              icon: "city",
              headline: `${owner.name} founded ${cityName}!`,
              summary: `${owner.name} claims regional borders at coordinate [${u.x}, ${u.y}], starting immediate population growth cycles.`,
              primaryCiv: { id: owner.id, name: owner.name, color: owner.color },
              city: { id: cityId, name: cityName, ownerId: owner.id, location: { x: u.x, y: u.y } },
              showInTicker: true,
              showInLog: true,
              locations: [{ x: u.x, y: u.y }],
              focusLocation: { x: u.x, y: u.y }
            });

            // Trigger visual pulses
            triggerHexPulse(u.x, u.y, "city");

            return false; // Settler is consumed
          } else {
            // Find path to suitable hex
            let targetX = u.x;
            let targetY = u.y;
            let bestWeight = -999;

            for (let y = 1; y < MAP_HEIGHT - 1; y++) {
              for (let x = 1; x < MAP_WIDTH - 1; x++) {
                const tile = nextGrid[y][x];
                if (tile.terrain === "MOUNTAIN" || tile.terrain === "OCEAN") continue;
                
                const distToCities = nextCities.map(c => getHexDistance(x, y, c.x, c.y));
                const minDist = distToCities.length > 0 ? Math.min(...distToCities) : 99;

                if (minDist >= 3) {
                  let weight = minDist * 2;
                  if (tile.terrain === "RIVER" || tile.terrain === "GRASS") weight += 5;
                  if (weight > bestWeight) {
                    bestWeight = weight;
                    targetX = x;
                    targetY = y;
                  }
                }
              }
            }

            const step = findPathToTarget(u.x, u.y, targetX, targetY);
            if (step) {
              u.x = step.x;
              u.y = step.y;
            }
          }
        }
        
        // 2. Military Units: roam or hunt
        else {
          // Combat targets check
          const adjacent = getNeighbors(u.x, u.y);
          
          // Check for adjacent enemy units or cities that we are at war with
          let hasAttacked = false;
          for (const adj of adjacent) {
            // Target unit check
            const enemyUnit = nextUnits.find(enemy => {
              if (enemy.ownerId === u.ownerId || enemy.x !== adj.x || enemy.y !== adj.y) return false;
              const relation = owner.warPlans[enemy.ownerId];
              return relation && relation !== "NONE";
            });

            if (enemyUnit) {
              // Attack!
              resolveCombat(u, enemyUnit, nextTurn, newEvents, nextCivs);
              hasAttacked = true;
              break;
            }

            // Target city check
            const enemyCity = nextCities.find(c => {
              if (c.ownerId === u.ownerId || c.x !== adj.x || c.y !== adj.y) return false;
              const relation = owner.warPlans[c.ownerId];
              return relation && relation !== "NONE";
            });

            if (enemyCity) {
              // Siege City
              enemyCity.isUnderSiege = true;
              resolveCitySiege(u, enemyCity, nextTurn, newEvents, nextCivs);
              hasAttacked = true;
              break;
            }
          }

          if (!hasAttacked) {
            // No adjacent targets, move towards enemy boundaries or explore gaps
            let targetX = u.x;
            let targetY = u.y;
            let minTargetDist = 999;

            // Target active war plans
            const activeWars = Object.keys(owner.warPlans).filter(id => owner.warPlans[id] !== "NONE");
            if (activeWars.length > 0) {
              // Hunt down closest enemy city
              const enemyCities = nextCities.filter(c => activeWars.includes(c.ownerId));
              enemyCities.forEach(ec => {
                const dist = getHexDistance(u.x, u.y, ec.x, ec.y);
                if (dist < minTargetDist) {
                  minTargetDist = dist;
                  targetX = ec.x;
                  targetY = ec.y;
                }
              });
            } else {
              // Peaceful scouting: move towards center mountains or random undiscovered tiles
              targetX = Math.floor(MAP_WIDTH / 2) + Math.floor(Math.random() * 3) - 1;
              targetY = Math.floor(MAP_HEIGHT / 2) + Math.floor(Math.random() * 3) - 1;
            }

            const step = findPathToTarget(u.x, u.y, targetX, targetY);
            if (step) {
              // Ensure we do not step on mountains or adjacent friends
              const isBlocked = nextUnits.some(other => other.x === step.x && other.y === step.y) || 
                                nextGrid[step.y]?.[step.x]?.terrain === "MOUNTAIN";
              if (!isBlocked) {
                u.x = step.x;
                u.y = step.y;
              }
            }
          }
        }

        if (u.x !== oldX || u.y !== oldY) {
          const currentHistory = u.pathHistory || [];
          u.pathHistory = [...currentHistory, { x: oldX, y: oldY }].slice(-2);
        }

        return true;
      });

      // D. Score and territory updates
      nextGrid = updateBorders(nextCities, nextGrid);
      nextCivs.forEach(civ => {
        if (civ.isDead) return;

        const territoryCount = nextGrid.flat().filter(tile => tile.ownerCivId === civ.id).length;
        const citiesCount = nextCities.filter(c => c.ownerId === civ.id).length;
        const unitsCount = nextUnits.filter(u => u.ownerId === civ.id).length;

        civ.score = territoryCount + citiesCount * 4 + unitsCount * 2 + civ.researchedTechs.length * 5;

        // Faction is eliminated if it loses all cities
        if (citiesCount === 0 && nextTurn > 5) {
          civ.isDead = true;
          newEvents.push({
            id: generateUniqueId(`e_elim_${civ.id}`),
            turn: nextTurn,
            timestamp: Date.now(),
            type: "CIV_ELIMINATED",
            category: "DIPLOMACY",
            severity: "CINEMATIC",
            source: "SYSTEM",
            icon: "heart-crack",
            headline: `${civ.name} has fallen!`,
            summary: `All strongholds of ${civ.name} were captured or destroyed. Their culture vanishes into legend.`,
            primaryCiv: { id: civ.id, name: civ.name, color: civ.color },
            showInTicker: true,
            showInLog: true
          });
        }
      });

      // E. Check for automatic AI strategic and diplomacy triggers on Turn ticks
      if (nextTurn % 10 === 0) {
        triggerGeminiStrategicCall({
          turn: nextTurn,
          civs: nextCivs,
          cities: nextCities,
          units: nextUnits
        });
      } else {
        // Resolve random minor automated diplomatic interactions (trade offers, alliances, peace treaty propositions)
        resolveSubturnDiplomacy(nextCivs, nextCities, nextTurn, newEvents);
      }

      // F. Construct final Turn summary
      const hasWar = newEvents.some(e => e.type === "WAR_DECLARED" || e.type === "PEACE_DECLARED");
      const hasCityChange = newEvents.some(e => e.type === "CITY_CAPTURED" || e.type === "CITY_FOUNDED");
      const hasTech = newEvents.some(e => e.type === "TECH_RESEARCHED");

      const turnSummary: TurnSummary = {
        uniqueId: generateUniqueId(`ts_${nextTurn}`),
        turn: nextTurn,
        majorEvents: newEvents.filter(e => e.severity === "CINEMATIC" || e.severity === "MAJOR").map(e => e.id),
        hasWar,
        hasCityChange,
        hasTech
      };

      // Set camera focuses on dramatic events
      const focusEvent = newEvents.find(e => e.severity === "CINEMATIC" || e.severity === "MAJOR");
      if (focusEvent) {
        if (focusEvent.focusLocation) setCameraFocus(focusEvent.focusLocation);
        setActiveCinematic(focusEvent);
      }

      const mergedEvents = [...prev.events, ...newEvents].map(e => e.uniqueId ? e : { ...e, uniqueId: generateUniqueId(`ue_${e.id || 'event'}`) });
      const mergedSummaries = [...prev.turnSummaries, turnSummary].map(s => s.uniqueId ? s : { ...s, uniqueId: generateUniqueId(`us_${s.turn}`) });

      return {
        ...prev,
        turn: nextTurn,
        grid: nextGrid,
        civs: nextCivs,
        cities: nextCities,
        units: nextUnits,
        events: mergedEvents,
        turnSummaries: mergedSummaries
      };
    });

    isExecutingTurnRef.current = false;
  };

  // -----------------------------------------------------------------------------
  // Combat Mechanics & Resolution Heuristics
  // -----------------------------------------------------------------------------
  function resolveCombat(attacker: Unit, defender: Unit, turn: number, events: GameEvent[], civs: Civilization[]) {
    const diceRoll = Math.floor(Math.random() * 6) + 1;
    const baseDamage = 25 + diceRoll * 5;
    
    // Attacker deals damage
    defender.health = Math.max(0, defender.health - baseDamage);
    // Defender counters
    attacker.health = Math.max(0, attacker.health - Math.floor(baseDamage * 0.4));

    // Render combat visual effect lines
    triggerCombatArc(attacker, defender);

    events.push({
      id: generateUniqueId(`e_combat_${attacker.id}_${defender.id}`),
      turn,
      timestamp: Date.now(),
      type: "BATTLE_RESOLVED",
      category: "COMBAT",
      severity: "MINOR",
      source: "SYSTEM",
      icon: "swords",
      headline: `Clash near boundary [${defender.x}, ${defender.y}]`,
      summary: `Attacking ${attacker.type} struck defending ${defender.type} causing severe health damage. Defender health sits at ${defender.health}%.`,
      locations: [{ x: attacker.x, y: attacker.y }, { x: defender.x, y: defender.y }],
      showInLog: true
    });

    const getXpThreshold = (lvl: number) => {
      if (lvl === 1) return 50;
      if (lvl === 2) return 120;
      if (lvl === 3) return 200;
      return lvl * 100;
    };

    const awardXpAndCheckLevelUp = (unit: Unit, xpGained: number) => {
      const currentLevel = unit.level || 1;
      const currentXp = unit.xp || 0;
      const newXp = currentXp + xpGained;
      unit.xp = newXp;
      unit.level = currentLevel;

      const threshold = getXpThreshold(currentLevel);
      if (newXp >= threshold) {
        const nextLevel = currentLevel + 1;
        unit.level = nextLevel;
        unit.xp = newXp - threshold;

        // Increase combat strength by +3 and fully heal
        unit.combatStrength = (unit.combatStrength || 12) + 3;
        unit.health = 100;

        const owner = civs.find(c => c.id === unit.ownerId);
        const ownerName = owner ? owner.name : "Unknown";

        events.push({
          id: generateUniqueId(`e_promote_${unit.id}_${nextLevel}`),
          turn,
          timestamp: Date.now(),
          type: "WORLD_NARRATIVE",
          category: "COMBAT",
          severity: "MAJOR",
          source: "SYSTEM",
          icon: "star",
          headline: `VETERAN PROMOTION: ${ownerName.toUpperCase()} ${unit.type}!`,
          summary: `The battalion reached Level ${nextLevel} (${
            nextLevel === 2 ? "Veteran" : nextLevel === 3 ? "Elite" : "Heroic Sovereign"
          }). Base combat strength raised by +3 (total ${unit.combatStrength}) with a full restoration of health.`,
          locations: [{ x: unit.x, y: unit.y }],
          showInTicker: true,
          showInLog: true
        });
      }
    };

    // XP Distribution logic based on combat outcome
    if (defender.health <= 0 && attacker.health > 0) {
      // Attacker obliterated defender
      awardXpAndCheckLevelUp(attacker, 45); // Heavy victor bonus
      
      events.push({
        id: generateUniqueId(`e_kill_${defender.id}`),
        turn,
        timestamp: Date.now(),
        type: "UNIT_DESTROYED",
        category: "COMBAT",
        severity: "MINOR",
        source: "SYSTEM",
        icon: "skull",
        headline: `Defending ${defender.type} was obliterated!`,
        summary: `The battalion succumbed to heavy forces and has been cleared from active visual theater.`,
        locations: [{ x: defender.x, y: defender.y }],
        showInLog: true
      });
    } else if (attacker.health <= 0 && defender.health > 0) {
      // Defender killed attacker on counter
      awardXpAndCheckLevelUp(defender, 45); // Heavy defender victor bonus
    } else if (attacker.health > 0 && defender.health > 0) {
      // Both survived: Skirmish skirmishers
      awardXpAndCheckLevelUp(attacker, 20);
      awardXpAndCheckLevelUp(defender, 20);
    }
  }

  function resolveCitySiege(attacker: Unit, city: City, turn: number, events: GameEvent[], civs: Civilization[]) {
    const diceRoll = Math.floor(Math.random() * 6) + 1;
    const damage = Math.floor((15 + diceRoll * 4) * (attacker.type === "LEGION" ? 1.5 : 1.0));
    
    city.population = Math.max(1, city.population);
    city.foodProgress = Math.max(0, city.foodProgress - damage);
    
    // Give direct feedback to the city banner glow
    triggerHexPulse(city.x, city.y, "war");
    triggerCombatArc(attacker, city);

    // Inflict city base defense back on attacker
    attacker.health = Math.max(0, attacker.health - 12);

    events.push({
      id: generateUniqueId(`e_siege_${city.id}`),
      turn,
      timestamp: Date.now(),
      type: "BATTLE_RESOLVED",
      category: "COMBAT",
      severity: "MINOR",
      source: "SYSTEM",
      icon: "tower",
      headline: `${city.name} under Heavy Siege!`,
      summary: `Attacking legion forces breach the outer walls. Local defenses countered forcefully, but resources are dwindling.`,
      locations: [{ x: city.x, y: city.y }],
      showInLog: true
    });

    // Check city falling under 10 health / complete capture
    if (Math.random() < 0.25) {
      // Capture City!
      const oldOwnerId = city.ownerId;
      city.ownerId = attacker.ownerId;
      city.population = Math.max(1, Math.floor(city.population * 0.7)); // Population reduction due to sack
      city.role = "INDUSTRIAL_HUB"; // Set back to base industrial rebuilding

      const capturerCiv = civs.find(c => c.id === attacker.ownerId);
      const loserCiv = civs.find(c => c.id === oldOwnerId);

      if (capturerCiv && loserCiv) {
        events.push({
          id: generateUniqueId(`e_cap_${city.id}`),
          turn,
          timestamp: Date.now(),
          type: "CITY_CAPTURED",
          category: "CITY",
          severity: "CINEMATIC",
          source: "SYSTEM",
          icon: "city",
          headline: `${capturerCiv.name} seizes ${city.name} from ${loserCiv.name}!`,
          summary: `${capturerCiv.name} captures the city of ${city.name}, pushing ${loserCiv.name} back and reshaping the frontline coordinates.`,
          primaryCiv: { id: capturerCiv.id, name: capturerCiv.name, color: capturerCiv.color },
          secondaryCiv: { id: loserCiv.id, name: loserCiv.name, color: loserCiv.color },
          city: { id: city.id, name: city.name, ownerId: capturerCiv.id, location: { x: city.x, y: city.y } },
          locations: [{ x: city.x, y: city.y }],
          focusLocation: { x: city.x, y: city.y },
          showInTicker: true,
          showInLog: true,
          triggerCinematic: true
        });

        // Trigger heavy border glow surge
        triggerBorderGlow([capturerCiv.id, loserCiv.id], "city");
      }
    }
  }

  // -----------------------------------------------------------------------------
  // Diplomatic Subturn Interactions
  // -----------------------------------------------------------------------------
  function resolveSubturnDiplomacy(civs: Civilization[], cities: City[], turn: number, events: GameEvent[]) {
    // Look for minor random deals to facilitate
    civs.forEach(c => {
      if (c.isDead) return;

      civs.forEach(o => {
        if (o.id === c.id || o.isDead) return;

        const posture = c.diplomaticPostures[o.id];
        const isAtWar = c.warPlans[o.id] && c.warPlans[o.id] !== "NONE";

        if (isAtWar) {
          // If posture was changed to friendly, sign Peace Treaty!
          if (posture === "FRIENDLY" || posture === "ALLY") {
            c.warPlans[o.id] = "NONE";
            o.warPlans[c.id] = "NONE";
            c.diplomaticPostures[o.id] = "NEUTRAL";
            o.diplomaticPostures[c.id] = "NEUTRAL";

            events.push({
              id: generateUniqueId(`e_peace_${c.id}_${o.id}`),
              turn,
              timestamp: Date.now(),
              type: "PEACE_DECLARED",
              category: "DIPLOMACY",
              severity: "MAJOR",
              source: "AI",
              icon: "handshake",
              headline: `Peace Treaty Signed between ${c.name} and ${o.name}!`,
              summary: `Exhausted by prolonged siege battles, diplomats convened at a high-summit and agreed on immediate non-aggression pacts.`,
              primaryCiv: { id: c.id, name: c.name, color: c.color },
              secondaryCiv: { id: o.id, name: o.name, color: o.color },
              showInTicker: true,
              showInLog: true
            });
          }
        } else {
          // Check for Alliance proposals
          if (posture === "ALLY" && o.diplomaticPostures[c.id] === "ALLY" && Math.random() < 0.08) {
            c.diplomaticPostures[o.id] = "ALLY";
            o.diplomaticPostures[c.id] = "ALLY";

            events.push({
              id: generateUniqueId(`e_alliance_${c.id}_${o.id}`),
              turn,
              timestamp: Date.now(),
              type: "ALLIANCE_FORGED",
              category: "DIPLOMACY",
              severity: "MAJOR",
              source: "AI",
              icon: "handshake",
              headline: `Sacred Alliance Sealed: ${c.name} & ${o.name}!`,
              summary: `Under shared prosperity guidelines, both factions have agreed to defend each other's cities against hostile target campaigns.`,
              primaryCiv: { id: c.id, name: c.name, color: c.color },
              secondaryCiv: { id: o.id, name: o.name, color: o.color },
              showInTicker: true,
              showInLog: true
            });
          }

          // Automated trade offers
          if (posture === "FRIENDLY" && Math.random() < 0.05 && c.gold >= 30) {
            c.gold -= 20;
            o.gold += 20;
            
            events.push({
              id: generateUniqueId(`e_trade_${c.id}_${o.id}`),
              turn,
              timestamp: Date.now(),
              type: "SCORE_CHANGE",
              category: "ECONOMY",
              severity: "MINOR",
              source: "AI",
              icon: "star",
              headline: `Resource Trade Pact: ${c.name} and ${o.name}`,
              summary: `${c.name} traded 20 Gold to ${o.name} in exchange for iron workings and science blueprints.`,
              primaryCiv: { id: c.id, name: c.name, color: c.color },
              secondaryCiv: { id: o.id, name: o.name, color: o.color },
              showInLog: true
            });
          }
        }
      });
    });
  }

  // -----------------------------------------------------------------------------
  // Visual Feedback Orchestrators
  // -----------------------------------------------------------------------------
  function triggerHexPulse(x: number, y: number, kind: "war" | "city") {
    const id = `pulse_${Date.now()}_${Math.random()}`;
    setHexPulses(prev => [...prev, { id, x, y, kind }]);
    setTimeout(() => {
      setHexPulses(prev => prev.filter(p => p.id !== id));
    }, 2200);
  }

  function triggerBorderGlow(civIds: string[], kind: "war" | "city") {
    const id = `glow_${Date.now()}_${Math.random()}`;
    setBorderGlows(prev => [...prev, { id, civIds, kind }]);
    setTimeout(() => {
      setBorderGlows(prev => prev.filter(b => b.id !== id));
    }, 2500);
  }

  function triggerCombatArc(from: {x:number,y:number}, to: {x:number,y:number}) {
    const id = `arc_${Date.now()}_${Math.random()}`;
    setCombatArcs(prev => [...prev, { from, to, id }]);
    setTimeout(() => {
      setCombatArcs(prev => prev.filter(a => a.id !== id));
    }, 1200);
  }

  // -----------------------------------------------------------------------------
  // Gemini API Caller
  // -----------------------------------------------------------------------------
  const triggerGeminiStrategicCall = async (payloadState: any) => {
    setGameState(prev => ({ ...prev, isAiDeciding: true }));

    try {
      const response = await fetch("/api/gemini/decide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadState)
      });
      
      if (!response.ok) throw new Error("API call returned status " + response.status);
      const data = await response.json();

      setGameState(prev => {
        const nextCivs = prev.civs.map(civ => {
          const decisions = data.civs.find((dec: any) => dec.id === civ.id);
          if (decisions && !civ.isDead) {
            
            // Check for newly declared wars from previous peace state to trigger cinematics
            Object.keys(decisions.warPlans).forEach(enemyId => {
              const previousWar = civ.warPlans[enemyId] !== "NONE";
              const nextWar = decisions.warPlans[enemyId] && decisions.warPlans[enemyId] !== "NONE";
              
              if (!previousWar && nextWar) {
                const enemyObj = prev.civs.find(e => e.id === enemyId);
                if (enemyObj && !enemyObj.isDead) {
                  // Push a cinematic event!
                  const warEvent: GameEvent = {
                    id: generateUniqueId(`e_war_${civ.id}_${enemyId}`),
                    turn: prev.turn,
                    timestamp: Date.now(),
                    type: "WAR_DECLARED",
                    category: "DIPLOMACY",
                    severity: "CINEMATIC",
                    source: "AI",
                    icon: "swords",
                    headline: `WAR DECLARED: ${civ.name} marches on ${enemyObj.name}!`,
                    summary: `Tensions boil over. Julius Caesar and regional war generals order mobilized legions to strike border strongholds of ${enemyObj.name}.`,
                    primaryCiv: { id: civ.id, name: civ.name, color: civ.color },
                    secondaryCiv: { id: enemyObj.id, name: enemyObj.name, color: enemyObj.color },
                    locations: findWarFrontHexes(prev.grid, civ.id, enemyId),
                    focusLocation: { x: civ.id === "rome" ? 3 : 10, y: 4 },
                    showInTicker: true,
                    showInLog: true,
                    triggerCinematic: true
                  };
                  prev.events.push(warEvent);
                  setActiveCinematic(warEvent);
                  triggerHexPulse(civ.id === "rome" ? 4 : 9, 4, "war");
                }
              }
            });

            return {
              ...civ,
              grandStrategy: decisions.grandStrategy as GrandStrategy,
              researchTheme: decisions.researchTheme as ResearchTheme,
              explorationFocus: decisions.explorationFocus as ExplorationFocus,
              diplomaticPostures: decisions.diplomaticPostures,
              warPlans: decisions.warPlans
            };
          }
          return civ;
        });

        // Resolve city role updates
        const nextCities = prev.cities.map(city => {
          const ownerDecisions = data.civs.find((dec: any) => dec.id === city.ownerId);
          if (ownerDecisions && ownerDecisions.cityRoles?.[city.name]) {
            return {
              ...city,
              role: ownerDecisions.cityRoles[city.name] as CityRole
            };
          }
          return city;
        });

        // worldNarrator event logs
        const narratorEvent: GameEvent = {
          id: generateUniqueId("e_narrator"),
          turn: prev.turn,
          timestamp: Date.now(),
          type: "WORLD_NARRATIVE",
          category: "NARRATIVE",
          severity: "MAJOR",
          source: "AI",
          icon: "scroll",
          headline: data.worldNarrator.headline,
          summary: data.worldNarrator.summary,
          showInTicker: true,
          showInLog: true
        };

        return {
          ...prev,
          civs: nextCivs,
          cities: nextCities,
          events: [...prev.events, narratorEvent],
          isAiDeciding: false
        };
      });

    } catch (err) {
      console.warn("Error resolving Gemini API payload:", err);
      setGameState(prev => ({ ...prev, isAiDeciding: false }));
    }
  };

  const resetSimulation = () => {
    const startPositions = getDynamicStartingPositions();
    const grid = generateInitialGrid(startPositions);
    
    // Starting units
    const initialUnits: Unit[] = [
      // Rome
      { id: "u_rome_s", uniqueId: "unit_u_rome_s", type: "SETTLER", ownerId: "rome", x: startPositions.rome.x, y: startPositions.rome.y, health: 100, hasMoved: false, combatStrength: 0 },
      { id: "u_rome_w", uniqueId: "unit_u_rome_w", type: "WARRIOR", ownerId: "rome", x: startPositions.rome.x + 1, y: startPositions.rome.y, health: 100, hasMoved: false, combatStrength: 12 },
      // Han
      { id: "u_han_s", uniqueId: "unit_u_han_s", type: "SETTLER", ownerId: "han", x: startPositions.han.x, y: startPositions.han.y, health: 100, hasMoved: false, combatStrength: 0 },
      { id: "u_han_w", uniqueId: "unit_u_han_w", type: "WARRIOR", ownerId: "han", x: startPositions.han.x - 1, y: startPositions.han.y, health: 100, hasMoved: false, combatStrength: 12 },
      // Maya
      { id: "u_maya_s", uniqueId: "unit_u_maya_s", type: "SETTLER", ownerId: "maya", x: startPositions.maya.x, y: startPositions.maya.y, health: 100, hasMoved: false, combatStrength: 0 },
      { id: "u_maya_w", uniqueId: "unit_u_maya_w", type: "WARRIOR", ownerId: "maya", x: startPositions.maya.x + 1, y: startPositions.maya.y, health: 100, hasMoved: false, combatStrength: 12 },
      // Viking
      { id: "u_viking_s", uniqueId: "unit_u_viking_s", type: "SETTLER", ownerId: "viking", x: startPositions.viking.x, y: startPositions.viking.y, health: 100, hasMoved: false, combatStrength: 0 },
      { id: "u_viking_w", uniqueId: "unit_u_viking_w", type: "WARRIOR", ownerId: "viking", x: startPositions.viking.x - 1, y: startPositions.viking.y, health: 100, hasMoved: false, combatStrength: 12 }
    ];

    // Force warrior positions to be valid neighbors
    const warriorSetups = [
      { id: "u_rome_w", x: startPositions.rome.x, y: startPositions.rome.y },
      { id: "u_han_w", x: startPositions.han.x, y: startPositions.han.y },
      { id: "u_maya_w", x: startPositions.maya.x, y: startPositions.maya.y },
      { id: "u_viking_w", x: startPositions.viking.x, y: startPositions.viking.y }
    ];

    warriorSetups.forEach(w => {
      const neighbors = getNeighbors(w.x, w.y);
      const suitable = neighbors.find(n => grid[n.y]?.[n.x]?.terrain !== "MOUNTAIN" && grid[n.y]?.[n.x]?.terrain !== "OCEAN");
      const unit = initialUnits.find(u => u.id === w.id);
      if (unit && suitable) {
        unit.x = suitable.x;
        unit.y = suitable.y;
      }
    });

    const initialEvent: GameEvent = {
      id: "e_init",
      uniqueId: "ue_e_init",
      turn: 1,
      timestamp: Date.now(),
      type: "WORLD_NARRATIVE",
      category: "NARRATIVE",
      severity: "MAJOR",
      source: "SYSTEM",
      icon: "scroll",
      headline: "The Dawn of History",
      summary: "Four great civilizations emerge from the shadows of history. The battle for territory, science, and glory has begun!",
      showInTicker: true,
      showInLog: true
    };

    setGameState({
      turn: 1,
      width: MAP_WIDTH,
      height: MAP_HEIGHT,
      grid,
      civs: INITIAL_CIVS.map(c => ({
        ...c,
        gold: 20,
        science: 0,
        score: 11,
        isDead: false,
        grandStrategy: c.id === "rome" || c.id === "maya" ? "EXPAND" : (c.id === "han" ? "TALL_TECH" : "MILITARY_RUSH"),
        researchTheme: c.id === "rome" || c.id === "maya" ? "SCIENCE" : (c.id === "han" ? "ECONOMY" : "MILITARY_LAND"),
        researchedTechs: [],
        currentTech: c.id === "rome" || c.id === "maya" ? "Irrigation" : (c.id === "han" ? "Writing" : "Bronze Working"),
        diplomaticPostures: { ...c.diplomaticPostures },
        warPlans: { ...c.warPlans }
      })),
      cities: [],
      units: initialUnits,
      events: [initialEvent],
      turnSummaries: [],
      isAiDeciding: false
    });

    setSelectedCivId(null);
    setSelectedHex(null);
    setActiveCinematic(null);
    setCameraFocus(null);
    setIsPlaying(false);
    setAdvisorChats({});
    setEschatonVictor(null);
    setIsEschatonTriggered(false);
    setActivePhase("IDLE");
    setResourceEffects([]);
    setHexPulses([]);
    setBorderGlows([]);
    setCombatArcs([]);
    
    // Seed initial anomalies
    const initialAnoms = [
      { id: "anom_1", x: 4, y: 3, type: "RIFT" as const },
      { id: "anom_2", x: 8, y: 4, type: "SHARD" as const },
      { id: "anom_3", x: 6, y: 6, type: "RIFT" as const },
      { id: "anom_4", x: 9, y: 2, type: "SHARD" as const },
    ];
    setAnomalies(initialAnoms);
  };

  // -----------------------------------------------------------------------------
  // Coordinate Conversions for Hexagons
  // -----------------------------------------------------------------------------

  function getHexCenter(x: number, y: number) {
    const isEven = y % 2 === 0;
    const xPos = 50 + x * horizontalSpacing + (isEven ? 0 : horizontalSpacing / 2);
    const yPos = 50 + y * (verticalSpacing * 0.88);
    return { x: xPos, y: yPos };
  }

  // Get SVG points for a single hexagon
  function getHexPoints(centerX: number, centerY: number, size: number) {
    const points: string[] = [];
    for (let i = 0; i < 6; i++) {
      const angleRad = (Math.PI / 180) * (i * 60);
      points.push(`${centerX + size * Math.cos(angleRad)},${centerY + size * Math.sin(angleRad)}`);
    }
    return points.join(" ");
  }

  const latestOracleEvent = useMemo(() => {
    const narratorEvents = gameState.events.filter(e => e.type === "WORLD_NARRATIVE");
    return narratorEvents[narratorEvents.length - 1] || null;
  }, [gameState.events]);

  // Voice Sports Commentary TTS effect
  useEffect(() => {
    if (!isVoiceEnabled || !latestOracleEvent) return;

    const eventId = latestOracleEvent.uniqueId || latestOracleEvent.id;
    if (lastSpokenEventId.current === eventId) return;
    lastSpokenEventId.current = eventId;

    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel(); // Abort previous lines
      const textToSpeak = `Oracle Bulletin! Turn ${latestOracleEvent.turn}. ${latestOracleEvent.headline}. ${latestOracleEvent.summary}`;
      const utterance = new SpeechSynthesisUtterance(textToSpeak);

      // Energetic, professional narrator cadence
      utterance.pitch = 0.95;
      utterance.rate = 1.05;
      utterance.volume = 1.0;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    }
  }, [latestOracleEvent, isVoiceEnabled]);

  const sortedCivs = useMemo(() => {
    return [...gameState.civs].sort((a, b) => b.score - a.score);
  }, [gameState.civs]);

  const tradeRoutes = useMemo(() => {
    const routes: { id: string; from: { x: number; y: number }; to: { x: number; y: number } }[] = [];
    const processedPairs = new Set<string>();

    const activeCivs = gameState.civs.filter(c => !c.isDead);
    for (let i = 0; i < activeCivs.length; i++) {
      const civA = activeCivs[i];
      for (let j = i + 1; j < activeCivs.length; j++) {
        const civB = activeCivs[j];

        // Check if friendly or allied
        const postureA = civA.diplomaticPostures[civB.id];
        const postureB = civB.diplomaticPostures[civA.id];
        const isFriendlyOrAlly = 
          postureA === "FRIENDLY" || postureA === "ALLY" ||
          postureB === "FRIENDLY" || postureB === "ALLY";

        if (isFriendlyOrAlly) {
          const citiesA = gameState.cities.filter(c => c.ownerId === civA.id);
          const citiesB = gameState.cities.filter(c => c.ownerId === civB.id);

          // For each city in A, find the closest city in B and establish a route
          citiesA.forEach(cityA => {
            let closestCity: any = null;
            let minDist = Infinity;

            citiesB.forEach(cityB => {
              const dist = Math.abs(cityA.x - cityB.x) + Math.abs(cityA.y - cityB.y);
              if (dist < minDist) {
                minDist = dist;
                closestCity = cityB;
              }
            });

            if (closestCity) {
              const routeKey = [cityA.id, closestCity.id].sort().join("-");
              if (!processedPairs.has(routeKey)) {
                processedPairs.add(routeKey);
                routes.push({
                  id: `trade-${cityA.id}-${closestCity.id}`,
                  from: { x: cityA.x, y: cityA.y },
                  to: { x: closestCity.x, y: closestCity.y }
                });
              }
            }
          });
        }
      }
    }
    return routes;
  }, [gameState.civs, gameState.cities]);

  const activeWarsSummary = useMemo(() => {
    const summary: {
      uniqueId: string;
      attacker: Civilization;
      defender: Civilization;
      frontName: string;
      attackerUnits: number;
      defenderUnits: number;
      duration: number;
    }[] = [];

    const seen = new Set<string>();

    gameState.civs.forEach(civ => {
      if (civ.isDead) return;
      Object.keys(civ.warPlans).forEach(otherId => {
        const other = gameState.civs.find(c => c.id === otherId);
        if (!other || other.isDead || civ.id === otherId) return;

        const isAtWar = civ.warPlans[otherId] !== "NONE" || other.warPlans[civ.id] !== "NONE";
        if (isAtWar) {
          const warKey = [civ.id, otherId].sort().join("-");
          if (!seen.has(warKey)) {
            seen.add(warKey);

            // Compute total committed units for each side
            const civUnitsCount = gameState.units.filter(u => u.ownerId === civ.id).length;
            const otherUnitsCount = gameState.units.filter(u => u.ownerId === otherId).length;

            // Generate a frontline name
            let frontName = "Borderlands Frontier";
            if (civ.id === "rome" && otherId === "han") frontName = "Northern Pass Front";
            else if (civ.id === "viking" && otherId === "rome") frontName = "Southern Shore Front";
            else if (civ.id === "viking" && otherId === "han") frontName = "Eastern Hills Front";
            else if (civ.id === "maya" && otherId === "han") frontName = "Eastern Coast Front";
            else if (civ.id === "maya" && otherId === "rome") frontName = "Western Valley Front";

            const duration = Math.max(1, (gameState.turn % 12) + 2);

            summary.push({
              uniqueId: `war_${civ.id}_${other.id}_${gameState.turn}`,
              attacker: civ,
              defender: other,
              frontName,
              attackerUnits: civUnitsCount,
              defenderUnits: otherUnitsCount,
              duration
            });
          }
        }
      });
    });

    return summary;
  }, [gameState]);

  // Timewave Waveform Calculation
  const wavePoints = useMemo(() => {
    const points: { turn: number, value: number, x: number, y: number }[] = [];
    const startTurn = Math.max(1, gameState.turn - 20);
    const endTurn = Math.min(120, gameState.turn + 20);
    
    const width = 450;
    const height = 40;
    const count = endTurn - startTurn;
    
    for (let t = startTurn; t <= endTurn; t++) {
      const val = getNoveltyValue(t); // 0 to 100
      const x = ((t - startTurn) / (count || 1)) * width;
      // Lower N(t) is HIGHER novelty. Invert y axis so peaks go upward!
      const y = ((100 - val) / 100) * height + 5; // offset slightly from top
      points.push({ turn: t, value: val, x, y });
    }
    return { points, startTurn, endTurn };
  }, [gameState.turn]);

  const lineD = wavePoints.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaD = wavePoints.points.length > 0 
    ? `${lineD} L ${wavePoints.points[wavePoints.points.length - 1].x} 55 L ${wavePoints.points[0].x} 55 Z`
    : '';

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0a0f] text-zinc-300 font-sans select-none">
      
      {/* A. CINEMATIC OVERLAYS */}
      {activeCinematic?.type === "WAR_DECLARED" && (
        <WarDeclarationCinematic event={activeCinematic} onFinished={() => setActiveCinematic(null)} />
      )}
      {activeCinematic?.type === "CITY_CAPTURED" && (
        <CityCapturedCinematic event={activeCinematic} onFinished={() => setActiveCinematic(null)} />
      )}
      {activeCinematic?.type === "TECH_RESEARCHED" && (
        <TechResearchedCinematic event={activeCinematic} onFinished={() => setActiveCinematic(null)} />
      )}

      {/* ESCHATON TRANSCENDENCE SINGULARITY ENDING MODAL */}
      {isEschatonTriggered && (
        <div className="absolute inset-0 z-50 bg-[#020205]/98 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center overflow-hidden select-none font-sans">
          {/* Glowing animated background portal effect */}
          <div className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-r from-purple-600/10 via-cyan-500/10 to-red-500/10 blur-[120px] animate-pulse pointer-events-none" />
          
          <div className="max-w-2xl w-full bg-black/40 border border-zinc-800/80 rounded-2xl p-8 backdrop-blur-md relative z-10 flex flex-col items-center shadow-2xl">
            {/* Spinning Golden Hourglass / Singularity crown */}
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-cyan-400 flex items-center justify-center animate-spin" style={{ animationDuration: "12s" }}>
              <Sparkles className="w-10 h-10 text-amber-400 animate-pulse" />
            </div>

            <h1 className="text-3xl font-black tracking-widest text-white mt-6 font-display uppercase">
              THE ESCHATON SINGULARITY
            </h1>
            <p className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest mt-1">
              Terminal Node Calibrated ─ Chronology Reintegrated
            </p>

            <div className="mt-6 text-sm text-zinc-400 leading-relaxed font-sans max-w-lg">
              "At Turn 120, the cosmic and technological complexity of the simulation converges into a point of infinite potential. Terence McKenna's curves achieve complete integration—all structural boundaries, scientific pursuits, and national borders collapse into a single sovereign timeline."
            </div>

            {/* Victor proclamation */}
            <div className="mt-8 px-6 py-4 bg-amber-500/10 border border-amber-500/30 rounded-xl max-w-md w-full">
              <div className="text-[10px] font-mono text-amber-500 uppercase tracking-widest font-black">
                Sovereign Transcendence Victor
              </div>
              <div className="text-2xl font-black text-white uppercase mt-1 font-display">
                {eschatonVictor || "All Humanity"}
              </div>
              <div className="text-xs text-zinc-400 mt-1">
                Ascends as the prime administrator of the post-historical dimension.
              </div>
            </div>

            {/* Final score scoreboard */}
            <div className="mt-6 w-full max-w-md border border-zinc-900 bg-zinc-950/60 rounded-xl p-4">
              <h3 className="text-xs font-mono text-zinc-500 uppercase tracking-wider mb-3">
                Final Chronological Score Report
              </h3>
              <div className="space-y-2">
                {gameState.civs
                  .sort((a, b) => b.score - a.score)
                  .map((civ) => (
                    <div key={civ.id} className="flex justify-between items-center text-sm">
                      <span className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: civ.color }} />
                        <span className={`${civ.isDead ? 'line-through text-zinc-600' : 'text-white font-semibold'}`}>
                          {civ.name}
                        </span>
                      </span>
                      <span className="font-mono text-zinc-400 font-bold">{civ.score} pts</span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Actions */}
            <button
              onClick={() => {
                // Completely reset the simulation to initial state programmatically
                resetSimulation();
              }}
              className="mt-8 px-8 py-3 bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 text-white font-bold text-sm tracking-wider uppercase rounded-lg transition-all shadow-lg hover:shadow-cyan-500/20 active:scale-95"
            >
              Reboot Simulation Matrix
            </button>
          </div>
        </div>
      )}

      {/* B. ONBOARDING MODAL */}
      {showOnboarding && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="max-w-md p-6 rounded-2xl bg-zinc-900 border border-amber-500/40 shadow-2xl text-center relative">
            <button 
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
              onClick={() => setShowOnboarding(false)}
            >
              <X className="w-5 h-5" />
            </button>
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <h3 className="text-xl font-bold font-display text-white mb-2">
              {ONBOARDING_STEPS[onboardingStep].title}
            </h3>
            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              {ONBOARDING_STEPS[onboardingStep].desc}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">
                Step {onboardingStep + 1} of {ONBOARDING_STEPS.length}
              </span>
              <div className="flex gap-2">
                {onboardingStep > 0 && (
                  <button 
                    className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs font-semibold hover:bg-zinc-700"
                    onClick={() => setOnboardingStep(p => p - 1)}
                  >
                    Back
                  </button>
                )}
                <button 
                  className="px-4 py-1.5 rounded-lg bg-amber-500 text-black text-xs font-semibold hover:bg-amber-400"
                  onClick={() => {
                    if (onboardingStep < ONBOARDING_STEPS.length - 1) {
                      setOnboardingStep(p => p + 1);
                    } else {
                      setShowOnboarding(false);
                    }
                  }}
                >
                  {onboardingStep === ONBOARDING_STEPS.length - 1 ? "Start Watching" : "Next"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* C. MAIN SPECTATOR INTERFACE */}
      <div className="flex-1 min-w-0 flex flex-col relative h-full">
        
        {/* HEADER CONTROLS */}
        <header className="h-16 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur px-6 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black font-display text-white tracking-wider">Turn {gameState.turn}</span>
                <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  {gameState.turn < 15 ? "Ancient Era" : gameState.turn < 35 ? "Classical Era" : "Medieval Era"}
                </span>
              </div>
              <span className="text-[10px] text-zinc-500 font-mono tracking-widest uppercase">Live Simulation Stream</span>
            </div>
          </div>

          {/* TURN PHASE STEPPER INDICATOR */}
          <div className="hidden lg:flex items-center gap-1.5 bg-zinc-900/60 border border-zinc-800/80 px-4 py-1.5 rounded-full text-[10px] font-mono tracking-widest uppercase">
            <span className="text-zinc-500 mr-1">Phase:</span>
            
            <div className="flex items-center gap-1">
              <span className={`px-2 py-0.5 rounded-full transition-all duration-300 font-bold ${
                activePhase === "RESEARCH" 
                  ? "bg-cyan-500/25 text-cyan-400 border border-cyan-500/40" 
                  : "text-zinc-600 border border-transparent"
              }`}>
                🧪 Research
              </span>
              <span className="text-zinc-700 font-sans">➔</span>
              <span className={`px-2 py-0.5 rounded-full transition-all duration-300 font-bold ${
                activePhase === "GROWTH" 
                  ? "bg-emerald-500/25 text-emerald-400 border border-emerald-500/40" 
                  : "text-zinc-600 border border-transparent"
              }`}>
                🌾 Economy
              </span>
              <span className="text-zinc-700 font-sans">➔</span>
              <span className={`px-2 py-0.5 rounded-full transition-all duration-300 font-bold ${
                activePhase === "MOVEMENT" 
                  ? "bg-amber-500/25 text-amber-400 border border-amber-500/40" 
                  : "text-zinc-600 border border-transparent"
              }`}>
                🪖 Movement
              </span>
              <span className="text-zinc-700 font-sans">➔</span>
              <span className={`px-2 py-0.5 rounded-full transition-all duration-300 font-bold ${
                activePhase === "DIPLOMACY" 
                  ? "bg-rose-500/25 text-rose-400 border border-rose-500/40" 
                  : "text-zinc-600 border border-transparent"
              }`}>
                🤝 Diplomacy
              </span>
            </div>
          </div>

          {/* SIM CONTROLS */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${
                isPlaying 
                  ? "bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500/20" 
                  : "bg-amber-500 text-black border-amber-400 hover:bg-amber-400"
              }`}
            >
              {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            {/* SPEED SLIDER */}
            <div className="flex bg-zinc-900 border border-zinc-800 rounded-xl p-1 gap-1">
              {(["1x", "2x", "4x", "8x"] as const).map(s => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    speed === s ? "bg-amber-500 text-black" : "text-zinc-400 hover:text-white hover:bg-zinc-800"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <button
              onClick={resetSimulation}
              className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
              title="Reset Simulation"
            >
              <RotateCcw className="w-5 h-5" />
            </button>

            <button
              onClick={() => {
                setOnboardingStep(0);
                setShowOnboarding(true);
              }}
              className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
            >
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* HEX BOARD CONTAINER */}
        <div ref={boardContainerRef} className={`flex-1 relative overflow-auto bg-[#0d0f19] scrollbar-thin flex ${activeCinematic?.type === "WAR_DECLARED" ? "animate-shake" : ""}`}>
          
          {/* Subtle global vignette overlay centered on the map area */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_30%,#03050a_95%)] opacity-85 z-10" />

          <div className="w-[1150px] h-[860px] relative flex items-center justify-center m-auto shrink-0">
            <svg
              className="w-[1050px] h-[780px] select-none"
              viewBox="0 0 850 640"
            >
            <defs>
              <filter id="city-shadow" x="-30%" y="-30%" width="160%" height="160%">
                <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#000" floodOpacity="0.8" />
              </filter>
              <filter id="unit-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000" floodOpacity="0.75" />
              </filter>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
              <filter id="hex-inset-shadow" x="-10%" y="-10%" width="120%" height="120%">
                <feOffset dx="0" dy="2"/>
                <feGaussianBlur stdDeviation="2.5" result="offset-blur"/>
                <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
                <feFlood floodColor="black" floodOpacity="0.85" result="color"/>
                <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
                <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
              </filter>

              {/* Dynamic board game-inspired gradients for biomes */}
              <linearGradient id="grad-grass" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3f7a35" />
                <stop offset="100%" stopColor="#1b3c16" />
              </linearGradient>
              <linearGradient id="grad-forest" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#1e4d2b" />
                <stop offset="100%" stopColor="#091b0f" />
              </linearGradient>
              <linearGradient id="grad-hill" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#63523f" />
                <stop offset="100%" stopColor="#30271c" />
              </linearGradient>
              <linearGradient id="grad-mountain" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#807d79" />
                <stop offset="100%" stopColor="#36332f" />
              </linearGradient>
              <linearGradient id="grad-coast" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3885a6" />
                <stop offset="100%" stopColor="#123c52" />
              </linearGradient>
              <linearGradient id="grad-ocean" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#0f283c" />
                <stop offset="100%" stopColor="#03070f" />
              </linearGradient>
              <linearGradient id="grad-river" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#2d7ea6" />
                <stop offset="100%" stopColor="#0f3b54" />
              </linearGradient>
              <linearGradient id="grad-desert" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#b59e6c" />
                <stop offset="100%" stopColor="#54462b" />
              </linearGradient>

              {/* Radial gradient for battle impacts */}
              <radialGradient id="impact-glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.85" />
                <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </radialGradient>

              {/* Timewave Zero Anomalies Gradients */}
              <radialGradient id="rift-glow-grad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#c084fc" stopOpacity="0.9" />
                <stop offset="70%" stopColor="#3b82f6" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="shard-crystal-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#e0f2fe" />
                <stop offset="50%" stopColor="#38bdf8" />
                <stop offset="100%" stopColor="#0369a1" />
              </linearGradient>
            </defs>

            {/* Background grids / shadows */}
            <rect width="100%" height="100%" fill="transparent" />

            {/* RENDER GRID TILES */}
            <g id="tiles-layer">
              {gameState.grid.flatMap((row, y) => 
                row.map((tile, x) => {
                  const center = getHexCenter(x, y);
                  const isTileSelected = selectedHex?.x === x && selectedHex?.y === y;
                  const owner = gameState.civs.find(c => c.id === tile.ownerCivId);

                  // Glow effect on war fronts
                  const isPulsingWar = hexPulses.some(p => p.x === x && p.y === y && p.kind === "war");
                  const isPulsingCity = hexPulses.some(p => p.x === x && p.y === y && p.kind === "city");

                  // Neighbor check for frontiers and active wars
                  const neighbors = getNeighbors(x, y);
                  const isFrontier = owner && neighbors.some(n => {
                    const neighborTile = gameState.grid[n.y]?.[n.x];
                    return neighborTile && neighborTile.ownerCivId && neighborTile.ownerCivId !== owner.id;
                  });

                  const isWarFront = owner && neighbors.some(n => {
                    const neighborTile = gameState.grid[n.y]?.[n.x];
                    if (neighborTile && neighborTile.ownerCivId && neighborTile.ownerCivId !== owner.id) {
                      const posture = owner.diplomaticPostures[neighborTile.ownerCivId];
                      return posture === "WAR";
                    }
                    return false;
                  });

                  // Color scheme based on terrain linear gradients
                  let gradientId = "grad-grass";
                  let terrainClass = "hex-plain";
                  let strokeColor = "rgba(255,255,255,0.06)";
                  let terrainIcon = "🍀";

                  switch (tile.terrain) {
                    case "GRASS":
                      gradientId = "grad-grass";
                      terrainClass = "hex-plain";
                      terrainIcon = "🍀";
                      break;
                    case "FOREST":
                      gradientId = "grad-forest";
                      terrainClass = "hex-forest";
                      terrainIcon = "🌲";
                      break;
                    case "HILL":
                      gradientId = "grad-hill";
                      terrainClass = "hex-hill";
                      terrainIcon = "⛰️";
                      break;
                    case "MOUNTAIN":
                      gradientId = "grad-mountain";
                      terrainClass = "hex-mountain";
                      terrainIcon = "🏔️";
                      break;
                    case "COAST":
                      gradientId = "grad-coast";
                      terrainClass = "hex-coast";
                      terrainIcon = "🌊";
                      break;
                    case "OCEAN":
                      gradientId = "grad-ocean";
                      terrainClass = "hex-ocean";
                      terrainIcon = "⛵";
                      break;
                    case "RIVER":
                      gradientId = "grad-river";
                      terrainClass = "hex-river";
                      terrainIcon = "🌀";
                      break;
                    case "DESERT":
                      gradientId = "grad-desert";
                      terrainClass = "hex-desert";
                      terrainIcon = "🏜️";
                      break;
                  }

                  // Border colors and territory glow overlays according to civilization control
                  let borderOverlay = null;
                  if (owner) {
                    const isWarringFaction = activeCinematic?.type === "WAR_DECLARED" && (
                      owner.id === activeCinematic.primaryCiv?.id ||
                      owner.id === activeCinematic.secondaryCiv?.id
                    );

                    borderOverlay = (
                      <g className="transition-all duration-300 pointer-events-none">
                        {/* Soft Outer Glow for Territory */}
                        <polygon
                          points={getHexPoints(center.x, center.y, HEX_SIZE - 1.5)}
                          fill={owner.color}
                          fillOpacity="0.04"
                          stroke={owner.color}
                          strokeWidth="3.5"
                          strokeOpacity="0.25"
                          filter="url(#glow)"
                        />
                        {/* Crisp deluxe border */}
                        <polygon
                          points={getHexPoints(center.x, center.y, HEX_SIZE - 1.5)}
                          fill="none"
                          stroke={owner.color}
                          strokeWidth="1.8"
                          strokeOpacity="0.75"
                          strokeDasharray="4,2.5"
                        />
                        {/* Dynamic Pulsing War Border Glow Overlay */}
                        {isWarringFaction && (
                          <polygon
                            points={getHexPoints(center.x, center.y, HEX_SIZE - 1.5)}
                            fill="none"
                            stroke="#ef4444"
                            strokeWidth="4.5"
                            strokeOpacity="0.95"
                            className="animate-pulse"
                            filter="url(#glow)"
                          />
                        )}
                      </g>
                    );
                  }

                  return (
                    <g 
                      key={`${x}-${y}`} 
                      className="cursor-pointer group"
                      onClick={() => setSelectedHex({ x, y })}
                    >
                      {/* Polygon base hexagon */}
                      <polygon
                        points={getHexPoints(center.x, center.y, HEX_SIZE - 0.5)}
                        stroke={isTileSelected ? "#f59e0b" : strokeColor}
                        strokeWidth={isTileSelected ? "3.2" : "0.8"}
                        fill={
                          climateOverlay === "TEMPERATURE"
                            ? getTemperatureColor(getTileClimate(x, y, tile.terrain).temperature)
                            : climateOverlay === "HUMIDITY"
                            ? getHumidityColor(getTileClimate(x, y, tile.terrain).humidity)
                            : undefined
                        }
                        fillOpacity={climateOverlay !== "NONE" ? "0.7" : undefined}
                        className={`hex-tile ${terrainClass} transition-all duration-300 hover:brightness-110`}
                      />

                      {/* 2px Highlight along the top-left edges for 3D depth */}
                      <polyline
                        points={`${center.x - (HEX_SIZE - 1.5)},${center.y} ${center.x - (HEX_SIZE - 1.5)/2},${center.y - (HEX_SIZE - 1.5) * 0.866} ${center.x + (HEX_SIZE - 1.5)/2},${center.y - (HEX_SIZE - 1.5) * 0.866}`}
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.45)"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="pointer-events-none"
                      />

                      {/* Bevel effect inside hexagon */}
                      <polygon
                        points={getHexPoints(center.x, center.y, HEX_SIZE - 1.8)}
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.04)"
                        strokeWidth="1"
                        className="pointer-events-none"
                      />

                      {/* Visual border highlights */}
                      {borderOverlay}

                      {/* Frontier contour highlighting */}
                      {isFrontier && !isWarFront && (
                        <polygon
                          points={getHexPoints(center.x, center.y, HEX_SIZE - 3.2)}
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="1.2"
                          strokeDasharray="3,3"
                          opacity="0.4"
                          className="pointer-events-none animate-pulse"
                        />
                      )}

                      {/* Active War Front Glowing Line */}
                      {isWarFront && (
                        <polygon
                          points={getHexPoints(center.x, center.y, HEX_SIZE - 2.5)}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="3.2"
                          className="war-front-border pointer-events-none"
                        />
                      )}

                      {/* Terrain micro icon */}
                      <text
                        x={center.x}
                        y={center.y + 4.5}
                        textAnchor="middle"
                        fontSize="12"
                        className="opacity-40 group-hover:opacity-85 select-none transition-opacity pointer-events-none"
                      >
                        {terrainIcon}
                      </text>

                      {/* Frontline war highlight pulsing glow */}
                      {isPulsingWar && (
                        <polygon
                          points={getHexPoints(center.x, center.y, HEX_SIZE - 2)}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth="3.5"
                          className="hex-border-war"
                        />
                      )}
                      {isPulsingCity && (
                        <polygon
                          points={getHexPoints(center.x, center.y, HEX_SIZE - 2)}
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="3.5"
                          className="city-siege-hotspot"
                        />
                      )}

                      {/* Tactical Grid Overlay */}
                      {showTacticalOverlay && (
                        <g className="pointer-events-none select-none font-sans font-bold">
                          <rect
                            x={center.x - 21}
                            y={center.y + 8}
                            width="42"
                            height="11"
                            rx="1.5"
                            fill="#020204"
                            fillOpacity="0.88"
                            stroke="rgba(255, 255, 255, 0.15)"
                            strokeWidth="0.5"
                          />
                          {(() => {
                            let def = "0%";
                            if (tile.terrain === "FOREST" || tile.terrain === "HILL") def = "25%";
                            if (tile.terrain === "MOUNTAIN") def = "X";
                            
                            let res = "1G";
                            if (tile.terrain === "GRASS") res = "2F";
                            if (tile.terrain === "FOREST") res = "2P";
                            if (tile.terrain === "HILL") res = "1P";
                            if (tile.terrain === "MOUNTAIN") res = "3S";
                            if (tile.terrain === "RIVER") res = "3F";
                            if (tile.terrain === "DESERT") res = "1G";
                            if (tile.terrain === "COAST" || tile.terrain === "OCEAN") res = "2F";

                            let mp = "1";
                            if (tile.terrain === "FOREST" || tile.terrain === "HILL" || tile.terrain === "RIVER") mp = "2";
                            if (tile.terrain === "DESERT") mp = "1.5";
                            if (tile.terrain === "MOUNTAIN") mp = "X";

                            return (
                              <text
                                x={center.x}
                                y={center.y + 16.5}
                                textAnchor="middle"
                                fontSize="6"
                                className="font-mono font-black"
                              >
                                <tspan fill="#3b82f6">D:{def}</tspan> <tspan fill="#f59e0b">R:{res}</tspan> <tspan fill="#10b981">M:{mp}</tspan>
                              </text>
                            );
                          })()}
                        </g>
                      )}
                    </g>
                  );
                })
              )}
            </g>

            {/* RENDER TIMEWAVE ZERO ANOMALIES */}
            <g id="anomalies-layer">
              {anomalies.map(anom => {
                const center = getHexCenter(anom.x, anom.y);
                if (anom.type === "RIFT") {
                  return (
                    <g key={anom.id} className="pointer-events-none select-none">
                      {/* Pulsing temporal portal glow */}
                      <circle
                        cx={center.x}
                        cy={center.y}
                        r="14"
                        fill="url(#rift-glow-grad)"
                        opacity="0.6"
                        className="animate-pulse"
                      />
                      {/* Swirling spatial distortion ring */}
                      <circle
                        cx={center.x}
                        cy={center.y}
                        r="10"
                        fill="none"
                        stroke="#c084fc"
                        strokeWidth="1.5"
                        strokeDasharray="6,4"
                        className="animate-spin"
                        style={{ transformOrigin: `${center.x}px ${center.y}px`, animationDuration: "8s" }}
                      />
                      <circle
                        cx={center.x}
                        cy={center.y}
                        r="6"
                        fill="none"
                        stroke="#22d3ee"
                        strokeWidth="1"
                        strokeDasharray="2,3"
                        className="animate-spin"
                        style={{ transformOrigin: `${center.x}px ${center.y}px`, animationDuration: "4s" }}
                      />
                      {/* Swirling core */}
                      <path
                        d={`M ${center.x - 4} ${center.y - 4} Q ${center.x} ${center.y} ${center.x + 4} ${center.y + 4} M ${center.x + 4} ${center.y - 4} Q ${center.x} ${center.y} ${center.x - 4} ${center.y + 4}`}
                        fill="none"
                        stroke="#a855f7"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                      {/* Center distortion dot */}
                      <circle cx={center.x} cy={center.y} r="2.5" fill="#f43f5e" />
                    </g>
                  );
                } else {
                  return (
                    <g key={anom.id} className="pointer-events-none select-none">
                      {/* Glowing Chrono-Shard Crystal */}
                      <polygon
                        points={`${center.x},${center.y - 12} ${center.x + 6},${center.y - 2} ${center.x + 8},${center.y + 4} ${center.x},${center.y + 11} ${center.x - 8},${center.y + 4} ${center.x - 6},${center.y - 2}`}
                        fill="url(#shard-crystal-grad)"
                        stroke="#22d3ee"
                        strokeWidth="1.5"
                        filter="url(#glow)"
                        className="animate-pulse"
                      />
                      {/* Inner crystal facet lines */}
                      <line x1={center.x} y1={center.y - 12} x2={center.x} y2={center.y + 11} stroke="#ffffff" strokeWidth="0.8" opacity="0.7" />
                      <line x1={center.x - 8} y1={center.y + 4} x2={center.x + 8} y2={center.y + 4} stroke="#22d3ee" strokeWidth="0.5" opacity="0.6" />
                      {/* Sparkle star halo */}
                      <circle
                        cx={center.x}
                        cy={center.y}
                        r="4"
                        fill="#38bdf8"
                        opacity="0.3"
                        className="animate-ping"
                        style={{ animationDuration: "1.8s" }}
                      />
                    </g>
                  );
                }
              })}
            </g>

            {/* RENDER CITIES */}
            <g id="cities-layer">
              {gameState.cities.map(city => {
                const center = getHexCenter(city.x, city.y);
                const owner = gameState.civs.find(c => c.id === city.ownerId);
                if (!owner) return null;

                // City badge based on assigned role
                let roleIcon = "🌾";
                if (city.role === "INDUSTRIAL_HUB") roleIcon = "⚙️";
                else if (city.role === "SCIENCE_CENTER") roleIcon = "🧪";
                else if (city.role === "FORTRESS_BORDER") roleIcon = "🏰";
                else if (city.role === "NAVAL_PORT") roleIcon = "⚓";

                return (
                  <g 
                    key={city.uniqueId || city.id} 
                    className="city-token cursor-pointer group" 
                    onClick={() => setSelectedHex({ x: city.x, y: city.y })}
                    style={{ transformOrigin: `${center.x}px ${center.y}px` }}
                  >
                    <g className="floating-element-city" style={{ transformOrigin: `${center.x}px ${center.y}px` }}>
                    {/* Crisp 2px dark outline */}
                    <circle
                      cx={center.x}
                      cy={center.y}
                      r="23"
                      fill="#030712"
                    />

                    {/* Ring background with shadow */}
                    <circle
                      cx={center.x}
                      cy={center.y}
                      r="21"
                      fill="#090d16"
                      stroke={city.isUnderSiege ? "#ef4444" : owner.color}
                      strokeWidth="2"
                      filter="url(#city-shadow)"
                      className={`${city.isUnderSiege ? "animate-pulse" : ""}`}
                    />

                    {/* Outer fortification walls */}
                    {gameState.grid[city.y][city.x].improvement === "WALLS" && (
                      <circle
                        cx={center.x}
                        cy={center.y}
                        r="25"
                        fill="none"
                        stroke="#8e9196"
                        strokeWidth="2"
                        strokeDasharray="4,2.5"
                      />
                    )}

                    {/* Role Emoji inside city */}
                    <text
                      x={center.x}
                      y={center.y + 5.5}
                      textAnchor="middle"
                      fontSize="15"
                      className="select-none pointer-events-none"
                    >
                      🏢
                    </text>

                    {/* City banner label */}
                    <rect
                      x={center.x - 30}
                      y={center.y - 32}
                      width="60"
                      height="12"
                      rx="4"
                      fill="#060913"
                      stroke={owner.color}
                      strokeWidth="2"
                      filter="url(#city-shadow)"
                    />
                    <text
                      x={center.x}
                      y={center.y - 23.5}
                      textAnchor="middle"
                      fill="#f1f5f9"
                      fontSize="7"
                      fontWeight="bold"
                      className="uppercase tracking-widest font-mono pointer-events-none"
                    >
                      {city.name.substring(0, 10)}
                    </text>

                    {/* City Role mini badge offset */}
                    <circle
                      cx={center.x + 15}
                      cy={center.y - 15}
                      r="8"
                      fill="#111827"
                      stroke="#f59e0b"
                      strokeWidth="1.2"
                    />
                    <text
                      x={center.x + 15}
                      y={center.y - 12.5}
                      textAnchor="middle"
                      fontSize="8"
                      className="pointer-events-none"
                    >
                      {roleIcon}
                    </text>

                    {/* Population Badge (bottom-left) */}
                    <circle
                      cx={center.x - 15}
                      cy={center.y + 15}
                      r="6.5"
                      fill="#1e1b4b"
                      stroke="#818cf8"
                      strokeWidth="1"
                    />
                    <text
                      x={center.x - 15}
                      y={center.y + 17.2}
                      textAnchor="middle"
                      fill="#e0e7ff"
                      fontSize="7"
                      fontWeight="bold"
                      className="font-mono pointer-events-none"
                    >
                      {city.population}
                    </text>
                    </g>
                  </g>
                );
              })}
            </g>

            {/* UNIT PATH HISTORY TRAILS */}
            <g id="unit-trails-layer">
              {gameState.units.map(unit => {
                const owner = gameState.civs.find(c => c.id === unit.ownerId);
                if (!owner || !unit.pathHistory || unit.pathHistory.length === 0) return null;

                const currentCenter = getHexCenter(unit.x, unit.y);

                return (
                  <g key={`trail-${unit.uniqueId || unit.id}`} className="pointer-events-none">
                    {unit.pathHistory.map((pt, idx) => {
                      const ptCenter = getHexCenter(pt.x, pt.y);
                      
                      // Get the next coordinate along the trail
                      const nextPt = idx === unit.pathHistory!.length - 1 
                        ? currentCenter 
                        : getHexCenter(unit.pathHistory![idx + 1].x, unit.pathHistory![idx + 1].y);

                      return (
                        <g key={`segment-${idx}`}>
                          {/* Outer glowing trace line */}
                          <line
                            x1={ptCenter.x}
                            y1={ptCenter.y}
                            x2={nextPt.x}
                            y2={nextPt.y}
                            stroke={owner.color}
                            strokeWidth="4"
                            strokeOpacity={0.10 + idx * 0.08}
                            strokeDasharray="4,4"
                            strokeLinecap="round"
                            filter="url(#glow)"
                          />
                          {/* Inner sharp trace line */}
                          <line
                            x1={ptCenter.x}
                            y1={ptCenter.y}
                            x2={nextPt.x}
                            y2={nextPt.y}
                            stroke={owner.color}
                            strokeWidth="1.6"
                            strokeOpacity={0.25 + idx * 0.2}
                            strokeDasharray="3,3"
                            strokeLinecap="round"
                          />
                          {/* Node anchor dot */}
                          <circle
                            cx={ptCenter.x}
                            cy={ptCenter.y}
                            r="3"
                            fill="#090d16"
                            stroke={owner.color}
                            strokeWidth="1.2"
                            strokeOpacity={0.35 + idx * 0.2}
                          />
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </g>

            {/* RENDER UNITS */}
            <g id="units-layer">
              {gameState.units.map(unit => {
                const center = getHexCenter(unit.x, unit.y);
                const owner = gameState.civs.find(c => c.id === unit.ownerId);
                if (!owner) return null;

                let unitEmoji = "🛡️";
                if (unit.type === "SETTLER") unitEmoji = "🌾";
                else if (unit.type === "ARCHER") unitEmoji = "🏹";
                else if (unit.type === "LEGION") unitEmoji = "⚔️";
                else if (unit.type === "TRIREME") unitEmoji = "⛵";

                const healthRatio = unit.health / 100;

                return (
                  <g 
                    key={unit.uniqueId || unit.id} 
                    className="unit-token cursor-pointer group" 
                    onClick={() => setSelectedHex({ x: unit.x, y: unit.y })}
                    style={{ transformOrigin: `${center.x}px ${center.y}px` }}
                  >
                    <g className="floating-element-unit" style={{ transformOrigin: `${center.x}px ${center.y}px` }}>
                    {/* Ambient shadow behind the token */}
                    <circle 
                      cx={center.x} 
                      cy={center.y + 1.4} 
                      r="17" 
                      fill="black" 
                      opacity="0.45" 
                      filter="url(#city-shadow)" 
                    />

                    {/* Crisp 2px dark outline */}
                    <circle
                      cx={center.x}
                      cy={center.y}
                      r="18.5"
                      fill="#030712"
                    />

                    {/* Circular shield token colored by civ */}
                    <circle 
                      cx={center.x} 
                      cy={center.y} 
                      r="16" 
                      fill="#0e1220" 
                      stroke={owner.color} 
                      strokeWidth="2" 
                      filter="url(#unit-shadow)"
                    />
                    
                    {/* Inner accent ring */}
                    <circle 
                      cx={center.x} 
                      cy={center.y} 
                      r="13" 
                      fill="rgba(255, 255, 255, 0.05)" 
                    />

                    {/* Unit Emoji in Center */}
                    <text
                      x={center.x}
                      y={center.y + 4.2}
                      textAnchor="middle"
                      fontSize="12.5"
                      fontWeight="bold"
                      className="select-none pointer-events-none"
                    >
                      {unitEmoji}
                    </text>

                    {/* Active health indicator bar */}
                    {unit.health < 100 && (
                      <g className="pointer-events-none">
                        {/* Health bg */}
                        <rect 
                          x={center.x - 11} 
                          y={center.y + 15} 
                          width="22" 
                          height="3" 
                          rx="1"
                          fill="#451a1a" 
                        />
                        {/* Health fg */}
                        <rect 
                          x={center.x - 11} 
                          y={center.y + 15} 
                          width={Math.max(1, 22 * healthRatio)} 
                          height="3" 
                          rx="1"
                          fill={unit.health > 50 ? "#10b981" : unit.health > 25 ? "#f59e0b" : "#ef4444"} 
                        />
                      </g>
                    )}

                    {/* Unit Level Rank Badge */}
                    {unit.level && unit.level > 1 && (
                      <g className="pointer-events-none">
                        <circle
                          cx={center.x + 13}
                          cy={center.y - 13}
                          r="6.2"
                          fill="#0f172a"
                          stroke="#fbbf24"
                          strokeWidth="1.2"
                        />
                        <text
                          x={center.x + 13}
                          y={center.y - 10.5}
                          textAnchor="middle"
                          fontSize="7.5"
                          fontWeight="black"
                          fill="#fbbf24"
                          className="select-none"
                        >
                          ★
                        </text>
                      </g>
                    )}
                    </g>
                  </g>
                );
              })}
            </g>

            {/* AMBIENT TRADE ROUTES BETWEEN FRIENDLY/ALLIED CITIES */}
            <g id="trade-routes-layer" strokeOpacity="0.75" fill="none">
              {tradeRoutes.map(route => {
                const start = getHexCenter(route.from.x, route.from.y);
                const end = getHexCenter(route.to.x, route.to.y);
                
                const dx = end.x - start.x;
                const dy = end.y - start.y;
                const len = Math.sqrt(dx * dx + dy * dy) || 1;
                const nx = -dy / len;
                const ny = dx / len;

                // Shift gold line slightly to one side
                const goldStart = { x: start.x + nx * 2.2, y: start.y + ny * 2.2 };
                const goldEnd = { x: end.x + nx * 2.2, y: end.y + ny * 2.2 };
                const midX = (goldStart.x + goldEnd.x) / 2;
                const midY = (goldStart.y + goldEnd.y) / 2 - 10;

                // Shift science line slightly to the other side
                const sciStart = { x: start.x - nx * 2.2, y: start.y - ny * 2.2 };
                const sciEnd = { x: end.x - nx * 2.2, y: end.y - ny * 2.2 };
                const sciMidX = (sciStart.x + sciEnd.x) / 2;
                const sciMidY = (sciStart.y + sciEnd.y) / 2 - 10;

                return (
                  <g key={route.id} opacity="0.65" className="transition-all duration-500">
                    {/* Gold Trade Path (Wealth flow) */}
                    <path
                      d={`M ${goldStart.x} ${goldStart.y} Q ${midX} ${midY} ${goldEnd.x} ${goldEnd.y}`}
                      className="trade-route-gold"
                    />
                    
                    {/* Science Trade Path (Knowledge flow) */}
                    <path
                      d={`M ${sciStart.x} ${sciStart.y} Q ${sciMidX} ${sciMidY} ${sciEnd.x} ${sciEnd.y}`}
                      className="trade-route-science"
                    />
                  </g>
                );
              })}
            </g>

            {/* COMBAT AND EXPLORATION ANIMATION ARCS */}
            <g id="animations-layer">
              {combatArcs.map(arc => {
                const start = getHexCenter(arc.from.x, arc.from.y);
                const end = getHexCenter(arc.to.x, arc.to.y);
                const midX = (start.x + end.x) / 2;
                const midY = (start.y + end.y) / 2 - 20; // Curve up for visual arc

                return (
                  <g key={arc.id}>
                    {/* Glowing arc path */}
                    <path
                      d={`M ${start.x} ${start.y} Q ${midX} ${midY} ${end.x} ${end.y}`}
                      fill="none"
                      stroke="#ef4444"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                      strokeDasharray="4,4"
                      className="animate-pulse"
                    />
                    
                    {/* Beautiful radial impact flash centered on the target tile */}
                    <circle 
                      cx={end.x} 
                      cy={end.y} 
                      r="24" 
                      fill="url(#impact-glow)" 
                      className="animate-ping" 
                      opacity="0.85" 
                    />

                    {/* Outer target pulsing ring */}
                    <circle 
                      cx={end.x} 
                      cy={end.y} 
                      r="12" 
                      fill="none" 
                      stroke="#ef4444" 
                      strokeWidth="2.5" 
                      className="animate-pulse" 
                    />
                  </g>
                );
              })}
            </g>

            {/* CITY FLOATING RESOURCE OVERLAYS (+G, +S) */}
            <g id="resource-effects-layer">
              {resourceEffects.map(effect => {
                const center = getHexCenter(effect.x, effect.y);
                return (
                  <g key={effect.id} className="pointer-events-none select-none">
                    <text
                      x={center.x + (effect.text.includes("S") ? 15 : -15)}
                      y={center.y - 32}
                      textAnchor="middle"
                      fill={effect.color}
                      fontSize="11"
                      fontWeight="900"
                      className="font-mono animate-float-up"
                      style={{
                        filter: "drop-shadow(0px 2px 3px rgba(0,0,0,1))"
                      }}
                    >
                      {effect.text}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

          {/* HEX FLOATING HOVER CARD / SELECTION SUMMARY */}
          {selectedHex && (
            <div className="absolute top-4 left-4 p-4 rounded-xl bg-zinc-950/90 border border-zinc-800 shadow-xl min-w-[200px] z-10 backdrop-blur-md">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Territory Info</div>
                  <h4 className="text-sm font-black text-white">Hex [{selectedHex.x}, {selectedHex.y}]</h4>
                </div>
                <button onClick={() => setSelectedHex(null)} className="text-zinc-500 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {(() => {
                const tile = gameState.grid[selectedHex.y]?.[selectedHex.x];
                if (!tile) return null;

                const owner = gameState.civs.find(c => c.id === tile.ownerCivId);
                const cityOnTile = gameState.cities.find(c => c.x === selectedHex.x && c.y === selectedHex.y);
                const unitsOnTile = gameState.units.filter(u => u.x === selectedHex.x && u.y === selectedHex.y);

                return (
                  <div className="space-y-3 text-xs">
                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1.5">
                      <span className="text-zinc-400">Terrain:</span>
                      <span className="font-bold text-white flex items-center gap-1">
                        {tile.terrain === "GRASS" && "🍀 Grassland"}
                        {tile.terrain === "FOREST" && "🌲 Thick Forest"}
                        {tile.terrain === "HILL" && "⛰️ Rough Hills"}
                        {tile.terrain === "MOUNTAIN" && "🏔️ High Peak"}
                        {tile.terrain === "COAST" && "🌊 Coastline"}
                        {tile.terrain === "OCEAN" && "⚓ Deep Waters"}
                        {tile.terrain === "DESERT" && "🏜️ Dry Desert"}
                        {tile.terrain === "RIVER" && "🌀 River Delta"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between border-b border-zinc-800/80 pb-1.5">
                      <span className="text-zinc-400">Ownership:</span>
                      <span className="font-bold" style={{ color: owner?.color || "#71717a" }}>
                        {owner ? owner.name : "Unclaimed"}
                      </span>
                    </div>

                    {cityOnTile && (
                      <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-800 space-y-2">
                        <div className="flex justify-between items-center border-b border-zinc-800 pb-1">
                          <span className="text-[9px] text-zinc-500 uppercase font-bold">🏢 Regional City</span>
                          <span className="text-[9px] text-zinc-400 font-mono">Pop {cityOnTile.population}</span>
                        </div>
                        <div className="text-white font-black">{cityOnTile.name}</div>
                        <div className="text-zinc-400 text-[10px]">Role: <span className="font-mono text-zinc-300 font-semibold">{cityOnTile.role.replace(/_/g, " ")}</span></div>
                        
                        {/* Current Production */}
                        <div className="mt-1 bg-zinc-950/40 p-1.5 rounded border border-zinc-800/50">
                          <div className="flex justify-between text-[9px] text-zinc-500 mb-0.5">
                            <span>CURRENT PROJECT</span>
                            <span className="text-amber-500 font-bold">🛠️ {Math.min(100, Math.floor((cityOnTile.productionProgress || 0) * 10))}%</span>
                          </div>
                          <div className="text-white font-bold text-[10px] flex justify-between items-center">
                            <span>{cityOnTile.currentBuild || "Idle"}</span>
                          </div>
                          <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden mt-1">
                            <div className="bg-amber-500 h-full transition-all duration-500" style={{ width: `${Math.min(100, (cityOnTile.productionProgress || 0) * 10)}%` }} />
                          </div>
                        </div>

                        {/* Production Queue */}
                        <div className="space-y-1">
                          <div className="text-[8px] text-zinc-500 uppercase tracking-wider font-bold">Upcoming Projects</div>
                          {getCityProductionQueue(cityOnTile, gameState.grid, gameState.cities, gameState.civs).map((item, idx) => (
                            <div key={item.name} className="flex justify-between items-center bg-zinc-950/20 p-1 rounded border border-zinc-900/40 text-[9px]">
                              <span className="text-zinc-400 flex items-center gap-1 font-medium">
                                <span className="text-[8px] text-zinc-500 font-mono font-bold">#{idx + 1}</span>
                                {item.icon} {item.name}
                              </span>
                              <span className="text-[8px] text-zinc-500 font-mono">{item.cost} hammer</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {unitsOnTile.length > 0 && (
                      <div className="bg-zinc-900/60 p-2 rounded-lg border border-zinc-800">
                        <div className="text-[9px] text-zinc-500 uppercase font-bold mb-1">🪖 Mobilized Garrisons</div>
                        {unitsOnTile.map(u => (
                          <div key={u.uniqueId || u.id} className="text-white font-bold text-[10px] flex justify-between">
                            <span>{u.type}</span>
                            <span className="text-emerald-400">{u.health}% HP</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="text-[9px] text-zinc-600 font-mono italic">
                      Combat Modifier: {tile.terrain === "FOREST" || tile.terrain === "HILL" ? "+25% Defense" : tile.terrain === "MOUNTAIN" ? "Impassable" : "Flatground"}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* DIPLOMACY RELATIONSHIP OVERLAY LINE LEGENDS */}
          <div className="absolute top-4 right-4 bg-zinc-950/80 p-3 rounded-lg border border-zinc-800 text-xs text-zinc-400 space-y-1.5 z-10 max-w-[200px] backdrop-blur">
            <h5 className="font-bold text-white text-[10px] uppercase tracking-wider mb-1">Diplomacy Map Overlay</h5>
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 bg-red-500 block"></span>
              <span>Rival / Declared War (Pulsing)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 border-t border-dashed border-emerald-500 block"></span>
              <span>Allied Defensive Pact</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-4 h-0.5 border-t border-dashed border-zinc-500 block"></span>
              <span>Standard Neutral / Peace</span>
            </div>
            <div className="border-t border-zinc-900 pt-2 mt-1.5 space-y-1.5">
              <button
                onClick={() => setShowTacticalOverlay(!showTacticalOverlay)}
                className={`w-full py-1.5 rounded text-[8px] font-bold uppercase tracking-wider transition-all border flex items-center justify-center gap-1 cursor-pointer ${
                  showTacticalOverlay
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                    : "bg-zinc-900/60 text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:border-zinc-700"
                }`}
              >
                📊 {showTacticalOverlay ? "Hide Tactical Grid" : "Show Tactical Grid"}
              </button>

              <div className="flex flex-col gap-1 border-t border-zinc-900 pt-1.5">
                <span className="text-[7.5px] font-bold uppercase text-zinc-500 tracking-wider">Climate Overlay</span>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => setClimateOverlay("NONE")}
                    className={`py-1 rounded text-[7.5px] font-bold transition-all border cursor-pointer ${
                      climateOverlay === "NONE"
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                        : "bg-zinc-900/60 text-zinc-500 border-zinc-800 hover:text-zinc-300"
                    }`}
                  >
                    Standard
                  </button>
                  <button
                    onClick={() => setClimateOverlay("TEMPERATURE")}
                    className={`py-1 rounded text-[7.5px] font-bold transition-all border cursor-pointer ${
                      climateOverlay === "TEMPERATURE"
                        ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
                        : "bg-zinc-900/60 text-zinc-500 border-zinc-800 hover:text-zinc-300"
                    }`}
                  >
                    Thermal
                  </button>
                  <button
                    onClick={() => setClimateOverlay("HUMIDITY")}
                    className={`py-1 rounded text-[7.5px] font-bold transition-all border cursor-pointer ${
                      climateOverlay === "HUMIDITY"
                        ? "bg-sky-500/20 text-sky-400 border-sky-500/40"
                        : "bg-zinc-900/60 text-zinc-500 border-zinc-800 hover:text-zinc-300"
                    }`}
                  >
                    Humidity
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* TERRAIN/CIVILIZATION MINIMAP OVERLAY */}
          <div className="absolute bottom-4 right-4 bg-zinc-950/90 p-2.5 rounded-xl border border-zinc-800 text-xs text-zinc-400 space-y-1.5 z-10 backdrop-blur shadow-2xl max-w-[210px]">
            <h5 className="font-bold text-white text-[9px] uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>🗺️ Strategic Minimap</span>
              <span className="text-[7px] text-amber-500 font-mono">{MAP_WIDTH} x {MAP_HEIGHT} Grid</span>
            </h5>
            
            <div 
              className="grid gap-[2.5px] bg-zinc-900 p-1.5 rounded-lg border border-zinc-800/60 overflow-hidden"
              style={{ gridTemplateColumns: `repeat(${MAP_WIDTH}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: MAP_HEIGHT }).map((_, y) => (
                <React.Fragment key={y}>
                  {Array.from({ length: MAP_WIDTH }).map((_, x) => {
                    const tile = gameState.grid[y]?.[x];
                    const owner = tile && tile.ownerCivId ? gameState.civs.find(c => c.id === tile.ownerCivId) : null;
                    const isSelected = selectedHex && selectedHex.x === x && selectedHex.y === y;
                    
                    let baseColor = "#1e293b"; // Default grey / plains
                    if (owner) {
                      baseColor = owner.color;
                    } else if (tile) {
                      if (tile.terrain === "OCEAN" || tile.terrain === "COAST") baseColor = "#1d4ed8";
                      else if (tile.terrain === "FOREST") baseColor = "#065f46";
                      else if (tile.terrain === "HILL") baseColor = "#4b5563";
                      else if (tile.terrain === "MOUNTAIN") baseColor = "#374151";
                      else if (tile.terrain === "DESERT") baseColor = "#d97706";
                      else if (tile.terrain === "RIVER") baseColor = "#0284c7";
                    }
                    
                    return (
                      <button
                        key={`${x}-${y}`}
                        onClick={() => jumpToCoordinate(x, y)}
                        title={`Focus coordinates [${x}, ${y}]`}
                        className={`aspect-square w-full rounded-[1px] transition-all hover:scale-125 hover:brightness-125 cursor-pointer ${
                          isSelected ? "ring-[1.5px] ring-amber-400 scale-110 z-20" : "opacity-85"
                        }`}
                        style={{ backgroundColor: baseColor }}
                      />
                    );
                  })}
                </React.Fragment>
              ))}
            </div>
            
            <div className="text-[7px] text-zinc-500 font-mono flex justify-between pt-0.5">
              <span>Click a tile to jump camera</span>
              <span className="text-zinc-400">{selectedHex ? `[${selectedHex.x}, ${selectedHex.y}]` : "No Focus"}</span>
            </div>
          </div>
        </div>

        {/* SPORTS COMMENTARY LOWER-THIRD */}
        <section className="h-28 border-t border-zinc-800/80 bg-zinc-950/90 flex flex-col justify-center px-8 relative animate-breath">
          <div className="absolute top-3 left-8 text-[10px] font-bold text-amber-500 uppercase tracking-[0.3em] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            World Oracle Commentary
          </div>

          <div className="absolute top-3.5 right-8 flex items-center gap-3">
            {isSpeaking && (
              <div className="flex items-center gap-1.5 h-4 px-1">
                <span className="w-0.5 h-2 bg-amber-500 rounded-full animate-bounce [animation-duration:0.6s]" />
                <span className="w-0.5 h-3.5 bg-amber-500 rounded-full animate-bounce [animation-duration:0.8s]" />
                <span className="w-0.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-duration:0.5s]" />
              </div>
            )}
            <button
              onClick={() => {
                if (isVoiceEnabled) {
                  window.speechSynthesis.cancel();
                  setIsSpeaking(false);
                }
                setIsVoiceEnabled(!isVoiceEnabled);
              }}
              className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 transition-all text-[9px] font-bold uppercase tracking-widest ${
                isVoiceEnabled
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : "bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-zinc-300"
              }`}
              title="Toggle Live Audio Sports Commentator Voice"
            >
              {isVoiceEnabled ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 animate-pulse text-amber-500" /> Voice On
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5 text-zinc-600" /> Muted
                </>
              )}
            </button>
          </div>
          
          <div className="max-w-4xl mt-2 pr-28">
            {latestOracleEvent ? (
              <>
                <h2 className="text-xl font-black font-display text-white uppercase tracking-wide">
                  🎙️ {latestOracleEvent.headline}
                </h2>
                <p className="text-xs md:text-sm text-zinc-400 leading-relaxed mt-1 line-clamp-2 italic">
                  "{latestOracleEvent.summary}"
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-black font-display text-zinc-400 uppercase tracking-wide">
                  Waiting for initial sports commentating analysis...
                </h2>
                <p className="text-xs text-zinc-600 mt-1">
                  Gemini AI strategic summary sweeps occur every 10 turns. Move unit garrisons to trigger minor event commentary.
                </p>
              </>
            )}
          </div>
        </section>

        {/* TIMEWAVE ZERO INTERACTIVE MONITOR PANEL */}
        <section className="h-32 w-full max-w-full bg-[#020204]/95 border-t border-zinc-900 flex items-center px-4 gap-6 shrink-0 relative overflow-hidden select-none font-sans">
          {/* Left Panel: Stats & Calibration */}
          <div className="w-48 shrink-0 flex flex-col justify-center border-r border-zinc-900/60 pr-4">
            <div className="flex items-center gap-1.5 text-[9px] text-amber-500 uppercase tracking-widest font-black">
              <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" /> Timewave Zero Monitor
            </div>
            <div className="text-white text-xs font-bold font-mono mt-1 flex justify-between">
              <span>NOVELTY:</span>
              <span className="text-cyan-400 font-extrabold">{currentNovelty}/100</span>
            </div>
            <div className="text-[9px] text-zinc-500 font-mono mt-0.5 uppercase">
              {currentNovelty < 30 ? (
                <span className="text-cyan-400 font-extrabold animate-pulse">● INFINITE RESONANCE</span>
              ) : currentNovelty < 50 ? (
                <span className="text-emerald-400">● DYNAMIC SYNTHESIS</span>
              ) : currentNovelty < 70 ? (
                <span className="text-zinc-400">● BIFURCATION REGIME</span>
              ) : (
                <span className="text-amber-500/80">● HABITUATED STASIS</span>
              )}
            </div>
            <div className="mt-1.5 pt-1.5 border-t border-zinc-950 flex justify-between text-[9px] font-mono text-zinc-400">
              <span>ESCHATON IN:</span>
              <span className="text-red-400 font-black tracking-widest animate-pulse">{120 - gameState.turn} TURNS</span>
            </div>
          </div>

          {/* Middle Panel: Gorgeous SVG Fractal Chart */}
          <div className="flex-1 h-full flex flex-col justify-center relative min-w-[300px]">
            <div className="flex justify-between items-center text-[8px] font-mono text-zinc-500 uppercase tracking-widest mb-1">
              <span>HABIT [STABILITY]</span>
              <span className="text-zinc-600">CALIBRATION: SHELIAK SCALE-ZERO</span>
              <span>NOVELTY [COMPLEXITY]</span>
            </div>
            
            <div className="relative w-full h-[55px] bg-[#030307] rounded border border-zinc-900/80 overflow-hidden">
              {/* Background horizontal reference lines */}
              <div className="absolute top-[13px] left-0 right-0 h-[0.5px] bg-white/5 pointer-events-none" />
              <div className="absolute top-[27px] left-0 right-0 h-[0.5px] border-t border-dashed border-white/5 pointer-events-none" />
              <div className="absolute top-[41px] left-0 right-0 h-[0.5px] bg-white/5 pointer-events-none" />

              {/* SVG Wave */}
              <svg className="w-full h-full" viewBox="0 0 450 55" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="novelty-grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Fill Area */}
                <path d={areaD} fill="url(#novelty-grad)" />

                {/* Outline Curve */}
                <path d={lineD} fill="none" stroke="#22d3ee" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* Current Turn vertical marker line */}
                {(() => {
                  const count = wavePoints.endTurn - wavePoints.startTurn;
                  const currentX = ((gameState.turn - wavePoints.startTurn) / (count || 1)) * 450;
                  return (
                    <g>
                      <line
                        x1={currentX}
                        y1="0"
                        x2={currentX}
                        y2="55"
                        stroke="#ef4444"
                        strokeWidth="1"
                        strokeDasharray="2,2"
                      />
                      <circle
                        cx={currentX}
                        cy={((100 - currentNovelty) / 100) * 40 + 5}
                        r="3.5"
                        fill="#090d16"
                        stroke="#22d3ee"
                        strokeWidth="1.5"
                        className="animate-pulse"
                      />
                    </g>
                  );
                })()}
              </svg>
            </div>
            
            {/* Under Chart: Turns index */}
            <div className="flex justify-between text-[8px] font-mono text-zinc-500 mt-1">
              <span>TURN {wavePoints.startTurn}</span>
              <span className="text-cyan-400/80 font-bold">CURRENT: TURN {gameState.turn}</span>
              <span>TURN {wavePoints.endTurn}</span>
            </div>
          </div>

          {/* Right Panel: Scrollable Turn Scrubber */}
          <div className="w-80 shrink-0 h-full border-l border-zinc-900 pl-4 flex flex-col justify-center">
            <div className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5">
              Historical Chronology Archive
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none h-[42px] items-center">
              {gameState.turnSummaries.map((summary) => (
                <button
                  key={summary.uniqueId || summary.turn}
                  onClick={() => {
                    setGameState(p => ({ ...p, turn: summary.turn }));
                  }}
                  className={`px-2 py-1 rounded border flex flex-col items-center justify-center min-w-[45px] shrink-0 transition-all cursor-pointer ${
                    gameState.turn === summary.turn 
                      ? "bg-amber-500/10 border-amber-500/40 text-amber-400 font-extrabold" 
                      : "bg-zinc-950/40 border-zinc-900 hover:border-zinc-800 text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  <span className="text-[8px]">T:{summary.turn}</span>
                  <div className="flex gap-0.5 mt-0.5 text-[6px]">
                    {summary.hasWar && <span className="text-red-500">⚔️</span>}
                    {summary.hasCityChange && <span className="text-amber-500">🏰</span>}
                    {summary.hasTech && <span className="text-cyan-400">🧪</span>}
                  </div>
                </button>
              ))}
              {gameState.turnSummaries.length === 0 && (
                <span className="text-zinc-600 text-[9px] italic">Simulate turns to archive history...</span>
              )}
            </div>
          </div>
        </section>

      </div>

      {/* D. RIGHT PANEL: LEADERBOARDS & STATS */}
      <aside className="w-80 border-l border-zinc-900 bg-[#010205]/98 backdrop-blur-md p-4 flex flex-col h-full overflow-hidden shrink-0 z-10 select-none">
        
        {/* TOP STATS AND LEADERBOARD SCROLL CONTAINER */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
          <div>
            <h2 className="text-sm font-black font-display text-white uppercase tracking-widest border-b border-zinc-800 pb-2 flex items-center gap-1.5">
              <Award className="w-4 h-4 text-amber-500" /> Civilization Leaderboard
            </h2>
          </div>

          {/* LEADERBOARD CARDS */}
          <div className="space-y-3">
            {sortedCivs.map((civ, idx) => {
              const isDead = civ.isDead;
              const isCurrentlySelected = selectedCivId === civ.id;
              
              // Collect count values
              const citiesCount = gameState.cities.filter(c => c.ownerId === civ.id).length;
              const unitsCount = gameState.units.filter(u => u.ownerId === civ.id).length;

              return (
                <div
                  key={civ.uniqueId || civ.id}
                  onClick={() => {
                    const newSelectedId = isCurrentlySelected ? null : civ.id;
                    setSelectedCivId(newSelectedId);
                    if (newSelectedId) {
                      setSidebarTab("advisor");
                    }
                    const firstCity = gameState.cities.find(c => c.ownerId === civ.id);
                    if (firstCity) setCameraFocus({ x: firstCity.x, y: firstCity.y });
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isDead 
                      ? "bg-zinc-900/20 border-zinc-900/60 opacity-40 grayscale"
                      : isCurrentlySelected 
                        ? "bg-zinc-900 border-amber-500/80 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
                        : "bg-zinc-900/40 border-zinc-800/60 hover:bg-zinc-900/80 hover:border-zinc-700"
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-zinc-500">#{idx + 1}</span>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: civ.color }} />
                      <span className="text-xs font-black text-white font-display uppercase tracking-wider">{civ.name}</span>
                    </div>
                    <div className="text-xs font-black text-amber-500 font-display">
                      {civ.score} pts
                    </div>
                  </div>

                  {!isDead && (
                    <div className="space-y-2 mt-1">
                      {/* Badge badges for Grand Strategy and Posture */}
                      <div className="flex flex-wrap gap-1">
                        <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700 font-semibold text-zinc-300">
                          🎯 {civ.grandStrategy}
                        </span>
                        <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-zinc-800/80 border border-zinc-700 font-semibold text-zinc-300">
                          🧪 {civ.researchTheme}
                        </span>
                        {(() => {
                          const status = getGeopoliticalStatus(civ, gameState);
                          return (
                            <span className={`text-[8px] px-1.5 py-0.5 rounded-md border font-extrabold flex items-center gap-1 uppercase tracking-widest ${status.bg}`}>
                              {status.icon} {status.label}
                            </span>
                          );
                        })()}
                      </div>

                      {/* Faction counts */}
                      <div className="grid grid-cols-4 gap-1 border-t border-zinc-800/60 pt-2 text-[9px] text-zinc-500">
                        <div>
                          <span className="block font-bold text-white">{citiesCount}</span>
                          Cities
                        </div>
                        <div>
                          <span className="block font-bold text-white">{unitsCount}</span>
                          Units
                        </div>
                        <div>
                          <span className="block font-bold text-white flex items-center gap-0.5">
                            <Coins className="w-2 h-2 text-yellow-500" /> {civ.gold}
                          </span>
                          Gold
                        </div>
                        <div>
                          <span className="block font-bold text-white flex items-center gap-0.5">
                            <Beaker className="w-2 h-2 text-cyan-500" /> {civ.science}
                          </span>
                          Sci
                        </div>
                      </div>

                      {/* Active tech status progress */}
                      <div className="text-[8px] text-zinc-400 mt-1 border-t border-zinc-800/40 pt-1.5 flex justify-between">
                        <span>Researching: <b>{civ.currentTech}</b></span>
                      </div>

                      {/* Diplomatic posturing panel if selected */}
                      {isCurrentlySelected && (
                        <div className="bg-zinc-950/80 p-2 rounded-lg border border-zinc-800 text-[9px] mt-2 space-y-1">
                          <div className="text-amber-500 font-bold uppercase text-[8px] tracking-wider mb-1">Diplomatic Postures:</div>
                          {Object.entries(civ.diplomaticPostures).map(([id, posture]) => {
                            const targetCiv = gameState.civs.find(c => c.id === id);
                            if (!targetCiv || targetCiv.isDead) return null;
                            const isWar = civ.warPlans[id] && civ.warPlans[id] !== "NONE";
                            
                            return (
                              <div key={id} className="flex justify-between items-center text-zinc-400 border-b border-zinc-900 pb-1">
                                <span>vs {targetCiv.name}:</span>
                                <span className={`font-bold ${
                                  isWar ? "text-red-500" : posture === "ALLY" ? "text-emerald-400" : "text-zinc-500"
                                }`}>
                                  {isWar ? `⚔️ WAR (${civ.warPlans[id]})` : posture}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  {isDead && (
                    <div className="text-[10px] text-red-500/80 font-mono italic mt-1">
                      ⚔️ Faction Defeated in Battle
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* ACTIVE WARS SECTION */}
          <div className="border-t border-zinc-800/60 pt-4 flex flex-col gap-2 shrink-0">
            <h3 className="text-[10px] font-bold font-display text-red-400 uppercase tracking-widest flex items-center gap-1.5">
              <Swords className="w-3.5 h-3.5 animate-pulse" /> Active War Fronts ({activeWarsSummary.length})
            </h3>
            {activeWarsSummary.length === 0 ? (
              <div className="p-2.5 rounded-lg bg-zinc-900/20 border border-zinc-800/40 text-[9px] text-zinc-500 italic text-center font-mono">
                ☮️ Global peace active. No border frontlines declared.
              </div>
            ) : (
              <div className="space-y-2">
                {activeWarsSummary.map(war => (
                  <div key={war.uniqueId} className="p-2.5 rounded-lg bg-red-500/5 border border-red-500/20 text-[10px] space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-red-400 uppercase tracking-wide font-display text-[9px]">
                        💥 {war.frontName}
                      </span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded-md bg-zinc-950 font-bold text-zinc-400 font-mono">
                        {war.duration} Turns
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t border-zinc-800/50 pt-1 text-[9px]">
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: war.attacker.color }} />
                        <span className="text-zinc-300 font-bold">{war.attacker.name}</span>
                      </div>
                      <span className="text-zinc-500 text-[8px] font-mono">VS</span>
                      <div className="flex items-center gap-1">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: war.defender.color }} />
                        <span className="text-zinc-300 font-bold">{war.defender.name}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1 bg-zinc-950/60 p-1.5 rounded text-[8px] font-mono text-zinc-400 text-center">
                      <div>
                        <span className="block font-black text-red-400 text-[10px]">{war.attackerUnits}</span>
                        Garrisons
                      </div>
                      <div>
                        <span className="block font-black text-red-400 text-[10px]">{war.defenderUnits}</span>
                        Garrisons
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* TABBED INTERACTIVE REGION AT BOTTOM */}
        <div className="border-t border-zinc-900 pt-3.5 flex flex-col h-[340px] shrink-0">
          <div className="flex border-b border-zinc-900 pb-2 mb-2 justify-between items-center">
            <div className="flex gap-2">
              <button
                onClick={() => setSidebarTab("chronicle")}
                className={`text-[10px] font-bold font-display uppercase tracking-widest px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  sidebarTab === "chronicle"
                    ? "bg-zinc-800 text-white border border-zinc-700"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Activity className="w-3 h-3" /> Chronicles
              </button>
              <button
                onClick={() => setSidebarTab("advisor")}
                className={`text-[10px] font-bold font-display uppercase tracking-widest px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 relative ${
                  sidebarTab === "advisor"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.1)]"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Sparkles className="w-3 h-3 animate-pulse" /> Advisor Oracle
              </button>
              <button
                onClick={() => setSidebarTab("sheets")}
                className={`text-[10px] font-bold font-display uppercase tracking-widest px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  sidebarTab === "sheets"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Database className="w-3 h-3" /> Sheets Sync
              </button>
              <button
                onClick={() => setSidebarTab("diplomacy")}
                className={`text-[10px] font-bold font-display uppercase tracking-widest px-2.5 py-1 rounded-lg transition-all flex items-center gap-1.5 ${
                  sidebarTab === "diplomacy"
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                <Handshake className="w-3 h-3" /> Diplomacy & Trade
              </button>
            </div>
            
            {sidebarTab === "advisor" && selectedCivId && (
              <button
                onClick={() => generatePortrait(selectedCivId)}
                disabled={isGeneratingPortrait}
                className="text-[8px] bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2 py-0.5 rounded-md hover:bg-amber-500/20 active:scale-95 disabled:opacity-50 transition-all font-mono font-bold flex items-center gap-1"
                title="Generate high-fidelity AI leader portrait illustration"
              >
                {isGeneratingPortrait ? (
                  <>⏳ Generating...</>
                ) : (
                  <>🎨 Paint Art</>
                )}
              </button>
            )}
          </div>

          {sidebarTab === "chronicle" ? (
            <div className="flex-1 flex flex-col min-h-0 space-y-2">
              {/* Category Filter Buttons */}
              <div className="flex flex-wrap gap-1 border-b border-zinc-900/80 pb-2 shrink-0">
                {(["ALL", "COMBAT", "DIPLOMACY", "ECONOMY", "NARRATIVE"] as const).map(f => (
                  <button
                    key={f}
                    onClick={() => setChronicleFilter(f)}
                    className={`px-1.5 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                      chronicleFilter === f
                        ? "bg-amber-500/20 text-amber-400 border-amber-500/40 font-extrabold"
                        : "bg-zinc-950/40 text-zinc-500 border-zinc-900/80 hover:text-zinc-300 hover:border-zinc-800"
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              
              <div 
                ref={logContainerRef}
                className="flex-1 overflow-y-auto space-y-2 pr-1 text-[10px] font-mono leading-normal scrollbar-thin"
              >
                {gameState.events
                  .filter(event => chronicleFilter === "ALL" || event.category === chronicleFilter)
                  .map(event => {
                    let dotColor = "bg-zinc-700";
                    if (event.type === "WAR_DECLARED" || event.type === "PEACE_DECLARED") dotColor = "bg-red-500 animate-ping";
                    if (event.type === "TECH_RESEARCHED") dotColor = "bg-cyan-400";
                    if (event.type === "CITY_CAPTURED") dotColor = "bg-amber-500";
                    
                    return (
                      <div 
                        key={event.uniqueId || event.id}
                        className="p-1.5 rounded bg-zinc-900/30 border border-zinc-900/60 hover:bg-zinc-900/60 transition-all flex items-start gap-2 relative pl-4"
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${dotColor} absolute left-1.5 top-2.5`} />
                        <div className="flex-1">
                          <div className="flex justify-between items-center text-[8px] text-zinc-500 mb-0.5">
                            <span className="text-amber-500/80 font-bold">[Turn {event.turn}]</span>
                            <span className="uppercase text-[7px] tracking-widest font-bold px-1 rounded bg-zinc-800/80">
                              {event.category || "General"}
                            </span>
                          </div>
                          <span className="text-white font-bold block">{event.headline}</span>
                          <span className="text-zinc-400 text-[9px] leading-relaxed block mt-0.5">{event.summary}</span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ) : sidebarTab === "sheets" ? (
            <div className="flex-1 flex flex-col overflow-hidden text-xs space-y-3">
              {!googleUser ? (
                <div className="flex-1 flex flex-col justify-center p-3 rounded-xl bg-emerald-950/10 border border-emerald-500/10 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <Database className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-white uppercase tracking-wider text-[11px] font-display">Google Sheets Live Analytics</h4>
                      <p className="text-[10px] text-zinc-400 leading-normal mt-1">
                        Connect with Google Workspace to provision and synchronize a real-time leaderboard dashboard and historical event logs inside Google Sheets.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleSheetsLogin}
                    disabled={isGoogleLoading}
                    className="w-full py-2 bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-50 font-bold uppercase tracking-widest text-[9px] rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1.5"
                  >
                    {isGoogleLoading ? "Connecting..." : "Authorize Google Workspace"}
                  </button>

                  <div className="text-[8.5px] text-zinc-500 font-mono text-center">
                    Requires `spreadsheets` and `drive.file` API scopes.
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col overflow-hidden space-y-2.5">
                  {/* Account Metadata */}
                  <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60 flex items-center justify-between shrink-0">
                    <div className="min-w-0">
                      <span className="text-[8px] font-mono text-emerald-400 uppercase tracking-wider font-bold">Authorized Account</span>
                      <p className="text-[10px] text-zinc-300 font-semibold truncate max-w-[150px]">{googleUser.email}</p>
                    </div>
                    <button
                      onClick={handleSheetsLogout}
                      className="text-[8px] px-2 py-1 bg-zinc-950 border border-red-500/30 text-red-400 hover:bg-red-500/10 rounded transition-all font-bold uppercase tracking-wider"
                    >
                      Disconnect
                    </button>
                  </div>

                  {/* Spreadsheet Sync Controls */}
                  <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 scrollbar-thin">
                    {!activeSpreadsheet ? (
                      <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-900 text-center space-y-3">
                        <p className="text-[10px] text-zinc-400">
                          Create a brand-new, styled Google Spreadsheet with structured tables for all scores and historical event records.
                        </p>
                        <button
                          onClick={handleCreateAndSyncSpreadsheet}
                          disabled={isGoogleLoading}
                          className="w-full py-2 bg-emerald-500 text-black hover:bg-emerald-400 disabled:opacity-50 font-bold uppercase tracking-widest text-[9px] rounded-lg transition-all active:scale-95 flex items-center justify-center gap-1.5"
                        >
                          {isGoogleLoading ? "Creating..." : "Create & Provision Spreadsheet"}
                        </button>
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg bg-emerald-950/5 border border-emerald-500/20 space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-mono text-emerald-400 uppercase tracking-wider font-bold">Active Connection</span>
                          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping" />
                        </div>

                        <a
                          href={activeSpreadsheet.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-2 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-center text-[10px] font-bold text-emerald-400 transition-all flex items-center justify-center gap-1.5"
                        >
                          Open Google Spreadsheet Dashboard ↗
                        </a>

                        <div className="grid grid-cols-2 gap-1.5">
                          <button
                            onClick={handleManualSync}
                            disabled={isGoogleLoading}
                            className="py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white rounded text-[9px] font-bold uppercase tracking-wider transition-all disabled:opacity-50"
                          >
                            Sync Now
                          </button>
                          <label className="flex items-center justify-center gap-1.5 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded p-1 text-[9px] cursor-pointer hover:bg-zinc-800 transition-all">
                            <input
                              type="checkbox"
                              checked={autoSyncSheets}
                              onChange={e => setAutoSyncSheets(e.target.checked)}
                              className="rounded bg-zinc-950 border-zinc-800 text-emerald-500 focus:ring-emerald-500"
                            />
                            <span>Auto Sync</span>
                          </label>
                        </div>
                      </div>
                    )}

                    {/* Console Logs Terminal */}
                    <div className="rounded-lg border border-zinc-900 bg-[#020204] p-2 font-mono text-[8px] space-y-1.5 h-28 flex flex-col overflow-hidden">
                      <div className="text-zinc-500 uppercase tracking-widest font-black shrink-0 flex items-center gap-1 border-b border-zinc-900 pb-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Console Logs
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin">
                        {sheetsLogs.length === 0 ? (
                          <div className="text-zinc-700 italic">No operations recorded yet.</div>
                        ) : (
                          sheetsLogs.map((log, idx) => (
                            <div key={`${log}-${idx}`} className="text-zinc-400 leading-normal">{log}</div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : sidebarTab === "diplomacy" ? (
            <div className="flex-1 flex flex-col overflow-hidden text-xs space-y-2">
              <div className="flex items-center justify-between shrink-0">
                <span className="text-[10px] font-bold font-display uppercase text-zinc-400 tracking-wider">
                  🤝 Diplomatic Ledger & Trade History
                </span>
                <span className="text-[8px] font-mono text-zinc-500">
                  Turn {gameState.turn} Updates
                </span>
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-2.5 pr-1.5 scrollbar-thin">
                {/* Active Treaties & Relationships */}
                <div className="p-2 bg-zinc-900/40 rounded-lg border border-zinc-800/60 shrink-0">
                  <h4 className="text-[8.5px] uppercase font-bold text-rose-400 tracking-wider mb-2">
                    Active Faction Postures
                  </h4>
                  <div className="space-y-1.5">
                    {gameState.civs.map(civ => {
                      if (civ.isDead) return null;
                      const isAtWar = activeWarsSummary.some(w => w.attacker.id === civ.id || w.defender.id === civ.id);
                      
                      return (
                        <div key={civ.id} className="flex items-center justify-between p-1.5 rounded bg-zinc-950/60 border border-zinc-900">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ backgroundColor: civ.color }} />
                            <span className="font-semibold text-zinc-200 text-[10px]">{civ.name} ({civ.leader})</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {isAtWar ? (
                              <span className="px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-[7px] font-bold text-red-400 uppercase tracking-wider animate-pulse">
                                ⚔️ WAR
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-[7px] font-bold text-emerald-400 uppercase tracking-wider">
                                🕊️ PEACE
                              </span>
                            )}
                            <span className="text-[7.5px] font-mono text-zinc-500">
                              Techs: {civ.researchedTechs.length}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Event History for Diplomacy & Trade */}
                <div className="p-2 bg-zinc-900/40 rounded-lg border border-zinc-800/60">
                  <h4 className="text-[8.5px] uppercase font-bold text-amber-500 tracking-wider mb-2">
                    Diplomatic Chronicle & Trade Logs
                  </h4>
                  <div className="space-y-1.5">
                    {gameState.events
                      .filter(e => e.category === "DIPLOMACY" || e.headline.includes("TRADE") || e.headline.includes("PEACE") || e.headline.includes("WAR") || e.type === "SCIENCE_LEAP")
                      .slice()
                      .reverse()
                      .slice(0, 15)
                      .map((event) => (
                        <div key={event.id} className="p-1.5 rounded bg-zinc-950/45 border border-zinc-900/70 text-[9px] space-y-1">
                          <div className="flex items-center justify-between text-[7px] font-mono text-zinc-500">
                            <span>TURN {event.turn}</span>
                            <span>{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
                          </div>
                          <div className="font-bold text-zinc-300">
                            {event.headline}
                          </div>
                          <p className="text-[8px] text-zinc-400 leading-normal">
                            {event.summary}
                          </p>
                        </div>
                      ))}
                    {gameState.events.filter(e => e.category === "DIPLOMACY" || e.headline.includes("TRADE") || e.headline.includes("PEACE") || e.headline.includes("WAR")).length === 0 && (
                      <div className="text-center py-4 text-zinc-600 font-mono text-[8.5px] italic">
                        No active diplomatic updates or trade routes recorded yet. Let simulation turns process!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col overflow-hidden text-xs">
              {!selectedCivId ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center p-4 text-zinc-500 space-y-2">
                  <HelpCircle className="w-8 h-8 text-zinc-700" />
                  <p className="text-xs">No civilization selected.</p>
                  <p className="text-[10px] text-zinc-600 max-w-[200px]">
                    Click a civilization card on the leaderboard above to summon their Grand AI Strategic Advisor.
                  </p>
                </div>
              ) : (() => {
                const selectedCiv = gameState.civs.find(c => c.id === selectedCivId);
                if (!selectedCiv) return null;

                const chats = advisorChats[selectedCivId] || [
                  {
                    sender: "advisor",
                    text: `Greetings, mortal observer. I am ${selectedCiv.leader}, the ruler of the ${selectedCiv.name}. Ask me of our strategic designs on turn ${gameState.turn}, real-world history, or professional Freeciv guidance!`,
                    timestamp: Date.now()
                  }
                ];

                const portrait = civPortraits[selectedCivId];

                return (
                  <div className="flex-1 flex flex-col h-full overflow-hidden">
                    {/* LEADER HEADER BAR */}
                    <div className="flex items-center gap-2 pb-2 border-b border-zinc-900 shrink-0">
                      {/* LEADER MINI PORTRAIT CARD */}
                      <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 shrink-0 overflow-hidden flex items-center justify-center relative">
                        {portrait === "fallback" ? (
                          <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 p-0.5 relative">
                            {/* Beautiful Procedural Fallback SVG Portrait */}
                            <svg viewBox="0 0 100 100" className="w-full h-full">
                              <defs>
                                <radialGradient id={`grad-${selectedCivId}`} cx="50%" cy="50%" r="50%">
                                  <stop offset="0%" stopColor={selectedCiv.color} stopOpacity="0.4" />
                                  <stop offset="100%" stopColor="#18181b" />
                                </radialGradient>
                              </defs>
                              <circle cx="50%" cy="50%" r="48" fill={`url(#grad-${selectedCivId})`} />
                              {selectedCivId === "rome" && (
                                <g stroke="#fff" strokeWidth="2" fill="none">
                                  <path d="M35,35 Q50,45 65,35 M50,45 L50,75 M35,75 L65,75" strokeWidth="4" />
                                  <circle cx="50%" cy="25" r="8" fill={selectedCiv.color} />
                                </g>
                              )}
                              {selectedCivId === "han" && (
                                <g stroke="#fff" strokeWidth="2" fill="none">
                                  <rect x="35" y="45" width="30" height="30" rx="3" fill={selectedCiv.color} opacity="0.3" />
                                  <path d="M50,45 L50,75 M40,60 L60,60" />
                                  <circle cx="50%" cy="25" r="8" fill="#fff" />
                                </g>
                              )}
                              {selectedCivId === "maya" && (
                                <g stroke="#fff" strokeWidth="2" fill="none">
                                  <polygon points="50,15 80,75 20,75" fill={selectedCiv.color} opacity="0.3" />
                                  <circle cx="50%" cy="48" r="8" fill="#fff" />
                                </g>
                              )}
                              {selectedCivId === "viking" && (
                                <g stroke="#fff" strokeWidth="2" fill="none">
                                  <path d="M30,30 L50,10 L70,30 Q50,40 30,30 Z" fill={selectedCiv.color} />
                                  <circle cx="50%" cy="55" r="10" fill="#fff" />
                                  <path d="M50,65 L50,85 M40,75 L60,75" />
                                </g>
                              )}
                            </svg>
                          </div>
                        ) : portrait ? (
                          <img 
                            src={portrait} 
                            alt={selectedCiv.leader} 
                            className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-all"
                            onClick={() => setActivePortraitModal(portrait)}
                          />
                        ) : (
                          <div className="text-[14px] text-zinc-500 font-bold uppercase">
                            {selectedCiv.leader.charAt(0)}
                          </div>
                        )}
                        {/* Status Light */}
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-zinc-950 rounded-full animate-pulse" />
                      </div>

                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-black text-white uppercase tracking-wider font-display flex items-center gap-1 leading-tight truncate">
                          {selectedCiv.leader}
                        </h4>
                        <p className="text-[9px] text-zinc-400 font-mono flex items-center gap-1 truncate">
                          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: selectedCiv.color }} />
                          {selectedCivId === "rome" && "Imperator of Rome"}
                          {selectedCivId === "han" && "Heavenly Ruler of Han"}
                          {selectedCivId === "maya" && "Ahau of Palenque"}
                          {selectedCivId === "viking" && "Saga-King of North"}
                        </p>
                      </div>
                    </div>

                    {/* CHAT MESSAGES BODY */}
                    <div className="flex-1 overflow-y-auto space-y-2 p-1 border-b border-zinc-900 my-1 scrollbar-thin flex flex-col">
                      {chats.map((c, i) => (
                        <div 
                          key={`${c.sender}-${c.timestamp}-${i}`} 
                          className={`max-w-[85%] rounded-xl p-2.5 text-[10px] leading-relaxed border flex flex-col ${
                            c.sender === "user"
                              ? "bg-zinc-900 border-zinc-800 text-white self-end rounded-tr-none"
                              : "bg-zinc-950 border-zinc-900 text-zinc-300 self-start rounded-tl-none font-sans"
                          }`}
                        >
                          <div className="text-[8px] font-mono text-zinc-500 uppercase font-bold mb-0.5 tracking-wider">
                            {c.sender === "user" ? "Spectator Guide" : selectedCiv.leader}
                          </div>
                          <p className="whitespace-pre-wrap">{c.text}</p>
                        </div>
                      ))}
                      {isAdvisorTyping && (
                        <div className="bg-zinc-950 border border-zinc-900 text-zinc-300 rounded-xl p-2.5 text-[10px] max-w-[80%] self-start rounded-tl-none font-sans flex flex-col space-y-1">
                          <div className="text-[8px] font-mono text-zinc-500 uppercase font-bold tracking-wider">
                            {selectedCiv.leader} is drafting strategy...
                          </div>
                          <div className="flex items-center gap-1 py-1">
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce" />
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* INPUT FORM */}
                    <form onSubmit={sendAdvisorMessage} className="flex gap-1.5 pt-1.5 shrink-0">
                      <input
                        type="text"
                        value={advisorInput}
                        onChange={e => setAdvisorInput(e.target.value)}
                        placeholder={`Ask ${selectedCiv.leader} for plans or history...`}
                        disabled={isAdvisorTyping}
                        className="flex-1 px-2.5 py-1.5 text-[10px] rounded-lg bg-zinc-950 border border-zinc-900 focus:border-amber-500/50 text-white focus:outline-none placeholder-zinc-600 disabled:opacity-50 transition-all font-sans"
                      />
                      <button
                        type="submit"
                        disabled={isAdvisorTyping || !advisorInput.trim()}
                        className="px-3 bg-amber-500 text-black rounded-lg text-[10px] font-bold hover:bg-amber-400 active:scale-95 disabled:opacity-30 disabled:scale-100 transition-all font-display uppercase tracking-widest flex items-center justify-center"
                      >
                        Send
                      </button>
                    </form>
                  </div>
                );
              })()}
            </div>
          )}
        </div>
      </aside>

      {/* FOOTER TICKER NOTIFICATIONS */}
      {gameState.isAiDeciding && (
        <div className="fixed bottom-4 left-4 z-40 bg-zinc-950 border border-amber-500/40 p-3 rounded-lg flex items-center gap-2.5 shadow-xl">
          <div className="w-3 h-3 rounded-full bg-amber-500 animate-ping" />
          <span className="text-xs font-semibold text-amber-100 font-display">
            🎙️ World Oracle is drafting strategic narratives...
          </span>
        </div>
      )}
      {/* E. PORTRAIT ILLUSTRATION LIGHTBOX MODAL */}
      {activePortraitModal && (
        <div 
          onClick={() => setActivePortraitModal(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md cursor-pointer animate-fade-in"
        >
          <div className="relative max-w-lg w-full p-4 mx-4 bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col items-center">
            <button 
              onClick={() => setActivePortraitModal(null)}
              className="absolute top-4 right-4 text-zinc-500 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="w-full aspect-square rounded-xl overflow-hidden border border-zinc-900 bg-zinc-900/60 shadow-inner">
              <img 
                src={activePortraitModal} 
                alt="AI Visual Chronicle" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="mt-4 text-center">
              <span className="text-[10px] text-amber-500 font-mono uppercase tracking-[0.2em] font-bold">
                🔮 AI Visual Chronicle
              </span>
              <h4 className="text-sm font-bold text-white mt-1">
                {gameState.civs.find(c => civPortraits[c.id] === activePortraitModal)?.leader} Portrait
              </h4>
              <p className="text-[11px] text-zinc-400 mt-1 max-w-sm mx-auto leading-relaxed italic">
                "A customized high-fidelity digital illustration capturing the strategic soul of this civilization, generated dynamically using the Gemini Multi-Modal Creative Engine."
              </p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
