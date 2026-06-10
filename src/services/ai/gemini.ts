import * as SecureStore from 'expo-secure-store';
import { OnboardingData } from '../../utils/validation';
import { generateRoutinePrompt } from './prompt';
import { GeneratedRoutineSchema, GeneratedRoutine } from './schema';
import { z } from 'zod';

export const API_KEY_STORE_KEY = 'gemini_api_key';
export const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export const generateRoutine = async (userData: OnboardingData): Promise<GeneratedRoutine> => {
  const apiKey = await SecureStore.getItemAsync(API_KEY_STORE_KEY);
  
  if (!apiKey) {
    throw new Error('No Gemini API key found. Please set it in Settings.');
  }

  const prompt = generateRoutinePrompt(userData);

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
      temperature: 0.2, // Low temperature for deterministic output
      responseMimeType: 'application/json',
    },
  };

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!jsonText) {
    throw new Error('Invalid response from Gemini API');
  }

  try {
    const cleanedText = jsonText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsedAny = JSON.parse(cleanedText);
    // Validate structure strictly using zod schema
    const parsed = GeneratedRoutineSchema.parse(parsedAny) as GeneratedRoutine;
    return parsed;
  } catch (e: any) {
    if (e instanceof z.ZodError) {
      throw new Error('Gemini response failed schema validation: ' + JSON.stringify(e.issues));
    }
    throw new Error('Failed to parse Gemini response as JSON');
  }
};
