import { db } from "./db";
import { eq, and, or } from "drizzle-orm";
import {
  users,
  emergencyContacts,
  emergencyAlerts,
  communityAlerts,
  safeZones,
  liveStreams,
  destinations,
  homeLocations,
  otpVerifications,
  iotDevices,
  healthMetrics,
  stressAnalysis,
  iotEmergencyTriggers,
  familyConnections,
  type User,
  type UpsertUser,
  type EmergencyContact,
  type InsertEmergencyContact,
  type EmergencyAlert,
  type InsertEmergencyAlert,
  type CommunityAlert,
  type InsertCommunityAlert,
  type SafeZone,
  type InsertSafeZone,
  type LiveStream,
  type InsertLiveStream,
  type Destination,
  type InsertDestination,
  type HomeLocation,
  type InsertHomeLocation,
  type OtpVerification,
  type InsertOtpVerification,
  type IotDevice,
  type InsertIotDevice,
  type HealthMetric,
  type InsertHealthMetric,
  type StressAnalysis,
  type InsertStressAnalysis,
  type IotEmergencyTrigger,
  type InsertIotEmergencyTrigger,
  type FamilyConnection,
  type InsertFamilyConnection,
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<UpsertUser>): Promise<User | undefined>;

  // Emergency contacts operations
  getEmergencyContacts(userId: string): Promise<EmergencyContact[]>;
  createEmergencyContact(contact: InsertEmergencyContact): Promise<EmergencyContact>;
  updateEmergencyContact(id: number, updates: Partial<InsertEmergencyContact>): Promise<EmergencyContact | undefined>;
  deleteEmergencyContact(id: number): Promise<boolean>;

  // Emergency alerts operations
  createEmergencyAlert(alert: InsertEmergencyAlert): Promise<EmergencyAlert>;
  getEmergencyAlert(id: number): Promise<EmergencyAlert | undefined>;
  getEmergencyAlerts(userId: string): Promise<EmergencyAlert[]>;
  updateEmergencyAlert(id: number, updates: Partial<InsertEmergencyAlert>): Promise<EmergencyAlert | undefined>;

  // Community alerts operations
  getCommunityAlerts(latitude: number, longitude: number, radius: number): Promise<CommunityAlert[]>;
  createCommunityAlert(alert: InsertCommunityAlert): Promise<CommunityAlert>;
  
  // Safe zones operations
  getSafeZones(userId: string): Promise<SafeZone[]>;
  createSafeZone(zone: InsertSafeZone): Promise<SafeZone>;
  deleteSafeZone(id: number): Promise<boolean>;

  // Live streaming operations
  createLiveStream(stream: InsertLiveStream): Promise<LiveStream>;
  getLiveStreams(userId: string): Promise<LiveStream[]>;
  getLiveStreamById(id: number): Promise<LiveStream | undefined>;
  endLiveStream(id: number): Promise<boolean>;

  // Destinations operations
  getDestinations(userId: string): Promise<Destination[]>;
  createDestination(destination: InsertDestination): Promise<Destination>;
  deleteDestination(id: number): Promise<boolean>;

  // Home location operations
  getHomeLocation(userId: string): Promise<HomeLocation | undefined>;
  setHomeLocation(homeLocation: InsertHomeLocation): Promise<HomeLocation>;
  updateHomeLocation(userId: string, updates: Partial<InsertHomeLocation>): Promise<HomeLocation | undefined>;

  // OTP verification operations
  createOtpVerification(otp: InsertOtpVerification): Promise<OtpVerification>;
  verifyOtp(identifier: string, type: string, otp: string): Promise<boolean>;
  cleanupExpiredOtps(): Promise<void>;

  // IoT Device operations
  getIotDevices(userId: string): Promise<IotDevice[]>;
  createIotDevice(device: InsertIotDevice): Promise<IotDevice>;
  updateIotDevice(id: number, updates: Partial<InsertIotDevice>): Promise<IotDevice | undefined>;
  updateDeviceBattery(id: number, batteryLevel: number): Promise<boolean>;
  deleteIotDevice(id: number): Promise<boolean>;
  connectDevice(id: number): Promise<boolean>;
  disconnectDevice(id: number): Promise<boolean>;

  // Health Metrics operations
  getHealthMetrics(userId: string, limit?: number): Promise<HealthMetric[]>;
  createHealthMetric(metric: InsertHealthMetric): Promise<HealthMetric>;
  getLatestHealthMetrics(userId: string): Promise<HealthMetric | undefined>;

  // Stress Analysis operations
  getStressAnalysis(userId: string, limit?: number): Promise<StressAnalysis[]>;
  createStressAnalysis(analysis: InsertStressAnalysis): Promise<StressAnalysis>;
  getLatestStressAnalysis(userId: string): Promise<StressAnalysis | undefined>;

  // IoT Emergency Triggers operations
  getIotEmergencyTriggers(userId: string): Promise<IotEmergencyTrigger[]>;
  createIotEmergencyTrigger(trigger: InsertIotEmergencyTrigger): Promise<IotEmergencyTrigger>;
  resolveIotEmergencyTrigger(id: number): Promise<boolean>;

  // Family Connections operations
  getFamilyConnections(userId: string): Promise<FamilyConnection[]>;
  createFamilyConnection(connection: InsertFamilyConnection): Promise<FamilyConnection>;
  updateFamilyConnection(id: number, updates: Partial<InsertFamilyConnection>): Promise<FamilyConnection | undefined>;
  getFamilyConnectionByInviteCode(inviteCode: string): Promise<FamilyConnection | undefined>;
  getConnectedChildren(parentUserId: string): Promise<FamilyConnection[]>;
  getConnectedParents(childUserId: string): Promise<FamilyConnection[]>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    // First check if user exists by ID
    const existingUserById = await this.getUser(userData.id);
    
    if (existingUserById) {
      // User exists by ID, update their data without changing ID
      const updateData = { ...userData };
      delete updateData.id; // Don't update the ID to avoid foreign key issues
      
      const updated = await this.updateUser(userData.id, updateData);
      if (!updated) {
        throw new Error('Failed to update user');
      }
      return updated;
    }
    
    // Check if user exists by email (for email-based lookup)
    if (userData.email) {
      const [existingUserByEmail] = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email));
      
      if (existingUserByEmail) {
        // User exists with this email, update them without changing ID
        const updateData = { ...userData };
        delete updateData.id; // Don't update the ID to avoid foreign key issues
        
        const updated = await this.updateUser(existingUserByEmail.id, updateData);
        if (!updated) {
          throw new Error('Failed to update user');
        }
        return updated;
      }
    }
    
    // User doesn't exist, insert new user
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<UpsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user || undefined;
  }

  // Emergency contacts operations
  async getEmergencyContacts(userId: string): Promise<EmergencyContact[]> {
    return await db
      .select()
      .from(emergencyContacts)
      .where(and(eq(emergencyContacts.userId, userId), eq(emergencyContacts.isActive, true)));
  }

  async createEmergencyContact(contact: InsertEmergencyContact): Promise<EmergencyContact> {
    const [newContact] = await db
      .insert(emergencyContacts)
      .values(contact)
      .returning();
    return newContact;
  }

  async updateEmergencyContact(id: number, updates: Partial<InsertEmergencyContact>): Promise<EmergencyContact | undefined> {
    const [contact] = await db
      .update(emergencyContacts)
      .set(updates)
      .where(eq(emergencyContacts.id, id))
      .returning();
    return contact || undefined;
  }

  async deleteEmergencyContact(id: number): Promise<boolean> {
    const result = await db
      .delete(emergencyContacts)
      .where(eq(emergencyContacts.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Emergency alerts operations
  async createEmergencyAlert(alert: InsertEmergencyAlert): Promise<EmergencyAlert> {
    const [newAlert] = await db
      .insert(emergencyAlerts)
      .values(alert)
      .returning();
    return newAlert;
  }

  async getEmergencyAlert(id: number): Promise<EmergencyAlert | undefined> {
    const [alert] = await db
      .select()
      .from(emergencyAlerts)
      .where(eq(emergencyAlerts.id, id));
    return alert || undefined;
  }

  async getEmergencyAlerts(userId: string): Promise<EmergencyAlert[]> {
    return await db
      .select()
      .from(emergencyAlerts)
      .where(eq(emergencyAlerts.userId, userId));
  }

  async updateEmergencyAlert(id: number, updates: Partial<InsertEmergencyAlert>): Promise<EmergencyAlert | undefined> {
    const [alert] = await db
      .update(emergencyAlerts)
      .set(updates)
      .where(eq(emergencyAlerts.id, id))
      .returning();
    return alert || undefined;
  }

  // Community alerts operations
  async getCommunityAlerts(latitude: number, longitude: number, radius: number): Promise<CommunityAlert[]> {
    // For now, return all alerts within a reasonable distance
    // In production, this would use PostGIS or similar spatial queries
    const alerts = await db.select().from(communityAlerts);
    return alerts.filter(alert => {
      const distance = this.calculateDistance(latitude, longitude, alert.latitude, alert.longitude);
      return distance <= radius;
    });
  }

  async createCommunityAlert(alert: InsertCommunityAlert): Promise<CommunityAlert> {
    const [newAlert] = await db
      .insert(communityAlerts)
      .values(alert)
      .returning();
    return newAlert;
  }

  // Safe zones operations
  async getSafeZones(userId: string): Promise<SafeZone[]> {
    return await db
      .select()
      .from(safeZones)
      .where(and(eq(safeZones.userId, userId), eq(safeZones.isActive, true)));
  }

  async createSafeZone(zone: InsertSafeZone): Promise<SafeZone> {
    const [newZone] = await db
      .insert(safeZones)
      .values(zone)
      .returning();
    return newZone;
  }

  async deleteSafeZone(id: number): Promise<boolean> {
    const result = await db
      .delete(safeZones)
      .where(eq(safeZones.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Live streaming operations
  async createLiveStream(stream: InsertLiveStream): Promise<LiveStream> {
    const [newStream] = await db
      .insert(liveStreams)
      .values(stream)
      .returning();
    return newStream;
  }

  async getLiveStreamById(id: number): Promise<LiveStream | undefined> {
    const [stream] = await db
      .select()
      .from(liveStreams)
      .where(eq(liveStreams.id, id));
    return stream;
  }

  async getLiveStreams(userId: string): Promise<LiveStream[]> {
    return await db
      .select()
      .from(liveStreams)
      .where(eq(liveStreams.userId, userId));
  }

  async endLiveStream(id: number): Promise<boolean> {
    const result = await db
      .update(liveStreams)
      .set({ isActive: false, endedAt: new Date() })
      .where(eq(liveStreams.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Destinations operations
  async getDestinations(userId: string): Promise<Destination[]> {
    return await db
      .select()
      .from(destinations)
      .where(eq(destinations.userId, userId));
  }

  async createDestination(destination: InsertDestination): Promise<Destination> {
    const [newDestination] = await db
      .insert(destinations)
      .values(destination)
      .returning();
    return newDestination;
  }

  async deleteDestination(id: number): Promise<boolean> {
    const result = await db
      .delete(destinations)
      .where(eq(destinations.id, id));
    return (result.rowCount || 0) > 0;
  }

  // Home location operations
  async getHomeLocation(userId: string): Promise<HomeLocation | undefined> {
    const [homeLocation] = await db.select().from(homeLocations).where(eq(homeLocations.userId, userId));
    return homeLocation;
  }

  async setHomeLocation(homeLocation: InsertHomeLocation): Promise<HomeLocation> {
    const [result] = await db
      .insert(homeLocations)
      .values(homeLocation)
      .onConflictDoUpdate({
        target: homeLocations.userId,
        set: {
          latitude: homeLocation.latitude,
          longitude: homeLocation.longitude,
          address: homeLocation.address,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }

  async updateHomeLocation(userId: string, updates: Partial<InsertHomeLocation>): Promise<HomeLocation | undefined> {
    const [result] = await db
      .update(homeLocations)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(homeLocations.userId, userId))
      .returning();
    return result;
  }

  // OTP verification operations
  async createOtpVerification(otp: InsertOtpVerification): Promise<OtpVerification> {
    const [result] = await db
      .insert(otpVerifications)
      .values(otp)
      .returning();
    return result;
  }

  async verifyOtp(identifier: string, type: string, otp: string): Promise<boolean> {
    const [verification] = await db
      .select()
      .from(otpVerifications)
      .where(
        and(
          eq(otpVerifications.identifier, identifier),
          eq(otpVerifications.type, type),
          eq(otpVerifications.otp, otp),
          eq(otpVerifications.isVerified, false)
        )
      );

    if (!verification) {
      return false;
    }

    // Check if OTP is expired
    if (new Date() > verification.expiresAt) {
      return false;
    }

    // Mark as verified
    await db
      .update(otpVerifications)
      .set({ isVerified: true })
      .where(eq(otpVerifications.id, verification.id));

    return true;
  }

  async cleanupExpiredOtps(): Promise<void> {
    await db
      .delete(otpVerifications)
      .where(eq(otpVerifications.expiresAt, new Date()));
  }

  // IoT Device operations
  async getIotDevices(userId: string): Promise<IotDevice[]> {
    return await db.select().from(iotDevices).where(eq(iotDevices.userId, userId));
  }

  async createIotDevice(device: InsertIotDevice): Promise<IotDevice> {
    const [newDevice] = await db.insert(iotDevices).values(device).returning();
    return newDevice;
  }

  async updateIotDevice(id: number, updates: Partial<InsertIotDevice>): Promise<IotDevice | undefined> {
    const [device] = await db
      .update(iotDevices)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(iotDevices.id, id))
      .returning();
    return device || undefined;
  }

  async updateDeviceBattery(id: number, batteryLevel: number): Promise<boolean> {
    const [device] = await db
      .update(iotDevices)
      .set({ batteryLevel, updatedAt: new Date() })
      .where(eq(iotDevices.id, id))
      .returning();
    return !!device;
  }

  async deleteIotDevice(id: number): Promise<boolean> {
    const result = await db.delete(iotDevices).where(eq(iotDevices.id, id));
    return result.rowCount > 0;
  }

  async connectDevice(id: number): Promise<boolean> {
    const [device] = await db
      .update(iotDevices)
      .set({ 
        isConnected: true, 
        connectionStatus: 'connected',
        lastConnected: new Date(),
        updatedAt: new Date()
      })
      .where(eq(iotDevices.id, id))
      .returning();
    return !!device;
  }

  async disconnectDevice(id: number): Promise<boolean> {
    const [device] = await db
      .update(iotDevices)
      .set({ 
        isConnected: false, 
        connectionStatus: 'disconnected',
        updatedAt: new Date()
      })
      .where(eq(iotDevices.id, id))
      .returning();
    return !!device;
  }

  // Health Metrics operations
  async getHealthMetrics(userId: string, limit = 100): Promise<HealthMetric[]> {
    return await db
      .select()
      .from(healthMetrics)
      .where(eq(healthMetrics.userId, userId))
      .orderBy(healthMetrics.timestamp)
      .limit(limit);
  }

  async createHealthMetric(metric: InsertHealthMetric): Promise<HealthMetric> {
    const [newMetric] = await db.insert(healthMetrics).values(metric).returning();
    return newMetric;
  }

  async getLatestHealthMetrics(userId: string): Promise<HealthMetric | undefined> {
    const [metric] = await db
      .select()
      .from(healthMetrics)
      .where(eq(healthMetrics.userId, userId))
      .orderBy(healthMetrics.timestamp)
      .limit(1);
    return metric || undefined;
  }

  // Stress Analysis operations
  async getStressAnalysis(userId: string, limit = 50): Promise<StressAnalysis[]> {
    return await db
      .select()
      .from(stressAnalysis)
      .where(eq(stressAnalysis.userId, userId))
      .orderBy(stressAnalysis.analysisTimestamp)
      .limit(limit);
  }

  async createStressAnalysis(analysis: InsertStressAnalysis): Promise<StressAnalysis> {
    const [newAnalysis] = await db.insert(stressAnalysis).values(analysis).returning();
    return newAnalysis;
  }

  async getLatestStressAnalysis(userId: string): Promise<StressAnalysis | undefined> {
    const [analysis] = await db
      .select()
      .from(stressAnalysis)
      .where(eq(stressAnalysis.userId, userId))
      .orderBy(stressAnalysis.analysisTimestamp)
      .limit(1);
    return analysis || undefined;
  }

  // IoT Emergency Triggers operations
  async getIotEmergencyTriggers(userId: string): Promise<IotEmergencyTrigger[]> {
    return await db
      .select()
      .from(iotEmergencyTriggers)
      .where(eq(iotEmergencyTriggers.userId, userId))
      .orderBy(iotEmergencyTriggers.timestamp);
  }

  async createIotEmergencyTrigger(trigger: InsertIotEmergencyTrigger): Promise<IotEmergencyTrigger> {
    const [newTrigger] = await db.insert(iotEmergencyTriggers).values(trigger).returning();
    return newTrigger;
  }

  async resolveIotEmergencyTrigger(id: number): Promise<boolean> {
    const [trigger] = await db
      .update(iotEmergencyTriggers)
      .set({ isResolved: true })
      .where(eq(iotEmergencyTriggers.id, id))
      .returning();
    return !!trigger;
  }

  // Family Connections operations
  async getFamilyConnections(userId: string): Promise<FamilyConnection[]> {
    return await db
      .select()
      .from(familyConnections)
      .where(or(
        eq(familyConnections.childUserId, userId),
        eq(familyConnections.parentUserId, userId)
      ));
  }

  async createFamilyConnection(connection: InsertFamilyConnection): Promise<FamilyConnection> {
    const [created] = await db
      .insert(familyConnections)
      .values(connection)
      .returning();
    return created;
  }

  async updateFamilyConnection(id: number, updates: Partial<InsertFamilyConnection>): Promise<FamilyConnection | undefined> {
    const [updated] = await db
      .update(familyConnections)
      .set(updates)
      .where(eq(familyConnections.id, id))
      .returning();
    return updated;
  }

  async getFamilyConnectionByInviteCode(inviteCode: string): Promise<FamilyConnection | undefined> {
    const [connection] = await db
      .select()
      .from(familyConnections)
      .where(and(
        eq(familyConnections.inviteCode, inviteCode),
        eq(familyConnections.status, 'pending')
      ));
    return connection;
  }

  async getConnectedChildren(parentUserId: string): Promise<FamilyConnection[]> {
    return await db
      .select()
      .from(familyConnections)
      .where(and(
        eq(familyConnections.parentUserId, parentUserId),
        eq(familyConnections.status, 'accepted')
      ));
  }

  async getConnectedParents(childUserId: string): Promise<FamilyConnection[]> {
    return await db
      .select()
      .from(familyConnections)
      .where(and(
        eq(familyConnections.childUserId, childUserId),
        eq(familyConnections.status, 'accepted')
      ));
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 1000; // Distance in meters
  }
}

// Temporary in-memory storage for when database is unavailable
class MemoryStorage implements IStorage {
  private users = new Map<string, User>();
  private emergencyContactsMap = new Map<string, EmergencyContact[]>();
  private emergencyAlertsMap = new Map<string, EmergencyAlert[]>();
  private homeLocationsMap = new Map<string, HomeLocation>();
  private familyConnectionsMap = new Map<string, FamilyConnection[]>();
  private alertHistoryMap = new Map<string, any[]>();
  private communityAlertsMap = new Map<number, CommunityAlert>();
  private iotDevicesMap = new Map<string, IotDevice[]>();
  private healthMetricsMap = new Map<string, HealthMetric[]>();
  private stressAnalysisMap = new Map<string, StressAnalysis[]>();
  private iotEmergencyTriggersMap = new Map<string, IotEmergencyTrigger[]>();

  constructor() {
    // Initialize with demo user data
    this.users.set('demo-user', {
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
      createdAt: new Date("2025-06-04T11:26:23.291Z"),
      updatedAt: new Date("2025-06-05T12:50:52.638Z")
    });

    this.emergencyContactsMap.set('demo-user', [
      {
        id: 7,
        userId: "demo-user",
        name: "Narsinha Kolekae",
        phoneNumber: "+919356290923",
        whatsappNumber: "+919356290923",
        relationship: "Friend",
        isPrimary: true,
        createdAt: new Date("2025-06-04T11:46:25.643Z"),
        updatedAt: new Date("2025-06-04T11:46:25.643Z")
      },
      {
        id: 8,
        userId: "demo-user", 
        name: "Me",
        phoneNumber: "+919356290923",
        whatsappNumber: "+919356290923",
        relationship: "Self",
        isPrimary: false,
        createdAt: new Date("2025-06-04T11:46:45.123Z"),
        updatedAt: new Date("2025-06-04T11:46:45.123Z")
      }
    ]);

    this.emergencyAlertsMap.set('demo-user', []);
    
    // Initialize default Sharanya connection
    this.familyConnectionsMap.set("demo-user", [{
      id: 1749306839701,
      parentUserId: "demo-user",
      childUserId: "sharanya-child",
      relationshipType: "parent-child",
      status: "active",
      permissions: { location: true, emergency: true, monitoring: true },
      inviteCode: null,
      inviteExpiry: null,
      acceptedAt: new Date(),
      createdAt: new Date()
    }]);
    
    this.alertHistoryMap.set("demo-user", []);
    
    // Load persistent data on initialization
    this.loadPersistentData();
  }

  private async loadPersistentData() {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const dataPath = path.join(__dirname, 'persistent-data.json');
      
      if (fs.existsSync(dataPath)) {
        const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        
        // Load family connections
        if (data.familyConnections) {
          for (const [userId, connections] of Object.entries(data.familyConnections)) {
            this.familyConnectionsMap.set(userId, connections as FamilyConnection[]);
          }
        }
        
        // Load alert history
        if (data.alertHistory) {
          for (const [userId, history] of Object.entries(data.alertHistory)) {
            this.alertHistoryMap.set(userId, history as any[]);
          }
        }
        
        // Load community alerts
        if (data.communityAlerts && Array.isArray(data.communityAlerts)) {
          for (const alert of data.communityAlerts) {
            this.communityAlertsMap.set(alert.id, alert);
          }
        }
        
        // Load emergency alerts
        if (data.emergencyAlerts) {
          for (const [userId, alerts] of Object.entries(data.emergencyAlerts)) {
            this.emergencyAlertsMap.set(userId, alerts as EmergencyAlert[]);
          }
        }
        
        // Load destinations
        if (data.destinations) {
          for (const [userId, userDestinations] of Object.entries(data.destinations)) {
            this.destinationsMap.set(userId, userDestinations as Destination[]);
          }
        }
        
        console.log('Persistent data loaded successfully from file');
      } else {
        this.initializeDefaultData();
      }
    } catch (error) {
      console.log('Failed to load persistent data, initializing defaults');
      this.initializeDefaultData();
    }
  }

  private initializeDefaultData() {
    const defaultConnection = {
      id: Date.now(),
      parentUserId: "demo-user",
      childUserId: "sharanya-child",
      relationshipType: "parent-child",
      status: "active",
      permissions: { location: true, emergency: true, monitoring: true },
      inviteCode: null,
      inviteExpiry: null,
      acceptedAt: new Date(),
      createdAt: new Date()
    };
    
    this.familyConnectionsMap.set("demo-user", [defaultConnection]);
    this.alertHistoryMap.set("demo-user", []);
    this.savePersistentData();
    console.log('Default Sharanya connection initialized');
  }

  private async savePersistentData() {
    try {
      const fs = await import('fs');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      const __dirname = path.dirname(fileURLToPath(import.meta.url));
      const dataPath = path.join(__dirname, 'persistent-data.json');
      
      const data = {
        familyConnections: Object.fromEntries(this.familyConnectionsMap),
        alertHistory: Object.fromEntries(this.alertHistoryMap),
        emergencyAlerts: Object.fromEntries(this.emergencyAlertsMap),
        communityAlerts: Array.from(this.communityAlertsMap.values()),
        destinations: Object.fromEntries(this.destinationsMap),
        timestamp: new Date().toISOString()
      };
      
      fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Failed to save persistent data:', error);
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const existingUser = this.users.get(userData.id);
    const user = { ...existingUser, ...userData, updatedAt: new Date() } as User;
    this.users.set(userData.id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<UpsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getEmergencyContacts(userId: string): Promise<EmergencyContact[]> {
    return this.emergencyContactsMap.get(userId) || [];
  }

  async createEmergencyContact(contact: InsertEmergencyContact): Promise<EmergencyContact> {
    const contacts = this.emergencyContactsMap.get(contact.userId) || [];
    const newContact = { ...contact, id: Date.now(), createdAt: new Date(), updatedAt: new Date() } as EmergencyContact;
    contacts.push(newContact);
    this.emergencyContactsMap.set(contact.userId, contacts);
    return newContact;
  }

  async updateEmergencyContact(id: number, updates: Partial<InsertEmergencyContact>): Promise<EmergencyContact | undefined> {
    for (const [userId, contacts] of this.emergencyContactsMap) {
      const contactIndex = contacts.findIndex(c => c.id === id);
      if (contactIndex >= 0) {
        contacts[contactIndex] = { ...contacts[contactIndex], ...updates, updatedAt: new Date() };
        return contacts[contactIndex];
      }
    }
    return undefined;
  }

  async deleteEmergencyContact(id: number): Promise<boolean> {
    for (const [userId, contacts] of this.emergencyContactsMap) {
      const contactIndex = contacts.findIndex(c => c.id === id);
      if (contactIndex >= 0) {
        contacts.splice(contactIndex, 1);
        return true;
      }
    }
    return false;
  }

  async createEmergencyAlert(alert: InsertEmergencyAlert): Promise<EmergencyAlert> {
    const alerts = this.emergencyAlertsMap.get(alert.userId) || [];
    const newAlert = { 
      ...alert, 
      id: Date.now(), 
      createdAt: new Date(), 
      updatedAt: new Date(),
      isResolved: false 
    } as EmergencyAlert;
    alerts.push(newAlert);
    this.emergencyAlertsMap.set(alert.userId, alerts);
    
    // Save to persistent storage immediately to prevent data loss on restart
    await this.savePersistentData();
    
    return newAlert;
  }

  async getEmergencyAlert(id: number): Promise<EmergencyAlert | undefined> {
    for (const [userId, alerts] of this.emergencyAlertsMap) {
      const alert = alerts.find(a => a.id === id);
      if (alert) return alert;
    }
    return undefined;
  }

  async getEmergencyAlerts(userId: string): Promise<EmergencyAlert[]> {
    return this.emergencyAlertsMap.get(userId) || [];
  }

  async updateEmergencyAlert(id: number, updates: Partial<InsertEmergencyAlert>): Promise<EmergencyAlert | undefined> {
    for (const [userId, alerts] of this.emergencyAlertsMap) {
      const alertIndex = alerts.findIndex(a => a.id === id);
      if (alertIndex >= 0) {
        alerts[alertIndex] = { ...alerts[alertIndex], ...updates, updatedAt: new Date() };
        
        // Save to persistent storage immediately to prevent data loss on restart
        await this.savePersistentData();
        
        return alerts[alertIndex];
      }
    }
    return undefined;
  }

  // Destinations/Home Location operations
  private destinationsMap = new Map<string, Destination[]>();

  async getDestinations(userId: string): Promise<Destination[]> {
    // Ensure persistent data is loaded before accessing destinations
    await this.loadPersistentData();
    return this.destinationsMap.get(userId) || [];
  }

  async createDestination(destination: InsertDestination): Promise<Destination> {
    const newDestination: Destination = {
      id: Date.now(),
      userId: destination.userId,
      name: destination.name,
      latitude: destination.latitude,
      longitude: destination.longitude,
      address: destination.address,
      isFavorite: destination.isFavorite || false,
      createdAt: new Date()
    };

    const userDestinations = this.destinationsMap.get(destination.userId) || [];
    userDestinations.push(newDestination);
    this.destinationsMap.set(destination.userId, userDestinations);
    await this.savePersistentData();
    return newDestination;
  }

  // Stub implementations for safe zones (not yet implemented)
  async getSafeZones(): Promise<SafeZone[]> { return []; }
  async createSafeZone(): Promise<SafeZone> { throw new Error('Not implemented'); }
  async deleteSafeZone(): Promise<boolean> { return false; }
  private liveStreamsMap = new Map<string, LiveStream[]>();
  private liveStreamById = new Map<number, LiveStream>();

  async createLiveStream(stream: InsertLiveStream): Promise<LiveStream> {
    const newStream: LiveStream = {
      id: Date.now(),
      userId: stream.userId,
      streamUrl: stream.streamUrl,
      shareLink: stream.shareLink,
      isActive: stream.isActive ?? true,
      emergencyAlertId: stream.emergencyAlertId || null,
      createdAt: new Date(),
      endedAt: null
    };

    const userStreams = this.liveStreamsMap.get(stream.userId) || [];
    userStreams.push(newStream);
    this.liveStreamsMap.set(stream.userId, userStreams);
    this.liveStreamById.set(newStream.id, newStream);

    return newStream;
  }

  async getLiveStreams(userId: string): Promise<LiveStream[]> {
    return this.liveStreamsMap.get(userId) || [];
  }

  async getLiveStreamById(id: number): Promise<LiveStream | undefined> {
    return this.liveStreamById.get(id);
  }

  async endLiveStream(id: number): Promise<boolean> {
    const stream = this.liveStreamById.get(id);
    if (stream) {
      stream.isActive = false;
      stream.endedAt = new Date();
      return true;
    }
    return false;
  }
  async deleteDestination(): Promise<boolean> { return false; }
  async getHomeLocation(userId: string): Promise<HomeLocation | undefined> { 
    return this.homeLocationsMap.get(userId);
  }
  async setHomeLocation(): Promise<HomeLocation> { throw new Error('Not implemented'); }
  async updateHomeLocation(): Promise<HomeLocation | undefined> { return undefined; }
  private otpMap = new Map<string, OtpVerification>();

  async createOtpVerification(otp: InsertOtpVerification): Promise<OtpVerification> {
    const newOtp = {
      ...otp,
      id: Date.now(),
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
    } as OtpVerification;

    const key = `${otp.identifier}-${otp.type}`;
    this.otpMap.set(key, newOtp);
    return newOtp;
  }

  async verifyOtp(identifier: string, type: string, otp: string): Promise<boolean> {
    const key = `${identifier}-${type}`;
    const storedOtp = this.otpMap.get(key);
    
    if (!storedOtp || storedOtp.otp !== otp || new Date() > storedOtp.expiresAt) {
      return false;
    }
    
    this.otpMap.delete(key);
    return true;
  }

  async cleanupExpiredOtps(): Promise<void> {
    const now = new Date();
    for (const [key, otp] of this.otpMap.entries()) {
      if (now > otp.expiresAt) {
        this.otpMap.delete(key);
      }
    }
  }
  async getIotDevices(userId: string): Promise<IotDevice[]> {
    return this.iotDevicesMap.get(userId) || [];
  }

  async createIotDevice(device: InsertIotDevice): Promise<IotDevice> {
    const devices = this.iotDevicesMap.get(device.userId) || [];
    const newDevice = {
      ...device,
      id: Date.now(),
      isConnected: false,
      connectionStatus: "disconnected",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastConnected: null
    } as IotDevice;
    
    devices.push(newDevice);
    this.iotDevicesMap.set(device.userId, devices);
    this.savePersistentData();
    return newDevice;
  }

  async updateIotDevice(id: number, updates: Partial<InsertIotDevice>): Promise<IotDevice | undefined> {
    for (const [userId, devices] of this.iotDevicesMap) {
      const deviceIndex = devices.findIndex(d => d.id === id);
      if (deviceIndex >= 0) {
        devices[deviceIndex] = { ...devices[deviceIndex], ...updates, updatedAt: new Date() };
        this.savePersistentData();
        return devices[deviceIndex];
      }
    }
    return undefined;
  }

  async deleteIotDevice(id: number): Promise<boolean> {
    for (const [userId, devices] of this.iotDevicesMap) {
      const deviceIndex = devices.findIndex(d => d.id === id);
      if (deviceIndex >= 0) {
        devices.splice(deviceIndex, 1);
        this.savePersistentData();
        return true;
      }
    }
    return false;
  }

  async connectDevice(id: number): Promise<boolean> {
    const device = await this.updateIotDevice(id, {
      isConnected: true,
      connectionStatus: "connected",
      lastConnected: new Date()
    });
    return !!device;
  }

  async updateDeviceBattery(id: number, batteryLevel: number): Promise<boolean> {
    const device = await this.updateIotDevice(id, {
      batteryLevel,
      updatedAt: new Date()
    });
    return !!device;
  }

  async disconnectDevice(id: number): Promise<boolean> {
    const device = await this.updateIotDevice(id, {
      isConnected: false,
      connectionStatus: "disconnected"
    });
    return !!device;
  }

  async getHealthMetrics(userId: string, limit?: number): Promise<HealthMetric[]> {
    const metrics = this.healthMetricsMap.get(userId) || [];
    return limit ? metrics.slice(0, limit) : metrics;
  }

  async createHealthMetric(metric: InsertHealthMetric): Promise<HealthMetric> {
    const metrics = this.healthMetricsMap.get(metric.userId) || [];
    const newMetric = {
      ...metric,
      id: Date.now(),
      timestamp: new Date(),
      createdAt: new Date()
    } as HealthMetric;
    
    metrics.unshift(newMetric); // Add to beginning for latest first
    this.healthMetricsMap.set(metric.userId, metrics);
    this.savePersistentData();
    return newMetric;
  }

  async getLatestHealthMetrics(userId: string): Promise<HealthMetric | undefined> {
    const metrics = this.healthMetricsMap.get(userId) || [];
    return metrics[0]; // First item is latest
  }

  async getStressAnalysis(userId: string, limit?: number): Promise<StressAnalysis[]> {
    const analysis = this.stressAnalysisMap.get(userId) || [];
    return limit ? analysis.slice(0, limit) : analysis;
  }

  async createStressAnalysis(analysis: InsertStressAnalysis): Promise<StressAnalysis> {
    const analyses = this.stressAnalysisMap.get(analysis.userId) || [];
    const newAnalysis = {
      ...analysis,
      id: Date.now(),
      analysisTimestamp: new Date(),
      createdAt: new Date()
    } as StressAnalysis;
    
    analyses.unshift(newAnalysis);
    this.stressAnalysisMap.set(analysis.userId, analyses);
    this.savePersistentData();
    return newAnalysis;
  }

  async getLatestStressAnalysis(userId: string): Promise<StressAnalysis | undefined> {
    const analysis = this.stressAnalysisMap.get(userId) || [];
    return analysis[0];
  }

  async getIotEmergencyTriggers(userId: string): Promise<IotEmergencyTrigger[]> {
    return this.iotEmergencyTriggersMap.get(userId) || [];
  }

  async createIotEmergencyTrigger(trigger: InsertIotEmergencyTrigger): Promise<IotEmergencyTrigger> {
    const triggers = this.iotEmergencyTriggersMap.get(trigger.userId) || [];
    const newTrigger = {
      ...trigger,
      id: Date.now(),
      timestamp: new Date(),
      createdAt: new Date()
    } as IotEmergencyTrigger;
    
    triggers.push(newTrigger);
    this.iotEmergencyTriggersMap.set(trigger.userId, triggers);
    this.savePersistentData();
    return newTrigger;
  }

  async resolveIotEmergencyTrigger(id: number): Promise<boolean> {
    for (const [userId, triggers] of this.iotEmergencyTriggersMap) {
      const triggerIndex = triggers.findIndex(t => t.id === id);
      if (triggerIndex >= 0) {
        triggers[triggerIndex].isResolved = true;
        this.savePersistentData();
        return true;
      }
    }
    return false;
  }

  // Initialize persistent storage on startup
  private initializePersistentStorage() {
    this.loadPersistedConnections();
    this.loadPersistedAlertHistory();
  }

  private loadPersistedConnections() {
    try {
      // In production, this would load from localStorage or database
      const storedConnections = this.getStoredConnectionsFromLocalStorage();
      if (storedConnections) {
        for (const [userId, connections] of Object.entries(storedConnections)) {
          this.familyConnectionsMap.set(userId, connections as FamilyConnection[]);
        }
      }
    } catch (error) {
      console.log('No persisted connections found, starting fresh');
    }
  }

  private loadPersistedAlertHistory() {
    try {
      const storedHistory = this.getStoredAlertHistoryFromLocalStorage();
      if (storedHistory) {
        for (const [userId, alerts] of Object.entries(storedHistory)) {
          this.alertHistoryMap.set(userId, alerts as AlertHistory[]);
        }
      }
    } catch (error) {
      console.log('No persisted alert history found, starting fresh');
    }
  }

  private getStoredConnectionsFromLocalStorage(): any {
    // Simulated localStorage for server-side persistence
    return (global as any).persistedConnections || {};
  }

  private getStoredAlertHistoryFromLocalStorage(): any {
    return (global as any).persistedAlertHistory || {};
  }

  private persistConnections() {
    // Persist to simulated global storage
    (global as any).persistedConnections = Object.fromEntries(this.familyConnectionsMap);
  }

  private persistAlertHistory() {
    (global as any).persistedAlertHistory = Object.fromEntries(this.alertHistoryMap);
  }

  // Enhanced alert resolution with permanent history storage
  async archiveResolvedAlert(alertId: number, resolvedBy: string): Promise<void> {
    const alerts = await this.getEmergencyAlerts("demo-user");
    const alert = alerts.find(a => a.id === alertId);
    if (alert) {
      // Create history entry
      const historyEntry = {
        id: Date.now(),
        originalAlertId: alertId,
        userId: alert.userId,
        parentUserId: resolvedBy,
        triggerType: alert.triggerType,
        message: `Emergency resolved by parent`,
        latitude: alert.latitude,
        longitude: alert.longitude,
        address: alert.address,
        status: 'resolved',
        resolvedAt: new Date(),
        resolvedBy: resolvedBy,
        responseTime: Math.floor((Date.now() - new Date(alert.createdAt).getTime()) / 1000),
        audioRecordingUrl: alert.audioRecordingUrl,
        videoRecordingUrl: alert.videoRecordingUrl,
        isArchived: false,
        createdAt: alert.createdAt,
        archivedAt: null
      };

      // Store in alert history for permanent storage
      const userHistory = this.alertHistoryMap.get(alert.userId) || [];
      userHistory.push(historyEntry);
      this.alertHistoryMap.set(alert.userId, userHistory);

      // Also store for parent access
      const parentHistory = this.alertHistoryMap.get(resolvedBy) || [];
      parentHistory.push(historyEntry);
      this.alertHistoryMap.set(resolvedBy, parentHistory);

      // Persist to prevent loss
      this.persistAlertHistory();
    }
  }

  async getChildProfile(childUserId: string): Promise<any> {
    // Load persisted data from file
    await this.loadPersistentData();
    
    try {
      const fs = require('fs');
      const data = JSON.parse(fs.readFileSync(this.persistentDataPath, 'utf8'));
      return data.childProfiles?.[childUserId] || null;
    } catch {
      return null;
    }
  }

  // Get permanent alert history for a user
  async getAlertHistory(userId: string): Promise<any[]> {
    return this.alertHistoryMap.get(userId) || [];
  }

  async getFamilyConnections(userId: string): Promise<FamilyConnection[]> { 
    // Restore from persistent global storage if available
    if ((global as any).persistedConnections) {
      const restored = (global as any).persistedConnections[userId];
      if (restored && restored.length > 0) {
        this.familyConnectionsMap.set(userId, restored);
      }
    }
    
    let connections = this.familyConnectionsMap.get(userId) || [];
    
    // Always ensure Sharanya connection exists for demo
    const defaultConnection = {
      id: 1749306839701,
      parentUserId: userId,
      childUserId: "sharanya-child",
      relationshipType: "parent-child",
      status: "active",
      permissions: { location: true, emergency: true, monitoring: true },
      inviteCode: null,
      inviteExpiry: null,
      acceptedAt: new Date(),
      createdAt: new Date()
    };
    
    const hasDefaultConnection = connections.some(c => c.childUserId === "sharanya-child");
    if (!hasDefaultConnection) {
      connections.unshift(defaultConnection);
      this.familyConnectionsMap.set(userId, connections);
      this.persistConnections();
    }
    
    return connections; 
  }

  async createFamilyConnection(connection: InsertFamilyConnection): Promise<FamilyConnection> { 
    const newConnection: FamilyConnection = {
      id: Date.now(),
      parentUserId: connection.parentUserId,
      childUserId: connection.childUserId,
      relationshipType: connection.relationshipType,
      status: connection.status || 'pending',
      permissions: connection.permissions || {},
      inviteCode: connection.inviteCode || null,
      inviteExpiry: connection.inviteExpiry || null,
      createdAt: new Date(),
      acceptedAt: connection.status === 'accepted' ? new Date() : null
    };

    // Store by parent user ID
    const userConnections = this.familyConnectionsMap.get(connection.parentUserId) || [];
    userConnections.push(newConnection);
    this.familyConnectionsMap.set(connection.parentUserId, userConnections);

    // Store by invite code for lookup
    if (connection.inviteCode) {
      this.familyConnectionsByCode.set(connection.inviteCode, newConnection);
    }

    // Persist connections to prevent loss on refresh
    this.persistConnections();

    return newConnection;
  }

  async updateFamilyConnection(id: number, updates: Partial<InsertFamilyConnection>): Promise<FamilyConnection | undefined> { 
    for (const [userId, connections] of this.familyConnectionsMap) {
      const connectionIndex = connections.findIndex(c => c.id === id);
      if (connectionIndex >= 0) {
        connections[connectionIndex] = { ...connections[connectionIndex], ...updates, updatedAt: new Date() };
        return connections[connectionIndex];
      }
    }
    return undefined;
  }

  async getFamilyConnectionByInviteCode(inviteCode: string): Promise<FamilyConnection | undefined> { 
    return this.familyConnectionsByCode.get(inviteCode);
  }

  async getConnectedChildren(parentUserId: string): Promise<FamilyConnection[]> { 
    return this.familyConnectionsMap.get(parentUserId) || [];
  }

  async getConnectedParents(childUserId: string): Promise<FamilyConnection[]> { 
    const allConnections: FamilyConnection[] = [];
    for (const connections of this.familyConnectionsMap.values()) {
      allConnections.push(...connections.filter(c => c.childUserId === childUserId));
    }
    return allConnections;
  }

  async getFamilyConnections(userId: string): Promise<FamilyConnection[]> {
    return this.familyConnectionsMap.get(userId) || [];
  }

  async createFamilyConnection(connection: InsertFamilyConnection): Promise<FamilyConnection> {
    const newConnection = {
      id: Date.now(),
      ...connection,
      createdAt: new Date()
    };
    
    const userConnections = this.familyConnectionsMap.get(connection.parentUserId) || [];
    userConnections.push(newConnection);
    this.familyConnectionsMap.set(connection.parentUserId, userConnections);
    
    return newConnection;
  }

  async updateFamilyConnection(id: number, updates: Partial<InsertFamilyConnection>): Promise<FamilyConnection | undefined> {
    for (const [userId, connections] of this.familyConnectionsMap.entries()) {
      const connectionIndex = connections.findIndex(c => c.id === id);
      if (connectionIndex !== -1) {
        connections[connectionIndex] = { ...connections[connectionIndex], ...updates };
        this.familyConnectionsMap.set(userId, connections);
        return connections[connectionIndex];
      }
    }
    return undefined;
  }

  async getAlertHistory(userId: string): Promise<any[]> {
    return this.alertHistoryMap.get(userId) || [];
  }

  async archiveResolvedAlert(alertId: number, resolvedBy: string): Promise<void> {
    const alertHistory = this.alertHistoryMap.get(resolvedBy) || [];
    alertHistory.push({
      id: Date.now(),
      originalAlertId: alertId,
      resolvedBy,
      resolvedAt: new Date(),
      status: 'resolved'
    });
    this.alertHistoryMap.set(resolvedBy, alertHistory);
  }

  // Community alerts operations
  async getCommunityAlerts(latitude: number, longitude: number, radius: number): Promise<CommunityAlert[]> {
    const alerts = Array.from(this.communityAlertsMap.values());
    return alerts.filter(alert => {
      const distance = this.calculateDistance(latitude, longitude, alert.latitude, alert.longitude);
      return distance <= radius;
    });
  }

  async createCommunityAlert(alert: InsertCommunityAlert): Promise<CommunityAlert> {
    const newAlert: CommunityAlert = {
      id: Date.now(),
      userId: alert.userId,
      type: alert.type,
      description: alert.description,
      latitude: alert.latitude,
      longitude: alert.longitude,
      severity: alert.severity,
      verified: alert.verified || false,
      reportedBy: alert.reportedBy || 'anonymous',
      createdAt: new Date()
    };
    
    this.communityAlertsMap.set(newAlert.id, newAlert);
    await this.savePersistentData(); // Save to persistent storage
    return newAlert;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c * 1000; // Distance in meters
  }
}

// Smart storage that falls back to memory when database fails
class SmartStorage implements IStorage {
  private dbStorage = new DatabaseStorage();
  private memStorage = new MemoryStorage();
  private useDatabase = true;

  private async tryDatabase<T>(operation: () => Promise<T>): Promise<T> {
    if (!this.useDatabase) {
      throw new Error('Database disabled');
    }
    
    try {
      return await operation();
    } catch (error: any) {
      if (error?.message?.includes('endpoint is disabled') || error?.code === 'XX000') {
        console.log('Database endpoint disabled, switching to memory storage');
        this.useDatabase = false;
      }
      throw error;
    }
  }

  async getUser(id: string): Promise<User | undefined> {
    try {
      return await this.tryDatabase(() => this.dbStorage.getUser(id));
    } catch {
      return this.memStorage.getUser(id);
    }
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      return await this.tryDatabase(() => this.dbStorage.upsertUser(userData));
    } catch {
      return this.memStorage.upsertUser(userData);
    }
  }

  async updateUser(id: string, updates: Partial<UpsertUser>): Promise<User | undefined> {
    try {
      return await this.tryDatabase(() => this.dbStorage.updateUser(id, updates));
    } catch {
      return this.memStorage.updateUser(id, updates);
    }
  }

  async getEmergencyContacts(userId: string): Promise<EmergencyContact[]> {
    try {
      return await this.tryDatabase(() => this.dbStorage.getEmergencyContacts(userId));
    } catch {
      return this.memStorage.getEmergencyContacts(userId);
    }
  }

  async createEmergencyContact(contact: InsertEmergencyContact): Promise<EmergencyContact> {
    try {
      return await this.tryDatabase(() => this.dbStorage.createEmergencyContact(contact));
    } catch {
      return this.memStorage.createEmergencyContact(contact);
    }
  }

  async updateEmergencyContact(id: number, updates: Partial<InsertEmergencyContact>): Promise<EmergencyContact | undefined> {
    try {
      return await this.tryDatabase(() => this.dbStorage.updateEmergencyContact(id, updates));
    } catch {
      return this.memStorage.updateEmergencyContact(id, updates);
    }
  }

  async deleteEmergencyContact(id: number): Promise<boolean> {
    try {
      return await this.tryDatabase(() => this.dbStorage.deleteEmergencyContact(id));
    } catch {
      return this.memStorage.deleteEmergencyContact(id);
    }
  }

  async createEmergencyAlert(alert: InsertEmergencyAlert): Promise<EmergencyAlert> {
    try {
      return await this.tryDatabase(() => this.dbStorage.createEmergencyAlert(alert));
    } catch {
      return this.memStorage.createEmergencyAlert(alert);
    }
  }

  async getEmergencyAlert(id: number): Promise<EmergencyAlert | undefined> {
    try {
      return await this.tryDatabase(() => this.dbStorage.getEmergencyAlert(id));
    } catch {
      return this.memStorage.getEmergencyAlert(id);
    }
  }

  async getEmergencyAlerts(userId: string): Promise<EmergencyAlert[]> {
    try {
      return await this.tryDatabase(() => this.dbStorage.getEmergencyAlerts(userId));
    } catch {
      return this.memStorage.getEmergencyAlerts(userId);
    }
  }

  async updateEmergencyAlert(id: number, updates: Partial<InsertEmergencyAlert>): Promise<EmergencyAlert | undefined> {
    try {
      return await this.tryDatabase(() => this.dbStorage.updateEmergencyAlert(id, updates));
    } catch {
      return this.memStorage.updateEmergencyAlert(id, updates);
    }
  }

  // Delegate other methods to database storage with fallback
  async getCommunityAlerts(latitude: number, longitude: number, radius: number): Promise<CommunityAlert[]> {
    try {
      return await this.tryDatabase(() => this.dbStorage.getCommunityAlerts(latitude, longitude, radius));
    } catch {
      return this.memStorage.getCommunityAlerts(latitude, longitude, radius);
    }
  }

  async createCommunityAlert(alert: InsertCommunityAlert): Promise<CommunityAlert> {
    try {
      return await this.tryDatabase(() => this.dbStorage.createCommunityAlert(alert));
    } catch {
      return this.memStorage.createCommunityAlert(alert);
    }
  }

  async getSafeZones(userId: string): Promise<SafeZone[]> {
    try {
      return await this.tryDatabase(() => this.dbStorage.getSafeZones(userId));
    } catch {
      return this.memStorage.getSafeZones();
    }
  }

  async createSafeZone(zone: InsertSafeZone): Promise<SafeZone> {
    try {
      return await this.tryDatabase(() => this.dbStorage.createSafeZone(zone));
    } catch {
      return this.memStorage.createSafeZone();
    }
  }

  async deleteSafeZone(id: number): Promise<boolean> {
    try {
      return await this.tryDatabase(() => this.dbStorage.deleteSafeZone(id));
    } catch {
      return this.memStorage.deleteSafeZone();
    }
  }

  async createLiveStream(stream: InsertLiveStream): Promise<LiveStream> {
    try {
      return await this.tryDatabase(() => this.dbStorage.createLiveStream(stream));
    } catch {
      return this.memStorage.createLiveStream(stream);
    }
  }

  async getLiveStreams(userId: string): Promise<LiveStream[]> {
    try {
      return await this.tryDatabase(() => this.dbStorage.getLiveStreams(userId));
    } catch {
      return this.memStorage.getLiveStreams(userId);
    }
  }

  async getLiveStreamById(id: number): Promise<LiveStream | undefined> {
    try {
      return await this.tryDatabase(() => this.dbStorage.getLiveStreamById(id));
    } catch {
      return this.memStorage.getLiveStreamById(id);
    }
  }

  async endLiveStream(id: number): Promise<boolean> {
    try {
      return await this.tryDatabase(() => this.dbStorage.endLiveStream(id));
    } catch {
      return this.memStorage.endLiveStream(id);
    }
  }

  async getDestinations(userId: string): Promise<Destination[]> {
    try {
      return await this.tryDatabase(() => this.dbStorage.getDestinations(userId));
    } catch {
      return this.memStorage.getDestinations(userId);
    }
  }

  async createDestination(destination: InsertDestination): Promise<Destination> {
    try {
      return await this.tryDatabase(() => this.dbStorage.createDestination(destination));
    } catch {
      return this.memStorage.createDestination(destination);
    }
  }

  async deleteDestination(id: number): Promise<boolean> {
    try {
      return await this.tryDatabase(() => this.dbStorage.deleteDestination(id));
    } catch {
      return this.memStorage.deleteDestination();
    }
  }

  async getHomeLocation(userId: string): Promise<HomeLocation | undefined> {
    try {
      return await this.tryDatabase(() => this.dbStorage.getHomeLocation(userId));
    } catch {
      return this.memStorage.getHomeLocation(userId);
    }
  }

  async setHomeLocation(homeLocation: InsertHomeLocation): Promise<HomeLocation> {
    try {
      return await this.tryDatabase(() => this.dbStorage.setHomeLocation(homeLocation));
    } catch {
      return this.memStorage.setHomeLocation();
    }
  }

  async updateHomeLocation(userId: string, updates: Partial<InsertHomeLocation>): Promise<HomeLocation | undefined> {
    try {
      return await this.tryDatabase(() => this.dbStorage.updateHomeLocation(userId, updates));
    } catch {
      return this.memStorage.updateHomeLocation();
    }
  }

  async createOtpVerification(otp: InsertOtpVerification): Promise<OtpVerification> {
    try {
      return await this.tryDatabase(() => this.dbStorage.createOtpVerification(otp));
    } catch {
      return this.memStorage.createOtpVerification();
    }
  }

  async verifyOtp(identifier: string, type: string, otp: string): Promise<boolean> {
    try {
      return await this.tryDatabase(() => this.dbStorage.verifyOtp(identifier, type, otp));
    } catch {
      return this.memStorage.verifyOtp();
    }
  }

  async cleanupExpiredOtps(): Promise<void> {
    try {
      return await this.tryDatabase(() => this.dbStorage.cleanupExpiredOtps());
    } catch {
      return this.memStorage.cleanupExpiredOtps();
    }
  }

  async getIotDevices(userId: string): Promise<IotDevice[]> {
    try {
      return await this.tryDatabase(() => this.dbStorage.getIotDevices(userId));
    } catch {
      return this.memStorage.getIotDevices(userId);
    }
  }

  async createIotDevice(device: InsertIotDevice): Promise<IotDevice> {
    try {
      return await this.tryDatabase(() => this.dbStorage.createIotDevice(device));
    } catch {
      return this.memStorage.createIotDevice(device);
    }
  }

  async updateIotDevice(id: number, updates: Partial<InsertIotDevice>): Promise<IotDevice | undefined> {
    try {
      return await this.tryDatabase(() => this.dbStorage.updateIotDevice(id, updates));
    } catch {
      return this.memStorage.updateIotDevice(id, updates);
    }
  }

  async updateDeviceBattery(id: number, batteryLevel: number): Promise<boolean> {
    try {
      return await this.tryDatabase(() => this.dbStorage.updateDeviceBattery(id, batteryLevel));
    } catch {
      return this.memStorage.updateDeviceBattery(id, batteryLevel);
    }
  }

  async deleteIotDevice(id: number): Promise<boolean> {
    try {
      return await this.tryDatabase(() => this.dbStorage.deleteIotDevice(id));
    } catch {
      return this.memStorage.deleteIotDevice(id);
    }
  }

  async connectDevice(id: number): Promise<boolean> {
    try {
      return await this.tryDatabase(() => this.dbStorage.connectDevice(id));
    } catch {
      return this.memStorage.connectDevice(id);
    }
  }

  async disconnectDevice(id: number): Promise<boolean> {
    try {
      return await this.tryDatabase(() => this.dbStorage.disconnectDevice(id));
    } catch {
      return this.memStorage.disconnectDevice(id);
    }
  }

  async getHealthMetrics(userId: string, limit?: number): Promise<HealthMetric[]> {
    try {
      return await this.tryDatabase(() => this.dbStorage.getHealthMetrics(userId, limit));
    } catch {
      return this.memStorage.getHealthMetrics();
    }
  }

  async createHealthMetric(metric: InsertHealthMetric): Promise<HealthMetric> {
    try {
      return await this.tryDatabase(() => this.dbStorage.createHealthMetric(metric));
    } catch {
      return this.memStorage.createHealthMetric();
    }
  }

  async getLatestHealthMetrics(userId: string): Promise<HealthMetric | undefined> {
    try {
      return await this.tryDatabase(() => this.dbStorage.getLatestHealthMetrics(userId));
    } catch {
      return this.memStorage.getLatestHealthMetrics();
    }
  }

  async getStressAnalysis(userId: string, limit?: number): Promise<StressAnalysis[]> {
    try {
      return await this.tryDatabase(() => this.dbStorage.getStressAnalysis(userId, limit));
    } catch {
      return this.memStorage.getStressAnalysis();
    }
  }

  async createStressAnalysis(analysis: InsertStressAnalysis): Promise<StressAnalysis> {
    try {
      return await this.tryDatabase(() => this.dbStorage.createStressAnalysis(analysis));
    } catch {
      return this.memStorage.createStressAnalysis();
    }
  }

  async getLatestStressAnalysis(userId: string): Promise<StressAnalysis | undefined> {
    try {
      return await this.tryDatabase(() => this.dbStorage.getLatestStressAnalysis(userId));
    } catch {
      return this.memStorage.getLatestStressAnalysis();
    }
  }

  async getIotEmergencyTriggers(userId: string): Promise<IotEmergencyTrigger[]> {
    try {
      return await this.tryDatabase(() => this.dbStorage.getIotEmergencyTriggers(userId));
    } catch {
      return this.memStorage.getIotEmergencyTriggers();
    }
  }

  async createIotEmergencyTrigger(trigger: InsertIotEmergencyTrigger): Promise<IotEmergencyTrigger> {
    try {
      return await this.tryDatabase(() => this.dbStorage.createIotEmergencyTrigger(trigger));
    } catch {
      return this.memStorage.createIotEmergencyTrigger();
    }
  }

  async resolveIotEmergencyTrigger(id: number): Promise<boolean> {
    try {
      return await this.tryDatabase(() => this.dbStorage.resolveIotEmergencyTrigger(id));
    } catch {
      return this.memStorage.resolveIotEmergencyTrigger();
    }
  }

  async getFamilyConnections(userId: string): Promise<FamilyConnection[]> {
    try {
      return await this.tryDatabase(() => this.dbStorage.getFamilyConnections(userId));
    } catch {
      return this.memStorage.getFamilyConnections(userId);
    }
  }

  async createFamilyConnection(connection: InsertFamilyConnection): Promise<FamilyConnection> {
    try {
      return await this.tryDatabase(() => this.dbStorage.createFamilyConnection(connection));
    } catch {
      return this.memStorage.createFamilyConnection(connection);
    }
  }

  async updateFamilyConnection(id: number, updates: Partial<InsertFamilyConnection>): Promise<FamilyConnection | undefined> {
    try {
      return await this.tryDatabase(() => this.dbStorage.updateFamilyConnection(id, updates));
    } catch {
      return this.memStorage.updateFamilyConnection(id, updates);
    }
  }

  async getFamilyConnectionByInviteCode(inviteCode: string): Promise<FamilyConnection | undefined> {
    try {
      return await this.tryDatabase(() => this.dbStorage.getFamilyConnectionByInviteCode(inviteCode));
    } catch {
      return this.memStorage.getFamilyConnectionByInviteCode(inviteCode);
    }
  }

  async getConnectedChildren(parentUserId: string): Promise<FamilyConnection[]> {
    try {
      return await this.tryDatabase(() => this.dbStorage.getConnectedChildren(parentUserId));
    } catch {
      return this.memStorage.getConnectedChildren(parentUserId);
    }
  }

  async getConnectedParents(childUserId: string): Promise<FamilyConnection[]> {
    try {
      return await this.tryDatabase(() => this.dbStorage.getConnectedParents(childUserId));
    } catch {
      return this.memStorage.getConnectedParents(childUserId);
    }
  }

  async getAlertHistory(userId: string): Promise<any[]> {
    try {
      return await this.tryDatabase(() => this.dbStorage.getAlertHistory(userId));
    } catch {
      return this.memStorage.getAlertHistory(userId);
    }
  }

  async archiveResolvedAlert(alertId: number, resolvedBy: string): Promise<void> {
    try {
      return await this.tryDatabase(() => this.dbStorage.archiveResolvedAlert(alertId, resolvedBy));
    } catch {
      return this.memStorage.archiveResolvedAlert(alertId, resolvedBy);
    }
  }

  async getChildProfile(childUserId: string): Promise<any> {
    try {
      return await this.tryDatabase(() => this.dbStorage.getChildProfile(childUserId));
    } catch {
      return this.memStorage.getChildProfile(childUserId);
    }
  }
}

export const storage = new SmartStorage();
