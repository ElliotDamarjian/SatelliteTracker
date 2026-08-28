import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// No incremental cache override — this app doesn't use ISR (no revalidate
// calls, everything client-rendered), so the default is sufficient and we
// don't need to provision an R2 bucket for it.
export default defineCloudflareConfig({});
