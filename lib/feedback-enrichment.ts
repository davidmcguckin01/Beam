/**
 * Feedback Enrichment & Scoring Service
 *
 * This module provides services for:
 * - Enriching company and person data from external APIs
 * - Calculating ICP (Ideal Customer Profile) scores
 * - Calculating value scores for feedback
 * - Generating tasks from feedback using LLM
 */

import { db } from "@/db";
import {
  companies,
  people,
  feedbacks,
  tasks,
  customers,
  workspaceMembers,
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { enrichCompanyData, enrichPersonData } from "@/lib/ip-enrichment";

// ============================================================================
// TypeScript Interfaces
// ============================================================================

/**
 * ICP Configuration
 * Defines the ideal customer profile criteria for scoring
 *
 * TODO: This should be configurable per workspace in the future
 */
export type ICPConfig = {
  targetIndustries: string[]; // e.g., ["SaaS", "E-commerce", "Healthcare"]
  minEmployees: number; // Minimum employee count
  maxEmployees: number; // Maximum employee count (0 = no max)
  targetRegions: string[]; // e.g., ["United States", "Canada", "Europe"]
  // Optional: revenue ranges, company types, etc.
  minRevenue?: string; // e.g., "$1M"
  maxRevenue?: string; // e.g., "$100M"
};

/**
 * Company Enrichment Result
 * Data structure returned from external enrichment APIs
 */
export interface CompanyEnrichmentResult {
  name?: string | null;
  domain?: string | null;
  industry?: string | null;
  employeeCount?: number | null;
  revenue?: string | null;
  location?: string | null;
  website?: string | null;
  linkedinUrl?: string | null;
  twitterUrl?: string | null;
  facebookUrl?: string | null;
  description?: string | null;
  founded?: number | null;
  planTier?: string | null;
  rawEnrichmentData?: string | null; // Full API response JSON
}

/**
 * Person Enrichment Result
 * Data structure returned from external enrichment APIs
 */
export interface PersonEnrichmentResult {
  name?: string | null;
  email?: string | null;
  role?: string | null;
  department?: string | null;
  seniority?: string | null; // "C-level", "VP", "Director", "Manager", "Individual Contributor"
  linkedinUrl?: string | null;
  companyId?: string | null; // Link to company record if found
  rawEnrichmentData?: string | null; // Full API response JSON
}

/**
 * ICP Score Result
 */
export interface ICPScoreResult {
  icpScore: number; // 0-100
  icpMatchLabel: "Strong ICP" | "Medium ICP" | "Non-ICP" | "Unknown";
  reasons: string[]; // Explanation of scoring factors
}

/**
 * Value Score Multipliers
 * Used to calculate valueScore = icpScore * importanceMultiplier * sentimentMultiplier * roleMultiplier
 */
export interface ValueScoreMultipliers {
  importanceMultiplier: number; // Based on company size, ARR, etc.
  sentimentMultiplier: number; // Based on sentiment (negative = higher multiplier)
  roleMultiplier: number; // Based on person seniority
  urgencyMultiplier?: number; // Based on urgency level
}

/**
 * Generated Task
 * Structure for tasks generated from feedback via LLM
 */
export interface GeneratedTask {
  id: string;
  feedbackId: string;
  title: string;
  description: string;
  category: "bug" | "feature_request" | "ux" | "support" | "other";
  suggestedOwner: "engineering" | "product" | "design" | "cs" | "marketing";
  impactEstimate: "low" | "medium" | "high";
  effortEstimate: "low" | "medium" | "high";
  createdAt: Date;
}

/**
 * Feedback with Context
 * Extended feedback object with related company and person data for scoring/task generation
 */
export interface FeedbackWithContext {
  id: string;
  workspaceId: string;
  rawText: string;
  sentiment?: string | null;
  urgency?: string | null;
  companyId?: string | null;
  personId?: string | null;
  // Related data (can be loaded via joins)
  company?: {
    name?: string | null;
    domain?: string | null;
    industry?: string | null;
    employeeCount?: number | null;
    revenue?: string | null;
    planTier?: string | null;
  } | null;
  person?: {
    name?: string | null;
    email?: string | null;
    role?: string | null;
    seniority?: string | null;
  } | null;
}

// ============================================================================
// Default ICP Configuration
// ============================================================================

/**
 * Default ICP configuration
 * TODO: Make this configurable per workspace
 */
export const DEFAULT_ICP_CONFIG: ICPConfig = {
  targetIndustries: ["SaaS", "Technology", "Software"],
  minEmployees: 10,
  maxEmployees: 1000,
  targetRegions: ["United States", "Canada"],
  minRevenue: "$1M",
  maxRevenue: "$100M",
};

// ============================================================================
// External API Abstraction Functions
// ============================================================================

/**
 * Enrich company data from domain
 * Abstracted function that can be swapped with real API implementations
 *
 * @param domain - Company domain (e.g., "example.com")
 * @returns Company enrichment data
 */
export async function enrichCompanyFromDomain(
  domain: string | null
): Promise<CompanyEnrichmentResult> {
  if (!domain || !domain.includes(".")) {
    return {};
  }

  // TODO: Replace with real API call (e.g., People Data Labs, Clearbit, etc.)
  // For now, use the existing enrichCompanyData function
  const result = await enrichCompanyData(domain);

  return {
    name: result.companyName || null,
    domain: domain,
    industry: result.companyIndustry || null,
    employeeCount: result.companyEmployees || null,
    revenue: result.companyRevenue || null,
    location: result.companyLocation || null,
    website: result.companyWebsite || null,
    linkedinUrl: result.companyLinkedinUrl || null,
    twitterUrl: result.companyTwitterUrl || null,
    facebookUrl: result.companyFacebookUrl || null,
    description: result.companyDescription || null,
    founded: result.companyFounded || null,
    rawEnrichmentData: result.rawCompanyData || null,
  };
}

/**
 * Enrich person data from email and name
 * Abstracted function that can be swapped with real API implementations
 *
 * @param email - Person email address
 * @param name - Person full name (optional)
 * @param location - Location data (optional)
 * @returns Person enrichment data
 */
export async function enrichPersonFromEmail(
  email: string | null,
  name?: string | null,
  location?: {
    city?: string | null;
    state?: string | null;
    country?: string | null;
  }
): Promise<PersonEnrichmentResult> {
  if (!email || !email.includes("@")) {
    return {};
  }

  // TODO: Replace with real API call (e.g., People Data Labs, Clearbit, etc.)
  // For now, use the existing enrichPersonData function
  const result = await enrichPersonData(email, name || null, location);

  // Extract seniority from job title
  const seniority = extractSeniorityFromTitle(result.jobTitle || null);

  return {
    name: name || null,
    email: email,
    role: result.jobTitle || null,
    department: null, // TODO: Extract from enrichment data if available
    seniority: seniority,
    linkedinUrl:
      result.profiles?.find((p) => p.network === "linkedin")?.url || null,
    rawEnrichmentData: result.rawPersonData || null,
  };
}

/**
 * Extract seniority level from job title
 * Helper function to categorize job titles into seniority levels
 */
function extractSeniorityFromTitle(title: string | null): string | null {
  if (!title) return null;

  const titleLower = title.toLowerCase();

  // C-level
  if (
    titleLower.includes("ceo") ||
    titleLower.includes("cto") ||
    titleLower.includes("cfo") ||
    titleLower.includes("coo") ||
    titleLower.includes("chief")
  ) {
    return "C-level";
  }

  // VP level
  if (
    titleLower.includes("vp") ||
    titleLower.includes("vice president") ||
    titleLower.includes("vice-president")
  ) {
    return "VP";
  }

  // Director level
  if (titleLower.includes("director")) {
    return "Director";
  }

  // Manager level
  if (
    titleLower.includes("manager") ||
    titleLower.includes("head of") ||
    titleLower.includes("lead")
  ) {
    return "Manager";
  }

  // Individual Contributor
  return "Individual Contributor";
}

// ============================================================================
// Service Functions
// ============================================================================

/**
 * Get workspace owner user ID for customer creation
 * Used when creating customers from public feedback submissions
 */
async function getWorkspaceOwnerUserId(
  workspaceId: string
): Promise<string | null> {
  // Find workspace owner or admin
  // Try owner first, then admin
  const [owner] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.role, "owner")
      )
    )
    .limit(1);

  if (owner) {
    return owner.userId;
  }

  // Fallback to admin if no owner found
  const [admin] = await db
    .select()
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.role, "admin")
      )
    )
    .limit(1);

  return admin?.userId || null;
}

