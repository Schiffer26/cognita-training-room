import type { FeedbackRecordRow } from "@/lib/feedback-query";

export interface CommentExample {
  text: string;
  sourceField: string;
  computerId: string | null;
}

export interface CommentThemeMatch {
  id: string;
  theme: string;
  findingSubject: string;
  distinctResponses: number;
  percentageOfCommented: number;
  percentageOfTotal: number;
  recurringPhrases: string[];
  examples: CommentExample[];
}

export interface RecurringPhraseItem {
  phrase: string;
  distinctResponses: number;
  percentageOfCommented: number;
}

export interface CommentBucketAnalysis {
  bucketKey: "positive" | "suggestions" | "technicalIssues";
  title: string;
  description: string;
  sourceFields: string[];
  distinctResponseCount: number;
  placeholderIgnoredCount: number;
  themes: CommentThemeMatch[];
  recurringPhrases: RecurringPhraseItem[];
}

export interface CommentFinding {
  category: "positive" | "suggestions" | "technicalIssues" | "overview";
  statement: string;
  supportingCount: number;
  denominator: number;
}

export interface CommentAnalysisResult {
  totalRecordsAnalyzed: number;
  recordsWithAnySubstantiveComment: number;
  positive: CommentBucketAnalysis;
  suggestions: CommentBucketAnalysis;
  technicalIssues: CommentBucketAnalysis;
  findings: CommentFinding[];
  methodology: string;
  limitations: string[];
}

interface ThemeDefinition {
  id: string;
  theme: string;
  findingSubject: string;
  phrases: string[];
  keywords: string[];
}

const PLACEHOLDER_REPLIES = new Set([
  "none", "n/a", "na", "nil", "nothing", "null", "no", "nope",
  "wala", "wala naman", "wala po", "none po", "nothing po",
  "nothing at all", "none at all", "no comment", "no comments",
  "no issue", "no issues", "no problem", "no problems",
  "no technical issue", "no technical issues",
  "no technical problem", "no technical problems",
  "not applicable", "ok", "okay", "all good",
  "everything is fine", "everything is good",
]);

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "been", "being", "but", "by",
  "can", "could", "did", "do", "does", "doing", "done", "during", "each",
  "even", "every", "for", "from", "get", "got", "had", "has", "have", "having",
  "he", "her", "here", "him", "his", "how", "i", "if", "in", "into", "is",
  "it", "its", "just", "like", "make", "may", "me", "might", "more", "most",
  "much", "must", "my", "need", "needs", "of", "on", "one", "only", "or",
  "other", "our", "out", "over", "please", "po", "really", "room", "rooms",
  "sana", "see", "should", "so", "some", "such", "than", "that", "the",
  "their", "them", "then", "there", "these", "they", "thing", "things",
  "think", "this", "those", "through", "to", "too", "training", "up", "us",
  "use", "used", "using", "very", "want", "wanted", "was", "we", "were",
  "what", "when", "where", "which", "while", "who", "will", "with", "would",
  "you", "your", "add", "added", "improve", "improved", "improvement",
]);

const BOILERPLATE_PHRASES = new Set([
  "training room", "computer room", "dict iligan", "make sure",
  "would be", "could be", "overall experience", "easy use", "well maintained",
]);

