const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8000;

app.use(cors());
app.use(express.json({ limit: '100mb' }));

console.log('--- SiS & RICH Printer Bridge (V3: AUTO-CUT ENABLED) ---');

app.post('/print-receipt', (req, res) => {
    const { image, printerName, billId } = req.body;
    if (!image) return res.status(400).json({ error: 'No image data' });

    console.log(`[RECEIPT] Printing & Cutting for Bill: ${billId || 'TXN'} to ${printerName || 'XP-80'}`);

    const base64Data = image.replace(/^data:image\/png;base64,/, "");
    const tempImage = path.join(__dirname, 'temp_bill.png');
    
    fs.writeFileSync(tempImage, base64Data, 'base64');

    const actualPrinter = printerName || 'XP-80';
    
    // คำสั่งพิมพ์ภาพ + คำสั่งสั่งใบมีดทำงาน (ESC/POS: GS V 0)
    const psCommand = `
        Add-Type -AssemblyName System.Drawing;
        $image = [System.Drawing.Image]::FromFile('${tempImage}');
        $pd = New-Object System.Drawing.Printing.PrintDocument;
        $pd.PrinterSettings.PrinterName = '${actualPrinter}';
        $pd.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0,0,0,0);
        $pd.add_PrintPage({
            $ev = $args[1];
            $ev.Graphics.DrawImage($image, 0, 0);
            $ev.HasMorePages = $false;
        });
        $pd.Print();
        $image.Dispose();

        # ✂️ คำสั่งตัดกระดาษโดยตรง (Raw ESC/POS Cut Command: GS V 0)
        [char]29 + [char]86 + [char]48 | Out-Printer -Name '${actualPrinter}';
    `.replace(/\n/g, ' ').trim();

    exec(`powershell -Command "${psCommand}"`, (error) => {
        if (error) {
            console.error(`Error printing: ${error.message}`);
            return res.status(500).json({ success: false, error: error.message });
        }
        console.log(`✅ Printed & Cut successfully!`);
        res.json({ success: true });
    });
});

app.get('/', (req, res) => res.send('Bridge V3 Ready'));

app.listen(PORT, () => {
    console.log(`🚀 Bridge V3 (Auto-Cut Version) กำลังรันอยู่ที่พอร์ต ${PORT}`);
    console.log(`🔥 ใบเสร็จจะออกมาเป๊ะและถูกตัดอัติโนมัติแล้วครับ!`);
});