/**
 * Enrich feedback company and person data
 *
 * This function:
 * 1. Extracts company domain from feedback (email domain, IP enrichment, etc.)
 * 2. Looks up or creates company record in companies table
 * 3. Enriches company data if not already enriched or stale
 * 4. Extracts person info from feedback
 * 5. Looks up or creates person record in people table
 * 6. Enriches person data if not already enriched or stale
 * 7. Creates or updates customer record for the feedback submitter
 * 8. Links feedback to company, person, and customer records
 *
 * @param feedbackId - ID of the feedback entry to enrich
 */
export async function enrichFeedbackCompanyAndPerson(
  feedbackId: string
): Promise<{
  companyId: string | null;
  personId: string | null;
  customerId: string | null;
}> {
  // Load feedback
  const [feedback] = await db
    .select()
    .from(feedbacks)
    .where(eq(feedbacks.id, feedbackId))
    .limit(1);

  if (!feedback) {
    throw new Error(`Feedback not found: ${feedbackId}`);
  }

  let companyId: string | null = null;
  let personId: string | null = null;
  let customerId: string | null = null;

  // Step 1: Find or create company record
  const companyDomain =
    feedback.companyDomain || extractDomainFromEmail(feedback.submitterEmail);

  if (companyDomain) {
    // Check if company already exists
    const [existingCompany] = await db
      .select()
      .from(companies)
      .where(
        and(
          eq(companies.workspaceId, feedback.workspaceId),
          eq(companies.domain, companyDomain)
        )
      )
      .limit(1);

    if (existingCompany) {
      companyId = existingCompany.id;

      // Re-enrich if data is stale (older than 30 days) or missing key fields
      const shouldReEnrich =
        !existingCompany.lastEnrichedAt ||
        Date.now() - existingCompany.lastEnrichedAt.getTime() >
          30 * 24 * 60 * 60 * 1000 ||
        !existingCompany.employeeCount ||
        !existingCompany.industry;

      if (shouldReEnrich) {
        const enrichmentData = await enrichCompanyFromDomain(companyDomain);

        await db
          .update(companies)
          .set({
            name: enrichmentData.name || existingCompany.name,
            industry: enrichmentData.industry || existingCompany.industry,
            employeeCount:
              enrichmentData.employeeCount || existingCompany.employeeCount,
            revenue: enrichmentData.revenue || existingCompany.revenue,
            location: enrichmentData.location || existingCompany.location,
            website: enrichmentData.website || existingCompany.website,
            linkedinUrl:
              enrichmentData.linkedinUrl || existingCompany.linkedinUrl,
            twitterUrl: enrichmentData.twitterUrl || existingCompany.twitterUrl,
            facebookUrl:
              enrichmentData.facebookUrl || existingCompany.facebookUrl,
            description:
              enrichmentData.description || existingCompany.description,
            founded: enrichmentData.founded || existingCompany.founded,
            rawEnrichmentData:
              enrichmentData.rawEnrichmentData ||
              existingCompany.rawEnrichmentData,
            lastEnrichedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(companies.id, companyId));
      }
    } else {
      // Create new company record
      const enrichmentData = await enrichCompanyFromDomain(companyDomain);

      const [newCompany] = await db
        .insert(companies)
        .values({
          workspaceId: feedback.workspaceId,
          name: enrichmentData.name || feedback.companyName || null,
          domain: companyDomain,
          industry: enrichmentData.industry || null,
          employeeCount: enrichmentData.employeeCount || null,
          revenue: enrichmentData.revenue || null,
          location: enrichmentData.location || null,
          website: enrichmentData.website || null,
          linkedinUrl: enrichmentData.linkedinUrl || null,
          twitterUrl: enrichmentData.twitterUrl || null,
          facebookUrl: enrichmentData.facebookUrl || null,
          description: enrichmentData.description || null,
          founded: enrichmentData.founded || null,
          rawEnrichmentData: enrichmentData.rawEnrichmentData || null,
          lastEnrichedAt: new Date(),
        })
        .returning();

      companyId = newCompany.id;
    }
  }

  // Step 2: Find or create person record
  if (feedback.submitterEmail) {
    // Check if person already exists
    const [existingPerson] = await db
      .select()
      .from(people)
      .where(
        and(
          eq(people.workspaceId, feedback.workspaceId),
          eq(people.email, feedback.submitterEmail)
        )
      )
      .limit(1);

    if (existingPerson) {
      personId = existingPerson.id;

      // Update company link if we found a company
      if (companyId && !existingPerson.companyId) {
        await db
          .update(people)
          .set({
            companyId: companyId,
            updatedAt: new Date(),
          })
          .where(eq(people.id, personId));
      }

      // Re-enrich if data is stale (older than 30 days) or missing key fields
      const shouldReEnrich =
        !existingPerson.lastEnrichedAt ||
        Date.now() - existingPerson.lastEnrichedAt.getTime() >
          30 * 24 * 60 * 60 * 1000 ||
        !existingPerson.role;

      if (shouldReEnrich) {
        const enrichmentData = await enrichPersonFromEmail(
          feedback.submitterEmail,
          feedback.submitterName || null
        );

        await db
          .update(people)
          .set({
            name: enrichmentData.name || existingPerson.name,
            role: enrichmentData.role || existingPerson.role,
            department: enrichmentData.department || existingPerson.department,
            seniority: enrichmentData.seniority || existingPerson.seniority,
            linkedinUrl:
              enrichmentData.linkedinUrl || existingPerson.linkedinUrl,
            companyId: companyId || existingPerson.companyId,
            rawEnrichmentData:
              enrichmentData.rawEnrichmentData ||
              existingPerson.rawEnrichmentData,
            lastEnrichedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(people.id, personId));
      }
    } else {
      // Create new person record
      const enrichmentData = await enrichPersonFromEmail(
        feedback.submitterEmail,
        feedback.submitterName || null
      );

      const [newPerson] = await db
        .insert(people)
        .values({
          workspaceId: feedback.workspaceId,
          companyId: companyId || null,
          name: enrichmentData.name || feedback.submitterName || null,
          email: feedback.submitterEmail,
          role: enrichmentData.role || feedback.submitterRole || null,
          department: enrichmentData.department || null,
          seniority: enrichmentData.seniority || null,
          linkedinUrl: enrichmentData.linkedinUrl || null,
          rawEnrichmentData: enrichmentData.rawEnrichmentData || null,
          lastEnrichedAt: new Date(),
        })
        .returning();

      personId = newPerson.id;
    }
  }

  // Step 3: Create or update customer record for feedback submitter
  // Customers are keyed by workspaceId + email (or name if no email)
  // ALWAYS create a customer, even for anonymous submissions
  console.log("Checking customer creation:", {
    feedbackId: feedback.id,
    hasEmail: !!feedback.submitterEmail,
    hasName: !!feedback.submitterName,
    email: feedback.submitterEmail,
    name: feedback.submitterName,
  });

  // Get workspace owner user ID (required for customer creation)
  const ownerUserId = await getWorkspaceOwnerUserId(feedback.workspaceId);

  if (!ownerUserId) {
    console.error(
      `No workspace owner/admin found for workspace ${feedback.workspaceId}. Cannot create customer.`
    );
    // Still return what we have so far
    return { companyId, personId, customerId: null };
  }

  console.log("Found workspace owner:", {
    workspaceId: feedback.workspaceId,
    ownerUserId,
  });

  // Try to find existing customer by email (preferred) or name
  let existingCustomer = null;

  if (feedback.submitterEmail) {
    const [customerByEmail] = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.workspaceId, feedback.workspaceId),
          eq(customers.email, feedback.submitterEmail)
        )
      )
      .limit(1);
    existingCustomer = customerByEmail;
  }

  // If not found by email, try by name (only if name is provided)
  if (!existingCustomer && feedback.submitterName) {
    const [customerByName] = await db
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.workspaceId, feedback.workspaceId),
          eq(customers.name, feedback.submitterName),
          // Only match by name if email is also null (to avoid false matches)
          sql`${customers.email} IS NULL`
        )
      )
      .limit(1);
    existingCustomer = customerByName;
  }

  // Get company data for customer record
  let companyData = null;
  if (companyId) {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, companyId))
      .limit(1);
    companyData = company;
  }

  // Get person data for customer record
  let personData = null;
  if (personId) {
    const [person] = await db
      .select()
      .from(people)
      .where(eq(people.id, personId))
      .limit(1);
    personData = person;
  }

  if (existingCustomer) {
    // Update existing customer with latest enrichment data
    customerId = existingCustomer.id;

    // Build notes with person role if available
    const personInfo = personData?.role
      ? ` (${personData.role}${
          personData.seniority ? `, ${personData.seniority}` : ""
        })`
      : "";
    const feedbackNote = `Feedback${personInfo}: ${feedback.rawText?.substring(
      0,
      200
    )}...`;

    await db
      .update(customers)
      .set({
        name:
          personData?.name || feedback.submitterName || existingCustomer.name,
        email:
          personData?.email ||
          feedback.submitterEmail ||
          existingCustomer.email,
        company:
          companyData?.name || feedback.companyName || existingCustomer.company,
        companyUrl: companyData?.website || existingCustomer.companyUrl,
        // Update notes with feedback summary if available
        notes: existingCustomer.notes
          ? `${existingCustomer.notes}\n\n${feedbackNote}`
          : feedbackNote,
        updatedAt: new Date(),
      })
      .where(eq(customers.id, customerId));
  } else {
    // Create new customer record with all enrichment data
    // For anonymous submissions, use a descriptive name
    const customerName =
      personData?.name ||
      feedback.submitterName ||
      feedback.submitterEmail ||
      `Anonymous Customer (${feedback.id.slice(0, 8)})`;
    const customerEmail = personData?.email || feedback.submitterEmail || null;
    const customerCompany = companyData?.name || feedback.companyName || null;
    const customerCompanyUrl =
      companyData?.website ||
      (companyDomain ? `https://${companyDomain}` : null);

    // Build notes with person role if available
    const personInfo = personData?.role
      ? ` (${personData.role}${
          personData.seniority ? `, ${personData.seniority}` : ""
        })`
      : "";
    const feedbackNote = `Created from feedback submission${personInfo}. Feedback: ${feedback.rawText?.substring(
      0,
      200
    )}...`;

    console.log("Creating new customer:", {
      workspaceId: feedback.workspaceId,
      ownerUserId,
      customerName,
      customerEmail,
      customerCompany,
    });

    const [newCustomer] = await db
      .insert(customers)
      .values({
        workspaceId: feedback.workspaceId,
        userId: ownerUserId,
        name: customerName,
        email: customerEmail,
        company: customerCompany,
        companyUrl: customerCompanyUrl,
        isActive: true,
        notes: feedbackNote,
      })
      .returning();

    customerId = newCustomer.id;
    console.log("Customer created successfully:", {
      customerId,
      customerName,
      customerEmail,
    });
  }

  // Step 4: Update feedback with company, person, and customer IDs
  const companyName = companyId
    ? (
        await db
          .select()
          .from(companies)
          .where(eq(companies.id, companyId))
          .limit(1)
      )[0]?.name || null
    : null;

  await db
    .update(feedbacks)
    .set({
      companyId: companyId,
      personId: personId,
      customerId: customerId,
      // Denormalize for quick access
      companyName: companyName,
      companyDomain: companyDomain || null,
      updatedAt: new Date(),
    })
    .where(eq(feedbacks.id, feedbackId));

  return { companyId, personId, customerId };
}

