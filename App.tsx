
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Character, GridMap as GridMapType, TerrainType, Tool, PeerMessage } from './types';
import { Toolbar } from './components/Toolbar';
import { GridMap } from './components/GridMap';
import { generateMapNarrative } from './services/geminiService';
import { X, Dice5 } from 'lucide-react';
import { Peer, DataConnection } from 'peerjs';

function App() {
  // --- State ---
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
  // If I initiated a connection to someone else (connectionStatus === 'connected'), I am a Player.
  // Otherwise, I am the Host of my own session (even if no one else is here yet).
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
    const newPeer = new Peer();
    
    newPeer.on('open', (id) => {
      setMyPeerId(id);
      setPeer(newPeer);
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

    return () => newPeer.destroy();
  }, []);

  const connectToHost = () => {
      if(!peer || !hostPeerId) return;
      setConnectionStatus('connecting');
      
      const conn = peer.connect(hostPeerId);
      
      conn.on('open', () => {
          setConnections([conn]); // As client, only connected to host
          setConnectionStatus('connected');
          // When joining, default tool to something safe
          setSelectedTool('pan');
      });

      conn.on('data', (data) => {
          handlePeerMessage(data as PeerMessage, conn);
      });
      
      conn.on('close', () => setConnectionStatus('disconnected'));
      conn.on('error', () => setConnectionStatus('disconnected'));
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
        // Only Host processes requests in strict mode, but here we trust update logic
        // Update local state then broadcast new state if needed
        setCharacters(prev => {
            const newChars = prev.map(c => c.id === msg.payload.id ? { ...c, x: msg.payload.x, y: msg.payload.y } : c);
            // If I am host, I should propagate this move to other clients if I had multiple connections
            // For simplified P2P, handled in handleCharacterMove logic
            return newChars;
        });
    }
  };

  // --- Game Handlers ---

  const handleTileClick = (x: number, y: number) => {
    // Permissions check: Only host can edit terrain
    if (!isHost) return;

    const key = `${x},${y}`;
    
    setGrid(prevGrid => {
        const newGrid = { ...prevGrid };
        if (selectedTool === 'paint') {
            newGrid[key] = selectedTerrain;
        } else if (selectedTool === 'erase') {
            delete newGrid[key];
        }
        
        // Broadcast change
        broadcast({ type: 'UPDATE_GRID', payload: newGrid });
        return newGrid;
    });
  };

  const handleDiceRoll = (sides: number) => {
    const result = Math.floor(Math.random() * sides) + 1;
    const payload = { result, type: sides, user: 'Alguém' };
    setLastRoll(payload);
    broadcast({ type: 'DICE_ROLL', payload });
    setTimeout(() => setLastRoll(null), 4000);
  };

  const handleUploadCharacter = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Players CAN upload characters
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        const name = file.name.split('.')[0].substring(0, 10);
        
        const newChar: Character = {
            id: crypto.randomUUID(),
            name: name,
            imageUrl: imageUrl,
            x: 0, y: 0, size: 1,
            description: "Novo personagem",
            // If Host uploads, default to Hidden. If Player uploads, default to Visible.
            isVisible: !isHost
        };

        const newChars = [...characters, newChar];
        setCharacters(newChars);
        broadcast({ type: 'UPDATE_CHARS', payload: newChars });

        setSelectedCharacterId(newChar.id);
        setSelectedTool('move_char');
      };
      reader.readAsDataURL(file); // Convert to Base64 for sharing via PeerJS
      e.target.value = '';
    }
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

  const handleUploadBackground = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Permissions check: Only host can upload background
    if (!isHost) return;

    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
          const res = reader.result as string;
          setBackgroundImage(res);
          broadcast({ type: 'UPDATE_BG', payload: res });
          setSelectedTool('paint');
      };
      reader.readAsDataURL(file);
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
    // Everyone can move characters in this shared trust model
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
      />

      <main className="flex-1 flex flex-col relative overflow-hidden">
        
        {/* Status Bar */}
        <div className="h-12 bg-gray-900/90 border-b border-gray-800 flex items-center px-6 justify-between z-10 shrink-0 backdrop-blur-sm absolute top-0 left-0 right-0 pointer-events-none">
          <div className="text-sm text-gray-300 pointer-events-auto bg-black/50 px-3 py-1 rounded-full border border-gray-700">
            {selectedTool === 'paint' && `Pintando: ${selectedTerrain}`}
            {selectedTool === 'erase' && "Apagando"}
            {selectedTool === 'pan' && "Modo Câmera"}
            {selectedTool === 'move_char' && "Movendo Token"}
            <span className="ml-4 text-xs text-gray-500 hidden md:inline">| Multiplayer: {connections.length} peers</span>
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
                <div className="dice-roll bg-black/80 border-2 border-purple-500 p-6 rounded-2xl shadow-2xl flex flex-col items-center backdrop-blur-sm">
                    <Dice5 size={48} className="text-purple-400 mb-2" />
                    <div className="text-6xl font-black text-white">{lastRoll.result}</div>
                    <div className="text-sm text-gray-400 mt-2 uppercase tracking-widest">D{lastRoll.type}</div>
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
