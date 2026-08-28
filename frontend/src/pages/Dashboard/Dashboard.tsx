import { useAuth } from '../../context/AuthContext';

export function Dashboard() {
  const { usuario, logout } = useAuth();

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <header className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">
          Sistema de Administración Edificio XYZ
        </h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-600">
            {usuario?.correo} ({usuario?.rol})
          </span>
          <button
            onClick={logout}
            className="rounded bg-slate-800 px-3 py-1.5 text-sm text-white hover:bg-slate-700"
          >
            Cerrar sesión
          </button>
        </div>
      </header>

      <div className="rounded-lg bg-white p-6 shadow-sm">
        <p className="text-slate-600">
          Dashboard placeholder — aquí empieza el trabajo del equipo de frontend.
        </p>
      </div>
    </div>
  );
}
