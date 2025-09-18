/**
 * Unified TDEE (Total Daily Energy Expenditure) Calculator
 * This ensures consistent TDEE calculations across all screens
 */

export interface TDEEInputs {
  weightKg: number;
  bodyFatPercentage: number;
  activityLevel: string;
  exerciseFrequency?: string;
}

export interface ActivityMultiplier {
  base: number;
  exerciseBonus: number;
}

// Unified activity level mapping
export const ACTIVITY_LEVELS = {
  // Dashboard/DietPlan format
  'bmr': { base: 1.0, exerciseBonus: 0 },
  'sedentary': { base: 1.2, exerciseBonus: 0 },
  'lightly active': { base: 1.3, exerciseBonus: 0 },
  'moderately active': { base: 1.4, exerciseBonus: 0 },
  'very active': { base: 1.55, exerciseBonus: 0 },
  'extra active': { base: 1.7, exerciseBonus: 0 },
  
  // Upload screen format (mapped to Dashboard format)
  'Sedentary (office job)': { base: 1.2, exerciseBonus: 0 },
  'Light Exercise (1-2 days/week)': { base: 1.3, exerciseBonus: 0 },
  'Moderate Exercise (3-5 days/week)': { base: 1.4, exerciseBonus: 0 },
  'Heavy Exercise (6-7 days/week)': { base: 1.55, exerciseBonus: 0 },
  'Athlete (2x per day)': { base: 1.7, exerciseBonus: 0 },
} as const;

export const EXERCISE_FREQUENCY_BONUS = {
  'none': 0,
  '1-2': 0.05,
  '3-4': 0.1,
  '5-6': 0.15,
  'daily': 0.2,
} as const;

/**
 * Calculate BMR using Katch-McArdle formula (lean body mass based)
 */
export function calculateBMR(weightKg: number, bodyFatPercentage: number): number {
  const leanMass = weightKg - (weightKg * (bodyFatPercentage / 100));
  return 370 + (21.6 * leanMass);
}

/**
 * Get activity multiplier for given activity level
 */
export function getActivityMultiplier(activityLevel: string): ActivityMultiplier {
  const normalized = activityLevel.toLowerCase().trim();
  
  // Try exact match first
  for (const [key, value] of Object.entries(ACTIVITY_LEVELS)) {
    if (key.toLowerCase() === normalized) {
      return value;
    }
  }
  
  // Try partial match for flexibility
  if (normalized.includes('sedentary') || normalized.includes('office')) {
    return ACTIVITY_LEVELS['sedentary'];
  }
  if (normalized.includes('light') || normalized.includes('1-2')) {
    return ACTIVITY_LEVELS['lightly active'];
  }
  if (normalized.includes('moderate') || normalized.includes('3-5')) {
    return ACTIVITY_LEVELS['moderately active'];
  }
  if (normalized.includes('heavy') || normalized.includes('6-7')) {
    return ACTIVITY_LEVELS['very active'];
  }
  if (normalized.includes('athlete') || normalized.includes('2x')) {
    return ACTIVITY_LEVELS['extra active'];
  }
  
  // Default fallback
  console.warn(`Unknown activity level: ${activityLevel}, using sedentary`);
  return ACTIVITY_LEVELS['sedentary'];
}

/**
 * Get exercise frequency bonus multiplier
 */
export function getExerciseFrequencyBonus(exerciseFrequency: string): number {
  const normalized = exerciseFrequency.toLowerCase().trim();
  
  for (const [key, value] of Object.entries(EXERCISE_FREQUENCY_BONUS)) {
    if (key === normalized) {
      return value;
    }
  }
  
  // Default to no bonus
  return 0;
}

/**
 * Calculate TDEE using unified formula
 */
export function calculateTDEE(inputs: TDEEInputs): number {
  const { weightKg, bodyFatPercentage, activityLevel, exerciseFrequency = 'none' } = inputs;
  
  // Calculate BMR
  const bmr = calculateBMR(weightKg, bodyFatPercentage);
  
  // Get activity multiplier
  const activityMultiplier = getActivityMultiplier(activityLevel);
  
  // Get exercise frequency bonus
  const exerciseBonus = getExerciseFrequencyBonus(exerciseFrequency);
  
  // Calculate TDEE: BMR * (base activity + exercise bonus)
  const totalMultiplier = activityMultiplier.base + exerciseBonus;
  const tdee = bmr * totalMultiplier;
  
  console.log('TDEE Calculation:', {
    weightKg,
    bodyFatPercentage,
    activityLevel,
    exerciseFrequency,
    bmr: Math.round(bmr),
    baseMultiplier: activityMultiplier.base,
    exerciseBonus,
    totalMultiplier,
    tdee: Math.round(tdee)
  });
  
  return tdee;
}

/**
 * Calculate TDEE with default body fat percentage (15%)
 */
export function calculateTDEEWithDefaults(
  weightKg: number, 
  activityLevel: string, 
  exerciseFrequency: string = 'none',
  bodyFatPercentage: number = 15
): number {
  return calculateTDEE({
    weightKg,
    bodyFatPercentage,
    activityLevel,
    exerciseFrequency
  });
}
