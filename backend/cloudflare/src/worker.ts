import { Container, getContainer } from "@cloudflare/containers";

export class SatelliteTrackerContainer extends Container {
  defaultPort = 8080;
  // Sleep 10 minutes after the last request — the cheap path we costed out:
  // usage stays within Cloudflare's free monthly allowances for light
  // personal traffic, so cost is dominated by the flat Workers Paid base.
  sleepAfter = "10m";
  envVars = {
    PORT: "8080",
    FrontendOrigins: "https://satellites.elliotdamarjian.com,http://localhost:3100",
  };
}

interface Env {
  SATELLITE_TRACKER_CONTAINER: DurableObjectNamespace<SatelliteTrackerContainer>;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // No name passed — getContainer() defaults to a shared singleton ID, so
    // every request routes to the same instance. That's required here: the
    // backend's TLE cache lives in that one instance's memory.
    const container = getContainer(env.SATELLITE_TRACKER_CONTAINER);
    return container.fetch(request);
  },
};
