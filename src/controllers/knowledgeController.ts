import { Request, Response } from 'express';
import { QdrantClient } from '@qdrant/js-client-rest';

const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || '',
  apiKey: process.env.QDRANT_API_KEY || '',
});

const COLLECTION_NAME = process.env.QDRANT_COLLECTION || 'oqta';

export const listDocuments = async (req: Request, res: Response) => {
  try {
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
    const { text, metadata = {} } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text content is required' });
    }

    // Generate a simple embedding (in production, use a proper embedding model)
    // For now, we'll use a placeholder embedding
    const embedding = new Array(384).fill(0).map(() => Math.random());

    const pointId = Date.now().toString();

    await qdrantClient.upsert(COLLECTION_NAME, {
      wait: true,
      points: [
        {
          id: pointId,
          vector: embedding,
          payload: {
            text,
            ...metadata,
            uploadedAt: new Date().toISOString(),
          },
        },
      ],
    });

    res.json({
      success: true,
      documentId: pointId,
      message: 'Document uploaded successfully',
    });
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Failed to upload document to Qdrant' });
  }
};

export const deleteDocument = async (req: Request, res: Response) => {
  try {
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
