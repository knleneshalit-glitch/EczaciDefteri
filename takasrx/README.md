# TakasRX

Eczaneler arası ilaç/ürün takası için bölge bazlı gruplu platform (MVP).

## Özellikler

- E-posta/şifre ile üye kaydı ve giriş
- Bölge bazlı takas grupları (81 il)
- Grup kurma, katılma isteği, yönetici onayı
- Sadece onaylı grup üyelerinin görebildiği takas ilanları
- İlanlara teklif verme, ilan sahibinin teklifi kabul/red etmesi

## Kurulum

```bash
npm install
cp .env.example .env
npx prisma db push
npm run dev
```

Uygulama `http://localhost:3000` adresinde açılır.

## Teknoloji

- Next.js (App Router, Server Actions)
- Prisma + SQLite
- Tailwind CSS
- jose (JWT session) + bcryptjs (şifre hash)

## Sonraki Adımlar (MVP sonrası)

- Özel mesajlaşma / teklif üzerinden yazışma
- Bildirimler (yeni ilan, yeni teklif)
- Eczacı kimlik doğrulama
- Gizli/davetli gruplar
