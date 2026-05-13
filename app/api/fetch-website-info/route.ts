import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    // Normalize URL (add https:// if no protocol)
    let normalizedUrl = url.trim();
    if (
      !normalizedUrl.startsWith("http://") &&
      !normalizedUrl.startsWith("https://")
    ) {
      normalizedUrl = `https://${normalizedUrl}`;
    }

    // Validate URL format
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(normalizedUrl);
    } catch {
      return NextResponse.json(
        { error: "Invalid URL format" },
        { status: 400 }
      );
    }

    // Fetch the HTML
    const response = await fetch(normalizedUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
      // Set a timeout
      signal: AbortSignal.timeout(10000), // 10 seconds
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch website: ${response.statusText}` },
        { status: response.status }
      );
    }

    const html = await response.text();

    // Extract title
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : null;

    // Extract favicon
    // Try multiple methods:
    // 1. Look for <link rel="icon" ...>
    // 2. Look for <link rel="shortcut icon" ...>
    // 3. Look for <link rel="apple-touch-icon" ...>
    // 4. Default to /favicon.ico
    let faviconUrl: string | null = null;

    // Try to find favicon in link tags
    const faviconMatch = html.match(
      /<link[^>]+rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]+href=["']([^"']+)["']/i
    );

    if (faviconMatch) {
      faviconUrl = faviconMatch[1];
      // If it's a relative URL, make it absolute
      if (faviconUrl.startsWith("/")) {
        faviconUrl = `${parsedUrl.origin}${faviconUrl}`;
      } else if (!faviconUrl.startsWith("http")) {
        faviconUrl = new URL(faviconUrl, normalizedUrl).href;
      }
    } else {
      // Default to /favicon.ico
      faviconUrl = `${parsedUrl.origin}/favicon.ico`;
    }

    // Clean up title (remove common suffixes like " - Home", " | Company", etc.)
    let cleanedTitle = title;
    if (cleanedTitle) {
      // Remove common separators and suffixes
      cleanedTitle = cleanedTitle
        .replace(/\s*[-|–—]\s*.*$/, "") // Remove everything after dash/pipe
        .replace(/\s*\|\s*.*$/, "") // Remove everything after pipe
        .replace(/\s*:\s*.*$/, "") // Remove everything after colon (sometimes)
        .trim();
    }

    return NextResponse.json({
      title: cleanedTitle,
      faviconUrl,
      originalTitle: title,
    });
  } catch (error) {
    console.error("Error fetching website info:", error);

    if (error instanceof Error) {
      if (error.name === "AbortError" || error.message.includes("timeout")) {
        return NextResponse.json(
          { error: "Request timed out. Please check the URL and try again." },
          { status: 408 }
        );
      }
      if (error.message.includes("Invalid URL")) {
        return NextResponse.json(
          { error: "Invalid URL format" },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "An error occurred while fetching website information",
      },
      { status: 500 }
    );
  }
}
