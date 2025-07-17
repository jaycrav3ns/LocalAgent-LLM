import type { Config } from 'drizzle-kit';

export default {
  schema: './shared/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host: 'localhost',
    user: 'localagent',
    database: 'localagentllm',
    password: 'z!_9pWD3BgbygiMi',
    ssl: false,
  },
} satisfies Config;
