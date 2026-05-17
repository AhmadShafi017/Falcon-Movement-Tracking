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

  // API Routes
  
  console.log("Checking Oracle environment variables...");
  const user = process.env.ORACLE_USER;
  const pass = process.env.ORACLE_PASSWORD;
  const conn = process.env.ORACLE_CONNECTION_STRING || process.env.ORACLE_CONNECTIONSTRING;

  if (!user) console.warn("WARNING: ORACLE_USER is not set.");
  if (!pass) console.warn("WARNING: ORACLE_PASSWORD is not set.");
  if (!conn) console.warn("WARNING: ORACLE_CONNECTION_STRING is not set.");
  

  if (pass && (pass.startsWith('"') || pass.endsWith('"') || pass.startsWith("'") || pass.endsWith("'"))) {
    console.warn("WARNING: ORACLE_PASSWORD appears to contain quotes. This might lead to ORA-01017 or ORA-28000.");
  }
  
  if (pass && pass.includes('#') && !((pass.startsWith('"') && pass.endsWith('"')) || (pass.startsWith("'") && pass.endsWith("'")))) {
    console.warn("CRITICAL: ORACLE_PASSWORD contains a '#'. In .env files, characters after '#' are treated as comments unless the value is quoted. Use ORACLE_PASSWORD=\"your#pass\".");
  }
  

  // Global flag to prevent hammering the DB if locked
  let lastLockReset: number = 0;
  let cachedLockError: string | null = null;
  
  const dbConfig = {
    user: process.env.ORACLE_USER,
    password: (process.env.ORACLE_PASSWORD || "").trim(),
    connectString: process.env.ORACLE_CONNECTION_STRING || process.env.ORACLE_CONNECTIONSTRING,
    poolMin: 2,
    poolMax: 10,
    poolIncrement: 1
  };

  // Initialize the pool
  let pool: oracledb.Pool | null = null;

  async function getPool() {
    if (pool) return pool;
    
    if (!dbConfig.user || !dbConfig.password || !dbConfig.connectString) {
      throw new Error("Oracle credentials missing in environment. Please check Settings.");
    }

    try {
      console.log(`[DB] INITIALIZING CONNECTION POOL for ${dbConfig.user}...`);
      pool = await oracledb.createPool(dbConfig);
      console.log("[DB] POOL CREATED SUCCESSFULLY.");
      return pool;
    } catch (err: any) {
      console.error("[DB] POOL CREATION FAILED:", err.message);
      if (err.message && (err.message.includes('ORA-28000') || err.message.includes('ORA-01017'))) {
        cachedLockError = err.message;
        lastLockReset = Date.now();
      }
      throw err;
    }
  }

  /**
   * Helper to execute queries using the connection pool
   */
  async function runQuery(sql: string, binds: any = {}, options: any = {}) {
    let connection;
    try {
      const currentPool = await getPool();
      connection = await currentPool.getConnection();
      
      cachedLockError = null; 
      
      const result = await connection.execute(sql, binds, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        autoCommit: true,
        ...options
      });
      
      return result;
    } catch (err: any) {
      if (err.message && (err.message.includes('ORA-28000') || err.message.includes('ORA-01017'))) {
        console.error(`[DB] AUTH ERROR: ${err.message}. Entering cooldown.`);
        cachedLockError = err.message;
        lastLockReset = Date.now();
      }
      throw err;
    } finally {
      if (connection) {
        try {
          await connection.close(); // Returns to pool
        } catch (e) {
          console.error("[DB] Error returning connection to pool:", e);
        }
      }
    }
  }

  function handleOracleError(err: any, res: express.Response, context: string) {
    console.error(`Oracle Error [${context}]:`, err.message);
    
    if (err.message && err.message.includes('ORA-28000')) {
      const user = process.env.ORACLE_USER;
      return res.status(500).json({ 
        status: "unhealthy",
        error: "Database Account Locked", 
        message: err.message,
        instruction: `Run 'ALTER USER ${user} ACCOUNT UNLOCK;' in your database. Also check if ORACLE_PASSWORD in 'Settings' is correct. If it has a '#', wrap it in double quotes.`
      });
    }

    if (err.message && err.message.includes('ORA-01017')) {
       return res.status(401).json({
         error: "Authentication Failed",
         message: "Invalid username/password.",
         instruction: "Check ORACLE_USER and ORACLE_PASSWORD in 'Settings'. If password contains '#', wrap it in double quotes."
       });
    }

    // Default error response
    res.status(500).json({ 
      error: `Database error in ${context}`, 
      message: err.message 
    });
  }

  app.get("/api/health", async (req, res) => {
    try {
      await runQuery("SELECT 1 FROM DUAL");
      
      const user = process.env.ORACLE_USER;
      res.json({ 
        status: "healthy", 
        database: "Oracle Connection Pool", 
        user: user
      });
    } catch (err: any) {
      const errMsg = err.message || String(err);
      console.error('Diagnostic Connection Failed:', errMsg);
      
      const user = process.env.ORACLE_USER || 'unknown';
      res.status(500).json({ 
        status: "unhealthy", 
        error: errMsg,
        locked: errMsg.includes('ORA-28000'),
        instruction: errMsg.includes('ORA-28000') 
          ? `Your Oracle account '${user}' is LOCKED. Run 'ALTER USER ${user} ACCOUNT UNLOCK;' in your database.`
          : "Check your credentials in 'Settings'. Watch out for special characters like '#' in passwords."
      });
    }
  });

  app.post("/api/reset-lock", (req, res) => {
    res.json({ status: "reset", message: "Logic simplified. Cooldowns are disabled." });
  });

  // Specific query for Active Employee detailed location data (Today)
  app.get("/api/active-location/:empId", async (req, res) => {
    const { empId } = req.params;
    try {
      const sql = `
        SELECT
            X.EMP_ID,
            X.EMP_NAME,
            X.EVENT_TIME,
            X.LATITUDE,
            X.LONGITUDE,
            X.SOURCE_TABLE
        FROM
        (
            ----------------------------------------------------------------
            -- ATTENDANCE DATA (TODAY)
            ----------------------------------------------------------------
            SELECT
                E.EMP_ID,
                E.EMP_NAME,
                TO_DATE(
                    TO_CHAR(A.APPLY_DATE, 'DD-MM-YYYY')
                    || ' ' ||
                    TRIM(A.IN_TIME),
                    'DD-MM-YYYY HH:MI AM'
                ) AS EVENT_TIME,
                A.IN_LAT AS LATITUDE,
                A.IN_LONG AS LONGITUDE,
                'ATTEND_MST' AS SOURCE_TABLE
            FROM EMPLOYEE_HIERARCHY E
            JOIN ATTEND_MST A
                ON E.EMP_ID = A.EMP_ID
            WHERE E.STATUS = 'A'
              AND E.EMP_ID = :empId
              AND TRUNC(A.APPLY_DATE) = TRUNC(SYSDATE)

            UNION ALL

            ----------------------------------------------------------------
            -- USER LOCATION DATA (TODAY)
            ----------------------------------------------------------------
            SELECT
                E.EMP_ID,
                E.EMP_NAME,
                U.APPLY_DATE_TIME AS EVENT_TIME,
                U.GEO_LAT AS LATITUDE,
                U.GEO_LONG AS LONGITUDE,
                'USER_LOCATION' AS SOURCE_TABLE
            FROM EMPLOYEE_HIERARCHY E
            JOIN USER_LOCATION U
                ON E.EMP_ID = U.EMP_ID
            WHERE E.STATUS = 'A'
              AND E.EMP_ID = :empId
              AND TRUNC(U.APPLY_DATE_TIME) = TRUNC(SYSDATE)
        ) X

        WHERE EXISTS
        (
            ----------------------------------------------------------------
            -- CHECK LAST LOCATION < 1 HOUR
            ----------------------------------------------------------------
            SELECT 1
            FROM
            (
                SELECT
                    EMP_ID,
                    APPLY_DATE_TIME,
                    ROW_NUMBER() OVER (
                        PARTITION BY EMP_ID
                        ORDER BY APPLY_DATE_TIME DESC
                    ) RN
                FROM USER_LOCATION
                WHERE EMP_ID = :empId
            ) L
            WHERE L.RN = 1
              AND L.APPLY_DATE_TIME >= SYSDATE - (1/24)
        )

        ORDER BY X.EVENT_TIME DESC
      `;
      
      const result = await runQuery(sql, { empId });
      res.json(result);
    } catch (err: any) {
      console.error('Active Location Query Error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Hibernate status check based on latest location
  app.get("/api/hibernate-check/:empId", async (req, res) => {
    const { empId } = req.params;
    try {
      const sql = `
        SELECT EMP_ID,
               APPLY_DATE_TIME AS LAST_LOCATION_TIME,
               GEO_LAT,
               GEO_LONG,
               CASE
                   WHEN APPLY_DATE_TIME >= SYSDATE - (1/24)
                   THEN 'YES - UPDATED IN LAST 1 HOUR'
                   ELSE 'NO - NOT UPDATED IN LAST 1 HOUR'
               END AS LOCATION_STATUS
        FROM (
            SELECT EMP_ID,
                   APPLY_DATE_TIME,
                   GEO_LAT,
                   GEO_LONG,
                   ROW_NUMBER() OVER (
                       PARTITION BY EMP_ID
                       ORDER BY APPLY_DATE_TIME DESC
                   ) AS RN
            FROM USER_LOCATION
            WHERE EMP_ID = :empId
        )
        WHERE RN = 1
      `;
      const result = await runQuery(sql, { empId });
      res.json(result.rows && result.rows.length > 0 ? result.rows[0] : null);
    } catch (err: any) {
      console.error('Hibernate Check Error:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // Get list of employees with level-specific metadata
  app.get("/api/employees", async (req, res) => {
    try {
      const result = await runQuery(
        `SELECT 
          EMP_ID, EMP_NAME, EMP_LEVEL, DIV_CODE,
          NH_CODE, NH_NAME, 
          ZONE_CODE, ZONE_NAME, 
          REGION_CODE, REGION_NAME, 
          AREA_CODE, AREA_NAME, 
          TERR_CODE, TERR_NAME
         FROM EMPLOYEE_HIERARCHY 
         WHERE STATUS = 'A'
         ORDER BY EMP_NAME ASC`
      );

      res.json(result.rows);
    } catch (err: any) {
      if (err.message && (err.message.includes('ORA-28000') || err.message.includes('ORA-01017'))) {
        cachedLockError = err.message;
        lastLockReset = Date.now();
      }
      // Fallback for development/missing tables
      res.json([
        { EMP_ID: '09747', EMP_NAME: 'Md. Nur Alam Siddik', EMP_LEVEL: '6', DIV_CODE: '10', NH_NAME: 'HQ', ZONE_NAME: 'Zone A', REGION_NAME: 'Region 1', AREA_NAME: 'Area X', TERR_NAME: 'Territory 1' },
      ]);
    }
  });

  // Hierarchy structure API
  app.get("/api/hierarchy", async (req, res) => {
    try {
      const result = await runQuery(
        `SELECT DISTINCT NH_CODE, NH_NAME, ZONE_CODE, ZONE_NAME, REGION_CODE, REGION_NAME, AREA_CODE, AREA_NAME, TERR_CODE, TERR_NAME
         FROM EMPLOYEE_HIERARCHY 
         WHERE STATUS = 'A'`
      );
      res.json(result.rows);
    } catch (err) {
      res.json([
        { NH_NAME: 'NH Name 1', ZONE_NAME: 'Zone A', REGION_NAME: 'Region 1', AREA_NAME: 'Area X', TERR_NAME: 'Territory 1' }
      ]);
    }
  });

  // Updated Movement tracking API for single date and joined metadata
  app.get("/api/movement", async (req, res) => {
    const { empId, date } = req.query;

    if (!empId) {
      return res.status(400).json({ error: "Missing empId parameter" });
    }

    try {
      // 1. Get Employee Details first (connects, executes, disconnects)
      const empResult = await runQuery(
        `SELECT EMP_ID, EMP_NAME, EMP_LEVEL, DIV_CODE, NH_NAME, ZONE_NAME, REGION_NAME, AREA_NAME, TERR_NAME
         FROM EMPLOYEE_HIERARCHY 
         WHERE EMP_ID = :id AND STATUS = 'A'`,
        [empId]
      );

      if (!empResult.rows || empResult.rows.length === 0) {
        return res.status(404).json({ error: `Employee ${empId} not found in hierarchy.` });
      }

      const emp: any = empResult.rows[0];

      // 2. Determine Targeted Date
      let targetDateStr = date as string;

      if (!targetDateStr) {
        // (connects, executes, disconnects)
        const latestDateRes = await runQuery(
          `SELECT TO_CHAR(MAX(APPLY_DATE_TIME), 'YYYY-MM-DD') FROM USER_LOCATION WHERE EMP_ID = :id`,
          [empId]
        );
        const rows: any = latestDateRes.rows;
        targetDateStr = (rows && rows.length > 0 && rows[0][0]) ? rows[0][0] : (rows && rows[0] && rows[0]["TO_CHAR(MAX(APPLY_DATE_TIME),'YYYY-MM-DD')"]) || null;
      }

      if (!targetDateStr) {
        return res.status(404).json({ 
          error: "No data available' for this employee", 
          employee: {
            id: emp.EMP_ID,
            name: emp.EMP_NAME,
            level: emp.EMP_LEVEL,
            div: emp.DIV_CODE
          }
        });
      }

      // 3. Fetch movement data using the combined SQL logic provided (connects, executes, disconnects)
      const result = await runQuery(
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
        { id: empId, tDate: targetDateStr }
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

    } catch (err: any) {
      handleOracleError(err, res, "Movement Tracker");
    }
  });

  // Get latest locations for all active employees for global overview with status logic
  app.get("/api/all-latest-locations", async (req, res) => {
    const { date } = req.query;
    const targetDateStr = (date as string) || new Date().toISOString().split('T')[0];

    try {
      // Join Employee, Attendance (Selected Date), and Latest Location (Overall)
      const result = await runQuery(
        `SELECT 
          E.EMP_ID, E.EMP_NAME, E.EMP_LEVEL, E.DIV_CODE,
          E.NH_CODE, E.NH_NAME, E.ZONE_CODE, E.ZONE_NAME, E.REGION_CODE, E.REGION_NAME, E.AREA_CODE, E.AREA_NAME, E.TERR_CODE, E.TERR_NAME,
          A.IN_LAT, A.IN_LONG, A.IN_TIME, A.OUT_LAT, A.OUT_LONG, A.OUT_TIME,
          A.LEAVE_TYPE, A.NOTES,
          NVL(L.GEO_LAT, A.IN_LAT) as GEO_LAT, 
          NVL(L.GEO_LONG, A.IN_LONG) as GEO_LONG, 
          TO_CHAR(NVL(L.SERVER_TIME, A.FULL_IN_TIME), 'YYYY-MM-DD"T"HH24:MI:SS') as SERVER_TIME,
          CASE 
            WHEN A.LEAVE_TYPE IS NOT NULL THEN 'LEAVE'
            WHEN (L.SERVER_TIME IS NOT NULL AND L.SERVER_TIME >= SYSDATE - (1/24)) THEN 'YES - UPDATED IN LAST 1 HOUR'
            WHEN L.SERVER_TIME IS NOT NULL THEN 'NO - NOT UPDATED IN LAST 1 HOUR'
            WHEN A.FULL_IN_TIME IS NOT NULL AND A.FULL_IN_TIME >= SYSDATE - (1/24) THEN 'YES - UPDATED IN LAST 1 HOUR'
            WHEN A.FULL_IN_TIME IS NOT NULL THEN 'NO - NOT UPDATED IN LAST 1 HOUR'
            ELSE 'INACTIVE'
          END as LOCATION_STATUS
         FROM EMPLOYEE_HIERARCHY E
         LEFT JOIN (
           SELECT EMP_ID, IN_LAT, IN_LONG, IN_TIME, OUT_LAT, OUT_LONG, OUT_TIME, LEAVE_TYPE, NOTES,
                  TO_DATE(TO_CHAR(APPLY_DATE, 'DD-MM-YYYY') || ' ' || TRIM(IN_TIME), 'DD-MM-YYYY HH:MI AM') as FULL_IN_TIME,
                  ROW_NUMBER() OVER (PARTITION BY EMP_ID ORDER BY APPLY_DATE DESC, IN_TIME DESC) as rna
           FROM ATTEND_MST
           WHERE TRUNC(APPLY_DATE) = TO_DATE(:tDate, 'YYYY-MM-DD')
         ) A ON E.EMP_ID = A.EMP_ID AND A.rna = 1
         LEFT JOIN (
           SELECT EMP_ID, GEO_LAT, GEO_LONG, APPLY_DATE_TIME as SERVER_TIME,
                  ROW_NUMBER() OVER (PARTITION BY EMP_ID ORDER BY APPLY_DATE_TIME DESC) as rn
           FROM USER_LOCATION
         ) L ON E.EMP_ID = L.EMP_ID AND L.rn = 1
         WHERE E.STATUS = 'A'
         ORDER BY E.EMP_NAME`,
        { tDate: targetDateStr }
      );
      res.json(result.rows);
    } catch (err) {
      // Fallback data for preview/development
      const now = new Date();
      res.json([
        { 
          EMP_ID: '09747', EMP_NAME: 'Md. Nur Alam Siddik', 
          IN_LAT: '25.65085', IN_LONG: '88.77321', IN_TIME: '08:30 AM', 
          OUT_TIME: null, GEO_LAT: 25.65085, GEO_LONG: 88.77321, SERVER_TIME: now.toISOString(), 
          LOCATION_STATUS: 'ACTIVE',
          NH_NAME: 'HQ', ZONE_NAME: 'Zone A', REGION_NAME: 'Region 1', AREA_NAME: 'Area X', TERR_NAME: 'Territory 1' 
        }
      ]);
    }
  });

  // POI (Hospitals and Customers) API
  app.get("/api/poi", async (req, res) => {
    const { minLat, maxLat, minLng, maxLng, selDiv, selNH, selZone, selRegion, selArea, selTerr } = req.query;

    // If no bounds provided, return empty to prevent massive global load
    if (!minLat || !maxLat || !minLng || !maxLng) {
       return res.json([]);
    }

    try {
      const binds: any = {
        minLat: parseFloat(minLat as string),
        maxLat: parseFloat(maxLat as string),
        minLng: parseFloat(minLng as string),
        maxLng: parseFloat(maxLng as string)
      };

      if (isNaN(binds.minLat) || isNaN(binds.maxLat) || isNaN(binds.minLng) || isNaN(binds.maxLng)) {
        return res.json([]);
      }

      let divCondition = "";
      if (selDiv) {
        let dc = "";
        if (selDiv === "GENERAL") dc = "DIV_CODE = '10' AND (EMP_LEVEL IS NULL OR (EMP_LEVEL NOT IN ('7', '12')))";
        else if (selDiv === "ASPIRE") dc = "DIV_CODE = '20'";
        else if (selDiv === "WOMENS_CARE") dc = "DIV_CODE = '60'";
        else if (selDiv === "ONCOLOGY") dc = "DIV_CODE = '30'";
        else if (selDiv === "SERVAY") dc = "DIV_CODE = '10' AND EMP_LEVEL = '12'";
        else if (selDiv === "DERMA") dc = "DIV_CODE = '50'";
        else if (selDiv === "SR") dc = "DIV_CODE = '10' AND EMP_LEVEL = '7'";

        divCondition = `AND TERR_CODE IN (SELECT DISTINCT TERR_CODE FROM EMPLOYEE_HIERARCHY WHERE ${dc})`;
      }

      const hierarchyConditions = [];
      if (selNH) { binds.selNH = selNH; hierarchyConditions.push("AND TERR_CODE IN (SELECT DISTINCT TERR_CODE FROM EMPLOYEE_HIERARCHY WHERE NH_NAME = :selNH)"); }
      if (selZone) { binds.selZone = selZone; hierarchyConditions.push("AND TERR_CODE IN (SELECT DISTINCT TERR_CODE FROM EMPLOYEE_HIERARCHY WHERE ZONE_NAME = :selZone)"); }
      if (selRegion) { binds.selRegion = selRegion; hierarchyConditions.push("AND TERR_CODE IN (SELECT DISTINCT TERR_CODE FROM EMPLOYEE_HIERARCHY WHERE REGION_NAME = :selRegion)"); }
      if (selArea) { binds.selArea = selArea; hierarchyConditions.push("AND TERR_CODE IN (SELECT DISTINCT TERR_CODE FROM EMPLOYEE_HIERARCHY WHERE AREA_NAME = :selArea)"); }
      if (selTerr) { binds.selTerr = selTerr; hierarchyConditions.push("AND TERR_CODE IN (SELECT DISTINCT TERR_CODE FROM EMPLOYEE_HIERARCHY WHERE TERR_NAME = :selTerr)"); }

      const hCond = hierarchyConditions.join(" ");

      const poiSql = `
        SELECT DISTINCT ID, NAME, ADDRESS, LAT, LNG, TYPE FROM (
          SELECT 
            B.CUST_CODE as ID, B.CUST_NAME as NAME, B.CUST_ADDRESS as ADDRESS, 
            B.GEO_LAT as LAT, B.GEO_LONG as LNG, 'CUSTOMER' as TYPE
          FROM CUSTOMER_MASTER B
          WHERE B.GEO_LAT IS NOT NULL AND B.GEO_LAT != 0
            AND B.GEO_LONG IS NOT NULL AND B.GEO_LONG != 0
            ${divCondition} ${hCond}
          
          UNION ALL
          
          SELECT 
            TO_CHAR(A.DR_CODE) as ID, A.CHAMB_NAME as NAME, A.CHAMB_ADDRESS as ADDRESS, 
            A.LAT as LAT, A.LNG as LNG, 'HOSPITAL' as TYPE
          FROM DR_DTL_CHAMB A
          WHERE A.LAT IS NOT NULL AND A.LAT != 0
            AND A.LNG IS NOT NULL AND A.LNG != 0
            ${divCondition} ${hCond}
        ) 
        WHERE LAT BETWEEN :minLat AND :maxLat 
          AND LNG BETWEEN :minLng AND :maxLng
      `;

      console.log(`Executing Bounded POI SQL: Lat(${minLat}-${maxLat}), Lng(${minLng}-${maxLng}), Filters: ${selDiv}`);
      const result = await runQuery(poiSql, binds);
      res.json(result.rows);
    } catch (err) {
      console.error('POI Bounded Error:', err);
      res.json([]);
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
