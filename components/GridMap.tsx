
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
  backgroundDimensions?: { width: number, height: number };
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
  backgroundDimensions,
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

  // Background Calc
  const bgWidth = backgroundDimensions?.width || 2000;
  const bgHeight = backgroundDimensions?.height || 2000;
  const bgX = -bgWidth / 2;
  const bgY = -bgHeight / 2;

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
  
  // Mathematical hex picking (pixel -> hex)
  const getHexFromPixel = (x: number, y: number): { col: number, row: number } => {
    // 1. Invert Isometric Scale on Y
    const isoY = y / ISO_SCALE_Y;
    
    // 2. Standard Flat-Top Hex Math
    const q = (Math.sqrt(3)/3 * x  -  1/3 * isoY) / hexSize;
    const r = (2/3 * isoY) / hexSize;
    
    // 3. Round to nearest hex
    let rx = Math.round(q);
    let ry = Math.round(r);
    let rz = Math.round(-q-r);
    
    const x_diff = Math.abs(rx - q);
    const y_diff = Math.abs(ry - r);
    const z_diff = Math.abs(rz - (-q-r));
    
    if (x_diff > y_diff && x_diff > z_diff) {
        rx = -ry-rz;
    } else if (y_diff > z_diff) {
        ry = -rx-rz;
    }
    
    // 4. Convert Axial (q,r) back to Offset (col,row)
    const col = rx + (ry - (ry&1)) / 2;
    const row = ry;
    
    return { col, row };
  };

  // --- Viewport Culling & Bounds Logic ---
  // Calculate which hexes are visible based on translation/scale AND background limits
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
    
    // Bounds check constants
    const hasBg = !!backgroundImage;
    const limitX = bgWidth / 2;
    const limitY = bgHeight / 2;
    const buffer = hexSize * 1.5; // Allow a small buffer of 1.5 hexes around the image

    for (let r = startRow; r <= endRow; r++) {
      // Adjust col range slightly for offset rows to prevent checkerboarding on edges
      const offsetAdjust = (r % 2) !== 0 ? -1 : 0;
      for (let c = startCol + offsetAdjust; c <= endCol; c++) {
        
        // BOUNDS CHECK: If background exists, restrain grid to image area
        if (hasBg) {
           // Re-calculate basic center for bounds check (simplified version of getHexPixelCoordinates)
           const offset = (r % 2) * (HEX_WIDTH / 2);
           const cx = c * HEX_WIDTH + offset;
           const cy = r * VERT_DIST * ISO_SCALE_Y;
           
           // If hex center is outside image + buffer, skip rendering
           if (cx < -limitX - buffer || cx > limitX + buffer ||
               cy < -limitY - buffer || cy > limitY + buffer) {
               continue;
           }
        }

        coords.push({ col: c, row: r });
      }
    }
    return coords;
  }, [viewState, viewportSize, HEX_WIDTH, VERT_DIST, backgroundImage, bgWidth, bgHeight, hexSize]);

  // Optimized Grid Path for performance (One massive path instead of thousands of polys)
  const gridPath = useMemo(() => {
     return visibleHexes.map(({col, row}) => {
         const {x, y} = getHexPixelCoordinates(col, row);
         return getHexPoints(x, y);
     }).map(points => `M ${points.split(' ').join(' L ')} Z`).join(' ');
  }, [visibleHexes, getHexPixelCoordinates, getHexPoints]);

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
    } else {
        // Handle Left Click Interactions (Paint/Move) via Math check
        // We do this here instead of on individual polygons to support batch rendering
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
            const mouseX = (e.clientX - rect.left - viewState.translateX) / viewState.scale;
            const mouseY = (e.clientY - rect.top - viewState.translateY) / viewState.scale;
            const {col, row} = getHexFromPixel(mouseX, mouseY);
            
            // Allow clicking even if technically outside bounds (for edge cases)
            handleHexClick(col, row);
        }
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
    
    // Calculate Hover Math-wise
    if (!isDragging) {
        const rect = svgRef.current?.getBoundingClientRect();
        if (rect) {
            const mouseX = (e.clientX - rect.left - viewState.translateX) / viewState.scale;
            const mouseY = (e.clientY - rect.top - viewState.translateY) / viewState.scale;
            const {col, row} = getHexFromPixel(mouseX, mouseY);
            
            if (!hoveredTile || hoveredTile.x !== col || hoveredTile.y !== row) {
                setHoveredTile({x: col, y: row});
                
                // Drag-Paint Logic
                if (isMouseDownRef.current && (selectedTool === 'paint' || selectedTool === 'erase')) {
                    onTileClick(col, row);
                }
            }
        }
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
                  x={bgX} 
                  y={bgY}
                  width={bgWidth}
                  height={bgHeight}
                  preserveAspectRatio="none"
                  className="opacity-60 pointer-events-none" 
               />
               {/* Reference Frame / Border */}
               <rect x={bgX} y={bgY} width={bgWidth} height={bgHeight} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={2} strokeDasharray="10,10"/>
               {/* Hard Shadow around image to delimit world */}
               <rect x={bgX - 5000} y={bgY - 5000} width={10000} height={5000} fill="rgba(0,0,0,0.5)" pointerEvents="none" /> 
               <rect x={bgX - 5000} y={bgY + bgHeight} width={10000} height={5000} fill="rgba(0,0,0,0.5)" pointerEvents="none" />
               <rect x={bgX - 5000} y={bgY} width={5000} height={bgHeight} fill="rgba(0,0,0,0.5)" pointerEvents="none" />
               <rect x={bgX + bgWidth} y={bgY} width={5000} height={bgHeight} fill="rgba(0,0,0,0.5)" pointerEvents="none" />
            </g>
          )}

          {/* 2. Optimized Grid Layer (Single Path) */}
          <path 
             d={gridPath} 
             fill="none" 
             stroke="rgba(0,0,0,0.2)" 
             strokeWidth="1" 
             vectorEffect="non-scaling-stroke"
             className="pointer-events-none"
          />

          {/* 3. Terrain Layer (Painted Tiles) */}
          {visibleHexes.map(({ col, row }) => {
            const key = `${col},${row}`;
            const terrain = grid[key];
            
            // Skip rendering VOID tiles since the background path handles the grid lines now
            if (!terrain || terrain === TerrainType.VOID) return null;

            const { x, y } = getHexPixelCoordinates(col, row);
            const points = getHexPoints(x, y);

            return (
                <polygon
                  key={key}
                  points={points}
                  className={`
                    transition-colors duration-100 vector-effect-non-scaling-stroke pointer-events-none
                    ${TERRAIN_COLORS[terrain]}
                  `}
                  style={{ vectorEffect: 'non-scaling-stroke' }}
                />
            );
          })}
          
          {/* 4. Hover Highlight (Single Polygon) */}
          {hoveredTile && (
             <polygon 
                points={getHexPoints(
                    getHexPixelCoordinates(hoveredTile.x, hoveredTile.y).x, 
                    getHexPixelCoordinates(hoveredTile.x, hoveredTile.y).y
                )}
                className="fill-white/10 stroke-white/50 stroke-2 pointer-events-none"
                style={{ vectorEffect: 'non-scaling-stroke' }}
             />
          )}

          {/* 5. Character/Object Layer */}
          {characters.map((char) => {
             // Fog of War Logic
             if (!char.isVisible && !isHost) return null;
             
             const isGhost = !char.isVisible && isHost;
             const { x, y } = getHexPixelCoordinates(char.x, char.y);
             
             // Different rendering based on type
             const isProp = char.type === 'prop';
             
             // Prop Dimensions: Fit within hex, slightly larger than pure hex
             const propSize = hexSize * 2; 

             // Character Dimensions: Rectangular Card
             const charWidth = hexSize * 1.5;
             const charHeight = hexSize * 2.2;
             
             return (
                <g key={char.id} className={isGhost ? 'opacity-50' : 'opacity-100'}>
                  
                  {isProp ? (
                      // --- PROP RENDERING (Raw Image) ---
                      <g
                        className={`cursor-pointer ${selectedCharacterId === char.id ? 'filter drop-shadow-[0_0_5px_rgba(168,85,247,0.8)]' : ''}`}
                        onMouseDown={() => {
                            // Interaction is handled by parent, but we add visual feedback
                        }}
                      >
                         <image
                            href={char.imageUrl}
                            x={x - propSize/2}
                            y={y - propSize/2}
                            width={propSize}
                            height={propSize}
                            preserveAspectRatio="xMidYMid meet"
                            className={`pointer-events-none ${isGhost ? 'grayscale' : ''}`}
                         />
                         
                         {/* Optional: Simple hit area for easier selection if image is sparse */}
                         <rect 
                            x={x - propSize/3} y={y - propSize/3} 
                            width={propSize/1.5} height={propSize/1.5} 
                            fill="transparent" 
                            className="pointer-events-auto cursor-pointer"
                         />

                         {/* Prop Name (Smaller/Different style) */}
                         <text 
                           x={x} y={y - propSize/2 - 5} 
                           textAnchor="middle" 
                           fill="white" 
                           fontSize={hexSize/4}
                           className="opacity-0 hover:opacity-100 select-none pointer-events-none shadow-black drop-shadow-md"
                         >
                            {char.name}
                         </text>
                      </g>

                  ) : (
                      // --- CHARACTER RENDERING (Framed Card) ---
                      <foreignObject 
                        x={x - charWidth/2} 
                        y={y - charHeight/2} 
                        width={charWidth} 
                        height={charHeight}
                        className="pointer-events-none overflow-visible"
                      >
                        <div className="w-full h-full relative flex items-center justify-center group">
                            <div 
                              className={`
                                w-full h-full rounded-sm border border-white shadow-2xl overflow-hidden bg-gray-900 
                                transition-transform duration-200 pointer-events-auto cursor-pointer
                                ${selectedCharacterId === char.id ? 'ring-1 ring-purple-500 scale-110 shadow-purple-500/50' : ''}
                                ${isGhost ? 'grayscale' : ''}
                              `}
                              style={{ boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.8)' }}
                            >
                              <img src={char.imageUrl} alt={char.name} className="w-full h-full object-cover" />
                            </div>
                            
                            {/* Ghost Icon for Host */}
                            {isGhost && (
                               <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-md pointer-events-none">
                                   <EyeOff size={charWidth/3} className="text-white/80" />
                               </div>
                            )}

                            {/* Name Tag */}
                            <div className="absolute -top-6 bg-gray-900/90 text-white text-[10px] px-2 py-1 rounded border border-gray-700 opacity-0 group-hover:opacity-100 whitespace-nowrap z-50 pointer-events-none shadow-lg transition-opacity">
                              {char.name} {isGhost ? '(Oculto)' : ''}
                            </div>
                            
                            {/* Description Tooltip (Revealed on Hover) */}
                            {char.description && (
                              <div 
                                className="absolute top-full mt-2 min-w-[300px] max-w-[500px] bg-gray-900/95 text-white text-base p-5 rounded-2xl border border-purple-500/50 opacity-0 group-hover:opacity-100 z-[999] pointer-events-none shadow-2xl shadow-black/50 transition-opacity duration-200 backdrop-blur-md"
                                style={{
                                    left: '50%',
                                    transform: `translateX(-50%) scale(${Math.max(0.2, 1 / viewState.scale)})`,
                                    transformOrigin: 'top center'
                                }}
                              >
                                 <div className="text-sm font-bold text-purple-400 uppercase tracking-wider border-b border-gray-700 pb-3 mb-3 flex justify-between items-center">
                                    <span>{char.name}</span>
                                 </div>
                                 <p className="italic leading-relaxed text-gray-200">{char.description}</p>
                              </div>
                            )}
                        </div>
                      </foreignObject>
                  )}
                </g>
             );
          })}

          {/* Ghost Preview */}
          {selectedTool === 'move_char' && selectedCharacterId && hoveredTile && (
             <g className="pointer-events-none animate-pulse opacity-60">
                 {(() => {
                    const char = characters.find(c => c.id === selectedCharacterId);
                    if (!char) return null;
                    
                    const { x, y } = getHexPixelCoordinates(hoveredTile.x, hoveredTile.y);
                    
                    if (char.type === 'prop') {
                        // Image Ghost for Props
                        const propSize = hexSize * 2; 
                        return (
                            <image
                                href={char.imageUrl}
                                x={x - propSize/2}
                                y={y - propSize/2}
                                width={propSize}
                                height={propSize}
                                preserveAspectRatio="xMidYMid meet"
                                className="opacity-50 grayscale"
                            />
                        );
                    } else {
                        // Rectangular Ghost for Characters
                        return (
                            <rect
                                x={x - (hexSize * 1.5)/2}
                                y={y - (hexSize * 2.2)/2}
                                width={hexSize * 1.5}
                                height={hexSize * 2.2}
                                rx={3}
                                fill="none"
                                className="stroke-purple-400 stroke-1 stroke-dasharray-4"
                            />
                        );
                    }
                 })()}
             </g>
          )}

        </g>
      </svg>
    </div>
  );
};
