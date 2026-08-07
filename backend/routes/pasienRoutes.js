import express from 'express';
import { createPasien, getAllPasien, cariPasien } from '../controllers/pasienController.js';

const router = express.Router();

router.post('/', createPasien);
router.get('/cari', cariPasien);
router.get('/', getAllPasien);

export default router;