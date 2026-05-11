// Auto-classifies incident severity from the user's English description and
// the selected incident type, so reporters don't have to make that judgement
// call themselves. Keyword-based and deterministic — no model dependency, no
// network call, runs on every keystroke.

const HIGH_KEYWORDS = /\b(weapon|gun|knife|knives|blood|bleeding|unconscious|stab|stabbed|stabbing|shot|shoot|shooting|kidnap|kidnapped|abducted|fire|burning|explosion|bomb|dying|dead|killed|kill|murder|hostage|rape|raped|sexual\s*assault|emergency|hurt|injured|injury|wound|wounded|ambulance|screaming|attacked|attacking|chasing|chased|armed|gunshot|collapse|seizure|heart\s*attack|drowning|electrocut|choking|overdose|suicidal|life-?threatening|critical|severe)\b/i;

const MEDIUM_KEYWORDS = /\b(suspicious|harassment|harassed|stalk|stalking|following|followed|stolen|steal|stealing|theft|stole|robbed|robbery|mugged|vandalism|vandalised|vandalized|drunk|intoxicated|fight|fighting|brawl|punched|argument|altercation|threat|threatening|trespass|trespassing|broke\s+in|break\s+in|broken\s+into|burglary|uncomfortable|grabbed|touched|intimidat|aggressive|hostile|peeping|prowler|forced|chased\s+away)\b/i;

const LOW_KEYWORDS = /\b(graffiti|loitering|loitered|minor|concerned|warning|smell|noise|loud|wandering|sleeping|unlit|dark\s+area|broken\s+light)\b/i;

// Each incident type sets a baseline score. Description keywords add on top.
const TYPE_BASE_SCORE = {
  assault: 3,
  fire: 3,
  medical: 3,
  harassment: 2,
  unauthorized_access: 2,
  theft: 2,
  vandalism: 1,
  suspicious_activity: 1,
  other: 1,
};

/**
 * Returns 'low' | 'medium' | 'high'. Combines a type-derived floor with
 * keyword hits in the description. Keyword hits in the high band can lift a
 * "vandalism" report to high if the description mentions a weapon or injury.
 */
export const classifySeverity = (description, type) => {
  const text = (description || '').toLowerCase();
  let score = TYPE_BASE_SCORE[type] ?? 1;

  if (HIGH_KEYWORDS.test(text)) score += 3;
  if (MEDIUM_KEYWORDS.test(text)) score += 1;
  if (LOW_KEYWORDS.test(text) && !HIGH_KEYWORDS.test(text)) score -= 1;

  if (score >= 5) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
};

// Common short English function words — at least one must appear, otherwise
// the text is probably a random string of letters or a non-English language
// that happens to use the Latin alphabet (e.g. Shona, French).
const ENGLISH_MARKERS = /\b(the|a|an|is|was|were|are|am|i|you|he|she|it|we|they|and|or|but|not|of|to|in|on|at|for|with|by|from|this|that|these|those|my|his|her|our|their|me|him|us|them|saw|heard|noticed|happened|when|where|what|who|how|why|near|around|behind|inside|outside|going|walking|running|coming|today|yesterday|night|morning|evening|been|have|has|had|do|does|did)\b/i;

/**
 * Cheap English-language check for the description field. Rejects text that
 * is too short, uses too many non-Latin characters, or has no common English
 * function words.
 */
export const isLikelyEnglish = (text) => {
  const trimmed = (text || '').trim();
  if (trimmed.length < 10) return false;

  const latin = (trimmed.match(/[a-zA-Z]/g) || []).length;
  const nonAscii = (trimmed.match(/[^\x00-\x7F]/g) || []).length;
  const letters = latin + nonAscii;
  if (letters === 0) return false;
  if (nonAscii / letters > 0.2) return false;

  return ENGLISH_MARKERS.test(trimmed);
};
