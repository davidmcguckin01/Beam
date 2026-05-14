// Plain constants for the setup flow. Kept out of any "use server" module so
// they can be imported from server components without violating the
// "only async exports" rule.
export const INVITE_SKIPPED_COOKIE = "beam_setup_invite_skipped";
