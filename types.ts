
export enum TerrainType {
  VOID = 'VOID', // Transparent/Empty for background maps
  GRASS = 'GRASS',
  WATER = 'WATER',
  STONE = 'STONE',
  DIRT = 'DIRT',
  WALL = 'WALL',
  LAVA = 'LAVA'
}

export type TokenType = 'character' | 'prop';

export interface Character {
  id: string;
  name: string;
  description?: string; // Texto revelado ao passar o mouse
  imageUrl: string;
  x: number;
  y: number;
  size: number; // 1 means 1 hex
  isVisible: boolean; // Controls visibility for non-hosts
  type: TokenType; // New field to distinguish between framed characters and raw props
}

// Sparse grid storage: key is "x,y" (e.g., "10,-5"), value is the terrain type
export type GridMap = Record<string, TerrainType>;

export type Tool = 'paint' | 'erase' | 'move_char' | 'pan';

export interface ViewState {
  scale: number;
  translateX: number;
  translateY: number;
}

export interface Scenario {
  id: string;
  name: string;
  previewUrl: string | null; // Thumbnail or same as bg
  backgroundImage: string | null;
  backgroundWidth?: number; // New: Store aspect ratio info
  backgroundHeight?: number; // New: Store aspect ratio info
  grid: GridMap;
  characters: Character[];
  hexSize: number;
}

export interface UserLocation {
  username: string;
  scenarioId: string;
}

export interface SessionData {
  scenarios: Scenario[]; // New multi-scenario support
  currentScenarioId: string; // Which one was active
  grid: GridMap; // Fallback/Legacy
  characters: Character[]; // Fallback/Legacy
  backgroundImage: string | null; // Fallback/Legacy
  backgroundWidth?: number;
  backgroundHeight?: number;
  hexSize: number;
  version: string;
  timestamp: number;
}

// --- Multiplayer Types ---

export type PeerMessage = 
  | { type: 'SYNC_STATE'; payload: { 
      grid: GridMap; 
      characters: Character[]; 
      backgroundImage: string | null; 
      backgroundWidth: number;
      backgroundHeight: number;
      hexSize: number; 
      scenarios: Scenario[]; 
      currentScenarioId: string 
    } }
  | { type: 'UPDATE_GRID'; payload: GridMap }
  | { type: 'UPDATE_CHARS'; payload: Character[] }
  | { type: 'UPDATE_BG'; payload: { url: string | null; width: number; height: number } }
  | { type: 'DICE_ROLL'; payload: { result: number; type: number; user: string } }
  | { type: 'REQUEST_MOVE'; payload: { id: string; x: number; y: number } }
  | { type: 'UPDATE_SCENARIOS'; payload: Scenario[] } // List of available maps
  | { type: 'USER_LOCATION'; payload: UserLocation }; // Who is where
