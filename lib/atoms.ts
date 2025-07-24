import { atomWithStorage } from 'jotai/utils';

export interface Recipe {
  name: string;
  cookingTime: number;
  difficulty: string;
  servings: number;
  ingredients: string[];
  instructions: string;
  matchReason: string;
  nutritionHighlight: string;
}

export interface Session {
  id: string;
  date: string;
  title: string;
  image?: string;
  summary?: string;
  facts?: string[];
  furtherImpact?: string;
  recipes?: Recipe[];
  encouragement?: string;
  shoppingTip?: string;
  detectedIngredients?: string;
}

export const sessionsAtom = atomWithStorage<Session[]>('sessions', []);

export interface PersonalizationAnswers {
  q1: string;
  q2: string;
  q3: string[];
}

export const personalizationAtom = atomWithStorage<PersonalizationAnswers | null>('personalization', null);
