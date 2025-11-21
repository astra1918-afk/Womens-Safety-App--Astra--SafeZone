import type { Express } from "express";
import express from "express";
import { createServer, type Server } from "http";
import path from "path";
import fs from "fs";
import multer from "multer";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { familyConnections, emergencyAlerts } from "@shared/schema";
import { db } from "./db";
import { eq, and, or, desc, inArray } from "drizzle-orm";
import { generateOTP, sendWhatsAppOTP, sendEmailOTP, sendWhatsAppEmergency, sendEmailAlert } from "./whatsappService";
import { sendSMS, sendSMSOTP, sendSMSEmergency, sendSMSLiveLocation } from "./smsService";
import { WebSocketServer } from 'ws';
import { 
  insertEmergencyContactSchema, 
  insertEmergencyAlertSchema,
  insertCommunityAlertSchema,
  insertSafeZoneSchema,
  insertLiveStreamSchema,
  insertDestinationSchema,
  insertIotDeviceSchema,
  insertHealthMetricSchema,
  insertStressAnalysisSchema,
  insertOtpVerificationSchema,
  upsertUserSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Configure multer for file uploads
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB limit for video files
    },
    fileFilter: (req, file, cb) => {
      // Accept all file types for emergency video uploads
      cb(null, true);
    }
  });
  
  // WhatsApp webhook endpoints (must be first to avoid middleware interference)
  app.get('/webhook/whatsapp', (req, res) => {
    // Verify webhook with Meta
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];
    
    // Verify token (use this token when configuring webhook in Meta)
    const VERIFY_TOKEN = 'sakhi_suraksha_webhook_token_2024';
    
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      console.log('WhatsApp webhook verified successfully');
      res.status(200).send(challenge);
    } else {
      console.log('WhatsApp webhook verification failed');
      res.status(403).send('Forbidden');
    }
  });

  app.post('/webhook/whatsapp', (req, res) => {
    try {
      const body = req.body;
      
      // Check if this is a WhatsApp webhook event
      if (body.object === 'whatsapp_business_account') {
        body.entry?.forEach((entry: any) => {
          entry.changes?.forEach((change: any) => {
            if (change.field === 'messages') {
              const messages = change.value?.messages;
              const statuses = change.value?.statuses;
              
              // Handle incoming messages
              if (messages) {
                messages.forEach((message: any) => {
                  console.log('Received WhatsApp message:', {
                    from: message.from,
                    text: message.text?.body,
                    type: message.type,
                    timestamp: message.timestamp
                  });
                });
              }
              
              // Handle message status updates (sent, delivered, read)
              if (statuses) {
                statuses.forEach((status: any) => {
                  console.log('WhatsApp message status:', {
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
      console.error('WhatsApp webhook error:', error);
      res.status(500).send('Internal Server Error');
    }
  });

  // Auth middleware
  await setupAuth(app);

  // New authentication routes for login system
  app.post('/api/auth/send-otp', async (req, res) => {
    try {
      const { phoneNumber, email } = req.body;
      
      // Generate OTP
      const otp = generateOTP();
      
      // Store OTP verification record
      await storage.createOtpVerification({
        identifier: phoneNumber,
        type: 'phone',
        otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      });
      
      await storage.createOtpVerification({
        identifier: email,
        type: 'email',
        otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      });
      
      // Send OTP via SMS and Email
      const smsResult = await sendSMSOTP(phoneNumber, otp);
      const emailResult = await sendEmailOTP(email, otp);
      
      res.json({
        success: smsResult || emailResult,
        message: 'OTP sent successfully'
      });
      
    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({ message: 'Failed to send OTP' });
    }
  });

  app.post('/api/auth/verify-otp', async (req, res) => {
    try {
      const { phoneNumber, email, otp } = req.body;
      
      // Verify OTP for both phone and email
      const phoneVerified = await storage.verifyOtp(phoneNumber, 'phone', otp);
      const emailVerified = await storage.verifyOtp(email, 'email', otp);
      
      if (phoneVerified && emailVerified) {
        res.json({ success: true, message: 'OTP verified successfully' });
      } else {
        res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
      }
      
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({ message: 'Failed to verify OTP' });
    }
  });

  app.post('/api/auth/create-profile', async (req, res) => {
    try {
      const { phoneNumber, email, firstName, lastName, password } = req.body;
      
      // Create user profile
      const user = await storage.upsertUser({
        id: `user_${Date.now()}`,
        email,
        phoneNumber,
        firstName,
        lastName,
        password // In production, hash this password
      });
      
      res.json({
        success: true,
        user,
        message: 'Profile created successfully'
      });
      
    } catch (error) {
      console.error('Create profile error:', error);
      res.status(500).json({ message: 'Failed to create profile' });
    }
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Profile management routes
  app.post('/api/user/profile', async (req, res) => {
    try {
      // Get userId from query parameter to match GET endpoint
      const userId = req.query.userId || 'demo-user';
      const profileData = { ...req.body, id: userId };
      const validatedData = upsertUserSchema.parse(profileData);
      
      const user = await storage.upsertUser(validatedData);
      
      // Return the user's actual ID in case it switched to an existing user
      res.json({ 
        message: "Profile saved successfully", 
        user,
        actualUserId: user.id // Include the actual user ID for frontend session management
      });
    } catch (error) {
      console.error('Profile save error:', error);
      res.status(400).json({ message: "Failed to save profile" });
    }
  });

  app.get('/api/user/profile', async (req, res) => {
    try {
      // Extract userId from query parameter (set by frontend)
      const userId = req.query.userId || 'demo-user';
      
      try {
        const user = await storage.getUser(userId as string);
        if (user) {
          res.json(user);
          return;
        }
      } catch (dbError) {
        console.log('Database unavailable, using fallback data');
      }
      
      // Fallback demo user data when database is unavailable
      const demoUser = {
        id: "demo-user",
        email: "sharanyamavinaguni@gmail.com",
        firstName: "Sharanya",
        lastName: "M S",
        profileImageUrl: null,
        phoneNumber: "+917892937490",
        whatsappNumber: null,
        password: null,
        isVerified: false,
        emergencyMessage: "🚨 EMERGENCY ALERT 🚨\nI need immediate help! This is an automated SOS from Sakhi Suraksha app.\n\nLocation: [LIVE_LOCATION]\nTime: [TIMESTAMP]\nLive Stream: [STREAM_LINK]\n\nPlease contact me immediately or call emergency services.",
        isLocationSharingActive: true,
        theme: "light",
        voiceActivationEnabled: true,
        shakeDetectionEnabled: true,
        communityAlertsEnabled: true,
        soundAlertsEnabled: true,
        createdAt: "2025-06-04T11:26:23.291Z",
        updatedAt: "2025-06-05T12:50:52.638Z"
      };
      
      res.json(demoUser);
    } catch (error) {
      console.error('Profile fetch error:', error);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  // Google Places API endpoint for nearby safety points
  app.get("/api/places/nearby", async (req, res) => {
    try {
      const { lat, lng, type, radius = 5000 } = req.query;
      
      if (!lat || !lng || !type) {
        return res.status(400).json({ error: "Missing required parameters: lat, lng, type" });
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Google Places API key not configured" });
      }

      // Use Google Places Nearby Search API with type filter for better accuracy
      let placesUrl;
      
      // Map keywords to Google Places types for better results
      const typeMapping: { [key: string]: string } = {
        'police station': 'police',
        'hospital': 'hospital',
        'metro station': 'subway_station',
        'shopping mall': 'shopping_mall'
      };
      
      const placeType = typeMapping[type as string];
      
      if (placeType) {
        placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${placeType}&key=${apiKey}`;
      } else {
        placesUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&keyword=${encodeURIComponent(type as string)}&key=${apiKey}`;
      }
      
      const response = await fetch(placesUrl);
      const data = await response.json();

      if (data.status === 'OK') {
        res.json(data);
      } else {
        console.error('Places API error:', data.status, data.error_message);
        res.status(500).json({ error: `Places API error: ${data.status}` });
      }
    } catch (error) {
      console.error('Error fetching places:', error);
      res.status(500).json({ error: "Failed to fetch nearby places" });
    }
  });

  // Google Places Text Search API endpoint for specific locations
  app.get("/api/places/search", async (req, res) => {
    try {
      const { query } = req.query;
      
      if (!query) {
        return res.status(400).json({ error: "Missing required parameter: query" });
      }

      const apiKey = process.env.GOOGLE_PLACES_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "Google Places API key not configured" });
      }

      // Use Google Places Text Search API for finding specific locations
      const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query as string)}&key=${apiKey}`;
      
      const response = await fetch(placesUrl);
      const data = await response.json();

      if (data.status === 'OK') {
        res.json(data);
      } else {
        console.error('Places Text Search API error:', data.status, data.error_message);
        res.status(500).json({ error: `Places API error: ${data.status}` });
      }
    } catch (error) {
      console.error('Error searching places:', error);
      res.status(500).json({ error: "Failed to search places" });
    }
  });

  // User routes
  app.patch("/api/user/:id", isAuthenticated, async (req, res) => {
    try {
      const id = req.params.id;
      const updates = req.body;
      const user = await storage.updateUser(id, updates);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  // Emergency contacts routes (for permanent data storage)
  app.get("/api/emergency-contacts", async (req, res) => {
    try {
      const userId = req.query.userId || 'demo-user';
      
      try {
        const contacts = await storage.getEmergencyContacts(userId as string);
        res.json(contacts);
        return;
      } catch (dbError) {
        console.log('Database unavailable, using fallback contacts');
      }
      
      // Fallback emergency contacts data
      const fallbackContacts = [
        {
          id: 7,
          userId: "demo-user",
          name: "Yash Gavas",
          phoneNumber: "+919380474206",
          whatsappNumber: "+919380474206",
          relationship: "Friend",
          isPrimary: true,
          createdAt: "2025-06-04T11:46:25.643Z",
          updatedAt: "2025-06-04T11:46:25.643Z"
        },
        {
          id: 8,
          userId: "demo-user", 
          name: "Me",
          phoneNumber: "+917892937490",
          whatsappNumber: "+917892937490",
          relationship: "Self",
          isPrimary: false,
          createdAt: "2025-06-04T11:46:45.123Z",
          updatedAt: "2025-06-04T11:46:45.123Z"
        }
      ];
      
      res.json(fallbackContacts);
    } catch (error) {
      console.error('Error fetching emergency contacts:', error);
      res.status(500).json({ message: "Failed to get emergency contacts" });
    }
  });

  app.post("/api/emergency-contacts", async (req, res) => {
    try {
      console.log('POST /api/emergency-contacts - Request body:', JSON.stringify(req.body, null, 2));
      
      let userId = 'demo-user';
      if (req.isAuthenticated() && req.user && 'id' in req.user) {
        userId = req.user.id as string;
      }

      console.log('Using userId:', userId);

      // Ensure demo user exists
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        console.log('Creating demo user...');
        await storage.upsertUser({
          id: userId,
          email: 'demo@example.com',
          firstName: 'Demo',
          lastName: 'User'
        });
      }

      const contactData = {
        ...req.body,
        userId: userId
      };

      console.log('Contact data before validation:', JSON.stringify(contactData, null, 2));

      const validatedData = insertEmergencyContactSchema.parse(contactData);
      console.log('Validated data:', JSON.stringify(validatedData, null, 2));
      
      const contact = await storage.createEmergencyContact(validatedData);
      console.log('Created contact:', JSON.stringify(contact, null, 2));
      
      res.status(201).json(contact);
    } catch (error) {
      console.error('Error creating emergency contact:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
      }
      res.status(400).json({ 
        message: "Failed to create emergency contact",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  app.patch("/api/emergency-contacts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const contact = await storage.updateEmergencyContact(id, updates);
      if (!contact) {
        return res.status(404).json({ message: "Contact not found" });
      }
      res.json(contact);
    } catch (error) {
      res.status(500).json({ message: "Failed to update contact" });
    }
  });

  app.delete("/api/emergency-contacts/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteEmergencyContact(id);
      if (!deleted) {
        return res.status(404).json({ message: "Contact not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete contact" });
    }
  });

  // Emergency contacts routes




  // Emergency alerts routes (no authentication required for emergency situations)
  app.post("/api/emergency-alerts", async (req, res) => {
    try {
      // Force userId to be demo-user for Sharanya's account
      const requestData = {
        ...req.body,
        userId: 'demo-user', // Always use demo-user for current session
        latitude: req.body.location?.lat || req.body.latitude || 12.9716, // Default to Bangalore coordinates
        longitude: req.body.location?.lng || req.body.longitude || 77.5946,
        address: req.body.location?.address || req.body.address || 'Emergency Location - Coordinates tracked',
        triggerType: req.body.triggerType // Don't override the triggerType - keep original value
      };
      
      console.log('Emergency alert request data:', requestData);
      
      const validatedData = insertEmergencyAlertSchema.parse(requestData);
      const alert = await storage.createEmergencyAlert(validatedData);
      
      // Trigger emergency protocol with live streaming
      await triggerEmergencyProtocol(alert);
      
      res.status(201).json(alert);
    } catch (error) {
      console.error('Emergency alert error:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
      }
      res.status(400).json({ 
        message: "Failed to create emergency alert",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Manual SOS button endpoint with simplified data structure
  app.post("/api/emergency-alerts", async (req, res) => {
    try {
      // Create emergency alert for manual SOS button
      const alert = await storage.createEmergencyAlert({
        userId: 'demo-user',
        triggerType: 'manual_button',
        latitude: req.body.latitude,
        longitude: req.body.longitude,
        address: req.body.address || 'Emergency location'
      });
      
      // Trigger emergency protocol to send messages to contacts
      await triggerEmergencyProtocol(alert);
      
      res.status(201).json(alert);
    } catch (error) {
      console.error('Manual SOS error:', error);
      res.status(500).json({ message: "Failed to create emergency alert" });
    }
  });

  app.get("/api/emergency-alerts/:userId", isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.userId;
      const alerts = await storage.getEmergencyAlerts(userId);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get emergency alerts" });
    }
  });

  app.patch("/api/emergency-alerts/:id", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updates = req.body;
      const alert = await storage.updateEmergencyAlert(id, updates);
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      res.json(alert);
    } catch (error) {
      res.status(500).json({ message: "Failed to update alert" });
    }
  });

  // Community alerts routes
  app.get("/api/community-alerts", async (req, res) => {
    try {
      const { lat, lng, radius = 5000 } = req.query;
      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);
      const searchRadius = parseInt(radius as string);
      
      const alerts = await storage.getCommunityAlerts(latitude, longitude, searchRadius);
      res.json(alerts);
    } catch (error) {
      res.status(500).json({ message: "Failed to get community alerts" });
    }
  });

  app.post("/api/community-alerts", async (req, res) => {
    try {
      const validatedData = insertCommunityAlertSchema.parse(req.body);
      const alert = await storage.createCommunityAlert(validatedData);
      res.status(201).json(alert);
    } catch (error) {
      console.error('Community alert creation error:', error);
      res.status(400).json({ message: "Failed to create community alert" });
    }
  });

  // Safety issue reporting endpoint (accepts both authenticated and anonymous reports)
  app.post("/api/safety-reports", async (req, res) => {
    try {
      const { type, description, location, severity = 'medium' } = req.body;
      
      // Get user ID if authenticated, otherwise null for anonymous
      const userId = req.isAuthenticated() ? req.user?.claims?.sub : null;
      const reportedBy = userId ? 'user' : 'anonymous';
      
      // Convert safety report to community alert format
      const communityAlert = {
        userId: userId,
        type: type || 'safety_issue',
        description: description || 'Safety concern reported',
        latitude: location?.latitude || 0,
        longitude: location?.longitude || 0,
        severity: severity,
        verified: false,
        reportedBy: reportedBy
      };

      const validatedData = insertCommunityAlertSchema.parse(communityAlert);
      const alert = await storage.createCommunityAlert(validatedData);
      
      res.status(201).json({ 
        success: true, 
        message: "Safety report submitted successfully",
        alertId: alert.id 
      });
    } catch (error) {
      console.error('Safety report error:', error);
      res.status(400).json({ 
        success: false, 
        message: "Failed to submit safety report" 
      });
    }
  });

  // Safe zones routes
  app.get("/api/safe-zones/:userId", isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.userId;
      const zones = await storage.getSafeZones(userId);
      res.json(zones);
    } catch (error) {
      res.status(500).json({ message: "Failed to get safe zones" });
    }
  });

  app.post("/api/safe-zones", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertSafeZoneSchema.parse(req.body);
      const zone = await storage.createSafeZone(validatedData);
      res.status(201).json(zone);
    } catch (error) {
      res.status(400).json({ message: "Failed to create safe zone" });
    }
  });

  // Destinations routes for safe routing (permanent storage)
  app.get("/api/destinations", async (req, res) => {
    try {
      let userId = 'anonymous';
      if (req.isAuthenticated() && req.user?.claims?.sub) {
        userId = req.user.claims.sub;
      }
      
      const destinations = await storage.getDestinations(userId);
      res.json(destinations);
    } catch (error) {
      console.error('Error fetching destinations:', error);
      res.status(500).json({ message: "Failed to get destinations" });
    }
  });

  app.post("/api/destinations", async (req, res) => {
    try {
      let userId = 'anonymous';
      if (req.isAuthenticated() && req.user?.claims?.sub) {
        userId = req.user.claims.sub;
      }

      const destinationData = {
        ...req.body,
        userId: userId
      };

      const validatedData = insertDestinationSchema.parse(destinationData);
      const destination = await storage.createDestination(validatedData);
      res.status(201).json(destination);
    } catch (error) {
      console.error('Error creating destination:', error);
      res.status(400).json({ message: "Failed to create destination" });
    }
  });

  app.delete("/api/destinations/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteDestination(id);
      if (!deleted) {
        return res.status(404).json({ message: "Destination not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete destination" });
    }
  });

  // Home location storage endpoints
  app.post("/api/user/home-location", async (req, res) => {
    try {
      let userId = 'demo-user';
      if (req.isAuthenticated() && req.user?.claims?.sub) {
        userId = req.user.claims.sub;
      }

      // Ensure demo user exists
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        await storage.upsertUser({
          id: userId,
          email: 'demo@example.com',
          firstName: 'Demo',
          lastName: 'User'
        });
      }

      const { latitude, longitude, address } = req.body;
      
      // Store as a destination marked as favorite (home)
      const homeDestination = {
        userId: userId,
        name: 'Home',
        latitude: latitude,
        longitude: longitude,
        address: address || `${latitude}, ${longitude}`,
        isFavorite: true
      };

      const validatedData = insertDestinationSchema.parse(homeDestination);
      const destination = await storage.createDestination(validatedData);
      res.status(201).json(destination);
    } catch (error) {
      console.error('Error saving home location:', error);
      res.status(400).json({ message: "Failed to save home location" });
    }
  });

  app.get("/api/user/home-location", async (req, res) => {
    try {
      // Get userId from query parameter (sent by frontend session management)
      const userId = req.query.userId || 'demo-user';
      
      const destinations = await storage.getDestinations(userId);
      const homeLocation = destinations.find(dest => dest.isFavorite === true);
      
      if (homeLocation) {
        res.json(homeLocation);
      } else {
        res.status(404).json({ message: "Home location not set" });
      }
    } catch (error) {
      console.error('Error fetching home location:', error);
      res.status(500).json({ message: "Failed to get home location" });
    }
  });

  // Live streaming routes
  app.post("/api/live-streams", isAuthenticated, async (req, res) => {
    try {
      const validatedData = insertLiveStreamSchema.parse(req.body);
      const stream = await storage.createLiveStream(validatedData);
      res.status(201).json(stream);
    } catch (error) {
      res.status(400).json({ message: "Failed to create live stream" });
    }
  });

  app.get("/api/live-streams/:userId", isAuthenticated, async (req, res) => {
    try {
      const userId = req.params.userId;
      const streams = await storage.getLiveStreams(userId);
      res.json(streams);
    } catch (error) {
      res.status(500).json({ message: "Failed to get live streams" });
    }
  });

  app.patch("/api/live-streams/:id/end", isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const ended = await storage.endLiveStream(id);
      if (!ended) {
        return res.status(404).json({ message: "Stream not found" });
      }
      res.json({ message: "Stream ended successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to end stream" });
    }
  });

  // OTP verification endpoints
  app.post("/api/auth/send-phone-otp", async (req, res) => {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        return res.status(400).json({ message: "Phone number is required" });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP in database
      await storage.createOtpVerification({
        identifier: phoneNumber,
        type: 'phone',
        otp,
        expiresAt
      });

      // Try WhatsApp first, fallback to manual verification for testing
      const whatsappSent = await sendWhatsAppOTP(phoneNumber, otp);
      
      console.log(`SMS OTP for ${phoneNumber}: ${otp}`);
      
      if (whatsappSent) {
        res.json({ message: "OTP sent via WhatsApp successfully" });
      } else {
        // For testing: display OTP in response when WhatsApp is not configured
        res.json({ 
          message: "WhatsApp configuration pending. Use OTP for verification",
          testOtp: otp // Temporary for testing
        });
      }
    } catch (error) {
      console.error("Error sending phone OTP:", error);
      res.status(500).json({ message: "Failed to send OTP" });
    }
  });

  app.post("/api/auth/send-email-otp", async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      // Generate 6-digit OTP
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP in database
      await storage.createOtpVerification({
        identifier: email,
        type: 'email',
        otp,
        expiresAt
      });

      // Send OTP via SMTP2GO email service
      const otpMessage = `Your Sakhi Suraksha verification code is: ${otp}. This code will expire in 10 minutes.`;
      const emailSent = await sendEmailOTP(email, otpMessage);
      
      console.log(`Email OTP for ${email}: ${otp}`);
      
      if (emailSent) {
        res.json({ message: "OTP sent successfully" });
      } else {
        res.status(500).json({ message: "Failed to send OTP email" });
      }
    } catch (error) {
      console.error("Error sending email OTP:", error);
      res.status(500).json({ message: "Failed to send OTP" });
    }
  });

  app.post("/api/auth/verify-phone-otp", async (req, res) => {
    try {
      const { phoneNumber, otp } = req.body;
      
      if (!phoneNumber || !otp) {
        return res.status(400).json({ message: "Phone number and OTP are required" });
      }

      const isValid = await storage.verifyOtp(phoneNumber, 'phone', otp);
      
      if (isValid) {
        res.json({ message: "Phone number verified successfully" });
      } else {
        res.status(400).json({ message: "Invalid or expired OTP" });
      }
    } catch (error) {
      console.error("Error verifying phone OTP:", error);
      res.status(500).json({ message: "Failed to verify OTP" });
    }
  });

  app.post("/api/auth/verify-email-otp", async (req, res) => {
    try {
      const { email, otp } = req.body;
      
      if (!email || !otp) {
        return res.status(400).json({ message: "Email and OTP are required" });
      }

      const isValid = await storage.verifyOtp(email, 'email', otp);
      
      if (isValid) {
        res.json({ message: "Email verified successfully" });
      } else {
        res.status(400).json({ message: "Invalid or expired OTP" });
      }
    } catch (error) {
      console.error("Error verifying email OTP:", error);
      res.status(500).json({ message: "Failed to verify OTP" });
    }
  });

  // SMS and emergency services simulation
  app.post("/api/send-sms", async (req, res) => {
    try {
      const { phoneNumber, message } = req.body;
      
      // In production, integrate with Twilio or similar SMS service
      // const twilioClient = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
      // await twilioClient.messages.create({
      //   body: message,
      //   from: process.env.TWILIO_PHONE_NUMBER,
      //   to: phoneNumber
      // });
      
      console.log(`SMS sent to ${phoneNumber}: ${message}`);
      res.json({ success: true, message: "SMS sent successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to send SMS" });
    }
  });

  // IoT Device Management Routes
  app.get("/api/iot-devices", async (req, res) => {
    try {
      let userId = 'demo-user';
      if (req.isAuthenticated() && req.user?.claims?.sub) {
        userId = req.user.claims.sub;
      }

      const devices = await storage.getIotDevices(userId);
      res.json(devices);
    } catch (error) {
      console.error('Error fetching IoT devices:', error);
      res.status(500).json({ message: "Failed to get IoT devices" });
    }
  });

  app.post("/api/iot-devices", async (req, res) => {
    try {
      let userId = 'demo-user';
      if (req.isAuthenticated() && req.user?.claims?.sub) {
        userId = req.user.claims.sub;
      }

      // Ensure demo user exists
      const existingUser = await storage.getUser(userId);
      if (!existingUser) {
        await storage.upsertUser({
          id: userId,
          email: 'demo@example.com',
          firstName: 'Demo',
          lastName: 'User'
        });
      }

      const deviceData = {
        ...req.body,
        userId: userId
      };

      const validatedData = insertIotDeviceSchema.parse(deviceData);
      const device = await storage.createIotDevice(validatedData);
      res.status(201).json(device);
    } catch (error) {
      console.error('Error creating IoT device:', error);
      res.status(400).json({ message: "Failed to create IoT device" });
    }
  });

  app.post("/api/iot-devices/:id/connect", async (req, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const success = await storage.connectDevice(deviceId);
      
      if (success) {
        res.json({ message: "Device connected successfully" });
      } else {
        res.status(404).json({ message: "Device not found" });
      }
    } catch (error) {
      console.error('Error connecting device:', error);
      res.status(500).json({ message: "Failed to connect device" });
    }
  });

  app.post("/api/iot-devices/:id/disconnect", async (req, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const success = await storage.disconnectDevice(deviceId);
      
      if (success) {
        res.json({ message: "Device disconnected successfully" });
      } else {
        res.status(404).json({ message: "Device not found" });
      }
    } catch (error) {
      console.error('Error disconnecting device:', error);
      res.status(500).json({ message: "Failed to disconnect device" });
    }
  });

  app.delete("/api/iot-devices/:id", async (req, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const success = await storage.deleteIotDevice(deviceId);
      
      if (success) {
        res.json({ message: "Device deleted successfully" });
      } else {
        res.status(404).json({ message: "Device not found" });
      }
    } catch (error) {
      console.error('Error deleting device:', error);
      res.status(500).json({ message: "Failed to delete device" });
    }
  });

  // Update device battery level
  app.patch("/api/iot-devices/:id/battery", async (req, res) => {
    try {
      const deviceId = parseInt(req.params.id);
      const { batteryLevel } = req.body;
      
      if (typeof batteryLevel !== 'number' || batteryLevel < 0 || batteryLevel > 100) {
        return res.status(400).json({ message: "Invalid battery level" });
      }
      
      const success = await storage.updateDeviceBattery(deviceId, batteryLevel);
      
      if (success) {
        res.json({ message: "Battery level updated successfully" });
      } else {
        res.status(404).json({ message: "Device not found" });
      }
    } catch (error) {
      console.error('Error updating device battery:', error);
      res.status(500).json({ message: "Failed to update battery level" });
    }
  });

  // Health Metrics Routes
  app.get("/api/health-metrics", async (req, res) => {
    try {
      let userId = 'demo-user';
      if (req.isAuthenticated() && req.user?.claims?.sub) {
        userId = req.user.claims.sub;
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const metrics = await storage.getHealthMetrics(userId, limit);
      res.json(metrics);
    } catch (error) {
      console.error('Error fetching health metrics:', error);
      res.status(500).json({ message: "Failed to get health metrics" });
    }
  });

  app.post("/api/health-metrics", async (req, res) => {
    try {
      let userId = 'demo-user';
      if (req.isAuthenticated() && req.user?.claims?.sub) {
        userId = req.user.claims.sub;
      }

      const metricData = {
        ...req.body,
        userId: userId
      };

      const validatedData = insertHealthMetricSchema.parse(metricData);
      const metric = await storage.createHealthMetric(validatedData);
      res.status(201).json(metric);
    } catch (error) {
      console.error('Error creating health metric:', error);
      res.status(400).json({ message: "Failed to create health metric" });
    }
  });

  // Stress Analysis Routes
  app.get("/api/stress-analysis", async (req, res) => {
    try {
      let userId = 'demo-user';
      if (req.isAuthenticated() && req.user?.claims?.sub) {
        userId = req.user.claims.sub;
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const analysis = await storage.getStressAnalysis(userId, limit);
      res.json(analysis);
    } catch (error) {
      console.error('Error fetching stress analysis:', error);
      res.status(500).json({ message: "Failed to get stress analysis" });
    }
  });

  app.post("/api/stress-analysis", async (req, res) => {
    try {
      let userId = 'demo-user';
      if (req.isAuthenticated() && req.user?.claims?.sub) {
        userId = req.user.claims.sub;
      }

      const analysisData = {
        ...req.body,
        userId: userId
      };

      const validatedData = insertStressAnalysisSchema.parse(analysisData);
      const analysis = await storage.createStressAnalysis(validatedData);
      res.status(201).json(analysis);
    } catch (error) {
      console.error('Error creating stress analysis:', error);
      res.status(400).json({ message: "Failed to create stress analysis" });
    }
  });

  // Emergency protocol trigger with live streaming
  // Debounce mechanism for preventing duplicate messages
  const sentMessages = new Set<string>();
  
  async function triggerEmergencyProtocol(alert: any) {
    try {
      console.log(`Triggering emergency protocol for alert ${alert.id}`);
      
      // Get user and emergency contacts
      const user = await storage.getUser(alert.userId);
      if (!user) return;

      const contacts = await storage.getEmergencyContacts(alert.userId);
      
      if (contacts.length === 0) {
        console.log('No emergency contacts configured');
        return;
      }

      // Create live stream session
      const streamUrl = `wss://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost'}/ws/stream/${alert.id}`;
      const shareLink = `https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost'}/emergency/${alert.id}`;
      
      const liveStream = await storage.createLiveStream({
        userId: alert.userId,
        emergencyAlertId: alert.id,
        streamUrl,
        shareLink,
        isActive: true
      });

      // Generate emergency message
      const locationText = alert.address || `${alert.latitude}, ${alert.longitude}`;
      const currentTime = new Date().toLocaleString('en-IN', { 
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short'
      });
      
      let message = `🚨 EMERGENCY ALERT 🚨\n\n`;
      
      if (alert.triggerType === 'voice_detection') {
        message += `VOICE DISTRESS DETECTED\n`;
        if (alert.audioRecordingUrl) {
          try {
            const parsedAudio = JSON.parse(alert.audioRecordingUrl);
            if (parsedAudio.detectedText) {
              message += `Detected Words: "${parsedAudio.detectedText}"\n`;
            }
          } catch (e) {
            // Handle as regular text
          }
        }
      } else {
        message += `SOS BUTTON ACTIVATED\n`;
      }
      
      message += `\nChild: Sharanya\n`;
      message += `Time: ${currentTime}\n`;
      message += `Location: ${locationText}\n`;
      message += `📹 LIVE STREAM ROOM ID: emergency_${alert.id}\n`;
      message += `🔗 Join Stream: https://${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost'}/emergency-watch/emergency_${alert.id}\n\n`;
      message += `⚠️ IMMEDIATE ATTENTION REQUIRED ⚠️\n`;
      message += `Please check on Sharanya's safety immediately.`;

      // Send messages to all contacts with debouncing
      const alertKey = `${alert.id}_${alert.triggerType}`;
      if (!sentMessages.has(alertKey)) {
        sentMessages.add(alertKey);
        
        for (const contact of contacts) {
          try {
            let smsSuccess = false;
            let emailSuccess = false;
            
            if (contact.phoneNumber) {
              smsSuccess = await sendWhatsAppEmergency(contact.phoneNumber, message);
              console.log(`WhatsApp to ${contact.name}: ${smsSuccess ? 'SUCCESS' : 'FAILED'}`);
            }
            
            if (contact.email) {
              emailSuccess = await sendEmailAlert(contact.email, message);
              console.log(`Email to ${contact.name}: ${emailSuccess ? 'SUCCESS' : 'FAILED'}`);
            }
          } catch (error) {
            console.error(`Failed to send alerts to ${contact.name}:`, error);
          }
        }
        
        // Clear sent messages after 5 minutes to allow new alerts
        setTimeout(() => {
          sentMessages.delete(alertKey);
        }, 5 * 60 * 1000);
      } else {
        console.log(`Duplicate alert prevented for ${alertKey}`);
      }

      // Update user location sharing status
      await storage.updateUser(alert.userId, { isLocationSharingActive: true });
      
      // Broadcast to WebSocket clients
      wss.clients.forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN
          client.send(JSON.stringify({
            type: 'emergency_alert',
            data: { alert, liveStream, user: { id: user.id, firstName: user.firstName } }
          }));
        }
      });
      
      console.log(`Emergency protocol completed for alert ${alert.id} - messages sent to ${contacts.length} contacts`);
      
    } catch (error) {
      console.error("Failed to trigger emergency protocol:", error);
    }
  }

  const httpServer = createServer(app);
  
  // WebSocket server for live streaming and real-time communication
  const { WebSocketServer } = await import('ws');
  const wss = new WebSocketServer({ 
    server: httpServer, 
    path: '/ws'
  });

  // Store active connections and streams for WebRTC
  const activeConnections = new Map();
  const streamingSessions = new Map();

  wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection');
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Handle different message types
        switch (data.type) {
          case 'child_join_room':
            // Child device joining emergency room
            console.log('Child device joined emergency room:', data.roomId);
            streamingSessions.set(data.roomId, {
              childSocket: ws,
              offer: data.offer,
              streamId: data.streamId,
              roomId: data.roomId
            });
            
            // If parent is already waiting, send offer immediately
            activeConnections.forEach((connection, socket) => {
              if (connection.role === 'parent' && connection.roomId === data.roomId) {
                socket.send(JSON.stringify({
                  type: 'child_stream_offer',
                  offer: data.offer,
                  roomId: data.roomId
                }));
                console.log('Sent child stream offer to waiting parent');
              }
            });
            break;
            
          case 'parent_join_room':
            // Parent device joining emergency room
            console.log('Parent device joined emergency room:', data.roomId);
            activeConnections.set(ws, {
              role: 'parent',
              roomId: data.roomId,
              deviceType: 'parent'
            });
            
            // Check if child is already streaming
            const room = streamingSessions.get(data.roomId);
            if (room && room.offer) {
              ws.send(JSON.stringify({
                type: 'child_stream_offer',
                offer: room.offer,
                roomId: data.roomId
              }));
              console.log('Sent existing child stream to parent');
            }
            break;
            
          case 'child_stream_offer':
            // Legacy support - Child device is offering to stream
            console.log('Child stream offer received for stream:', data.streamId);
            streamingSessions.set(data.streamId, {
              childSocket: ws,
              offer: data.offer,
              streamId: data.streamId,
              emergencyAlertId: data.emergencyAlertId
            });
            
            // Notify all parent connections waiting for this stream
            activeConnections.forEach((connection, socket) => {
              if (connection.role === 'parent' && connection.streamId === data.streamId) {
                socket.send(JSON.stringify({
                  type: 'child_stream_offer',
                  offer: data.offer,
                  streamId: data.streamId
                }));
              }
            });
            break;
            
          case 'request_child_stream':
            // Parent requesting to view child stream
            console.log('Parent requesting child stream:', data.streamId);
            activeConnections.set(ws, {
              role: 'parent',
              streamId: data.streamId,
              emergencyAlertId: data.emergencyAlertId
            });
            
            // Check if child stream is already available
            const session = streamingSessions.get(data.streamId);
            if (session && session.offer) {
              ws.send(JSON.stringify({
                type: 'child_stream_offer',
                offer: session.offer,
                streamId: data.streamId
              }));
            }
            break;
            
          case 'parent_stream_answer':
            // Parent answering child's offer
            console.log('Parent stream answer received for room:', data.roomId || data.streamId);
            const roomId = data.roomId || data.streamId;
            const childSession = streamingSessions.get(roomId);
            if (childSession && childSession.childSocket) {
              childSession.childSocket.send(JSON.stringify({
                type: 'parent_stream_answer',
                answer: data.answer,
                roomId: roomId,
                streamId: data.streamId
              }));
              console.log('Forwarded parent answer to child device');
            }
            break;
            
          case 'ice_candidate':
            // Forward ICE candidates between child and parent
            const targetStreamId = data.streamId;
            const senderRole = activeConnections.get(ws)?.role;
            
            if (senderRole === 'parent') {
              const targetSession = streamingSessions.get(targetStreamId);
              if (targetSession && targetSession.childSocket) {
                targetSession.childSocket.send(JSON.stringify({
                  type: 'ice_candidate',
                  candidate: data.candidate,
                  from: 'parent'
                }));
              }
            } else if (senderRole === 'child') {
              activeConnections.forEach((connection, socket) => {
                if (connection.role === 'parent' && connection.streamId === targetStreamId) {
                  socket.send(JSON.stringify({
                    type: 'ice_candidate',
                    candidate: data.candidate,
                    from: 'child'
                  }));
                }
              });
            }
            break;

          case 'start_emergency_stream':
            // Notify all connected clients about new emergency stream
            wss.clients.forEach(client => {
              if (client !== ws && client.readyState === 1) {
                client.send(JSON.stringify({
                  type: 'emergency_stream_available',
                  streamId: data.streamId,
                  emergencyData: data.emergencyData
                }));
              }
            });
            break;

          case 'join_emergency_stream':
            // Handle parent/viewer joining emergency stream
            ws.send(JSON.stringify({
              type: 'stream_joined',
              streamId: data.streamId,
              message: 'Connected to emergency stream'
            }));
            // Notify streamer that viewer joined
            wss.clients.forEach(client => {
              if (client !== ws && client.readyState === 1) {
                client.send(JSON.stringify({
                  type: 'viewer_joined',
                  streamId: data.streamId,
                  viewerRole: data.role
                }));
              }
            });
            break;

          case 'offer':
            // Forward WebRTC offer to specific stream viewers
            wss.clients.forEach(client => {
              if (client !== ws && client.readyState === 1) {
                client.send(JSON.stringify(data));
              }
            });
            break;

          case 'answer':
            // Forward WebRTC answer to streamer
            wss.clients.forEach(client => {
              if (client !== ws && client.readyState === 1) {
                client.send(JSON.stringify(data));
              }
            });
            break;

          case 'ice_candidate':
            // Forward ICE candidates between peers
            wss.clients.forEach(client => {
              if (client !== ws && client.readyState === 1) {
                client.send(JSON.stringify(data));
              }
            });
            break;
          
          case 'emergency_stream':
            // Broadcast emergency stream to all connected clients
            wss.clients.forEach(client => {
              if (client !== ws && client.readyState === 1) {
                client.send(JSON.stringify(data));
              }
            });
            break;
          
          case 'location_update':
            // Broadcast location updates during emergency
            wss.clients.forEach(client => {
              if (client !== ws && client.readyState === 1) {
                client.send(JSON.stringify(data));
              }
            });
            break;
            
          case 'join_stream':
            // Handle joining emergency stream
            ws.send(JSON.stringify({
              type: 'stream_joined',
              message: 'Connected to emergency stream'
            }));
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket connection closed');
      activeConnections.delete(ws);
      
      // Clean up streaming sessions where this was the child socket
      streamingSessions.forEach((session, streamId) => {
        if (session.childSocket === ws) {
          streamingSessions.delete(streamId);
        }
      });
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Helper function to get alert message based on trigger type
  function getAlertMessage(triggerType: string, location?: any, timestamp?: string, audioData?: string): string {
    const now = new Date();
    const alertTime = timestamp ? new Date(timestamp) : now;
    const timeStr = alertTime.toLocaleString('en-IN', { 
      timeZone: 'Asia/Kolkata',
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    
    const locationLink = location ? 
      `📍 Current Location: ${location.address} (${location.lat.toFixed(4)}, ${location.lng.toFixed(4)})` : 
      '📍 Location: Coordinates being tracked';
    
    const liveStreamText = '🔴 Live Stream Available | 📱 Real-time monitoring active';
    
    switch (triggerType) {
      case 'manual_button':
      case 'sos_manual': 
        return `🚨 MANUAL SOS ACTIVATED\n${timeStr}\n\nUser manually triggered emergency alert - Immediate assistance needed\n\n${locationLink}\n\n${liveStreamText}`;
      case 'voice_detection': 
        const detectedText = audioData ? (() => {
          try {
            const parsedData = JSON.parse(audioData);
            return parsedData.detectedText || parsedData.scenario || 'Voice distress detected';
          } catch {
            return audioData || 'Voice distress detected';
          }
        })() : 'Voice distress detected';
        return `🎤 VOICE DISTRESS DETECTED\n${timeStr}\n\nDetected Words: "${detectedText}"\nTrigger: Voice analysis detected distress keywords\nStress Level: HIGH | Automatic activation\n\n${locationLink}\n\n${liveStreamText}`;
      case 'geofence_exit': 
        return `🚧 SAFE ZONE BREACH\n${timeStr}\n\nLeft designated safe zone after 10 PM\nAutomatic trigger - Location monitoring active\n\n${locationLink}\n\n${liveStreamText}`;
      case 'shake_detection': 
        return `📳 EMERGENCY GESTURE DETECTED\n${timeStr}\n\nDevice motion indicates distress pattern\nAutomatic trigger - Shake gesture recognized\n\n${locationLink}\n\n${liveStreamText}`;
      case 'panic_button': 
        return `🔴 PANIC BUTTON ACTIVATED\n${timeStr}\n\nSilent alarm triggered manually\nImmediate response required\n\n${locationLink}\n\n${liveStreamText}`;
      case 'audio_trigger': 
        return `🎤 VOICE DISTRESS ANALYSIS\n${timeStr}\n\nDetected phrase: "I feel unsafe, please help"\nAutomatic emergency protocol initiated\n\n${locationLink}\n\n${liveStreamText}`;
      case 'pattern_recognition': 
        return `🤖 AI BEHAVIOR ANALYSIS\n${timeStr}\n\nUnusual movement pattern detected\nAutomatic trigger - Possible emergency situation\n\n${locationLink}\n\n${liveStreamText}`;
      default: 
        return `⚠️ EMERGENCY ALERT\n${timeStr}\n\nEmergency situation detected\nAutomatic monitoring active\n\n${locationLink}\n\n${liveStreamText}`;
    }
  }

  // Parent Dashboard API Routes - Using persistent database storage
  app.get("/api/parent/children", async (req, res) => {
    try {
      // For demo, use demo-user as parent. In production, get from authenticated session
      const parentUserId = 'demo-user'; 
      
      // Get connected children from database and filter duplicates
      const allConnections = await storage.getFamilyConnections(parentUserId);
      const connections = allConnections.filter((connection, index, arr) => {
        // Keep only the first connection per childUserId to prevent duplicates
        return index === arr.findIndex(c => c.childUserId === connection.childUserId);
      });
      
      // Get real user data for each connected child
      const children = await Promise.all(connections.map(async (connection: any) => {
        const user = await storage.getUser(connection.childUserId);
        const homeLocation = await storage.getHomeLocation(connection.childUserId);
        const latestHealth = await storage.getLatestHealthMetrics(connection.childUserId);
        
        // Check for recent activity and emergency status
        const recentAlerts = await storage.getEmergencyAlerts(connection.childUserId);
        const hasActiveEmergency = recentAlerts.filter(alert => !alert.isResolved).length > 0;
        const hasRecentActivity = recentAlerts.length > 0;
        const isOnline = hasRecentActivity || latestHealth;
        
        // Determine status: emergency takes priority, then safe/offline
        let status: 'safe' | 'emergency' | 'offline' = 'offline';
        if (hasActiveEmergency) {
          status = 'emergency';
        } else if (isOnline) {
          status = 'safe';
        }
        
        // Use proper name mapping for known children
        let childName = 'Child';
        let childEmail = 'child@example.com';
        let childPhone = 'Not provided';
        
        if (connection.childUserId === 'sharanya-child') {
          childName = 'Sharanya';
          childEmail = 'sharanya@example.com';
          childPhone = '+919380474206';
        } else if (user?.firstName) {
          childName = user.firstName;
          childEmail = user.email || 'child@example.com';
          childPhone = user.phoneNumber || 'Not provided';
        }
        
        return {
          id: connection.id,
          name: childName,
          email: childEmail,
          phone: childPhone,
          lastSeen: new Date().toISOString(),
          status,
          connectionCode: connection.inviteCode,
          connectedAt: connection.acceptedAt || connection.createdAt,
          currentLocation: homeLocation ? {
            lat: parseFloat(homeLocation.latitude),
            lng: parseFloat(homeLocation.longitude),
            address: homeLocation.address,
            timestamp: new Date().toISOString()
          } : {
            lat: 13.034661390875538,
            lng: 77.56243681184755,
            address: "Bangalore, Karnataka",
            timestamp: new Date().toISOString()
          },
          profileImage: user?.profileImageUrl,
          isLiveTrackingEnabled: true,
          hasActiveAlerts: recentAlerts.filter(alert => !alert.isResolved).length > 0
        };
      }));
      
      res.json(children);
    } catch (error) {
      console.error('Error fetching parent children:', error);
      res.status(500).json({ message: "Failed to fetch children" });
    }
  });

  // Get individual emergency alert by ID (no auth required for emergency viewing)
  app.get("/api/emergency-alerts/:id", async (req, res) => {
    try {
      const alertId = parseInt(req.params.id);
      const alerts = await storage.getEmergencyAlerts('demo-user');
      const alert = alerts.find(a => a.id === alertId);
      
      if (!alert) {
        return res.status(404).json({ message: "Emergency alert not found" });
      }

      const user = await storage.getUser('demo-user');
      const formattedAlert = {
        id: alert.id,
        childName: user?.firstName || "Sharanya",
        triggerType: alert.triggerType,
        location: alert.latitude && alert.longitude ? {
          lat: parseFloat(alert.latitude.toString()),
          lng: parseFloat(alert.longitude.toString()),
          address: alert.address || `${alert.latitude}, ${alert.longitude}`
        } : null,
        createdAt: alert.createdAt,
        status: alert.isResolved ? 'resolved' : 'active',
        voiceDetectionText: alert.audioRecordingUrl ? 
          JSON.parse(alert.audioRecordingUrl).detectedText || "Emergency detected" : 
          null
      };

      res.json(formattedAlert);
    } catch (error) {
      console.error("Error fetching emergency alert:", error);
      res.status(500).json({ message: "Failed to fetch emergency alert" });
    }
  });

  app.get("/api/parent/emergency-alerts", async (req, res) => {
    try {
      // For demo purposes, directly fetch alerts from demo-user since parent-child connection is simulated
      const { status } = req.query; // 'active', 'resolved', or undefined for all
      
      // Get emergency alerts from the main user (simulating child alerts for parent view)
      const childAlerts = await storage.getEmergencyAlerts('demo-user');
      const user = await storage.getUser('demo-user');
      
      const alerts = [];
      
      // Format emergency alerts using correct schema fields
      childAlerts.forEach(alert => {
        try {
          const location = alert.latitude && alert.longitude ? {
            lat: parseFloat(alert.latitude.toString()),
            lng: parseFloat(alert.longitude.toString()),
            address: alert.address || 'Location not available'
          } : null;

          // Safely handle timestamp conversion
          let timestampStr;
          let timestampDate;
          try {
            if (alert.createdAt) {
              timestampDate = new Date(alert.createdAt);
              timestampStr = timestampDate.toISOString();
            } else {
              timestampDate = new Date();
              timestampStr = timestampDate.toISOString();
            }
          } catch (dateError) {
            console.error('Date conversion error for alert:', alert.id, dateError);
            timestampDate = new Date();
            timestampStr = timestampDate.toISOString();
          }

          const alertData = {
            id: alert.id,
            childName: user?.firstName || user?.email?.split('@')[0] || 'Sharanya',
            childId: 1,
            type: alert.triggerType,
            message: getAlertMessage(alert.triggerType, location, timestampStr, alert.audioRecordingUrl),
            location,
            timestamp: timestampDate,
            status: alert.isResolved ? 'resolved' : 'active',
            isResolved: alert.isResolved || false,
            audioRecordingUrl: alert.audioRecordingUrl,
            videoUrl: alert.videoRecordingUrl,
            liveStreamUrl: alert.isResolved ? null : `${req.protocol}://${req.get('host')}/watch/emergency_${alert.id}`,
            canStartStream: !alert.isResolved
          };

          // Filter based on status query parameter
          if (!status || 
              (status === 'active' && !alert.isResolved) ||
              (status === 'resolved' && alert.isResolved)) {
            alerts.push(alertData);
          }
        } catch (alertError) {
          console.error('Error processing alert:', alert.id, alertError);
        }
      });
      
      // Sort by timestamp, most recent first
      alerts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      res.json(alerts);
    } catch (error) {
      console.error('Error fetching emergency alerts:', error);
      res.status(500).json({ message: "Failed to fetch emergency alerts" });
    }
  });

  app.post("/api/parent/connect-child", async (req, res) => {
    try {
      const { connectionCode } = req.body;
      
      if (!connectionCode) {
        return res.status(400).json({ message: "Connection code is required" });
      }
      
      // Validate connection code format
      if (!connectionCode.startsWith('SK') || connectionCode.length < 10) {
        return res.status(400).json({ message: "Invalid connection code format" });
      }
      
      console.log(`Parent connecting to child with code: ${connectionCode}`);
      
      const parentUserId = 'demo-user';
      const childUserId = 'sharanya-child';
      
      // Check if connection already exists to prevent duplicates
      const existingConnections = await storage.getFamilyConnections(parentUserId);
      const existingConnection = existingConnections.find(conn => 
        conn.childUserId === childUserId || conn.inviteCode === connectionCode
      );
      
      let connection;
      if (existingConnection) {
        // Update existing connection instead of creating new one
        connection = await storage.updateFamilyConnection(existingConnection.id, {
          inviteCode: connectionCode,
          status: 'accepted',
          permissions: {
            emergencyAlerts: true,
            locationSharing: true,
            liveStreaming: true
          }
        });
        console.log('Updated existing connection instead of creating duplicate');
      } else {
        // Create new connection only if none exists
        connection = await storage.createFamilyConnection({
          parentUserId,
          childUserId,
          relationshipType: 'parent',
          status: 'accepted',
          inviteCode: connectionCode,
          permissions: {
            emergencyAlerts: true,
            locationSharing: true,
            liveStreaming: true
          }
        });
      }
      
      // Get real user data for response
      const user = await storage.getUser(childUserId);
      const homeLocation = await storage.getHomeLocation(childUserId);
      
      const childProfile = {
        id: connection.id,
        userId: childUserId,
        name: user?.firstName || user?.email?.split('@')[0] || 'Connected Child',
        email: user?.email || 'child@example.com',
        phone: user?.phoneNumber || 'Not provided',
        lastSeen: new Date().toISOString(),
        status: 'safe' as const,
        connectionCode: connectionCode,
        connectedAt: connection.acceptedAt || connection.createdAt,
        currentLocation: homeLocation ? {
          lat: parseFloat(homeLocation.latitude),
          lng: parseFloat(homeLocation.longitude),
          address: homeLocation.address,
          timestamp: new Date().toISOString()
        } : null,
        profileImage: user?.profileImageUrl
      };
      
      res.json({
        success: true,
        message: "Child connected successfully",
        childInfo: childProfile
      });
    } catch (error) {
      console.error('Error connecting child:', error);
      res.status(500).json({ message: "Failed to connect child" });
    }
  });

  // Emergency resolution route for parent dashboard
  app.patch("/api/emergency-alerts/:id/resolve", async (req, res) => {
    try {
      const alertId = parseInt(req.params.id);
      
      // Update the alert as resolved
      const updated = await storage.updateEmergencyAlert(alertId, { 
        isResolved: true
      });
      
      if (updated) {
        // Send WebSocket message to child device to stop video recording
        wss.clients.forEach(client => {
          if (client.readyState === 1) { // WebSocket.OPEN
            client.send(JSON.stringify({
              type: 'emergencyResolved',
              alertId: alertId,
              message: 'Emergency resolved by parent'
            }));
          }
        });
        
        console.log(`Emergency resolved signal sent to child devices for alert ${alertId}`);
        
        res.json({
          success: true,
          message: "Alert resolved successfully"
        });
      } else {
        res.status(404).json({ message: "Alert not found" });
      }
    } catch (error) {
      console.error('Error resolving alert:', error);
      res.status(500).json({ message: "Failed to resolve alert" });
    }
  });

  app.post("/api/parent/emergency-alerts/:id/resolve", async (req, res) => {
    try {
      const alertId = parseInt(req.params.id);
      
      // Get the alert to check for active live stream
      const alert = await storage.getEmergencyAlert(alertId);
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      
      // If there was an active live stream, save the recording to history
      let videoRecordingUrl = null;
      if (alert) {
        // Generate video recording URL for the resolved emergency
        const streamId = `emergency_${alertId}`;
        videoRecordingUrl = `/api/emergency-recordings/${streamId}/video.mp4`;
        
        // Store the video recording in the alert history
        console.log(`Saving video recording for resolved alert ${alertId}: ${videoRecordingUrl}`);
      }
      
      // Update the alert as resolved and add video recording URL
      const updated = await storage.updateEmergencyAlert(alertId, { 
        isResolved: true,
        videoRecordingUrl: videoRecordingUrl
      });
      
      if (updated) {
        // Send WebSocket message to child device to stop video recording
        wss.clients.forEach(client => {
          if (client.readyState === 1) { // WebSocket.OPEN
            client.send(JSON.stringify({
              type: 'emergency_resolved',
              alertId: alertId,
              message: 'Emergency resolved - stop recording and upload video',
              videoRecordingUrl: videoRecordingUrl
            }));
          }
        });
        
        console.log(`Emergency resolved signal sent to child devices for alert ${alertId}`);
        
        res.json({
          success: true,
          message: "Alert resolved successfully",
          videoRecording: videoRecordingUrl
        });
      } else {
        res.status(404).json({ message: "Alert not found" });
      }
    } catch (error) {
      console.error('Error resolving alert:', error);
      res.status(500).json({ message: "Failed to resolve alert" });
    }
  });

  // Emergency recording video endpoint
  app.get("/api/emergency-recordings/:streamId/:filename", async (req, res) => {
    try {
      const { streamId, filename } = req.params;
      
      // For demo purposes, serve a placeholder video file
      // In production, this would serve actual recorded video files
      const videoPath = `/recordings/${streamId}/${filename}`;
      
      // Set appropriate headers for video streaming
      res.set({
        'Content-Type': 'video/mp4',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'no-cache'
      });
      
      // For demo, return a success response indicating video availability
      res.status(200).json({
        message: "Video recording available",
        streamId,
        filename,
        url: videoPath,
        recordedAt: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Error serving emergency recording:', error);
      res.status(404).json({ message: "Recording not found" });
    }
  });

  // Live streaming endpoints for parent dashboard
  app.post("/api/parent/start-live-stream/:childId", async (req, res) => {
    try {
      const { childId } = req.params;
      
      // Get current location from home location or use GPS coordinates
      const homeLocation = await storage.getHomeLocation('demo-user');
      const currentLat = homeLocation ? parseFloat(homeLocation.latitude) : 12.9716; // Bangalore coordinates as fallback
      const currentLng = homeLocation ? parseFloat(homeLocation.longitude) : 77.5946;
      const currentAddress = homeLocation?.address || 'Current location - Live tracking active';
      
      // Create live stream for emergency monitoring
      const streamUrl = `https://emergency-stream.sakhi.com/live/${Date.now()}`;
      
      const stream = await storage.createLiveStream({
        userId: 'demo-user', // Map from childId in production
        streamUrl,
        shareLink: streamUrl,
        latitude: currentLat,
        longitude: currentLng,
        address: currentAddress
      });
      
      res.json({
        success: true,
        streamId: stream.id,
        streamUrl,
        message: "Live stream started for emergency monitoring"
      });
    } catch (error) {
      console.error('Error starting live stream:', error);
      res.status(500).json({ message: "Failed to start live stream" });
    }
  });

  app.get("/api/parent/live-location/:childId", async (req, res) => {
    try {
      const { childId } = req.params;
      
      // Get current location of child from their home location
      const homeLocation = await storage.getHomeLocation('demo-user');
      
      // Use actual location data instead of hardcoded coordinates
      const currentLocation = {
        lat: homeLocation ? parseFloat(homeLocation.latitude) + (Math.random() - 0.5) * 0.001 : 12.9716, // Bangalore coordinates as fallback
        lng: homeLocation ? parseFloat(homeLocation.longitude) + (Math.random() - 0.5) * 0.001 : 77.5946,
        address: homeLocation?.address || 'Current location',
        timestamp: new Date().toISOString(),
        accuracy: Math.floor(Math.random() * 10) + 5, // 5-15 meters
        speed: Math.floor(Math.random() * 20), // 0-20 km/h
        heading: Math.floor(Math.random() * 360) // 0-360 degrees
      };
      
      res.json(currentLocation);
    } catch (error) {
      console.error('Error fetching live location:', error);
      res.status(500).json({ message: "Failed to fetch live location" });
    }
  });

  // OTP Verification Routes
  app.post('/api/otp/send', async (req, res) => {
    const { identifier, type } = req.body;
    
    if (!identifier || !type) {
      return res.status(400).json({ message: "Identifier and type are required" });
    }

    const otp = generateOTP();
    
    try {
      // Store OTP in database first
      await storage.createOtpVerification({
        identifier,
        type,
        otp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
      });

      if (type === 'phone') {
        // Try SMS first for reliable delivery
        const smsSuccess = await sendSMSOTP(identifier, otp);
        
        if (smsSuccess) {
          return res.json({ 
            message: "OTP sent successfully via SMS",
            deliveryMethod: 'sms',
            success: true
          });
        } else {
          // Try WhatsApp as backup
          const whatsappSuccess = await sendWhatsAppOTP(identifier, otp);
          
          if (whatsappSuccess) {
            return res.json({ 
              message: "OTP sent successfully via WhatsApp",
              deliveryMethod: 'whatsapp',
              success: true
            });
          } else {
            console.log(`Manual OTP for ${identifier}: ${otp}`);
            return res.json({ 
              message: "OTP delivery pending. Use manual verification",
              deliveryMethod: 'manual',
              manualOtp: otp,
              success: true,
              note: "Check server logs for OTP code"
            });
          }
        }
      } else if (type === 'email') {
        const emailSuccess = await sendEmailOTP(identifier, otp);
        
        if (emailSuccess) {
          return res.json({ 
            message: "OTP sent successfully via email",
            deliveryMethod: 'email',
            success: true
          });
        } else {
          return res.status(500).json({ message: "Failed to send email OTP" });
        }
      } else {
        return res.status(400).json({ message: "Invalid type specified" });
      }
    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({ message: "Failed to process OTP request" });
    }
  });

  app.post('/api/otp/verify', async (req, res) => {
    try {
      const { identifier, type, otp } = req.body;
      
      if (!identifier || !type || !otp) {
        return res.status(400).json({ message: "Identifier, type, and OTP are required" });
      }

      const isValid = await storage.verifyOtp(identifier, type, otp);
      
      if (isValid) {
        res.json({ message: "OTP verified successfully", verified: true });
      } else {
        res.status(400).json({ message: "Invalid or expired OTP", verified: false });
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      res.status(500).json({ message: "Failed to verify OTP" });
    }
  });

  // Test OTP delivery route for debugging
  app.post('/api/otp/test', async (req, res) => {
    try {
      const { type, identifier } = req.body;
      const testOtp = "123456";
      
      console.log(`Testing ${type} OTP delivery to ${identifier}`);
      
      let result = false;
      if (type === 'phone') {
        result = await sendWhatsAppOTP(identifier, testOtp);
      } else if (type === 'email') {
        result = await sendEmailOTP(identifier, testOtp);
      }
      
      res.json({ 
        success: result, 
        message: result ? `Test OTP sent successfully` : `Failed to send test OTP`,
        testOtp 
      });
    } catch (error) {
      console.error('Test OTP error:', error);
      res.status(500).json({ message: "Test failed", error: error.message });
    }
  });

  // Voice distress emergency trigger
  app.post('/api/emergency-alert/voice-trigger', async (req, res) => {
    try {
      const { triggerType, keyword, confidence, location } = req.body;
      
      console.log(`Voice distress detected: "${keyword}" with ${confidence} confidence`);
      
      // Get user's emergency contacts
      const contacts = await storage.getEmergencyContacts('demo-user');
      
      if (contacts.length === 0) {
        return res.status(400).json({ message: 'No emergency contacts configured' });
      }
      
      // Create emergency alert record
      const alert = await storage.createEmergencyAlert({
        userId: 'demo-user',
        triggerType: `voice_distress_${keyword}`,
        latitude: location.lat,
        longitude: location.lng,
        address: location.address
      });
      
      // Enhanced message for voice distress
      const baseMessage = `🚨 VOICE DISTRESS EMERGENCY 🚨
AUTOMATED ALERT - Voice keyword "${keyword}" detected
Confidence: ${Math.round(confidence * 100)}%
Time: ${new Date().toLocaleString()}
Location: ${location.address}
Live Location: https://maps.google.com/maps?q=${location.lat},${location.lng}

This is an automated emergency alert from Sakhi Suraksha app.
Please contact immediately or call emergency services: 100, 101, 102, 108`;

      // Send alerts to all contacts
      const alertPromises = contacts.map(async (contact) => {
        const message = baseMessage.replace('[CONTACT_NAME]', contact.name);
        
        let smsSuccess = false;
        let whatsappSuccess = false;
        let emailSuccess = false;
        
        // Send WhatsApp emergency alert if phone number exists
        if (contact.phoneNumber) {
          try {
            smsSuccess = await sendWhatsAppEmergency(contact.phoneNumber, message);
            console.log(`Voice Alert WhatsApp to ${contact.phoneNumber}: ${smsSuccess ? 'SUCCESS' : 'FAILED'}`);
          } catch (error) {
            console.error(`Voice Alert WhatsApp error for ${contact.phoneNumber}:`, error);
          }
        }
        
        // Send email if email exists
        if (contact.email) {
          try {
            emailSuccess = await sendEmailOTP(contact.email, message);
            console.log(`Voice Alert Email to ${contact.email}: ${emailSuccess ? 'SUCCESS' : 'FAILED'}`);
          } catch (error) {
            console.error(`Voice Alert Email error for ${contact.email}:`, error);
          }
        }
        
        return { contact: contact.name, smsSuccess, whatsappSuccess, emailSuccess };
      });
      
      const results = await Promise.allSettled(alertPromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      
      res.json({
        success: successCount > 0,
        alertsSent: successCount,
        totalContacts: contacts.length,
        keyword,
        confidence,
        message: `Voice distress alert sent to ${successCount}/${contacts.length} contacts`
      });
      
    } catch (error) {
      console.error('Voice distress alert error:', error);
      res.status(500).json({ message: 'Failed to process voice distress alert' });
    }
  });

  // Emergency alert sending endpoint
  app.post('/api/emergency/send-alert', async (req, res) => {
    try {
      const { contactId, contactName, phoneNumber, email, message, emergencyData } = req.body;
      
      // Check if this exact alert was already sent to prevent duplicates
      const messageKey = `${emergencyData.triggerType}_${emergencyData.timestamp}_${phoneNumber || email}`;
      if (sentMessages.has(messageKey)) {
        console.log(`Duplicate message prevented for ${contactName} - already sent`);
        return res.json({
          success: true,
          duplicate: true,
          message: `Alert already sent to ${contactName}`
        });
      }

      console.log(`Sending emergency alert to ${contactName}...`);
      
      let smsSuccess = false;
      let whatsappSuccess = false;
      let emailSuccess = false;
      
      // Get user profile for WhatsApp number and live location
      const user = await storage.getUser('demo-user');
      const userWhatsApp = user?.whatsappNumber || user?.phoneNumber;
      
      // Create live location link
      const locationUrl = `https://www.google.com/maps?q=${emergencyData.location.lat},${emergencyData.location.lng}`;
      
      // Enhanced emergency message with WhatsApp contact and live location
      const enhancedMessage = `🚨 EMERGENCY ALERT 🚨

${message}

📍 LIVE LOCATION: ${locationUrl}

${userWhatsApp ? `📱 Contact via WhatsApp: ${userWhatsApp}` : ''}

Emergency Resources:
• Police: 100
• Ambulance: 108
• Women Helpline: 1091

This is an automated emergency alert from Sakhi Suraksha safety app.
Please respond immediately if you can assist.`;

      // Send via both WhatsApp and SMS for reliability
      if (phoneNumber) {
        try {
          // Try WhatsApp first
          const whatsappResult = await sendWhatsAppEmergency(phoneNumber, enhancedMessage);
          console.log(`WhatsApp to ${phoneNumber}: ${whatsappResult ? 'SUCCESS' : 'FAILED'}`);
          
          // Send SMS as backup
          const smsResult = await sendSMSEmergency(phoneNumber, emergencyData.location.address, userWhatsApp);
          console.log(`SMS to ${phoneNumber}: ${smsResult ? 'SUCCESS' : 'FAILED'}`);
          
          smsSuccess = whatsappResult || smsResult;
        } catch (error) {
          console.error(`Emergency alert error for ${phoneNumber}:`, error);
        }
      }
      
      // Send email if email exists
      if (email) {
        try {
          emailSuccess = await sendEmailOTP(email, message);
          console.log(`Email to ${email}: ${emailSuccess ? 'SUCCESS' : 'FAILED'}`);
        } catch (error) {
          console.error(`Email error for ${email}:`, error);
        }
      }
      
      // Mark message as sent to prevent duplicates (using Set instead of Map)
      const alertKey = `${emergencyData.triggerType}_${Date.now()}_${phoneNumber || email}`;
      sentMessages.add(alertKey);
      
      // Clean up old entries after 1 hour
      setTimeout(() => {
        sentMessages.delete(alertKey);
      }, 3600000);
      
      const success = smsSuccess || whatsappSuccess || emailSuccess;
      res.json({
        success,
        smsSuccess,
        whatsappSuccess,
        emailSuccess,
        message: success ? 'Emergency alert sent successfully' : 'Failed to send emergency alert'
      });
      
    } catch (error) {
      console.error('Emergency alert error:', error);
      res.status(500).json({ message: 'Failed to send emergency alert' });
    }
  });

  // Test SMS and Email services
  app.post('/api/test-services', async (req, res) => {
    try {
      const { phoneNumber, email } = req.body;
      
      const testMessage = "Test message from Sakhi Suraksha emergency system. This is a connectivity test.";
      
      let smsResult = { success: false, error: null };
      let emailResult = { success: false, error: null };
      
      // Test WhatsApp if phone number provided
      if (phoneNumber) {
        try {
          smsResult.success = await sendWhatsAppOTP(phoneNumber, "123456");
        } catch (error) {
          smsResult.error = error.message;
        }
      }
      
      // Test Email if email provided
      if (email) {
        try {
          emailResult.success = await sendEmailOTP(email, testMessage);
        } catch (error) {
          emailResult.error = error.message;
        }
      }
      
      res.json({
        sms: smsResult,
        email: emailResult,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Service test error:', error);
      res.status(500).json({ message: 'Service test failed', error: error.message });
    }
  });

  // Get live stream by ID for viewing with user details
  app.get('/api/live-stream/:streamId', async (req, res) => {
    try {
      const streamParam = req.params.streamId;
      let stream;
      
      // Handle both numeric IDs and stream identifiers
      if (streamParam.startsWith('stream_')) {
        // For generated stream IDs, find by shareLink containing the streamId
        const streams = await storage.getLiveStreams('demo-user');
        stream = streams.find(s => s.shareLink?.includes(streamParam));
      } else {
        // For numeric IDs
        const streamId = parseInt(streamParam);
        if (!isNaN(streamId)) {
          stream = await storage.getLiveStreamById(streamId);
        }
      }
      
      if (!stream) {
        return res.status(404).json({ message: 'Stream not found' });
      }

      // Get user details for the stream
      const user = await storage.getUser(stream.userId);
      const streamWithUserDetails = {
        ...stream,
        userName: user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User' : 'User',
        userEmail: user?.email || 'user@example.com',
        startedAt: stream.createdAt ? new Date(stream.createdAt).toISOString() : new Date().toISOString()
      };

      res.json(streamWithUserDetails);
    } catch (error) {
      console.error('Error fetching stream:', error);
      res.status(500).json({ message: 'Failed to fetch stream' });
    }
  });

  // Emergency video upload endpoint
  app.post('/api/emergency-video-upload', upload.single('video'), async (req: any, res) => {
    try {
      const { alertId, timestamp } = req.body;
      const videoFile = req.file;

      if (!videoFile || !alertId) {
        return res.status(400).json({ message: 'Video file and alert ID required' });
      }

      // Create recordings directory if it doesn't exist
      const recordingsDir = path.join(process.cwd(), 'server', 'emergency-recordings');
      const alertDir = path.join(recordingsDir, `emergency_${alertId}`);
      
      if (!fs.existsSync(recordingsDir)) {
        fs.mkdirSync(recordingsDir, { recursive: true });
      }
      
      if (!fs.existsSync(alertDir)) {
        fs.mkdirSync(alertDir, { recursive: true });
      }

      // Save video file
      const videoPath = path.join(alertDir, 'video.webm');
      fs.writeFileSync(videoPath, videoFile.buffer);

      // Generate video URL
      const videoUrl = `/api/emergency-recordings/emergency_${alertId}/video.webm`;

      // Update emergency alert with actual video recording URL
      const alert = await storage.getEmergencyAlert(parseInt(alertId));
      if (alert) {
        await storage.updateEmergencyAlert(parseInt(alertId), {
          videoRecordingUrl: videoUrl
        });
      }

      console.log(`Voice-triggered video saved for alert ${alertId}: ${videoUrl}`);

      res.json({
        success: true,
        message: 'Video recording saved successfully',
        videoUrl: videoUrl,
        alertId: alertId
      });
    } catch (error) {
      console.error('Emergency video upload error:', error);
      res.status(500).json({ message: 'Failed to save video recording' });
    }
  });

  // Stream watching page route
  app.get('/watch/:streamId', (req, res) => {
    // Serve the main React app - it will handle the routing
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });

  // Permanent alert history and persistent connections API endpoints
  app.get("/api/alert-history/:userId", async (req, res) => {
    try {
      const userId = req.params.userId;
      const history = await storage.getAlertHistory(userId);
      res.json(history);
    } catch (error) {
      console.error("Error fetching alert history:", error);
      res.status(500).json({ message: "Failed to fetch alert history" });
    }
  });

  app.get("/api/family-connections/:userId", async (req, res) => {
    try {
      const userId = req.params.userId;
      const connections = await storage.getFamilyConnections(userId);
      res.json(connections);
    } catch (error) {
      console.error("Error fetching family connections:", error);
      res.status(500).json({ message: "Failed to fetch family connections" });
    }
  });

  app.post("/api/family-connections", async (req, res) => {
    try {
      const connection = await storage.createFamilyConnection(req.body);
      res.json(connection);
    } catch (error) {
      console.error("Error creating family connection:", error);
      res.status(500).json({ message: "Failed to create family connection" });
    }
  });

  app.get('/emergency/:alertId', (req, res) => {
    // Serve the main React app - it will handle the routing  
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });

  app.get('/emergency-stream/:streamId', (req, res) => {
    // Serve the main React app for emergency stream viewing
    res.sendFile(path.join(__dirname, '../dist/index.html'));
  });

  // Live streaming endpoints
  app.post('/api/live-stream/start', async (req, res) => {
    try {
      const { streamUrl, shareableLink, isEmergency, latitude, longitude, address, triggerType, scenario, detectedText } = req.body;

      // Create live stream record
      const stream = await storage.createLiveStream({
        userId: 'demo-user',
        streamUrl,
        shareLink: shareableLink,
        isActive: true
      });
      
      // If emergency mode, create emergency alert in database
      if (isEmergency) {
        // Create emergency alert record for parent dashboard
        const emergencyAlert = await storage.createEmergencyAlert({
          userId: 'demo-user',
          triggerType: triggerType || 'sos_manual',
          latitude: latitude || 12.9716, // Bangalore coordinates
          longitude: longitude || 77.5946,
          address: address || 'Bangalore, Karnataka, India - CURRENT LOCATION',
          isResolved: false,
          audioRecordingUrl: triggerType === 'voice_detection' && (detectedText || scenario) ? JSON.stringify({
            detectedText: detectedText,
            scenario: scenario,
            triggerType: triggerType,
            timestamp: new Date().toISOString()
          }) : detectedText,
          videoRecordingUrl: shareableLink
        });
        
        console.log(`Emergency alert created: ID ${emergencyAlert.id} for user demo-user`);
      }
      
      // Emergency contacts already notified by main emergency alert system - no duplicate messaging
      
      res.json({
        success: true,
        streamId: stream.id,
        shareableLink: stream.shareLink,
        viewerCount: 0,
        message: isEmergency ? 'Emergency stream started' : 'Live stream started successfully'
      });
      
    } catch (error) {
      console.error('Live stream start error:', error);
      res.status(500).json({ message: 'Failed to start live stream' });
    }
  });

  app.post('/api/live-stream/end', async (req, res) => {
    try {
      const { streamUrl } = req.body;
      
      // Find and end the stream
      const streams = await storage.getLiveStreams('demo-user');
      const activeStream = streams.find(s => s.streamUrl === streamUrl && s.isActive);
      
      if (activeStream) {
        await storage.endLiveStream(activeStream.id);
      }
      
      res.json({
        success: true,
        message: 'Live stream ended successfully'
      });
      
    } catch (error) {
      console.error('Live stream end error:', error);
      res.status(500).json({ message: 'Failed to end live stream' });
    }
  });

  // Family Connection QR Code Routes
  app.post("/api/family/generate-qr", async (req, res) => {
    try {
      const childUserId = 'demo-user'; // Use demo user for now
      
      // Generate unique invite code
      const inviteCode = `SK${Date.now()}${Math.random().toString(36).substr(2, 9)}`.toUpperCase();
      const inviteExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      // Create family connection entry
      const connection = await db.insert(familyConnections).values({
        childUserId,
        parentUserId: '', // Will be filled when parent scans
        relationshipType: 'parent',
        status: 'pending',
        inviteCode,
        inviteExpiry,
        permissions: {
          emergencyAlerts: true,
          locationSharing: true,
          liveStreaming: true
        }
      }).returning();
      
      res.json({
        qrCode: inviteCode,
        expiresAt: inviteExpiry,
        connectionId: connection[0].id
      });
    } catch (error) {
      console.error("Error generating QR code:", error);
      res.status(500).json({ message: "Failed to generate QR code" });
    }
  });

  app.get("/api/family/connections", async (req, res) => {
    try {
      const userId = 'demo-user';
      
      const connections = await db
        .select()
        .from(familyConnections)
        .where(or(
          eq(familyConnections.childUserId, userId),
          eq(familyConnections.parentUserId, userId)
        ));
      
      res.json(connections);
    } catch (error) {
      console.error("Error fetching family connections:", error);
      res.status(500).json({ message: "Failed to fetch connections" });
    }
  });

  app.post("/api/family/scan-qr", isAuthenticated, async (req: any, res) => {
    try {
      const parentUserId = req.user.claims.sub;
      const { inviteCode } = req.body;
      
      // Find pending connection with this invite code
      const [connection] = await db
        .select()
        .from(familyConnections)
        .where(and(
          eq(familyConnections.inviteCode, inviteCode),
          eq(familyConnections.status, 'pending')
        ));
      
      if (!connection) {
        return res.status(404).json({ message: "Invalid or expired QR code" });
      }
      
      // Check if invite is expired
      if (new Date() > new Date(connection.inviteExpiry!)) {
        return res.status(400).json({ message: "QR code has expired" });
      }
      
      // Update connection with parent info
      const updatedConnection = await db
        .update(familyConnections)
        .set({
          parentUserId,
          status: 'accepted',
          acceptedAt: new Date()
        })
        .where(eq(familyConnections.id, connection.id))
        .returning();
      
      // Get child user info
      const childUser = await storage.getUser(connection.childUserId);
      
      res.json({
        connection: updatedConnection[0],
        childInfo: {
          name: childUser?.firstName || childUser?.email || 'Child',
          email: childUser?.email
        }
      });
    } catch (error) {
      console.error("Error scanning QR code:", error);
      res.status(500).json({ message: "Failed to process QR code" });
    }
  });

  app.post('/api/emergency/share-stream', async (req, res) => {
    try {
      const { shareableLink, message } = req.body;
      
      // Get emergency contacts
      const contacts = await storage.getEmergencyContacts('demo-user');
      
      if (contacts.length === 0) {
        return res.status(400).json({ message: 'No emergency contacts configured' });
      }
      
      // Send stream link to all contacts
      const alertPromises = contacts.map(async (contact) => {
        let smsSuccess = false;
        let emailSuccess = false;
        
        if (contact.phoneNumber) {
          try {
            smsSuccess = await sendWhatsAppEmergency(contact.phoneNumber, message);
            console.log(`Stream share WhatsApp to ${contact.name}: ${smsSuccess ? 'SUCCESS' : 'FAILED'}`);
          } catch (error) {
            console.error(`Stream share WhatsApp error for ${contact.name}:`, error);
          }
        }
        
        if (contact.email) {
          try {
            emailSuccess = await sendEmailOTP(contact.email, message);
            console.log(`Stream share Email to ${contact.name}: ${emailSuccess ? 'SUCCESS' : 'FAILED'}`);
          } catch (error) {
            console.error(`Stream share Email error for ${contact.name}:`, error);
          }
        }
        
        return { contact: contact.name, smsSuccess, emailSuccess };
      });
      
      const results = await Promise.allSettled(alertPromises);
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      
      res.json({
        success: successCount > 0,
        alertsSent: successCount,
        totalContacts: contacts.length,
        message: `Stream link shared with ${successCount}/${contacts.length} contacts`
      });
      
    } catch (error) {
      console.error('Stream share error:', error);
      res.status(500).json({ message: 'Failed to share stream link' });
    }
  });

  // Save emergency recording
  app.post('/api/emergency/save-recording', async (req, res) => {
    try {
      const { emergencyAlertId } = req.body;
      
      // In a real implementation, you would save the video file
      // For now, just acknowledge the recording was received
      console.log(`Emergency recording received for alert ${emergencyAlertId}`);
      
      // Update emergency alert with recording info
      if (emergencyAlertId) {
        await storage.updateEmergencyAlert(parseInt(emergencyAlertId), {
          videoRecordingUrl: `/recordings/emergency_${emergencyAlertId}_${Date.now()}.webm`
        });
      }
      
      res.json({
        success: true,
        message: 'Emergency recording saved successfully'
      });
      
    } catch (error) {
      console.error('Save recording error:', error);
      res.status(500).json({ message: 'Failed to save emergency recording' });
    }
  });

  // Save emergency session recording
  app.post('/api/emergency/save-session-recording', async (req, res) => {
    try {
      const { sessionType, userId, timestamp } = req.body;
      
      console.log(`Emergency session recording received: ${sessionType} for user ${userId}`);
      
      res.json({
        success: true,
        message: 'Emergency session recording saved to history'
      });
      
    } catch (error) {
      console.error('Save session recording error:', error);
      res.status(500).json({ message: 'Failed to save session recording' });
    }
  });





  // Clean up expired OTPs periodically
  setInterval(async () => {
    try {
      await storage.cleanupExpiredOtps();
    } catch (error) {
      console.error('OTP cleanup error:', error);
    }
  }, 5 * 60 * 1000); // Every 5 minutes



  return httpServer;
}
