export interface DatabaseConfig {
  url: string;
}

export interface JwtConfig {
  secret: string;
  expiresIn: string;
  qrSigningSecret: string;
  cookieSecure: boolean;
}

export interface OrderConfig {
  reservationMinutes: number;
}

export interface AppConfig {
  nodeEnv: string;
  port: number;
  apiPrefix: string;
  corsOrigin: string;
  database: DatabaseConfig;
  jwt: JwtConfig;
  orders: OrderConfig;
}

export default (): AppConfig => {
  const jwtSecret =
    process.env.JWT_SECRET || 'eticket-jwt-secret-key-change-in-production-2026';

  return {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT, 10) || 4000,
    apiPrefix: process.env.API_PREFIX || 'api/v1',
    corsOrigin: process.env.CORS_ORIGIN || '*',
    database: {
      url:
        process.env.DATABASE_URL ||
        'postgresql://postgres:postgres@localhost:5432/eticket?schema=public',
    },
    jwt: {
      secret: jwtSecret,
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
      qrSigningSecret: process.env.QR_SIGNING_SECRET || jwtSecret,
      cookieSecure: process.env.COOKIE_SECURE === 'true',
    },
    orders: {
      reservationMinutes:
        parseInt(process.env.ORDER_RESERVATION_MINUTES, 10) || 15,
    },
  };
};
