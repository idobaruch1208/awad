import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { withRetry } from '@/lib/retry';

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { topic, context } = await request.json() as { topic: string; context?: string };

    try {
        const hfKey = process.env.HUGGINGFACE_API_KEY;
        if (!hfKey) {
            return NextResponse.json(
                { error: 'Image generation not configured — add HUGGINGFACE_API_KEY to .env.local' },
                { status: 503 }
            );
        }

        const prompt = context
            ? `${context}. Professional LinkedIn image, corporate modern design, blue and white, business style.`
            : `Professional LinkedIn image about: ${topic}. Corporate, clean, modern, blue and white, no text.`;

        const imageUrl = await withRetry(async () => {
            const response = await fetch(
                'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${hfKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ inputs: prompt }),
                }
            );

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`HF API error: ${response.status} — ${text}`);
            }

            const blob = await response.blob();
            const buffer = Buffer.from(await blob.arrayBuffer());
            return `data:image/png;base64,${buffer.toString('base64')}`;
        });

        return NextResponse.json({ imageUrl });
    } catch (error) {
        console.error('[generate-image] Error:', error);
        return NextResponse.json({ error: 'Failed to generate image' }, { status: 500 });
    }
}
