const express = require("express");
const fs = require("fs");
const pino = require("pino");
const { default: makeWASocket, useSingleFileAuthState } = require("@whiskeysockets/baileys");
const app = express();
const port = process.env.PORT || 8000;

app.use(express.static("public"));

const sessionsDir = "./sessions";
if (!fs.existsSync(sessionsDir)) fs.mkdirSync(sessionsDir);

const logger = pino({ level: "silent" });

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

  sock.ev.on("creds.update", saveState);

  try {
    const code = await sock.requestPairingCode(`${number}@s.whatsapp.net`);
    console.log("✅ Pairing code generated:", code);
    res.send(code);
  } catch (err) {
    console.error("❌ Error generating code:", err);
    res.send("❌ Could not generate pairing code.");
  }
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
