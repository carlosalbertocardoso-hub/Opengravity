import fs from 'fs';
import admin from 'firebase-admin';
import { config } from '../config.js';

// Simple JSON Database Implementation (Fallback)
const DB_FILE = config.DB_PATH.endsWith('.db') ? config.DB_PATH.replace('.db', '.json') : config.DB_PATH;

interface Data {
  messages: { user_id: string; role: string; content: string; timestamp: string }[];
  memory: Record<string, string>;
}

function loadLocalDb(): Data {
  if (!fs.existsSync(DB_FILE)) {
    return { messages: [], memory: {} };
  }
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch (e) {
    return { messages: [], memory: {} };
  }
}

function saveLocalDb(data: Data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Firebase Initialization
let db: admin.firestore.Firestore | null = null;

try {
  const credentials = config.GOOGLE_APPLICATION_CREDENTIALS;
  if (credentials) {
    let serviceAccount;
    // Miramos si es un path o un JSON directamente
    if (credentials.startsWith('{')) {
      serviceAccount = JSON.parse(credentials);
    } else if (fs.existsSync(credentials)) {
      serviceAccount = JSON.parse(fs.readFileSync(credentials, 'utf8'));
    }

    if (serviceAccount) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      db = admin.firestore();
      console.log('✅ Firebase initialized successfully');
    } else {
      console.warn('⚠️ Firebase credentials not valid. Falling back to local storage.');
    }
  } else {
    console.warn('⚠️ Firebase environment variable not found. Falling back to local storage.');
  }
} catch (error) {
  console.error('❌ Failed to initialize Firebase:', error);
}

export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
}

export const dbService = {
  async addMessage(userId: string, role: string, content: string) {
    const timestamp = new Date().toISOString();
    
    if (db) {
      try {
        await db.collection('messages').add({
          user_id: userId,
          role,
          content,
          timestamp
        });
        return;
      } catch (error) {
        console.error('❌ Error saving to Firestore, falling back to local:', error);
      }
    }

    // Fallback: Local JSON
    const data = loadLocalDb();
    data.messages.push({ user_id: userId, role, content, timestamp });
    saveLocalDb(data);
  },

  async getHistory(userId: string, limit: number = 20): Promise<Message[]> {
    if (db) {
      try {
        const snapshot = await db.collection('messages')
          .where('user_id', '==', userId)
          .orderBy('timestamp', 'desc')
          .limit(limit)
          .get();

        return snapshot.docs
          .map(doc => {
            const data = doc.data();
            return {
              role: data.role as any,
              content: data.content
            };
          })
          .reverse();
      } catch (error) {
        console.error('❌ Error reading from Firestore, falling back to local:', error);
      }
    }

    // Fallback: Local JSON
    const data = loadLocalDb();
    return data.messages
      .filter(m => m.user_id === userId)
      .slice(-limit)
      .map(row => ({
        role: row.role as any,
        content: row.content
      }));
  },

  async setMemory(key: string, value: string) {
    if (db) {
      try {
        await db.collection('memory').doc(key).set({ value, updatedAt: new Date().toISOString() });
        return;
      } catch (error) {
        console.error('❌ Error saving memory to Firestore:', error);
      }
    }

    // Fallback: Local JSON
    const data = loadLocalDb();
    data.memory[key] = value;
    saveLocalDb(data);
  },

  async getMemory(key: string): Promise<string | null> {
    if (db) {
      try {
        const doc = await db.collection('memory').doc(key).get();
        if (doc.exists) {
          return doc.data()?.value || null;
        }
      } catch (error) {
        console.error('❌ Error reading memory from Firestore:', error);
      }
    }

    // Fallback: Local JSON
    const data = loadLocalDb();
    return data.memory[key] || null;
  }
};
