

const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors()); // adjust origin in production
app.use(express.json({ limit: '1mb' }));


const BREVO_API = 'https://api.brevo.com/v3/smtp/email';
const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = process.env.SENDER_EMAIL || 'no-reply@yourdomain.com';
const SENDER_NAME = process.env.SENDER_NAME || 'Course Enrollments';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'hulletmatjiu@gmail.com';
const PORT = process.env.PORT || 5000;

if(!BREVO_API_KEY) {
  console.error('Missing BREVO_API_KEY in environment. Put it in .env or env vars.');
  process.exit(1);
}

// small helper to escape HTML to avoid injection in templates
function escapeHtml(str){
  if(!str && str !== 0) return '';
  return String(str)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;')
    .replace(/'/g,"&#039;");
}

// Admin email template (HTML) - modern, readable table layout
function adminEmailHtml(data){
  const {
    firstName, lastName, email, phone, company, jobTitle,
    mode, startDate, experienceLevel, message, courseTitle, courseUrl
  } = data;

  return `
  <!doctype html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  </head>
  <body style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:0;padding:20px;background:#f5f7fb;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr><td align="center">
        <table width="700" style="max-width:700px;background:#ffffff;border-radius:12px;padding:20px;box-shadow:0 10px 30px rgba(20,30,45,0.04);">
          <tr>
            <td style="padding:10px 0;">
              <h2 style="margin:0 0 8px 0;color:#163A4A;font-size:20px">New Course Application</h2>
              <div style="color:#6b7280;margin-bottom:12px">Course: <strong>${escapeHtml(courseTitle || '—')}</strong></div>
            </td>
          </tr>

          <tr>
            <td>
              <table width="100%" cellpadding="8" cellspacing="0" role="presentation" style="border-collapse:collapse;">
                <tr style="background:#f7fafc;"><td style="width:160px;font-weight:600">Full name</td><td>${escapeHtml(firstName)} ${escapeHtml(lastName)}</td></tr>
                <tr><td style="font-weight:600">Email</td><td>${escapeHtml(email)}</td></tr>
                <tr style="background:#f7fafc;"><td style="font-weight:600">Phone</td><td>${escapeHtml(phone || '—')}</td></tr>
                <tr><td style="font-weight:600">Company</td><td>${escapeHtml(company || '—')}</td></tr>
                <tr style="background:#f7fafc;"><td style="font-weight:600">Job title</td><td>${escapeHtml(jobTitle || '—')}</td></tr>
                <tr><td style="font-weight:600">Preferred mode</td><td>${escapeHtml(mode || '—')}</td></tr>
                <tr style="background:#f7fafc;"><td style="font-weight:600">Preferred start date</td><td>${escapeHtml(startDate || '—')}</td></tr>
                <tr><td style="font-weight:600">Experience level</td><td>${escapeHtml(experienceLevel || '—')}</td></tr>
                <tr style="background:#f7fafc;"><td style="font-weight:600">Message</td><td>${escapeHtml(message || '—')}</td></tr>
                <tr><td style="font-weight:600">Course link</td><td><a href="${escapeHtml(courseUrl || '#')}" target="_blank">${escapeHtml(courseUrl || '—')}</a></td></tr>
              </table>
            </td>
          </tr>

          <tr>
            <td style="padding-top:16px;">
              <a href="${escapeHtml(courseUrl || '#')}" style="display:inline-block;padding:10px 14px;border-radius:8px;background:linear-gradient(90deg,#3ec9d6,#257a9e);color:#fff;text-decoration:none;font-weight:600">Open course page</a>
            </td>
          </tr>

          <tr>
            <td style="padding-top:18px;color:#94a3b8;font-size:12px">
              This message was generated automatically. Contact the applicant to proceed.
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
  </html>
  `;
}

// Thank-you email template (sent to the submitter)
function thankYouHtml(data){
  const { firstName, courseTitle, courseUrl } = data;
  return `
  <!doctype html>
  <html>
  <head><meta name="viewport" content="width=device-width, initial-scale=1.0"/></head>
  <body style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:0;padding:20px;background:#f5f7fb;">
    <table width="100%" cellpadding="0" cellspacing="0" role="presentation">
      <tr><td align="center">
        <table width="700" style="max-width:700px;background:#ffffff;border-radius:12px;padding:22px;box-shadow:0 10px 30px rgba(20,30,45,0.04);">
          <tr>
            <td>
              <h2 style="margin:0 0 6px 0;color:#0f3b4a">Thanks for your application, ${escapeHtml(firstName || '')} 👋</h2>
              <p style="margin:0 0 12px 0;color:#566277">We’ve received your application for <strong>${escapeHtml(courseTitle || 'the course')}</strong>. One of our team members will reach out with next steps within 1–2 business days.</p>

              <div style="margin:14px 0;">
                <a href="${escapeHtml(courseUrl || '#')}" style="padding:10px 16px;border-radius:10px;background:linear-gradient(90deg,#3ec9d6,#257a9e);color:#fff;text-decoration:none;font-weight:600;display:inline-block">View course details</a>
              </div>

              <p style="margin:6px 0 0 0;color:#94a3b8;font-size:13px">If you need immediate help, reply to this email or call us on our support number.</p>
            </td>
          </tr>
        </table>
      </td></tr>
    </table>
  </body>
  </html>
  `;
}

// Core send function (calls Brevo)
async function sendViaBrevo({ to, subject, html }) {
  const body = {
    sender: { email: SENDER_EMAIL, name: SENDER_NAME },
    to: [{ email: to }],
    subject,
    htmlContent: html
  };

  const res = await axios.post(BREVO_API, body, {
    headers: {
      'api-key': BREVO_API_KEY,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    timeout: 15000
  });

  return res.data;
}

// API endpoint that your front-end will call
app.post('/send-email', async (req, res) => {
  try {
    const payload = req.body || {};

    // server-side validation
    const required = ['firstName','lastName','email'];
    const missing = required.filter(k => !payload[k] || String(payload[k]).trim() === '');
    if(missing.length) return res.status(400).json({ success:false, message:`Missing required: ${missing.join(', ')}`});

    // Build data
    const data = {
      firstName: payload.firstName || '',
      lastName: payload.lastName || '',
      email: payload.email || '',
      phone: payload.phone || '',
      company: payload.company || '',
      jobTitle: payload.jobTitle || '',
      mode: payload.mode || '',
      startDate: payload.startDate || '',
      experienceLevel: payload.experienceLevel || '',
      message: payload.message || '',
      courseTitle: payload.courseTitle || '',
      courseUrl: payload.courseUrl || ''
    };

    // send admin email
    const adminHtml = adminEmailHtml(data);
    await sendViaBrevo({ to: ADMIN_EMAIL, subject: `New course application: ${data.courseTitle || '—'}`, html: adminHtml });

    // send thank you to applicant
    const thankHtml = thankYouHtml(data);
    await sendViaBrevo({ to: data.email, subject: `Thanks — we received your application for ${data.courseTitle || 'the course'}`, html: thankHtml });

    return res.json({ success:true, message:'Emails sent' });

  } catch (err) {
    console.error('send-email error', err?.response?.data || err.message || err);
    // Provide friendly error without leaking the API key
    return res.status(500).json({ success:false, message:'Failed to send emails. See server logs.'});
  }
});

// quick health check
app.get('/', (req,res) => res.send('sendEmail microservice running'));

// start
app.listen(PORT, () => {
  console.log(`sendEmail service listening on port ${PORT} — admin will receive at ${ADMIN_EMAIL}`);
});
