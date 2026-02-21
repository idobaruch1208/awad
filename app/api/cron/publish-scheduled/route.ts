import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function publishPost(
    supabase: Awaited<ReturnType<typeof createClient>>,
    post: { id: string; final_text: string | null; original_draft: string | null; image_url: string | null },
    creds: { access_token: string; organization_urn: string }
) {
    const text = post.final_text ?? post.original_draft ?? '';
    const payload = {
        author: `urn:li:organization:${creds.organization_urn.replace('urn:li:organization:', '')}`,
        lifecycleState: 'PUBLISHED',
        specificContent: {
            'com.linkedin.ugc.ShareContent': {
                shareCommentary: { text },
                shareMediaCategory: 'NONE',
            },
        },
        visibility: {
            'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
        },
    };

    const res = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${creds.access_token}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`LinkedIn API error ${res.status}`);
    const data = await res.json() as { id: string };

    await supabase.from('posts').update({
        status: 'Published',
        published_at: new Date().toISOString(),
        linkedin_post_id: data.id,
    }).eq('id', post.id);

    return data.id;
}

export async function POST(request: NextRequest) {
    // Validate cron secret
    const authHeader = request.headers.get('authorization');
    const expected = `Bearer ${process.env.CRON_SECRET}`;
    if (authHeader !== expected) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = await createClient();

    // Get LinkedIn credentials
    const { data: creds } = await supabase
        .from('linkedin_credentials')
        .select('*')
        .single();

    if (!creds) {
        return NextResponse.json({ error: 'No LinkedIn credentials configured' }, { status: 400 });
    }

    // Get all due scheduled posts
    const { data: posts } = await supabase
        .from('posts')
        .select('*')
        .eq('status', 'Scheduled')
        .lte('target_timestamp', new Date().toISOString());

    if (!posts?.length) {
        return NextResponse.json({ processed: 0, message: 'No scheduled posts due' });
    }

    const results = await Promise.allSettled(
        posts.map((post) => publishPost(supabase, post, creds))
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log(`[cron] Processed ${posts.length} posts: ${succeeded} success, ${failed} failed`);
    return NextResponse.json({ processed: posts.length, succeeded, failed });
}
