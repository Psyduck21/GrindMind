/**
 * GrindMind Roast Bank
 * 100 Hinglish Roasts organized by intensity and context.
 * TRD §10 — FR-59 to FR-63
 */

export type RoastIntensity = 'friendly' | 'coach' | 'military' | 'savage' | 'iron_discipline';
export type RoastContext =
  | 'morning'
  | 'evening'
  | 'missed_task'
  | 'missed_day'
  | 'streak_broken'
  | 'recovery_pending'
  | 'good_streak'
  | 'task_complete'
  | 'perfect_day';

export interface RoastMessage {
  intensity: RoastIntensity;
  context: RoastContext;
  message: string;
}

export const ROAST_BANK: RoastMessage[] = [
  // ─── MORNING (Wake Up) ──────────────────────────────────────────────────
  { intensity: 'friendly', context: 'morning', message: 'Uth ja bhai, goals khud complete nahi honge 🌅' },
  { intensity: 'friendly', context: 'morning', message: 'Good morning? Tere liye toh warning hai ⏰' },
  { intensity: 'coach', context: 'morning', message: 'Uth saale, duniya level up kar rahi hai 📈' },
  { intensity: 'coach', context: 'morning', message: 'Din aadha nikal gaya aur tera contribution zero hai 📉' },
  { intensity: 'military', context: 'morning', message: 'Kaam karne ka time hai, acting dead band kar 💀' },
  { intensity: 'military', context: 'morning', message: 'Aankh khol, competition already kaam pe lag gaya ⚔️' },
  { intensity: 'savage', context: 'morning', message: 'Uth ja saale, success tere ghar ka address bhool rahi hai 🏠' },
  { intensity: 'savage', context: 'morning', message: 'Tera future refresh maar raha hai, response nahi aa raha 🔄' },
  { intensity: 'iron_discipline', context: 'morning', message: 'Bed se niklega ya wahi retirement plan hai? 🛌' },
  { intensity: 'iron_discipline', context: 'morning', message: 'Kitna soyega? Kumbhkaran bhi resign kar gaya 😴' },

  // ─── EVENING (Review) ───────────────────────────────────────────────────
  { intensity: 'friendly', context: 'evening', message: 'Aaj padh, kal tension kam hogi 🧠' },
  { intensity: 'friendly', context: 'evening', message: 'Screen time dekh ke phone bhi judge kar raha hai 📱' },
  { intensity: 'coach', context: 'evening', message: 'Bas sochta hi rahega ya kuch karega bhi? 🤔' },
  { intensity: 'coach', context: 'evening', message: 'Planning ka world champion, execution ka spectator 🏆' },
  { intensity: 'military', context: 'evening', message: 'Din khatam. Action ke bina ambition bas decoration hai 🎖️' },
  { intensity: 'military', context: 'evening', message: 'Kaam itna avoid mat kar, ye tera ex nahi hai 💔' },
  { intensity: 'savage', context: 'evening', message: 'Teri to-do list tujhe dekh ke ro rahi hai 😭' },
  { intensity: 'savage', context: 'evening', message: 'Aaj ka delay, kal ka regret ⏳' },
  { intensity: 'iron_discipline', context: 'evening', message: 'Sapne billionaire wale, effort intern wala 💸' },
  { intensity: 'iron_discipline', context: 'evening', message: 'Tera potential aur tera action kab milenge? 🤝' },

  // ─── MISSED TASK ────────────────────────────────────────────────────────
  { intensity: 'friendly', context: 'missed_task', message: 'Task pending hai, aur tu random reels pe research kar raha hai 🤡' },
  { intensity: 'friendly', context: 'missed_task', message: 'Productivity ka murder mat kar 🔪' },
  { intensity: 'coach', context: 'missed_task', message: 'Bro, tu busy nahi. Tu distracted hai 🎯' },
  { intensity: 'coach', context: 'missed_task', message: 'Syllabus tujhe dekh ke hass raha hai 📚' },
  { intensity: 'military', context: 'missed_task', message: 'Task khol, YouTube nahi 🛑' },
  { intensity: 'military', context: 'missed_task', message: 'Kaam kar le, excuses ka startup kabhi unicorn nahi banta 🦄' },
  { intensity: 'savage', context: 'missed_task', message: 'Notes khol saale, exam sympathy se pass nahi karega 📝' },
  { intensity: 'savage', context: 'missed_task', message: 'Tu kaam se bhaag raha hai ya marathon practice kar raha hai? 🏃‍♂️' },
  { intensity: 'iron_discipline', context: 'missed_task', message: 'Aaj phir delay? Wah consistency 👏' },
  { intensity: 'iron_discipline', context: 'missed_task', message: 'Tu capable hai, bas comfortable zyada hai 🛋️' },

  // ─── MISSED DAY (Zero Completion) ───────────────────────────────────────
  { intensity: 'friendly', context: 'missed_day', message: 'Gym bag decoration item nahi hai 🎒' },
  { intensity: 'friendly', context: 'missed_day', message: 'Tu padh raha hai ya stationery collect kar raha hai? 🖊️' },
  { intensity: 'coach', context: 'missed_day', message: 'Aaj bhi excuse banaya toh kal bhi wahi hoga 🔁' },
  { intensity: 'coach', context: 'missed_day', message: 'Workout skip karne ka world record banayega kya? 🏋️' },
  { intensity: 'military', context: 'missed_day', message: 'Focus kar saale, future free version pe chal raha hai 💸' },
  { intensity: 'military', context: 'missed_day', message: 'Exam hall me miracle nahi aane wala 🎩' },
  { intensity: 'savage', context: 'missed_day', message: 'Zero pe atka hai. Tera future loading pe atka hua hai ⌛' },
  { intensity: 'savage', context: 'missed_day', message: 'Excuses unlimited, results unavailable 📉' },
  { intensity: 'iron_discipline', context: 'missed_day', message: 'Kaam kar, warna same life ka next episode aayega 📺' },
  { intensity: 'iron_discipline', context: 'missed_day', message: 'Teri comfort zone ne tujhe hostage bana rakha hai ⛓️' },

  // ─── STREAK BROKEN ──────────────────────────────────────────────────────
  { intensity: 'friendly', context: 'streak_broken', message: 'Streak gayi. Aaj skip kiya toh kal guilt free milega 🤷‍♂️' },
  { intensity: 'coach', context: 'streak_broken', message: 'Discipline install kar, motivation update ka wait mat kar ⚙️' },
  { intensity: 'military', context: 'streak_broken', message: 'Padhai pending hai aur confidence unlimited 🤡' },
  { intensity: 'savage', context: 'streak_broken', message: 'Bro, excuses pe PhD ho gayi teri 🎓' },
  { intensity: 'iron_discipline', context: 'streak_broken', message: 'Kaam kar le warna regret permanent ho jayega 🪦' },

  // ─── RECOVERY PENDING ───────────────────────────────────────────────────
  { intensity: 'friendly', context: 'recovery_pending', message: 'Recovery task kar le, warna result ke time network issue blame karega 📶' },
  { intensity: 'coach', context: 'recovery_pending', message: 'Book khol warna result khol dega 📖' },
  { intensity: 'military', context: 'recovery_pending', message: 'Dumbbell tera wait kar raha hai 💪' },
  { intensity: 'savage', context: 'recovery_pending', message: 'Goal bada hai toh effort bhi dikha ⛰️' },
  { intensity: 'iron_discipline', context: 'recovery_pending', message: 'Syllabus complete kar ya excuses aur bana 🗑️' },

  // ─── GOOD STREAK ────────────────────────────────────────────────────────
  { intensity: 'friendly', context: 'good_streak', message: 'Sweat aaj, confidence kal 💧' },
  { intensity: 'coach', context: 'good_streak', message: 'Topper bhi insaan hai, alien nahi 👽' },
  { intensity: 'military', context: 'good_streak', message: 'Goal ko attention de, warna woh bhi move on kar jayega 🚶‍♂️' },
  { intensity: 'savage', context: 'good_streak', message: 'Tera competition tujhe thank you bol raha hai 👏' },
  { intensity: 'iron_discipline', context: 'good_streak', message: 'Bas ek task complete kar. Hero mat ban, consistent ban 🦸‍♂️' },

  // ─── TASK COMPLETE ──────────────────────────────────────────────────────
  { intensity: 'friendly', context: 'task_complete', message: 'Ek aur done! Productivity videos dekhna productivity nahi hoti, yeh hoti hai 🎯' },
  { intensity: 'coach', context: 'task_complete', message: 'Done. Marks ko attraction nahi, effort chahiye 💯' },
  { intensity: 'military', context: 'task_complete', message: 'Good. Body ko challenge de, excuses ko nahi 🥊' },
  { intensity: 'savage', context: 'task_complete', message: 'Ho gaya? Chal kaam pe lag, warna sapne buffering me rahenge 🔄' },
  { intensity: 'iron_discipline', context: 'task_complete', message: 'Ek task done. Har din restart karta hai, kab continue karega? ⏭️' },

  // ─── PERFECT DAY ────────────────────────────────────────────────────────
  { intensity: 'friendly', context: 'perfect_day', message: '100% complete! Aaj toh exam date fix hai, tera mood bhi 📅' },
  { intensity: 'coach', context: 'perfect_day', message: 'Sab khatam. Padh le bhai, last-night strategy ki zaroorat nahi ab 🛡️' },
  { intensity: 'military', context: 'perfect_day', message: 'Mission success. Body upgrade kar, excuses downgrade 🧬' },
  { intensity: 'savage', context: 'perfect_day', message: 'Perfect! Gym ja saale, body Photoshop se nahi banti 📸' },
  { intensity: 'iron_discipline', context: 'perfect_day', message: 'Dreams premium hain, effort free hai. Aaj tune prove kar diya 💎' },
];

/**
 * Get a random roast message filtered by intensity and context.
 */
export const getRoastMessage = (
  intensity: RoastIntensity,
  context: RoastContext
): string => {
  const filtered = ROAST_BANK.filter(
    (r) => r.intensity === intensity && r.context === context
  );

  if (filtered.length === 0) {
    // Fallback to any message with matching intensity
    const byIntensity = ROAST_BANK.filter((r) => r.intensity === intensity);
    if (byIntensity.length === 0) return 'Chal kaam pe lag saale! 😡';
    return byIntensity[Math.floor(Math.random() * byIntensity.length)].message;
  }

  return filtered[Math.floor(Math.random() * filtered.length)].message;
};
