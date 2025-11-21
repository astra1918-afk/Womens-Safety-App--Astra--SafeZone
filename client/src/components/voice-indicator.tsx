import { Mic, X } from "lucide-react";
import { useVoiceRecognition } from "@/hooks/use-voice-recognition";
import { useEffect, useState } from "react";

export default function VoiceIndicator() {
  const [isVisible, setIsVisible] = useState(false);
  const { isListening, startListening, stopListening, transcript } = useVoiceRecognition();

  useEffect(() => {
    const handleStartVoice = () => {
      setIsVisible(true);
      startListening();
    };

    const handleStopVoice = () => {
      setIsVisible(false);
      stopListening();
    };

    window.addEventListener('startVoiceRecognition', handleStartVoice);
    window.addEventListener('stopVoiceRecognition', handleStopVoice);

    return () => {
      window.removeEventListener('startVoiceRecognition', handleStartVoice);
      window.removeEventListener('stopVoiceRecognition', handleStopVoice);
    };
  }, [startListening, stopListening]);

  useEffect(() => {
    if (isListening) {
      // Auto-hide after 10 seconds if no voice command detected
      const timer = setTimeout(() => {
        setIsVisible(false);
        stopListening();
      }, 10000);

      return () => clearTimeout(timer);
    }
  }, [isListening, stopListening]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 text-center max-w-sm mx-4">
        <div className="relative">
          <button
            onClick={() => {
              setIsVisible(false);
              stopListening();
            }}
            className="absolute -top-4 -right-4 w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center hover:bg-gray-300"
          >
            <X className="h-4 w-4" />
          </button>
          
          <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-4 ${
            isListening ? 'bg-red-100 voice-listening' : 'bg-gray-100'
          }`}>
            <Mic className={`h-10 w-10 ${isListening ? 'text-red-500' : 'text-gray-400'}`} />
          </div>
          
          <h3 className="text-xl font-semibold mb-2">Voice Recognition</h3>
          
          {isListening ? (
            <div>
              <p className="text-gray-600 mb-3">Listening for "Help me!"</p>
              <p className="text-sm text-gray-500">Speak clearly into your device</p>
              {transcript && (
                <div className="mt-3 p-2 bg-gray-100 rounded text-sm">
                  <strong>Heard:</strong> {transcript}
                </div>
              )}
            </div>
          ) : (
            <div>
              <p className="text-gray-600 mb-3">Voice recognition ready</p>
              <button
                onClick={startListening}
                className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors"
              >
                Start Listening
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
