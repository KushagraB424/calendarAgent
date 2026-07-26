const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeTextFromUrl(url) {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8'
      },
      timeout: 10000
    });

    const html = response.data;
    const $ = cheerio.load(html);

    $('script, style, noscript, iframe, img, svg, video, audio, canvas, map, object, embed, footer, header, nav').remove();

    let text = $('body').text() || $.text();
    text = text.replace(/\s+/g, ' ').trim();

    return text;
  } catch (error) {
    console.error(`Error scraping URL ${url}:`, error.message);
    throw new Error(`Failed to scrape website: ${error.message}`);
  }
}

module.exports = { scrapeTextFromUrl };
