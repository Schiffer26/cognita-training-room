"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { ASSETS } from "@/config/assets";
import PlaceholderImage from "@/components/PlaceholderImage";
import StarRating from "@/components/StarRating";

interface SurveyData {
  sessionId: string;
  respondentName: string;
  profession: string;
  computerId: string;
  overallExperience: number;
  cleanlinessSatisfaction: number;
  recommendationLikelihood: number;
  computerPerformance: number;
  monitorQuality: number;
  equipmentEaseOfUse: number;
  equipmentAvailability: number;
  chairComfort: number;
  roomTemperature: number;
  airConditioning: number;
  lighting: number;
  workspaceSpace: number;
  noiseLevel: number;
  equipmentCleanliness: number;
  arrangementSuitability: number;
  concentrationComfort: number;
  hasTechnicalIssues: boolean | null;
  technicalIssueDescription: string;
  likedMost: string;
  featuresWanted: string;
  changeImprovement: string;
  mostImportantImprovement: string;
}

const initialData: SurveyData = {
  sessionId: "",
  respondentName: "",
  profession: "",
  computerId: "",
  overallExperience: 0,
  cleanlinessSatisfaction: 0,
  recommendationLikelihood: -1,
  computerPerformance: 0,
  monitorQuality: 0,
  equipmentEaseOfUse: 0,
  equipmentAvailability: 0,
  chairComfort: 0,
  roomTemperature: 0,
  airConditioning: 0,
  lighting: 0,
  workspaceSpace: 0,
  noiseLevel: 0,
  equipmentCleanliness: 0,
  arrangementSuitability: 0,
  concentrationComfort: 0,
  hasTechnicalIssues: null,
  technicalIssueDescription: "",
  likedMost: "",
  featuresWanted: "",
  changeImprovement: "",
  mostImportantImprovement: "",
};

const TOTAL_PAGES = 6;

const stageNames = [
  { stage: 1, name: "About You", pages: [0] },
  { stage: 2, name: "Overall Satisfaction", pages: [1] },
  { stage: 3, name: "Computers & Equipment", pages: [2] },
  { stage: 4, name: "Comfort & Environment", pages: [3] },
  { stage: 5, name: "Technical Issues", pages: [4] },
  { stage: 6, name: "Feedback & Suggestions", pages: [5] },
];

