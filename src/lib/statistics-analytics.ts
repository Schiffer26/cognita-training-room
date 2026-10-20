import {
  formatManilaDateKey,
  type FeedbackRecordRow,
} from "@/lib/feedback-query";
import {
  analyzeFeedbackComments,
  type CommentAnalysisResult,
} from "@/lib/comment-analysis";

export interface SentimentBreakdown {
  sampleSize: number;
  missingCount: number;
  positiveCount: number;
  positivePct: number;
  neutralCount: number;
  neutralPct: number;
  negativeCount: number;
  negativePct: number;
}

export interface NpsScoreBucket {
  score: number;
  count: number;
  pct: number;
  group: "detractor" | "passive" | "promoter";
}

export interface NpsBreakdown {
  available: boolean;
  scale: "0-10";
  sampleSize: number;
  missingCount: number;
  averageScore: number | null;
  promotersCount: number;
  promotersPct: number;
  passivesCount: number;
  passivesPct: number;
  detractorsCount: number;
  detractorsPct: number;
  score: number | null;
  scoreDistribution: NpsScoreBucket[];
}

export interface SpotlightComparisonItem {
  key: string;
  label: string;
  fieldLabel: string;
  average: number | null;
  sampleSize: number;
  positiveCount: number;
  positivePct: number;
  neutralCount: number;
  lowCount: number;
  lowPct: number;
}

export interface CategoryRankingItem {
  rank: number | null;
  key: string;
  label: string;
  group: string;
  average: number | null;
  sampleSize: number;
  positiveCount: number;
  positivePct: number;
  neutralCount: number;
  lowCount: number;
  lowPct: number;
  isBottomThree: boolean;
}

export interface ComputerSummaryItem {
  computerId: string;
  submissions: number;
  avgOverall: number | null;
  avgComputerPerformance: number | null;
  avgMonitorQuality: number | null;
  techIssueCount: number;
}

export interface AutomatedInsight {
  tone: "positive" | "attention" | "neutral" | "info";
  title: string;
  detail: string;
}

export interface ComputedStatisticsData {
  // Preserved backward-compatible fields
  total_submissions: number;
  avg_overall: number | null;
  avg_cleanliness: number | null;
  avg_recommendation: number | null;
  avg_computer_performance: number | null;
  avg_monitor_quality: number | null;
  avg_equipment_ease: number | null;
  avg_equipment_availability: number | null;
  avg_chair_comfort: number | null;
  avg_room_temperature: number | null;
  avg_air_conditioning: number | null;
  avg_lighting: number | null;
  avg_workspace: number | null;
  avg_noise: number | null;
  avg_equipment_cleanliness: number | null;
  avg_arrangement: number | null;
  avg_concentration: number | null;
  tech_issue_count: number;
  no_issue_count: number;
  tech_sample_size: number;
  tech_issue_pct_of_answered: number;
  distribution: { stars: number; count: number; pct: number }[];
  trends: { period: string; count: number }[];
  computers: string[];

  // Upgraded analytics sections
  overallSentiment: SentimentBreakdown;
  nps: NpsBreakdown;
  keyEquipmentComparison: SpotlightComparisonItem[];
  categoryRankings: CategoryRankingItem[];
  computerSummary: ComputerSummaryItem[];
  insights: AutomatedInsight[];
  commentAnalysis: CommentAnalysisResult;
}

interface StarFieldMeta {
  key: string;
  label: string;
  group: string;
  getter: (r: FeedbackRecordRow) => number | null;
}

