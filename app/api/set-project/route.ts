import { NextResponse } from 'next/server';
import { setActiveProjectId } from '@/lib/project-context';

export async function POST(request: Request) {
    const { projectId } = await request.json();
    if (!projectId) {
        return NextResponse.json({ error: 'projectId is required' }, { status: 400 });
    }

    await setActiveProjectId(projectId);
    return NextResponse.json({ ok: true });
}