const THEME_TAXONOMY: ThemeDefinition[] = [
  {
    id: "computer_performance",
    theme: "Computer Performance & Speed",
    findingSubject: "Computer performance",
    phrases: [
      "computer performance", "fast computers", "fast computer", "fast pc", "fast pcs",
      "slow computer", "slow computers", "slow pc", "slow pcs", "boot time", "system lag",
      "high specs", "good specs", "upgrade ram", "more ram", "pc performance",
      "processing speed", "system freeze", "keeps freezing",
    ],
    keywords: [
      "performance", "speed", "fast", "faster", "slow", "lag", "lagging", "laggy",
      "freeze", "freezing", "froze", "hang", "hanging", "crash", "crashed", "crashing",
      "ram", "cpu", "processor", "specs", "responsive", "unresponsive", "boot", "reboot", "restart",
    ],
  },
  {
    id: "air_conditioning_temp",
    theme: "Air Conditioning & Temperature",
    findingSubject: "Air conditioning and room temperature",
    phrases: [
      "air conditioning", "air conditioner", "room temperature", "too cold", "too hot",
      "too warm", "very cold", "cool room", "cold room", "good ventilation",
      "better ventilation", "proper ventilation", "cooling system",
    ],
    keywords: [
      "aircon", "ac", "hvac", "ventilation", "temperature", "cold", "chilly",
      "freezing", "hot", "warm", "humid", "cooling", "cool", "thermostat",
    ],
  },
  {
    id: "monitors_display",
    theme: "Monitors & Display Quality",
    findingSubject: "Monitors and display quality",
    phrases: [
      "dual monitor", "dual monitors", "second monitor", "bigger monitor", "bigger monitors",
      "large monitor", "large monitors", "clear monitor", "clear monitors", "clear screen",
      "screen resolution", "monitor quality", "screen flicker", "flickering screen",
      "display cable", "hdmi cable",
    ],
    keywords: [
      "monitor", "monitors", "screen", "screens", "display", "displays",
      "resolution", "flicker", "flickering", "blurry", "pixel", "hdmi", "vga",
    ],
  },
  {
    id: "chairs_seating",
    theme: "Chairs & Seating Ergonomics",
    findingSubject: "Chairs and seating comfort",
    phrases: [
      "ergonomic chair", "ergonomic chairs", "comfortable chair", "comfortable chairs",
      "office chair", "office chairs", "better chairs", "back support",
      "lumbar support", "chair comfort", "seating comfort",
    ],
    keywords: [
      "chair", "chairs", "seat", "seats", "seating", "ergonomic", "ergonomics",
      "backrest", "cushion", "lumbar", "posture", "armrest",
    ],
  },
  {
    id: "network_internet",
    theme: "Internet & Network Connectivity",
    findingSubject: "Internet and network connectivity",
    phrases: [
      "fast internet", "slow internet", "internet connection", "internet speed",
      "wifi connection", "network connection", "no internet", "stable internet",
      "lan cable", "lost connection",
    ],
    keywords: [
      "internet", "wifi", "network", "ethernet", "lan", "bandwidth", "connection",
      "connectivity", "disconnect", "disconnected", "disconnecting", "offline", "router",
    ],
  },
  {
    id: "peripherals_input",
    theme: "Keyboards, Mice & Peripherals",
    findingSubject: "Keyboards, mice, and peripherals",
    phrases: [
      "mouse pad", "mouse pads", "wireless mouse", "new mouse", "new keyboard",
      "usb port", "usb ports", "broken mouse", "sticky keys", "double click",
    ],
    keywords: [
      "mouse", "mice", "mousepad", "keyboard", "keyboards", "headset", "headsets",
      "headphones", "earphones", "webcam", "usb", "peripheral", "peripherals",
    ],
  },
  {
    id: "cleanliness_maintenance",
    theme: "Cleanliness & Room Upkeep",
    findingSubject: "Cleanliness and room upkeep",
    phrases: [
      "clean environment", "very clean", "neat tidy", "clean desks",
      "clean equipment", "trash bin", "hand sanitizer",
    ],
    keywords: [
      "clean", "cleanliness", "tidy", "neat", "spotless", "organized",
      "sanitized", "sanitation", "hygiene", "dust", "dusty", "dirty",
    ],
  },
  {
    id: "workspace_layout",
    theme: "Workspace Space, Outlets & Amenities",
    findingSubject: "Workspace space, outlets, and room amenities",
    phrases: [
      "spacious desk", "desk space", "more space", "leg room", "power outlet",
      "power outlets", "extension cord", "charging port", "water dispenser",
      "drinking water", "room layout", "seating arrangement",
    ],
    keywords: [
      "desk", "desks", "table", "tables", "spacious", "cramped", "crowded", "legroom",
      "layout", "arrangement", "outlet", "outlets", "socket", "sockets", "charger",
      "charging", "dispenser", "locker", "lockers", "whiteboard",
    ],
  },
  {
    id: "lighting_visual",
    theme: "Lighting & Visual Comfort",
    findingSubject: "Room lighting",
    phrases: [
      "good lighting", "bright lighting", "warm lighting",
      "dim lighting", "screen glare", "natural light",
    ],
    keywords: [
      "lighting", "light", "lights", "bright", "brightness",
      "dim", "glare", "bulb", "bulbs", "fluorescent",
    ],
  },
  {
    id: "noise_concentration",
    theme: "Noise Level & Focus Environment",
    findingSubject: "Noise level and concentration environment",
    phrases: [
      "quiet environment", "quiet place", "very quiet", "peaceful environment",
      "outside noise", "easy concentrate", "conducive learning",
    ],
    keywords: [
      "quiet", "noise", "noisy", "loud", "peaceful", "calm", "focus",
      "concentrate", "concentration", "soundproof", "soundproofing", "conducive", "distraction",
    ],
  },
  {
    id: "audio_visual_teaching",
    theme: "Projector, Audio & Presentation Equipment",
    findingSubject: "Projector, audio, and presentation equipment",
    phrases: [
      "sound system", "bigger projector", "clear audio",
      "wireless microphone", "smart tv", "front screen",
    ],
    keywords: [
      "projector", "speaker", "speakers", "audio", "microphone",
      "mic", "presentation", "tv", "television",
    ],
  },
  {
    id: "software_accounts",
    theme: "Software, Applications & System Access",
    findingSubject: "Software setup and system access",
    phrases: [
      "updated software", "installed software", "microsoft office",
      "admin permission", "login issue", "browser update",
    ],
    keywords: [
      "software", "application", "applications", "app", "apps", "browser", "chrome",
      "windows", "update", "updates", "license", "account", "password", "permission", "install",
    ],
  },
];

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}

