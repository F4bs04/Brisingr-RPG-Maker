
import React, { useState } from 'react';
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
  ChevronRight
} from 'lucide-react';
import { TerrainType, Tool, Character } from '../types';
import { TERRAIN_COLORS, TERRAIN_LABELS, TOKEN_LIBRARY } from '../constants';

interface ToolbarProps {
  selectedTool: Tool;
  setSelectedTool: (t: Tool) => void;
  selectedTerrain: TerrainType;
  setSelectedTerrain: (t: TerrainType) => void;
  characters: Character[];
  selectedCharacterId: string | null;
  setSelectedCharacterId: (id: string | null) => void;
  onUploadCharacter: (e: React.ChangeEvent<HTMLInputElement>) => void;
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
  onAddFromLibrary: (filename: string) => void;
  onSaveSession: () => void;
  onLoadSession: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  selectedTool,
  setSelectedTool,
  selectedTerrain,
  setSelectedTerrain,
  characters,
  selectedCharacterId,
  setSelectedCharacterId,
  onUploadCharacter,
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
  onLoadSession
}) => {
  const [activeTab, setActiveTab] = useState<'edit' | 'multiplayer'>('edit');
  const [customSides, setCustomSides] = useState<string>('100');
  const [isCollapsed, setIsCollapsed] = useState(false);

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

  const selectedChar = characters.find(c => c.id === selectedCharacterId);

  return (
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
        
        <div className="p-4 border-b border-gray-700 shrink-0">
            <h1 className="text-xl font-bold text-purple-400 flex items-center gap-2 whitespace-nowrap">
            <MapIcon size={24} />
            Hex Grid Master
            </h1>
            
            <div className="flex gap-2 mt-4 bg-gray-900 p-1 rounded-lg">
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
                    <p className="text-[10px] text-gray-500 mt-2 italic">
                    Ao conectar, você sincronizará com o mapa do Host.
                    </p>
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

                {!isHost && (
                    <div className="text-xs bg-yellow-900/20 text-yellow-200 p-2 rounded border border-yellow-700/50 flex items-center gap-2">
                        <ShieldAlert size={14} />
                        <span>Como Jogador, você pode mover tokens e rolar dados. A edição do mapa é restrita ao Mestre.</span>
                    </div>
                )}
            </div>
            )}

            {activeTab === 'edit' && (
            <>
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
                            min="10" 
                            max="100" 
                            value={hexSize} 
                            onChange={(e) => setHexSize(Number(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-500"
                        />
                        </div>

                        {!hasBackground ? (
                            <label className="flex items-center justify-center w-full p-3 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 hover:text-blue-400 transition-colors">
                                <div className="flex items-center gap-2 text-sm">
                                <ImageIcon size={16} />
                                <span>Upload Mapa</span>
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
                        // Extract color class for preview circle, stripping svg specifics
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
                
                <label className="flex items-center justify-center w-full p-3 border-2 border-dashed border-gray-600 rounded-lg cursor-pointer hover:border-purple-500 hover:text-purple-400 transition-colors mb-4">
                    <div className="flex items-center gap-2 text-sm">
                    <Upload size={16} />
                    <span>Novo Token (Upload)</span>
                    </div>
                    <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={onUploadCharacter}
                    />
                </label>

                {/* Token Library */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                    {TOKEN_LIBRARY.map((file) => (
                        <button
                            key={file}
                            onClick={() => onAddFromLibrary(file)}
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

                {/* Selected Character Detail Editor */}
                {selectedCharacterId && selectedChar && (
                    <div className="mb-4 bg-gray-700 p-3 rounded-lg border border-purple-500/30">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-bold text-purple-300">{selectedChar.name}</span>
                        
                        {/* Host Visibility Toggle in Details */}
                        {isHost && (
                            <button 
                            onClick={() => onToggleVisibility(selectedChar.id)}
                            className={`p-1 rounded transition-colors ${selectedChar.isVisible ? 'text-green-400 hover:text-green-300' : 'text-red-400 hover:text-red-300'}`}
                            title={selectedChar.isVisible ? 'Visível para todos' : 'Oculto para jogadores'}
                            >
                                {selectedChar.isVisible ? <Eye size={16} /> : <EyeOff size={16} />}
                            </button>
                        )}
                    </div>
                    <textarea 
                        placeholder="Descrição (visível ao passar o mouse)..."
                        className="w-full bg-gray-800 text-xs text-white p-2 rounded border border-gray-600 resize-none h-16 focus:border-purple-500 outline-none"
                        value={selectedChar.description || ''}
                        onChange={(e) => onUpdateCharacterDescription(selectedChar.id, e.target.value)}
                    />
                    </div>
                )}

                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1 custom-scrollbar">
                    {characters.length === 0 && (
                    <p className="text-gray-500 text-sm italic text-center">Nenhum personagem.</p>
                    )}
                    {characters.map((char) => (
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
                        <div className={`w-8 h-8 rounded-full overflow-hidden border shrink-0 ${!char.isVisible ? 'border-red-500 opacity-70' : 'border-gray-500'}`}>
                            <img src={char.imageUrl} alt={char.name} className={`w-full h-full object-cover ${!char.isVisible ? 'grayscale' : ''}`} />
                        </div>
                        <div className="flex flex-col min-w-0">
                            <span className="text-sm font-medium truncate">{char.name}</span>
                            {!char.isVisible && isHost && <span className="text-[10px] text-red-400 flex items-center gap-1"><EyeOff size={8} /> Oculto</span>}
                        </div>
                        </div>
                        
                        <div className="flex gap-1">
                            {isHost && (
                                <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleVisibility(char.id);
                                }}
                                className={`p-1 rounded hover:bg-gray-800 ${char.isVisible ? 'text-gray-400 hover:text-white' : 'text-red-400 hover:text-red-300'}`}
                                title="Alternar Visibilidade"
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
  );
};
