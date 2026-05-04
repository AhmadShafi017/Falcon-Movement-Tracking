import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Mock Database in-memory for the API
  const locations = [
    {
      id: '1',
      name: 'Statue of Liberty',
      lat: 40.6892,
      lng: -74.0445,
      description: 'A colossal neoclassical sculpture on Liberty Island in New York Harbor.',
      category: 'Monument'
    },
    {
      id: '2',
      name: 'Eiffel Tower',
      lat: 48.8584,
      lng: 2.2945,
      description: 'A lattice tower of wrought iron on the Champ de Mars in Paris, France.',
      category: 'Architecture'
    },
    {
      id: '3',
      name: 'Tokyo Tower',
      lat: 35.6586,
      lng: 139.7454,
      description: 'A communications and observation tower in the Minato district of Tokyo, Japan.',
      category: 'Communications'
    },
    {
      id: '4',
      name: 'Sydney Opera House',
      lat: -33.8568,
      lng: 151.2153,
      description: 'A multi-venue performing arts centre in Sydney, Australia.',
      category: 'Arts'
    },
    {
      id: '5',
      name: 'Table Mountain',
      lat: -33.9628,
      lng: 18.4098,
      description: 'A flat-topped mountain forming a prominent landmark overlooking the city of Cape Town.',
      category: 'Nature'
    }
  ];

  // API Routes
  app.get("/api/locations", (req, res) => {
    res.json(locations);
  });

  // Dynamic Lookup API
  app.get("/api/lookup", (req, res) => {
    const { lat, lng, name } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ error: "Missing lat/lng parameters" });
    }
    res.json({
      id: "lookup-" + Date.now(),
      name: (name as string) || "Consulted Coordinate",
      lat: parseFloat(lat as string),
      lng: parseFloat(lng as string),
      description: `Target acquired at ${lat}, ${lng}.`,
      category: "External API"
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
