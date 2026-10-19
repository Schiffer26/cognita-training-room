/**
 * Centralized asset paths for COGNĪTA.
 * Change a path here to update it across the entire application.
 * All paths are relative to the /public directory.
 */
export const ASSETS = {
  cognitaLogo: "/images/cognita-logo.png",
  dictLogo: "/images/dict-logo.png",
  romanHelmet: "/images/roman-helmet.png",
  binaryWatermark: "/images/binary-watermark.png",
  adminBackground: "/images/admin-background.jpg",
  adminAvatar: "/images/admin-avatar.png",
  userAvatar: "/images/user-avatar.png",
  adminBackgroundside: "/images/adminbackgrounside.png",
  adminBackgroundtop: "/images/adminbackgrountop.png",
} as const;

export type AssetKey = keyof typeof ASSETS;
