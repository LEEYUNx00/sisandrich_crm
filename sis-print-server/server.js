const express = require('express');
const cors = require('cors');
const app = express();

// อนุญาตให้หน้าเว็บ POS ยิงข้อมูลเข้ามาได้ (แก้ปัญหา Cross-Origin)
app.use(cors());
// ตั้งค่าให้รับข้อมูลแบบ JSON
app.use(express.json());

// สร้าง Endpoint เลียนแบบของเดิมเป๊ะๆ
app.post('/api/pos/printReceipt', (req, res) => {
    // 1. รับข้อมูล Payload ที่หน้าเว็บส่งมา
    const printData = req.body;

    console.log("ได้รับคำสั่งปริ้นสำหรับเครื่อง:", printData.Printer);
    console.log("พนักงานคิดเงิน:", printData.Infos[2]); // Cashier: Angela

    // 2. ดึงรายการสินค้าออกมาเตรียมจัดหน้า
    const items = printData.Order.Items;

    // 3. ตรงนี้คือจุดที่เราจะใส่โค้ดสั่งเครื่องปริ้น NITA (XP-80C)
    // โดยปกติจะใช้ไลบรารีอย่าง 'node-thermal-printer' เพื่อจัดหน้าและส่งออก USB
    /* printer.alignCenter();
       printer.print(printData.Headers[0]); // ปริ้นคำว่า Sis&Rich
       // ... วนลูปปริ้นรายการสินค้า ...
       printer.cut();
       printer.execute();
    */

    // 4. ส่งสถานะ 200 กลับไปบอกหน้าเว็บว่าปริ้นเสร็จแล้ว (แบบที่ระบบเดิมทำ)
    res.status(200).json({ status: "success", message: "ส่งเข้าเครื่องปริ้นเรียบร้อย" });
});

// เปิดรันเซิร์ฟเวอร์ทิ้งไว้ที่ Port 9090
const PORT = 9090;
app.listen(PORT, () => {
    console.log(`Local Print Server รันแล้วที่ http://localhost:${PORT}`);
});