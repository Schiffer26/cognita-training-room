# COGNĪTA Asset Replacement Guide

All image assets are stored in `public/images/`. Change asset paths centrally in `src/config/assets.ts`.

## Asset List

| Filename | Purpose | Dimensions | Format | Transparency |
|---|---|---|---|---|
| `cognita-logo.png` | COGNĪTA branding logo shown in headers | 200×60 px | PNG | Yes |
| `dict-logo.png` | DICT Iligan institutional logo | 120×120 px | PNG | Yes |
| `roman-helmet.png` | Admin entry icon (upper-right corner) | 28×28 px | PNG | Yes |
| `binary-watermark.png` | Circular binary watermark for welcome page | 600×600 px | PNG | Yes |
| `admin-background.jpg` | Historical background for admin dashboard | 1920×1080 px | JPG | No |
| `admin-avatar.png` | Default admin profile picture | 100×100 px | PNG | Yes |
| `user-avatar.png` | Default respondent profile icon | 100×100 px | PNG | Yes |

## How to Replace an Asset

1. Open VS Code.
2. Navigate to `public/images/`.
3. Right-click the placeholder file you want to replace.
4. Delete the placeholder file.
5. Drag your new image into the `public/images/` folder.
6. **Important:** Name your file exactly the same as the placeholder (e.g., `dict-logo.png`).
7. Restart the development server (`npm run dev`).
8. Refresh your browser to see the new image.

## If You Want Different Filenames

1. Place your image in `public/images/`.
2. Open `src/config/assets.ts` in VS Code.
3. Update the path for the relevant asset.
4. Save the file. The application will use your new filename.

## Notes

- PNG format with transparency is recommended for logos and icons.
- JPG format is fine for the admin background image.
- The application displays CSS fallbacks if an image fails to load, so broken-image icons will not appear.
- Replacing an image does not require code changes if you keep the same filename.
