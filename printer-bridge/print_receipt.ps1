
        Add-Type -AssemblyName System.Drawing;
        $requested = "XP-80C";
        
        # ค้นหาเครื่องพิมพ์ที่ชื่อตรงที่สุด หรือมีคำสำคัญ และต้องไม่ถูกลบ
        $printer = Get-Printer | Where-Object { ($_.Name -eq $requested -or $_.Name -like "*POS80*" -or $_.Name -like "*XP-80*") -and ($_.PrinterStatus -ne "PendingDeletion") } | Select-Object -First 1;
        
        if ($null -eq $printer) {
            throw "Printer not found: $requested"
        }

        $pName = $printer.Name;
        Write-Host "FOUND_PRINTER: $pName";

        $image = [System.Drawing.Image]::FromFile('C:\\Users\\liliy\\Desktop\\sisandrich\\WEB_CRM_POS\\printer-bridge\\temp_bill.png');
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
    