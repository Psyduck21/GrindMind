import { db } from '../../db/db';
import { getLocalYYYYMMDD } from '../../utils/date';
import { IntentGraphSchema, IntentGraph } from './schema';
import { GEMINI_API_URL } from './gemini';

/**
 * 1. Context Hydration: 
 * Gets all tasks between (Today - 15 days) and (Today + 15 days).
 * This establishes the 1-Month Rolling Window.
 */
export const hydrateContextWindow = async (userId: string) => {
  const baseDate = new Date();
  const past = new Date(baseDate);
  past.setDate(past.getDate() - 15);
  const future = new Date(baseDate);
  future.setDate(future.getDate() + 15);

  const pastStr = getLocalYYYYMMDD(past);
  const futureStr = getLocalYYYYMMDD(future);

  const tasks = await db.getAllAsync<any>(
    `SELECT tasks.* FROM tasks 
     JOIN routines ON tasks.routine_id = routines.id
     WHERE routines.user_id = ? 
       AND tasks.scheduled_date >= ? 
       AND tasks.scheduled_date <= ?
     ORDER BY tasks.scheduled_date ASC, tasks.scheduled_time ASC`,
    [userId, pastStr, futureStr]
  );
  return tasks;
};

/**
 * 2. Token Stripping:
 * Pure JS map function to strip out 'description', 'ai_context', 'category', etc.
 */
export const summarizePayload = (tasks: any[]) => {
  return tasks.map(t => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    status: t.status,
    scheduled_date: t.scheduled_date,
    scheduled_time: t.scheduled_time,
    duration: t.estimated_duration_minutes,
    locked: t.is_time_locked === 1,
    recovery: t.is_recovery_task === 1
  }));
};

/**
 * 3. Gemini Generation:
 * Requests the Intent Graph.
 */
export const generateIntent = async (userPrompt: string, userId: string): Promise<IntentGraph> => {
  const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('No Gemini API key found.');
  }

  const rawTasks = await hydrateContextWindow(userId);
  const strippedTasks = summarizePayload(rawTasks);

  const systemPrompt = `You are GrindMind's AI Orchestrator. 
The user is requesting schedule changes. 
You are provided with a 30-day window of their tasks. 
Analyze the request and return an Intent Graph dictating exactly how the tasks should be mutated.
Available actions: MOVE, CANCEL, UPDATE, CREATE.
If moving a task, you MUST provide new_scheduled_date and/or new_scheduled_time.
Do NOT move tasks where 'locked' is true unless the user explicitly forces it.
Return valid JSON matching the schema.

User Request: "${userPrompt}"

Current Schedule Data:
${JSON.stringify(strippedTasks, null, 2)}`;

  const requestBody = {
    contents: [
      {
        parts: [
          { text: systemPrompt },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1, // Highly deterministic
      responseMimeType: 'application/json',
    },
  };

  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API Error: ${response.status} ${errorText}`);
  }

  const data = await response.json();
  const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!jsonText) throw new Error('Invalid response from Gemini API');

  const cleanedText = jsonText.replace(/```json/gi, '').replace(/```/g, '').trim();
  const parsedAny = JSON.parse(cleanedText);
  
  return IntentGraphSchema.parse(parsedAny) as IntentGraph;
};
