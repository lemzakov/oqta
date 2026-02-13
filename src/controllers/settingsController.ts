import { Request, Response } from 'express';
import prisma from '../utils/prisma.js';

export const getSettings = async (req: Request, res: Response) => {
  try {
    const settings = await prisma.setting.findMany();
    
    const settingsMap: Record<string, string> = {};
    settings.forEach((setting) => {
      settingsMap[setting.key] = setting.value;
    });

    res.json(settingsMap);
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
};

export const getPublicSettings = async (req: Request, res: Response) => {
  try {
    const settingsMap: Record<string, string> = {};
    
    // Try to fetch database settings but don't fail if database is unavailable
    try {
      const publicKeys = ['phone_number', 'whatsapp_number'];
      const settings = await prisma.setting.findMany({
        where: {
          key: {
            in: publicKeys
          }
        }
      });
      
      settings.forEach((setting) => {
        settingsMap[setting.key] = setting.value;
      });
    } catch (dbError) {
      // Log database error but continue to return analytics config
      console.warn('Database unavailable for public settings, returning analytics only:', dbError);
    }

    // Always include analytics configuration from environment variables
    settingsMap['yandexMetrikaId'] = process.env.YANDEX_METRIKA_ID || '';
    settingsMap['gaMeasurementId'] = process.env.GA_MEASUREMENT_ID || '';

    res.json(settingsMap);
  } catch (error) {
    console.error('Get public settings error:', error);
    res.status(500).json({ error: 'Failed to fetch public settings' });
  }
};

export const updateSetting = async (req: Request, res: Response) => {
  try {
    const { key, value } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({ error: 'Key and value are required' });
    }

    const setting = await prisma.setting.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    res.json({ success: true, setting });
  } catch (error) {
    console.error('Update setting error:', error);
    res.status(500).json({ error: 'Failed to update setting' });
  }
};

export const updateSettings = async (req: Request, res: Response) => {
  try {
    const settings = req.body;

    const updates = await Promise.all(
      Object.entries(settings).map(([key, value]) =>
        prisma.setting.upsert({
          where: { key },
          update: { value: value as string },
          create: { key, value: value as string },
        })
      )
    );

    res.json({ success: true, updated: updates.length });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
};
