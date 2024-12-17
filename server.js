const express = require('express');
const sql = require('mssql');
const cors = require('cors');

const app = express();

const config={
    user:"final",
    password:"1234",
    server:"DESKTOP-COULINQ\\SQLEXPRESS",
    database:"Talopai",
    options:{
        trustServerCertificate: true,
    },
    port: 1433,
};

async function connectToDB() {
    try {
      const pool = await sql.connect(config);
      console.log("成功連接資料庫");
      return pool;
    } catch (err) {
      console.error('資料庫連接失敗:', err.message);
      throw err;
    }
  }
  
  // 查詢
async function testQuery() {
    try {
      const pool = await connectToDB();
    } catch (err) {
      console.error('測試查詢失敗:', err.message);
    }
  }

app.use(cors());
app.use(express.json());

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'ngrok-skip-browser-warning'],
}));

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// 創建帳號
app.post('/api/SignUp', async (req, res) => {
  const { email, password } = req.body;

  // 驗證欄位是否完整
  if (!email || !password) {
    return res.status(400).json({ error: '所有欄位均為必填' });
  }

  // 驗證 Email 格式
  if (!emailRegex.test(email)) {
    return res.status(400).json({ error: '無效的 Email 格式' });
  }

  try {
    const pool = await connectToDB();

    // 檢查 email 是否已存在
    const checkQuery = `SELECT COUNT(*) AS count FROM Member WHERE Email = @Email`;
    const checkResult = await pool.request()
      .input('Email', sql.VarChar, email)
      .query(checkQuery);

    if (checkResult.recordset[0].count > 0) {
      return res.status(400).json({ error: 'Email 已被註冊' });
    }

    // 插入新帳號
    const insertQuery = `
      INSERT INTO Member (Email, Password)
      VALUES (@Email, @Password)
    `;
    await pool.request()
      .input('Email', sql.VarChar, email)
      .input('Password', sql.VarChar, password)
      .query(insertQuery);

    res.status(201).json({ message: '帳號創建成功' });
  } catch (err) {
    console.error('創建帳號失敗:', err.message);
    res.status(500).json({ error: '伺服器錯誤' });
  }
});

// 登入帳號
app.post('/api/SignIn', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: '所有欄位均為必填' });
    }
  
    try {
      const pool = await connectToDB();
  
      // 驗證 Email 和密碼
      const SignInQuery = `
        SELECT * 
        FROM Member 
        WHERE Email = @Email AND Password = @Password
      `;
      const SignInResult = await pool.request()
        .input('Email', sql.VarChar, email)
        .input('Password', sql.VarChar, password)
        .query(SignInQuery);
  
      if (SignInResult.recordset.length === 0) {
        return res.status(400).json({ error: 'Email 或密碼錯誤' });
      }
  
      const user = SignInResult.recordset[0];
      res.status(200).json({ uid: user.UID });
    } catch (err) {
      console.error('登入失敗:', err.message);
      res.status(500).json({ error: '伺服器錯誤' });
    }
});

app.post('/api/SignOut', (req, res) => {
    // 清除 Session
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ error: '伺服器錯誤' });
      }
      res.status(200).json({ message: '登出成功' });
    });
});

app.post('/api/getUserData', async (req, res) => {
  const { UID } = req.body; // 確保前端傳入的 `UID`

  // 驗證是否提供了 UID 
  if (!UID) {
    return res.status(400).json({ error: 'UID 是必須的' });
  }

  try {
      const pool = await connectToDB();

      // 查詢 `Data` 表中對應的資料
      const getDataquery = `
          SELECT *
          FROM Data
          WHERE UID = @UID
      `;

      const result = await pool.request()
          .input('UID', sql.Int, UID)
          .query(getDataquery);
      
      // 檢查是否有資料
      if (result.recordset.length === 0) {
          return res.status(404).json({ error: '未找到對應資料' });
      }

      // 返回查詢結果
      res.status(200).json(result.recordset);
  } catch (err) {
      console.error('獲取用戶資料失敗:', err.message);
      res.status(500).json({ error: '伺服器錯誤' });
  }
});

