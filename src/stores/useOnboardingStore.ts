import { create } from 'zustand';
import { OnboardingData } from '../utils/validation';

interface OnboardingStore {
  data: Partial<OnboardingData>;
  updateData: (partial: Partial<OnboardingData>) => void;
  reset: () => void;
  // Multi-turn AI question flow
  aiQuestions?: string[] | null;
  aiAnswers?: Record<string, string>;
  setAIQuestions?: (q: string[] | null) => void;
  addAIAnswer?: (question: string, answer: string) => void;
}

export const useOnboardingStore = create<OnboardingStore>((set) => ({
  data: {
    grindType: 'study',
    wakeTime: '06:00',
    sleepTime: '23:00',
    dailyMinutes: 90,
    accountabilityMode: 'coach',
  },
  updateData: (partial) => set((state) => ({ data: { ...state.data, ...partial } })),
  reset: () => set({
    data: {
      grindType: 'study',
      wakeTime: '06:00',
      sleepTime: '23:00',
      dailyMinutes: 90,
      accountabilityMode: 'coach',
    }
  }),
  aiQuestions: null,
  aiAnswers: {},
  setAIQuestions: (q) => set(() => ({ aiQuestions: q })),
  addAIAnswer: (question, answer) => set((state) => ({ aiAnswers: { ...(state.aiAnswers || {}), [question]: answer } })),
}));
