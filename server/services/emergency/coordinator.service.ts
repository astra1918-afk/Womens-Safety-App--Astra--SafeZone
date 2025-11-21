import { EventEmitter } from 'events';
import { voiceAIService } from '../ai-voice/voiceAI.service';
import { db } from '../../db';
import { emergencyAlerts, emergencyContacts, liveStreams } from '../../../shared/schema';
import { eq } from 'drizzle-orm';

export class EmergencyCoordinatorService extends EventEmitter {
  private activeEmergencies = new Map<string, EmergencySession>();
  private streamingSessions = new Map<string, StreamingSession>();

  constructor() {
    super();
    this.initializeVoiceAIIntegration();
  }

  private initializeVoiceAIIntegration() {
    // Listen for AI voice emergency detection
    voiceAIService.on('emergencyDetected', async (voiceData) => {
      await this.handleVoiceEmergency(voiceData);
    });
  }

  // Handle AI voice-triggered emergency
  async handleVoiceEmergency(voiceData: any): Promise<string> {
    console.log('Processing voice-triggered emergency:', voiceData.analysis);

    const emergencyId = `voice_${Date.now()}`;
    const location = await this.getCurrentLocation();

    // Create emergency alert record
    const [alert] = await db.insert(emergencyAlerts).values({
      userId: 'demo-user', // In production, get from session
      triggerType: 'voice_ai',
      latitude: location.latitude,
      longitude: location.longitude,
      address: voiceData.transcription,
      audioRecordingUrl: JSON.stringify({
        transcription: voiceData.transcription,
        confidence: voiceData.analysis.confidence,
        detectedKeywords: voiceData.analysis.detectedKeywords,
        stressLevel: voiceData.analysis.stressIndicators.stressLevel
      }),
      isResolved: false
    }).returning();

    // Start emergency response protocol
    await this.executeEmergencyProtocol(alert.id.toString(), {
      triggerType: 'voice_ai',
      voiceAnalysis: voiceData.analysis,
      location,
      timestamp: Date.now()
    });

    return emergencyId;
  }

  // Execute complete emergency response protocol
  async executeEmergencyProtocol(alertId: string, emergencyData: EmergencyData): Promise<void> {
    console.log(`Executing emergency protocol for alert ${alertId}`);

    const emergencySession: EmergencySession = {
      alertId,
      startTime: Date.now(),
      isActive: true,
      responses: []
    };

    this.activeEmergencies.set(alertId, emergencySession);

    try {
      // Parallel execution for maximum speed
      await Promise.all([
        this.initiateLocationBroadcasting(alertId, emergencyData.location),
        this.startVideoRecording(alertId),
        this.notifyEmergencyContacts(alertId, emergencyData),
        this.initiateLiveStreaming(alertId)
      ]);

      console.log(`Emergency protocol completed for alert ${alertId}`);
      
    } catch (error) {
      console.error(`Emergency protocol failed for alert ${alertId}:`, error);
      this.emit('emergencyProtocolFailed', { alertId, error });
    }
  }

  // Start continuous location broadcasting
  private async initiateLocationBroadcasting(alertId: string, location: Location): Promise<void> {
    const session = this.activeEmergencies.get(alertId);
    if (!session) return;

    // Broadcast every 15 seconds during emergency
    const locationInterval = setInterval(async () => {
      if (!session.isActive) {
        clearInterval(locationInterval);
        return;
      }

      const currentLocation = await this.getCurrentLocation();
      await this.broadcastLocationUpdate(alertId, currentLocation);
      
    }, 15000);

    session.locationInterval = locationInterval;
  }

  // Start video recording immediately
  private async startVideoRecording(alertId: string): Promise<string> {
    try {
      // Generate recording URL
      const recordingUrl = `/api/emergency-recordings/emergency_${alertId}/video.mp4`;
      
      // In production, this would interface with device camera
      console.log(`Starting video recording for emergency ${alertId}`);
      
      // Update database with recording URL
      await db.update(emergencyAlerts)
        .set({ videoRecordingUrl: recordingUrl })
        .where(eq(emergencyAlerts.id, parseInt(alertId)));

      return recordingUrl;
    } catch (error) {
      console.error(`Failed to start video recording for alert ${alertId}:`, error);
      throw error;
    }
  }

