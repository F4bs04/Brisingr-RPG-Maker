
export enum TerrainType {
  VOID = 'VOID', // Transparent/Empty for background maps
  GRASS = 'GRASS',
  WATER = 'WATER',
  STONE = 'STONE',
  DIRT = 'DIRT',
  WALL = 'WALL',
  LAVA = 'LAVA'
}

export interface Character {
  id: string;
  name: string;
  description?: string; // Texto revelado ao passar o mouse
  imageUrl: string;
  x: number;
  y: number;
  size: number; // 1 means 1 hex
  isVisible: boolean; // Controls visibility for non-hosts
}

// Sparse grid storage: key is "x,y" (e.g., "10,-5"), value is the terrain type
export type GridMap = Record<string, TerrainType>;

export type Tool = 'paint' | 'erase' | 'move_char' | 'pan';

export interface ViewState {
  scale: number;
  translateX: number;
  translateY: number;
}

// --- Multiplayer Types ---

export type PeerMessage = 
  | { type: 'SYNC_STATE'; payload: { grid: GridMap; characters: Character[]; backgroundImage: string | null; hexSize: number } }
  | { type: 'UPDATE_GRID'; payload: GridMap }
  | { type: 'UPDATE_CHARS'; payload: Character[] }
  | { type: 'UPDATE_BG'; payload: string | null }
  | { type: 'DICE_ROLL'; payload: { result: number; type: number; user: string } }
  | { type: 'REQUEST_MOVE'; payload: { id: string; x: number; y: number } }; // Client asking host to move
