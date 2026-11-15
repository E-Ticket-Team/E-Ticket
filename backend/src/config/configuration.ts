export interface DatabaseConfig {
  url: string;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  corsOrigin: string;
  database: DatabaseConfig;
  jwt: JwtConfig;
}

export default (): AppConfig => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 4000,
  apiPrefix: process.env.API_PREFIX || 'api/v1',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/eticket?schema=public',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'eticket-jwt-secret-key-change-in-production-2026',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
});

