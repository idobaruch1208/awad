import { Pinecone } from '@pinecone-database/pinecone';

const pinecone = new Pinecone({
    apiKey: process.env.PINECONE_API_KEY!,
});

function getIndex() {
    return pinecone.index(process.env.PINECONE_INDEX_NAME!);
}

export type VectorNamespace = 'approved_posts' | 'style_lessons';

/**
 * Upsert a vector into the specified namespace.
 */
export async function upsert(
    id: string,
    values: number[],
    namespace: VectorNamespace,
    metadata?: Record<string, string>
) {
    const index = getIndex();
    // Pinecone SDK v3: upsert() takes UpsertOptions with a `records` array
    await (index.namespace(namespace) as unknown as { upsert: (v: unknown) => Promise<void> })
        .upsert([{ id, values, metadata: metadata ?? {} }]);
}

/**
 * Query the specified namespace for the top-k most similar vectors.
 * Returns an array of metadata objects for each match.
 */
export async function query(
    values: number[],
    namespace: VectorNamespace,
    topK: number
): Promise<Array<Record<string, string>>> {
    const index = getIndex();
    const result = await index.namespace(namespace).query({
        vector: values,
        topK,
        includeMetadata: true,
    });

    return (result.matches || []).map(
        (match) => (match.metadata as Record<string, string>) || {}
    );
}