export default function SurveyPage() {
  const router = useRouter();
  const [data, setData] = useState<SurveyData>({ ...initialData, sessionId: "" });
  const [page, setPage] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    setData((d) => ({ ...d, sessionId: uuidv4() }));
  }, []);

  const update = useCallback(
    <K extends keyof SurveyData>(field: K, value: SurveyData[K]) => {
      setData((prev) => ({ ...prev, [field]: value }));
      setErrors([]);
    },
    []
  );

  const validatePage = (): string[] => {
    const errs: string[] = [];
    switch (page) {
      case 0:
        // About You - all optional
        break;
      case 1:
        if (!data.overallExperience) errs.push("Please rate your overall experience.");
        if (!data.cleanlinessSatisfaction) errs.push("Please rate cleanliness satisfaction.");
        if (data.recommendationLikelihood < 0) errs.push("Please select recommendation likelihood.");
        break;
      case 2:
        if (!data.computerPerformance) errs.push("Please rate computer performance.");
        if (!data.monitorQuality) errs.push("Please rate monitor quality.");
        if (!data.equipmentEaseOfUse) errs.push("Please rate equipment ease of use.");
        if (!data.equipmentAvailability) errs.push("Please rate equipment availability.");
        break;
      case 3:
        if (!data.chairComfort) errs.push("Please rate chair comfort.");
        if (!data.roomTemperature) errs.push("Please rate room temperature.");
        if (!data.airConditioning) errs.push("Please rate air conditioning.");
        if (!data.lighting) errs.push("Please rate lighting.");
        if (!data.workspaceSpace) errs.push("Please rate workspace space.");
        if (!data.noiseLevel) errs.push("Please rate noise level.");
        if (!data.equipmentCleanliness) errs.push("Please rate equipment cleanliness.");
        if (!data.arrangementSuitability) errs.push("Please rate arrangement suitability.");
        if (!data.concentrationComfort) errs.push("Please rate concentration comfort.");
        break;
      case 4:
        if (data.hasTechnicalIssues === null) errs.push("Please indicate if you had technical issues.");
        break;
      case 5:
        // Feedback - optional
        break;
    }
    return errs;
  };

  const handleNext = () => {
    const errs = validatePage();
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setErrors([]);
    if (page < TOTAL_PAGES - 1) {
      setPage(page + 1);
      window.scrollTo(0, 0);
    }
  };

  const handleBack = () => {
    if (page > 0) {
      setPage(page - 1);
      setErrors([]);
      window.scrollTo(0, 0);
    }
  };

  const handleSubmit = async () => {
    const errs = validatePage();
    if (errs.length > 0) {
      setErrors(errs);
      return;
    }
    setSubmitting(true);
    setErrors([]);

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          recommendationLikelihood: data.recommendationLikelihood < 0 ? 0 : data.recommendationLikelihood,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        if (result.alreadySubmitted) {
          setSubmitted(true);
        } else {
          setErrors([result.error || "Failed to submit feedback."]);
        }
        setSubmitting(false);
        return;
      }
      setSubmitted(true);
    } catch {
      setErrors(["Unable to connect to the server. Please try again."]);
    }
    setSubmitting(false);
  };

  const progress = Math.round(((page + 1) / TOTAL_PAGES) * 100);

  if (submitted) {
    return <CompletionScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PlaceholderImage
              src={ASSETS.dictLogo}
              alt="DICT"
              width={36}
              height={36}
              className="rounded-full"
              fallbackText="D"
              fallbackClassName="rounded-full bg-blue-50 text-blue-600 text-xs font-bold w-9 h-9"
            />
            <div>
              <span className="font-serif font-bold text-navy text-lg">COGNĪTA</span>
              <span className="text-xs text-gray-400 ml-2">By DICT Iligan</span>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            ⏱ Estimated time: 3-5 minutes
          </div>
        </div>
      </div>

      <div className="text-center py-2 bg-blue-50 text-xs text-navy">
        You may close this application after submitting your feedback.
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 flex flex-col lg:flex-row gap-6">
        {/* Progress Sidebar */}
        <div className="lg:w-72 shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-6">
            <h3 className="text-sm font-bold text-navy mb-3">YOUR PROGRESS</h3>
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div
                className="bg-survey-blue h-2 rounded-full progress-bar"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="space-y-2">
              {stageNames.map((s, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 py-2 px-3 rounded-lg text-sm ${
                    page === i
                      ? "bg-survey-blue-light text-survey-blue font-semibold"
                      : page > i
                      ? "text-green-600"
                      : "text-gray-400"
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      page === i
                        ? "bg-survey-blue text-white"
                        : page > i
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-400"
                    }`}
                  >
                    {page > i ? "✓" : s.stage}
                  </span>
                  {s.name}
                </div>
              ))}
            </div>

            {/* Secure notice */}
            <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-100">
              <h4 className="text-xs font-bold text-navy mb-1">🔒 SECURE & CONFIDENTIAL</h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Your name is optional. Responses are stored securely. The submission time and
                computer identifier may be recorded for operational purposes.
              </p>
            </div>
          </div>
        </div>

        {/* Main Form */}
        <div className="flex-1">
          <div className="bg-white rounded-xl border border-gray-200 p-6 md:p-8">
            {/* Error display */}
            {errors.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                {errors.map((e, i) => (
                  <p key={i} className="text-sm text-red-600">• {e}</p>
                ))}
              </div>
            )}

            {/* Page content */}
            {page === 0 && <AboutYouPage data={data} update={update} />}
            {page === 1 && <OverallSatisfactionPage data={data} update={update} />}
            {page === 2 && <ComputersEquipmentPage data={data} update={update} />}
            {page === 3 && <ComfortEnvironmentPage data={data} update={update} />}
            {page === 4 && <TechnicalIssuesPage data={data} update={update} />}
            {page === 5 && <FeedbackSuggestionsPage data={data} update={update} />}

            {/* Navigation */}
            <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
              <button
                onClick={handleBack}
                disabled={page === 0}
                className="px-6 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                ← Back
              </button>
              <span className="text-sm text-gray-400">
                Page {page + 1} of {TOTAL_PAGES}
              </span>
              {page < TOTAL_PAGES - 1 ? (
                <button
                  onClick={handleNext}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-survey-blue hover:bg-survey-blue-hover rounded-lg transition-colors"
                >
                  Next Page →
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? "Submitting..." : "Submit Feedback ✓"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---- Page Components ----

interface PageProps {
  data: SurveyData;
  update: <K extends keyof SurveyData>(field: K, value: SurveyData[K]) => void;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-bold text-navy mb-2">{children}</h2>;
}

function SectionDesc({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-500 mb-6">{children}</p>;
}

function QuestionLabel({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <label className="block text-sm font-medium text-navy mb-2">
      {children}
      {optional && <span className="text-gray-400 font-normal ml-1">(optional)</span>}
    </label>
  );
}

function RatingQuestion({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className={`p-4 rounded-lg border transition-colors ${value > 0 ? "border-survey-blue bg-survey-blue-light/30" : "border-gray-200 bg-white"}`}>
      <p className="text-sm text-navy mb-2">{label}</p>
      <StarRating value={value} onChange={onChange} label={label} />
      <p className="text-xs text-gray-400 mt-1">
        {value === 0
          ? "Select a rating"
          : ["", "Very Dissatisfied", "Dissatisfied", "Neutral", "Satisfied", "Very Satisfied"][value]}
      </p>
    </div>
  );
}

function AboutYouPage({ data, update }: PageProps) {
  return (
    <div>
      <SectionTitle>About You</SectionTitle>
      <SectionDesc>Tell us a little about yourself. All fields are optional.</SectionDesc>
      <div className="space-y-4">
        <div>
          <QuestionLabel optional>Your Name</QuestionLabel>
          <input
            type="text"
            value={data.respondentName}
            onChange={(e) => update("respondentName", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-survey-blue focus:border-transparent outline-none"
            placeholder="Enter your name"
          />
        </div>
        <div>
          <QuestionLabel optional>Profession / Role</QuestionLabel>
          <input
            type="text"
            value={data.profession}
            onChange={(e) => update("profession", e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-survey-blue focus:border-transparent outline-none"
            placeholder="e.g. Student, Teacher, Government Employee"
          />
        </div>
        <div>
          <QuestionLabel optional>Computer Identifier</QuestionLabel>
          <input
            type="text"
            value={data.computerId}
            disabled
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm bg-gray-50 text-gray-400"
            placeholder="Automatically assigned by the system"
          />
          <p className="text-xs text-gray-400 mt-1">
            This will be set automatically by the training room system in the future.
          </p>
        </div>
      </div>
    </div>
  );
}

function OverallSatisfactionPage({ data, update }: PageProps) {
  return (
    <div>
      <SectionTitle>Overall Satisfaction</SectionTitle>
      <SectionDesc>Rate your overall experience at the training room.</SectionDesc>
      <div className="space-y-4">
        <RatingQuestion
          label="How would you rate your overall experience?"
          value={data.overallExperience}
          onChange={(v) => update("overallExperience", v)}
        />
        <RatingQuestion
          label="How satisfied are you with the cleanliness of the training room?"
          value={data.cleanlinessSatisfaction}
          onChange={(v) => update("cleanlinessSatisfaction", v)}
        />
        <div className={`p-4 rounded-lg border transition-colors ${data.recommendationLikelihood >= 0 ? "border-survey-blue bg-survey-blue-light/30" : "border-gray-200 bg-white"}`}>
          <p className="text-sm text-navy mb-3">How likely are you to recommend or use the training room again?</p>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 11 }, (_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => update("recommendationLikelihood", i)}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                  data.recommendationLikelihood === i
                    ? "bg-survey-blue text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {i}
              </button>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-400">
            <span>Not at all likely</span>
            <span>Extremely likely</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function ComputersEquipmentPage({ data, update }: PageProps) {
  return (
    <div>
      <SectionTitle>Computers and Equipment</SectionTitle>
      <SectionDesc>Rate the computers and equipment in the training room.</SectionDesc>
      <div className="space-y-4">
        <RatingQuestion
          label="1. How satisfied are you with the performance of the computers?"
          value={data.computerPerformance}
          onChange={(v) => update("computerPerformance", v)}
        />
        <RatingQuestion
          label="2. How satisfied are you with the quality and condition of the monitors?"
          value={data.monitorQuality}
          onChange={(v) => update("monitorQuality", v)}
        />
        <RatingQuestion
          label="3. Are the computers and other equipment easy to use?"
          value={data.equipmentEaseOfUse}
          onChange={(v) => update("equipmentEaseOfUse", v)}
        />
        <RatingQuestion
          label="4. How satisfied are you with the availability of the equipment you need?"
          value={data.equipmentAvailability}
          onChange={(v) => update("equipmentAvailability", v)}
        />
      </div>
    </div>
  );
}

function ComfortEnvironmentPage({ data, update }: PageProps) {
  return (
    <div>
      <SectionTitle>Comfort, Room Conditions & Environment</SectionTitle>
      <SectionDesc>Rate the comfort and conditions of the training room.</SectionDesc>
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-navy uppercase tracking-wider">Comfort and Room Conditions</h3>
        <RatingQuestion
          label="1. How comfortable were the chairs during your training session?"
          value={data.chairComfort}
          onChange={(v) => update("chairComfort", v)}
        />
        <RatingQuestion
          label="2. How satisfied are you with the room temperature?"
          value={data.roomTemperature}
          onChange={(v) => update("roomTemperature", v)}
        />
        <RatingQuestion
          label="3. How satisfied are you with the air-conditioning and ventilation?"
          value={data.airConditioning}
          onChange={(v) => update("airConditioning", v)}
        />
        <RatingQuestion
          label="4. How comfortable is the lighting?"
          value={data.lighting}
          onChange={(v) => update("lighting", v)}
        />
        <RatingQuestion
          label="5. Do you have enough space to work comfortably?"
          value={data.workspaceSpace}
          onChange={(v) => update("workspaceSpace", v)}
        />

        <h3 className="text-sm font-bold text-navy uppercase tracking-wider pt-4">Training Room Environment</h3>
        <RatingQuestion
          label="1. How satisfied are you with the noise level?"
          value={data.noiseLevel}
          onChange={(v) => update("noiseLevel", v)}
        />
        <RatingQuestion
          label="2. How satisfied are you with the cleanliness of the PCs, desks, and other equipment?"
          value={data.equipmentCleanliness}
          onChange={(v) => update("equipmentCleanliness", v)}
        />
        <RatingQuestion
          label="3. Is the arrangement of PCs and chairs suitable for training activities?"
          value={data.arrangementSuitability}
          onChange={(v) => update("arrangementSuitability", v)}
        />
        <RatingQuestion
          label="4. Do you feel comfortable and able to concentrate while using the room?"
          value={data.concentrationComfort}
          onChange={(v) => update("concentrationComfort", v)}
        />
      </div>
    </div>
  );
}

function TechnicalIssuesPage({ data, update }: PageProps) {
  return (
    <div>
      <SectionTitle>Technical Issues</SectionTitle>
      <SectionDesc>Tell us about any technical problems you experienced.</SectionDesc>
      <div className="space-y-4">
        <div className={`p-4 rounded-lg border transition-colors ${data.hasTechnicalIssues !== null ? "border-survey-blue bg-survey-blue-light/30" : "border-gray-200"}`}>
          <p className="text-sm text-navy mb-3">Did you experience any technical problems while using the training room?</p>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => update("hasTechnicalIssues", true)}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                data.hasTechnicalIssues === true
                  ? "bg-survey-blue text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => {
                update("hasTechnicalIssues", false);
                update("technicalIssueDescription", "");
              }}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-colors ${
                data.hasTechnicalIssues === false
                  ? "bg-survey-blue text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              No
            </button>
          </div>
        </div>

        {data.hasTechnicalIssues && (
          <div>
            <QuestionLabel>Please describe the technical problems you encountered</QuestionLabel>
            <textarea
              value={data.technicalIssueDescription}
              onChange={(e) => update("technicalIssueDescription", e.target.value)}
              rows={4}
              className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-survey-blue focus:border-transparent outline-none resize-none"
              placeholder="Describe the issues..."
            />
          </div>
        )}
      </div>
    </div>
  );
}

function FeedbackSuggestionsPage({ data, update }: PageProps) {
  return (
    <div>
      <SectionTitle>Feedback and Suggestions</SectionTitle>
      <SectionDesc>Share your thoughts and suggestions to help us improve. All fields are optional.</SectionDesc>
      <div className="space-y-4">
        <div>
          <QuestionLabel optional>What did you like most about the training room?</QuestionLabel>
          <textarea
            value={data.likedMost}
            onChange={(e) => update("likedMost", e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-survey-blue focus:border-transparent outline-none resize-none"
            placeholder="Share what you enjoyed..."
          />
        </div>
        <div>
          <QuestionLabel optional>What equipment, facilities, or features would you like to see added?</QuestionLabel>
          <textarea
            value={data.featuresWanted}
            onChange={(e) => update("featuresWanted", e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-survey-blue focus:border-transparent outline-none resize-none"
            placeholder="Suggest new equipment or features..."
          />
        </div>
        <div>
          <QuestionLabel optional>If you could change or improve one thing about the training room, what would it be?</QuestionLabel>
          <textarea
            value={data.changeImprovement}
            onChange={(e) => update("changeImprovement", e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-survey-blue focus:border-transparent outline-none resize-none"
            placeholder="Describe your suggested improvement..."
          />
        </div>
        <div>
          <QuestionLabel optional>What is the single most important improvement that would improve your experience?</QuestionLabel>
          <textarea
            value={data.mostImportantImprovement}
            onChange={(e) => update("mostImportantImprovement", e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-survey-blue focus:border-transparent outline-none resize-none"
            placeholder="The most impactful change..."
          />
        </div>
      </div>
    </div>
  );
}

function CompletionScreen() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8 text-center">
        <PlaceholderImage
          src={ASSETS.dictLogo}
          alt="DICT Logo"
          width={100}
          height={100}
          className="mx-auto mb-4 rounded-full"
          fallbackText="DICT"
          fallbackClassName="rounded-full bg-blue-50 text-blue-600 text-sm font-bold w-20 h-20 mx-auto"
        />
        <h1 className="text-3xl font-serif font-bold text-navy mb-1">COGNĪTA</h1>
        <p className="text-sm text-gray-500 mb-6">By DICT Iligan</p>
        <div className="bg-green-50 rounded-lg p-4 mb-6">
          <p className="text-green-700 font-medium">✓ Feedback Submitted Successfully</p>
          <p className="text-sm text-green-600 mt-1">
            Thank you for taking the time to share your feedback. Your responses have been recorded
            and will help us improve the training room experience.
          </p>
        </div>
        <button
          onClick={() => {
            window.location.href = "/";
          }}
          className="bg-survey-blue hover:bg-survey-blue-hover text-white font-semibold py-3 px-8 rounded-lg transition-colors"
        >
          Close COGNĪTA
        </button>
      </div>
    </div>
  );
}
