const getEnv = (name: string): string => {
  const value = process.env[name];
  if (!value) {
    if (process.env.NODE_ENV === "test") {
      return name;
    }
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
};

const config = {
  ROUTES_TABLE: getEnv("ROUTES_TABLE"),
  USER_STATE_TABLE: getEnv("USER_STATE_TABLE"),
  METRICS_QUEUE: getEnv("METRICS_QUEUE"),
};

export default config;
export { config };
