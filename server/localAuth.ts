import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import MemoryStore from "memorystore";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { z } from "zod";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  
  // Use PostgreSQL session store if DATABASE_URL is available
  if (process.env.DATABASE_URL) {
    const PostgresSessionStore = connectPg(session);
    return session({
      secret: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
      store: new PostgresSessionStore({
        conString: process.env.DATABASE_URL,
        createTableIfMissing: true,
        ttl: sessionTtl / 1000, // convert to seconds
        tableName: "sessions",
      }),
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: false, // Set to true in production with HTTPS
        maxAge: sessionTtl,
      },
    });
  } else {
    // Fall back to memory store for development
    const MemStore = MemoryStore(session);
    return session({
      secret: process.env.SESSION_SECRET || "your-secret-key-change-in-production",
      store: new MemStore({
        checkPeriod: sessionTtl,
      }),
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: false,
        maxAge: sessionTtl,
      },
    });
  }
}

// Create default user if none exists
// Create default user if none exists
async function ensureDefaultUser() {
  const defaultUser = await storage.getUser("local-user");
  if (!defaultUser) {
    const hashedPassword = await hashPassword("password123");
    await storage.upsertUser({
      id: "local-user",
      email: "user@localhost",
      displayName: "Local User",
      username: "localuser",
      password: hashedPassword,
      preferences: {
        currentModel: "deepseek-r1:latest",
        theme: "dark",
      },
    });
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  // Ensure default user exists
  await ensureDefaultUser();

  // Configure local strategy
  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          console.log(`Login attempt for email: ${email}`);
          const user = await storage.getUserByEmail(email);
          console.log(`User found:`, user ? 'YES' : 'NO');
          
          if (!user || !user.password) {
            console.log(`Login failed: User not found or no password`);
            return done(null, false, { message: "Invalid email or password" });
          }

          console.log(`Comparing passwords...`);
          const isValid = await comparePasswords(password, user.password);
          console.log(`Password valid:`, isValid);
          
          if (!isValid) {
            console.log(`Login failed: Password not valid`);
            return done(null, false, { message: "Invalid email or password" });
          }

          // Remove password from user object
          const { password: _, ...userWithoutPassword } = user;
          return done(null, userWithoutPassword);
        } catch (error) {
          console.error(`Login error:`, error);
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      if (user) {
        const { password: _, ...userWithoutPassword } = user as any;
        done(null, userWithoutPassword);
      } else {
        done(null, false);
      }
    } catch (error) {
      done(error);
    }
  });

  // Registration endpoint
  app.post("/api/register", async (req, res) => {
    try {
      const registerSchema = z.object({
        email: z.string().email(),
        password: z.string().min(6),
        displayName: z.string().min(1),
      });

      const data = registerSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Hash password and create user
      const hashedPassword = await hashPassword(data.password);
      const userId = `user-${Date.now()}`;
      
      const user = await storage.upsertUser({
        id: userId,
        username: data.email, // Use email as username
        password: hashedPassword,
        email: data.email,
        displayName: data.displayName,
        preferences: {
          currentModel: "deepseek-r1:latest",
          theme: "dark",
        },
      });

      // Auto-login after registration
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Registration successful but login failed" });
        }
        const { password: _, ...userWithoutPassword } = user as any;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Registration error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid registration data", errors: error.errors });
      }
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Login endpoint
  app.post("/api/login", (req, res, next) => {
    // Add input validation
    if (!req.body.email || !req.body.password) {
      return res.status(400).json({ message: "Missing credentials" });
    }
    
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        return res.status(500).json({ message: "Authentication error" });
      }
      if (!user) {
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }

      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: "Login failed" });
        }
        res.json(user);
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};
