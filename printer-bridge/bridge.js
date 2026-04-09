const express = require('express');
const cors = require('cors');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 8000;

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '100mb' }));

console.log('--- SiS & RICH Printer Bridge (V3: AUTO-CUT ENABLED) ---');

app.post('/print-receipt', (req, res) => {
    const { image, printerName, billId } = req.body;
    if (!image) return res.status(400).json({ error: 'No image data' });

    const base64Data = image.replace(/^data:image\/png;base64,/, "");
    const tempImage = path.join(__dirname, 'temp_bill.png');
    fs.writeFileSync(tempImage, base64Data, 'base64');

    const requestedPrinter = printerName || 'XP-80C';

    const psScript = `
        Add-Type -AssemblyName System.Drawing;
        $requested = "${requestedPrinter}";
        
        # ค้นหาเครื่องพิมพ์ที่ชื่อตรงที่สุด หรือมีคำสำคัญ และต้องไม่ถูกลบ
        $printer = Get-Printer | Where-Object { ($_.Name -eq $requested -or $_.Name -like "*POS80*" -or $_.Name -like "*XP-80*") -and ($_.PrinterStatus -ne "PendingDeletion") } | Select-Object -First 1;
        
        if ($null -eq $printer) {
            throw "Printer not found: $requested"
        }

        $pName = $printer.Name;
        Write-Host "FOUND_PRINTER: $pName";

        $image = [System.Drawing.Image]::FromFile('${tempImage.replace(/\\/g, '\\\\')}');
        $pd = New-Object System.Drawing.Printing.PrintDocument;
        $pd.PrinterSettings.PrinterName = $pName;
        $pd.DefaultPageSettings.Margins = New-Object System.Drawing.Printing.Margins(0,0,0,0);
        $pd.add_PrintPage({
            $ev = $args[1];
            $targetWidth = $ev.PageBounds.Width;
            $factor = $targetWidth / $image.Width;
            $targetHeight = $image.Height * $factor;
            $ev.Graphics.DrawImage($image, 0, 0, [int]$targetWidth, [int]$targetHeight);
            $ev.HasMorePages = $false;
        });
        $pd.Print();
        $image.Dispose();

        # สั่งตัดกระดาษ
        $lineFeed = [char]10 + [char]10 + [char]10 + [char]10 + [char]10;
        $cutCommand = [char]29 + [char]86 + [char]66 + [char]0;
        $lineFeed + $cutCommand | Out-Printer -Name $pName;
    `;

    const psFile = path.join(__dirname, 'print_receipt.ps1');
    fs.writeFileSync(psFile, psScript, 'utf8');

    exec(`powershell -ExecutionPolicy Bypass -File "${psFile}"`, (error, stdout) => {
        if (error) {
            console.error(`Error printing receipt: ${error.message}`);
            return res.status(500).json({ success: false, error: error.message });
        }
        
        let detected = "Unknown";
        if (stdout && stdout.includes("FOUND_PRINTER:")) {
            detected = stdout.split("FOUND_PRINTER:")[1].trim().split('\n')[0];
        }
        
        console.log(`✅ [RECEIPT] Printed via [${detected}] successfully!`);
        res.json({ success: true, printerUsed: detected });
    });
});

