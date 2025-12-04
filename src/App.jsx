import React from 'react';
import { Terminal } from 'lucide-react';

function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
        <Terminal className="w-16 h-16 mx-auto text-blue-600 mb-4" />
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          Simulador Ingesis v3.0
        </h1>
        <p className="text-gray-600 mb-6">
          El entorno está listo. Por favor, pega el código del simulador en <code>src/App.jsx</code>.
        </p>
        <div className="bg-gray-100 p-4 rounded text-left text-sm font-mono text-gray-700">
          // Tu código va aquí
        </div>
      </div>
    </div>
  );
}

export default App;