// Legacy module — kept as a re-export for any importers that haven't migrated
// to lib/bots.ts. The real taxonomy lives in lib/bots.ts.
export { isCrawler, crawlerName, detectBot } from "./bots";
