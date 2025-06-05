import express from 'express';
import { useMultiFileAuthState, makeWASocket, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import P from 'pino';
import fs from 'fs';
import qrcode from 'qrcode-terminal';
import path from 'path';
import { fileURLToPath } from 'url';
import { Buffer } from 'buffer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = process.env.PORT || 8000;

const sessions = {}; // track active sessions

app.use(express.static('public'));
app.use(express.json());

app.get('/', (req, res) => {
  res.send("✅ ArslanMD Session Generator is running.");
});

app.get('/pair', async (req, res) => {
  const number = req.query.number;
  if (!number || !/^\d+$/.test(number)) {
    return res.send("❌ Invalid number. Format: 923001234567");
  }

  if (sessions[number]) {
    return res.send("⏳ Session already in progress. Please wait...");
  }

  const sessionFolder = path.join(__dirname, 'sessions', number);
  fs.mkdirSync(sessionFolder, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionFolder);
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    printQRInTerminal: false,
    logger: P({ level: 'silent' }),
    auth: state
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, qr } = update;
    if (qr) {
      sessions[number] = { status: "pending", sessionFolder };
      return res.send(qr); // Send QR as text (pairing code)
    }

    if (connection === "open") {
      await saveCreds();

      const creds = fs.readFileSync(path.join(sessionFolder, 'creds.json'), 'utf-8');
      const encoded = Buffer.from(creds).toString('base64');
      const finalSession = `ArslanMD;;;${encoded}`;

      sessions[number] = { status: "done", session: finalSession };
      sock.end();
    }
  });

  sock.ev.on("creds.update", saveCreds);
});

app.get('/getSession', (req, res) => {
  const number = req.query.number;
  const sessionInfo = sessions[number];

  if (!sessionInfo || sessionInfo.status !== "done") {
    return res.send("❌ Session not ready. Please wait or pair again.");
  }

  res.send(`
    <html>
      <head>
        <title>✅ ArslanMD Session Ready</title>
        <style>
          body {
            margin: 0;
            padding: 0;
            font-family: 'Segoe UI', sans-serif;
            background: linear-gradient(to right, #0f0c29, #302b63, #24243e);
            color: #fff;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            text-align: center;
          }
          h1 {
            font-size: 32px;
            margin-top: 20px;
            text-shadow: 0 0 10px cyan;
          }
          .session-box {
            background-color: rgba(0,0,0,0.7);
            padding: 20px;
            margin: 20px auto;
            border-radius: 12px;
            width: 90%;
            max-width: 700px;
            font-size: 14px;
            word-break: break-word;
            box-shadow: 0 0 15px #00ffc3;
          }
          .gif {
            max-width: 300px;
            border-radius: 15px;
            box-shadow: 0 0 20px #fff;
          }
          .link {
            color: #00ffd9;
            font-weight: bold;
            text-decoration: none;
            display: block;
            margin-top: 10px;
          }
          .dev {
            margin-top: 25px;
            font-style: italic;
            color: #ccc;
            font-size: 13px;
          }
          .copy-btn {
            background-color: #00ffc3;
            color: black;
            padding: 10px 20px;
            margin-top: 10px;
            border: none;
            border-radius: 8px;
            font-weight: bold;
            cursor: pointer;
          }
          .copy-btn:hover {
            background-color: #02d3ab;
          }
        </style>
      </head>
      <body>
        <h1>🎉 Your WhatsApp Session is Ready!</h1>
        <img src="https://media.tenor.com/YvY5V9Z3Jm0AAAAM/connected.gif" class="gif" alt="Connected GIF" />
        
        <div class="session-box" id="sessionBox">
          ${sessionInfo.session}
        </div>

        <button class="copy-btn" onclick="copySession()">📋 Copy Session ID</button>

        <a class="link" href="https://whatsapp.com/channel/0029VarfjW04tRrmwfb8x306" target="_blank">📢 Join WhatsApp Channel</a>
        <a class="link" href="https://github.com/ArslanMDofficial/Arslan-MD" target="_blank">👨‍💻 Visit GitHub Repository</a>

        <div class="dev">🛠 Development by <b>ArslanMDofficial</b></div>

        <script>
          function copySession() {
            const text = document.getElementById("sessionBox").innerText;
            navigator.clipboard.writeText(text).then(() => {
              alert("✅ Session ID copied to clipboard!");
            });
          }
        </script>
      </body>
    </html>
  `);
});

app.listen(port, () => {
  console.log(`✅ ArslanMD Session Generator running on port ${port}`);
});