/**
 * Extract domain from email address
 */
function extractDomainFromEmail(email: string | null): string | null {
  if (!email || !email.includes("@")) return null;
  return email.split("@")[1]?.toLowerCase() || null;
}

/**
 * Calculate ICP score for a company
 *
 * @param companyId - ID of the company to score
 * @param icpConfig - ICP configuration (defaults to DEFAULT_ICP_CONFIG)
 * @returns ICP score result
 */
export async function calculateICPScoreForCompany(
  companyId: string,
  icpConfig: ICPConfig = DEFAULT_ICP_CONFIG
): Promise<ICPScoreResult> {
  const [company] = await db
    .select()
    .from(companies)
    .where(eq(companies.id, companyId))
    .limit(1);

  if (!company) {
    throw new Error(`Company not found: ${companyId}`);
  }

  let score = 0;
  const reasons: string[] = [];
  const maxScore = 100;

  // Industry match (0-30 points)
  if (company.industry) {
    const industryMatch = icpConfig.targetIndustries.some((target) =>
      company.industry?.toLowerCase().includes(target.toLowerCase())
    );
    if (industryMatch) {
      score += 30;
      reasons.push(`Industry match: ${company.industry}`);
    } else {
      reasons.push(`Industry mismatch: ${company.industry}`);
    }
  } else {
    reasons.push("Industry unknown");
  }

  // Employee count match (0-30 points)
  if (company.employeeCount) {
    const minMatch = company.employeeCount >= icpConfig.minEmployees;
    const maxMatch =
      icpConfig.maxEmployees === 0 ||
      company.employeeCount <= icpConfig.maxEmployees;

    if (minMatch && maxMatch) {
      score += 30;
      reasons.push(`Employee count in range: ${company.employeeCount}`);
    } else if (minMatch) {
      score += 15; // Partial match
      reasons.push(`Employee count above minimum: ${company.employeeCount}`);
    } else {
      reasons.push(`Employee count out of range: ${company.employeeCount}`);
    }
  } else {
    reasons.push("Employee count unknown");
  }

  // Region match (0-20 points)
  if (company.location) {
    const regionMatch = icpConfig.targetRegions.some((target) =>
      company.location?.toLowerCase().includes(target.toLowerCase())
    );
    if (regionMatch) {
      score += 20;
      reasons.push(`Region match: ${company.location}`);
    } else {
      reasons.push(`Region mismatch: ${company.location}`);
    }
  } else {
    reasons.push("Region unknown");
  }

  // Revenue match (0-20 points) - optional
  if (icpConfig.minRevenue && company.revenue) {
    // Simple revenue comparison (can be enhanced)
    const revenueMatch = true; // TODO: Implement proper revenue range comparison
    if (revenueMatch) {
      score += 20;
      reasons.push(`Revenue in range: ${company.revenue}`);
    }
  }

  // Determine label
  let icpMatchLabel: "Strong ICP" | "Medium ICP" | "Non-ICP" | "Unknown";
  if (score >= 70) {
    icpMatchLabel = "Strong ICP";
  } else if (score >= 40) {
    icpMatchLabel = "Medium ICP";
  } else if (score > 0) {
    icpMatchLabel = "Non-ICP";
  } else {
    icpMatchLabel = "Unknown";
  }

  return {
    icpScore: Math.min(score, maxScore),
    icpMatchLabel,
    reasons,
  };
}

