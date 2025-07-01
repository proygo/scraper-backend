const express = require('express');
const scrapeTournament = require('./scraper');
const path = require('path');
const fs = require('fs');

const app = express();
app.use(express.json());

app.post('/scrape', async (req, res) => {
  const { tournament } = req.body;
  if (!tournament) {
    return res.status(400).json({ error: "Missing tournament name" });
  }

  try {
    const fileName = await scrapeTournament(tournament);
    const filePath = path.join(__dirname, fileName);
    res.download(filePath, fileName, err => {
      if (!err) {
        fs.unlinkSync(filePath); // delete file after sending
      }
    });
  } catch (err) {
    console.error("Scraper failed:", err);
    res.status(500).json({ error: "Scraper failed" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Scraper API running on port ${PORT}`));
