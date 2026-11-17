# Deploy (Vercel)

Repo hazırdır: bütün build parametrləri `vercel.json` faylındadır, əlavə env dəyişəni lazım deyil.

1. https://vercel.com/new açın
2. **Import Git Repository** → `yelken-menu` seçin
3. Framework: **Vite** (avtomatik aşkarlanır). Build: `npm run build`, Output: `dist`
4. **Deploy**

Sonra:
- Menyu: `https://<project>.vercel.app/menu` (və ya `/`)
- Admin: `https://<project>.vercel.app/admin`

## Admin girişi
İlk giriş üçün Base44-də `MenuAuth` cədvəlindəki bir dəfəlik `setupCode` lazımdır.
`/admin` səhifəsində kod + e-poçt + şifrə (min. 10 simvol) daxil edin; kod dərhal silinir.
Sonradan şifrə «Доступ» bölməsindən dəyişdirilir.