/**
 * Recalculate value score for a feedback entry
 *
 * Formula: valueScore = icpScore * importanceMultiplier * sentimentMultiplier * roleMultiplier
 *
 * @param feedbackId - ID of the feedback entry to score
 */
export async function recalculateValueScoreForFeedback(
  feedbackId: string
): Promise<number> {
  // Load feedback with related company and person data
  const [feedback] = await db
    .select()
    .from(feedbacks)
    .where(eq(feedbacks.id, feedbackId))
    .limit(1);

  if (!feedback) {
    throw new Error(`Feedback not found: ${feedbackId}`);
  }

  // Get ICP score (calculate if not set)
  let icpScore = feedback.icpScore || 0;
  if (feedback.companyId && !feedback.icpScore) {
    const icpResult = await calculateICPScoreForCompany(feedback.companyId);
    icpScore = icpResult.icpScore;

    // Update feedback with ICP score
    await db
      .update(feedbacks)
      .set({
        icpScore: icpResult.icpScore,
        icpMatchLabel: icpResult.icpMatchLabel,
        updatedAt: new Date(),
      })
      .where(eq(feedbacks.id, feedbackId));
  }

  // Calculate multipliers
  const multipliers = await calculateValueScoreMultipliers(feedbackId);

  // Calculate value score
  const valueScore = Math.round(
    icpScore *
      multipliers.importanceMultiplier *
      multipliers.sentimentMultiplier *
      multipliers.roleMultiplier *
      (multipliers.urgencyMultiplier || 1)
  );

  // Clamp to 0-100
  const clampedScore = Math.max(0, Math.min(100, valueScore));

  // Update feedback
  await db
    .update(feedbacks)
    .set({
      valueScore: clampedScore,
      updatedAt: new Date(),
    })
    .where(eq(feedbacks.id, feedbackId));

  return clampedScore;
}

