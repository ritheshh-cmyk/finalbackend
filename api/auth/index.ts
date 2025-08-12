import express from 'express';
import axios from 'axios';
import { Request, Response } from 'express';

const router = express.Router();

// Dummy authentication middleware for demonstration
function requireAuth(req: Request, res: Response, next: Function) {
  // In a real app, set req.user if authenticated
  if ((req as any).user) {
    next();
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
}

// /auth/login endpoint
router.post('/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  
  // Simple authentication logic (replace with real authentication)
  // Support multiple test accounts with different roles
  let user = null;
  
  if (username === 'admin' && password === 'lucky@777') {
    user = {
      id: 1,
      username: username,
      name: 'Admin User',
      role: 'admin'
    };
  } else if (username === 'testadmin' && password === 'password') {
    user = {
      id: 2,
      username: username,
      name: 'Test Admin',
      role: 'admin'
    };
  } else if (username === 'sravan' && password === 'sravan6565') {
    user = {
      id: 3,
      username: username,
      name: 'Sravan User',
      role: 'admin'
    };
  } else if (username === 'owner' && password === 'owner123') {
    user = {
      id: 4,
      username: username,
      name: 'Owner User',
      role: 'owner'
    };
  } else if (username === 'worker' && password === 'worker123') {
    user = {
      id: 5,
      username: username,
      name: 'Worker User',
      role: 'worker'
    };
  }
  
  if (user) {
    // Generate a simple token (in production, use JWT)
    const token = Buffer.from(`${user.id}:${user.username}:${Date.now()}`).toString('base64');
    
    res.json({
      success: true,
      user: user,
      token: token
    });
  } else {
    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// /auth/me endpoint
router.get('/auth/me', requireAuth, (req: Request, res: Response) => {
  res.json((req as any).user);
});

// /send-sms endpoint
router.post('/send-sms', function(req: Request, res: Response) {
  (async () => {
  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({ error: 'Missing to or message' });
  }
  try {
    const apiKey = process.env.FAST2SMS_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'SMS API key not configured' });
    }
    const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
      route: 'v3',
      numbers: to,
      message,
      sender_id: 'FSTSMS',
      language: 'english'
    }, {
      headers: {
        'authorization': apiKey
      }
    });
    res.json({ success: true, result: response.data });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to send SMS', details: err.message });
  }
  })();
});

export default router;