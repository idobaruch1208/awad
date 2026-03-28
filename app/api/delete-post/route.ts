import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { postId } = await request.json() as { postId: string };
        if (!postId) {
            return NextResponse.json({ error: 'Missing postId' }, { status: 400 });
        }

        // Fetch the post to check ownership, and also the project to check if user is admin
        const { data: post, error: fetchError } = await supabase
            .from('posts')
            .select('user_id, project_id')
            .eq('id', postId)
            .single();

        if (fetchError || !post) {
            return NextResponse.json({ error: 'Post not found' }, { status: 404 });
        }

        // Rule: Creator OR Admin
        let isAuthorized = false;
        
        if (post.user_id === user.id) {
            isAuthorized = true; // Creator
        } else {
            // Check if user is an admin of the project
            const { data: membership } = await supabase
                .from('project_members')
                .select('role')
                .eq('project_id', post.project_id)
                .eq('user_id', user.id)
                .single();
                
            if (membership && (membership.role === 'admin' || membership.role === 'owner')) {
                isAuthorized = true;
            }
        }

        if (!isAuthorized) {
            return NextResponse.json({ error: 'Only the creator or an admin can delete a post' }, { status: 403 });
        }

        // Initialize admin client to bypass RLS for soft-delete
        const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
        const supabaseAdmin = createSupabaseClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Soft-delete the post
        const { error: updateError, data: updateData } = await supabaseAdmin
            .from('posts')
            .update({ is_archived: true, updated_at: new Date().toISOString() })
            .eq('id', postId)
            .select();

        if (updateError) {
            console.error('Error soft-deleting post:', updateError);
            return NextResponse.json({ error: updateError.message }, { status: 500 });
        }
        
        if (!updateData || updateData.length === 0) {
            return NextResponse.json({ error: 'Post could not be updated.' }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        console.error('API Error:', e);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
