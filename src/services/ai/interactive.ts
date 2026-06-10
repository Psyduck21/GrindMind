import * as SecureStore from 'expo-secure-store';
import { generateHomeWorkoutPrompt } from './prompt';
import { GeneratedRoutineSchema } from './schema';
import { OnboardingData } from '../../utils/validation';
import { GEMINI_API_URL, API_KEY_STORE_KEY } from './gemini';
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

type InteractiveResult =
  | { needs_input: true; question: string }
  | { routine: any };

export const generateRoutineInteractive = async (
  userData: OnboardingData,
  previousAnswers?: Record<string, string>
): Promise<InteractiveResult> => {
  const apiKey = await SecureStore.getItemAsync(API_KEY_STORE_KEY);
  if (!apiKey) throw new Error('Missing Gemini API key');

  const prompt = generateHomeWorkoutPrompt(userData, previousAnswers);

  const requestBody = {
    contents: [
      {
        parts: [
          {
            text: prompt,
          },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: 'application/json',
    },
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

  // Clean fenced codeblocks
  const cleaned = jsonText.replace(/```json/gi, '').replace(/```/g, '').trim();

  // Try parse
  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error('Failed to parse Gemini JSON response');
  }

  // If model asks for more input
  if (parsed && parsed.needs_input && parsed.question) {
    await incrementRequestCount();
    return { needs_input: true, question: parsed.question };
  }

  // Otherwise validate full routine
  try {
    const validated = GeneratedRoutineSchema.parse(parsed);
    await incrementRequestCount();
    return { routine: validated };
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      throw new Error('Gemini response failed validation: ' + JSON.stringify(e.issues));
    }
    throw e;
  }
};