/**
 * Calculate value score multipliers for a feedback entry
 */
async function calculateValueScoreMultipliers(
  feedbackId: string
): Promise<ValueScoreMultipliers> {
  const [feedback] = await db
    .select()
    .from(feedbacks)
    .where(eq(feedbacks.id, feedbackId))
    .limit(1);

  if (!feedback) {
    throw new Error(`Feedback not found: ${feedbackId}`);
  }

  // Importance multiplier (based on company size, ARR, etc.)
  let importanceMultiplier = 1.0;
  if (feedback.companyId) {
    const [company] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, feedback.companyId))
      .limit(1);

    if (company) {
      // Higher multiplier for larger companies
      if (company.employeeCount) {
        if (company.employeeCount >= 500) {
          importanceMultiplier = 1.5; // Enterprise
        } else if (company.employeeCount >= 200) {
          importanceMultiplier = 1.3; // Mid-market
        } else if (company.employeeCount >= 50) {
          importanceMultiplier = 1.1; // SMB
        }
      }

      // Higher multiplier for enterprise plan tier
      if (company.planTier === "enterprise") {
        importanceMultiplier *= 1.2;
      }
    }
  }

  // Sentiment multiplier (negative feedback is more valuable)
  let sentimentMultiplier = 1.0;
  if (feedback.sentiment) {
    const sentimentLower = feedback.sentiment.toLowerCase();
    if (
      sentimentLower.includes("negative") ||
      sentimentLower.includes("critical")
    ) {
      sentimentMultiplier = 1.5; // Negative feedback is more valuable
    } else if (sentimentLower.includes("positive")) {
      sentimentMultiplier = 0.8; // Positive feedback is less urgent
    }
  }

  // Role multiplier (higher multiplier for senior roles)
  let roleMultiplier = 1.0;
  if (feedback.personId) {
    const [person] = await db
      .select()
      .from(people)
      .where(eq(people.id, feedback.personId))
      .limit(1);

    if (person?.seniority) {
      switch (person.seniority) {
        case "C-level":
          roleMultiplier = 1.5;
          break;
        case "VP":
          roleMultiplier = 1.3;
          break;
        case "Director":
          roleMultiplier = 1.2;
          break;
        case "Manager":
          roleMultiplier = 1.1;
          break;
        default:
          roleMultiplier = 1.0;
      }
    }
  }

  return {
    importanceMultiplier,
    sentimentMultiplier,
    roleMultiplier,
  };
}

