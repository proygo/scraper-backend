const puppeteer = require('puppeteer');
const XLSX = require('xlsx');

async function scrapeTournament(tournamentName) {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox']
  });
  const [page] = await browser.pages();

  await page.goto('https://www.trackwrestling.com/', { waitUntil: 'load' });

  console.log('Please navigate manually to the bracket page...');
  await new Promise(resolve => setTimeout(resolve, 60000)); // give user time

  const frames = page.frames();
  let frame = null;
  for (const f of frames) {
    const found = await f.$('#weightBox');
    if (found) {
      frame = f;
      break;
    }
  }

  if (!frame) {
    throw new Error("Could not find #weightBox in any frame.");
  }

  const weights = await frame.$$eval('#weightBox option', opts =>
    opts.filter(o => o.value !== "").map(o => ({
      value: o.value,
      label: o.label
    }))
  );

  const allWrestlers = [];

  for (const weight of weights) {
    await frame.select('#weightBox', weight.value);
    await new Promise(resolve => setTimeout(resolve, 2000));

    const wrestlers = await frame.evaluate(() => {
      const data = [];
      const cells = document.querySelectorAll('.bracket-cell, .full-line');
      cells.forEach(cell => {
        const lines = cell.innerText.trim().split('\n').map(x => x.trim()).filter(Boolean);
        if (lines.length >= 2) {
          const [nameLine, detailLine] = lines;
          const cleanedName = nameLine.replace(/,\s*\d+(st|nd|rd|th)$/i, '');
          const detailParts = detailLine.split(',');
          const school = detailParts[0]?.trim();
          const gradeStr = detailParts[detailParts.length - 1]?.trim();
          const grade = parseInt(gradeStr);
          data.push({ name: cleanedName, school, grade: isNaN(grade) ? null : grade });
        }
      });
      return data;
    });

    wrestlers.forEach(w => {
      w.weight = parseInt(weight.label);
      w.tournament = tournamentName;
    });

    allWrestlers.push(...wrestlers);
  }

  const worksheet = XLSX.utils.json_to_sheet(allWrestlers);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Wrestlers");

  const fileName = `wrestlers_${tournamentName.replace(/\W+/g, '_').toLowerCase()}.xlsx`;
  XLSX.writeFile(workbook, fileName);

  await browser.close();

  return fileName;
}

module.exports = scrapeTournament;
