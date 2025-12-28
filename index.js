import express from "express";
import cors from "cors";
import { Storage } from "@google-cloud/storage";
import crypto from "crypto";

const app = express();

/* -------------------- MIDDLEWARE -------------------- */
app.use(cors({ origin: "*" }));
app.use(express.json({ limit: "15mb" }));

/* -------------------- CONFIG -------------------- */
const BUCKET_NAME = "aaraa-erp-permanent-storage";
const storage = new Storage(); // Uses Cloud Run default service account

/* -------------------- HEALTH CHECK -------------------- */
app.get("/", (_req, res) => {
  res.status(200).json({
    status: "ok",
    service: "AARAA Cloud Run Backend",
    timestamp: new Date().toISOString()
  });
});

/* -------------------- IMAGE UPLOAD -------------------- */
/*
Expected payload from AI Studio:
{
  project_code: "CRN410287",
  purpose: "BILL" | "SITE_PHOTO" | "PETTY_CASH",
  uploaded_by: "AI2005",
  image_base64: "data:image/jpeg;base64,/9j/4AAQSk..."
}
*/

app.post("/upload", async (req, res) => {
  try {
    const {
      project_code,
      purpose,
      uploaded_by,
      image_base64
    } = req.body;

    /* ---------- VALIDATION ---------- */
    if (!project_code || !purpose || !uploaded_by || !image_base64) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields"
      });
    }

    /* ---------- CLEAN BASE64 ---------- */
    const base64Data = image_base64.replace(
      /^data:image\/\w+;base64,/,
      ""
    );

    const buffer = Buffer.from(base64Data, "base64");

    /* ---------- FILE PATH ---------- */
    const fileId = crypto.randomUUID();
    const fileName = `projects/${project_code}/${purpose}/${fileId}.jpg`;

    const bucket = storage.bucket(BUCKET_NAME);
    const file = bucket.file(fileName);

    /* ---------- UPLOAD ---------- */
    await file.save(buffer, {
      resumable: false,
      contentType: "image/jpeg",
      metadata: {
        metadata: {
          project_code,
          purpose,
          uploaded_by,
          uploaded_at: new Date().toISOString()
        }
      }
    });

    /* ---------- PUBLIC URL ---------- */
    const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`;

    return res.status(200).json({
      success: true,
      file_url: publicUrl,
      bucket_path: fileName
    });

  } catch (error) {
    console.error("UPLOAD ERROR:", error);
    return res.status(500).json({
      success: false,
      error: "Image upload failed"
    });
  }
});

/* -------------------- SERVER -------------------- */
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`AARAA backend running on port ${PORT}`);
});
