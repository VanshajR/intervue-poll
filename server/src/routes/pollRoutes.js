import { Router } from 'express';
import { getActivePollState, getPollHistory } from '../controllers/pollController.js';

const router = Router();

router.get('/active', getActivePollState);
router.get('/history', getPollHistory);

export default router;