app.post('/print-barcode', (req, res) => {
    const { Printer, Barcode, Name, Price, Qty } = req.body;
    console.log(`[BARCODE] Printing raw TSPL to ${Printer} (Qty: ${Qty})`);
    
    let qtyInt = parseInt(Qty) || 3;
    let actualPrinter = Printer || 'TSC TTP-247';
    
    // ตั้งค่าหน้ากระดาษ (106mm กว้าง, 25mm สูง, เว้นว่าง 2mm)
    let tspl = `SIZE 106 mm, 25 mm\r\nGAP 2 mm, 0 mm\r\nDIRECTION 1\r\nCLS\r\n`;
    
    // ตำแหน่งแกน X สำหรับ 3 ดวงใน 1 แถว (หน่วยเป็น dot: 8 dot = 1 mm)
    // ปรับให้เว้นระยะจากขอบดวง และจัดกลางดวงแต่ละใบมากขึ้น
    const xOffsets = [35, 305, 575]; 
    
    let rows = Math.ceil(qtyInt / 3);
    let remaining = qtyInt;
    
    for (let r = 0; r < rows; r++) {
        tspl += "CLS\r\n";
        let cols = Math.min(3, remaining);
        
        for (let c = 0; c < cols; c++) {
            let startX = xOffsets[c];
            
            // ขยับ Y ลงมาจากเดิม (15 -> 40) เพื่อให้ไม่ชิดขอบบน
            tspl += `TEXT ${startX},40,"2",0,1,1,"${Name || Barcode}"\r\n`;
            
            // ขยับบาร์โค้ดลงมา (50 -> 75) และปรับหน้ากว้างให้นิ่งขึ้น
            tspl += `BARCODE ${startX},75,"128",65,2,0,2,2,"${Barcode}"\r\n`;
            
            // ขยับราคาลงมา (150 -> 175) และจัดเยื้องขวาในดวงนิดหน่อย
            if (Price && Price !== "undefined") {
                tspl += `TEXT ${startX + 30},178,"2",0,1,1,"${Price} .-"\r\n`;
            }
        }
        tspl += "PRINT 1,1\r\n";
        remaining -= 3;
    }

    const tsplFile = path.join(__dirname, 'temp_tspl.txt');
    fs.writeFileSync(tsplFile, tspl, 'ascii');

    // สร้างไฟล์ PowerShell script ชั่วคราวเพื่อความเสถียร (กันคำสั่งยาวเกินไป)
    const psScript = `
        Add-Type -TypeDefinition @"
        using System;
        using System.Runtime.InteropServices;
        public class RawPrinterHelper {
            [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
            public class DOCINFOW {
                [MarshalAs(UnmanagedType.LPWStr)] public string pDocName;
                [MarshalAs(UnmanagedType.LPWStr)] public string pOutputFile;
                [MarshalAs(UnmanagedType.LPWStr)] public string pDataType;
            }
            [DllImport("winspool.Drv", EntryPoint = "OpenPrinterW", SetLastError = true, CharSet = CharSet.Unicode, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
            public static extern bool OpenPrinter([MarshalAs(UnmanagedType.LPWStr)] string szPrinter, out IntPtr hPrinter, IntPtr pd);
            
            [DllImport("winspool.Drv", EntryPoint = "ClosePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
            public static extern bool ClosePrinter(IntPtr hPrinter);
            
            [DllImport("winspool.Drv", EntryPoint = "StartDocPrinterW", SetLastError = true, CharSet = CharSet.Unicode, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
            public static extern bool StartDocPrinter(IntPtr hPrinter, Int32 level, [In, MarshalAs(UnmanagedType.LPStruct)] DOCINFOW di);
            
            [DllImport("winspool.Drv", EntryPoint = "EndDocPrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
            public static extern bool EndDocPrinter(IntPtr hPrinter);
            
            [DllImport("winspool.Drv", EntryPoint = "StartPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
            public static extern bool StartPagePrinter(IntPtr hPrinter);
            
            [DllImport("winspool.Drv", EntryPoint = "EndPagePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
            public static extern bool EndPagePrinter(IntPtr hPrinter);
            
            [DllImport("winspool.Drv", EntryPoint = "WritePrinter", SetLastError = true, ExactSpelling = true, CallingConvention = CallingConvention.StdCall)]
            public static extern bool WritePrinter(IntPtr hPrinter, IntPtr pBytes, Int32 dwCount, out Int32 dwWritten);
            
            public static bool SendStringToPrinter(string szPrinterName, string szString) {
                IntPtr pBytes = Marshal.StringToCoTaskMemAnsi(szString);
                Int32 dwCount = szString.Length;
                Int32 dwWritten = 0;
                IntPtr hPrinter = new IntPtr(0);
                DOCINFOW di = new DOCINFOW();
                bool bSuccess = false;
                di.pDocName = "RAW Label Print"; di.pDataType = "RAW";
                if (OpenPrinter(szPrinterName, out hPrinter, IntPtr.Zero)) {
                    if (StartDocPrinter(hPrinter, 1, di)) {
                        if (StartPagePrinter(hPrinter)) {
                            bSuccess = WritePrinter(hPrinter, pBytes, dwCount, out dwWritten);
                            EndPagePrinter(hPrinter);
                        }
                        EndDocPrinter(hPrinter);
                    }
                    ClosePrinter(hPrinter);
                } else {
                    int err = Marshal.GetLastWin32Error();
                    Console.WriteLine("OpenPrinter failed with Win32 Error: " + err);
                }
                Marshal.FreeCoTaskMem(pBytes);
                return bSuccess;
            }
        }
"@;
        $tspl = [System.IO.File]::ReadAllText('${tsplFile.replace(/\\/g, '\\\\')}');
        $success = [RawPrinterHelper]::SendStringToPrinter('${actualPrinter}', $tspl);
        if (-not $success) {
            throw "Failed to open printer '${actualPrinter}' or send data. Please ensure the printer name is exactly correct and online."
        }
    `;

    const psFile = path.join(__dirname, 'print_raw.ps1');
    fs.writeFileSync(psFile, psScript, 'utf8');

    exec(`powershell -ExecutionPolicy Bypass -File "${psFile}"`, (error) => {
        if (error) {
            console.error(`Error printing barcode: ${error.message}`);
            return res.status(500).json({ success: false, error: error.message });
        }
        console.log(`✅ [BARCODE] TSPL sent successfully to ${actualPrinter}`);
        res.json({ success: true, message: 'TSPL sent successfully' });
    });
});

app.get('/', (req, res) => res.send('Bridge V3 Ready'));

app.listen(PORT, () => {
    console.log(`🚀 Bridge V3 (Auto-Cut Version) กำลังรันอยู่ที่พอร์ต ${PORT}`);
    console.log(`🔥 ใบเสร็จจะออกมาเป๊ะและถูกตัดอัติโนมัติแล้วครับ!`);
});
