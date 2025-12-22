import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

export const getFreeZones = async (req: Request, res: Response) => {
  try {
    const freeZones = await prisma.freeZoneIntegration.findMany({
      orderBy: { name: 'asc' },
    });

    res.json({ freeZones });
  } catch (error) {
    console.error('Get free zones error:', error);
    res.status(500).json({ error: 'Failed to fetch free zones' });
  }
};

export const getFreeZone = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const freeZone = await prisma.freeZoneIntegration.findUnique({
      where: { id },
    });

    if (!freeZone) {
      return res.status(404).json({ error: 'Free zone integration not found' });
    }

    res.json(freeZone);
  } catch (error) {
    console.error('Get free zone error:', error);
    res.status(500).json({ error: 'Failed to fetch free zone' });
  }
};

export const createFreeZone = async (req: Request, res: Response) => {
  try {
    const { name, code, apiEndpoint, apiKey, isActive, config } = req.body;

    if (!name || !code) {
      return res.status(400).json({ error: 'Name and code are required' });
    }

    const freeZone = await prisma.freeZoneIntegration.create({
      data: {
        name,
        code: code.toLowerCase(),
        apiEndpoint,
        apiKey,
        isActive: isActive || false,
        config: config || {},
      },
    });

    res.json(freeZone);
  } catch (error) {
    console.error('Create free zone error:', error);
    res.status(500).json({ error: 'Failed to create free zone integration' });
  }
};

export const updateFreeZone = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, code, apiEndpoint, apiKey, isActive, config } = req.body;

    const freeZone = await prisma.freeZoneIntegration.update({
      where: { id },
      data: {
        name,
        code: code?.toLowerCase(),
        apiEndpoint,
        apiKey,
        isActive,
        config,
      },
    });

    res.json(freeZone);
  } catch (error) {
    console.error('Update free zone error:', error);
    res.status(500).json({ error: 'Failed to update free zone integration' });
  }
};

export const deleteFreeZone = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.freeZoneIntegration.delete({
      where: { id },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Delete free zone error:', error);
    res.status(500).json({ error: 'Failed to delete free zone integration' });
  }
};
