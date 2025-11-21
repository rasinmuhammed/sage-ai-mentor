import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN;

if (SENTRY_DSN) {
    Sentry.init({
        dsn: SENTRY_DSN,

        // Adjust this value in production, or use tracesSampler for greater control
        tracesSampleRate: 1,

        // Setting this option to true will print useful information to the console while you're setting up Sentry.
        debug: false,

        replaysOnErrorSampleRate: 1.0,

        // This sets the sample rate to be 10%. You may want this to be 100% while
        // in development and sample at a lower rate in production
        replaysSessionSampleRate: 0.1,

        // You can remove this option if you're not planning to use the Sentry Session Replay feature:
        integrations: [
            Sentry.replayIntegration({
                // Additional Replay configuration goes here,
                // for example, you can mask all text content
                // maskAllText: true,
                // blockAllMedia: true,
            }),
        ],
    });
}