export function normalizeCommentForAnalysis(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/air\s*-\s*condition(ing|er|ed)?/g, "air condition$1")
    .replace(/wi\s*-\s*fi/g, "wifi")
    .replace(/e\.g\./g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function isPlaceholderComment(raw: string | null | undefined): boolean {
  if (!raw) return true;
  const trimmed = raw.trim();
  if (!trimmed) return true;
  const normalized = normalizeCommentForAnalysis(trimmed);
  if (!normalized || normalized.length < 2) return true;
  return PLACEHOLDER_REPLIES.has(normalized);
}

function hasExplicitNoIssueNegation(normalized: string): boolean {
  if (/\b(but|however|except|although|though)\b/.test(normalized)) {
    return false;
  }
  return /^(no|none|zero|without)\s+(any\s+)?(technical\s+)?(issue|issues|problem|problems|trouble|difficulty|difficulties|fault|faults|error|errors)\b/.test(
    normalized
  );
}

function truncateExample(raw: string, maxLen = 160): string {
  const clean = raw.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLen) return clean;
  return `${clean.slice(0, maxLen - 1).trimEnd()}…`;
}

function extractRecordPhrases(texts: string[]): Set<string> {
  const found = new Set<string>();

  for (const raw of texts) {
    const clauses = raw
      .toLowerCase()
      .replace(/air\s*-\s*condition(ing|er|ed)?/g, "air condition$1")
      .replace(/wi\s*-\s*fi/g, "wifi")
      .split(/[.!?;,\n]+/);

    for (const clause of clauses) {
      const tokens = clause
        .replace(/[^a-z0-9\s]/g, " ")
        .split(/\s+/)
        .filter((t) => t.length >= 2 && !/^\d+$/.test(t));

      for (let n = 2; n <= 3; n++) {
        for (let i = 0; i + n <= tokens.length; i++) {
          const slice = tokens.slice(i, i + n);
          if (STOPWORDS.has(slice[0]) || STOPWORDS.has(slice[slice.length - 1])) {
            continue;
          }
          const substantiveWords = slice.filter((w) => !STOPWORDS.has(w));
          if (substantiveWords.length < 2) continue;

          const phrase = slice.join(" ");
          if (BOILERPLATE_PHRASES.has(phrase)) continue;
          found.add(phrase);
        }
      }
    }
  }

  return found;
}

interface RecordCommentEntry {
  recordId: string;
  computerId: string | null;
  segments: { text: string; normalized: string; sourceField: string }[];
}

