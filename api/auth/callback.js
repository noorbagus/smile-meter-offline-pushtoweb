// api/auth/callback.js - Handle OAuth callback and token exchange
export default async function handler(req, res) {
    const { code, state, error } = req.query;
    
    if (error) {
      return res.redirect(`/?error=${encodeURIComponent(error)}`);
    }
  
    if (!code || !state) {
      return res.redirect('/?error=missing_parameters');
    }
  
    try {
      // Validate state (basic validation - in production use proper session)
      const cookies = parseCookies(req.headers.cookie || '');
      if (cookies.oauth_state !== state) {
        return res.redirect('/?error=invalid_state');
      }
  
      // Exchange code for access token
      const tokenResponse = await fetch('https://accounts.snapchat.com/accounts/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${process.env.VITE_SNAPCHAT_CLIENT_ID}:${process.env.VITE_SNAPCHAT_CLIENT_SECRET}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code: code,
          redirect_uri: `${req.headers['x-forwarded-proto'] || 'https'}://${req.headers.host}/api/auth/callback`
        })
      });
  
      if (!tokenResponse.ok) {
        throw new Error(`Token exchange failed: ${tokenResponse.status}`);
      }
  
      const tokenData = await tokenResponse.json();
      
      // Fetch user info
      const userResponse = await fetch('https://kit-api.snapchat.com/v1/me', {
        headers: {
          'Authorization': `Bearer ${tokenData.access_token}`
        }
      });
  
      let userInfo = {};
      if (userResponse.ok) {
        const userData = await userResponse.json();
        userInfo = userData.me || userData;
      }
  
      // Clear state cookie
      res.setHeader('Set-Cookie', 'oauth_state=; HttpOnly; Secure; SameSite=Strict; Max-Age=0');
      
      // Redirect with token and user info
      const params = new URLSearchParams({
        access_token: tokenData.access_token,
        user_info: JSON.stringify(userInfo)
      });
      
      res.redirect(`/?oauth_success=1&${params.toString()}`);
  
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.redirect(`/?error=${encodeURIComponent('authentication_failed')}`);
    }
  }
  
  // Helper function to parse cookies
  function parseCookies(cookieHeader) {
    const cookies = {};
    cookieHeader.split(';').forEach(cookie => {
      const [name, value] = cookie.trim().split('=');
      if (name && value) {
        cookies[name] = decodeURIComponent(value);
      }
    });
    return cookies;
  }