/**
 * Generate tasks from feedback using LLM
 *
 * This function:
 * 1. Loads feedback with context (company, person, scores)
 * 2. Calls LLM to generate structured tasks
 * 3. Creates task records in the database
 *
 * @param feedbackId - ID of the feedback entry
 * @returns Array of generated task IDs
 */
export async function generateTasksFromFeedback(
  feedbackId: string
): Promise<string[]> {
  // Load feedback with context
  const [feedback] = await db
    .select()
    .from(feedbacks)
    .where(eq(feedbacks.id, feedbackId))
    .limit(1);

  if (!feedback) {
    throw new Error(`Feedback not found: ${feedbackId}`);
  }

  // Load company data if available
  let company = null;
  if (feedback.companyId) {
    const [companyData] = await db
      .select()
      .from(companies)
      .where(eq(companies.id, feedback.companyId))
      .limit(1);
    company = companyData;
  }

  // Load person data if available
  let person = null;
  if (feedback.personId) {
    const [personData] = await db
      .select()
      .from(people)
      .where(eq(people.id, feedback.personId))
      .limit(1);
    person = personData;
  }

  // Build context for LLM
  const context: FeedbackWithContext = {
    id: feedback.id,
    workspaceId: feedback.workspaceId,
    rawText: feedback.rawText || feedback.rawFeedback || "",
    sentiment: feedback.sentiment,
    urgency: feedback.urgency,
    companyId: feedback.companyId || null,
    personId: feedback.personId || null,
    company: company
      ? {
          name: company.name,
          domain: company.domain,
          industry: company.industry,
          employeeCount: company.employeeCount,
          revenue: company.revenue,
          planTier: company.planTier,
        }
      : null,
    person: person
      ? {
          name: person.name,
          email: person.email,
          role: person.role,
          seniority: person.seniority,
        }
      : null,
  };

  // Generate tasks using LLM (mocked for now)
  const generatedTasks = await generateTasksFromFeedbackLLM(context);

  // Create task records
  const taskIds: string[] = [];
  for (const task of generatedTasks) {
    const [createdTask] = await db
      .insert(tasks)
      .values({
        feedbackId: feedbackId,
        title: task.title,
        description: task.description,
        reason: task.description, // Use description as reason for now
        category: task.category,
        suggestedOwner: task.suggestedOwner,
        impactEstimate: task.impactEstimate,
        effortEstimate: task.effortEstimate,
        priority: mapImpactToPriority(task.impactEstimate),
        estimatedTimeMinutes: mapEffortToMinutes(task.effortEstimate),
        status: "todo",
      })
      .returning();

    if (createdTask) {
      taskIds.push(createdTask.id);
    }
  }

  return taskIds;
}

