import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { envValidator } from "./config/environment";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// ==============================
// ✅ WhatsApp Webhook Endpoints
// ==============================
app.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'sakhi_suraksha_webhook_token_2024';

  console.log('WhatsApp webhook verification:', { mode, token, challenge });

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('✅ WhatsApp webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    console.log('❌ WhatsApp webhook verification failed');
    res.status(403).send('Forbidden');
  }
});

app.post('/webhook/whatsapp', (req, res) => {
  try {
    const body = req.body;
    console.log('📩 WhatsApp webhook received:', JSON.stringify(body, null, 2));

    if (body.object === 'whatsapp_business_account') {
      body.entry?.forEach((entry: any) => {
        entry.changes?.forEach((change: any) => {
          if (change.field === 'messages') {
            const messages = change.value?.messages;
            const statuses = change.value?.statuses;

            if (messages) {
              messages.forEach((message: any) => {
                console.log('💬 Received WhatsApp message:', {
                  from: message.from,
                  text: message.text?.body,
                  type: message.type,
                  timestamp: message.timestamp
                });
              });
            }

            if (statuses) {
              statuses.forEach((status: any) => {
                console.log('📦 WhatsApp message status:', {
                  id: status.id,
                  status: status.status,
                  timestamp: status.timestamp,
                  recipient: status.recipient_id
                });
              });
            }
          }
        });
      });

      res.status(200).send('OK');
    } else {
      res.status(404).send('Not Found');
    }
  } catch (error) {
    console.error('❗ WhatsApp webhook error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// ======================================
// ✅ Logging Middleware for API Requests
// ======================================
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// ==============================
// ✅ Main Initialization Section
// ==============================
(async () => {
  // Print environment configuration status
  envValidator.printConfigurationStatus();

  const server = await registerRoutes(app);

  // Initialize default connections and data on server start
  const { storage } = await import("./storage");
  try {
    const connections = await storage.getFamilyConnections("demo-user");
    console.log(`👨‍👩‍👧 Initialized with ${connections.length} family connections`);
  } catch (error) {
    console.log("Default data initialization completed");
  }

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Setup Vite in development mode only
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ==========================================
  // ✅ FIXED SERVER STARTUP SECTION (Windows)
  // ==========================================
  const port = 5000;
  const host = "localhost"; // avoid 0.0.0.0 on Windows

  server.listen(port, host, () => {
    log(`🚀 Server running at http://${host}:${port}`);
  });
})();
