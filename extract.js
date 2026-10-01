const fs = require('fs');
const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI();

// Senarai lengkap model Gemini untuk dicuba satu per satu
const GEMINI_MODELS = [
  'gemini-1.5-flash',
  'gemini-1.5-flash-8b',
  'gemini-1.5-pro',
  'gemini-2.0-flash-exp',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite-preview-02-05',
  'gemini-2.5-flash',
  'gemini-3.8-flash'
];

async function processTimetable() {
  try {
    console.log("Sedang membaca gambar jadual.jpg...");
    
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

    Format jawapan strictly dalam JSON array seperti contoh ini:
    [
      {
        "course_code": "SSW3307",
        "course_name": "USER EXPERIENCE AND USER INTERFACE",
        "lecture_time": "S14-16,K14",
        "lecture_group": "5",
        "location": "BK1(FSKTM)"
      }
    ]
    Jangan tambah sebarang teks penjelasan, pulangkan JSON sahaja.
    `;

    let response = null;
    let successfulModel = '';

    for (const modelName of GEMINI_MODELS) {
      try {
        console.log(`Mencuba model: ${modelName}...`);
        response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: 'user',
              parts: [
                { text: prompt },
                {
                  inlineData: {
                    mimeType: 'image/jpeg',
                    data: imageBase64
                  }
                }
              ]
            }
          ]
        });

        if (response && response.text) {
          successfulModel = modelName;
          break; // Berjaya dapatkan jawapan, terus keluar loop!
        }
      } catch (err) {
        console.warn(`Model ${modelName} tidak tersedia/busy. Mencuba model seterusnya...`);
      }
    }

    if (!response || !response.text) {
      throw new Error("Semua model Gemini gagal dipanggil. Sila semak API Key atau cuba sebentar lagi.");
    }

    console.log(`\n--- BERJAYA DITRACE GUNA MODEL: ${successfulModel} ---`);
    console.log(response.text);

  } catch (error) {
    console.error("Ralat berlaku:", error.message);
  }
}

processTimetable();