  // Notify all emergency contacts via multiple channels
  private async notifyEmergencyContacts(alertId: string, emergencyData: EmergencyData): Promise<void> {
    try {
      // Get user's emergency contacts
      const contacts = await db.select()
        .from(emergencyContacts)
        .where(eq(emergencyContacts.userId, 'demo-user'));

      if (contacts.length === 0) {
        console.log('No emergency contacts found');
        return;
      }

      // Prepare emergency message
      const emergencyMessage = this.generateEmergencyMessage(emergencyData);

      // Send notifications via all channels simultaneously
      const notificationPromises = contacts.map(contact => 
        this.sendMultiChannelNotification(contact, emergencyMessage, emergencyData.location)
      );

      await Promise.all(notificationPromises);
      console.log(`Notifications sent to ${contacts.length} emergency contacts`);

    } catch (error) {
      console.error('Failed to notify emergency contacts:', error);
      throw error;
    }
  }

  // Send notification via SMS, WhatsApp, and voice call
  private async sendMultiChannelNotification(
    contact: any, 
    message: string, 
    location: Location
  ): Promise<void> {
    const promises = [
      this.sendSMSAlert(contact.phoneNumber, message, location),
      this.sendWhatsAppAlert(contact.phoneNumber, message, location),
      this.initiateVoiceCall(contact.phoneNumber, message)
    ];

    try {
      await Promise.allSettled(promises);
    } catch (error) {
      console.error(`Failed to send notifications to ${contact.name}:`, error);
    }
  }

  // Initiate live streaming for emergency contacts
  private async initiateLiveStreaming(alertId: string): Promise<string> {
    try {
      const streamUrl = `https://stream.sakhisuraksha.com/emergency/${alertId}`;
      const shareLink = `https://app.sakhisuraksha.com/emergency-stream/${alertId}`;

      // Store stream information
      const [stream] = await db.insert(liveStreams).values({
        userId: 'demo-user',
        emergencyAlertId: parseInt(alertId),
        streamUrl,
        shareLink,
        isActive: true
      }).returning();

      // Store streaming session
      const streamingSession: StreamingSession = {
        streamId: stream.id.toString(),
        alertId,
        streamUrl,
        shareLink,
        startTime: Date.now(),
        isActive: true,
        viewers: []
      };

      this.streamingSessions.set(alertId, streamingSession);

      console.log(`Live streaming initiated for emergency ${alertId}: ${shareLink}`);
      return shareLink;

    } catch (error) {
      console.error(`Failed to initiate live streaming for alert ${alertId}:`, error);
      throw error;
    }
  }

  // Generate emergency message based on trigger type
  private generateEmergencyMessage(emergencyData: EmergencyData): string {
    const timestamp = new Date().toLocaleString();
    
    switch (emergencyData.triggerType) {
      case 'voice_ai':
        return `🚨 VOICE AI EMERGENCY ALERT 🚨
AI detected distress in speech: "${emergencyData.voiceAnalysis?.detectedKeywords?.join(', ')}"
Confidence: ${Math.round((emergencyData.voiceAnalysis?.confidence || 0) * 100)}%
Time: ${timestamp}
Immediate assistance may be needed!`;

      case 'manual_button':
        return `🚨 EMERGENCY SOS ACTIVATED 🚨
Manual emergency button pressed
Time: ${timestamp}
User needs immediate help!`;

      default:
        return `🚨 EMERGENCY ALERT 🚨
Emergency situation detected
Time: ${timestamp}
Please check on user immediately!`;
    }
  }

  // SMS alert implementation
  private async sendSMSAlert(phoneNumber: string, message: string, location: Location): Promise<void> {
    try {
      const locationMessage = `${message}\n📍 Location: ${location.latitude}, ${location.longitude}\n🗺️ Maps: https://maps.google.com/?q=${location.latitude},${location.longitude}`;
      
      // In production, integrate with Twilio SMS service
      console.log(`SMS sent to ${phoneNumber}: ${locationMessage}`);
      
    } catch (error) {
      console.error(`SMS failed to ${phoneNumber}:`, error);
    }
  }

  // WhatsApp alert implementation
  private async sendWhatsAppAlert(phoneNumber: string, message: string, location: Location): Promise<void> {
    try {
      // In production, integrate with WhatsApp Business API
      console.log(`WhatsApp sent to ${phoneNumber}: ${message}`);
      
    } catch (error) {
      console.error(`WhatsApp failed to ${phoneNumber}:`, error);
    }
  }

