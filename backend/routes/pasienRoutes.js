import express from 'express';
import { createPasien, getAllPasien } from '../controllers/pasienController.js';

const router = express.Router();

router.post('/', createPasien);
router.get('/', getAllPasien);

export default router;