const axios = require('axios');
const cheerio = require('cheerio');
const dns = require('dns').promises;
const pdfParse = require('pdf-parse');

const MAX_DOC_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_IMG_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_TEXT_LEN = 50000;

// Private IP checks
const isPrivateIP = (ip) => {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;
  return (
    parts[0] === 10 ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    parts[0] === 127 ||
    parts[0] === 0
  );
};

const checkSSRF = async (urlStr) => {
  try {
    const parsedUrl = new URL(urlStr);
    const hostname = parsedUrl.hostname;
    
    // Check if it's already an IP
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) {
      if (isPrivateIP(hostname)) throw new Error("Private IP blocked.");
      return;
    }
    
    // Resolve DNS
    const lookup = await dns.lookup(hostname);
    if (isPrivateIP(lookup.address)) throw new Error("Resolves to private IP, blocked.");
  } catch (err) {
    throw new Error(`SSRF Validation failed: ${err.message}`);
  }
};

const fetchWithLimits = async (url, maxBytes, responseType = 'arraybuffer') => {
  await checkSSRF(url);
  
  const response = await axios.get(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,application/pdf,*/*;q=0.8'
    },
    responseType: 'stream',
    timeout: 10000,
    maxRedirects: 5
  });

  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    
    response.data.on('data', (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        response.data.destroy();
        reject(new Error(`Size limit exceeded: ${maxBytes} bytes.`));
      } else {
        chunks.push(chunk);
      }
    });

    response.data.on('end', () => {
      const buffer = Buffer.concat(chunks);
      resolve({
        data: responseType === 'string' ? buffer.toString('utf-8') : buffer,
        contentType: response.headers['content-type'] || '',
      });
    });

    response.data.on('error', (err) => reject(err));
  });
};

async function scrapeTextFromUrl(url, depth = 0) {
  if (depth > 2) return { text: "", images: [] }; // Max iframe depth
  
  try {
    const { data: buffer, contentType } = await fetchWithLimits(url, MAX_DOC_SIZE);
    
    // 1. Direct Image
    if (contentType.startsWith('image/')) {
      if (buffer.length > MAX_IMG_SIZE) return { text: "Image too large.", images: [] };
      const base64 = buffer.toString('base64');
      const mimeType = contentType.split(';')[0];
      return { text: `Image uploaded directly from ${url}`, images: [{ mimeType, data: base64 }] };
    }

    // 2. PDF
    if (contentType.includes('application/pdf')) {
      const pdfData = await pdfParse(buffer);
      let text = pdfData.text.replace(/\s+/g, ' ').trim();
      if (text.length > MAX_TEXT_LEN) text = text.substring(0, MAX_TEXT_LEN) + '...';
      return { text: `[Source: ${url}]\n${text}`, images: [] };
    }

    // 3. HTML Page
    if (!contentType.includes('text/html')) {
      return { text: `Unsupported content type: ${contentType}`, images: [] };
    }

    const html = buffer.toString('utf-8');
    const $ = cheerio.load(html);
    
    let images = [];
    let bestImgUrl = null;
    let extractedText = `[Source: ${url}]\n`;
    
    // Find all images including lazy-loaded
    const imgTags = $('img').toArray();
    for (const img of imgTags) {
      const $img = $(img);
      const src = $img.attr('src') || $img.attr('data-src') || $img.attr('data-lazy') || '';
      const alt = $img.attr('alt') || '';
      
      if (!src || src.includes('.svg') || src.includes('data:image')) continue;
      
      // Heuristic: calendar, schedule, 20xx year
      const isCalendar = /(calendar|schedule|20\d{2}|year)/i.test(src) || /(calendar|schedule|20\d{2}|year)/i.test(alt);
      if (isCalendar) {
        bestImgUrl = src;
        break;
      }
    }
    
    if (!bestImgUrl && imgTags.length > 0) {
      for (const img of imgTags) {
        const src = $(img).attr('src') || $(img).attr('data-src');
        if (src && !src.includes('.svg') && !src.includes('data:image')) {
          bestImgUrl = src;
          break;
        }
      }
    }

    if (bestImgUrl) {
      try {
        const absoluteUrl = new URL(bestImgUrl, url).href;
        const { data: imgBuffer, contentType: imgContentType } = await fetchWithLimits(absoluteUrl, MAX_IMG_SIZE);
        
        if (imgContentType.startsWith('image/')) {
          const base64 = imgBuffer.toString('base64');
          const mimeType = imgContentType.split(';')[0];
          images.push({ mimeType, data: base64 });
        }
      } catch (err) {
        console.warn(`Failed to fetch image ${bestImgUrl}:`, err.message);
      }
    }
    
    // Iframe extraction (e.g. Google Calendar embeds)
    const iframes = $('iframe').toArray();
    for (const iframe of iframes) {
      const src = $(iframe).attr('src');
      if (src && (src.includes('calendar') || src.includes('schedule') || src.includes('google.com/calendar'))) {
        try {
          const iframeAbsoluteUrl = new URL(src, url).href;
          const iframeResult = await scrapeTextFromUrl(iframeAbsoluteUrl, depth + 1);
          extractedText += `\n[Iframe Content: ${iframeAbsoluteUrl}]\n${iframeResult.text}\n`;
          if (iframeResult.images.length > 0 && images.length === 0) {
            images = iframeResult.images;
          }
        } catch (e) {
          console.warn(`Failed to scrape iframe ${src}:`, e.message);
        }
      }
    }
    
    // JSON blob extraction (often used by Next.js or Nuxt or JSON-LD for SEO)
    $('script').each((i, el) => {
      const type = $(el).attr('type');
      const id = $(el).attr('id');
      if (type === 'application/ld+json' || id === '__NEXT_DATA__' || id === '__NUXT_DATA__') {
        const scriptContent = $(el).html();
        if (scriptContent) {
           extractedText += `\n[JSON Data]\n${scriptContent.substring(0, 5000)}\n`; // Avoid dumping huge states
        }
      }
    });

    // Clean up HTML for text extraction
    $('script, style, noscript, iframe, img, svg, video, audio, canvas, map, object, embed, footer, header, nav').remove();
    let text = $('body').text() || $.text();
    text = text.replace(/\s+/g, ' ').trim();
    
    extractedText += text;
    
    if (extractedText.length > MAX_TEXT_LEN) {
      extractedText = extractedText.substring(0, MAX_TEXT_LEN) + '...';
    }

    return { text: extractedText, images };
  } catch (error) {
    console.error(`Error scraping URL ${url}:`, error.message);
    throw new Error(`Failed to scrape website: ${error.message}`);
  }
}

module.exports = { scrapeTextFromUrl };