  // Voice call implementation
  private async initiateVoiceCall(phoneNumber: string, message: string): Promise<void> {
    try {
      // In production, integrate with Twilio Voice API
      console.log(`Voice call initiated to ${phoneNumber}`);
      
    } catch (error) {
      console.error(`Voice call failed to ${phoneNumber}:`, error);
    }
  }

  // Broadcast location update to all emergency contacts
  private async broadcastLocationUpdate(alertId: string, location: Location): Promise<void> {
    const session = this.activeEmergencies.get(alertId);
    if (!session || !session.isActive) return;

    // Send location update via SMS and WhatsApp
    const contacts = await db.select()
      .from(emergencyContacts)
      .where(eq(emergencyContacts.userId, 'demo-user'));

    const locationMessage = `📍 LOCATION UPDATE
Emergency ongoing - updated position:
Lat: ${location.latitude}, Lng: ${location.longitude}
🗺️ Live tracking: https://maps.google.com/?q=${location.latitude},${location.longitude}
Time: ${new Date().toLocaleString()}`;

    for (const contact of contacts) {
      await Promise.allSettled([
        this.sendSMSAlert(contact.phoneNumber, locationMessage, location),
        this.sendWhatsAppAlert(contact.phoneNumber, locationMessage, location)
      ]);
    }
  }

  // Get current location (mock for development)
  private async getCurrentLocation(): Promise<Location> {
    // In production, this would get actual GPS coordinates
    return {
      latitude: 13.0348 + (Math.random() - 0.5) * 0.001,
      longitude: 77.5624 + (Math.random() - 0.5) * 0.001,
      accuracy: 10,
      timestamp: Date.now()
    };
  }

  // Resolve emergency
  async resolveEmergency(alertId: string, resolvedBy?: string): Promise<void> {
    const session = this.activeEmergencies.get(alertId);
    if (!session) return;

    session.isActive = false;
    session.endTime = Date.now();

    // Clear location broadcasting
    if (session.locationInterval) {
      clearInterval(session.locationInterval);
    }

    // Stop live streaming
    const streamingSession = this.streamingSessions.get(alertId);
    if (streamingSession) {
      streamingSession.isActive = false;
      streamingSession.endTime = Date.now();
    }

    // Update database
    await db.update(emergencyAlerts)
      .set({ isResolved: true })
      .where(eq(emergencyAlerts.id, parseInt(alertId)));

    // Notify contacts that emergency is resolved
    await this.notifyEmergencyResolved(alertId);

    this.activeEmergencies.delete(alertId);
    this.streamingSessions.delete(alertId);

    console.log(`Emergency ${alertId} resolved`);
  }

  // Notify contacts that emergency is resolved
  private async notifyEmergencyResolved(alertId: string): Promise<void> {
    const contacts = await db.select()
      .from(emergencyContacts)
      .where(eq(emergencyContacts.userId, 'demo-user'));

    const resolvedMessage = `✅ EMERGENCY RESOLVED
Alert ${alertId} has been resolved.
User is now safe.
Time: ${new Date().toLocaleString()}`;

    for (const contact of contacts) {
      await Promise.allSettled([
        this.sendSMSAlert(contact.phoneNumber, resolvedMessage, await this.getCurrentLocation()),
        this.sendWhatsAppAlert(contact.phoneNumber, resolvedMessage, await this.getCurrentLocation())
      ]);
    }
  }

  // Get active emergencies
  getActiveEmergencies(): EmergencySession[] {
    return Array.from(this.activeEmergencies.values());
  }

  // Get streaming sessions
  getStreamingSessions(): StreamingSession[] {
    return Array.from(this.streamingSessions.values());
  }
}

// Type definitions
interface EmergencyData {
  triggerType: 'voice_ai' | 'manual_button' | 'sensor';
  voiceAnalysis?: any;
  location: Location;
  timestamp: number;
}

interface Location {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

interface EmergencySession {
  alertId: string;
  startTime: number;
  endTime?: number;
  isActive: boolean;
  responses: any[];
  locationInterval?: NodeJS.Timeout;
}

interface StreamingSession {
  streamId: string;
  alertId: string;
  streamUrl: string;
  shareLink: string;
  startTime: number;
  endTime?: number;
  isActive: boolean;
  viewers: string[];
}

// Singleton instance
export const emergencyCoordinator = new EmergencyCoordinatorService();