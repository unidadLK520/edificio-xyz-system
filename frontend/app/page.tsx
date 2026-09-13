import { redirect } from 'next/navigation';

export default function RootPage() {
  // Redirigir siempre al portal de login
  redirect('/login');
}
