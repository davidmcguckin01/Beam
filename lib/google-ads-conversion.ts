/**
 * Google Ads Conversion Tracking
 * Server-side conversion tracking using Google Ads Conversion API
 * This is more accurate than client-side tracking as it's not blocked by ad blockers
 * 
 * Uses the Measurement Protocol endpoint for server-side tracking
 * 
 * According to Google Ads documentation:
 * - Enhanced Conversions improve conversion measurement accuracy by matching conversions to ad clicks
 * - User data (email, phone, name) should be hashed with SHA256 before sending
 * - Enhanced Conversions can be sent via Google tag (frontend) or Conversion API (backend)
 */

interface ConversionData {
  conversionId: string; // e.g., "AW-17741868305"
  conversionLabel: string; // e.g., "C9qsCMXPxsIbEJHa_YtC"
  transactionId: string; // Unique transaction ID
  value?: number; // Conversion value
  currency?: string; // Currency code (e.g., "GBP", "USD")
  email?: string; // Customer email for Enhanced Conversions (will be hashed)
  phoneNumber?: string; // Customer phone for Enhanced Conversions (will be hashed)
  firstName?: string; // Customer first name for Enhanced Conversions (will be hashed)
  lastName?: string; // Customer last name for Enhanced Conversions (will be hashed)
  gclid?: string; // Google Click ID if available
}

/**
 * Send conversion event to Google Ads Conversion API
 * Uses the Measurement Protocol endpoint for server-side tracking
 * 
 * Note: The Measurement Protocol endpoint supports basic conversion tracking.
 * For full Enhanced Conversions with hashed user data, you would need to use
 * the Google Ads API (OfflineConversionUploadService) which requires OAuth setup.
 * 
 * However, we can still send Enhanced Conversions data via the Google tag on the frontend,
 * which is the recommended approach per Google's documentation.
 */
export async function trackGoogleAdsConversion(data: ConversionData): Promise<boolean> {
  try {
    const { conversionId, conversionLabel, transactionId, value, currency, gclid } = data;

    // Build query parameters for the conversion endpoint
    const params = new URLSearchParams({
      label: conversionLabel,
      value: String(value || 1),
      currency_code: currency || 'GBP',
      transaction_id: transactionId,
    });

    // Add gclid if available (for attribution)
    if (gclid) {
      params.append('gclid', gclid);
    }

    // Build the conversion API URL
    // Format: https://www.google.com/pagead/conversion/{conversionId}/?{params}
    const apiUrl = `https://www.google.com/pagead/conversion/${conversionId}/?${params.toString()}`;

    // Note: Enhanced Conversions with hashed user data requires the Google Ads API
    // The Measurement Protocol endpoint doesn't support Enhanced Conversions directly
    // Enhanced Conversions should be sent via the Google tag on the frontend (which we do)
    // This backend tracking serves as a backup/fallback
    
    // Send conversion via fetch (GET request to the conversion pixel endpoint)
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ConversionTracking/1.0)',
      },
    });

    // The conversion endpoint returns a 200 status even if tracking succeeds
    // We consider it successful if we get any response
    if (response.status >= 200 && response.status < 300) {
      console.log('Google Ads conversion tracked successfully (backend):', transactionId);
      return true;
    } else {
      console.error('Google Ads conversion tracking failed:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('Error tracking Google Ads conversion:', error);
    return false;
  }
}

/**
 * Hash email using SHA256 (required for Enhanced Conversions)
 * Note: This is kept for future use with Google Ads API Enhanced Conversions
 */
async function hashEmail(email: string): Promise<string> {
  const normalizedEmail = email.trim().toLowerCase();
  return await hashString(normalizedEmail);
}

/**
 * Hash phone number using SHA256 (required for Enhanced Conversions)
 * Note: This is kept for future use with Google Ads API Enhanced Conversions
 */
async function hashPhone(phone: string): Promise<string> {
  // Remove all non-digit characters
  const normalizedPhone = phone.replace(/\D/g, '');
  return await hashString(normalizedPhone);
}

/**
 * Hash string using SHA256
 * Note: For Enhanced Conversions with Google Ads API, you'll need to hash user data
 * This function is kept for future implementation
 */
async function hashString(str: string): Promise<string> {
  // Use Web Crypto API (available in Node.js 15+ and browsers)
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback: use Node.js crypto module (server-side only)
  if (typeof process !== 'undefined' && process.versions?.node) {
    try {
      const nodeCrypto = await import('crypto');
      return nodeCrypto.createHash('sha256').update(str).digest('hex');
    } catch (error) {
      console.warn('Node.js crypto module not available');
    }
  }
  
  throw new Error('SHA256 hashing not available in this environment');
}

