import { GoogleGenAI } from "@google/genai";
import { GridMap, Character, TerrainType } from "../types";

// Initialize the client
// MOVIDO PARA DENTRO DA FUNÇÃO PARA EVITAR CRASH NO LOAD
// const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateMapNarrative = async (
  grid: GridMap,
  characters: Character[]
): Promise<string> => {
  
  // Analyze sparse grid
  const tiles = Object.values(grid);
  const tileKeys = Object.keys(grid);
  
  let minX = 0, maxX = 0, minY = 0, maxY = 0;
  
  if (tileKeys.length > 0) {
    const coords = tileKeys.map(k => {
        const [x, y] = k.split(',').map(Number);
        return {x, y};
    });
    minX = Math.min(...coords.map(c => c.x));
    maxX = Math.max(...coords.map(c => c.x));
    minY = Math.min(...coords.map(c => c.y));
    maxY = Math.max(...coords.map(c => c.y));
  }

  // Count terrain types
  const counts: Record<string, number> = {};
  tiles.forEach(type => {
      if (type !== TerrainType.VOID) {
        counts[type] = (counts[type] || 0) + 1;
      }
  });

  const terrainSummary = Object.entries(counts)
    .map(([type, count]) => `${type}: ${count} hexes`)
    .join(", ");

  const charSummary = characters.map(c => `${c.name} at (${c.x},${c.y})`).join(", ");

  const prompt = `
    Atue como um Dungeon Master especialista em RPGs de fantasia.
    
    Estou projetando um mapa tático em um grid hexagonal.
    Dimensões aproximadas da área explorada: ${(maxX - minX) + 1}x${(maxY - minY) + 1} hexágonos.
    
    A composição do terreno pintado é: ${terrainSummary || "Ainda é uma tela em branco ou apenas imagem de fundo"}.
    
    Personagens presentes: ${charSummary ? charSummary : "Nenhum personagem colocado ainda"}.
    
    Crie uma descrição imersiva e atmosférica deste local para eu ler aos meus jogadores.
    1. Descreva o ambiente visualmente (luz, cores, profundidade).
    2. Descreva sensações (cheiros, sons, temperatura).
    3. Sugira uma ameaça tática ou segredo escondido no terreno (ex: terreno difícil na lama, cobertura nas árvores).
    
    Se o mapa estiver vazio, descreva um vazio enevoado ou um potencial latente.
    
    Mantenha a resposta evocativa mas concisa (máximo 3 parágrafos curtos).
  `;

  try {
    // Inicializa o cliente apenas quando solicitado
    // Isso previne erros fatais se a variável de ambiente não estiver configurada no load
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: "Você é um narrador de RPG sombrio e detalhista.",
        temperature: 0.7,
      }
    });

    return response.text || "Não foi possível gerar a narrativa.";
  } catch (error) {
    console.error("Erro ao gerar narrativa:", error);
    return "O oráculo está silencioso no momento. Verifique se a CHAVE DE API está configurada corretamente nas variáveis de ambiente do seu deploy (Vercel/Netlify).";
  }
};