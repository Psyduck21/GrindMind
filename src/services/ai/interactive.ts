import * as SecureStore from 'expo-secure-store';
import { generateRoutinePrompt, extractQuestionsPrompt } from './prompt';
import { GeneratedRoutineSchema, GeneratedRoutine } from './schema';
import { OnboardingData } from '../../utils/validation';
import { GEMINI_API_URL } from './gemini';
import { z } from 'zod';

// Simple per-day request counter stored in SecureStore
const reqKeyFor = (dateStr: string) => `ai_req_count_${dateStr}`;

async function incrementRequestCount() {
  const today = new Date().toISOString().slice(0, 10);
  const key = reqKeyFor(today);
  const raw = await SecureStore.getItemAsync(key);
  const n = raw ? parseInt(raw, 10) || 0 : 0;
  await SecureStore.setItemAsync(key, String(n + 1));
}

async function callGemini(prompt: string, responseSchema?: any) {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) throw new Error('Missing Gemini API key in EXPO_PUBLIC_GEMINI_API_KEY');

  const generationConfig: any = {
    temperature: 0.2,
    responseMimeType: 'application/json',
  };

  if (responseSchema) {
    generationConfig.responseSchema = responseSchema;
  }

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig,
  };

  const res = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gemini API Error: ${res.status} ${txt}`);
  }

  const data = await res.json();
  const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!jsonText) throw new Error('Invalid response from Gemini');

  const cleaned = jsonText.replace(/```json/gi, '').replace(/```/g, '').trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error('Failed to parse Gemini JSON response');
  }

  return parsed;
}

export const extractAIQuestions = async (userData: OnboardingData): Promise<string[]> => {
  const prompt = extractQuestionsPrompt(userData);
  
  const responseSchema = {
    type: "ARRAY",
    items: {
      type: "STRING"
    }
  };

  const parsed = await callGemini(prompt, responseSchema);

  if (!Array.isArray(parsed)) {
    throw new Error('Gemini did not return an array of questions');
  }

  await incrementRequestCount();
  return parsed.filter(q => typeof q === 'string').slice(0, 5);
};

export const generateRoutineInteractive = async (
  userData: OnboardingData,
  answers: Record<string, string>
): Promise<GeneratedRoutine> => {
  const prompt = generateRoutinePrompt(userData, answers);
  
  const responseSchema = {
    type: "OBJECT",
    properties: {
      routine: {
        type: "OBJECT",
        properties: {
          title: { type: "STRING" },
          goal: { type: "STRING" }
        },
        required: ["title", "goal"]
      },
      tasks: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: {
            title: { type: "STRING" },
            description: { type: "STRING" },
            priority: { type: "STRING", enum: ["high", "medium", "low"] },
            category: { type: "STRING" },
            scheduled_time: { type: "STRING" },
            estimated_duration_minutes: { type: "INTEGER" },
            consequence_weight: { type: "NUMBER" },
            recurrence_rule: { type: "STRING" }
          },
          required: ["title", "description", "priority", "category", "scheduled_time", "estimated_duration_minutes", "consequence_weight"]
        }
      }
    },
    required: ["routine", "tasks"]
  };

  const parsed = await callGemini(prompt, responseSchema);

  try {
    const validated = GeneratedRoutineSchema.parse(parsed);
    await incrementRequestCount();
    return validated;
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      throw new Error('Gemini response failed validation: ' + JSON.stringify(e.issues));
    }
    throw e;
  }
};
