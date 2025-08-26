export default async function handler(req, res) {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method not allowed' });
    }
  
    const { refresh_token } = req.body;
  
    if (!refresh_token) {
      return res.status(400).json({ error: 'Refresh token required' });
    }
  
    try {
      const tokenResponse = await fetch('https://accounts.snapchat.com/accounts/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${Buffer.from(`${process.env.VITE_SNAPCHAT_CLIENT_ID}:${process.env.VITE_SNAPCHAT_CLIENT_SECRET}`).toString('base64')}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refresh_token
        })
      });
  
      if (!tokenResponse.ok) {
        throw new Error(`Token refresh failed: ${tokenResponse.status}`);
      }
  
      const tokenData = await tokenResponse.json();
      
      res.json({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in
      });
  
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({ error: 'Token refresh failed' });
    }
  }