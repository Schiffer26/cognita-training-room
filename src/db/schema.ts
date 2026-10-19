import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

// Registered training computers
export const computers = pgTable("computers", {
  id: uuid("id").defaultRandom().primaryKey(),
  identifier: varchar("identifier", { length: 50 }).notNull().unique(),
  label: varchar("label", { length: 100 }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Administrator accounts
export const admins = pgTable("admins", {
  id: uuid("id").defaultRandom().primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: varchar("display_name", { length: 150 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Feedback records
export const feedbackRecords = pgTable(
  "feedback_records",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    sessionId: varchar("session_id", { length: 100 }).notNull(),

    // Stage 1 - About You
    respondentName: varchar("respondent_name", { length: 200 }),
    profession: varchar("profession", { length: 200 }),
    computerId: varchar("computer_id", { length: 50 }),

    // Stage 2 - Overall Satisfaction
    overallExperience: integer("overall_experience"), // 1-5 stars
    cleanlinessSatisfaction: integer("cleanliness_satisfaction"), // 1-5 stars
    recommendationLikelihood: integer("recommendation_likelihood"), // 0-10

    // Computers and Equipment
    computerPerformance: integer("computer_performance"), // 1-5 stars
    monitorQuality: integer("monitor_quality"), // 1-5 stars
    equipmentEaseOfUse: integer("equipment_ease_of_use"), // 1-5 stars
    equipmentAvailability: integer("equipment_availability"), // 1-5 stars

    // Comfort and Room Conditions
    chairComfort: integer("chair_comfort"), // 1-5 stars
    roomTemperature: integer("room_temperature"), // 1-5 stars
    airConditioning: integer("air_conditioning"), // 1-5 stars
    lighting: integer("lighting"), // 1-5 stars
    workspaceSpace: integer("workspace_space"), // 1-5 stars

    // Training Room Environment
    noiseLevel: integer("noise_level"), // 1-5 stars
    equipmentCleanliness: integer("equipment_cleanliness"), // 1-5 stars
    arrangementSuitability: integer("arrangement_suitability"), // 1-5 stars
    concentrationComfort: integer("concentration_comfort"), // 1-5 stars

    // Stage 3 - Technical Issues
    hasTechnicalIssues: boolean("has_technical_issues"),
    technicalIssueDescription: text("technical_issue_description"),

    // Feedback and Suggestions
    likedMost: text("liked_most"),
    featuresWanted: text("features_wanted"),
    changeImprovement: text("change_improvement"),
    mostImportantImprovement: text("most_important_improvement"),

    // Metadata
    submittedAt: timestamp("submitted_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("feedback_session_unique").on(table.sessionId),
  ]
);

// Audit log for admin actions
export const auditLog = pgTable("audit_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  adminId: uuid("admin_id").references(() => admins.id),
  action: varchar("action", { length: 50 }).notNull(),
  targetType: varchar("target_type", { length: 50 }),
  targetId: varchar("target_id", { length: 100 }),
  details: text("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
