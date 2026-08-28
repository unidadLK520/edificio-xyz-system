import { Request, Response } from 'express';
import { AuthService } from '../services/auth.service.js';

export const loginController = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'El email y la contraseña son obligatorios' });
      return;
    }

    const data = await AuthService.login(email, password);
    res.json({ message: 'Login exitoso', ...data });
  } catch (error: any) {
    res.status(401).json({ error: error.message || 'Error en la autenticación' });
  }
};