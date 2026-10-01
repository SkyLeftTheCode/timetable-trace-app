const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = 3000;

app.use(bodyParser.json({ limit: '20mb' }));
app.use(express.static('public'));

const ai = new GoogleGenAI();

app.post('/api/trace', async (req, res) => {
  const { imageBase64 } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ success: false, error: "Imej tidak dijumpai." });
  }

  // Hantar respon awal serta-merta ke browser supaya browser TAK STUCK LOADING!
  res.json({ success: true, message: "Proses AI dimulakan di belakang tabir..." });

  // Jalankan panggilan AI secara asinkronus di belakang tabir
  (async () => {
    try {
      console.log("🚀 [BACKEND] Memulakan AI Trace...");

      const prompt = `
      Analisis gambar jadual waktu universiti ini.
      Ekstrak maklumat berikut bagi setiap subjek:
      - course_code
      - course_name
      - lecture_time
      - lecture_group
      - location

      Format jawapan strictly dalam JSON array sahaja tanpa sebarang markdown/teks tambahan.
      `;

      const pureBase64 = imageBase64.split(',')[1] || imageBase64;
      const modelName = 'gemini-3.8-flash';
      let resultText = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`🤖 Percubaan ${attempt} memanggil ${modelName}...`);
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [{
              role: 'user',
              parts: [
                { text: prompt },
                { inlineData: { mimeType: 'image/jpeg', data: pureBase64 } }
              ]
            }]
          });

          if (response && response.text) {
            resultText = response.text;
            break;
          }
        } catch (err) {
          console.warn(`⚠️ Percubaan ${attempt} gagal: ${err.message}`);
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      if (resultText) {
        let cleanText = resultText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsedData = JSON.parse(cleanText);
        
        // Simpan terus ke database
        fs.writeFileSync('./timetable_db.json', JSON.stringify(parsedData, null, 2));
        console.log("🎉 [BACKEND] AI Trace berjaya & disimpan ke database!");
      }
    } catch (e) {
      console.error("❌ Ralat Backend:", e.message);
    }
  })();
});

app.get('/api/load', (req, res) => {
  if (fs.existsSync('./timetable_db.json')) {
    const raw = fs.readFileSync('./timetable_db.json');
    res.json({ success: true, data: JSON.parse(raw) });
  } else {
    res.json({ success: false, error: "Tiada data disimpan lagi." });
  }
});

app.post('/api/save', (req, res) => {
  const confirmedData = req.body;
  fs.writeFileSync('./timetable_db.json', JSON.stringify(confirmedData, null, 2));
  console.log("Jadual disahkan & disimpan!");
  res.json({ success: true, message: "Jadual berjaya disahkan & disimpan!" });
});

app.listen(PORT, () => {
  console.log(`Server siap di http://localhost:${PORT}`);
});
