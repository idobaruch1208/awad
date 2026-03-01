import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const LANGUAGE_COOKIE = 'post_language';

export async function GET() {
    const cookieStore = await cookies();
    const language = cookieStore.get(LANGUAGE_COOKIE)?.value ?? 'en';
    return NextResponse.json({ language });
}

export async function POST(request: Request) {
    const { language } = await request.json();
    if (!language || !['en', 'he'].includes(language)) {
        return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
    }

    const cookieStore = await cookies();
    cookieStore.set(LANGUAGE_COOKIE, language, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
    });

    return NextResponse.json({ language });
}
