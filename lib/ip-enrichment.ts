/**
 * IP Enrichment using People Data Labs API
 * Provides enriched data including location, company, and ISP information
 */

interface IPEnrichmentResult {
  country?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  companyName?: string | null;
  companyDomain?: string | null;
  companyIndustry?: string | null;
  isp?: string | null;
  connectionType?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface PersonEnrichmentResult {
  jobTitle?: string | null;
  jobTitleLevels?: string[] | null;
  jobCompanyName?: string | null;
  jobCompanyDomain?: string | null;
  jobCompanyWebsite?: string | null;
  jobCompanyIndustry?: string | null;
  jobCompanyLocation?: string | null;
  jobStartDate?: string | null;
  jobEndDate?: string | null;
  experience?: Array<{
    title?: string;
    company?: string;
    startDate?: string;
    endDate?: string;
  }> | null;
  education?: Array<{
    school?: string;
    degrees?: string[];
    startDate?: string;
    endDate?: string;
  }> | null;
  profiles?: Array<{
    network?: string;
    url?: string;
    username?: string;
  }> | null;
  names?: Array<{
    first?: string;
    last?: string;
    middle?: string;
  }> | null;
  locations?: Array<{
    name?: string;
    locality?: string;
    region?: string;
    country?: string;
  }> | null;
  emails?: Array<{
    address?: string;
    type?: string;
  }> | null;
  phoneNumbers?: Array<{
    number?: string;
    type?: string;
  }> | null;
  skills?: string[] | null;
  interests?: string[] | null;
  languages?: string[] | null;
  networkMembers?: Array<{
    name?: string;
    jobTitle?: string;
    company?: string;
    email?: string;
    linkedinUrl?: string;
  }> | null;
  rawPersonData?: string | null; // Store full JSON for future use
}

/**
 * Enrich IP address using People Data Labs IP Enrichment API
 * Falls back to ipapi.co if PDL is not configured
 */
export async function enrichIPAddress(
  ip: string | null
): Promise<IPEnrichmentResult> {
  // Skip private/local IPs (both IPv4 and IPv6)
  if (
    !ip ||
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "localhost" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.16.") ||
    ip.startsWith("172.17.") ||
    ip.startsWith("172.18.") ||
    ip.startsWith("172.19.") ||
    ip.startsWith("172.20.") ||
    ip.startsWith("172.21.") ||
    ip.startsWith("172.22.") ||
    ip.startsWith("172.23.") ||
    ip.startsWith("172.24.") ||
    ip.startsWith("172.25.") ||
    ip.startsWith("172.26.") ||
    ip.startsWith("172.27.") ||
    ip.startsWith("172.28.") ||
    ip.startsWith("172.29.") ||
    ip.startsWith("172.30.") ||
    ip.startsWith("172.31.") ||
    ip.startsWith("fe80:") || // IPv6 link-local
    ip.startsWith("fc00:") || // IPv6 private
    ip.startsWith("fd00:") // IPv6 private
  ) {
    return {};
  }

  const pdlApiKey = process.env.PDL_API_KEY;

  // Use PDL if API key is configured
  // Note: PDL only supports IPv4 addresses, skip IPv6
  if (pdlApiKey && !ip.includes(":")) {
    try {
      const response = await fetch(
        `https://api.peopledatalabs.com/v5/ip/enrich?ip=${encodeURIComponent(
          ip
        )}`,
        {
          headers: {
            "X-Api-Key": pdlApiKey,
            "User-Agent": "FeedbackApp/1.0",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();

        // Extract enriched data from PDL response
        // PDL IP enrichment returns data in the root object
        return {
          country: data.country || data.country_name || null,
          city: data.city || null,
          state: data.state || data.region || null,
          postalCode: data.postal_code || data.postal || null,
          companyName: data.company?.name || data.organization || null,
          companyDomain: data.company?.domain || null,
          companyIndustry: data.company?.industry || null,
          isp: data.isp || data.organization || null,
          connectionType: data.connection_type || data.type || null,
          latitude: data.latitude || null,
          longitude: data.longitude || null,
        };
      } else {
        // PDL returns 400 for hosting providers, proxies, Tor, etc. - this is expected
        // PDL returns 402 when account limits are hit - silently ignore
        // Fall through to ipapi.co for basic geolocation
        if (response.status === 402) {
          // Payment required / account limits hit - silently skip
        } else {
          const errorData = await response.json().catch(() => ({}));
          if (
            errorData.error?.message?.includes("Cannot Enrich IP") ||
            errorData.error?.message?.includes("Hosting Provider") ||
            errorData.error?.message?.includes("Proxy")
          ) {
            // Expected error for certain IP types, will fall back to ipapi.co
          } else {
            console.error(
              `PDL API error: ${response.status} ${response.statusText}`,
              JSON.stringify(errorData)
            );
          }
        }
      }
    } catch (error) {
      console.error("Error calling PDL API:", error);
    }
  }

  // Fallback to ipapi.co for basic country/city info
  try {
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: { "User-Agent": "FeedbackApp/1.0" },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        country: data.country_name || null,
        city: data.city || null,
        state: data.region || null,
        postalCode: data.postal || null,
        latitude: data.latitude || null,
        longitude: data.longitude || null,
        isp: data.org || null,
      };
    }
  } catch (error) {
    console.error("Error fetching IP data:", error);
  }

  return {};
}

/**
 * Enrich company data using People Data Labs Company Enrichment API
 * Uses company domain to get detailed company information
 */
export async function enrichCompanyData(domain: string | null): Promise<{
  companyName?: string | null;
  companyWebsite?: string | null;
  companyIndustry?: string | null;
  companyDescription?: string | null;
  companyEmployees?: number | null;
  companyRevenue?: string | null;
  companyFounded?: number | null;
  companyLocation?: string | null;
  companyLinkedinUrl?: string | null;
  companyTwitterUrl?: string | null;
  companyFacebookUrl?: string | null;
  companyEmployeesList?: Array<{
    name?: string;
    jobTitle?: string;
    email?: string;
    linkedinUrl?: string;
  }> | null;
  rawCompanyData?: string | null;
}> {
  if (!domain || !domain.includes(".")) {
    return {};
  }

  const pdlApiKey = process.env.PDL_API_KEY;
  if (!pdlApiKey) {
    return {};
  }

  try {
    const response = await fetch(
      `https://api.peopledatalabs.com/v5/company/enrich?website=${encodeURIComponent(
        domain
      )}`,
      {
        headers: {
          "X-Api-Key": pdlApiKey,
          "User-Agent": "FeedbackApp/1.0",
        },
      }
    );

    if (response.ok) {
      const data = await response.json();

      return {
        companyName: data.name || null,
        companyWebsite: data.website || null,
        companyIndustry: data.industry || null,
        companyDescription: data.description || null,
        companyEmployees: data.employees || null,
        companyRevenue: data.revenue || null,
        companyFounded: data.founded || null,
        companyLocation: data.location?.name || null,
        companyLinkedinUrl:
          data.profiles?.find((p: any) => p.network === "linkedin")?.url ||
          null,
        companyTwitterUrl:
          data.profiles?.find((p: any) => p.network === "twitter")?.url || null,
        companyFacebookUrl:
          data.profiles?.find((p: any) => p.network === "facebook")?.url ||
          null,
        companyEmployeesList:
          data.employees_list?.slice(0, 20).map((emp: any) => ({
            name: emp.full_name,
            jobTitle: emp.job_title,
            email: emp.emails?.[0]?.address,
            linkedinUrl: emp.profiles?.find(
              (p: any) => p.network === "linkedin"
            )?.url,
          })) || null,
        rawCompanyData: JSON.stringify(data),
      };
    } else if (response.status !== 402) {
      const errorData = await response.json().catch(() => ({}));
      console.error(
        `PDL Company Enrichment API error: ${response.status} ${response.statusText}`,
        JSON.stringify(errorData)
      );
    }
  } catch (error) {
    console.error("Error calling PDL Company Enrichment API:", error);
  }

  return {};
}

/**
 * Enrich person data using People Data Labs Person Enrichment API
 * Uses email address, name, and location to get job title, companies, network members, etc.
 * Tries multiple strategies to get the most complete data possible.
 */
export async function enrichPersonData(
  email: string | null,
  fullName?: string | null,
  location?: {
    city?: string | null;
    state?: string | null;
    country?: string | null;
  }
): Promise<PersonEnrichmentResult> {
  const pdlApiKey = process.env.PDL_API_KEY;
  if (!pdlApiKey) {
    return {};
  }

  // Strategy 1: Try email enrichment first (most reliable)
  if (email && email.includes("@")) {
    try {
      const response = await fetch(
        `https://api.peopledatalabs.com/v5/person/enrich?email=${encodeURIComponent(
          email
        )}`,
        {
          headers: {
            "X-Api-Key": pdlApiKey,
            "User-Agent": "FeedbackApp/1.0",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();

        // Extract person enrichment data
        const result: PersonEnrichmentResult = {
          jobTitle: data.job_title || null,
          jobTitleLevels: data.job_title_levels || null,
          jobCompanyName: data.job_company_name || null,
          jobCompanyDomain: data.job_company_domain || null,
          jobCompanyWebsite: data.job_company_website || null,
          jobCompanyIndustry: data.job_company_industry || null,
          jobCompanyLocation: data.job_company_location?.name || null,
          jobStartDate: data.job_start_date || null,
          jobEndDate: data.job_end_date || null,
          experience:
            data.experiences?.map((exp: any) => ({
              title: exp.title,
              company: exp.company?.name,
              startDate: exp.start_date,
              endDate: exp.end_date,
            })) || null,
          education:
            data.education?.map((edu: any) => ({
              school: edu.school?.name,
              degrees: edu.degrees,
              startDate: edu.start_date,
              endDate: edu.end_date,
            })) || null,
          profiles:
            data.profiles?.map((profile: any) => ({
              network: profile.network,
              url: profile.url,
              username: profile.username,
            })) || null,
          names:
            data.names?.map((name: any) => ({
              first: name.first,
              last: name.last,
              middle: name.middle,
            })) || null,
          locations:
            data.locations?.map((loc: any) => ({
              name: loc.name,
              locality: loc.locality,
              region: loc.region,
              country: loc.country,
            })) || null,
          emails:
            data.emails?.map((email: any) => ({
              address: email.address,
              type: email.type,
            })) || null,
          phoneNumbers:
            data.phone_numbers?.map((phone: any) => ({
              number: phone.number,
              type: phone.type,
            })) || null,
          skills: data.skills || null,
          interests: data.interests || null,
          languages: data.languages || null,
          networkMembers:
            data.people_also_viewed?.slice(0, 10).map((person: any) => ({
              name: person.full_name,
              jobTitle: person.job_title,
              company: person.job_company_name,
              email: person.emails?.[0]?.address,
              linkedinUrl: person.profiles?.find(
                (p: any) => p.network === "linkedin"
              )?.url,
            })) || null,
          rawPersonData: JSON.stringify(data), // Store full response for future use
        };

        return result;
      } else if (response.status !== 402) {
        const errorData = await response.json().catch(() => ({}));
        console.error(
          `PDL Person Enrichment API error (email): ${response.status} ${response.statusText}`,
          JSON.stringify(errorData)
        );
      }
    } catch (error) {
      console.error("Error calling PDL Person Enrichment API (email):", error);
    }
  }

  // Strategy 2: Try name + location if email didn't work or wasn't available
  if (
    fullName &&
    location &&
    (location.city || location.state || location.country)
  ) {
    try {
      // Build query params for name + location search
      const params = new URLSearchParams();
      if (fullName) {
        // Try to parse name into first and last
        const nameParts = fullName.trim().split(/\s+/);
        if (nameParts.length >= 2) {
          params.append("first_name", nameParts[0]);
          params.append("last_name", nameParts.slice(1).join(" "));
        } else {
          params.append("full_name", fullName);
        }
      }
      if (location.city) params.append("city", location.city);
      if (location.state) params.append("region", location.state);
      if (location.country) params.append("country", location.country);

      const response = await fetch(
        `https://api.peopledatalabs.com/v5/person/search?${params.toString()}`,
        {
          headers: {
            "X-Api-Key": pdlApiKey,
            "User-Agent": "FeedbackApp/1.0",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();

        // If we got results, use the first match
        if (data.data && data.data.length > 0) {
          const person = data.data[0];

          return {
            jobTitle: person.job_title || null,
            jobTitleLevels: person.job_title_levels || null,
            jobCompanyName: person.job_company_name || null,
            jobCompanyDomain: person.job_company_domain || null,
            jobCompanyWebsite: person.job_company_website || null,
            jobCompanyIndustry: person.job_company_industry || null,
            jobCompanyLocation: person.job_company_location?.name || null,
            jobStartDate: person.job_start_date || null,
            jobEndDate: person.job_end_date || null,
            experience:
              person.experiences?.map((exp: any) => ({
                title: exp.title,
                company: exp.company?.name,
                startDate: exp.start_date,
                endDate: exp.end_date,
              })) || null,
            education:
              person.education?.map((edu: any) => ({
                school: edu.school?.name,
                degrees: edu.degrees,
                startDate: edu.start_date,
                endDate: edu.end_date,
              })) || null,
            profiles:
              person.profiles?.map((profile: any) => ({
                network: profile.network,
                url: profile.url,
                username: profile.username,
              })) || null,
            names:
              person.names?.map((name: any) => ({
                first: name.first,
                last: name.last,
                middle: name.middle,
              })) || null,
            locations:
              person.locations?.map((loc: any) => ({
                name: loc.name,
                locality: loc.locality,
                region: loc.region,
                country: loc.country,
              })) || null,
            emails:
              person.emails?.map((email: any) => ({
                address: email.address,
                type: email.type,
              })) || null,
            phoneNumbers:
              person.phone_numbers?.map((phone: any) => ({
                number: phone.number,
                type: phone.type,
              })) || null,
            skills: person.skills || null,
            interests: person.interests || null,
            languages: person.languages || null,
            networkMembers:
              person.people_also_viewed?.slice(0, 10).map((p: any) => ({
                name: p.full_name,
                jobTitle: p.job_title,
                company: p.job_company_name,
                email: p.emails?.[0]?.address,
                linkedinUrl: p.profiles?.find(
                  (profile: any) => profile.network === "linkedin"
                )?.url,
              })) || null,
            rawPersonData: JSON.stringify(person),
          };
        }
      } else if (response.status !== 402) {
        const errorData = await response.json().catch(() => ({}));
        console.error(
          `PDL Person Search API error: ${response.status} ${response.statusText}`,
          JSON.stringify(errorData)
        );
      }
    } catch (error) {
      console.error("Error calling PDL Person Search API:", error);
    }
  }

  return {};
}
