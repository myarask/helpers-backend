declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: "development" | "production";
      DATABASE_URL: string;
      TENANT: string;
      STRIPE_KEY: string;
    }
  }
}

export {};
