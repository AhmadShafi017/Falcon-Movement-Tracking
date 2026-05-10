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

  // Get list of employees with level-specific metadata
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
        `SELECT 
          EMP_ID, EMP_NAME, EMP_LEVEL, DIV_CODE,
          NH_CODE, NH_NAME, 
          ZONE_CODE, ZONE_NAME, 
          REGION_CODE, REGION_NAME, 
          AREA_CODE, AREA_NAME, 
          TERR_CODE, TERR_NAME
         FROM EMPLOYEE_HIERARCHY 
         WHERE STATUS = 'A'
         ORDER BY EMP_NAME ASC`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      res.json(result.rows);
    } catch (err) {
      console.error('Oracle Employees Error:', err);
      // Fallback for development/missing tables
      res.json([
        { EMP_ID: '09747', EMP_NAME: 'Md. Nur Alam Siddik', EMP_LEVEL: '6', DIV_CODE: '10', NH_NAME: 'NH Name 1', ZONE_NAME: 'Zone A', REGION_NAME: 'Region 1', AREA_NAME: 'Area X', TERR_NAME: 'Territory 1' },
        { EMP_ID: '09748', EMP_NAME: 'Arif Ahmed', EMP_LEVEL: '6', DIV_CODE: '10', NH_NAME: 'NH Name 1', ZONE_NAME: 'Zone B', REGION_NAME: 'Region 2', AREA_NAME: 'Area Y', TERR_NAME: 'Territory 2' }
      ]);
    } finally {
      if (connection) {
        try { await connection.close(); } catch (err) { console.error(err); }
      }
    }
  });

  // Hierarchy structure API
  app.get("/api/hierarchy", async (req, res) => {
    let connection;
    try {
      const dbConfig = {
        user: process.env.ORACLE_USER,
        password: process.env.ORACLE_PASSWORD,
        connectString: process.env.ORACLE_CONNECTION_STRING
      };
      if (!dbConfig.user || !dbConfig.password || !dbConfig.connectString) throw new Error();
      connection = await oracledb.getConnection(dbConfig);
      
      const result = await connection.execute(
        `SELECT DISTINCT NH_CODE, NH_NAME, ZONE_CODE, ZONE_NAME, REGION_CODE, REGION_NAME, AREA_CODE, AREA_NAME, TERR_CODE, TERR_NAME
         FROM EMPLOYEE_HIERARCHY 
         WHERE STATUS = 'A'`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      res.json(result.rows);
    } catch (err) {
      res.json([
        { NH_NAME: 'NH Name 1', ZONE_NAME: 'Zone A', REGION_NAME: 'Region 1', AREA_NAME: 'Area X', TERR_NAME: 'Territory 1' },
        { NH_NAME: 'NH Name 1', ZONE_NAME: 'Zone B', REGION_NAME: 'Region 2', AREA_NAME: 'Area Y', TERR_NAME: 'Territory 2' }
      ]);
    } finally {
      if (connection) try { await connection.close(); } catch (e) {}
    }
  });

  // Updated Movement tracking API for single date and joined metadata
  app.get("/api/movement", async (req, res) => {
    const { empId, date } = req.query;

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
        `SELECT EMP_ID, EMP_NAME, EMP_LEVEL, DIV_CODE, NH_NAME, ZONE_NAME, REGION_NAME, AREA_NAME, TERR_NAME
         FROM EMPLOYEE_HIERARCHY 
         WHERE EMP_ID = :id AND STATUS = 'A'`,
        [empId],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (!empResult.rows || empResult.rows.length === 0) {
        return res.status(404).json({ error: `Employee ${empId} not found in hierarchy.` });
      }

      const emp: any = empResult.rows[0];

      // 2. Determine Targeted Date
      let targetDateStr = date as string;

      if (!targetDateStr) {
        const latestDateRes = await connection.execute(
          `SELECT TO_CHAR(MAX(APPLY_DATE_TIME), 'YYYY-MM-DD') FROM USER_LOCATION WHERE EMP_ID = :id`,
          [empId]
        );
        const rows: any = latestDateRes.rows;
        targetDateStr = (rows && rows.length > 0 && rows[0][0]) ? rows[0][0] : null;
      }

      if (!targetDateStr) {
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

      // 3. Fetch movement data using the combined SQL logic provided
      const result = await connection.execute(
        `SELECT TO_CHAR(EVENT_TIME, 'YYYY-MM-DD"T"HH24:MI:SS') as EVENT_TIME, LATITUDE, LONGITUDE, SOURCE, PLACE_NAME FROM (
            -- FIRST ATTENDANCE
            SELECT 
                FIRST_IN_TIME AS EVENT_TIME,
                A.IN_LAT AS LATITUDE,
                A.IN_LONG AS LONGITUDE,
                'ATTEND_MST' AS SOURCE,
                'Attendance In' as PLACE_NAME
            FROM ATTEND_MST A
            CROSS JOIN (
                SELECT MIN(
                    TO_DATE(
                        TO_CHAR(APPLY_DATE,'DD-MM-YYYY')
                        || ' ' ||
                        TRIM(IN_TIME),
                        'DD-MM-YYYY HH:MI AM'
                    )
                ) AS FIRST_IN_TIME
                FROM ATTEND_MST
                WHERE EMP_ID = :id
                  AND TRUNC(APPLY_DATE) = TO_DATE(:tDate, 'YYYY-MM-DD')
            ) X
            WHERE A.EMP_ID = :id
              AND TRUNC(A.APPLY_DATE) = TO_DATE(:tDate, 'YYYY-MM-DD')

            UNION ALL

            -- USER LOCATION AFTER FIRST ATTENDANCE
            SELECT 
                B.APPLY_DATE_TIME AS EVENT_TIME,
                B.GEO_LAT AS LATITUDE,
                B.GEO_LONG AS LONGITUDE,
                'USER_LOCATION' AS SOURCE,
                'Tracked Location' as PLACE_NAME
            FROM USER_LOCATION B
            CROSS JOIN (
                SELECT MIN(
                    TO_DATE(
                        TO_CHAR(APPLY_DATE,'DD-MM-YYYY')
                        || ' ' ||
                        TRIM(IN_TIME),
                        'DD-MM-YYYY HH:MI AM'
                    )
                ) AS FIRST_IN_TIME
                FROM ATTEND_MST
                WHERE EMP_ID = :id
                  AND TRUNC(APPLY_DATE) = TO_DATE(:tDate, 'YYYY-MM-DD')
            ) X
            WHERE B.EMP_ID = :id
              AND B.APPLY_DATE_TIME >= X.FIRST_IN_TIME
              AND TRUNC(B.APPLY_DATE_TIME) = TO_DATE(:tDate, 'YYYY-MM-DD')

            UNION ALL

            -- LAST ATTENDANCE (OUT)
            SELECT 
                LAST_OUT_TIME AS EVENT_TIME,
                A.OUT_LAT AS LATITUDE,
                A.OUT_LONG AS LONGITUDE,
                'ATTEND_MST_OUT' AS SOURCE,
                'Attendance Out' as PLACE_NAME
            FROM ATTEND_MST A
            CROSS JOIN (
                SELECT MAX(
                    TO_DATE(
                        TO_CHAR(APPLY_DATE,'DD-MM-YYYY')
                        || ' ' ||
                        TRIM(OUT_TIME),
                        'DD-MM-YYYY HH:MI AM'
                    )
                ) AS LAST_OUT_TIME
                FROM ATTEND_MST
                WHERE EMP_ID = :id
                  AND TRUNC(APPLY_DATE) = TO_DATE(:tDate, 'YYYY-MM-DD')
                  AND OUT_TIME IS NOT NULL
            ) X
            WHERE A.EMP_ID = :id
              AND TRUNC(A.APPLY_DATE) = TO_DATE(:tDate, 'YYYY-MM-DD')
              AND A.OUT_TIME IS NOT NULL
        )
        ORDER BY EVENT_TIME DESC`,
        { id: empId, tDate: targetDateStr },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const history = (result.rows as any[]).map(row => ({
        lat: parseFloat(row.LATITUDE),
        lng: parseFloat(row.LONGITUDE),
        time: row.EVENT_TIME,
        name: row.PLACE_NAME,
        source: row.SOURCE
      }));

      res.json({
        id: emp.EMP_ID,
        name: emp.EMP_NAME,
        level: emp.EMP_LEVEL,
        div: emp.DIV_CODE,
        nhName: emp.NH_NAME,
        zoneName: emp.ZONE_NAME,
        regionName: emp.REGION_NAME,
        areaName: emp.AREA_NAME,
        territoryName: emp.TERR_NAME,
        history: history,
        targetDate: targetDateStr,
        current: history[0] || null,
        start: history[history.length - 1] || null,
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

  // Get latest locations for all active employees for global overview with status logic
  app.get("/api/all-latest-locations", async (req, res) => {
    const { date } = req.query;
    const targetDateStr = (date as string) || new Date().toISOString().split('T')[0];

    let connection;
    try {
      const dbConfig = {
        user: process.env.ORACLE_USER,
        password: process.env.ORACLE_PASSWORD,
        connectString: process.env.ORACLE_CONNECTION_STRING
      };
      if (!dbConfig.user || !dbConfig.password || !dbConfig.connectString) throw new Error("Credentials mission");
      connection = await oracledb.getConnection(dbConfig);
      
      // Join Employee, Attendance (Selected Date), and Latest Location (Selected Date)
      const result = await connection.execute(
        `SELECT 
          E.EMP_ID, E.EMP_NAME, E.NH_NAME, E.ZONE_NAME, E.REGION_NAME, E.AREA_NAME, E.TERR_NAME,
          A.IN_LAT, A.IN_LONG, A.IN_TIME, A.OUT_LAT, A.OUT_LONG, A.OUT_TIME,
          L.GEO_LAT, L.GEO_LONG, TO_CHAR(L.SERVER_TIME, 'YYYY-MM-DD"T"HH24:MI:SS') as SERVER_TIME
         FROM EMPLOYEE_HIERARCHY E
         JOIN (
           SELECT EMP_ID, IN_LAT, IN_LONG, IN_TIME, OUT_LAT, OUT_LONG, OUT_TIME,
                  ROW_NUMBER() OVER (PARTITION BY EMP_ID ORDER BY APPLY_DATE DESC, IN_TIME DESC) as rna
           FROM ATTEND_MST
           WHERE TRUNC(APPLY_DATE) = TO_DATE(:tDate, 'YYYY-MM-DD')
         ) A ON E.EMP_ID = A.EMP_ID AND A.rna = 1
         LEFT JOIN (
           SELECT EMP_ID, GEO_LAT, GEO_LONG, APPLY_DATE_TIME as SERVER_TIME,
                  ROW_NUMBER() OVER (PARTITION BY EMP_ID ORDER BY APPLY_DATE_TIME DESC) as rn
           FROM USER_LOCATION
           WHERE TRUNC(APPLY_DATE_TIME) = TO_DATE(:tDate, 'YYYY-MM-DD')
         ) L ON E.EMP_ID = L.EMP_ID AND L.rn = 1
         WHERE E.STATUS = 'A'
         ORDER BY E.EMP_ID`,
        { tDate: targetDateStr },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      res.json(result.rows);
    } catch (err) {
      // Fallback data for preview/development
      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 120 * 60000).toISOString();
      
      res.json([
        { 
          EMP_ID: '09747', EMP_NAME: 'Md. Nur Alam Siddik', 
          IN_LAT: '25.65085', IN_LONG: '88.77321', IN_TIME: '08:30 AM', 
          OUT_TIME: null, GEO_LAT: 25.65085, GEO_LONG: 88.77321, SERVER_TIME: now.toISOString(), 
          NH_NAME: 'HQ', ZONE_NAME: 'Zone A', REGION_NAME: 'Region 1', AREA_NAME: 'Area X', TERR_NAME: 'Territory 1' 
        },
        { 
          EMP_ID: '09748', EMP_NAME: 'Arif Ahmed', 
          IN_LAT: '25.65500', IN_LONG: '88.78000', IN_TIME: '09:00 AM', 
          OUT_TIME: null, GEO_LAT: 25.65500, GEO_LONG: 88.78000, SERVER_TIME: twoHoursAgo, 
          NH_NAME: 'HQ', ZONE_NAME: 'Zone B', REGION_NAME: 'Region 2', AREA_NAME: 'Area Y', TERR_NAME: 'Territory 2' 
        },
        { 
          EMP_ID: '09749', EMP_NAME: 'Out for Day User', 
          IN_LAT: '25.66000', IN_LONG: '88.79000', IN_TIME: '07:00 AM', 
          OUT_TIME: '05:00 PM', GEO_LAT: 25.66000, GEO_LONG: 88.79000, SERVER_TIME: now.toISOString(), 
          NH_NAME: 'HQ', ZONE_NAME: 'Zone C', REGION_NAME: 'Region 3', AREA_NAME: 'Area Z', TERR_NAME: 'Territory 3' 
        }
      ]);
    } finally {
      if (connection) try { await connection.close(); } catch (e) {}
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