/**
 * Generate tasks from feedback using LLM (mocked implementation)
 *
 * TODO: Replace with real LLM API call (OpenAI, Anthropic, etc.)
 */
async function generateTasksFromFeedbackLLM(
  feedback: FeedbackWithContext
): Promise<GeneratedTask[]> {
  // Mock implementation - returns 1-3 tasks based on feedback content
  // In production, this would call an LLM API with a prompt like:
  // "Given this feedback from [company] ([industry], [employees] employees)
  //  from [person] ([role], [seniority]), generate 1-3 actionable tasks..."

  const tasks: GeneratedTask[] = [];
  const feedbackText = feedback.rawText.toLowerCase();

  // Simple keyword-based task generation (replace with LLM)
  if (
    feedbackText.includes("bug") ||
    feedbackText.includes("error") ||
    feedbackText.includes("broken")
  ) {
    tasks.push({
      id: crypto.randomUUID(),
      feedbackId: feedback.id,
      title: "Fix reported bug",
      description: feedback.rawText.substring(0, 200),
      category: "bug",
      suggestedOwner: "engineering",
      impactEstimate: "high",
      effortEstimate: "medium",
      createdAt: new Date(),
    });
  }

  if (
    feedbackText.includes("feature") ||
    feedbackText.includes("add") ||
    feedbackText.includes("want")
  ) {
    tasks.push({
      id: crypto.randomUUID(),
      feedbackId: feedback.id,
      title: "Consider feature request",
      description: feedback.rawText.substring(0, 200),
      category: "feature_request",
      suggestedOwner: "product",
      impactEstimate: "medium",
      effortEstimate: "high",
      createdAt: new Date(),
    });
  }

  if (
    feedbackText.includes("design") ||
    feedbackText.includes("ui") ||
    feedbackText.includes("ux")
  ) {
    tasks.push({
      id: crypto.randomUUID(),
      feedbackId: feedback.id,
      title: "Review UX feedback",
      description: feedback.rawText.substring(0, 200),
      category: "ux",
      suggestedOwner: "design",
      impactEstimate: "medium",
      effortEstimate: "low",
      createdAt: new Date(),
    });
  }

  // If no tasks generated, create a generic one
  if (tasks.length === 0) {
    tasks.push({
      id: crypto.randomUUID(),
      feedbackId: feedback.id,
      title: "Review feedback",
      description: feedback.rawText.substring(0, 200),
      category: "other",
      suggestedOwner: "product",
      impactEstimate: "medium",
      effortEstimate: "medium",
      createdAt: new Date(),
    });
  }

  return tasks;
}

/**
 * Map impact estimate to priority
 */
function mapImpactToPriority(
  impact: "low" | "medium" | "high"
): "High" | "Medium" | "Low" {
  switch (impact) {
    case "high":
      return "High";
    case "medium":
      return "Medium";
    case "low":
      return "Low";
  }
}

/**
 * Map effort estimate to minutes
 */
function mapEffortToMinutes(effort: "low" | "medium" | "high"): number {
  switch (effort) {
    case "low":
      return 30;
    case "medium":
      return 120;
    case "high":
      return 480; // 8 hours
  }
}
