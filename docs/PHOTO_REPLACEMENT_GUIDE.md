# Replacing the artwork with real photographs

Every picture on the site is stored in the database and uploaded from the admin panel — no
image is baked into the code. To switch from the shipped illustrations to real photographs,
upload a photo in each slot below. Nothing needs to be rebuilt or redeployed.

## Before you start

**Accepted files:** JPG, PNG or WebP, up to **5 MB** each. (Videos: MP4 or WebM up to 48 MB.)

**Two rules that matter more than resolution**

1. **Crop, don't stretch.** Every slot crops the photo to fill its box (centre-weighted), so
   keep the subject near the middle. A photo of any shape works — a portrait photo in a wide
   slot simply crops the top and bottom.
2. **Banner photos sit under a dark blue overlay.** Bright, uncluttered pictures read well;
   dark or busy ones disappear. Detail belongs on the right-hand side, because the heading
   covers the left.

**Resolution:** roughly 2× the display size is plenty. Anything from a modern phone is fine.
Export at quality 80–85 to stay under 5 MB.

---

## The slots

### Home page

| What | Where to change it | Shape | Suggested size | Photograph to use |
| --- | --- | --- | --- | --- |
| Hero slides (3) | Site Content → **Hero** | Wide | 1920 × 1080 | Your yard, a delivery in progress, a customer site |
| About section | Home Page → **About** | Wide | 1400 × 1000 | Your premises or team at work |
| Safety section | Home Page → **Safety** | Wide | 1600 × 1100 | A staff member checking a regulator or manifold |

The safety photo is also used, blurred behind a dark overlay, as that section's background.

### Page banners

| Page | Where to change it | Shape | Suggested size |
| --- | --- | --- | --- |
| Products | Products → **Page Content** | Very wide | 1920 × 700 |
| Our Journey | Journey → **Page Content** | Very wide | 1920 × 700 |
| Achievements | Achievements → **Page Content** | Very wide | 1920 × 700 |
| Gallery | Gallery → **Page Content** | Very wide | 1920 × 700 |
| Sustainability | Sustainability → **Page Content** | Very wide | 1920 × 700 |
| Contact | Site Content → **Contact & Footer** | Very wide | 1920 × 700 |

### Products

Change each product's image under **Products → (open the product)**. Shape: wide, about
1400 × 1000. Photograph the cylinder **where it is used**, not on its own — that is what the
current artwork shows and what tells a customer it is meant for them:

| Product | Photograph to use |
| --- | --- |
| 19 kg Commercial | A restaurant kitchen range with the cylinders beside it |
| 35 kg Commercial | A canteen or hotel kitchen line with a cylinder bank |
| 47.5 kg Industrial | A manifold bank piped into a plant burner or furnace |
| 5 kg (if you add it) | A tea stall or small shop counter with the cylinder underneath |

### Gallery

**Gallery → (open each item).** Shape: wide, about 1200 × 900. Videos additionally need a
**thumbnail** image — the still shown before the video plays.

### Other

| What | Where to change it | Notes |
| --- | --- | --- |
| Journey milestones | Journey → (open a milestone) | Optional per milestone |
| Achievements | Achievements → (open an entry) | Certificates, award photos |
| Sustainability cards | Sustainability → (open a card) | Optional per card |
| Sustainability story | Sustainability → **Page Content** | Wide, ~1400 × 1000 |
| MBGA and Bharatgas logos | Site Content → **Branding** | PNG with a transparent background is best |

---

## After uploading

Always fill in the **alt text / image description** field next to each upload. It is read
aloud by screen readers and shown if a photo ever fails to load.

Then run:

```
npm run audit:content
```

It confirms every image the site references actually exists. `0 failures` means everything
resolves.

## Keeping the illustrations

The shipped artwork stays in `public/assets/industrial/`. If you replace a photo and want the
illustration back, paste its path into the image field, for example:

```
/assets/industrial/use-restaurant.svg
```

Plain cylinder renders without a background scene are also available:
`/assets/industrial/cylinder-19kg.svg`, `cylinder-35kg.svg`, `cylinder-475kg.svg`.
