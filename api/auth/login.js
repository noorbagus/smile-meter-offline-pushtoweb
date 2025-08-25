// api/auth/login.js - Snapchat OAuth initiation
export default function handler(req, res) {
    const clientId = process.env.VITE_SNAPCHAT_CLIENT_ID;
    
    if (!clientId) {
      return res.status(500).json({ error: 'Client ID not configured' });
    }
  
    // Generate state for CSRF protection
    const state = Buffer.from(Math.random().toString()).toString('base64').substring(0, 16);
    
    // Store state in session or return to frontend
    const authUrl = `https://accounts.snapchat.com/accounts/oauth2/auth?${new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/auth/callback`,
      response_type: 'code',
      scope: [
        'user.display_name',
        'user.bitmoji.avatar', 
        'user.external_id',
        'https://auth.snapchat.com/oauth2/api/camkit_lens_push_to_device'
      ].join(' '),
      state: state
    })}`;
    
    // Set state cookie for validation
    res.setHeader('Set-Cookie', `oauth_state=${state}; HttpOnly; Secure; SameSite=Strict; Max-Age=600`);
    res.redirect(authUrl);
  }