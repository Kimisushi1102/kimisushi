const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const { createCanvas } = require('canvas');
const Tesseract = require('tesseract.js');
const fs = require('fs');
const path = require('path');

const pdfPath = 'C:/Users/hoang/AppData/Local/Temp/menu.pdf';
const outDir = 'C:/Users/hoang/AppData/Local/Temp/menu_ocr';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

async function renderPage(pageNum) {
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const doc = await pdfjsLib.getDocument({ data }).promise;
    const page = await doc.getPage(pageNum);
    const scale = 2.5;
    const viewport = page.getViewport({ scale });
    const canvas = createCanvas(viewport.width, viewport.height);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport }).promise;
    const buf = canvas.toBuffer('image/png');
    const imgPath = path.join(outDir, `page_${pageNum}.png`);
    fs.writeFileSync(imgPath, buf);
    return imgPath;
}

async function ocrImage(imgPath, pageNum) {
    console.log(`[OCR] Processing page ${pageNum}...`);
    const result = await Tesseract.recognize(imgPath, 'deu+eng', {
        logger: m => {
            if (m.status === 'recognizing text') process.stdout.write(`\r[OCR] Page ${pageNum}: ${Math.round(m.progress * 100)}%`);
        }
    });
    console.log(`\n[OCR] Page ${pageNum} done.`);
    return result.data.text;
}

async function main() {
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const doc = await pdfjsLib.getDocument({ data }).promise;
    console.log(`PDF has ${doc.numPages} pages\n`);

    let fullText = '';
    for (let i = 1; i <= doc.numPages; i++) {
        const imgPath = await renderPage(i);
        const text = await ocrImage(imgPath, i);
        fullText += `\n===== PAGE ${i} =====\n` + text;
        fs.writeFileSync(path.join(outDir, `page_${i}.txt`), text);
    }

    fs.writeFileSync(path.join(outDir, 'full_menu.txt'), fullText);
    console.log('\n\n[ALL DONE] Full text saved to', path.join(outDir, 'full_menu.txt'));
}

main().catch(e => console.error(e));
