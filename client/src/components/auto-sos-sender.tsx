import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageCircle, Phone, Check, X, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AutoSOSSenderProps {
  contacts: Array<{name: string; phoneNumber: string}>;
  emergencyMessage: string;
  onComplete: () => void;
  autoSend?: boolean;
}

export default function AutoSOSSender({ 
  contacts, 
  emergencyMessage, 
  onComplete,
  autoSend = false
}: AutoSOSSenderProps) {
  const [currentContactIndex, setCurrentContactIndex] = useState(0);
  const [sentContacts, setSentContacts] = useState<Set<string>>(new Set());
  const [isAutoSending, setIsAutoSending] = useState(autoSend);
  const [sendingComplete, setSendingComplete] = useState(false);
  const { toast } = useToast();

  // Auto-send messages for iPhone 13 Pro Max
  useEffect(() => {
    if (isAutoSending && currentContactIndex < contacts.length) {
      const contact = contacts[currentContactIndex];
      
      // Auto-trigger Messages app for iPhone
      const autoSendMessage = () => {
        const cleanNumber = contact.phoneNumber.replace(/\D/g, '');
        const messageBody = encodeURIComponent(emergencyMessage);
        
        // iPhone 13 Pro Max Messages URL scheme - Fixed format
        if (navigator.userAgent.includes('iPhone') || navigator.userAgent.includes('iOS')) {
          const iOSMessagesUrl = `sms:${cleanNumber}?body=${messageBody}`;
          
          // Primary method - direct location change
          window.location.href = iOSMessagesUrl;
          
          // Backup method - window.open
          setTimeout(() => {
            window.open(iOSMessagesUrl, '_self');
          }, 100);
        } else {
          // Standard SMS for other devices
          const smsUrl = `sms:${contact.phoneNumber}?body=${messageBody}`;
          window.location.href = smsUrl;
        }
        
        setSentContacts(prev => new Set(prev).add(contact.phoneNumber));
        
        toast({
          title: "Auto-Sending SOS",
          description: `Opening Messages for ${contact.name}`,
          variant: "default",
        });
      };

      // Auto-send with delay between contacts
      const timer = setTimeout(() => {
        autoSendMessage();
        setCurrentContactIndex(prev => prev + 1);
      }, currentContactIndex * 2000); // 2 second delay between each contact

      return () => clearTimeout(timer);
    } else if (isAutoSending && currentContactIndex >= contacts.length) {
      setIsAutoSending(false);
      setSendingComplete(true);
      
      toast({
        title: "Auto-SOS Complete",
        description: `Messages sent to ${contacts.length} contacts`,
        variant: "default",
      });
    }
  }, [isAutoSending, currentContactIndex, contacts, emergencyMessage, toast]);

  const sendToContact = (contact: {name: string; phoneNumber: string}, index: number) => {
    const cleanNumber = contact.phoneNumber.replace(/\D/g, '');
    const messageBody = encodeURIComponent(emergencyMessage);
    
    // iPhone 13 Pro Max Messages integration - corrected format
    const iOSMessagesUrl = `sms:${cleanNumber}?body=${messageBody}`;
    
    // Try direct window.location first
    window.location.href = iOSMessagesUrl;
    
    setSentContacts(prev => new Set(prev).add(contact.phoneNumber));
    
    toast({
      title: "Messages App Opening",
      description: `Opening Messages for ${contact.name}`,
      variant: "default",
    });
  };

  const sendToAllContacts = () => {
    setIsAutoSending(true);
    setCurrentContactIndex(0);
    setSentContacts(new Set());
    
    toast({
      title: "Auto-SOS Started",
      description: "Automatically opening Messages for all contacts",
      variant: "default",
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-red-50 border-red-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-red-700 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Emergency SOS - iPhone Messages
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onComplete}
              className="text-red-600 hover:text-red-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Auto-send button for iPhone */}
          {!isAutoSending && !sendingComplete && (
            <Button 
              onClick={sendToAllContacts}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3"
              size="lg"
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              Auto-Send to All Contacts
            </Button>
          )}

          {/* Progress indicator */}
          {isAutoSending && (
            <div className="text-center py-4">
              <div className="text-red-600 font-medium">
                Auto-sending... {currentContactIndex}/{contacts.length}
              </div>
              <div className="w-full bg-red-200 rounded-full h-2 mt-2">
                <div 
                  className="bg-red-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(currentContactIndex / contacts.length) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Completion message */}
          {sendingComplete && (
            <div className="text-center py-4 text-green-600 font-medium">
              ✓ Auto-SOS completed for all {contacts.length} contacts
            </div>
          )}

          {/* Contact list */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {contacts.map((contact, index) => (
              <div key={contact.phoneNumber} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{contact.name}</div>
                  <div className="text-sm text-gray-600">{contact.phoneNumber}</div>
                </div>
                
                <div className="flex items-center gap-2">
                  {sentContacts.has(contact.phoneNumber) ? (
                    <div className="flex items-center text-green-600">
                      <Check className="h-4 w-4 mr-1" />
                      <span className="text-xs">Sent</span>
                    </div>
                  ) : (
                    <Button
                      onClick={() => sendToContact(contact, index)}
                      size="sm"
                      variant="outline"
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <MessageCircle className="h-3 w-3 mr-1" />
                      Send
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Emergency services */}
          <div className="border-t pt-4">
            <div className="text-sm font-medium text-gray-700 mb-2">Emergency Services</div>
            <div className="grid grid-cols-3 gap-2">
              <Button 
                onClick={() => window.location.href = 'tel:911'}
                variant="outline" 
                size="sm"
                className="text-red-600 border-red-200"
              >
                <Phone className="h-3 w-3 mr-1" />
                911
              </Button>
              <Button 
                onClick={() => window.location.href = 'tel:100'}
                variant="outline" 
                size="sm"
                className="text-red-600 border-red-200"
              >
                <Phone className="h-3 w-3 mr-1" />
                Police
              </Button>
              <Button 
                onClick={() => window.location.href = 'tel:108'}
                variant="outline" 
                size="sm"
                className="text-red-600 border-red-200"
              >
                <Phone className="h-3 w-3 mr-1" />
                Medical
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}