const CATEGORY_FIELDS: StarFieldMeta[] = [
  {
    key: "computerPerformance",
    label: "Computer Performance",
    group: "Computers & Equipment",
    getter: (r) => r.computerPerformance,
  },
  {
    key: "monitorQuality",
    label: "Monitor Quality",
    group: "Computers & Equipment",
    getter: (r) => r.monitorQuality,
  },
  {
    key: "equipmentEaseOfUse",
    label: "Equipment Ease of Use",
    group: "Computers & Equipment",
    getter: (r) => r.equipmentEaseOfUse,
  },
  {
    key: "equipmentAvailability",
    label: "Equipment Availability",
    group: "Computers & Equipment",
    getter: (r) => r.equipmentAvailability,
  },
  {
    key: "cleanlinessSatisfaction",
    label: "Cleanliness Satisfaction",
    group: "Overall Cleanliness",
    getter: (r) => r.cleanlinessSatisfaction,
  },
  {
    key: "chairComfort",
    label: "Chair Comfort",
    group: "Comfort & Room Conditions",
    getter: (r) => r.chairComfort,
  },
  {
    key: "roomTemperature",
    label: "Room Temperature",
    group: "Comfort & Room Conditions",
    getter: (r) => r.roomTemperature,
  },
  {
    key: "airConditioning",
    label: "Air Conditioning",
    group: "Comfort & Room Conditions",
    getter: (r) => r.airConditioning,
  },
  {
    key: "lighting",
    label: "Lighting",
    group: "Comfort & Room Conditions",
    getter: (r) => r.lighting,
  },
  {
    key: "workspaceSpace",
    label: "Workspace Space",
    group: "Comfort & Room Conditions",
    getter: (r) => r.workspaceSpace,
  },
  {
    key: "noiseLevel",
    label: "Noise Level",
    group: "Training Room Environment",
    getter: (r) => r.noiseLevel,
  },
  {
    key: "equipmentCleanliness",
    label: "Equipment Cleanliness",
    group: "Training Room Environment",
    getter: (r) => r.equipmentCleanliness,
  },
  {
    key: "arrangementSuitability",
    label: "Arrangement Suitability",
    group: "Training Room Environment",
    getter: (r) => r.arrangementSuitability,
  },
  {
    key: "concentrationComfort",
    label: "Concentration Comfort",
    group: "Training Room Environment",
    getter: (r) => r.concentrationComfort,
  },
];

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function computeStarStats(
  records: FeedbackRecordRow[],
  getter: (r: FeedbackRecordRow) => number | null
) {
  let sum = 0;
  let sampleSize = 0;
  let positiveCount = 0;
  let neutralCount = 0;
  let lowCount = 0;

  for (const r of records) {
    const val = getter(r);
    if (typeof val === "number" && !Number.isNaN(val) && val >= 1 && val <= 5) {
      sum += val;
      sampleSize += 1;
      if (val >= 4) positiveCount += 1;
      else if (val === 3) neutralCount += 1;
      else lowCount += 1;
    }
  }

  return {
    average: sampleSize > 0 ? round2(sum / sampleSize) : null,
    sampleSize,
    positiveCount,
    positivePct: sampleSize > 0 ? round1((positiveCount / sampleSize) * 100) : 0,
    neutralCount,
    neutralPct: sampleSize > 0 ? round1((neutralCount / sampleSize) * 100) : 0,
    lowCount,
    lowPct: sampleSize > 0 ? round1((lowCount / sampleSize) * 100) : 0,
  };
}

export function classifyStarSentiment(
  rating: number | null | undefined
): "Positive (4-5★)" | "Neutral (3★)" | "Negative (1-2★)" | "Unrated" {
  if (typeof rating !== "number" || Number.isNaN(rating) || rating < 1 || rating > 5) {
    return "Unrated";
  }
  if (rating >= 4) return "Positive (4-5★)";
  if (rating === 3) return "Neutral (3★)";
  return "Negative (1-2★)";
}

export function classifyNpsGroup(
  score: number | null | undefined
): "Promoter (9-10)" | "Passive (7-8)" | "Detractor (0-6)" | "Unrated" {
  if (typeof score !== "number" || Number.isNaN(score) || score < 0 || score > 10) {
    return "Unrated";
  }
  if (score >= 9) return "Promoter (9-10)";
  if (score >= 7) return "Passive (7-8)";
  return "Detractor (0-6)";
}

