import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { UserModel } from '@/lib/models';
import { createSessionCookie, COOKIE_NAME, COOKIE_OPTS } from '@/lib/session';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/signin?error=${error}`);
  }

  if (!code) {
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/signin?error=no_code`);
  }

  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const REDIRECT_URI = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/auth/google/callback`;

  try {
    // 1. Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID!,
        client_secret: GOOGLE_CLIENT_SECRET!,
        redirect_uri: REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    });

    const { access_token } = await tokenRes.json();

    if (!access_token) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/signin?error=token_exchange_failed`);
    }

    // 2. Fetch user profile from Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const googleUser = await userRes.json();

    if (!googleUser.email) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/signin?error=no_email_returned`);
    }

    await connectDB();

    // 3. Find or Create the user
    let user = await UserModel.findOne({ email: googleUser.email.toLowerCase() });

    if (!user) {
      // Create new user (Sign UP)
      user = await UserModel.create({
        email: googleUser.email.toLowerCase(),
        googleId: googleUser.id,
        avatarUrl: googleUser.picture,
        vaultName: `${googleUser.name?.split(' ')[0]}'s Vault` || 'My Vault',
        // passwordHash is omitted for Google users
      });
    } else {
      // Update existing user (Sign IN)
      user.googleId = googleUser.id;
      if (googleUser.picture) user.avatarUrl = googleUser.picture;
      await user.save();
    }

    // 4. Create Session
    const sessionKey = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64');
    const token = createSessionCookie({
      userId: user._id.toString(),
      email: user.email,
      vaultName: user.vaultName,
      sessionKey,
    });

    const response = NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/`);
    response.cookies.set(COOKIE_NAME, token, COOKIE_OPTS);

    return response;
  } catch (err: unknown) {
    console.error('Google OAuth Error:', err);
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/signin?error=server_error`);
  }
}
