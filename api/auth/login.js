// api/auth/login.js - Redirect ke Snapchat OAuth
export default async function handler(req, res) {
  const clientId = process.env.VITE_SNAPCHAT_CLIENT_ID;
  const redirectUri = process.env.VITE_SNAPCHAT_REDIRECT_URI || 
    `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/auth/callback`;
  
  // Generate state untuk security
  const state = Buffer.from(Math.random().toString()).toString('base64').substring(0, 12);
  
  // Store state in cookie
  res.setHeader('Set-Cookie', `oauth_state=${state}; HttpOnly; SameSite=Lax; Path=/`);
  
  const authUrl = new URL('https://accounts.snapchat.com/accounts/oauth2/auth');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('scope', 'user.display_name user.bitmoji.avatar https://auth.snapchat.com/oauth2/api/camkit_lens_push_to_device');
  authUrl.searchParams.set('state', state);
  
  res.redirect(authUrl.toString());
}

// api/auth/callback.js - Handle OAuth callback
export default async function handler(req, res) {
  const { code, state, error } = req.query;
  const cookies = req.headers.cookie || '';
  const storedState = cookies.match(/oauth_state=([^;]*)/)?.[1];
  
  if (error) {
    return res.redirect(`/?error=${encodeURIComponent(error)}`);
  }
  
  if (!code || !state || state !== storedState) {
    return res.redirect('/?error=invalid_request');
  }
  
  try {
    // Exchange code for token
    const tokenResponse = await fetch('https://accounts.snapchat.com/accounts/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(
          `${process.env.VITE_SNAPCHAT_CLIENT_ID}:${process.env.VITE_SNAPCHAT_CLIENT_SECRET}`
        ).toString('base64')}`
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: process.env.VITE_SNAPCHAT_REDIRECT_URI ||
          `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/auth/callback`,
        client_id: process.env.VITE_SNAPCHAT_CLIENT_ID
      })
    });
    
    const tokenData = await tokenResponse.json();
    
    if (!tokenData.access_token) {
      throw new Error('No access token received');
    }
    
    // Fetch user profile
    const profileResponse = await fetch('https://kit-api.snapchat.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`
      }
    });
    
    let userInfo = null;
    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      userInfo = profileData.data?.me;
    }
    
    // Redirect back with token and user info
    const redirectUrl = new URL('/', `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}`);
    redirectUrl.searchParams.set('oauth_success', '1');
    redirectUrl.searchParams.set('access_token', tokenData.access_token);
    if (userInfo) {
      redirectUrl.searchParams.set('user_info', encodeURIComponent(JSON.stringify(userInfo)));
    }
    
    res.redirect(redirectUrl.toString());
    
  } catch (error) {
    console.error('OAuth error:', error);
    res.redirect(`/?error=auth_failed`);
  }
}