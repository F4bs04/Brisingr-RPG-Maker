
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { GridMap as GridMapType, TerrainType, Character, Tool, ViewState } from '../types';
import { TERRAIN_COLORS } from '../constants';
import { EyeOff } from 'lucide-react';

interface GridMapProps {
  grid: GridMapType;
  characters: Character[];
  onTileClick: (x: number, y: number) => void;
  onCharacterDragEnd: (id: string, x: number, y: number) => void;
  selectedTool: Tool;
  selectedCharacterId: string | null;
  backgroundImage: string | null;
  hexSize: number;
  isHost: boolean;
}

// Isometric Factor: Squashes the Y axis to simulate depth
const ISO_SCALE_Y = 0.75; 

export const GridMap: React.FC<GridMapProps> = ({
  grid,
  characters,
  onTileClick,
  onCharacterDragEnd,
  selectedTool,
  selectedCharacterId,
  backgroundImage,
  hexSize,
  isHost
}) => {
  const [viewState, setViewState] = useState<ViewState>({ scale: 1, translateX: window.innerWidth/2, translateY: window.innerHeight/2 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredTile, setHoveredTile] = useState<{x: number, y: number} | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  const isMouseDownRef = useRef(false);
  const svgRef = useRef<SVGSVGElement>(null);

  // Derived Hex Constants based on prop
  const HEX_WIDTH = Math.sqrt(3) * hexSize;
  const HEX_HEIGHT = 2 * hexSize;
  const VERT_DIST = HEX_HEIGHT * 0.75;

  // Resize observer
  useEffect(() => {
    const handleResize = () => setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // --- Helpers for Hex Calculations ---

  const getHexPixelCoordinates = (col: number, row: number) => {
    const offset = (row % 2) * (HEX_WIDTH / 2);
    // Standard flat-top calculation
    let x = col * HEX_WIDTH + offset;
    let y = row * VERT_DIST;
    
    // Apply Isometric Squash to the position
    y = y * ISO_SCALE_Y;
    
    return { x, y };
  };

  const getHexPoints = (cx: number, cy: number) => {
    const points = [];
    for (let i = 0; i < 6; i++) {
      const angle_deg = 60 * i - 30;
      const angle_rad = (Math.PI / 180) * angle_deg;
      // We apply the ISO_SCALE_Y to the vertex generation as well to squash the hex shape itself
      const px = cx + hexSize * Math.cos(angle_rad);
      const py = cy + (hexSize * Math.sin(angle_rad) * ISO_SCALE_Y);
      points.push(`${px},${py}`);
    }
    return points.join(" ");
  };

  // --- Viewport Culling (Infinite Grid Logic) ---
  // Calculate which hexes are visible based on translation/scale
  const visibleHexes = useMemo(() => {
    // Invert transform to find world bounds of the screen
    const left = (-viewState.translateX) / viewState.scale;
    const top = (-viewState.translateY) / viewState.scale;
    const right = (viewportSize.width - viewState.translateX) / viewState.scale;
    const bottom = (viewportSize.height - viewState.translateY) / viewState.scale;

    // Approximate hex dimensions including spacing and ISO scale
    const colWidth = HEX_WIDTH;
    const rowHeight = VERT_DIST * ISO_SCALE_Y;

    const startCol = Math.floor(left / colWidth) - 2;
    const endCol = Math.ceil(right / colWidth) + 1;
    const startRow = Math.floor(top / rowHeight) - 2;
    const endRow = Math.ceil(bottom / rowHeight) + 2;

    const coords = [];
    for (let r = startRow; r <= endRow; r++) {
      // Adjust col range slightly for offset rows to prevent checkerboarding on edges
      const offsetAdjust = (r % 2) !== 0 ? -1 : 0;
      for (let c = startCol + offsetAdjust; c <= endCol; c++) {
        coords.push({ col: c, row: r });
      }
    }
    return coords;
  }, [viewState, viewportSize, HEX_WIDTH, VERT_DIST]);

  // --- Event Handlers ---

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const scaleAmount = -e.deltaY * 0.001;
    const newScale = Math.min(Math.max(0.2, viewState.scale + scaleAmount), 5);
    setViewState(prev => ({ ...prev, scale: newScale }));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent default behavior for middle click to avoid browser scroll icon
    if (e.button === 1) {
        e.preventDefault();
    }

    isMouseDownRef.current = true;
    // Middle click (button 1) or Right click (button 2) or Pan Tool triggers pan
    if (selectedTool === 'pan' || e.button === 1 || e.button === 2) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - viewState.translateX, y: e.clientY - viewState.translateY });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setViewState(prev => ({
        ...prev,
        translateX: e.clientX - dragStart.x,
        translateY: e.clientY - dragStart.y
      }));
      return;
    }
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
    setIsDragging(false);
  };

  const handleHexClick = (col: number, row: number) => {
    if (selectedTool === 'paint' || selectedTool === 'erase') {
      onTileClick(col, row);
    } else if (selectedTool === 'move_char' && selectedCharacterId) {
      onCharacterDragEnd(selectedCharacterId, col, row);
    }
  };

  const handleHexEnter = (col: number, row: number) => {
    setHoveredTile({ x: col, y: row });
    if (isMouseDownRef.current && (selectedTool === 'paint' || selectedTool === 'erase')) {
      onTileClick(col, row);
    }
  };

  return (
    <div 
      className={`w-full h-full bg-gray-950 overflow-hidden relative ${selectedTool === 'pan' || isDragging ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* UI Info */}
      <div className="absolute bottom-4 right-4 bg-black/60 text-gray-400 text-[10px] px-2 py-1 rounded pointer-events-none select-none z-50 border border-gray-800">
        Câmera: {viewState.translateX.toFixed(0)}, {viewState.translateY.toFixed(0)} | Zoom: {viewState.scale.toFixed(2)}x
      </div>

      <svg 
        ref={svgRef}
        className="w-full h-full block touch-none"
      >
        <g transform={`translate(${viewState.translateX}, ${viewState.translateY}) scale(${viewState.scale})`}>
          
          {/* 1. Background Image Layer */}
          {backgroundImage && (
            <g>
               <image 
                  href={backgroundImage}
                  x={-1000} 
                  y={-1000}
                  width={2000}
                  height={2000}
                  preserveAspectRatio="xMidYMid slice"
                  className="opacity-60 pointer-events-none" 
               />
               {/* Reference Frame */}
               <rect x={-1000} y={-1000} width={2000} height={2000} fill="none" stroke="rgba(255,255,255,0.1)" strokeDasharray="10,10"/>
            </g>
          )}

          {/* 2. Procedural Hex Grid Layer */}
          {visibleHexes.map(({ col, row }) => {
            const { x, y } = getHexPixelCoordinates(col, row);
            const points = getHexPoints(x, y);
            const terrain = grid[`${col},${row}`] || TerrainType.VOID;
            const isVoid = terrain === TerrainType.VOID;
            const isHovered = hoveredTile?.x === col && hoveredTile?.y === row;

            return (
              <g key={`${col},${row}`}>
                <polygon
                  points={points}
                  className={`
                    transition-colors duration-100 vector-effect-non-scaling-stroke
                    ${TERRAIN_COLORS[terrain]}
                    ${isVoid ? 'stroke-gray-800/40 fill-transparent hover:stroke-gray-600 hover:fill-white/5' : 'stroke-black/20'}
                    ${isHovered ? 'stroke-white/80 stroke-2' : ''}
                  `}
                  style={{ vectorEffect: 'non-scaling-stroke' }}
                  onMouseDown={(e) => {
                    // FIX: Only capture Left Click (0) for hex interaction.
                    // Allow Middle (1) and Right (2) to bubble to container for panning.
                    if (e.button === 0) {
                        e.stopPropagation();
                        handleHexClick(col, row);
                    }
                  }}
                  onMouseEnter={() => handleHexEnter(col, row)}
                />
                {viewState.scale > 1.5 && (
                  <text x={x} y={y} dy=".3em" textAnchor="middle" className="text-[6px] fill-gray-500/50 pointer-events-none select-none font-mono">
                    {col},{row}
                  </text>
                )}
              </g>
            );
          })}

          {/* 3. Character Layer */}
          {characters.map((char) => {
             // Fog of War Logic
             if (!char.isVisible && !isHost) return null;
             
             const isGhost = !char.isVisible && isHost;
             const { x, y } = getHexPixelCoordinates(char.x, char.y);
             const size = hexSize * 1.6;
             
             return (
                <g key={char.id} className={isGhost ? 'opacity-50' : 'opacity-100'}>
                  <foreignObject 
                    x={x - size/2} 
                    y={y - size/2} 
                    width={size} 
                    height={size}
                    className="pointer-events-none overflow-visible"
                  >
                    <div className="w-full h-full relative flex items-center justify-center group">
                        <div 
                          className={`
                            w-full h-full rounded-full border-2 border-white shadow-2xl overflow-hidden bg-black 
                            transition-transform duration-200 pointer-events-auto cursor-pointer
                            ${selectedCharacterId === char.id ? 'ring-2 ring-purple-500 scale-110 shadow-purple-500/50' : ''}
                            ${isGhost ? 'grayscale' : ''}
                          `}
                          style={{ boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.8)' }}
                          onMouseDown={(e) => {
                              // Pass event up
                              // Panning logic handles button 1/2
                              // Left click handled implicitly by selection logic outside if needed
                          }}
                        >
                          <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover" />
                        </div>
                        
                        {/* Ghost Icon for Host */}
                        {isGhost && (
                           <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-full pointer-events-none">
                               <EyeOff size={size/3} className="text-white/80" />
                           </div>
                        )}

                        {/* Name Tag */}
                        <div className="absolute -top-6 bg-gray-900/90 text-white text-[10px] px-2 py-1 rounded border border-gray-700 opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none shadow-lg transition-opacity">
                          {char.name} {isGhost ? '(Oculto)' : ''}
                        </div>
                        
                        {/* Description Tooltip (Revealed on Hover) */}
                        {char.description && (
                          <div className="absolute top-full mt-2 w-48 bg-black/90 text-gray-200 text-[10px] p-2 rounded border border-purple-500/50 opacity-0 group-hover:opacity-100 z-50 pointer-events-none shadow-xl transition-opacity">
                             <p className="italic">{char.description}</p>
                          </div>
                        )}
                    </div>
                  </foreignObject>
                </g>
             );
          })}

          {/* Ghost Preview */}
          {selectedTool === 'move_char' && selectedCharacterId && hoveredTile && (
             <g className="pointer-events-none animate-pulse opacity-60">
                 {(() => {
                    const { x, y } = getHexPixelCoordinates(hoveredTile.x, hoveredTile.y);
                    return (
                        <ellipse 
                            cx={x} 
                            cy={y} 
                            rx={hexSize * 0.8} 
                            ry={hexSize * 0.8 * ISO_SCALE_Y} 
                            className="fill-purple-500/30 stroke-purple-400 stroke-2 stroke-dasharray-4" 
                        />
                    );
                 })()}
             </g>
          )}

        </g>
      </svg>
    </div>
  );
};
