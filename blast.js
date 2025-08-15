const XLSX = require('xlsx');
const axios = require('axios');

// const workbook = XLSX.readFile('data.xlsx');
const workbook = XLSX.readFile('data_Malang_Batu_Jember_Kediri.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(sheet);

(async () => {
    for (let row of data) {
        const nama = row.nama || '';
        const nomor = row.telepon || row.nomor;
        if (!nomor) continue;

        // const pesan = `Dok ${nama}, pasiennya cancel lagi ya? Katanya lupa jadwal.
        const pesan = `Dok, pasiennya cancel lagi ya? Katanya lupa jadwal.
Pernah dengar kalimat ini dari staf Anda?

Atau mungkin...

📁 Rekam medis pasien tercecer di tumpukan map
📆 Jadwal pasien & dokter sering bentrok
📊 Laporan harian masih ditulis manual
📞 Pasien susah diingatkan karena belum ada sistem reminder

Semua itu bikin stres, buang waktu, dan bisa bikin pasien pindah ke klinik lain yang lebih teratur.

💡 Saatnya Anda punya sistem digital layaknya klinik besar & modern.

🦷 Dental Management System dari Digital360
Dirancang khusus untuk klinik gigi agar:

✅ Jadwal rapi, otomatis, & real-time
✅ Notifikasi otomatis via WhatsApp
✅ Rekam medis digital & selalu ready
✅ Semua cabang bisa dipantau dalam 1 dashboard
✅ Tanpa install software rumit – cukup login!

🎁 Coba dulu GRATIS, baru putuskan!
👉 Klik sekarang: digital360.id/dental-management-system
📩 Atau balas "Saya mau lihat demo-nya!"`;

        try {
            const res = await axios.post('http://localhost:3000/send', {
                nomor,
                pesan
            });
            console.log(`✅ ${res.data.message} ke ${nama} (${nomor})`);
        } catch (err) {
            console.log(`❌ Gagal kirim ke ${nama} (${nomor})`);
        }

        // jeda 3 detik
        await new Promise(r => setTimeout(r, 4500));
    }
})();
