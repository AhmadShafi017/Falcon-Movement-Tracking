import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import oracledb from "oracledb";

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

  // Get list of employees from hierarchy
  app.get("/api/employees", async (req, res) => {
    let connection;
    try {
      const dbConfig = {
        user: process.env.ORACLE_USER,
        password: process.env.ORACLE_PASSWORD,
        connectString: process.env.ORACLE_CONNECTION_STRING
      };
      if (!dbConfig.user || !dbConfig.password || !dbConfig.connectString) {
        throw new Error("Oracle credentials missing.");
      }
      connection = await oracledb.getConnection(dbConfig);
      
      const result = await connection.execute(
        `SELECT EMP_ID, EMP_NAME, EMP_LEVEL, DIV_CODE 
         FROM EMPLOYEE_HIERARCHY 
         WHERE STATUS = 'A' OR STATUS IS NULL
         ORDER BY EMP_NAME ASC`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      res.json(result.rows);
    } catch (err) {
      console.error('Oracle Employees Error:', err);
      res.status(500).json({ error: "Failed to fetch employee list" });
    } finally {
      if (connection) {
        try { await connection.close(); } catch (err) { console.error(err); }
      }
    }
  });

  // Updated Movement tracking API for date ranges and joined metadata
  app.get("/api/movement", async (req, res) => {
    const { empId, startDate, endDate } = req.query;

    if (!empId) {
      return res.status(400).json({ error: "Missing empId parameter" });
    }

    let connection;
    try {
      const dbConfig = {
        user: process.env.ORACLE_USER,
        password: process.env.ORACLE_PASSWORD,
        connectString: process.env.ORACLE_CONNECTION_STRING
      };

      if (!dbConfig.user || !dbConfig.password || !dbConfig.connectString) {
        throw new Error("Oracle credentials not found.");
      }

      connection = await oracledb.getConnection(dbConfig);

      // 1. Get Employee Details first
      const empResult = await connection.execute(
        `SELECT EMP_ID, EMP_NAME, EMP_LEVEL, DIV_CODE, TERR_NAME, AREA_NAME, AM_NAME
         FROM EMPLOYEE_HIERARCHY 
         WHERE EMP_ID = :id`,
        [empId],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (!empResult.rows || empResult.rows.length === 0) {
        return res.status(404).json({ error: `Employee ${empId} not found in hierarchy.` });
      }

      const emp: any = empResult.rows[0];

      // 2. Determine Date Range
      // Default to latest date if no range provided
      let sDate = startDate as string;
      let eDate = endDate as string || sDate;

      if (!sDate) {
        const latestDateRes = await connection.execute(
          `SELECT TO_CHAR(MAX(APPLY_DATE_TIME), 'YYYY-MM-DD') FROM USER_LOCATION WHERE EMP_ID = :id`,
          [empId]
        );
        const rows: any = latestDateRes.rows;
        sDate = (rows && rows.length > 0 && rows[0][0]) ? rows[0][0] : null;
        eDate = sDate;
      }

      if (!sDate) {
        return res.status(404).json({ 
          error: "No data available of this employee", 
          employee: {
            id: emp.EMP_ID,
            name: emp.EMP_NAME,
            level: emp.EMP_LEVEL,
            div: emp.DIV_CODE
          }
        });
      }

      // 3. Fetch movement data using the join logic requested
      const result = await connection.execute(
        `SELECT B.GEO_LAT, B.GEO_LONG, B.APPLY_DATE_TIME, B.REMARKS 
         FROM USER_LOCATION B
         WHERE B.EMP_ID = :id 
         AND B.APPLY_DATE_TIME >= TO_DATE(:sDate, 'YYYY-MM-DD')
         AND B.APPLY_DATE_TIME < TO_DATE(:eDate, 'YYYY-MM-DD') + 1
         ORDER BY B.APPLY_DATE_TIME DESC`,
        { id: empId, sDate: sDate, eDate: eDate },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const history = (result.rows as any[]).map(row => ({
        lat: parseFloat(row.GEO_LAT),
        lng: parseFloat(row.GEO_LONG),
        time: row.APPLY_DATE_TIME,
        remarks: row.REMARKS
      }));

      res.json({
        id: emp.EMP_ID,
        name: emp.EMP_NAME,
        level: emp.EMP_LEVEL,
        div: emp.DIV_CODE,
        territory: emp.TERR_NAME,
        area: emp.AREA_NAME,
        manager: emp.AM_NAME,
        history: history,
        startDate: sDate,
        endDate: eDate,
        current: history[0],
        start: history[history.length - 1],
      });

    } catch (err) {
      console.error('Oracle DB Error:', err);
      res.status(500).json({ error: "Database Connectivity Error", message: err instanceof Error ? err.message : String(err) });
    } finally {
      if (connection) {
        try { await connection.close(); } catch (err) { console.error(err); }
      }
    }
  });

  // Dynamic Lookup API (for testing without DB)
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
