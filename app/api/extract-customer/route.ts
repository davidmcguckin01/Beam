import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { requireWorkspaceContext } from "@/lib/api-helpers";

/**
 * Extract domain from a URL, normalizing www subdomains
 */
function extractDomain(url: string | null | undefined): string | null {
  if (!url) return null;

  try {
    // Add protocol if missing
    let urlWithProtocol = url;
    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      urlWithProtocol = `https://${url}`;
    }

    const urlObj = new URL(urlWithProtocol);
    let hostname = urlObj.hostname.toLowerCase();

    // Remove www. prefix for consistent comparison
    if (hostname.startsWith("www.")) {
      hostname = hostname.substring(4);
    }

    return hostname;
  } catch (error) {
    // If URL parsing fails, try to extract domain manually
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?([^\/\s]+)/);
    if (match) {
      let domain = match[1].toLowerCase();
      // Remove www. prefix if present
      if (domain.startsWith("www.")) {
        domain = domain.substring(4);
      }
      return domain;
    }
    return null;
  }
}

/**
 * Extract domain from an email address
 */
function extractEmailDomain(email: string): string | null {
  const match = email.match(/@(.+)$/);
  return match ? match[1].toLowerCase() : null;
}

export async function POST(request: NextRequest) {
  try {
    // Get workspace context
    const result = await requireWorkspaceContext();
    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }
    const { context } = result;
    const { workspace } = context;

    // Validate API key
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured" },
        { status: 500 }
      );
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Parse request body
    const body = await request.json();
    const { text } = body;

    if (!text || typeof text !== "string" || !text.trim()) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // System prompt
    const systemPrompt = `You are a customer information extraction assistant. Extract customer information from text (like emails, screenshots, or messages).`;

    // User prompt
    const userPrompt = `Extract customer information from the following text. Look for:
- Customer name (person's name)
- Email address
- Company name

If any information is found, return it in JSON format. If information is not found or unclear, return null for that field.

Text to analyze:
\`\`\`text
${text}
\`\`\`

Return ONLY valid JSON with this structure:
\`\`\`json
{
  "name": "string or null",
  "email": "string or null",
  "company": "string or null"
}
\`\`\`

Do not include any explanation or extra text; only return JSON.`;

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const responseContent = completion.choices[0]?.message?.content;
    if (!responseContent) {
      throw new Error("No response from OpenAI");
    }

    // Parse JSON response
    let parsedResponse;
    try {
      parsedResponse = JSON.parse(responseContent);
    } catch (parseError) {
      const jsonMatch = responseContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedResponse = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("Invalid JSON response from OpenAI");
      }
    }

    // Validate and clean response
    let extractedEmail =
      parsedResponse.email && typeof parsedResponse.email === "string"
        ? parsedResponse.email.trim() || null
        : null;

    // Filter out emails with the same domain as the workspace company URL
    if (extractedEmail && workspace.companyUrl) {
      const workspaceDomain = extractDomain(workspace.companyUrl);
      const emailDomain = extractEmailDomain(extractedEmail);

      if (workspaceDomain && emailDomain && workspaceDomain === emailDomain) {
        // Ignore email if it matches the workspace domain
        extractedEmail = null;
      }
    }

    const extractedInfo = {
      name:
        parsedResponse.name && typeof parsedResponse.name === "string"
          ? parsedResponse.name.trim() || null
          : null,
      email: extractedEmail,
      company:
        parsedResponse.company && typeof parsedResponse.company === "string"
          ? parsedResponse.company.trim() || null
          : null,
    };

    return NextResponse.json({ customer: extractedInfo });
  } catch (error) {
    console.error("Customer extraction error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while extracting customer information",
      },
      { status: 500 }
    );
  }
}
