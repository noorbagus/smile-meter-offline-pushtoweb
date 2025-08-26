const express = require('express');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')));

// OAuth endpoint
app.get('/api/auth/login', async (req, res) => {
  const { code, error } = req.query;
  
  if (error) {
    return res.redirect(`/?error=${error}`);
  }
  
  if (!code) {
    const clientId = process.env.VITE_SNAPCHAT_CLIENT_ID;
    const baseUrl = process.env.VERCEL_URL ? 
      `https://${process.env.VERCEL_URL}` : 
      `${req.protocol}://${req.get('host')}`;
    
    const authUrl = `https://accounts.snapchat.com/accounts/oauth2/auth?${new URLSearchParams({
      client_id: clientId,
      redirect_uri: `${baseUrl}/api/auth/login`,
      response_type: 'code',
      scope: 'user.display_name user.bitmoji.avatar https://auth.snapchat.com/oauth2/api/camkit_lens_push_to_device',
      state: Math.random().toString(36)
    })}`;
    
    return res.redirect(authUrl);
  }
  
  try {
    const tokenData = await exchangeToken(code, req);
    const userInfo = await fetchUser(tokenData.access_token);
    
    const params = new URLSearchParams({
      oauth_success: 'true',
      access_token: tokenData.access_token,
      user_info: JSON.stringify(userInfo)
    });
    
    res.redirect(`/?${params}`);
  } catch (error) {
    res.redirect(`/?error=${encodeURIComponent(error.message)}`);
  }
});

async function exchangeToken(code, req) {
  const clientId = process.env.VITE_SNAPCHAT_CLIENT_ID;
  const clientSecret = process.env.VITE_SNAPCHAT_CLIENT_SECRET;
  const baseUrl = process.env.VERCEL_URL ? 
    `https://${process.env.VERCEL_URL}` : 
    `${req.protocol}://${req.get('host')}`;
  
  const response = await fetch('https://accounts.snapchat.com/accounts/oauth2/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: `${baseUrl}/api/auth/login`,
      client_id: clientId
    })
  });
  
  if (!response.ok) {
    throw new Error(`Token exchange failed: ${response.status}`);
  }
  
  return response.json();
}

async function fetchUser(token) {
  try {
    const response = await fetch('https://kit-api.snapchat.com/v1/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.data?.me;
    }
  } catch (error) {
    console.warn('User fetch failed:', error);
  }
  return null;
}

// Catch all - serve React app
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// For Vercel
if (process.env.VERCEL) {
  module.exports = app;
} else {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}