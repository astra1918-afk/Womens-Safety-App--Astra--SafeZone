import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

interface iPhoneDirectMessagingProps {
  contacts: Array<{name: string; phoneNumber: string}>;
  emergencyMessage: string;
  onComplete: () => void;
}

export default function IPhoneDirectMessaging({ 
  contacts, 
  emergencyMessage, 
  onComplete 
}: iPhoneDirectMessagingProps) {
  const { toast } = useToast();

  const openMessagesApp = (contact: {name: string; phoneNumber: string}) => {
    const cleanNumber = contact.phoneNumber.replace(/\D/g, '');
    const messageBody = encodeURIComponent(emergencyMessage);
    
    // Create button element that user must tap (required for iOS security)
    const button = document.createElement('button');
    button.style.position = 'fixed';
    button.style.top = '50%';
    button.style.left = '50%';
    button.style.transform = 'translate(-50%, -50%)';
    button.style.zIndex = '10000';
    button.style.padding = '20px 40px';
    button.style.fontSize = '18px';
    button.style.backgroundColor = '#007AFF';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '12px';
    button.style.fontWeight = 'bold';
    button.textContent = `Tap to Message ${contact.name}`;
    
    button.onclick = () => {
      // Multiple URL schemes for iPhone Messages
      const messagesUrl = `sms:${cleanNumber}?body=${messageBody}`;
      const messagesAlt = `sms://${cleanNumber}?body=${messageBody}`;
      
      // Try primary method
      window.location.href = messagesUrl;
      
      // Fallback method
      setTimeout(() => {
        window.open(messagesAlt, '_self');
      }, 200);
      
      // Remove button after tap
      document.body.removeChild(button);
      
      toast({
        title: "Messages Opening",
        description: `Opening Messages for ${contact.name}`,
        duration: 2000,
      });
      
      // Complete after short delay
      setTimeout(onComplete, 3000);
    };
    
    document.body.appendChild(button);
    
    // Auto-remove button after 10 seconds
    setTimeout(() => {
      if (document.body.contains(button)) {
        document.body.removeChild(button);
        onComplete();
      }
    }, 10000);
  };

  useEffect(() => {
    if (contacts.length > 0) {
      openMessagesApp(contacts[0]);
    } else {
      onComplete();
    }
  }, [contacts, emergencyMessage, onComplete, toast]);

  // Show contact list with tap buttons
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="text-center mb-6">
          <div className="text-lg font-semibold text-red-600 mb-2">
            Emergency SOS - Messages
          </div>
          <div className="text-sm text-gray-600">
            Tap to open Messages app for each contact
          </div>
        </div>
        
        <div className="space-y-3">
          {contacts.map((contact, index) => (
            <button
              key={contact.phoneNumber}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-4 px-6 rounded-lg text-left flex items-center justify-between"
              onClick={() => {
                const cleanNumber = contact.phoneNumber.replace(/\D/g, '');
                const messageBody = encodeURIComponent(emergencyMessage);
                const messagesUrl = `sms:${cleanNumber}?body=${messageBody}`;
                
                // Open Messages app
                window.location.href = messagesUrl;
                
                toast({
                  title: "Opening Messages",
                  description: `Messages app opening for ${contact.name}`,
                  duration: 2000,
                });
              }}
            >
              <div>
                <div className="font-semibold">{contact.name}</div>
                <div className="text-blue-100 text-sm">{contact.phoneNumber}</div>
              </div>
              <div className="text-blue-100">
                Tap to Message →
              </div>
            </button>
          ))}
        </div>
        
        <button
          onClick={onComplete}
          className="w-full mt-4 bg-gray-500 hover:bg-gray-600 text-white py-3 px-6 rounded-lg"
        >
          Close
        </button>
      </div>
    </div>
  );
}