function analyzeBucket(
  bucketKey: "positive" | "suggestions" | "technicalIssues",
  title: string,
  description: string,
  sourceFields: string[],
  entries: RecordCommentEntry[],
  placeholderIgnoredCount: number,
  totalRecords: number
): CommentBucketAnalysis {
  const distinctResponseCount = entries.length;

  const phraseDocFreq = new Map<string, number>();
  const entryPhrasesMap = new Map<string, Set<string>>();

  for (const entry of entries) {
    const phrases = extractRecordPhrases(entry.segments.map((s) => s.text));
    entryPhrasesMap.set(entry.recordId, phrases);
    for (const phrase of phrases) {
      phraseDocFreq.set(phrase, (phraseDocFreq.get(phrase) || 0) + 1);
    }
  }

  const minPhraseCount = distinctResponseCount >= 3 ? 2 : 1;
  const candidatePhrases = Array.from(phraseDocFreq.entries())
    .filter(([, count]) => count >= minPhraseCount)
    .sort((a, b) => b[1] - a[1] || b[0].split(" ").length - a[0].split(" ").length || a[0].localeCompare(b[0]));

  const filteredPhrases: RecurringPhraseItem[] = [];
  for (const [phrase, count] of candidatePhrases) {
    const shadowedByLonger = filteredPhrases.some(
      (existing) => existing.phrase.includes(phrase) && existing.distinctResponses >= count
    );
    if (!shadowedByLonger) {
      filteredPhrases.push({
        phrase,
        distinctResponses: count,
        percentageOfCommented: distinctResponseCount > 0 ? round1((count / distinctResponseCount) * 100) : 0,
      });
    }
    if (filteredPhrases.length >= 10) break;
  }

  const themes: CommentThemeMatch[] = [];

  for (const def of THEME_TAXONOMY) {
    let matchedCount = 0;
    const matchedPhraseCounts = new Map<string, number>();
    const examples: CommentExample[] = [];
    const keywordSet = new Set(def.keywords);

    for (const entry of entries) {
      let matchingSegment: { text: string; normalized: string; sourceField: string } | null = null;
      const entryThemePhrases = new Set<string>();

      for (const seg of entry.segments) {
        const padded = ` ${seg.normalized} `;
        const tokens = seg.normalized.split(" ");

        for (const p of def.phrases) {
          if (padded.includes(` ${p} `)) {
            matchingSegment = matchingSegment || seg;
            entryThemePhrases.add(p);
          }
        }

        if (tokens.some((tok) => keywordSet.has(tok))) {
          matchingSegment = matchingSegment || seg;
        }
      }

      if (matchingSegment) {
        matchedCount += 1;

        const extracted = entryPhrasesMap.get(entry.recordId);
        if (extracted) {
          for (const ng of extracted) {
            if (ng.split(" ").some((tok) => keywordSet.has(tok))) {
              entryThemePhrases.add(ng);
            }
          }
        }

        for (const p of entryThemePhrases) {
          matchedPhraseCounts.set(p, (matchedPhraseCounts.get(p) || 0) + 1);
        }

        if (examples.length < 3) {
          examples.push({
            text: truncateExample(matchingSegment.text),
            sourceField: matchingSegment.sourceField,
            computerId: entry.computerId,
          });
        }
      }
    }

    if (matchedCount > 0) {
      const topThemePhrases = Array.from(matchedPhraseCounts.entries())
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .slice(0, 4)
        .map(([p]) => p);

      themes.push({
        id: def.id,
        theme: def.theme,
        findingSubject: def.findingSubject,
        distinctResponses: matchedCount,
        percentageOfCommented: distinctResponseCount > 0 ? round1((matchedCount / distinctResponseCount) * 100) : 0,
        percentageOfTotal: totalRecords > 0 ? round1((matchedCount / totalRecords) * 100) : 0,
        recurringPhrases: topThemePhrases,
        examples,
      });
    }
  }

  themes.sort((a, b) => b.distinctResponses - a.distinctResponses || a.theme.localeCompare(b.theme));

  return {
    bucketKey,
    title,
    description,
    sourceFields,
    distinctResponseCount,
    placeholderIgnoredCount,
    themes,
    recurringPhrases: filteredPhrases,
  };
}

