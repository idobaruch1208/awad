import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

async function publishToLinkedIn(
    access_token: string,
    organization_urn: string,
    text: string,
    imageUrl: string | null
): Promise<string> {
    // Build UGC post payload
    const payload: Record<string, unknown> = {
        author: `urn:li:organization:${organization_urn.replace('urn:li:organization:', '')}`,
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

    const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${access_token}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0',
        },
        body: JSON.stringify(payload),
    });

    if (!response.ok) {
        const text = await response.text();
        throw new Error(`LinkedIn API error ${response.status}: ${text}`);
    }

    const data = await response.json() as { id: string };
    return data.id;
}

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { postId } = await request.json() as { postId: string };
    if (!postId) return NextResponse.json({ error: 'postId is required' }, { status: 400 });

    // Fetch the post
    const { data: post, error: postError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();

    if (postError || !post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

    // Fetch LinkedIn credentials
    const { data: creds } = await supabase
        .from('linkedin_credentials')
        .select('*')
        .single();

    if (!creds) {
        return NextResponse.json(
            { error: 'LinkedIn not connected. Go to Settings and connect your LinkedIn account.' },
            { status: 400 }
        );
    }

    try {
        const linkedinPostId = await publishToLinkedIn(
            creds.access_token,
            creds.organization_urn,
            post.final_text ?? post.original_draft ?? '',
            post.image_url
        );

        // Update Supabase
        await supabase
            .from('posts')
            .update({
                status: 'Published',
                published_at: new Date().toISOString(),
                linkedin_post_id: linkedinPostId,
            })
            .eq('id', postId);

        return NextResponse.json({ success: true, linkedinPostId });
    } catch (error) {
        console.error('[publish-to-linkedin] Error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to publish to LinkedIn' },
            { status: 500 }
        );
    }
}
