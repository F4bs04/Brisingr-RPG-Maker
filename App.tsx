
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Character, GridMap as GridMapType, TerrainType, Tool, PeerMessage, SessionData } from './types';
import { Toolbar } from './components/Toolbar';
import { GridMap } from './components/GridMap';
import { generateMapNarrative } from './services/geminiService';
import { X, Dice5, Swords, User } from 'lucide-react';
import { Peer, DataConnection } from 'peerjs';
// Removed unused import TOKEN_LIBRARY

// Helper: Compress image to reduce payload size for WebRTC
const compressImage = (file: File, maxWidth: number, quality: number = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = (maxWidth / width) * height;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
            reject(new Error("Could not get canvas context"));
            return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = (err) => reject(err);
    };
    reader.onerror = (err) => reject(err);
  });
};

function App() {
  // --- User State ---
  const [username, setUsername] = useState<string>('');
  const [isSetup, setIsSetup] = useState(false); // Controls the login screen

  // --- Game State ---
  const [grid, setGrid] = useState<GridMapType>({});
  const [characters, setCharacters] = useState<Character[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [hexSize, setHexSize] = useState(40);
  
  const [selectedTool, setSelectedTool] = useState<Tool>('paint');
  const [selectedTerrain, setSelectedTerrain] = useState<TerrainType>(TerrainType.GRASS);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  
  // Narrative AI State
  const [narrative, setNarrative] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Dice State
  const [lastRoll, setLastRoll] = useState<{result: number, type: number, user: string} | null>(null);

  // Multiplayer State
  const [peer, setPeer] = useState<Peer | null>(null);
  const [myPeerId, setMyPeerId] = useState<string | null>(null);
  const [hostPeerId, setHostPeerId] = useState<string>('');
  const [connections, setConnections] = useState<DataConnection[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  
  // Logic derivation for Host vs Player
  const isHost = connectionStatus !== 'connected';

  // Refs for access in callbacks/effects without stale closures
  const gridRef = useRef(grid);
  const charsRef = useRef(characters);
  const bgRef = useRef(backgroundImage);
  const hexSizeRef = useRef(hexSize);

  // Sync refs
  useEffect(() => { gridRef.current = grid; }, [grid]);
  useEffect(() => { charsRef.current = characters; }, [characters]);
  useEffect(() => { bgRef.current = backgroundImage; }, [backgroundImage]);
  useEffect(() => { hexSizeRef.current = hexSize; }, [hexSize]);

  // --- Multiplayer Logic ---

  useEffect(() => {
    // Only initialize PeerJS after user has entered their name to save resources/logic
    if (!isSetup) return;

    const newPeer = new Peer();
    
    newPeer.on('open', (id) => {
      console.log('Connected to PeerJS server with ID:', id);
      setMyPeerId(id);
      setPeer(newPeer);
    });

    newPeer.on('error', (err) => {
        console.error('PeerJS Error:', err);
    });

    newPeer.on('connection', (conn) => {
      // Incoming connection (someone joining my game)
      conn.on('open', () => {
        setConnections(prev => [...prev, conn]);
        
        // Send initial state to new peer
        const msg: PeerMessage = {
            type: 'SYNC_STATE',
            payload: {
                grid: gridRef.current,
                characters: charsRef.current,
                backgroundImage: bgRef.current,
                hexSize: hexSizeRef.current
            }
        };
        conn.send(msg);
      });

      conn.on('data', (data) => {
        const msg = data as PeerMessage;
        handlePeerMessage(msg, conn);
      });
    });

    return () => {
        newPeer.destroy();
    };
  }, [isSetup]); // Dependency on isSetup

  const connectToHost = () => {
      if(!peer || !hostPeerId) return;
      setConnectionStatus('connecting');
      
      const conn = peer.connect(hostPeerId);
      
      conn.on('open', () => {
          setConnections([conn]); // As client, only connected to host
          setConnectionStatus('connected');
          setSelectedTool('pan');
      });

      conn.on('data', (data) => {
          handlePeerMessage(data as PeerMessage, conn);
      });
      
      conn.on('close', () => setConnectionStatus('disconnected'));
      conn.on('error', (err) => {
          console.error("Connection Error:", err);
          setConnectionStatus('disconnected');
      });
  };

  const broadcast = (msg: PeerMessage) => {
      connections.forEach(conn => conn.send(msg));
  };

  const handlePeerMessage = (msg: PeerMessage, senderConn: DataConnection) => {
    if (msg.type === 'SYNC_STATE') {
        setGrid(msg.payload.grid);
        setCharacters(msg.payload.characters);
        setBackgroundImage(msg.payload.backgroundImage);
        setHexSize(msg.payload.hexSize);
    } else if (msg.type === 'UPDATE_GRID') {
        setGrid(msg.payload);
    } else if (msg.type === 'UPDATE_CHARS') {
        setCharacters(msg.payload);
    } else if (msg.type === 'UPDATE_BG') {
        setBackgroundImage(msg.payload);
    } else if (msg.type === 'DICE_ROLL') {
        setLastRoll(msg.payload);
        setTimeout(() => setLastRoll(null), 4000);
    } else if (msg.type === 'REQUEST_MOVE') {
        setCharacters(prev => {
            const newChars = prev.map(c => c.id === msg.payload.id ? { ...c, x: msg.payload.x, y: msg.payload.y } : c);
            return newChars;
        });
    }
  };

  // --- Game Handlers ---

  const handleTileClick = (x: number, y: number) => {
    if (!isHost) return;

    const key = `${x},${y}`;
    setGrid(prevGrid => {
        const newGrid = { ...prevGrid };
        if (selectedTool === 'paint') {
            newGrid[key] = selectedTerrain;
        } else if (selectedTool === 'erase') {
            delete newGrid[key];
        }
        broadcast({ type: 'UPDATE_GRID', payload: newGrid });
        return newGrid;
    });
  };

  const handleDiceRoll = (sides: number) => {
    const result = Math.floor(Math.random() * sides) + 1;
    // Send the actual username
    const payload = { result, type: sides, user: username || 'Anônimo' };
    setLastRoll(payload);
    broadcast({ type: 'DICE_ROLL', payload });
    setTimeout(() => setLastRoll(null), 4000);
  };

  // Unified function to add character (from Upload or Library)
  const addCharacter = (name: string, imageUrl: string) => {
      const newChar: Character = {
          id: crypto.randomUUID(),
          name: name,
          imageUrl: imageUrl,
          x: 0, y: 0, size: 1,
          description: "Novo personagem",
          isVisible: !isHost // Host uploads hidden by default
      };

      const newChars = [...characters, newChar];
      setCharacters(newChars);
      broadcast({ type: 'UPDATE_CHARS', payload: newChars });

      setSelectedCharacterId(newChar.id);
      setSelectedTool('move_char');
  };

  const handleUploadCharacter = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        // Compress token to max 300px width, 0.7 quality
        const imageUrl = await compressImage(file, 300, 0.7);
        const name = file.name.split('.')[0].substring(0, 10);
        addCharacter(name, imageUrl);
      } catch (err) {
        console.error("Error compressing token", err);
      }
      e.target.value = '';
    }
  };
  
  const handleAddFromLibrary = (filename: string) => {
      // Assuming images are in public/tokens/ folder
      const name = filename.split('.')[0];
      // Capitalize first letter
      const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
      addCharacter(formattedName, `/tokens/${filename}`);
  };

  const handleUpdateCharacterDescription = (id: string, desc: string) => {
    const newChars = characters.map(c => c.id === id ? { ...c, description: desc } : c);
    setCharacters(newChars);
    broadcast({ type: 'UPDATE_CHARS', payload: newChars });
  };

  const handleToggleVisibility = (id: string) => {
      if (!isHost) return;
      const newChars = characters.map(c => c.id === id ? { ...c, isVisible: !c.isVisible } : c);
      setCharacters(newChars);
      broadcast({ type: 'UPDATE_CHARS', payload: newChars });
  };

  const handleUploadBackground = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!isHost) return;
    const file = e.target.files?.[0];
    if (file) {
       try {
          // Compress bg to max 1600px, 0.6 quality (good enough for map, keeps size low)
          const res = await compressImage(file, 1600, 0.6);
          setBackgroundImage(res);
          broadcast({ type: 'UPDATE_BG', payload: res });
          setSelectedTool('paint');
       } catch (err) {
          console.error("Error compressing bg", err);
       }
       e.target.value = '';
    }
  };

  const handleClearBackground = () => {
      if (!isHost) return;
      setBackgroundImage(null);
      broadcast({ type: 'UPDATE_BG', payload: null });
  };

  const handleDeleteCharacter = (id: string) => {
    const newChars = characters.filter(c => c.id !== id);
    setCharacters(newChars);
    broadcast({ type: 'UPDATE_CHARS', payload: newChars });
    if (selectedCharacterId === id) setSelectedCharacterId(null);
  };

  const handleCharacterMove = (id: string, x: number, y: number) => {
    const newChars = characters.map(c => c.id === id ? { ...c, x, y } : c);
    setCharacters(newChars);
    broadcast({ type: 'UPDATE_CHARS', payload: newChars });
  };

  const handleGenerateNarrative = useCallback(async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setNarrative(null);
    
    const text = await generateMapNarrative(grid, characters);
    
    setNarrative(text);
    setIsGenerating(false);
  }, [grid, characters, isGenerating]);

  // --- Session Management ---

  const handleSaveSession = () => {
    const sessionData: SessionData = {
        grid,
        characters,
        backgroundImage,
        hexSize,
        version: '1.0',
        timestamp: Date.now()
    };
    
    const blob = new Blob([JSON.stringify(sessionData)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rpg-session-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleLoadSession = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const session = JSON.parse(text) as SessionData;
        
        // Validate basic structure
        if (session.grid && Array.isArray(session.characters)) {
            setGrid(session.grid);
            setCharacters(session.characters);
            setBackgroundImage(session.backgroundImage);
            setHexSize(session.hexSize || 40);
            
            // If online, sync everyone
            if (connections.length > 0) {
                 const msg: PeerMessage = {
                    type: 'SYNC_STATE',
                    payload: {
                        grid: session.grid,
                        characters: session.characters,
                        backgroundImage: session.backgroundImage,
                        hexSize: session.hexSize || 40
                    }
                };
                broadcast(msg);
            }
            alert("Sessão carregada com sucesso!");
        } else {
            alert("Arquivo de sessão inválido.");
        }
      } catch (err) {
          console.error("Error loading session", err);
          alert("Erro ao ler o arquivo.");
      }
      // Reset input
      e.target.value = '';
  };

  // --- Start Screen / Login View ---
  if (!isSetup) {
    return (
      <div className="flex h-screen w-screen bg-gray-950 items-center justify-center p-4 relative overflow-hidden">
        {/* Background Decorations */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/20 via-gray-950 to-gray-950"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
        
        <div className="z-10 max-w-md w-full bg-gray-900 border border-gray-800 shadow-2xl rounded-2xl p-8 flex flex-col items-center">
          <div className="bg-indigo-600/20 p-4 rounded-full mb-6 border border-indigo-500/30">
            <Swords size={48} className="text-indigo-400" />
          </div>
          
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">RPG Grid Master</h1>
          <p className="text-gray-400 mb-8 text-center text-sm">Crie mapas, gerencie tokens e jogue com seus amigos.</p>
          
          <div className="w-full space-y-4">
            <div>
              <label className="block text-xs uppercase font-bold text-gray-500 mb-2 ml-1">Seu Nome de Aventureiro</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                <input 
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && username.trim() && setIsSetup(true)}
                  placeholder="Ex: Gandalf, o Cinza"
                  className="w-full bg-gray-950 border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white placeholder-gray-600 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all"
                  autoFocus
                />
              </div>
            </div>
            
            <button 
              onClick={() => setIsSetup(true)}
              disabled={!username.trim()}
              className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-indigo-900/20 flex items-center justify-center gap-2"
            >
              Entrar na Aventura
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Main App View ---

  return (
    <div className="flex h-screen w-screen bg-gray-950 text-white overflow-hidden">
      
      <Toolbar 
        selectedTool={selectedTool}
        setSelectedTool={setSelectedTool}
        selectedTerrain={selectedTerrain}
        setSelectedTerrain={setSelectedTerrain}
        characters={characters}
        selectedCharacterId={selectedCharacterId}
        setSelectedCharacterId={setSelectedCharacterId}
        onUploadCharacter={handleUploadCharacter}
        onUpdateCharacterDescription={handleUpdateCharacterDescription}
        onUploadBackground={handleUploadBackground}
        onDeleteCharacter={handleDeleteCharacter}
        onGenerateNarrative={handleGenerateNarrative}
        isGenerating={isGenerating}
        hasBackground={!!backgroundImage}
        onClearBackground={handleClearBackground}
        hexSize={hexSize}
        setHexSize={(s) => { 
            if(isHost) {
                setHexSize(s); 
                broadcast({ type: 'SYNC_STATE', payload: { ...gridRef.current, hexSize: s, grid: grid, characters: characters, backgroundImage: backgroundImage } } as any); 
            }
        }} 
        onDiceRoll={handleDiceRoll}
        peerId={myPeerId}
        hostId={hostPeerId}
        setHostId={setHostPeerId}
        onConnect={connectToHost}
        connectionStatus={connectionStatus}
        isHost={isHost}
        onToggleVisibility={handleToggleVisibility}
        onAddFromLibrary={handleAddFromLibrary}
        onSaveSession={handleSaveSession}
        onLoadSession={handleLoadSession}
      />

      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Status Bar */}
        <div className="h-12 bg-gray-900/90 border-b border-gray-800 flex items-center px-6 justify-between z-10 shrink-0 backdrop-blur-sm absolute top-0 left-0 right-0 pointer-events-none">
          <div className="flex items-center gap-4 pointer-events-auto">
            <div className="text-sm text-gray-300 bg-black/50 px-3 py-1 rounded-full border border-gray-700">
              {selectedTool === 'paint' && `Pintando: ${selectedTerrain}`}
              {selectedTool === 'erase' && "Apagando"}
              {selectedTool === 'pan' && "Modo Câmera"}
              {selectedTool === 'move_char' && "Movendo Token"}
            </div>
          </div>
          <div className="text-xs text-gray-500 flex items-center gap-2 bg-black/30 px-3 py-1 rounded-full">
            <User size={12} />
            <span className="font-semibold text-gray-300">{username}</span>
            <span className="text-gray-700">|</span>
            <span>{connections.length > 0 ? `${connections.length} online` : 'Offline'}</span>
          </div>
        </div>

        <div className="flex-1 w-full h-full">
            <GridMap 
              grid={grid}
              characters={characters}
              onTileClick={handleTileClick}
              onCharacterDragEnd={handleCharacterMove}
              selectedTool={selectedTool}
              selectedCharacterId={selectedCharacterId}
              backgroundImage={backgroundImage}
              hexSize={hexSize}
              isHost={isHost}
            />
        </div>

        {/* Dice Result Overlay */}
        {lastRoll && (
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[60]">
                <div className="dice-roll bg-black/80 border-2 border-purple-500 p-6 rounded-2xl shadow-2xl flex flex-col items-center backdrop-blur-sm min-w-[200px]">
                    <div className="flex items-center gap-2 text-purple-300 mb-2 text-sm font-bold uppercase tracking-wider">
                       <User size={14} /> {lastRoll.user}
                    </div>
                    <div className="text-6xl font-black text-white mb-1">{lastRoll.result}</div>
                    <div className="text-xs text-gray-500 uppercase tracking-widest border-t border-gray-700 pt-2 w-full text-center">
                        Rolagem D{lastRoll.type}
                    </div>
                </div>
             </div>
        )}

          {/* Narrative Overlay */}
          {narrative && (
            <div className="absolute bottom-8 left-8 right-8 md:right-auto md:max-w-xl bg-gray-900/95 border border-purple-500/50 rounded-xl p-6 shadow-2xl z-50 backdrop-blur-md animate-in slide-in-from-bottom-10 fade-in duration-300">
              <div className="flex justify-between items-start mb-4 border-b border-gray-800 pb-2">
                <h3 className="text-purple-400 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                  <span>✨</span> Narrativa Gerada
                </h3>
                <button 
                  onClick={() => setNarrative(null)}
                  className="text-gray-500 hover:text-white transition-colors bg-gray-800 hover:bg-gray-700 rounded p-1"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="prose prose-invert prose-sm max-h-[250px] overflow-y-auto pr-2 custom-scrollbar text-gray-300">
                <div className="whitespace-pre-wrap font-serif leading-relaxed">
                  {narrative}
                </div>
              </div>
            </div>
          )}
      </main>
    </div>
  );
}

export default App;
