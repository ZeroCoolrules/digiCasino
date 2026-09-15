import { AuthProvider } from './auth/AuthContext';
import { Landing } from './pages/Landing/Landing';
import { Lobby } from './pages/Lobby/Lobby';
import { Login } from './pages/Login/Login';
import { Register } from './pages/Register/Register';
import { RouterProvider, useRouter } from './router/Router';

function Routes() {
  const { path } = useRouter();

  switch (path) {
    case '/lobby':
      return <Lobby />;
    case '/login':
      return <Login />;
    case '/register':
      return <Register />;
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
