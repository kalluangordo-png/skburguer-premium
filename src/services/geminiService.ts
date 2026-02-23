import { GoogleGenAI, Type } from "@google/genai";
import { Order, InventoryItem } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export const generateCEOInsights = async (orders: Order[], inventory: InventoryItem[]) => {
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Aja como um consultor sênior de gestão para a SK Burgers em Manaus. 
    Analise os seguintes dados e forneça 3 insights estratégicos curtos.
    
    Pedidos: ${JSON.stringify(orders.map(o => ({ total: o.total, pagamento: o.pagamento })))}
    Estoque Crítico: ${JSON.stringify(inventory.filter(i => i.quantity <= i.minQuantity))}
    
    Regras de Negócio:
    - Meta Diária: R$ 400
    - Taxas: Pix 5%, Sodexo 10%
    - Diárias: Motoboy R$ 30, Chapeiro R$ 56,66
    
    Retorne um JSON com o seguinte formato:
    {
      "insights": [
        {
          "title": "Título Curto",
          "description": "Descrição breve",
          "action": "Ação recomendada"
        }
      ]
    }
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            insights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  action: { type: Type.STRING }
                },
                required: ["title", "description", "action"]
              }
            }
          },
          required: ["insights"]
        }
      }
    });

    return JSON.parse(response.text || '{"insights": []}');
  } catch (error) {
    console.error("Gemini Insight Error:", error);
    return { insights: [] };
  }
};
