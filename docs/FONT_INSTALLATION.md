# Font Installation Instructions

## Required Fonts for Learnix App

You need to download and place the following font files in: `learnix/assets/fonts/`

### Plus Jakarta Sans
Download from: https://fonts.google.com/specimen/Plus+Jakarta+Sans

Required files:
- PlusJakartaSans-Regular.ttf
- PlusJakartaSans-Medium.ttf
- PlusJakartaSans-SemiBold.ttf
- PlusJakartaSans-Bold.ttf
- PlusJakartaSans-ExtraBold.ttf

### Manrope
Download from: https://fonts.google.com/specimen/Manrope

Required files:
- Manrope-Regular.ttf
- Manrope-Medium.ttf
- Manrope-SemiBold.ttf
- Manrope-Bold.ttf
- Manrope-ExtraBold.ttf

## Installation Steps

1. Create the fonts directory:
   ```bash
   mkdir learnix/assets/fonts
   ```

2. Download all font files from Google Fonts links above

3. Place all .ttf files in the `learnix/assets/fonts/` directory

4. The app will automatically load these fonts on startup

## Alternative: Use System Fonts (Temporary)

If you want to test immediately without downloading fonts, the components are configured to fall back to system fonts that closely match:
- Plus Jakarta Sans → System Bold/Semibold
- Manrope → System Regular/Medium

The app will work with system fonts but won't have the exact typography from the HTML prototype.
