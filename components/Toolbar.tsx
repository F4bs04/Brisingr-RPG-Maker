
import React, { useState, useRef } from 'react';
import { 
  Paintbrush, 
  Eraser, 
  Move, 
  Upload, 
  Trash2,
  Map as MapIcon,
  Hand,
  Image as ImageIcon,
  Dice5,
  Users,
  Link as LinkIcon,
  Copy,
  Shield,
  ShieldAlert,
  LogIn,
  Eye,
  EyeOff,
  Save,
  FolderUp,
  FileJson,
  ChevronLeft,
  ChevronRight,
  Globe,
  Plus,
  MapPin,
  Box,
  User as UserIcon,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { TerrainType, Tool, Character, Scenario, UserLocation, TokenType } from '../types';
import { TERRAIN_COLORS, TERRAIN_LABELS, TOKEN_LIBRARY, APP_LOGO_URL } from '../constants';

interface ToolbarProps {
  selectedTool: Tool;
  setSelectedTool: (t: Tool) => void;
  selectedTerrain: TerrainType;
  setSelectedTerrain: (t: TerrainType) => void;
  characters: Character[];
  selectedCharacterId: string | null;
  setSelectedCharacterId: (id: string | null) => void;
  onUploadToken: (file: File, type: TokenType) => void;
  onUpdateCharacterDescription: (id: string, desc: string) => void;
  onUploadBackground: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onDeleteCharacter: (id: string) => void;
  onGenerateNarrative: () => void;
  isGenerating: boolean;
  hasBackground: boolean;
  onClearBackground: () => void;
  hexSize: number;
  setHexSize: (s: number) => void;
  onDiceRoll: (sides: number) => void;
  peerId: string | null;
  hostId: string;
  setHostId: (id: string) => void;
  onConnect: () => void;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  isHost: boolean;
  onToggleVisibility: (id: string) => void;
  onAddFromLibrary: (filename: string, type: TokenType) => void;
  onSaveSession: () => void;
  onLoadSession: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onReorderCharacter: (id: string, direction: 'up' | 'down') => void;
  
  // World Map Props
  scenarios: Scenario[];
  currentScenarioId: string;
  onSwitchScenario: (id: string) => void;
  onCreateScenario: (name: string, bgFile: File) => void;
  userLocations: UserLocation[];
}

export const Toolbar: React.FC<ToolbarProps> = ({
  selectedTool,
  setSelectedTool,
  selectedTerrain,
  setSelectedTerrain,
  characters,
  selectedCharacterId,
  setSelectedCharacterId,
  onUploadToken,
  onUpdateCharacterDescription,
  onUploadBackground,
  onDeleteCharacter,
  onGenerateNarrative,
  isGenerating,
  hasBackground,
  onClearBackground,
  hexSize,
  setHexSize,
  onDiceRoll,
  peerId,
  hostId,
  setHostId,
  onConnect,
  connectionStatus,
  isHost,
  onToggleVisibility,
  onAddFromLibrary,
  onSaveSession,
  onLoadSession,
  onReorderCharacter,
  scenarios,
  currentScenarioId,
  onSwitchScenario,
  onCreateScenario,
  userLocations
}) => {
  const [activeTab, setActiveTab] = useState<'edit' | 'multiplayer'>('edit');
  const [customSides, setCustomSides] = useState<string>('100');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [uploadTokenType, setUploadTokenType] = useState<TokenType>('character');
  
  // World Map Gallery State
  const [showWorldMap, setShowWorldMap] = useState(false);
  const [newMapName, setNewMapName] = useState('');
  const [newMapFile, setNewMapFile] = useState<File | null>(null);
  const [newMapPreview, setNewMapPreview] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const copyToClipboard = () => {
    if (peerId) {
      navigator.clipboard.writeText(peerId);
      alert("ID copiado!");
    }
  };

  const handleCustomRoll = () => {
    const sides = parseInt(customSides);
    if (!isNaN(sides) && sides > 0) {
      onDiceRoll(sides);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        setNewMapFile(file);
        const reader = new FileReader();
        reader.onload = (ev) => setNewMapPreview(ev.target?.result as string);
        reader.readAsDataURL(file);
    }
  };

  const handleTokenUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          onUploadToken(file, uploadTokenType);
          e.target.value = ''; // Reset input
      }
  };

  const handleCreate = () => {
      if (newMapName && newMapFile) {
          onCreateScenario(newMapName, newMapFile);
          setNewMapName('');
          setNewMapFile(null);
          setNewMapPreview(null);
      }
  };

  const selectedChar = characters.find(c => c.id === selectedCharacterId);

  return (
    <>
    <div 
      className={`bg-gray-800 border-r border-gray-700 flex flex-col h-full shadow-xl z-20 transition-all duration-300 ease-in-out relative ${isCollapsed ? 'w-0' : 'w-80'}`}
    >
      {/* Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-8 top-4 bg-gray-800 text-gray-300 p-1 rounded-r-md border-y border-r border-gray-700 hover:bg-gray-700 transition-colors shadow-md"
        title={isCollapsed ? "Expandir Menu" : "Minimizar Menu"}
      >
        {isCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
      </button>

      <div className={`flex flex-col h-full overflow-hidden ${isCollapsed ? 'opacity-0 invisible' : 'opacity-100 visible'} transition-opacity duration-200`}>
        
        <div className="p-4 border-b border-gray-700 shrink-0 flex flex-col items-center">
            <img src={APP_LOGO_URL} alt="Aethelgard" className="w-full max-w-[180px] mb-2 drop-shadow-md" />
            
            <div className="flex gap-2 mt-4 bg-gray-900 p-1 rounded-lg w-full">
            <button 
                onClick={() => setActiveTab('edit')}
                className={`flex-1 py-1 px-2 text-xs font-bold rounded transition-all whitespace-nowrap ${activeTab === 'edit' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
            >
                Mesa
            </button>
            <button 
                onClick={() => setActiveTab('multiplayer')}
                className={`flex-1 py-1 px-2 text-xs font-bold rounded transition-all flex justify-center items-center gap-1 whitespace-nowrap ${activeTab === 'multiplayer' ? 'bg-indigo-900 text-indigo-100' : 'text-gray-500 hover:text-gray-300'}`}
            >
                <Users size={12}/> Online
            </button>
            </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar w-80">
            
            {activeTab === 'multiplayer' && (
            <div className="space-y-4 bg-gray-900/50 p-3 rounded-lg border border-gray-700">
                <h3 className="text-xs uppercase font-semibold text-indigo-400 tracking-wider">Sessão Online</h3>
                
                <div className="text-sm text-gray-400 mb-2">
                Status: <span className={`font-bold ${connectionStatus === 'connected' ? 'text-green-400' : 'text-yellow-400'}`}>
                    {connectionStatus === 'disconnected' ? 'Offline (Local)' : connectionStatus === 'connecting' ? 'Conectando...' : isHost ? 'Hospedando (Mestre)' : 'Conectado (Jogador)'}
                </span>
                </div>

                {/* Se estiver desconectado, mostra a opção de conectar */}
                {connectionStatus === 'disconnected' && (
                <div className="mb-6 pb-4 border-b border-gray-700">
                    <label className="text-xs font-bold text-gray-300 block mb-2 uppercase flex items-center gap-2">
                    <LogIn size={12} /> Entrar na mesa de outro Mestre
                    </label>
                    <div className="flex flex-col gap-2">
                    <input 
                        value={hostId}
                        onChange={(e) => setHostId(e.target.value)}
                        placeholder="Cole o ID do Mestre aqui..."
                        className="bg-gray-950 text-white text-sm p-3 rounded border border-gray-600 w-full focus:border-indigo-500 outline-none"
                    />
                    <button 
                        onClick={onConnect}
                        disabled={!hostId}
                        className="bg-indigo-600 w-full py-2 px-4 rounded hover:bg-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <LinkIcon size={16} /> Conectar
                    </button>
                    </div>
                </div>
                )}

                {/* Se estiver conectado ou for o host padrão, mostra o próprio ID */}
                {(connectionStatus === 'disconnected' || isHost) && (
                <div className="mb-4">
                    <label className="text-xs text-gray-500 block mb-1">Seu ID (Envie para os jogadores):</label>
                    <div className="flex gap-2">
                    <input 
                        readOnly 
                        value={peerId || 'Gerando ID...'} 
                        className="bg-black text-gray-300 text-xs p-2 rounded border border-gray-700 w-full font-mono"
                    />
                    <button onClick={copyToClipboard} className="bg-gray-700 p-2 rounded hover:bg-gray-600 text-white" title="Copiar ID">
                        <Copy size={14} />
                    </button>
                    </div>
                </div>
                )}
            </div>
            )}

            {activeTab === 'edit' && (
            <>
                {/* World Map Button */}
                <div className="mb-4">
                    <button 
                        onClick={() => setShowWorldMap(true)}
                        className="w-full bg-gradient-to-r from-blue-900 to-indigo-900 hover:from-blue-800 hover:to-indigo-800 border border-blue-500/30 text-white py-3 px-4 rounded-lg flex items-center justify-center gap-3 shadow-lg transition-all group"
                    >
                        <Globe size={20} className="text-blue-300 group-hover:text-white" />
                        <span className="font-bold uppercase tracking-wider text-sm">Mapa Mundial</span>
                    </button>
                </div>

                {/* Tools Section */}
                <div>
                <h3 className="text-xs uppercase font-semibold text-gray-500 mb-3 tracking-wider">Ferramentas</h3>
                <div className={`grid ${isHost ? 'grid-cols-4' : 'grid-cols-2'} gap-2`}>
                    <button
                    onClick={() => setSelectedTool('pan')}
                    className={`p-3 rounded-lg flex justify-center items-center transition-all ${
                        selectedTool === 'pan' ? 'bg-purple-600 text-white shadow-lg scale-105' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                    title="Mover Câmera (Pan)"
                    >
                    <Hand size={20} />
                    </button>
                    
                    <button
                    onClick={() => setSelectedTool('move_char')}
                    className={`p-3 rounded-lg flex justify-center items-center transition-all ${
                        selectedTool === 'move_char' ? 'bg-purple-600 text-white shadow-lg scale-105' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                    title="Mover Personagens"
                    >
                    <Move size={20} />
                    </button>

                    {isHost && (
                        <>
                            <button
                            onClick={() => setSelectedTool('paint')}
                            className={`p-3 rounded-lg flex justify-center items-center transition-all ${
                                selectedTool === 'paint' ? 'bg-purple-600 text-white shadow-lg scale-105' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                            }`}
                            title="Pintar Terreno"
                            >
                            <Paintbrush size={20} />
                            </button>
                            <button
                            onClick={() => setSelectedTool('erase')}
                            className={`p-3 rounded-lg flex justify-center items-center transition-all ${
                                selectedTool === 'erase' ? 'bg-red-600 text-white shadow-lg scale-105' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                            }`}
                            title="Apagar (Resetar para Vazio)"
                            >
                            <Eraser size={20} />
                            </button>
                        </>
                    )}
                </div>
                </div>

                {/* Session / Save & Load - HOST ONLY */}
                {isHost && (
                <div>
                    <h3 className="text-xs uppercase font-semibold text-gray-500 mb-3 tracking-wider flex items-center gap-1">
                        <FileJson size={12} /> Sessão (Salvar/Carregar)
                    </h3>
                    <div className="grid grid-cols-2 gap-2">
                        <button 
                        onClick={onSaveSession}
                        className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-green-700 hover:text-white text-gray-300 py-2 px-3 rounded text-xs font-bold transition-colors"
                        >
                        <Save size={14} /> Salvar
                        </button>
                        <label className="flex items-center justify-center gap-2 bg-gray-700 hover:bg-blue-700 hover:text-white text-gray-300 py-2 px-3 rounded text-xs font-bold transition-colors cursor-pointer">
                        <FolderUp size={14} /> Carregar
                        <input 
                            type="file" 
                            className="hidden" 
                            accept=".json"
                            onChange={onLoadSession}
                        />
                        </label>
                    </div>
                </div>
                )}

                {/* Map Settings - HOST ONLY */}
                {isHost && (
                    <div>
                        <h3 className="text-xs uppercase font-semibold text-gray-500 mb-3 tracking-wider flex items-center gap-1">
                            <Shield size={12} /> Mapa & Grid
                        </h3>
                        
                        {/* Hex Size Slider */}
                        <div className="mb-4">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Tamanho Hex</span>
                            <span>{hexSize}px</span>
                        </div>
                        <input 
                            type="range" 
                            min="5" 
                            max="200" 
                            value={hexSize} 
                            onChange={(e) => setHexSize(Number(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                        </div>

                        {!hasBackground ? (
                            <label className="flex items-center justify-center w-full p-3 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 hover:text-blue-400 transition-colors">
                                <div className="flex items-center gap-2 text-sm">
                                <ImageIcon size={16} />
                                <span>Upload Mapa (Atual)</span>
                                </div>
                                <input 
                                type="file" 
                                className="hidden" 
                                accept="image/*"
                                onChange={onUploadBackground}
                                />
                            </label>
                        ) : (
                            <div className="flex items-center justify-between bg-gray-700 p-2 rounded-lg">
                                <span className="text-sm text-gray-300 flex items-center gap-2">
                                    <ImageIcon size={14} /> Mapa Ativo
                                </span>
                                <button 
                                    onClick={onClearBackground}
                                    className="text-red-400 hover:text-red-300 p-1"
                                    title="Remover fundo"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {/* Terrain Selection - HOST ONLY */}
                {isHost && selectedTool === 'paint' && (
                <div>
                    <h3 className="text-xs uppercase font-semibold text-gray-500 mb-3 tracking-wider">Terrenos (Hex)</h3>
                    <div className="grid grid-cols-2 gap-2">
                    {Object.values(TerrainType).map((type) => {
                        // Extract color class for preview circle
                        let colorClass = TERRAIN_COLORS[type].replace('fill-', 'bg-').split(' ')[0];
                        if (type === TerrainType.VOID) colorClass = 'bg-gray-800 border border-gray-600';

                        return (
                        <button
                        key={type}
                        onClick={() => setSelectedTerrain(type)}
                        className={`flex items-center gap-2 p-2 rounded-md border-2 transition-all ${
                            selectedTerrain === type 
                            ? 'border-purple-500 bg-gray-700' 
                            : 'border-transparent hover:bg-gray-700'
                        }`}
                        >
                        <div className={`w-6 h-6 rounded-full ${colorClass}`}></div>
                        <span className="text-xs text-gray-200 truncate">{TERRAIN_LABELS[type]}</span>
                        </button>
                    )})}
                    </div>
                </div>
                )}

                {/* Characters Section */}
                <div>
                <h3 className="text-xs uppercase font-semibold text-gray-500 mb-3 tracking-wider">Tokens</h3>
                
                {/* Type Toggle */}
                <div className="flex bg-gray-900 rounded-lg p-1 mb-3">
                    <button
                        onClick={() => setUploadTokenType('character')}
                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold uppercase rounded transition-colors ${uploadTokenType === 'character' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <UserIcon size={12} /> Personagem
                    </button>
                    <button
                        onClick={() => setUploadTokenType('prop')}
                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-[10px] font-bold uppercase rounded transition-colors ${uploadTokenType === 'prop' ? 'bg-gray-700 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <Box size={12} /> Objeto
                    </button>
                </div>

                <label className="flex items-center justify-center w-full p-3 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 hover:text-purple-400 transition-colors mb-4">
                    <div className="flex items-center gap-2 text-sm">
                    <Upload size={16} />
                    <span>Upload {uploadTokenType === 'character' ? 'Personagem' : 'Objeto'}</span>
                    </div>
                    <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleTokenUploadChange}
                    />
                </label>

                {/* Token Library */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                    {TOKEN_LIBRARY.map((file) => (
                        <button
                            key={file}
                            onClick={() => onAddFromLibrary(file, uploadTokenType)}
                            className="w-full aspect-square bg-gray-700 rounded hover:bg-purple-900/50 border border-gray-600 hover:border-purple-500 flex flex-col items-center justify-center gap-1 transition-all group"
                            title={`Adicionar ${file.split('.')[0]}`}
                        >
                            <div className="w-6 h-6 rounded-full bg-gray-800 flex items-center justify-center text-[8px] font-bold text-gray-500 group-hover:text-purple-300">
                                {file.substring(0, 2).toUpperCase()}
                            </div>
                            <span className="text-[8px] text-gray-500 group-hover:text-gray-300 truncate max-w-full px-1">
                                {file.split('.')[0]}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Character List */}
                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1 custom-scrollbar">
                    {characters.map((char, index) => (
                    <div 
                        key={char.id}
                        onClick={() => {
                        setSelectedCharacterId(char.id);
                        setSelectedTool('move_char');
                        }}
                        className={`flex items-center justify-between p-2 rounded-md cursor-pointer group ${
                        selectedCharacterId === char.id
                            ? 'bg-purple-900/50 border border-purple-500' 
                            : 'bg-gray-700 hover:bg-gray-600'
                        }`}
                    >
                        <div className="flex items-center gap-3 overflow-hidden">
                        {/* Thumbnail based on Type */}
                        {char.type === 'prop' ? (
                             <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center bg-transparent`}>
                                <img src={char.imageUrl} alt={char.name} className={`w-full h-full object-contain ${!char.isVisible ? 'grayscale opacity-50' : ''}`} />
                            </div>
                        ) : (
                            <div className={`w-8 h-12 rounded-md overflow-hidden border shrink-0 ${!char.isVisible ? 'border-red-500 opacity-70' : 'border-gray-500'}`}>
                                <img src={char.imageUrl} alt={char.name} className={`w-full h-full object-cover ${!char.isVisible ? 'grayscale' : ''}`} />
                            </div>
                        )}

                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium truncate">{char.name}</span>
                            {!char.isVisible && isHost && <span className="text-[10px] text-red-400 flex items-center gap-1"><EyeOff size={8} /> Oculto</span>}
                            {char.type === 'prop' && <span className="text-[9px] text-gray-500 italic">Objeto</span>}
                        </div>
                        </div>
                        
                        <div className="flex gap-1 items-center">
                            {isHost && (
                                <div className="flex flex-col gap-0.5 mr-1 border-r border-gray-600 pr-1">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onReorderCharacter(char.id, 'up');
                                        }}
                                        className="text-gray-400 hover:text-white p-0.5 hover:bg-gray-600 rounded"
                                        title="Trazer para Frente"
                                    >
                                        <ArrowUp size={10} />
                                    </button>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onReorderCharacter(char.id, 'down');
                                        }}
                                        className="text-gray-400 hover:text-white p-0.5 hover:bg-gray-600 rounded"
                                        title="Enviar para Trás"
                                    >
                                        <ArrowDown size={10} />
                                    </button>
                                </div>
                            )}

                            {isHost && (
                                <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleVisibility(char.id);
                                }}
                                className={`p-1 rounded hover:bg-gray-800 ${char.isVisible ? 'text-gray-400 hover:text-white' : 'text-red-400 hover:text-red-300'}`}
                                >
                                {char.isVisible ? <Eye size={14} /> : <EyeOff size={14} />}
                                </button>
                            )}
                            <button 
                            onClick={(e) => {
                                e.stopPropagation();
                                onDeleteCharacter(char.id);
                            }}
                            className="text-gray-400 hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                            <Trash2 size={14} />
                            </button>
                        </div>
                    </div>
                    ))}
                </div>
                </div>
                
                {/* Dice Roller */}
                <div className="pt-2 border-t border-gray-700">
                <h3 className="text-xs uppercase font-semibold text-gray-500 mb-3 tracking-wider flex items-center gap-2">
                    <Dice5 size={14} /> Dados
                </h3>
                <div className="grid grid-cols-3 gap-2 mb-2">
                    {[6, 12, 20].map(sides => (
                        <button 
                        key={sides}
                        onClick={() => onDiceRoll(sides)}
                        className="bg-gray-700 hover:bg-gray-600 text-white text-xs font-bold py-2 rounded border-b-2 border-gray-900 active:border-b-0 active:translate-y-0.5 transition-all"
                        >
                        D{sides}
                        </button>
                    ))}
                </div>
                {/* Custom Dice */}
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-bold">D</span>
                        <input 
                            type="number" 
                            min="1"
                            value={customSides}
                            onChange={(e) => setCustomSides(e.target.value)}
                            className="w-full bg-black/40 border border-gray-700 rounded py-1 pl-5 pr-2 text-xs text-white focus:border-purple-500 outline-none"
                            placeholder="?"
                        />
                    </div>
                    <button 
                        onClick={handleCustomRoll}
                        className="bg-purple-800 hover:bg-purple-700 text-white text-xs font-bold px-3 rounded transition-colors"
                    >
                        Rolar
                    </button>
                </div>
                </div>

                {/* Gemini AI Generation */}
                <div className="pt-4 mt-2 border-t border-gray-700">
                <button
                    onClick={onGenerateNarrative}
                    disabled={isGenerating}
                    className="w-full bg-gradient-to-r from-indigo-900 to-purple-900 hover:from-indigo-800 hover:to-purple-800 border border-purple-500/30 text-gray-300 hover:text-white py-2 px-4 rounded-lg text-sm font-medium shadow-lg flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isGenerating ? (
                    <span className="animate-pulse">Gerando...</span>
                    ) : (
                    <>
                        <span>✨</span> Oráculo AI
                    </>
                    )}
                </button>
                </div>
            </>
            )}

        </div>
      </div>
    </div>

    {/* World Map / Scenarios Modal */}
    {showWorldMap && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-gray-900 w-full max-w-4xl max-h-[90vh] rounded-2xl border border-gray-700 shadow-2xl flex flex-col overflow-hidden">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-950">
                    <div>
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Globe className="text-blue-500" /> Galeria de Mapas
                        </h2>
                        <p className="text-gray-400 text-sm mt-1">Viaje entre diferentes cenários ou crie novos mundos.</p>
                    </div>
                    <button onClick={() => setShowWorldMap(false)} className="text-gray-500 hover:text-white transition-colors">
                        <span className="text-2xl">&times;</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-gray-900 custom-scrollbar">
                    
                    {/* Add New Scenario Form (Host Only) */}
                    {isHost && (
                        <div className="mb-8 p-4 bg-gray-800/50 rounded-xl border border-gray-700 border-dashed">
                            <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wide mb-4 flex items-center gap-2">
                                <Plus size={16} /> Adicionar Novo Cenário
                            </h3>
                            <div className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-500 mb-1">Nome do Cenário</label>
                                    <input 
                                        type="text" 
                                        value={newMapName}
                                        onChange={(e) => setNewMapName(e.target.value)}
                                        className="w-full bg-gray-950 border border-gray-700 rounded p-2 text-white text-sm focus:border-blue-500 outline-none"
                                        placeholder="Ex: Caverna do Dragão"
                                    />
                                </div>
                                <div className="flex-1">
                                    <label className="block text-xs text-gray-500 mb-1">Imagem de Fundo</label>
                                    <label className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-gray-300 px-3 py-2 rounded cursor-pointer transition-colors text-sm truncate">
                                        <ImageIcon size={16} /> 
                                        <span className="truncate">{newMapFile ? newMapFile.name : "Escolher Imagem..."}</span>
                                        <input 
                                            ref={fileInputRef}
                                            type="file" 
                                            className="hidden" 
                                            accept="image/*"
                                            onChange={handleFileChange}
                                        />
                                    </label>
                                </div>
                                <button 
                                    onClick={handleCreate}
                                    disabled={!newMapName || !newMapFile}
                                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded font-bold text-sm transition-colors"
                                >
                                    Criar & Salvar
                                </button>
                            </div>
                            {newMapPreview && (
                                <div className="mt-4">
                                    <p className="text-xs text-gray-500 mb-1">Prévia:</p>
                                    <img src={newMapPreview} alt="Preview" className="h-32 rounded border border-gray-600 object-cover" />
                                </div>
                            )}
                        </div>
                    )}

                    {/* Scenarios Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {scenarios.map(scenario => {
                            const isActive = scenario.id === currentScenarioId;
                            // Count users in this scenario
                            const usersHere = userLocations.filter(ul => ul.scenarioId === scenario.id).map(ul => ul.username);
                            const hasUsers = usersHere.length > 0;

                            return (
                                <div 
                                    key={scenario.id}
                                    onClick={() => {
                                        onSwitchScenario(scenario.id);
                                        setShowWorldMap(false);
                                    }}
                                    className={`relative group rounded-xl overflow-hidden border-2 transition-all cursor-pointer hover:scale-[1.02] shadow-xl ${isActive ? 'border-green-500 ring-2 ring-green-500/20' : 'border-gray-700 hover:border-blue-500'}`}
                                >
                                    {/* Preview Image */}
                                    <div className="h-40 bg-gray-800 relative">
                                        {scenario.previewUrl ? (
                                            <img src={scenario.previewUrl} alt={scenario.name} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-600">
                                                <MapIcon size={48} />
                                            </div>
                                        )}
                                        
                                        {/* Status Badges */}
                                        <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                                            {isActive && (
                                                <span className="bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg flex items-center gap-1">
                                                    <MapPin size={10} /> VOCÊ ESTÁ AQUI
                                                </span>
                                            )}
                                            {hasUsers && (
                                                <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg flex items-center gap-1">
                                                    <Users size={10} /> {usersHere.length} VIAJANTE(S)
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-4 bg-gray-900">
                                        <h4 className={`font-bold text-lg mb-1 ${isActive ? 'text-green-400' : 'text-gray-200 group-hover:text-blue-400'}`}>
                                            {scenario.name}
                                        </h4>
                                        
                                        {/* User List */}
                                        {hasUsers ? (
                                            <div className="flex flex-wrap gap-1 mt-2">
                                                {usersHere.map((u, i) => (
                                                    <span key={i} className="text-[10px] bg-gray-800 text-gray-400 border border-gray-700 px-1.5 py-0.5 rounded">
                                                        {u}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-600 mt-2 italic">Ninguém neste local.</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    )}
    </>
  );
};