app.post('/api/insertData', async (req, res) => {
  const { position, UID, Name, YearOfBirth, MonthOfBirth, DayOfBirth, HourOfBirth, MinOfBirth } = req.body;

  // 驗證是否提供了 UID 
  if (!UID) {
    return res.status(400).json({ error: 'UID 是必須的' });
}

  try {
      const pool = await connectToDB();

      const deleteQuery = `
      DELETE FROM Data WHERE position = @position AND UID = @UID
    `;
      await pool.request()
          .input('position', sql.Int, position)
          .input('UID', sql.Int, UID)
          .query(deleteQuery);
      // 插入資料到 Data 表格
      const insertQuery = `
          INSERT INTO Data (position, UID, Name, YearOfBirth, MonthOfBirth, DayOfBirth, HourOfBirth, MinOfBirth)
          VALUES (@position, @UID, @Name, @YearOfBirth, @MonthOfBirth, @DayOfBirth, @HourOfBirth, @MinOfBirth)
      `;

      await pool.request()
          .input('position', sql.Int, position)
          .input('UID', sql.Int, UID)
          .input('Name', sql.VarChar, Name)
          .input('YearOfBirth', sql.Int, YearOfBirth)
          .input('MonthOfBirth', sql.Int, MonthOfBirth)
          .input('DayOfBirth', sql.Int, DayOfBirth)
          .input('HourOfBirth', sql.Int, HourOfBirth)
          .input('MinOfBirth', sql.Int, MinOfBirth)
          .query(insertQuery);

      res.status(201).json({ message: '資料插入成功' });
  } catch (err) {
      console.error('資料插入失敗:', err);
      console.log(req.body);
      res.status(500).json({ error: '伺服器錯誤' });
  }
});

app.post('/api/getUserPositionData', async (req, res) => {
  const { UID, position } = req.body; // 從前端接收 UID 和 position

  console.log(UID,position);
  // 驗證是否提供了 UID 
  if (!UID) {
      return res.status(400).json({ error: 'UID 是必須的' });
  }

  try {
      const pool = await connectToDB();

      // 查詢 Data 表中符合 UID 和 position 的資料
      const query = `
          SELECT *
          FROM Data
          WHERE UID = @UID AND position = @position
      `;

      const result = await pool.request()
          .input('UID', sql.Int, UID)
          .input('position', sql.Int, position)
          .query(query);

      // 檢查是否有資料
      if (result.recordset.length === 0) {
          return res.status(404).json({ error: '未找到對應資料' });
      }
      // 返回查詢結果
      res.status(200).json(result.recordset[0]); // 假設 position 是唯一的，僅返回一筆資料
  } catch (err) {
      console.error('獲取用戶資料失敗:', err.message);
      res.status(500).json({ error: '伺服器錯誤' });
  }
});

app.post('/api/addReading', async (req, res) => {
  const { CardID, UID } = req.body;

  // 檢查必要欄位
  if (!CardID || !UID) {
      return res.status(400).json({ error: '必要欄位缺失 (CardID, UID)' });
  }

  try {
      const pool = await connectToDB();
      const query = `
          INSERT INTO Reading (CardID, UID)
          VALUES (@CardID, @UID)
      `;
      await pool.request()
          .input('CardID', sql.Int, CardID)
          .input('UID', sql.Int, UID)
          .query(query);

      res.status(201).json({ message: 'Reading 資料新增成功' });
  } catch (err) {
      console.error('新增 Reading 資料失敗:', err.message);
      res.status(500).json({ error: '伺服器錯誤', details: err.message });
  }
});

app.post('/api/getReadingData', async (req, res) => {
  const { UID } = req.body; // 確保前端傳入的 `UID`

  // 驗證是否提供了 UID 
  if (!UID) {
    return res.status(400).json({ error: 'UID 是必須的' });
  }

  try {
      const pool = await connectToDB();

      // 查詢 `Data` 表中對應的資料
      const getReadingquery = `
          SELECT ReadingID, CardID,ReadingTime
          FROM Reading
          WHERE UID = @UID
          ORDER BY ReadingID
      `;

      const result = await pool.request()
          .input('UID', sql.Int, UID)
          .query(getReadingquery);
      
      // 檢查是否有資料
      if (result.recordset.length === 0) {
          return res.status(404).json({ error: '未找到對應資料' });
      }

      // 返回查詢結果
      res.status(200).json(result.recordset);
  } catch (err) {
      console.error('獲取用戶資料失敗:', err.message);
      res.status(500).json({ error: '伺服器錯誤' });
  }
});


app.listen(3000,()=>{
    console.log("started");
    testQuery();
})