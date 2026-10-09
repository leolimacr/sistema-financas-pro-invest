import os
from PIL import Image, ImageFilter
import numpy as np
from scipy.ndimage import binary_fill_holes

base_img_path = 'public/assets/images/brand/icon.png'
img = Image.open(base_img_path).convert('RGB')
w, h = img.size

arr = np.array(img, dtype=float)
r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]

# Background: blue gradient (B is much higher than R, corners are blue)
# Foreground: gold bag, dollar sign, green chart arrow
bg_mask = (b > r + 30) & (b > 70) & (r < 80)

# Invert to get foreground
fg_mask = ~bg_mask

# Fill any holes inside the foreground object
fg_mask = binary_fill_holes(fg_mask)

# Convert mask to grayscale image
mask_img = Image.fromarray((fg_mask * 255).astype(np.uint8), mode='L')

# Smooth slightly with Gaussian blur
mask_img = mask_img.filter(ImageFilter.GaussianBlur(1.0))

# Crop bounding box of foreground with padding
bbox = mask_img.getbbox()
print(f"Bounding box: {bbox}")

# Create square canvas for the silhouette icon (e.g. 96x96 for Android notification smallIcon)
# The silhouette should be pure white (255, 255, 255) with alpha from mask
fg_cropped = mask_img.crop(bbox)

target_size = 96
padding = 12  # 12px padding around 72px icon area
icon_size = target_size - (2 * padding)

# Maintain aspect ratio
fw, fh = fg_cropped.size
scale = icon_size / max(fw, fh)
new_w, new_h = int(fw * scale), int(fh * scale)
fg_resized = fg_cropped.resize((new_w, new_h), Image.Resampling.LANCZOS)

# Create final RGBA image: pure white everywhere with alpha channel
small_icon = Image.new('RGBA', (target_size, target_size), (255, 255, 255, 0))
# Create alpha mask channel
alpha_channel = Image.new('L', (target_size, target_size), 0)
offset_x = (target_size - new_w) // 2
offset_y = (target_size - new_h) // 2
alpha_channel.paste(fg_resized, (offset_x, offset_y))

# Put alpha channel into small_icon
small_icon.putalpha(alpha_channel)

# Save ic_stat_fpi.png in drawable folder
os.makedirs('android/app/src/main/res/drawable', exist_ok=True)
out_path = 'android/app/src/main/res/drawable/ic_stat_fpi.png'
small_icon.save(out_path, format='PNG')
print(f"Saved {out_path} at size {small_icon.size}")

# Also replace ic_stat_controla.png with the original brand icon to handle legacy cached notifications
brand_full = Image.open('public/assets/images/brand/icon.png')
brand_full.save('android/app/src/main/res/drawable/ic_stat_controla.png', format='PNG')
print("Updated ic_stat_controla.png with brand icon for legacy compatibility")
