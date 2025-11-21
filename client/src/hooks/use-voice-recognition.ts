import { useState, useEffect, useCallback } from "react";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

export function useVoiceRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isSupported, setIsSupported] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);
  const [permissionError, setPermissionError] = useState<string | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (SpeechRecognition) {
      setIsSupported(true);
      const recognitionInstance = new SpeechRecognition();
      
      recognitionInstance.continuous = true;
      recognitionInstance.interimResults = true;
      recognitionInstance.lang = 'en-US';

      recognitionInstance.onstart = () => {
        setIsListening(true);
        setPermissionError(null);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setPermissionError('Microphone access denied. Please enable microphone permissions in your browser settings.');
        } else if (event.error === 'network') {
          setPermissionError('Network error. Please check your internet connection.');
        } else {
          setPermissionError(`Voice recognition error: ${event.error}`);
        }
      };

      recognitionInstance.onresult = (event: any) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          setTranscript(finalTranscript);
          checkForEmergencyKeywords(finalTranscript);
        }
      };

      setRecognition(recognitionInstance);
    } else {
      setIsSupported(false);
      setPermissionError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
    }
  }, []);

  const checkForEmergencyKeywords = (text: string) => {
    const emergencyKeywords = ['help me', 'emergency', 'danger', 'help', 'police', 'call 911', 'sos', 'assistance'];
    const lowerText = text.toLowerCase();
    
    for (const keyword of emergencyKeywords) {
      if (lowerText.includes(keyword)) {
        console.log('Emergency keyword detected:', keyword);
        // Trigger emergency alert
        window.dispatchEvent(new CustomEvent('voiceEmergency', { 
          detail: { keyword, transcript: text } 
        }));
        break;
      }
    }
  };

  const startListening = useCallback(() => {
    if (recognition && !isListening) {
      try {
        recognition.start();
      } catch (error) {
        console.error('Failed to start recognition:', error);
        setPermissionError('Failed to start voice recognition. Please check browser permissions.');
      }
    }
  }, [recognition, isListening]);

  const stopListening = useCallback(() => {
    if (recognition && isListening) {
      recognition.stop();
    }
  }, [recognition, isListening]);

  const requestMicrophonePermission = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      setPermissionError(null);
      return true;
    } catch (error) {
      setPermissionError('Microphone permission denied. Please enable microphone access in browser settings.');
      return false;
    }
  }, []);

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
    permissionError,
    requestMicrophonePermission
  };
}