// sendEmail.js
import express from "express";
import fetch from "node-fetch";
import cors from "cors";

const app = express();
app.use(express.json());
app.use(cors());

// === POST /send-enrollment ===
app.post("/send-enrollment", async (req, res) => {
  const data = req.body;

  // Compose email body using HTML
  const htmlContent = `
    <div style="font-family: Poppins, sans-serif; background:#f9fafc; padding:20px;">
      <div style="max-width:600px; margin:0 auto; background:#fff; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.08); overflow:hidden;">
        <div style="background:linear-gradient(90deg,#3ec9d6,#257a9e); padding:18px; color:white; text-align:center;">
          <h2 style="margin:0;">📘 New Course Application</h2>
          <p style="margin:4px 0 0;">${data.courseTitle || "Unknown Course"}</p>
        </div>
        <div style="padding:24px;">
          <h3 style="color:#2c3e50;">Applicant Details</h3>
          <table style="width:100%; border-collapse:collapse; margin-top:10px;">
            <tbody>
              <tr><td><strong>First Name:</strong></td><td>${data.firstName || "-"}</td></tr>
              <tr><td><strong>Last Name:</strong></td><td>${data.lastName || "-"}</td></tr>
              <tr><td><strong>Email:</strong></td><td>${data.email || "-"}</td></tr>
              <tr><td><strong>Phone:</strong></td><td>${data.phone || "-"}</td></tr>
              <tr><td><strong>Company:</strong></td><td>${data.company || "-"}</td></tr>
              <tr><td><strong>Job Title:</strong></td><td>${data.jobTitle || "-"}</td></tr>
              <tr><td><strong>Preferred Mode:</strong></td><td>${data.mode || "-"}</td></tr>
              <tr><td><strong>Preferred Start Date:</strong></td><td>${data.startDate || "-"}</td></tr>
              <tr><td><strong>Experience Level:</strong></td><td>${data.experienceLevel || "-"}</td></tr>
              <tr><td><strong>Message:</strong></td><td>${data.message || "—"}</td></tr>
            </tbody>
          </table>

          <hr style="margin:24px 0; border:0; border-top:1px solid #eee;">

          <p style="font-size:14px; color:#555;">
            <strong>Course ID:</strong> ${data.courseId || "—"}<br>
            <strong>Course Title:</strong> ${data.courseTitle || "—"}<br>
            <strong>Submitted from:</strong> <a href="${data.courseUrl || "#"}" target="_blank">${data.courseUrl || "—"}</a>
          </p>
        </div>
      </div>
    </div>
  `;

  try {
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": "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" // replace with your key
      },
      body: JSON.stringify({
        sender: { name: "Course Portal", email: "no-reply@yourdomain.com" },
        to: [{ email: "hulletmatjiu@gmail.com", name: "Hullet Matjiu" }],
        subject: `New Course Application – ${data.courseTitle || "Course"}`,
        htmlContent
      }),
    });

    if (!response.ok) throw new Error(await response.text());
    res.json({ success: true });
  } catch (err) {
    console.error("Email send failed:", err);
    res.status(500).json({ success: false, message: "Failed to send email" });
  }
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