export function computeFeedbackStatistics(
  records: FeedbackRecordRow[],
  allKnownComputers?: string[]
): ComputedStatisticsData {
  const total = records.length;

  // 1. Overall experience distribution & star-rating sentiment breakdown
  const overallStats = computeStarStats(records, (r) => r.overallExperience);
  const starCounts = new Map<number, number>([
    [5, 0],
    [4, 0],
    [3, 0],
    [2, 0],
    [1, 0],
  ]);

  for (const r of records) {
    const v = r.overallExperience;
    if (typeof v === "number" && v >= 1 && v <= 5) {
      starCounts.set(v, (starCounts.get(v) || 0) + 1);
    }
  }

  const distribution = [5, 4, 3, 2, 1].map((stars) => {
    const count = starCounts.get(stars) || 0;
    return {
      stars,
      count,
      pct:
        overallStats.sampleSize > 0
          ? round1((count / overallStats.sampleSize) * 100)
          : 0,
    };
  });

  const overallSentiment: SentimentBreakdown = {
    sampleSize: overallStats.sampleSize,
    missingCount: total - overallStats.sampleSize,
    positiveCount: overallStats.positiveCount,
    positivePct: overallStats.positivePct,
    neutralCount: overallStats.neutralCount,
    neutralPct: overallStats.neutralPct,
    negativeCount: overallStats.lowCount,
    negativePct: overallStats.lowPct,
  };

  // 2. Recommendation & NPS breakdown (0-10 scale, strictly separate from star sentiment)
  let recSum = 0;
  let recSample = 0;
  let promotersCount = 0;
  let passivesCount = 0;
  let detractorsCount = 0;
  const npsBucketCounts = new Map<number, number>();
  for (let i = 0; i <= 10; i++) npsBucketCounts.set(i, 0);

  for (const r of records) {
    const rec = r.recommendationLikelihood;
    if (typeof rec === "number" && !Number.isNaN(rec) && rec >= 0 && rec <= 10) {
      recSum += rec;
      recSample += 1;
      npsBucketCounts.set(rec, (npsBucketCounts.get(rec) || 0) + 1);
      if (rec >= 9) promotersCount += 1;
      else if (rec >= 7) passivesCount += 1;
      else detractorsCount += 1;
    }
  }

  const promotersExactPct = recSample > 0 ? (promotersCount / recSample) * 100 : 0;
  const detractorsExactPct = recSample > 0 ? (detractorsCount / recSample) * 100 : 0;
  const avgRecommendation = recSample > 0 ? round2(recSum / recSample) : null;

  const nps: NpsBreakdown = {
    available: recSample > 0,
    scale: "0-10",
    sampleSize: recSample,
    missingCount: total - recSample,
    averageScore: avgRecommendation,
    promotersCount,
    promotersPct: round1(promotersExactPct),
    passivesCount,
    passivesPct: recSample > 0 ? round1((passivesCount / recSample) * 100) : 0,
    detractorsCount,
    detractorsPct: round1(detractorsExactPct),
    score: recSample > 0 ? round1(promotersExactPct - detractorsExactPct) : null,
    scoreDistribution: Array.from({ length: 11 }, (_, s) => {
      const count = npsBucketCounts.get(s) || 0;
      const group: "detractor" | "passive" | "promoter" =
        s >= 9 ? "promoter" : s >= 7 ? "passive" : "detractor";
      return {
        score: s,
        count,
        pct: recSample > 0 ? round1((count / recSample) * 100) : 0,
        group,
      };
    }),
  };

  // 3. Individual category statistics & Lowest-to-Highest complete ranking
  const categoryStatsByKey = new Map<
    string,
    ReturnType<typeof computeStarStats> & { label: string; group: string }
  >();

  for (const field of CATEGORY_FIELDS) {
    categoryStatsByKey.set(field.key, {
      ...computeStarStats(records, field.getter),
      label: field.label,
      group: field.group,
    });
  }

  const ratedCategories = CATEGORY_FIELDS.filter(
    (f) => (categoryStatsByKey.get(f.key)?.sampleSize || 0) > 0
  ).sort((a, b) => {
    const sa = categoryStatsByKey.get(a.key)!;
    const sb = categoryStatsByKey.get(b.key)!;
    if ((sa.average ?? 0) !== (sb.average ?? 0)) {
      return (sa.average ?? 0) - (sb.average ?? 0);
    }
    if (sb.lowPct !== sa.lowPct) {
      return sb.lowPct - sa.lowPct;
    }
    return sa.label.localeCompare(sb.label);
  });

  const unratedCategories = CATEGORY_FIELDS.filter(
    (f) => (categoryStatsByKey.get(f.key)?.sampleSize || 0) === 0
  );

  const categoryRankings: CategoryRankingItem[] = [
    ...ratedCategories.map((f, idx) => {
      const s = categoryStatsByKey.get(f.key)!;
      const rank = idx + 1;
      return {
        rank,
        key: f.key,
        label: f.label,
        group: f.group,
        average: s.average,
        sampleSize: s.sampleSize,
        positiveCount: s.positiveCount,
        positivePct: s.positivePct,
        neutralCount: s.neutralCount,
        lowCount: s.lowCount,
        lowPct: s.lowPct,
        isBottomThree: rank <= 3,
      };
    }),
    ...unratedCategories.map((f) => {
      const s = categoryStatsByKey.get(f.key)!;
      return {
        rank: null,
        key: f.key,
        label: f.label,
        group: f.group,
        average: null,
        sampleSize: s.sampleSize,
        positiveCount: 0,
        positivePct: 0,
        neutralCount: 0,
        lowCount: 0,
        lowPct: 0,
        isBottomThree: false,
      };
    }),
  ];

  // 4. Spotlight 4-item equipment & comfort comparison:
  //    Computers, Monitors, Air Conditioning, and Chairs
  const spotlightDefs: { key: string; label: string; fieldLabel: string }[] = [
    {
      key: "computerPerformance",
      label: "Computers",
      fieldLabel: "Computer Performance",
    },
    {
      key: "monitorQuality",
      label: "Monitors",
      fieldLabel: "Monitor Quality",
    },
    {
      key: "airConditioning",
      label: "Air Conditioning",
      fieldLabel: "Air-Conditioning & Ventilation",
    },
    {
      key: "chairComfort",
      label: "Chairs",
      fieldLabel: "Chair Comfort",
    },
  ];

  const keyEquipmentComparison: SpotlightComparisonItem[] = spotlightDefs.map(
    (d) => {
      const s = categoryStatsByKey.get(d.key)!;
      return {
        key: d.key,
        label: d.label,
        fieldLabel: d.fieldLabel,
        average: s.average,
        sampleSize: s.sampleSize,
        positiveCount: s.positiveCount,
        positivePct: s.positivePct,
        neutralCount: s.neutralCount,
        lowCount: s.lowCount,
        lowPct: s.lowPct,
      };
    }
  );

  // 5. Technical issue counts
  let techIssueCount = 0;
  let noIssueCount = 0;
  for (const r of records) {
    if (r.hasTechnicalIssues === true) techIssueCount += 1;
    else if (r.hasTechnicalIssues === false) noIssueCount += 1;
  }
  const techSampleSize = techIssueCount + noIssueCount;

  // 6. Daily trends in Asia/Manila (YYYY-MM-DD, up to most recent 30 active dates)
  const dayCounts = new Map<string, number>();
  for (const r of records) {
    if (r.submittedAt) {
      const period = formatManilaDateKey(r.submittedAt);
      if (period) {
        dayCounts.set(period, (dayCounts.get(period) || 0) + 1);
      }
    }
  }
  const trends = Array.from(dayCounts.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-30)
    .map(([period, count]) => ({ period, count }));

  // 7. Per-computer breakdown
  const byComputer = new Map<string, FeedbackRecordRow[]>();
  for (const r of records) {
    const cid = r.computerId?.trim() || "Unassigned";
    const list = byComputer.get(cid) || [];
    list.push(r);
    byComputer.set(cid, list);
  }

  const computerSummary: ComputerSummaryItem[] = Array.from(
    byComputer.entries()
  )
    .map(([computerId, compRecords]) => ({
      computerId,
      submissions: compRecords.length,
      avgOverall: computeStarStats(compRecords, (r) => r.overallExperience)
        .average,
      avgComputerPerformance: computeStarStats(
        compRecords,
        (r) => r.computerPerformance
      ).average,
      avgMonitorQuality: computeStarStats(compRecords, (r) => r.monitorQuality)
        .average,
      techIssueCount: compRecords.filter((r) => r.hasTechnicalIssues === true)
        .length,
    }))
    .sort((a, b) => b.submissions - a.submissions || a.computerId.localeCompare(b.computerId));

  const distinctRecordComputers = Array.from(
    new Set(
      records
        .map((r) => r.computerId?.trim())
        .filter((v): v is string => Boolean(v))
    )
  ).sort((a, b) => a.localeCompare(b));

  const computers = allKnownComputers ?? distinctRecordComputers;

  // 8. Written-comment analysis
  const commentAnalysis = analyzeFeedbackComments(records);

  // 9. Automatically generated data-driven insights
  const insights: AutomatedInsight[] = [];

  if (total === 0) {
    insights.push({
      tone: "info",
      title: "No Matching Submissions",
      detail:
        "No feedback submissions match the currently selected filter criteria.",
    });
  } else {
    if (overallStats.average !== null) {
      const tone: AutomatedInsight["tone"] =
        overallStats.average >= 4
          ? "positive"
          : overallStats.average >= 3
          ? "neutral"
          : "attention";
      insights.push({
        tone,
        title: "Overall Experience Summary",
        detail: `Overall satisfaction averages ${overallStats.average.toFixed(
          2
        )} / 5 across n = ${
          overallStats.sampleSize
        } rated response(s), with ${overallSentiment.positivePct.toFixed(
          1
        )}% positive (4–5★), ${overallSentiment.neutralPct.toFixed(
          1
        )}% neutral (3★), and ${overallSentiment.negativePct.toFixed(
          1
        )}% negative (1–2★).`,
      });
    }

    const bottomThree = categoryRankings.filter((c) => c.isBottomThree);
    if (bottomThree.length > 0) {
      const summaryList = bottomThree
        .map(
          (c) => `${c.label} (${(c.average ?? 0).toFixed(2)}/5, n=${c.sampleSize})`
        )
        .join(", ");
      const lowestVal = bottomThree[0].average ?? 5;
      insights.push({
        tone: lowestVal < 3.5 ? "attention" : "info",
        title: "Lowest-Rated Categories to Prioritize",
        detail: `Lowest average ratings among the 14 categories: ${summaryList}.`,
      });
    }

    const ratedSpotlight = keyEquipmentComparison
      .filter((i) => i.average !== null)
      .sort((a, b) => (b.average ?? 0) - (a.average ?? 0));
    if (ratedSpotlight.length >= 2) {
      const topItem = ratedSpotlight[0];
      const lowItem = ratedSpotlight[ratedSpotlight.length - 1];
      insights.push({
        tone: (lowItem.average ?? 5) < 3.5 ? "attention" : "neutral",
        title: "Core Equipment & Comfort Comparison",
        detail: `Among the 4 core focus areas, ${topItem.label} rated highest (${(
          topItem.average ?? 0
        ).toFixed(2)}/5, n=${topItem.sampleSize}) while ${
          lowItem.label
        } rated lowest (${(lowItem.average ?? 0).toFixed(2)}/5, n=${
          lowItem.sampleSize
        }).`,
      });
    }

    if (nps.available && nps.score !== null) {
      const formattedNps =
        nps.score > 0 ? `+${nps.score.toFixed(1)}` : nps.score.toFixed(1);
      insights.push({
        tone: nps.score >= 30 ? "positive" : nps.score >= 0 ? "neutral" : "attention",
        title: "Recommendation & Net Promoter Score (0–10 Scale)",
        detail: `NPS is ${formattedNps} (n = ${nps.sampleSize}): ${nps.promotersPct.toFixed(
          1
        )}% Promoters (9–10), ${nps.passivesPct.toFixed(
          1
        )}% Passives (7–8), and ${nps.detractorsPct.toFixed(
          1
        )}% Detractors (0–6).`,
      });
    }

    const techPct =
      techSampleSize > 0 ? round1((techIssueCount / techSampleSize) * 100) : 0;
    insights.push({
      tone: techIssueCount > 0 ? "attention" : "positive",
      title: "Reported Technical Issues",
      detail:
        techSampleSize > 0
          ? `${techIssueCount} of ${techSampleSize} respondent(s) (${techPct.toFixed(
              1
            )}%) indicated experiencing technical issues.`
          : "No technical issue responses were recorded.",
    });
  }

  return {
    total_submissions: total,
    avg_overall: overallStats.average,
    avg_cleanliness: categoryStatsByKey.get("cleanlinessSatisfaction")!.average,
    avg_recommendation: avgRecommendation,
    avg_computer_performance:
      categoryStatsByKey.get("computerPerformance")!.average,
    avg_monitor_quality: categoryStatsByKey.get("monitorQuality")!.average,
    avg_equipment_ease: categoryStatsByKey.get("equipmentEaseOfUse")!.average,
    avg_equipment_availability:
      categoryStatsByKey.get("equipmentAvailability")!.average,
    avg_chair_comfort: categoryStatsByKey.get("chairComfort")!.average,
    avg_room_temperature: categoryStatsByKey.get("roomTemperature")!.average,
    avg_air_conditioning: categoryStatsByKey.get("airConditioning")!.average,
    avg_lighting: categoryStatsByKey.get("lighting")!.average,
    avg_workspace: categoryStatsByKey.get("workspaceSpace")!.average,
    avg_noise: categoryStatsByKey.get("noiseLevel")!.average,
    avg_equipment_cleanliness:
      categoryStatsByKey.get("equipmentCleanliness")!.average,
    avg_arrangement: categoryStatsByKey.get("arrangementSuitability")!.average,
    avg_concentration: categoryStatsByKey.get("concentrationComfort")!.average,
    tech_issue_count: techIssueCount,
    no_issue_count: noIssueCount,
    tech_sample_size: techSampleSize,
    tech_issue_pct_of_answered:
      techSampleSize > 0 ? round1((techIssueCount / techSampleSize) * 100) : 0,
    distribution,
    trends,
    computers,
    overallSentiment,
    nps,
    keyEquipmentComparison,
    categoryRankings,
    computerSummary,
    insights,
    commentAnalysis,
  };
}
