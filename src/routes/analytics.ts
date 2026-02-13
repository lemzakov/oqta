import { Router } from 'express';

const router = Router();

// Get analytics configuration
router.get('/config', (req, res) => {
  res.json({
    yandexMetrikaId: process.env.YANDEX_METRIKA_ID || '',
    gaMeasurementId: process.env.GA_MEASUREMENT_ID || ''
  });
});

export default router;
