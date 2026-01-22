const express = require("express");
const multer = require("multer");
const cors = require("cors");
const fs = require("fs");
const dayjs = require("dayjs");


const minMax = require("dayjs/plugin/minMax");
const isBetween = require("dayjs/plugin/isBetween");

dayjs.extend(minMax);
dayjs.extend(isBetween);

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

app.post("/upload", upload.single("file"), (req, res) => {
  try {
   
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded." });
    }

    const filePath = req.file.path;
    let rawContent;

    try {
      rawContent = fs.readFileSync(filePath, "utf-8");
    } catch (readErr) {
      return res.status(400).json({ error: "Unable to read uploaded file." });
    } finally {
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    if (!rawContent || rawContent.trim().length === 0) {
      return res.status(400).json({ error: "Uploaded file is empty." });
    }

    const lines = rawContent.split("\n");

    
    const joinPatterns = ["joined using this group's invite link", "added", "joined"];

    const activeByDay = {};
    const joinedByDay = {};
    const activeDaysByUser = {};
    const firstSeen = {};

    lines.forEach(line => {
      const msgMatch = line.match(/^(\d{1,2}\/\d{1,2}\/\d{2,4}), (.*?) - (.*)/);
      if (!msgMatch) return;

      const rawDate = msgMatch[1];
      const content = msgMatch[3];

      const dateKey = dayjs(rawDate, ["M/D/YY", "M/D/YYYY"]).format("YYYY-MM-DD");

      joinPatterns.forEach(pattern => {
        if (content.includes(pattern)) {
          const user = content.split(" ")[0];
          if (!firstSeen[user]) firstSeen[user] = dateKey;
          if (!joinedByDay[dateKey]) joinedByDay[dateKey] = new Set();
          joinedByDay[dateKey].add(user);
        }
      });

      const userMatch = content.match(/(.*?): (.*)/);
      if (userMatch) {
        const sender = userMatch[1];
        if (!activeByDay[dateKey]) activeByDay[dateKey] = new Set();
        activeByDay[dateKey].add(sender);

        if (!activeDaysByUser[sender]) activeDaysByUser[sender] = new Set();
        activeDaysByUser[sender].add(dateKey);
      }
    });

    const messageDates = [
      ...Object.keys(activeByDay),
      ...Object.keys(joinedByDay)
    ];

    if (messageDates.length === 0) {
      return res.status(400).json({ error: "File format invalid or no valid WhatsApp data found." });
    }

    const lastMessageDate = dayjs.max(messageDates.map(d => dayjs(d)));
    const windowStart = lastMessageDate.subtract(6, "day");

    const graph = [];
    for (let i = 0; i < 7; i++) {
      const day = windowStart.add(i, "day").format("YYYY-MM-DD");
      graph.push({
        date: day,
        active: activeByDay[day] ? activeByDay[day].size : 0,
        joined: joinedByDay[day] ? joinedByDay[day].size : 0
      });
    }

    const active4days = Object.keys(activeDaysByUser).filter(u => {
      const days = [...activeDaysByUser[u]];
      const inRange = days.filter(d =>
        dayjs(d).isBetween(windowStart, lastMessageDate, "day", "[]")
      );
      return inRange.length >= 4;
    });

    return res.json({ graph, active4days });

  } catch (err) {
    console.error("Upload processing error:", err);
    return res.status(500).json({ error: "Server error processing file." });
  }
});


app.listen(5000, () => console.log("Backend running on port 5000"));
