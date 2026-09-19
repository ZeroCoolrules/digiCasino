import { AuthProvider } from './auth/AuthContext';
import { Landing } from './pages/Landing/Landing';
import { Lobby } from './pages/Lobby/Lobby';
import { Login } from './pages/Login/Login';
import { Register } from './pages/Register/Register';
import { Game } from './pages/Game/Game';
import { Transactions } from './pages/Transactions/Transactions';
import { AdminDashboard } from './pages/Admin/AdminDashboard';
import { Profile } from './pages/Profile/Profile';
import { RouterProvider, useRouter } from './router/Router';

const GAME_ROUTE_PREFIX = '/games/';

function Routes() {
  const { path } = useRouter();

  if (path.startsWith(GAME_ROUTE_PREFIX)) {
    const slug = path.slice(GAME_ROUTE_PREFIX.length);
    return <Game slug={slug} />;
  }

  switch (path) {
    case '/lobby':
      return <Lobby />;
    case '/login':
      return <Login />;
    case '/register':
      return <Register />;
    case '/transactions':
      return <Transactions />;
    case '/admin':
      return <AdminDashboard />;
    case '/profile':
      return <Profile />;
    case '/':
    default:
      return <Landing />;
  }
}

export function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <Routes />
      </AuthProvider>
    </RouterProvider>
  );
}

export default App;
