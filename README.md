# Yelkən Şüvəlan — elektron menyu

Mobil üçün hazırlanmış restoran e-menyusu: qonaq QR kodu açır və menyunu dərhal görür.
Səbət, sifariş, ödəniş və qeydiyyat yoxdur. Menyu **/menu**, kök **/** avtomatik oraya yönləndirir.

## Stack
- **Frontend:** React 18 + Vite, öz CSS (dizayn tokenləri `src/index.css`), React Router (`/menu`, `/admin`)
- **Data & auth:** Base44 backend funksiyaları — `menuApi` (yalnız oxuma, publik) və `menuAdmin` (imzalı token tələb edir)
- **Hosting:** statik build (Vercel / istənilən statik host)

## Data
- 18 kateqoriya (PDF sırası ilə), 115 mövqe, 4 variant
- Qiymətlər ədəd kimi saxlanılır (2.50 → 2.50), valyuta `₼`
- PDF-də qeyri-müəyyən qiymətlər (`15/25 ₼`, `6 / 5 ₼`) `priceRaw` sahəsində saxlanılır və admin-də «yoxlama» siyahısına düşür
- Təkrar import dublikat yaratmır (`itemId` / `key` üzrə upsert)

## Təhlükəsizlik
- Qonaq yalnız oxuyur. Yazma əməliyyatları `menuAdmin`-də HMAC ilə imzalanmış sessiya tokeni tələb edir; tokensiz və saxta tokenli sorğular **401** alır
- Şifrə PBKDF2-SHA256 (100 000 iterasiya) ilə saxlanılır, açıq mətn yoxdur
- 6 uğursuz cəhddən sonra 15 dəqiqə bloklama
- İlk admin bir dəfəlik kod, e-poçt və şifrə ilə yaradılır; kod istifadədən sonra silinir
- Publik cavabdan `reviewNote`, `needsReview`, `imageKey` kimi daxili sahələr çıxarılır

## Admin
`/admin` — menyu, kateqoriya, qiymət, sıra, foto (4:3 kadr + fokus nöqtəsi), tərcümə,
«müvəqqəti yoxdur», logo/kontakt/servis haqqı, yoxlama siyahısı və JSON/CSV eksport.

## Fotolar
Hazırda foto yoxdur — neytral brend placeholder göstərilir (`/logo.svg`). Admin paneldən yüklənən
foto brauzerdə 4:3 kadrlanır, 1600 px əsas və 480 px miniatür kimi sıxılır.

## Build
```bash
npm install
npm run dev      # http://localhost:5173/menu
npm run build    # dist/
```
