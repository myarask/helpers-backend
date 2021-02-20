declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production";
      DATABASE_URL: string;
      TENANT: string;
      STRIPE_KEY: string;
      JWT_SECRET: string;
      JWT_ACCESS_EXPIRATION_MINUTES: string;
      JWT_REFRESH_EXPIRATION_DAYS: string;
    }
  }
}

export {};
