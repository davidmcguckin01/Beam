/**
 * Google Click Identifier (gclid) Tracking Utility
 * 
 * Captures and stores gclid from URL parameters for Google Ads attribution.
 * gclid is valid for 30-90 days depending on Google Ads settings.
 */

const GCLID_STORAGE_KEY = "gclid";
const GCLID_EXPIRY_DAYS = 90; // Store for 90 days (max validity period)

/**
 * Get gclid from URL parameters
 */
export function getGclidFromUrl(): string | null {
  if (typeof window === "undefined") return null;
  
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get("gclid");
}

/**
 * Store gclid in localStorage with expiry
 */
export function storeGclid(gclid: string): void {
  if (typeof window === "undefined") return;
  
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + GCLID_EXPIRY_DAYS);
  
  const data = {
    gclid,
    expiry: expiryDate.getTime(),
  };
  
  try {
    localStorage.setItem(GCLID_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Error storing gclid:", error);
  }
}

/**
 * Get stored gclid if it hasn't expired
 */
export function getStoredGclid(): string | null {
  if (typeof window === "undefined") return null;
  
  try {
    const stored = localStorage.getItem(GCLID_STORAGE_KEY);
    if (!stored) return null;
    
    const data = JSON.parse(stored);
    const now = Date.now();
    
    // Check if expired
    if (data.expiry && now > data.expiry) {
      localStorage.removeItem(GCLID_STORAGE_KEY);
      return null;
    }
    
    return data.gclid || null;
  } catch (error) {
    console.error("Error reading stored gclid:", error);
    return null;
  }
}

/**
 * Capture gclid from URL and store it if present
 * Call this on initial page load
 */
export function captureGclid(): string | null {
  const urlGclid = getGclidFromUrl();
  
  if (urlGclid) {
    // Store the new gclid from URL (it's the most recent)
    storeGclid(urlGclid);
    return urlGclid;
  }
  
  // Return stored gclid if no new one in URL
  return getStoredGclid();
}

/**
 * Clear stored gclid
 */
export function clearGclid(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(GCLID_STORAGE_KEY);
}