export function analyzeFeedbackComments(records: FeedbackRecordRow[]): CommentAnalysisResult {
  const positiveEntries: RecordCommentEntry[] = [];
  const suggestionEntries: RecordCommentEntry[] = [];
  const technicalEntries: RecordCommentEntry[] = [];

  let positivePlaceholders = 0;
  let suggestionPlaceholders = 0;
  let technicalPlaceholders = 0;
  let substantiveRecordCount = 0;

  for (const r of records) {
    let recordHasSubstantive = false;

    if (r.likedMost && r.likedMost.trim()) {
      if (isPlaceholderComment(r.likedMost)) {
        positivePlaceholders += 1;
      } else {
        positiveEntries.push({
          recordId: r.id,
          computerId: r.computerId ?? null,
          segments: [{
            text: r.likedMost.trim(),
            normalized: normalizeCommentForAnalysis(r.likedMost),
            sourceField: "Liked Most",
          }],
        });
        recordHasSubstantive = true;
      }
    }

    const rawSuggestionFields: [string | null | undefined, string][] = [
      [r.featuresWanted, "Features Wanted"],
      [r.changeImprovement, "Change / Improvement"],
      [r.mostImportantImprovement, "Most Important Improvement"],
    ];

    const validSuggestionSegments: { text: string; normalized: string; sourceField: string }[] = [];
    let hadOnlySuggestionPlaceholder = false;

    for (const [val, label] of rawSuggestionFields) {
      if (val && val.trim()) {
        if (isPlaceholderComment(val)) {
          hadOnlySuggestionPlaceholder = true;
        } else {
          validSuggestionSegments.push({
            text: val.trim(),
            normalized: normalizeCommentForAnalysis(val),
            sourceField: label,
          });
        }
      }
    }

    if (validSuggestionSegments.length > 0) {
      suggestionEntries.push({
        recordId: r.id,
        computerId: r.computerId ?? null,
        segments: validSuggestionSegments,
      });
      recordHasSubstantive = true;
    } else if (hadOnlySuggestionPlaceholder) {
      suggestionPlaceholders += 1;
    }

    if (r.technicalIssueDescription && r.technicalIssueDescription.trim()) {
      const normalizedTech = normalizeCommentForAnalysis(r.technicalIssueDescription);
      if (
        r.hasTechnicalIssues === false ||
        isPlaceholderComment(r.technicalIssueDescription) ||
        hasExplicitNoIssueNegation(normalizedTech)
      ) {
        technicalPlaceholders += 1;
      } else {
        technicalEntries.push({
          recordId: r.id,
          computerId: r.computerId ?? null,
          segments: [{
            text: r.technicalIssueDescription.trim(),
            normalized: normalizedTech,
            sourceField: "Technical Issue Description",
          }],
        });
        recordHasSubstantive = true;
      }
    }

    if (recordHasSubstantive) {
      substantiveRecordCount += 1;
    }
  }

  const positive = analyzeBucket(
    "positive",
    "Positive Feedback & What Users Appreciate",
    "Themes and phrases extracted from responses describing what participants appreciated about the training room.",
    ["liked_most"],
    positiveEntries,
    positivePlaceholders,
    records.length
  );

  const suggestions = analyzeBucket(
    "suggestions",
    "Improvement Suggestions & Requested Features",
    "Themes and phrases across requested equipment/features and suggested room improvements (counted once per distinct respondent).",
    ["features_wanted", "change_improvement", "most_important_improvement"],
    suggestionEntries,
    suggestionPlaceholders,
    records.length
  );

  const technicalIssues = analyzeBucket(
    "technicalIssues",
    "Reported Technical Problems",
    "Themes and phrases extracted from user-submitted technical difficulty descriptions.",
    ["technical_issue_description"],
    technicalEntries,
    technicalPlaceholders,
    records.length
  );

  const findings: CommentFinding[] = [];

  if (records.length === 0) {
    findings.push({
      category: "overview",
      statement: "No feedback records match the current filter selection.",
      supportingCount: 0,
      denominator: 0,
    });
  } else if (substantiveRecordCount === 0) {
    findings.push({
      category: "overview",
      statement: `None of the ${records.length} matching response(s) included substantive written comments beyond optional blank or placeholder entries.`,
      supportingCount: 0,
      denominator: records.length,
    });
  } else {
    const recurringPos = positive.themes.filter((t) => t.distinctResponses >= 2);
    if (recurringPos.length > 0) {
      for (const t of recurringPos.slice(0, 2)) {
        findings.push({
          category: "positive",
          statement: `${t.findingSubject} was frequently highlighted in positive comments (${t.distinctResponses} of ${positive.distinctResponseCount} responses with positive comments).`,
          supportingCount: t.distinctResponses,
          denominator: positive.distinctResponseCount,
        });
      }
    } else if (positive.themes.length === 1 && positive.distinctResponseCount > 0) {
      const t = positive.themes[0];
      findings.push({
        category: "positive",
        statement: `${t.findingSubject} was mentioned in positive comments (${t.distinctResponses} of ${positive.distinctResponseCount} positive response(s); single mention so far).`,
        supportingCount: t.distinctResponses,
        denominator: positive.distinctResponseCount,
      });
    }

    const recurringSug = suggestions.themes.filter((t) => t.distinctResponses >= 2);
    if (recurringSug.length > 0) {
      for (const t of recurringSug.slice(0, 2)) {
        findings.push({
          category: "suggestions",
          statement: `${t.findingSubject} was frequently mentioned in improvement suggestions (${t.distinctResponses} of ${suggestions.distinctResponseCount} responses with suggestions).`,
          supportingCount: t.distinctResponses,
          denominator: suggestions.distinctResponseCount,
        });
      }
    } else if (suggestions.recurringPhrases.length > 0 && suggestions.recurringPhrases[0].distinctResponses >= 2) {
      const p = suggestions.recurringPhrases[0];
      findings.push({
        category: "suggestions",
        statement: `The phrase "${p.phrase}" recurred across ${p.distinctResponses} of ${suggestions.distinctResponseCount} responses with improvement suggestions.`,
        supportingCount: p.distinctResponses,
        denominator: suggestions.distinctResponseCount,
      });
    } else if (suggestions.themes.length >= 1 && suggestions.distinctResponseCount > 0) {
      const t = suggestions.themes[0];
      findings.push({
        category: "suggestions",
        statement: `${t.findingSubject} appeared in improvement suggestions (${t.distinctResponses} of ${suggestions.distinctResponseCount} response(s) with suggestions).`,
        supportingCount: t.distinctResponses,
        denominator: suggestions.distinctResponseCount,
      });
    }

    const recurringTech = technicalIssues.themes.filter((t) => t.distinctResponses >= 2);
    if (recurringTech.length > 0) {
      for (const t of recurringTech.slice(0, 2)) {
        findings.push({
          category: "technicalIssues",
          statement: `${t.findingSubject} was a recurring concern in reported technical descriptions (${t.distinctResponses} of ${technicalIssues.distinctResponseCount} technical report(s)).`,
          supportingCount: t.distinctResponses,
          denominator: technicalIssues.distinctResponseCount,
        });
      }
    } else if (technicalIssues.distinctResponseCount === 0) {
      findings.push({
        category: "technicalIssues",
        statement: "No written technical problem descriptions were recorded in this dataset.",
        supportingCount: 0,
        denominator: records.length,
      });
    } else if (technicalIssues.themes.length >= 1) {
      const t = technicalIssues.themes[0];
      findings.push({
        category: "technicalIssues",
        statement: `${t.findingSubject} was referenced in ${t.distinctResponses} of ${technicalIssues.distinctResponseCount} written technical description(s) (no multi-response pattern yet).`,
        supportingCount: t.distinctResponses,
        denominator: technicalIssues.distinctResponseCount,
      });
    }
  }

  return {
    totalRecordsAnalyzed: records.length,
    recordsWithAnySubstantiveComment: substantiveRecordCount,
    positive,
    suggestions,
    technicalIssues,
    findings,
    methodology:
      "Comments are processed deterministically on the server without external AI services or third-party data transfer. Text from each survey field (liked_most, features_wanted, change_improvement, most_important_improvement, and technical_issue_description) is normalized, placeholder replies such as 'None' or 'N/A' are excluded, and both 2–3 word n-gram phrases and training-room topic patterns are counted once per distinct respondent within each feedback category.",
    limitations: [
      "Keyword and multi-word phrase frequency alone is not a reliable measure of sentiment — negated statements (for example, 'no problem with the monitor') or mixed comments can mention a topic without expressing dissatisfaction.",
      "Improvement suggestions and requested features are not inherently negative; satisfied respondents frequently propose enhancements or additional equipment.",
      "User-reported technical descriptions reflect participant perception during a session and do not independently verify an underlying hardware, software, or network fault without administrator inspection.",
    ],
  };
}
