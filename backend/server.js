const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite database
const db = new sqlite3.Database('./philosophers.db');

// Create tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Philosophers table
  db.run(`CREATE TABLE IF NOT EXISTS philosophers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    bio TEXT NOT NULL,
    tagline TEXT NOT NULL,
    avatar TEXT,
    themes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // Matches table
  db.run(`CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    philosopher_id INTEGER NOT NULL,
    matched_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (philosopher_id) REFERENCES philosophers (id),
    UNIQUE(user_id, philosopher_id)
  )`);

  // Conversations table
  db.run(`CREATE TABLE IF NOT EXISTS conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    philosopher_id INTEGER NOT NULL,
    conversation_state TEXT DEFAULT '{}',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (philosopher_id) REFERENCES philosophers (id),
    UNIQUE(user_id, philosopher_id)
  )`);

  // Messages table
  db.run(`CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('user', 'philosopher')),
    content TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations (id)
  )`);
});

// API Routes

// Get all philosophers
app.get('/api/philosophers', (req, res) => {
  db.all('SELECT * FROM philosophers ORDER BY id', (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get philosopher by ID
app.get('/api/philosophers/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM philosophers WHERE id = ?', [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Philosopher not found' });
      return;
    }
    res.json(row);
  });
});

// Create or get user
app.post('/api/users', (req, res) => {
  const { username, email } = req.body;
  
  db.get('SELECT * FROM users WHERE username = ? OR email = ?', [username, email], (err, existingUser) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (existingUser) {
      res.json(existingUser);
      return;
    }
    
    db.run('INSERT INTO users (username, email) VALUES (?, ?)', [username, email], function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID, username, email });
    });
  });
});

// Create a match
app.post('/api/matches', (req, res) => {
  const { user_id, philosopher_id } = req.body;
  
  db.run('INSERT OR IGNORE INTO matches (user_id, philosopher_id) VALUES (?, ?)', 
    [user_id, philosopher_id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    // Create conversation if match is new
    if (this.changes > 0) {
      db.run('INSERT OR IGNORE INTO conversations (user_id, philosopher_id) VALUES (?, ?)', 
        [user_id, philosopher_id], (err) => {
        if (err) {
          console.error('Error creating conversation:', err);
        }
      });
    }
    
    res.json({ success: true, matched: this.changes > 0 });
  });
});

// Get user's matches
app.get('/api/users/:userId/matches', (req, res) => {
  const { userId } = req.params;
  
  db.all(`
    SELECT p.*, m.matched_at 
    FROM matches m 
    JOIN philosophers p ON m.philosopher_id = p.id 
    WHERE m.user_id = ? 
    ORDER BY m.matched_at DESC
  `, [userId], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get conversation
app.get('/api/conversations/:userId/:philosopherId', (req, res) => {
  const { userId, philosopherId } = req.params;
  
  db.get(`
    SELECT * FROM conversations 
    WHERE user_id = ? AND philosopher_id = ?
  `, [userId, philosopherId], (err, conversation) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    
    // Get messages for this conversation
    db.all(`
      SELECT * FROM messages 
      WHERE conversation_id = ? 
      ORDER BY timestamp ASC
    `, [conversation.id], (err, messages) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      res.json({ ...conversation, messages });
    });
  });
});

// Send message
app.post('/api/messages', (req, res) => {
  const { conversation_id, sender_type, content } = req.body;
  
  db.run('INSERT INTO messages (conversation_id, sender_type, content) VALUES (?, ?, ?)', 
    [conversation_id, sender_type, content], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    res.json({ id: this.lastID, conversation_id, sender_type, content });
  });
});

// Update conversation state
app.put('/api/conversations/:id', (req, res) => {
  const { id } = req.params;
  const { conversation_state } = req.body;
  
  db.run('UPDATE conversations SET conversation_state = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
    [JSON.stringify(conversation_state), id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    res.json({ success: true });
  });
});

// Chat endpoint - sends message to Ollama and gets philosopher response
app.post('/api/chat', async (req, res) => {
  const { user_id, philosopher_id, message } = req.body;
  
  if (!user_id || !philosopher_id || !message) {
    res.status(400).json({ error: 'Missing required fields: user_id, philosopher_id, message' });
    return;
  }

  try {
    // Get philosopher info
    const philosopher = await new Promise((resolve, reject) => {
      db.get('SELECT * FROM philosophers WHERE id = ?', [philosopher_id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!philosopher) {
      res.status(404).json({ error: 'Philosopher not found' });
      return;
    }

    // Get or create conversation
    let conversation = await new Promise((resolve, reject) => {
      db.get(`
        SELECT * FROM conversations 
        WHERE user_id = ? AND philosopher_id = ?
      `, [user_id, philosopher_id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (!conversation) {
      const insertId = await new Promise((resolve, reject) => {
        db.run('INSERT INTO conversations (user_id, philosopher_id) VALUES (?, ?)', 
          [user_id, philosopher_id], function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        });
      });
      
      conversation = await new Promise((resolve, reject) => {
        db.get('SELECT * FROM conversations WHERE id = ?', [insertId], (err, row) => {
          if (err) reject(err);
          else resolve(row);
        });
      });
    }

    // Get conversation history
    const historyMessages = await new Promise((resolve, reject) => {
      db.all(`
        SELECT * FROM messages 
        WHERE conversation_id = ? 
        ORDER BY timestamp ASC
      `, [conversation.id], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });

    // Save user message
    await new Promise((resolve, reject) => {
      db.run('INSERT INTO messages (conversation_id, sender_type, content) VALUES (?, ?, ?)', 
        [conversation.id, 'user', message], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });

    // Build system prompt with philosopher personality
    const themesList = philosopher.themes ? philosopher.themes.split(',').join(', ') : '';
    const systemPrompt = `You are ${philosopher.name} and you must respond in first person as if you are on a dating app. ${philosopher.bio}

