import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error || !code) {
        return NextResponse.redirect(`${origin}/dashboard/settings?linkedin_error=access_denied`);
    }

    try {
        // Exchange code for tokens
        const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                code,
                redirect_uri: process.env.LINKEDIN_REDIRECT_URI!,
                client_id: process.env.LINKEDIN_CLIENT_ID!,
                client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
            }),
        });

        if (!tokenRes.ok) throw new Error('Token exchange failed');
        const tokens = await tokenRes.json() as {
            access_token: string;
            expires_in: number;
            refresh_token?: string;
        };

        // Fetch organization URN
        const orgRes = await fetch(
            'https://api.linkedin.com/v2/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organization~()))',
            {
                headers: {
                    Authorization: `Bearer ${tokens.access_token}`,
                    'X-Restli-Protocol-Version': '2.0.0',
                },
            }
        );

        let organizationUrn = process.env.LINKEDIN_ORGANIZATION_URN ?? '';
        if (orgRes.ok) {
            const orgData = await orgRes.json() as { elements?: Array<{ organization: string }> };
            if (orgData.elements?.[0]?.organization) {
                organizationUrn = orgData.elements[0].organization;
            }
        }

        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

        // Upsert credentials using service role (bypass RLS)
        const supabase = await createClient();
        await supabase.from('linkedin_credentials').upsert({
            organization_urn: organizationUrn,
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token ?? null,
            expires_at: expiresAt,
        });

        return NextResponse.redirect(`${origin}/dashboard/settings?linkedin_connected=true`);
    } catch (err) {
        console.error('[linkedin/callback] Error:', err);
        return NextResponse.redirect(`${origin}/dashboard/settings?linkedin_error=callback_failed`);
    }
}
