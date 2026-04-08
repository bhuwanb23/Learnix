# Font Standardization Guide

## ✅ What Has Been Updated

### 1. **Theme Configuration** (`constants/theme.js`)
- Updated `TYPOGRAPHY.fontFamily` to use Plus Jakarta Sans and Manrope
- Added comprehensive font mappings for headlines and body text

### 2. **Font Constants** (`constants/fonts.js`) - NEW FILE
- Created centralized font constants
- Provides `FONTS`, `FONT_STYLES`, and `getFont()` helper
- Ready to import and use in any component

### 3. **Updated Components**
✅ `users/students/components/StudentHeader.js` - Fixed Inter → PlusJakartaSans/Manrope
✅ `users/students/pages/dashboard/components/*` - All dashboard components updated
✅ `users/students/pages/profile/components/Achievements.js` - Fixed Inter fonts
✅ `App.js` - Fixed null return issue

## 📋 Font Usage Rules

### **Plus Jakarta Sans** - For Headlines & Titles
Use for: Page titles, section headers, important labels
- `PlusJakartaSans-Bold` - Main headings
- `PlusJakartaSans-ExtraBold` - Hero titles
- `PlusJakartaSans-SemiBold` - Sub-headings

### **Manrope** - For Body Text
Use for: Descriptions, paragraphs, secondary text
- `Manrope-Regular` - Body text
- `Manrope-Medium` - Slightly emphasized text
- `Manrope-SemiBold` - Labels, captions
- `Manrope-Bold` - Emphasized body text

## 🚀 How to Use in New Components

### Method 1: Direct Usage (Recommended)
```javascript
import { FONTS } from '../../../../constants/fonts';

<Text style={{ fontFamily: FONTS.headline, fontSize: 24 }}>Title</Text>
<Text style={{ fontFamily: FONTS.body, fontSize: 14 }}>Body text</Text>
```

### Method 2: Using Theme
```javascript
import { TYPOGRAPHY } from '../../../../constants/theme';

<Text style={{ fontFamily: TYPOGRAPHY.fontFamily.headline }}>Title</Text>
<Text style={{ fontFamily: TYPOGRAPHY.fontFamily.body }}>Body text</Text>
```

### Method 3: Using FONT_STYLES
```javascript
import { FONT_STYLES } from '../../../../constants/fonts';

<Text style={[FONT_STYLES.h2, { color: '#000' }]}>Heading 2</Text>
<Text style={[FONT_STYLES.body, { color: '#666' }]}>Body paragraph</Text>
```

## 🔄 Batch Update Remaining Files

Run the PowerShell script to update all remaining files:

```powershell
cd d:\projects\apps\Learnix\learnix
.\update-fonts.ps1
```

This will automatically replace:
- `Inter-Bold` → `PlusJakartaSans-Bold`
- `Inter-SemiBold` → `PlusJakartaSans-SemiBold`
- `Inter-Medium` → `Manrope-Medium`
- `Inter-Regular` → `Manrope-Regular`
- System fonts → Proper font families

## 📝 Manual Updates Needed

After running the script, check these files manually:
- `users/students/pages/profile/components/HabitTracker.js`
- `users/students/pages/profile/components/CounselorBooking.js`
- `users/students/pages/profile/components/FeePayment.js`
- `users/students/pages/assignments/components/*`
- `users/students/pages/events/components/*`
- `users/teachers/**/*.js`
- `users/admin/**/*.js`

## ✨ Font Loading

Fonts are loaded in `App.js` using `expo-font`:
```javascript
await Font.loadAsync({
  'PlusJakartaSans-Regular': require('./assets/fonts/PlusJakartaSans-Regular.ttf'),
  'PlusJakartaSans-Bold': require('./assets/fonts/PlusJakartaSans-Bold.ttf'),
  // ... all variants
  'Manrope-Regular': require('./assets/fonts/Manrope-Regular.ttf'),
  'Manrope-Bold': require('./assets/fonts/Manrope-Bold.ttf'),
  // ... all variants
});
```

## 🎯 Design Consistency

This matches the HTML design from:
- `prototype/new/student/dashboard.html`
- `prototype/new/student/events.html`
- All other prototype HTML files

**HTML Font Spec:**
```html
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet" />
```

## ✅ Verification

After updates, verify:
1. No more `Inter-*` fonts in the codebase
2. No more `System` fonts in the codebase
3. All text uses either PlusJakartaSans or Manrope
4. Headlines use PlusJakartaSans
5. Body text uses Manrope
