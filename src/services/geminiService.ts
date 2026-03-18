import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function optimizeContent(content: string, instruction: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Task: ${instruction}\n\nContent:\n${content}`,
    config: {
      systemInstruction: "You are a professional content designer and copywriter. Your goal is to optimize the provided Markdown content based on the user's instruction while maintaining the Markdown structure. Return only the optimized content.",
    },
  });
  return response.text;
}

export async function suggestTemplates(content: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Analyze this content and suggest the best template type (Resume, Poster, Card, or SocialPost) and a brief reason.\n\nContent:\n${content}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          templateType: { type: Type.STRING },
          reason: { type: Type.STRING }
        },
        required: ["templateType", "reason"]
      }
    }
  });
  return JSON.parse(response.text);
}
