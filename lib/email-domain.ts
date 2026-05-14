// Maps a sign-up email to a likely company website domain — used to pre-fill
// the "Add your site" field in onboarding. Returns null for free / personal
// email providers, where the email domain tells us nothing about the user's
// site.

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "yahoo.co.uk",
  "yahoo.co.in",
  "ymail.com",
  "hotmail.com",
  "hotmail.co.uk",
  "outlook.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "proton.me",
  "protonmail.com",
  "pm.me",
  "gmx.com",
  "gmx.net",
  "gmx.de",
  "mail.com",
  "yandex.com",
  "yandex.ru",
  "zoho.com",
  "hey.com",
  "fastmail.com",
  "tutanota.com",
  "tuta.io",
  "qq.com",
  "163.com",
  "126.com",
  "sina.com",
  "naver.com",
  "hanmail.net",
  "web.de",
  "t-online.de",
  "orange.fr",
  "free.fr",
]);

export function companyDomainFromEmail(
  email: string | null | undefined
): string | null {
  if (!email) return null;
  const at = email.lastIndexOf("@");
  if (at === -1) return null;
  const domain = email.slice(at + 1).trim().toLowerCase();
  // Must look like a real domain — has a dot, no whitespace.
  if (!domain || !domain.includes(".") || /\s/.test(domain)) return null;
  if (FREE_EMAIL_DOMAINS.has(domain)) return null;
  return domain;
}
