const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI();

async function runDirectCheck() {
  console.log("🔍 [SYSTEM CHECK] Memulakan ujian terus tanpa localhost...");
  
  if (!fs.existsSync('./jadual.jpg')) {
    console.error("❌ Fail 'jadual.jpg' tidak dijumpai! Pastikan ada gambar jadual.jpg dalam folder.");
    return;
  }

  console.log("📷 Reading jadual.jpg...");
  const imageBuffer = fs.readFileSync('./jadual.jpg');
  const imageBase64 = imageBuffer.toString('base64');

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

  const modelName = 'gemini-3.8-flash';
  const maxRetries = 5;
  let resultText = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🤖 [Percubaan ${attempt}/${maxRetries}] Memanggil Model: ${modelName}...`);
      
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }
            ]
          }
        ]
      });

      if (response && response.text) {
        resultText = response.text;
        console.log(`✅ [BERJAYA] Model ${modelName} memberi respons!`);
        break;
      }
    } catch (err) {
      console.warn(`⚠️ [Percubaan ${attempt} Gagal]: ${err.message}`);
      if (attempt < maxRetries) {
        const wait = attempt * 2;
        console.log(`⏳ Pelayan sibuk (503). Menunggu ${wait} saat...`);
        await new Promise(r => setTimeout(r, wait * 1000));
      }
    }
  }

  if (!resultText) {
    console.error("❌ Semua percubaan gagal kerana pelayan Google sibuk.");
    return;
  }

  try {
    let cleanText = resultText.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsedData = JSON.parse(cleanText);
    
    // Simpan terus ke database
    fs.writeFileSync('./timetable_db.json', JSON.stringify(parsedData, null, 2));
    
    console.log("\n================ HASIL EXTRACTION ================");
    console.table(parsedData); // Tunjuk jadual kemas dalam terminal!
    console.log("==================================================");
    console.log("🎉 Data telah disemak & disimpan secara automatik ke 'timetable_db.json'!");

  } catch (e) {
    console.error("❌ Ralat menukar respons ke JSON:", e.message);
  }
}

runDirectCheck();
