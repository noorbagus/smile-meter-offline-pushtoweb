// api/auth/login.js - Snapchat OAuth callback handler
export default async function handler(req, res) {
  console.log('OAuth callback received:', req.query);
  
  const { code, state, error } = req.query;
  
  // Handle OAuth error
  if (error) {
    console.error('OAuth error:', error);
    return res.redirect(`/?error=${error}`);
  }
  
  // Handle missing code
  if (!code) {
    console.error('No authorization code received');
    return res.redirect('/?error=no_code');
  }
  
  try {
    // Exchange authorization code for access token
    const tokenData = await exchangeCodeForToken(code);
    
    if (!tokenData.access_token) {
      throw new Error('No access token received');
    }
    
    // Fetch user info
    const userInfo = await fetchUserInfo(tokenData.access_token);
    
    console.log('OAuth success:', { 
      token: tokenData.access_token.substring(0, 20) + '...', 
      user: userInfo?.displayName 
    });
    
    // Encode data for URL
    const tokenParam = encodeURIComponent(tokenData.access_token);
    const userParam = encodeURIComponent(JSON.stringify(userInfo));
    
    // Redirect to main app with token
    const redirectUrl = `/?oauth_success=true&access_token=${tokenParam}&user_info=${userParam}`;
    
    return res.redirect(redirectUrl);
    
  } catch (error) {
    console.error('Token exchange failed:', error);
    return res.redirect(`/?error=token_exchange_failed&details=${encodeURIComponent(error.message)}`);
  }
}

async function exchangeCodeForToken(code) {
  const clientId = process.env.VITE_SNAPCHAT_CLIENT_ID;
  const clientSecret = process.env.VITE_SNAPCHAT_CLIENT_SECRET;
  const redirectUri = process.env.VERCEL_URL ? 
    `https://${process.env.VERCEL_URL}/api/auth/login` : 
    `https://smile-meter-offline-pushtoweb.vercel.app/api/auth/login`;
  
  console.log('Token exchange params:', { clientId: !!clientId, clientSecret: !!clientSecret, redirectUri });
  
  if (!clientId || !clientSecret) {
    throw new Error('Missing OAuth credentials');
  }
  
  const tokenUrl = 'https://accounts.snapchat.com/accounts/oauth2/token';
  
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: redirectUri,
      client_id: clientId
    })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Token exchange error:', response.status, errorText);
    throw new Error(`Token exchange failed: ${response.status} ${errorText}`);
  }
  
  return await response.json();
}

async function fetchUserInfo(accessToken) {
  try {
    const response = await fetch('https://kit-api.snapchat.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      console.warn('User info fetch failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data.data?.me || null;
  } catch (error) {
    console.warn('User info fetch error:', error);
    return null;
  }
}