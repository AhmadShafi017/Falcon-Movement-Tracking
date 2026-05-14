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
  let isPoolInitializing = false;

  async function getDbPool() {
    const poolAlias = 'default';
    try {
      return oracledb.getPool(poolAlias);
    } catch (e) {
      // Pool doesn't exist, need to create it
      if (isPoolInitializing) {
        // Wait a bit if someone else is already initializing
        await new Promise(resolve => setTimeout(resolve, 2000));
        try { return oracledb.getPool(poolAlias); } catch (e2) {}
      }

      // Check if we are in a cooldown from a previous ORA-01017 or ORA-28000
      if (cachedLockError && (Date.now() - lastLockReset < 10000)) {
         throw new Error(cachedLockError);
      }

      const dbConfig = {
        user: process.env.ORACLE_USER,
        password: (process.env.ORACLE_PASSWORD || "").trim(),
        connectString: process.env.ORACLE_CONNECTION_STRING || process.env.ORACLE_CONNECTIONSTRING,
        poolAlias: poolAlias,
        poolMin: 1,
        poolMax: 10,
        poolIncrement: 1,
        poolTimeout: 60
      };

      if (!dbConfig.user || !dbConfig.password || !dbConfig.connectString) {
        throw new Error("Oracle credentials missing in environment.");
      }

      isPoolInitializing = true;
      try {
        console.log(`[POOL] Initializing connection pool for user: ${dbConfig.user}...`);
        const pool = await oracledb.createPool(dbConfig);
        console.log(`[POOL] Successfully initialized pool '${poolAlias}'.`);
        cachedLockError = null; 
        return pool;
      } catch (err: any) {
        if (err.message && (err.message.includes('ORA-28000') || err.message.includes('ORA-01017'))) {
          cachedLockError = err.message;
          lastLockReset = Date.now();
        }
        throw err;
      } finally {
        isPoolInitializing = false;
      }
    }
  }

  async function getDbConnection() {
    const pool = await getDbPool();
    return await pool.getConnection();
  }

 async function checkLockProtection() {
  if (
    cachedLockError &&
    (Date.now() - lastLockReset < 15000)
  ) {
    const user = process.env.ORACLE_USER;
    const isLock = cachedLockError.includes("ORA-28000");

    return {
      blocked: true,
      response: {
        status: "unhealthy",
        error: isLock
          ? "Database account is currently LOCKED."
          : "Invalid Credentials - Cooling Down.",
        locked: isLock,
        instruction: isLock
          ? `The Oracle account '${user}' is locked. Run: ALTER USER ${user} ACCOUNT UNLOCK;`
          : `Invalid credentials detected. Check ORACLE_PASSWORD. If password contains #, wrap in quotes.`
      }
    };
  }

  return {
    blocked: false,
    response: null
  };
}

  function handleOracleError(err: any, res: express.Response, context: string) {
    console.error(`Oracle Error [${context}]:`, err.message);
    
    if (err.message && err.message.includes('ORA-28000')) {
      cachedLockError = err.message;
      lastLockReset = Date.now();
      
      const user = process.env.ORACLE_USER;
      return res.status(500).json({ 
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
    const lock = await checkLockProtection();

if (lock.blocked) {
  return res.status(503).json(lock.response);
}

    let connection;
    try {
      connection = await getDbConnection();
      
      // Test 1: Simple Dual check
      await connection.execute("SELECT 1 FROM DUAL");
      
      // Test 2: Fetch 1 actual row from Hierarchy to confirm permissions
      let sampleData = null;
      try {
        const result = await connection.execute(
          "SELECT EMP_ID, EMP_NAME FROM EMPLOYEE_HIERARCHY FETCH FIRST 1 ROWS ONLY",
          [],
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        if (result.rows && result.rows.length > 0) {
          sampleData = result.rows[0];
        }
      } catch (tableErr) {
        console.warn("Hierarchy table test failed, but connection is alive:", tableErr);
      }

      const user = process.env.ORACLE_USER;
      res.json({ 
        status: "healthy", 
        database: "Oracle connected via Pool", 
        user: user,
        sample: sampleData || "No data in EMPLOYEE_HIERARCHY yet"
      });
    } catch (err: any) {
      console.error('Diagnostic Connection Failed:', err.message);
      
      if (err.message.includes('ORA-28000')) {
        cachedLockError = err.message;
        lastLockReset = Date.now();
      }

      const user = process.env.ORACLE_USER;
      res.status(500).json({ 
        status: "unhealthy", 
        error: err.message,
        code: err.errorNum || (err.message && err.message.match(/ORA-(\d+)/)?.[1]),
        advice: err.message.includes('ORA-28000') 
          ? `CRITICAL ERROR: Your Oracle account '${user}' is LOCKED.
             
TO FIX THIS:
1. Connect to your database as SYSTEM or a DBA user.
2. Run this SQL command: 
   ALTER USER ${user} ACCOUNT UNLOCK;
3. Double-check your ORACLE_PASSWORD in the 'Settings' menu. If it contains a '#' or other special characters, wrap it in double quotes: "your#password"
4. Wait 30 seconds before trying again to avoid triggering the lock again.`
          : err.message.includes('ORA-01017')
            ? `Invalid credentials. IMPORTANT: If your password has a '#', you MUST wrap it in double quotes in 'Settings': ORACLE_PASSWORD="your#pass"`
            : "Check your credentials in the 'Settings' menu."
      });
    } finally {
      if (connection) {
        try { await connection.close(); } catch (e) {}
      }
    }
  });

  app.get("/api/locations", (req, res) => {
    res.json(locations);
  });

  // Get list of employees with level-specific metadata
  app.get("/api/employees", async (req, res) => {
    const lock = await checkLockProtection();

if (lock.blocked) {
  return res.json([
    {
      EMP_ID: '09747',
      EMP_NAME: 'Md. Nur Alam Siddik',
      EMP_LEVEL: '6',
      DIV_CODE: '10',
      NH_NAME: 'HQ',
      ZONE_NAME: 'Zone A',
      REGION_NAME: 'Region 1',
      AREA_NAME: 'Area X',
      TERR_NAME: 'Territory 1'
    }
  ]);
}

    let connection;
    try {
      connection = await getDbConnection();
      cachedLockError = null; // Success!
      
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
    } catch (err: any) {
      if (err.message && err.message.includes('ORA-28000')) {
        cachedLockError = err.message;
        lastLockReset = Date.now();
      }
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
      connection = await getDbConnection();
      
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

    const lock = await checkLockProtection();

if (lock.blocked) {
  return res.status(503).json(lock.response);
}

    let connection;
    try {
      connection = await getDbConnection();
      cachedLockError = null;

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

    } catch (err: any) {
      handleOracleError(err, res, "Movement Tracker");
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

    const lock = await checkLockProtection();

if (lock.blocked) {
  const now = new Date();

  return res.json([
    {
      EMP_ID: '09747',
      EMP_NAME: 'Md. Nur Alam Siddik',
      IN_LAT: '25.65085',
      IN_LONG: '88.77321',
      IN_TIME: '08:30 AM',
      OUT_TIME: null,
      GEO_LAT: 25.65085,
      GEO_LONG: 88.77321,
      SERVER_TIME: now.toISOString(),
      NH_NAME: 'HQ',
      ZONE_NAME: 'Zone A',
      REGION_NAME: 'Region 1',
      AREA_NAME: 'Area X',
      TERR_NAME: 'Territory 1'
    }
  ]);
}

    let connection;
    try {
      connection = await getDbConnection();
      cachedLockError = null;
      
      // Join Employee, Attendance (Selected Date), and Latest Location (Selected Date)
      const result = await connection.execute(
        `SELECT 
          E.EMP_ID, E.EMP_NAME, E.EMP_LEVEL, E.DIV_CODE,
          E.NH_CODE, E.NH_NAME, E.ZONE_CODE, E.ZONE_NAME, E.REGION_CODE, E.REGION_NAME, E.AREA_CODE, E.AREA_NAME, E.TERR_CODE, E.TERR_NAME,
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

  // POI (Hospitals and Customers) API
  app.get("/api/poi", async (req, res) => {
    const { minLat, maxLat, minLng, maxLng, selDiv, selNH, selZone, selRegion, selArea, selTerr } = req.query;

    const lock = await checkLockProtection();
    if (lock.blocked) {
      return res.json([]);
    }

    // If no bounds provided, return empty to prevent massive global load
    if (!minLat || !maxLat || !minLng || !maxLng) {
       return res.json([]);
    }

    let connection;
    try {
      connection = await getDbConnection();
      cachedLockError = null;
      
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

      console.log(`Executing Bounded POI SQL: Lat(${minLat}-${maxLat}), Lng(${minLng}-${maxLng}), Filters: ${selDiv}, ${selNH}, ${selZone}`);
      const result = await connection.execute(poiSql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      res.json(result.rows);
    } catch (err) {
      console.error('POI Bounded Error:', err);
      res.json([]);
    } finally {
      if (connection) {
        try { await connection.close(); } catch (e) {}
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
