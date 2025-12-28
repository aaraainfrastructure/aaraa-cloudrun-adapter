import express from "express";
import cors from "cors";
import { Storage } from "@google-cloud/storage";

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const BUCKET_NAME = "aaraa-erp-permanent-storage";
const storage = new Storage();

app.get("/", (req, res) => {
  res.send("AARAA Cloud Run Backend is live");
});

app.post("/upload", async (req, res) => {
  try {
    const { project_code, purpose, uploaded_by, image_base64 } = req.body;

    if (!image_base64) {
      return res.status(400).json({ error: "Image missing" });
    }

    const buffer = Buffer.from(image_base64, "base64");
    const fileName = `projects/${project_code}/${purpose}/${Date.now()}.jpg`;

    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(fileName);

    await file.save(buffer, {
      contentType: "image/jpeg",
      resumable: false
    });

    const fileUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`;

    res.json({ success: true, file_url: fileUrl });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
