/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TerrainType = "GRASS" | "FOREST" | "HILL" | "MOUNTAIN" | "COAST" | "OCEAN" | "DESERT" | "RIVER";

export interface HexTile {
  x: number;
  y: number;
  terrain: TerrainType;
  ownerCivId: string | null;
  improvement: "FARM" | "MINE" | "ROAD" | "WALLS" | null;
  cityId: string | null;
}

export type GrandStrategy = 
  | "EXPAND" 
  | "TALL_TECH" 
  | "MILITARY_RUSH" 
  | "DEFENSIVE_TURTLE" 
  | "DIPLOMACY_TRADE";

export type ResearchTheme = 
  | "ECONOMY" 
  | "SCIENCE" 
  | "MILITARY_LAND" 
  | "MILITARY_NAVAL" 
  | "INFRASTRUCTURE";

export type CityRole = 
  | "CORE_GROWTH" 
  | "INDUSTRIAL_HUB" 
  | "SCIENCE_CENTER" 
  | "FORTRESS_BORDER" 
  | "NAVAL_PORT";

export type DiplomaticPosture = 
  | "ALLY" 
  | "FRIENDLY" 
  | "NEUTRAL" 
  | "RIVAL" 
  | "TARGET";

export type WarPlan = 
  | "BLITZ_CAPTURE_CAPITAL" 
  | "SIEGE_BORDER_CITIES" 
  | "RAID_ECONOMY" 
  | "DEFEND_AND_COUNTER" 
  | "FORCED_PEACE"
  | "NONE";

export type ExplorationFocus = 
  | "RESOURCE_RICH_AREAS" 
  | "COASTLINES" 
  | "ENEMY_BORDERS" 
  | "INLAND_GAPS";

// Represents a city in the simulation
export interface City {
  id: string;
  uniqueId?: string;
  name: string;
  ownerId: string;
  x: number;
  y: number;
  population: number;
  role: CityRole;
  currentBuild: string;
  productionProgress: number;
  foodProgress: number;
  isUnderSiege: boolean;
}

// Represents a unit in the simulation
export type UnitType = "SETTLER" | "WARRIOR" | "ARCHER" | "LEGION" | "TRIREME";

export interface Unit {
  id: string;
  uniqueId?: string;
  type: UnitType;
  ownerId: string;
  x: number;
  y: number;
  health: number; // 0 to 100
  hasMoved: boolean;
  combatStrength: number;
  pathHistory?: { x: number; y: number }[];
}

// Represents a civilization
export interface Civilization {
  id: string;
  uniqueId?: string;
  name: string;
  leader: string;
  color: string; // Tailwind hex color
  secondaryColor: string; // Secondary border/glow color
  gold: number;
  science: number;
  score: number;
  isDead: boolean;
  
  // High-level AI posture and goals (determined by Gemini/heuristics)
  grandStrategy: GrandStrategy;
  researchTheme: ResearchTheme;
  explorationFocus: ExplorationFocus;
  diplomaticPostures: Record<string, DiplomaticPosture>; // civId -> posture
  warPlans: Record<string, WarPlan>; // enemyCivId -> warPlan
  currentTech: string;
  researchedTechs: string[];
}

export interface Technology {
  id: string;
  name: string;
  cost: number;
  theme: ResearchTheme;
  benefits: string;
}

// Event-driven narrative and visual engine structures
export type EventSource = "SYSTEM" | "AI" | "PLAYER";
export type EventSeverity = "MINOR" | "MAJOR" | "CINEMATIC";
export type EventCategory = "COMBAT" | "CITY" | "DIPLOMACY" | "TECH" | "ECONOMY" | "NARRATIVE" | "MISC";
export type EventType =
  | "WAR_DECLARED"
  | "PEACE_DECLARED"
  | "ALLIANCE_FORGED"
  | "CITY_FOUNDED"
  | "CITY_CAPTURED"
  | "CITY_LOST"
  | "UNIT_CREATED"
  | "UNIT_DESTROYED"
  | "BATTLE_RESOLVED"
  | "TECH_RESEARCHED"
  | "ERA_ADVANCED"
  | "TURN_RECAP"
  | "WORLD_NARRATIVE"
  | "SCORE_CHANGE"
  | "CIV_ELIMINATED";

export interface EventLocation {
  x: number;
  y: number;
}

export interface CivRef {
  id: string;
  name: string;
  color: string;
}

export interface CityRef {
  id: string;
  name: string;
  ownerId: string;
  location: EventLocation;
}

export interface UnitRef {
  id: string;
  ownerId: string;
  type: UnitType;
  location: EventLocation;
}

export type EventIcon =
  | "swords"
  | "handshake"
  | "city"
  | "skull"
  | "tower"
  | "beaker"
  | "crown"
  | "star"
  | "scroll"
  | "shield"
  | "heart-crack";

export interface GameEvent {
  id: string;
  uniqueId?: string;
  turn: number;
  timestamp: number;
  type: EventType;
  category: EventCategory;
  severity: EventSeverity;
  source: EventSource;
  icon: EventIcon;
  headline: string;
  summary: string;
  
  primaryCiv?: CivRef;
  secondaryCiv?: CivRef;
  city?: CityRef;
  units?: UnitRef[];
  locations?: EventLocation[];
  focusLocation?: EventLocation;
  
  showInTicker?: boolean;
  showInLog?: boolean;
  triggerCinematic?: boolean;
}

// Bottom turn timeline structures
export interface TurnSummary {
  turn: number;
  uniqueId?: string;
  majorEvents: string[]; // event IDs
  hasWar: boolean;
  hasCityChange: boolean;
  hasTech: boolean;
}

export interface TurnEndPayload {
  turn: number;
  events: GameEvent[];
  summary: TurnSummary;
  primaryCinematicEventId?: string;
}

// Full game state
export interface GameState {
  turn: number;
  width: number;
  height: number;
  grid: HexTile[][];
  civs: Civilization[];
  cities: City[];
  units: Unit[];
  events: GameEvent[];
  turnSummaries: TurnSummary[];
  isAiDeciding: boolean;
}

// Schemas for Gemini updates
export interface GeminiDecisionPayload {
  civs: {
    id: string;
    grandStrategy: GrandStrategy;
    researchTheme: ResearchTheme;
    explorationFocus: ExplorationFocus;
    cityRoles: Record<string, CityRole>; // cityName -> cityRole
    diplomaticPostures: Record<string, DiplomaticPosture>; // otherCivId -> posture
    warPlans: Record<string, WarPlan>; // otherCivId -> warPlan
  }[];
  worldNarrator: {
    headline: string;
    summary: string;
    optionalGlobalEvent?: "BARBARIAN_INCIDENT" | "GOLDEN_AGE" | "RESOURCE_BOOM" | "NONE";
  };
}
