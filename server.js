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
    return res.status(400).json({ success: false, error: "Image not found." });
  }

  // Response awal non-blocking
  res.json({ success: true, message: "AI process started in background..." });

  (async () => {
    try {
      console.log("🚀 [BACKEND] Starting AI Trace...");

      const prompt = `
      Analyze this university timetable schedule image.
      Extract the following information for each course:
      - course_code
      - course_name
      - lecture_time
      - lecture_group
      - location

      Return STRICTLY a JSON array without markdown or extra text.
      `;

      const pureBase64 = imageBase64.split(',')[1] || imageBase64;
      const modelName = 'gemini-3.8-flash';
      let resultText = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          console.log(`🤖 Attempt ${attempt} calling ${modelName}...`);
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
          console.warn(`⚠️ Attempt ${attempt} failed: ${err.message}`);
          await new Promise(r => setTimeout(r, 2000));
        }
      }

      if (resultText) {
        let cleanText = resultText.replace(/```json/gi, '').replace(/```/g, '').trim();
        const parsedData = JSON.parse(cleanText);
        
        fs.writeFileSync('./timetable_db.json', JSON.stringify(parsedData, null, 2));
        console.log("🎉 [BACKEND] AI Trace complete & saved to DB!");
      }
    } catch (e) {
      console.error("❌ Backend Error:", e.message);
    }
  })();
});

app.get('/api/load', (req, res) => {
  if (fs.existsSync('./timetable_db.json')) {
    const raw = fs.readFileSync('./timetable_db.json');
    res.json({ success: true, data: JSON.parse(raw) });
  } else {
    res.json({ success: false, error: "No data stored yet." });
  }
});

app.post('/api/save', (req, res) => {
  const confirmedData = req.body;
  fs.writeFileSync('./timetable_db.json', JSON.stringify(confirmedData, null, 2));
  console.log("Timetable saved!");
  res.json({ success: true, message: "Timetable saved successfully!" });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
