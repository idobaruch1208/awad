import { NextResponse } from 'next/server';

const LINKEDIN_SCOPES = ['w_organization_social', 'rw_organization_admin'].join(' ');

export async function GET() {
    const params = new URLSearchParams({
        response_type: 'code',
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        redirect_uri: process.env.LINKEDIN_REDIRECT_URI!,
        scope: LINKEDIN_SCOPES,
        state: Math.random().toString(36).substring(7),
    });

    return NextResponse.redirect(
        `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`
    );
}
