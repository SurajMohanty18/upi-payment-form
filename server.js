const express = require('express');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const XLSX = require('xlsx');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer setup for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `proof-${uniqueSuffix}${ext}`);
  }
});
const upload = multer({ storage });

// Excel file path and sheet name
const filePath = 'data.xlsx';
const sheetName = 'Submissions';

app.post('/submit', upload.single('screenshot'), (req, res) => {
  try {
    const { name, email, yop } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).send({ status: 'error', message: 'No screenshot uploaded' });
    }

    let workbook;
    let data = [];

    // Read existing Excel file if exists
    if (fs.existsSync(filePath)) {
      try {
        workbook = XLSX.readFile(filePath);
        if (workbook.Sheets[sheetName]) {
          data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
        }
      } catch (err) {
        console.warn("⚠️ Excel file corrupted or unreadable. Creating a new workbook.");
        workbook = XLSX.utils.book_new();
      }
    } else {
      workbook = XLSX.utils.book_new();
    }

    // Add new submission
    data.push({
      Name: name,
      Email: email,
      YOP: yop,
      Screenshot: file.filename,
      Timestamp: new Date().toLocaleString()
    });

    // Convert data array back to sheet
    const newSheet = XLSX.utils.json_to_sheet(data);

    // Replace or add sheet in workbook
    workbook.Sheets[sheetName] = newSheet;
    if (!workbook.SheetNames.includes(sheetName)) {
      XLSX.utils.book_append_sheet(workbook, newSheet, sheetName);
    }

    // Write workbook back to file
    XLSX.writeFile(workbook, filePath);

    console.log("✅ Submission saved:", name, email, yop);
    res.send({ status: 'success' });
  } catch (err) {
    console.error("❌ Error saving submission:", err);
    res.status(500).send({ status: 'error', message: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
