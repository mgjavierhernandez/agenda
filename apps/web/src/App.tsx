import { APP_NAME, API_PREFIX } from '@agenda/shared';

function App() {
  return (
    <main className="app">
      <h1>{APP_NAME}</h1>
      <p className="tagline">Plataforma SaaS de gestion y comunicacion escolar</p>
      <small className="meta">API base: {API_PREFIX}</small>
    </main>
  );
}

export default App;
