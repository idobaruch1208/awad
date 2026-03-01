import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { withRetry } from '@/lib/retry';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(request: NextRequest) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { currentText, instruction } = await request.json() as {
        currentText: string;
        instruction: string;
    };

    if (!currentText?.trim() || !instruction?.trim()) {
        return NextResponse.json({ error: 'currentText and instruction are required' }, { status: 400 });
    }

    try {
        const refinedText = await withRetry(async () => {
            const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
            const prompt = `You are editing a LinkedIn post for AWAD, an Israeli startup law firm.

Current post:
"""
${currentText}
"""

User instruction: "${instruction}"

Apply the instruction to the post while maintaining AWAD's professional brand voice.
Return ONLY the revised post content, no preamble or explanation.`;

            const result = await model.generateContent(prompt);
            return result.response.text().trim();
        });

        return NextResponse.json({ refinedText });
    } catch (error) {
        console.error('[refine-draft] Error:', error);
        return NextResponse.json({ error: 'Failed to refine draft' }, { status: 500 });
    }
}
