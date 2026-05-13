"use client";

const GENERIC_EMAIL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "icloud.com",
  "aol.com",
  "mail.com",
  "protonmail.com",
  "yandex.com",
  "zoho.com",
  "gmx.com",
  "live.com",
  "msn.com",
  "me.com",
  "mac.com",
];

function extractDomainFromEmail(email?: string | null): string | null {
  if (!email) return null;
  const match = email.match(/@(.+)$/);
  const domain = match ? match[1].toLowerCase() : null;
  if (!domain || GENERIC_EMAIL_DOMAINS.includes(domain)) {
    return null;
  }
  return domain;
}

function buildCompanyUrl(company?: string | null): string | null {
  if (!company) return null;
  const trimmed = company.trim();
  if (!trimmed) return null;
  const lower = trimmed.toLowerCase();
  const hasProtocol =
    lower.startsWith("http://") || lower.startsWith("https://");
  const hasDomain = trimmed.includes(".");
  if (hasDomain) {
    return hasProtocol ? trimmed : `https://${trimmed}`;
  }
  const normalized = trimmed.replace(/[^a-zA-Z0-9]/g, "");
  if (!normalized) return null;
  return `https://${normalized.toLowerCase()}.com`;
}

export function deriveCompanyUrl(
  company?: string | null,
  email?: string | null
): string | null {
  const emailDomain = extractDomainFromEmail(email || undefined);
  if (emailDomain) {
    return `https://${emailDomain}`;
  }
  return buildCompanyUrl(company);
}

function extractDomainFromUrl(url?: string | null): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return null;
  }
}

export async function fetchFaviconUrlForCustomer(
  company?: string | null,
  email?: string | null,
  explicitCompanyUrl?: string | null
): Promise<string | null> {
  const normalizedExplicitUrl = explicitCompanyUrl?.trim();
  const potentialUrl =
    normalizedExplicitUrl || deriveCompanyUrl(company, email);
  if (!potentialUrl) return null;

  try {
    const response = await fetch("/api/fetch-website-info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: potentialUrl }),
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.faviconUrl || null;
  } catch (error) {
    console.error("Failed to fetch favicon URL", error);
    return null;
  }
}

export function getFallbackFaviconUrl(
  company?: string | null,
  email?: string | null
): string | null {
  const emailDomain = extractDomainFromEmail(email || undefined);
  if (emailDomain) {
    return `https://www.google.com/s2/favicons?domain=${emailDomain}&sz=64`;
  }
  const companyUrl = buildCompanyUrl(company);
  const hostname = extractDomainFromUrl(companyUrl);
  if (!hostname) return null;
  return `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
}

export function getInitialsFallback(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (
    parts[0].charAt(0).toUpperCase() +
    parts[parts.length - 1].charAt(0).toUpperCase()
  );
}
