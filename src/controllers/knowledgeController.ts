import { Request, Response } from 'express';
import { QdrantClient } from '@qdrant/js-client-rest';
import { randomUUID } from 'crypto';

// Validate Qdrant configuration
const qdrantUrl = process.env.QDRANT_URL;
const qdrantApiKey = process.env.QDRANT_API_KEY;

if (!qdrantUrl || !qdrantApiKey) {
  console.error('QDRANT_URL and QDRANT_API_KEY environment variables must be set');
}

const qdrantClient = qdrantUrl && qdrantApiKey ? new QdrantClient({
  url: qdrantUrl,
  apiKey: qdrantApiKey,
}) : null;

const COLLECTION_NAME = process.env.QDRANT_COLLECTION || 'oqta';

// Helper function to chunk text into smaller pieces
function chunkText(text: string, chunkSize: number = 500): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentLength = 0;

  for (const word of words) {
    if (currentLength + word.length > chunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.join(' '));
      currentChunk = [word];
      currentLength = word.length;
    } else {
      currentChunk.push(word);
      currentLength += word.length + 1;
    }
  }

  if (currentChunk.length > 0) {
    chunks.push(currentChunk.join(' '));
  }

  return chunks.length > 0 ? chunks : [text];
}

export const listDocuments = async (req: Request, res: Response) => {
  try {
    if (!qdrantClient) {
      return res.status(500).json({ error: 'Qdrant is not configured. Please set QDRANT_URL and QDRANT_API_KEY environment variables.' });
    }

    const { limit = 100, offset = 0 } = req.query;

    const result = await qdrantClient.scroll(COLLECTION_NAME, {
      limit: Number(limit),
      offset: Number(offset),
      with_payload: true,
      with_vector: false,
    });

    res.json({
      documents: result.points.map(point => ({
        id: point.id,
        payload: point.payload,
      })),
      nextOffset: result.next_page_offset,
    });
  } catch (error) {
    console.error('List documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents from Qdrant' });
  }
};

export const uploadDocument = async (req: Request, res: Response) => {
  try {
    if (!qdrantClient) {
      return res.status(500).json({ error: 'Qdrant is not configured. Please set QDRANT_URL and QDRANT_API_KEY environment variables.' });
    }

    let text: string;
    let filename: string;
    let metadata: any = {};

    // Check if file was uploaded
    if (req.file) {
      // File upload via multipart/form-data
      filename = req.file.originalname;
      text = req.file.buffer.toString('utf-8');
      
      // Parse metadata from form data
      if (req.body.metadata) {
        try {
          metadata = JSON.parse(req.body.metadata);
        } catch (e) {
          metadata = {};
        }
      }
      
      console.log(`File uploaded: ${filename}, size: ${req.file.size} bytes`);
    } else {
      // JSON payload
      const body = req.body;
      text = body.text;
      filename = body.filename || 'document.txt';
      metadata = body.metadata || {};

      if (!text) {
        return res.status(400).json({ error: 'Text content or file is required' });
      }
    }

    // Chunk the text for better vector search
    const chunks = chunkText(text, 500);
    
    console.log(`Processing document: ${filename}, chunks: ${chunks.length}`);

    // NOTE: This uses a placeholder embedding with random values.
    // For production use, replace this with a proper embedding model such as:
    // - OpenAI embeddings API (text-embedding-3-small, 1536 dimensions)
    // - Sentence Transformers (all-MiniLM-L6-v2, 384 dimensions)
    // - Cohere embeddings (embed-english-v3.0, 1024 dimensions)
    // - Google's Universal Sentence Encoder (512 dimensions)
    // The embedding dimension must match your Qdrant collection configuration.
    console.warn('WARNING: Using placeholder random embeddings. Replace with a proper embedding model for production use.');
    
    // Get collection info to determine vector size
    let vectorSize = 3072; // Default to 3072 (OpenAI text-embedding-3-large)
    try {
      const collectionInfo = await qdrantClient.getCollection(COLLECTION_NAME);
      if (collectionInfo.config?.params?.vectors) {
        const vectorConfig = collectionInfo.config.params.vectors;
        if (typeof vectorConfig === 'object' && 'size' in vectorConfig) {
          vectorSize = (vectorConfig as any).size;
        }
      }
      console.log(`Using vector size: ${vectorSize} (from collection config)`);
    } catch (err) {
      console.warn(`Could not get collection info, using default vector size: ${vectorSize}`);
    }

    // Upload each chunk as a separate point
    const uploadedIds: string[] = [];
    const points = chunks.map((chunk, index) => {
      const pointId = randomUUID(); // Use UUID instead of timestamp
      uploadedIds.push(pointId);
      
      return {
        id: pointId,
        vector: new Array(vectorSize).fill(0).map(() => Math.random()),
        payload: {
          text: chunk,
          filename,
          chunkIndex: index,
          totalChunks: chunks.length,
          ...metadata,
          uploadedAt: new Date().toISOString(),
        },
      };
    });

    await qdrantClient.upsert(COLLECTION_NAME, {
      wait: true,
      points,
    });

    res.json({
      success: true,
      documentIds: uploadedIds,
      chunksUploaded: chunks.length,
      filename,
      message: `Document uploaded successfully in ${chunks.length} chunk(s)`,
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ 
      error: 'Failed to upload document to Qdrant',
      details: error instanceof Error ? error.message : String(error)
    });
  }
};

export const deleteDocument = async (req: Request, res: Response) => {
  try {
    if (!qdrantClient) {
      return res.status(500).json({ error: 'Qdrant is not configured. Please set QDRANT_URL and QDRANT_API_KEY environment variables.' });
    }

    const { id } = req.params;

    await qdrantClient.delete(COLLECTION_NAME, {
      wait: true,
      points: [id],
    });

    res.json({
      success: true,
      message: 'Document deleted successfully',
    });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Failed to delete document from Qdrant' });
  }
};
