import { TerrainType } from './types';

export const GRID_SIZE_DEFAULT = 20; // Increased default size for better hex experience

// Using SVG fill classes or RGBA for SVG logic
export const TERRAIN_COLORS: Record<TerrainType, string> = {
  [TerrainType.VOID]: 'fill-transparent stroke-gray-700/30', // Visible grid lines but transparent body
  [TerrainType.GRASS]: 'fill-green-600/90 hover:fill-green-500',
  [TerrainType.WATER]: 'fill-blue-500/90 hover:fill-blue-400',
  [TerrainType.STONE]: 'fill-gray-500/90 hover:fill-gray-400',
  [TerrainType.DIRT]: 'fill-yellow-700/90 hover:fill-yellow-600',
  [TerrainType.WALL]: 'fill-gray-800 hover:fill-gray-700',
  [TerrainType.LAVA]: 'fill-red-600/90 hover:fill-red-500 animate-pulse',
};

export const TERRAIN_LABELS: Record<TerrainType, string> = {
  [TerrainType.VOID]: 'Vazio (Ver Fundo)',
  [TerrainType.GRASS]: 'Grama',
  [TerrainType.WATER]: 'Água',
  [TerrainType.STONE]: 'Pedra',
  [TerrainType.DIRT]: 'Terra',
  [TerrainType.WALL]: 'Parede',
  [TerrainType.LAVA]: 'Lava',
};

export const TOKEN_LIBRARY = [
  'knight.png',
  'wizard.png',
  'rogue.png',
  'cleric.png',
  'dragon.png',
  'skeleton.png',
  'goblin.png', 
  'orc.png'
];