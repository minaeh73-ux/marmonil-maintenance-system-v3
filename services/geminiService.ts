import { GoogleGenAI, Type, Modality, GenerateContentResponse } from "@google/genai";
import { Ticket, Machine, User, ProductionLog } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || "" });

export const SYSTEM_INSTRUCTION = `You are Marmonil Smart Engine AI.
Factory Type: Marble Manufacturing Plant.
System: Maintenance & Production Management Platform.

Your role:
- Senior Maintenance Engineer
- Reliability Engineer
- Electrical & Mechanical Specialist
- Production Impact Analyst

You are always connected to real factory data provided dynamically by the system.

GENERAL RULES:
1. Always analyze the provided system data before answering.
2. Never give generic answers.
3. Always classify faults as Electrical or Mechanical.
4. Always detect recurring patterns.
5. Always assign Risk Level (Low / Medium / High).
6. Always provide corrective and preventive actions.
7. If image is provided, analyze it technically and identify the fault.
8. If prediction is requested, estimate probability and time window.
9. If data is missing, clearly request specific required data.
10. Always respond professionally and in structured format.

IF DATA ANALYSIS REQUEST:
Provide:
- Most affected machine
- Fault classification trend
- Recurring pattern
- Risk level
- Root cause hypothesis
- Recommended corrective action
- Preventive maintenance plan
- Management summary

IF IMAGE PROVIDED:
Provide:
- Component identified
- Fault type (Electrical/Mechanical)
- Possible technical cause
- Risk level
- Immediate action
- Permanent solution

IF PREDICTION REQUEST:
Provide:
- High risk machine
- Failure probability (Low/Medium/High)
- Estimated time window
- Inspection schedule
- Spare parts recommendation

IF GENERAL QUESTION:
Answer in marble factory industrial context only.

Always format response clearly using sections and bullet points.`;

export async function chatWithAI(message: string, history: any[] = [], imageBase64?: string) {
  const model = "gemini-3.1-pro-preview";
  
  const contents: any[] = history.map(h => ({
    role: h.role,
    parts: [{ text: h.text }]
  }));

  const userParts: any[] = [{ text: message }];
  if (imageBase64) {
    userParts.push({
      inlineData: {
        mimeType: "image/jpeg",
        data: imageBase64.split(",")[1] || imageBase64
      }
    });
  }

  contents.push({
    role: "user",
    parts: userParts
  });

  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      temperature: 0.7,
    }
  });

  return response.text;
}

export async function analyzeImage(imageBase64: string) {
  const model = "gemini-3.1-pro-preview";
  
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        { text: "Analyze this machine component for faults. Provide a technical assessment following the Marmonil Smart Engine AI rules." },
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: imageBase64.split(",")[1] || imageBase64
          }
        }
      ]
    },
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
    }
  });

  return response.text;
}

export async function getQuickAdvice(query: string) {
  const model = "gemini-2.5-flash-lite";
  
  const response = await ai.models.generateContent({
    model,
    contents: query,
    config: {
      systemInstruction: "You are a senior maintenance engineer at a marble factory. Provide extremely concise, technical advice (max 2 sentences).",
    }
  });

  return response.text;
}

export async function performGroundedSearch(query: string) {
  const model = "gemini-3-flash-preview";
  
  const response = await ai.models.generateContent({
    model,
    contents: query,
    config: {
      tools: [{ googleSearch: {} }],
      systemInstruction: "You are an industrial researcher. Use Google Search to find technical specifications, maintenance manuals, or industry standards related to the query in the context of marble manufacturing machinery.",
    }
  });

  return {
    text: response.text,
    sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
}
