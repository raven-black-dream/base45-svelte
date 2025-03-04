import { handleErrorWithSentry, replayIntegration } from "@sentry/sveltekit";
import * as Sentry from "@sentry/sveltekit";
import { PUBLIC_SENTRY_ENVIRONMENT } from "$env/static/public"

Sentry.init({
  dsn: "https://3a2bca40942cd0e813b4887337df28f6@o4508083446808576.ingest.us.sentry.io/4508083462471680",
  environment: PUBLIC_SENTRY_ENVIRONMENT,

  tracesSampleRate: 1.0,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // If the entire session is not sampled, use the below sample rate to sample
  // sessions when an error occurs.
  replaysOnErrorSampleRate: 1.0,

  // If you don't want to use Session Replay, just remove the line below:
  integrations: [replayIntegration()],
});

// If you have a custom error handler, pass it to `handleErrorWithSentry`
export const handleError = handleErrorWithSentry();
