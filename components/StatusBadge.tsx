import type { PostStatus } from '@/lib/types';

export const statusConfig: Record<PostStatus, { label: string; className: string }> = {
    Draft: { label: 'Draft', className: 'badge-draft' },
    Reviewing: { label: 'Reviewing', className: 'badge-reviewing' },
    Approved: { label: 'Approved', className: 'badge-approved' },
    Scheduled: { label: 'Scheduled', className: 'badge-scheduled' },
    Published: { label: 'Published', className: 'badge-published' },
};

export default function StatusBadge({ status }: { status: PostStatus }) {
    const config = statusConfig[status];
    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}
        >
            {config.label}
        </span>
    );
}
