const axios = require('axios');
const cheerio = require('cheerio');

async function scrapeTextFromUrl(url) {
  try {
    // 1. Fetch the target URL as an arraybuffer so we can inspect headers and handle images directly
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8'
      },
      responseType: 'arraybuffer',
      timeout: 10000
    });

    const contentType = response.headers['content-type'] || '';
    
    // 2. Direct Image Link
    if (contentType.startsWith('image/')) {
      const base64 = Buffer.from(response.data, 'binary').toString('base64');
      const mimeType = contentType.split(';')[0];
      return { text: "Image uploaded directly.", images: [{ mimeType, data: base64 }] };
    }

    // 3. HTML Page
    const html = response.data.toString('utf-8');
    const $ = cheerio.load(html);
    
    let images = [];
    
    // Find all images
    const imgTags = $('img').toArray();
    let bestImgUrl = null;
    
    // Try to find an image that looks like a calendar (based on src or alt text)
    for (const img of imgTags) {
      const src = $(img).attr('src');
      const alt = $(img).attr('alt') || '';
      if (!src || src.includes('.svg') || src.includes('data:image')) continue;
      
      const isCalendar = /(calendar|schedule|2026|2027|year)/i.test(src) || /(calendar|schedule|2026|2027|year)/i.test(alt);
      if (isCalendar) {
        bestImgUrl = src;
        break;
      }
    }
    
    // If no specific calendar image found, just grab the first large-looking one
    if (!bestImgUrl && imgTags.length > 0) {
      for (const img of imgTags) {
        const src = $(img).attr('src');
        if (src && !src.includes('.svg') && !src.includes('data:image')) {
          bestImgUrl = src;
          break;
        }
      }
    }

    if (bestImgUrl) {
      try {
        // Resolve relative URLs to absolute
        const absoluteUrl = new URL(bestImgUrl, url).href;
        const imgResponse = await axios.get(absoluteUrl, { responseType: 'arraybuffer', timeout: 5000 });
        const imgContentType = imgResponse.headers['content-type'] || 'image/jpeg';
        
        if (imgContentType.startsWith('image/')) {
          const base64 = Buffer.from(imgResponse.data, 'binary').toString('base64');
          const mimeType = imgContentType.split(';')[0];
          images.push({ mimeType, data: base64 });
        }
      } catch (err) {
        console.warn(`Failed to fetch image ${bestImgUrl}:`, err.message);
      }
    }

    // Clean up HTML for text extraction
    $('script, style, noscript, iframe, img, svg, video, audio, canvas, map, object, embed, footer, header, nav').remove();
    let text = $('body').text() || $.text();
    text = text.replace(/\s+/g, ' ').trim();

    return { text, images };
  } catch (error) {
    console.error(`Error scraping URL ${url}:`, error.message);
    throw new Error(`Failed to scrape website: ${error.message}`);
  }
}

module.exports = { scrapeTextFromUrl };
