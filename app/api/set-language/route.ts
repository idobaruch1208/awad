import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

const LANGUAGE_COOKIE = 'post_language';

export async function GET() {
    const cookieStore = await cookies();
    const projectId = cookieStore.get('active_project_id')?.value;

    // Try to read from project profile first
    if (projectId) {
        const supabase = await createClient();
        const { data: profile } = await supabase
            .from('project_profiles')
            .select('language')
            .eq('project_id', projectId)
            .single();

        if (profile?.language) {
            return NextResponse.json({ language: profile.language });
        }
    }

    // Fallback to cookie
    const language = cookieStore.get(LANGUAGE_COOKIE)?.value ?? 'en';
    return NextResponse.json({ language });
}

export async function POST(request: Request) {
    const { language } = await request.json();
    if (!language || !['en', 'he'].includes(language)) {
        return NextResponse.json({ error: 'Invalid language' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const projectId = cookieStore.get('active_project_id')?.value;

    // Save to project profile if we have a project
    if (projectId) {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            // Try update, then upsert
            const { data: existing } = await supabase
                .from('project_profiles')
                .select('id')
                .eq('project_id', projectId)
                .single();

            if (existing) {
                await supabase
                    .from('project_profiles')
                    .update({ language })
                    .eq('project_id', projectId);
            } else {
                await supabase
                    .from('project_profiles')
                    .insert({ project_id: projectId, language, onboarding_completed: false });
            }
        }
    }

    // Also update cookie as fallback
    cookieStore.set(LANGUAGE_COOKIE, language, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 365,
    });

    return NextResponse.json({ language });
}
