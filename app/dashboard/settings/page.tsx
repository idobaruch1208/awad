import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getActiveProjectId } from '@/lib/project-context';
import TeamSection from './TeamSection';
import LanguageSelector from './LanguageSelector';

export default async function SettingsPage({
    searchParams,
}: {
    searchParams: Promise<{ linkedin_connected?: string; linkedin_error?: string }>;
}) {
    const supabase = await createClient();
    const params = await searchParams;
    const projectId = await getActiveProjectId();

    const { data: creds } = await supabase
        .from('linkedin_credentials')
        .select('organization_urn, expires_at')
        .single();

    const isConnected = !!creds;
    const isExpired = creds?.expires_at ? new Date(creds.expires_at) < new Date() : false;

    // Fetch team members for current project
    let members: { email: string; role: string; joined_at: string }[] = [];
    if (projectId) {
        const { data: memberships } = await supabase
            .from('project_members')
            .select('user_id, role, joined_at')
            .eq('project_id', projectId);

        if (memberships && memberships.length > 0) {
            // Use service role key to look up user emails from auth.users
            const adminClient = createServiceClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY!
            );
            const { data: { users } } = await adminClient.auth.admin.listUsers();
            const userMap = new Map((users ?? []).map(u => [u.id, u.email ?? u.user_metadata?.full_name ?? 'Unknown']));

            members = memberships.map(m => ({
                email: userMap.get(m.user_id) ?? m.user_id.substring(0, 8) + '...',
                role: m.role,
                joined_at: m.joined_at,
            }));
        }
    }

    return (
        <div className="p-4 sm:p-8 pt-16 md:pt-8 max-w-2xl">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-white">Settings</h1>
                <p className="text-gray-400 text-sm mt-1">Configure your integrations and team</p>
            </div>

            {/* Feedback banners */}
            {params.linkedin_connected && (
                <div className="mb-6 p-4 rounded-xl bg-green-900/40 border border-green-700 text-green-300 text-sm">
                    ✅ LinkedIn successfully connected!
                </div>
            )}
            {params.linkedin_error && (
                <div className="mb-6 p-4 rounded-xl bg-red-900/40 border border-red-700 text-red-300 text-sm">
                    ❌ LinkedIn connection failed: {params.linkedin_error}. Please try again.
                </div>
            )}

            {/* Language Selector */}
            <LanguageSelector />

            {/* Team Card */}
            {projectId && (
                <TeamSection projectId={projectId} members={members} />
            )}

            {/* LinkedIn Card */}
            <div className="glass rounded-2xl p-6 mb-4">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-900/60 border border-blue-700 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                            </svg>
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold text-white">LinkedIn Company Page</h2>
                            <p className="text-xs text-gray-400 mt-0.5">
                                {isConnected
                                    ? isExpired
                                        ? '⚠️ Token expired — please reconnect'
                                        : `✅ Connected${creds.organization_urn ? ` · ${creds.organization_urn}` : ''}`
                                    : 'Not connected'}
                            </p>
                        </div>
                    </div>

                    <Link
                        href="/api/auth/linkedin"
                        className={`btn-${isConnected && !isExpired ? 'secondary' : 'primary'} flex-shrink-0 text-sm px-4 py-2`}
                    >
                        {isConnected && !isExpired ? 'Reconnect' : 'Connect LinkedIn'}
                    </Link>
                </div>

                {!isConnected && (
                    <div className="mt-4 p-3 rounded-lg bg-gray-900 border border-gray-800 text-xs text-gray-400 space-y-1">
                        <p className="font-medium text-gray-300">Setup required:</p>
                        <ol className="list-decimal list-inside space-y-1 text-gray-500">
                            <li>Register your app at <a href="https://developer.linkedin.com" target="_blank" rel="noreferrer" className="text-violet-400 hover:text-violet-300">developer.linkedin.com</a></li>
                            <li>Add <code className="bg-gray-800 px-1 rounded">LINKEDIN_CLIENT_ID</code>, <code className="bg-gray-800 px-1 rounded">CLIENT_SECRET</code>, <code className="bg-gray-800 px-1 rounded">REDIRECT_URI</code> to <code className="bg-gray-800 px-1 rounded">.env.local</code></li>
                            <li>Click Connect LinkedIn above</li>
                        </ol>
                    </div>
                )}
            </div>

            {/* Env Vars Checklist */}
            <div className="glass rounded-2xl p-6">
                <h2 className="text-sm font-semibold text-white mb-4">Environment Variables Checklist</h2>
                <div className="space-y-2 text-xs">
                    {[
                        { key: 'NEXT_PUBLIC_SUPABASE_URL', label: 'Supabase URL' },
                        { key: 'NEXT_PUBLIC_SUPABASE_ANON_KEY', label: 'Supabase Anon Key' },
                        { key: 'GEMINI_API_KEY', label: 'Gemini API Key' },
                        { key: 'PINECONE_API_KEY', label: 'Pinecone API Key' },
                        { key: 'PINECONE_INDEX_NAME', label: 'Pinecone Index Name' },
                        { key: 'HUGGINGFACE_API_KEY', label: 'Hugging Face API Key' },
                        { key: 'LINKEDIN_CLIENT_ID', label: 'LinkedIn Client ID' },
                        { key: 'CRON_SECRET', label: 'Cron Secret' },
                    ].map(({ key, label }) => (
                        <div key={key} className="flex items-center justify-between py-1.5 border-b border-gray-800 last:border-0">
                            <span className="text-gray-400">{label}</span>
                            <code className="text-gray-600 font-mono">{key}</code>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-gray-600 mt-4">Set all keys in <code className="bg-gray-800 px-1 rounded text-gray-500">.env.local</code> and in Vercel Dashboard for production.</p>
            </div>
        </div>
    );
}