Your tagline: "${philosopher.tagline}"

Your philosophical themes: ${themesList}

Respond as ${philosopher.name} would. Opt for brevity in your response. Stay in character, be authentic to their philosophical style, and engage in a meaningful conversation. Keep responses conversational and engaging, as if you're chatting on a dating app. Be thoughtful but not overly formal. Always opt for concise responses.`;

    // Format messages for Ollama API
    const ollamaMessages = [];
    
    // Add system message
    ollamaMessages.push({
      role: 'system',
      content: systemPrompt
    });

    // Add conversation history
    historyMessages.forEach(msg => {
      ollamaMessages.push({
        role: msg.sender_type === 'user' ? 'user' : 'assistant',
        content: msg.content
      });
    });

    // Add current user message
    ollamaMessages.push({
      role: 'user',
      content: message
    });

    // Call Ollama API
    let philosopherResponse;
    try {
      const ollamaResponse = await axios.post('http://localhost:11434/api/chat', {
        model: 'gemma3:4b',
        messages: ollamaMessages,
        stream: false
      }, {
        headers: {
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      });

      // Extract response content - Ollama API returns { message: { content: ... } }
      philosopherResponse = ollamaResponse.data.message?.content || ollamaResponse.data.response;
      
      if (!philosopherResponse) {
        console.error('Unexpected Ollama response format:', ollamaResponse.data);
        philosopherResponse = 'I apologize, but I seem to have lost my train of thought.';
      }
    } catch (ollamaError) {
      console.error('Error calling Ollama API:', ollamaError.message);
      if (ollamaError.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to Ollama. Please ensure Ollama is running on http://localhost:11434');
      }
      throw new Error(`Ollama API error: ${ollamaError.message}`);
    }

    // Save philosopher response
    await new Promise((resolve, reject) => {
      db.run('INSERT INTO messages (conversation_id, sender_type, content) VALUES (?, ?, ?)', 
        [conversation.id, 'philosopher', philosopherResponse], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });

    // Update conversation timestamp
    db.run('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
      [conversation.id], () => {});

    res.json({ 
      message: philosopherResponse,
      conversation_id: conversation.id
    });

  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ 
      error: 'Failed to process chat message',
      details: error.message 
    });
  }
});

// Seed philosophers data
const seedPhilosophers = () => {
  const philosophers = [
    {
      name: 'Friedrich Nietzsche',
      bio: 'God is dead, but leg day isn\'t. Philosopher, poet, proto-gym bro. Into eternal recurrence and heavy squats.',
      tagline: 'Looking for someone who dares to stare into the abyss with me.',
      themes: 'existentialism,will to power,eternal recurrence',
      avatar: 'nietzsche.png'
    },
    {
      name: 'Plato',
      bio: 'Founder of the Academy. Believes in ideal forms and probably your ideal form too 😉.',
      tagline: 'Looking for someone to leave the cave with.',
      themes: 'idealism,forms,knowledge',
      avatar: 'plato.png'
    },
    {
      name: 'Confucius',
      bio: 'Ancient wisdom, family values, and etiquette… but make it flirty. Swipe right for harmony.',
      tagline: 'The gentleman seeks harmony, not uniformity.',
      themes: 'ethics,harmony,virtue',
      avatar: 'confucius.png'
    },
    {
      name: 'Søren Kierkegaard',
      bio: 'Melancholic Dane, inventor of existential dread. Loves long walks, deep thoughts, and probably ghosting you.',
      tagline: 'Anxiety is the dizziness of freedom.',
      themes: 'existentialism,anxiety,faith',
      avatar: 'kierkegaard.png'
    },
    {
      name: 'Simone de Beauvoir',
      bio: 'Writer, feminist, existentialist. Drinks black coffee, dismantles patriarchy, and maybe your excuses too.',
      tagline: 'One is not born, but rather becomes, a match.',
      themes: 'feminism,existentialism,freedom',
      avatar: 'beauvoir.png'
    }
  ];

  philosophers.forEach(philosopher => {
    db.run('INSERT OR IGNORE INTO philosophers (name, bio, tagline, themes, avatar) VALUES (?, ?, ?, ?, ?)', 
      [philosopher.name, philosopher.bio, philosopher.tagline, philosopher.themes, philosopher.avatar]);
  });
};

// Seed the database
seedPhilosophers();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      console.error(err.message);
    }
    console.log('Database connection closed.');
    process.exit(0);
  });
});
