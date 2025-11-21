import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PersistentVoiceDetectorProps {
  onEmergencyDetected: (triggerType: string, scenario: string, detectedText: string) => void;
  isActive: boolean;
  onToggle: (active: boolean) => void;
}

export default function PersistentVoiceDetector({ 
  onEmergencyDetected, 
  isActive, 
  onToggle 
}: PersistentVoiceDetectorProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [bufferSize, setBufferSize] = useState(0);
  const { toast } = useToast();
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recognitionRef = useRef<any>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const cleanupIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastEmergencyTriggerRef = useRef<number>(0);
  const emergencyDebounceTimeRef = useRef<number>(10000); // 10 second debounce

  // Enhanced distress keywords with Hindi accent variations and phonetic alternatives
  const distressKeywords = [
    // English keywords
    'help', 'emergency', 'danger', 'fire', 'police', 'ambulance',
    'save me', 'help me', 'call police', 'call 911', 'call 100', 'attack', 'assault',
    
    // Hindi keywords with common accent variations
    'bachao', 'bachow', 'bachav', 'bacho', 'bachau',
    'madad', 'madad karo', 'madad chahiye', 'madath', 'madat',
    'aag', 'aag lagi', 'aag hai', 'ag', 'fire hai',
    'chor', 'thief', 'chori', 'chohr',
    'police bulao', 'police ko bulao', 'police call karo',
    
    // Mixed language emergency phrases common in Indian English
    'help karo', 'emergency hai', 'danger hai', 'bachao mujhe',
    'call kar do', 'phone kar do', 'help kar do',
    'koi hai', 'koi madad karo', 'please help',
    
    // Phonetic variations for Hindi accent English
    'halp', 'emergenci', 'danjar', 'polis', 'ambulans',
    'sev mi', 'halp mi', 'atak', 'asolt'
  ];

  useEffect(() => {
    if (isActive) {
      startPersistentListening();
    } else {
      stopPersistentListening();
    }

    return () => {
      stopPersistentListening();
    };
  }, [isActive]);

  // Enhanced phonetic similarity for Hindi accent recognition
  const getPhoneticSimilarity = (word1: string, word2: string): number => {
    const normalizeText = (text: string) => text.toLowerCase().replace(/[^a-z]/g, '');
    const w1 = normalizeText(word1);
    const w2 = normalizeText(word2);
    
    if (w1 === w2) return 1.0;
    
    // Check for common Hindi accent substitutions
    const accentMappings = [
      { from: 'w', to: 'v' },     // help -> halp
      { from: 'v', to: 'w' },     // bachav -> bachaw
      { from: 'th', to: 't' },    // help -> halp
      { from: 'er', to: 'ar' },   // emergency -> emargency
      { from: 'ce', to: 'se' },   // emergency -> emergense
      { from: 'ge', to: 'j' },    // danger -> danjar
      { from: 'ou', to: 'ow' },   // bachao -> bachow
    ];
    
    let score = 0;
    const maxLen = Math.max(w1.length, w2.length);
    
    // Apply accent mappings and check similarity
    let mapped1 = w1;
    let mapped2 = w2;
    
    for (const mapping of accentMappings) {
      mapped1 = mapped1.replace(new RegExp(mapping.from, 'g'), mapping.to);
      mapped2 = mapped2.replace(new RegExp(mapping.from, 'g'), mapping.to);
    }
    
    // Levenshtein distance with phonetic tolerance
    const distance = getLevenshteinDistance(mapped1, mapped2);
    return Math.max(0, (maxLen - distance) / maxLen);
  };
  
  const getLevenshteinDistance = (str1: string, str2: string): number => {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + cost
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  const triggerEmergencyAlert = (keyword: string, detectedText: string) => {
    // Update debounce timestamp
    lastEmergencyTriggerRef.current = Date.now();
    
    toast({
      title: "🚨 Emergency Keyword Detected!",
      description: `Detected: "${keyword}" - Triggering emergency alert`,
      variant: "destructive"
    });

    // Create detailed scenario based on detected keyword and context
    const scenario = `Voice Distress Alert: "${keyword}" detected in speech. Audio Analysis: "${detectedText.trim()}". Stress Level: HIGH - Automatic trigger activated.`;
    
    // Trigger emergency with voice detection details
    onEmergencyDetected('voice_detection', scenario, detectedText.trim());
    
    // Show additional notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Emergency Alert Triggered', {
        body: `Voice keyword "${keyword}" detected - Emergency services being contacted`,
        icon: '/favicon.ico'
      });
    }
  };

  const checkForDistressKeywords = (text: string, alternatives: string[] = []) => {
    const lowercaseText = text.toLowerCase().trim();
    const allTexts = [lowercaseText, ...alternatives.map(alt => alt.toLowerCase().trim())];
    console.log('Checking text for keywords:', lowercaseText);
    console.log('Checking alternatives:', alternatives);
    
    // Check for debounce - prevent multiple alerts within 30 seconds
    const now = Date.now();
    if (now - lastEmergencyTriggerRef.current < 30000) {
      console.log(`Emergency debounced - ${Math.ceil((30000 - (now - lastEmergencyTriggerRef.current)) / 1000)}s remaining`);
      return;
    }
    
    for (const textToCheck of allTexts) {
      for (const keyword of distressKeywords) {
        const keywordLower = keyword.toLowerCase();
        
        // Direct match
        if (textToCheck.includes(keywordLower)) {
          console.log(`🚨 DISTRESS KEYWORD DETECTED: "${keyword}" in text: "${textToCheck}"`);
          triggerEmergencyAlert(keyword, textToCheck);
          return;
        }
        
        // Phonetic similarity matching for Hindi accents
        const words = textToCheck.split(/\s+/);
        for (const word of words) {
          const similarity = getPhoneticSimilarity(word, keywordLower);
          if (similarity > 0.7) { // 70% similarity threshold
            console.log(`🚨 PHONETIC MATCH DETECTED: "${word}" matches "${keyword}" with ${(similarity * 100).toFixed(1)}% similarity`);
            triggerEmergencyAlert(keyword, textToCheck);
            return;
          }
        }
        
        // Check multi-word phrases with phonetic tolerance
        if (keyword.includes(' ')) {
          const keywordWords = keywordLower.split(/\s+/);
          
          for (let i = 0; i <= words.length - keywordWords.length; i++) {
            let allWordsMatch = true;
            for (let j = 0; j < keywordWords.length; j++) {
              const similarity = getPhoneticSimilarity(words[i + j], keywordWords[j]);
              if (similarity < 0.7) {
                allWordsMatch = false;
                break;
              }
            }
            if (allWordsMatch) {
              console.log(`🚨 PHRASE MATCH DETECTED: "${words.slice(i, i + keywordWords.length).join(' ')}" matches "${keyword}"`);
              triggerEmergencyAlert(keyword, textToCheck);
              return;
            }
          }
        }
      }
    }
  };

  const startPersistentListening = async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup enhanced speech recognition for Hindi accents
      if ('webkitSpeechRecognition' in window) {
        const recognition = new (window as any).webkitSpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-IN'; // Indian English for better Hindi accent recognition
        recognition.maxAlternatives = 5; // More alternatives for accent variations

        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';
          let allAlternatives = [];
          
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            
            // Collect all alternatives for better accent matching
            for (let j = 0; j < result.length && j < 5; j++) {
              allAlternatives.push(result[j].transcript.toLowerCase());
            }
            
            if (result.isFinal) {
              finalTranscript += result[0].transcript;
            } else {
              interimTranscript += result[0].transcript;
            }
          }
          
          // Check both final and interim results plus alternatives for faster detection
          const textToCheck = finalTranscript || interimTranscript;
          if (textToCheck) {
            console.log('Voice input (final):', finalTranscript);
            console.log('Voice input (interim):', interimTranscript);
            console.log('All alternatives:', allAlternatives);
            
            if (finalTranscript) {
              setTranscription(prev => prev + ' ' + finalTranscript);
            }
            
            // Check primary transcript and all alternatives
            checkForDistressKeywords(textToCheck, allAlternatives);
          }
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          if (event.error === 'not-allowed') {
            toast({
              title: "Microphone Access Denied",
              description: "Please allow microphone access for voice detection",
              variant: "destructive"
            });
          }
        };

        recognition.onend = () => {
          if (isActive) {
            // Restart recognition if still active
            setTimeout(() => {
              if (recognitionRef.current && isActive) {
                recognition.start();
              }
            }, 100);
          }
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
      }

      // Setup audio recording for evidence
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          setBufferSize(prev => prev + event.data.size);
        }
      };

      mediaRecorder.start(1000); // Record in 1-second chunks

      // Setup cleanup interval
      cleanupIntervalRef.current = setInterval(cleanupOldData, 10000); // Every 10 seconds

      toast({
        title: "Voice Detection Active",
        description: "Listening for emergency keywords. Say 'help' or 'bachao' to trigger alert."
      });

    } catch (error) {
      console.error('Failed to start voice detection:', error);
      toast({
        title: "Voice Detection Failed",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  };

  const stopPersistentListening = () => {
    setIsListening(false);

    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (cleanupIntervalRef.current) {
      clearInterval(cleanupIntervalRef.current);
      cleanupIntervalRef.current = null;
    }

    // Clean up audio chunks
    audioChunksRef.current = [];
    setBufferSize(0);
    setTranscription("");
  };

  const cleanupOldData = () => {
    const maxBufferSize = 50 * 1024 * 1024; // 50MB limit
    
    if (bufferSize > maxBufferSize) {
      // Remove oldest audio chunks
      const chunksToRemove = Math.floor(audioChunksRef.current.length / 2);
      const removedChunks = audioChunksRef.current.splice(0, chunksToRemove);
      
      const removedSize = removedChunks.reduce((total: number, chunk: Blob) => total + chunk.size, 0);
      setBufferSize(prev => prev - removedSize);
      
      console.log(`Cleaned up ${removedSize} bytes of audio data`);
    }

    // Limit transcription length
    if (transcription.length > 1000) {
      setTranscription(prev => prev.slice(-500)); // Keep last 500 characters
    }
  };

  const manualCleanup = () => {
    audioChunksRef.current = [];
    setBufferSize(0);
    setTranscription("");
    
    toast({
      title: "Data Cleared",
      description: "Audio buffer and transcription cleared"
    });
  };

  const formatBufferSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Voice Detection</h3>
        <div className="flex items-center gap-2">
          <Button
            variant={isActive ? "destructive" : "default"}
            size="sm"
            onClick={() => onToggle(!isActive)}
            className="flex items-center gap-2"
          >
            {isActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            {isActive ? "Stop" : "Start"}
          </Button>
        </div>
      </div>

      {isActive && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${isListening ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`}></div>
            <span className="text-sm text-gray-600">
              {isListening ? 'Listening for emergency keywords...' : 'Not listening'}
            </span>
          </div>
          
          <div className="bg-gray-50 p-3 rounded text-sm">
            <p className="font-medium text-gray-700 mb-2">Supported Keywords:</p>
            <p className="text-gray-600">
              English: help, emergency, danger, fire, police, ambulance<br />
              Hindi: bachao, madad, aag, chor, police bulao<br />
              Mixed: help karo, emergency hai, danger hai
            </p>
          </div>

          <div className="text-sm text-gray-600">
            <div className="flex justify-between items-center">
              <span>Buffer: {formatBufferSize(bufferSize)}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={manualCleanup}
                className="flex items-center gap-1"
              >
                <Trash2 className="w-3 h-3" />
                Clear
              </Button>
            </div>
          </div>

          {transcription && (
            <div className="bg-blue-50 p-2 rounded text-sm">
              <p className="font-medium text-blue-700">Recent Speech:</p>
              <p className="text-blue-600">{transcription.slice(-200)}...</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}