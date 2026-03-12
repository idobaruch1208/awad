// Shared TypeScript types for the AWAD AI Content Engine

export type PostStatus = 'Draft' | 'Reviewing' | 'Approved' | 'Scheduled' | 'Published';

export interface Post {
    id: string;
    user_id: string;
    project_id: string | null;
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

export interface Project {
    id: string;
    name: string;
    owner_id: string;
    created_at: string;
}

export interface ExamplePost {
    text: string;
    source?: string;
}

export interface ProjectProfile {
    id: string;
    project_id: string;
    company_name: string | null;
    industry: string | null;
    target_audience: string | null;
    content_goals: string | null;
    brand_voice: string | null;
    example_posts: ExamplePost[];
    ai_analysis: Record<string, unknown> | null;
    onboarding_completed: boolean;
    created_at: string;
    updated_at: string;
}

export interface ProjectMember {
    id: string;
    project_id: string;
    user_id: string;
    role: 'owner' | 'member';
    joined_at: string;
}

export interface Invite {
    id: string;
    project_id: string;
    token: string;
    created_by: string;
    created_at: string;
    expires_at: string;
}

export interface LinkedInCredentials {
    id: string;
    organization_urn: string;
    access_token: string;
    refresh_token: string | null;
    expires_at: string | null;
}

