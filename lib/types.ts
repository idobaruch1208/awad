// Shared TypeScript types for the AWAD AI Content Engine

export type PostStatus = 'Draft' | 'Reviewing' | 'Approved' | 'Scheduled' | 'Published';

export interface Post {
    id: string;
    user_id: string;
    topic: string;
    original_draft: string | null;
    final_text: string | null;
    image_url: string | null;
    status: PostStatus;
    target_timestamp: string | null;
    published_at: string | null;
    linkedin_post_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface LinkedInCredentials {
    id: string;
    organization_urn: string;
    access_token: string;
    refresh_token: string | null;
    expires_at: string | null;
}
