import express from 'express';
import { createServer } from 'http';

const webhookApp = express();
webhookApp.use(express.json());

// WhatsApp webhook verification endpoint
webhookApp.get('/webhook/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  
  const VERIFY_TOKEN = 'sakhi_suraksha_webhook_token_2024';
  
  console.log('WhatsApp webhook verification attempt:', { mode, token, challenge });
  
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('WhatsApp webhook verified successfully');
    res.status(200).send(challenge);
  } else {
    console.log('WhatsApp webhook verification failed');
    res.status(403).send('Forbidden');
  }
});

// WhatsApp webhook events endpoint
webhookApp.post('/webhook/whatsapp', (req, res) => {
  try {
    const body = req.body;
    console.log('WhatsApp webhook received:', JSON.stringify(body, null, 2));
    
    if (body.object === 'whatsapp_business_account') {
      body.entry?.forEach((entry: any) => {
        entry.changes?.forEach((change: any) => {
          if (change.field === 'messages') {
            const messages = change.value?.messages;
            const statuses = change.value?.statuses;
            
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

// Start webhook server on port 5001
const webhookServer = createServer(webhookApp);
webhookServer.listen(5001, () => {
  console.log('WhatsApp webhook server running on port 5001');
});

export { webhookApp, webhookServer };