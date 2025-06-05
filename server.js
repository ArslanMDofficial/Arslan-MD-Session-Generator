const express = require("express");
const fs = require("fs");
const pino = require("pino");
const { default: makeWASocket, useSingleFileAuthState } = require("@whiskeysockets/baileys");
const { delay } = require("@whiskeysockets/baileys/lib/Utils");
const app = express();
const port = process.env.PORT || 8000;

app.use(express.static("public"));

const sessionsDir = "./sessions";
if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir);

const logger = pino({ level: "silent" });
const pairingStatus = {};

app.get("/", (req, res) => {
  res.send("✅ ArslanMD Session Generator is running.");
});

app.get("/pair", async (req, res) => {
  const number = req.query.number;
  if (!number || !/^\d+$/.test(number)) return res.send("❌ Invalid number format");

  const sessionFile = `${sessionsDir}/${number}.json`;
  const { state, saveState } = useSingleFileAuthState(sessionFile);

  const sock = makeWASocket({
    printQRInTerminal: false,
    logger,
    auth: state,
    browser: ['ArslanMD', 'Chrome', '1.0'],
  });

  pairingStatus[number] = false;

  sock.ev.on("connection.update", async (update) => {
    const { connection, qr, pairingCode, isNewLogin } = update;

    if (pairingCode && !pairingStatus[number]) {
      pairingStatus[number] = pairingCode;
      console.log("Pairing code generated:", pairingCode);
      res.send(pairingCode);
    }

    if (connection === "open") {
      await delay(3000);
      await sock.logout();
    }
  });

  sock.ev.on("creds.update", saveState);
});

app.get("/getSession", (req, res) => {
  const number = req.query.number;
  const sessionFile = `${sessionsDir}/${number}.json`;

  if (!fs.existsSync(sessionFile)) {
    return res.send("❌ Session not ready. Please wait or pair again.");
  }

  const sessionData = fs.readFileSync(sessionFile).toString("base64");
  const sessionID = `ArslanMD;;;${sessionData}`;

  const caption = `
✅ *Your Arslan-MD Session is Ready!*

🔐 *Session ID:* 
\`\`\`${sessionID}\`\`\`

📢 *Join WhatsApp Channel:* 
https://whatsapp.com/channel/0029VarfjW04tRrmwfb8x306

👨‍💻 *GitHub Repo:* 
https://github.com/ArslanMDofficial/Arslan-MD

👑 *Development by:* @ArslanMDofficial
`;

  res.send(caption);
});

app.listen(port, () => {
  console.log(`✅ ArslanMD Session Generator running on port ${port}`);
});
