// frontend/app/page.tsx
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';

export default async function RootPage() {
  const session = await getSession();

  if (!session) {
    redirect('/login');
  }

  const rol = (session.rol || '').toUpperCase();

  if (rol.includes('ADMIN')) {
    redirect('/residentes');
  } else if (rol.includes('DIRECTORIO')) {
    redirect('/reportes');
  } else {
    redirect('/mi-cuenta');
  }
}
