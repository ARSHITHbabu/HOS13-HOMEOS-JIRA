# HOS-13: Lean POC/Spike Plan (Day 1-2)

## Context

Task HOS-13 requires POC/spike validation of critical React Native libraries for Family OS. Three theoretical documents exist but need hands-on verification. This plan covers **minimal viable testing** for 5 critical areas to satisfy the task's "POC/spike completed" requirement, plus identifying documentation corrections needed.

---

## Known Document Issues to Verify & Correct

During analysis, these issues were found in the existing documents that the POC results should confirm/update:

| # | Document | Issue | Action |
|---|---|---|---|
| 1 | Library Eval Report vs Calendar Packages Analysis | **Inconsistency:** Library Eval recommends `expo-calendar`, Calendar Analysis recommends `react-native-calendar-events`. These are different libraries. | POC will test `expo-calendar` (first-party Expo). `react-native-calendar-events` was **last published ~5 years ago** -- almost certainly incompatible with Expo SDK 52. **Update both docs** to recommend `expo-calendar` if confirmed. |
| 2 | Calendar Packages Analysis | Recommends `react-native-calendar-events` as "Essential Companion" with "Production Grade Score: 5/5" and "Last Update: November 2024" | **Incorrect.** npm shows last publish was years ago. Score and date need correction. Update to recommend `expo-calendar` as the device calendar API. |
| 3 | Library Eval Report (Section 5) | `react-native-quick-crypto` listed as `~0.7.5` | Verify actual latest version during install. Current latest appears to be `1.0.x`. **Update version** in report. |
| 4 | Library Eval Report | `victory-native` listed as `~37.3.2` | Victory Native XL has moved to `41.x+`. **Update version** in report. |
| 5 | Library Eval Report | No mention of `@shopify/react-native-skia` as a peer dependency for `victory-native` | `victory-native` (XL) requires Skia. **Add note** about this additional native dependency + bundle size impact. |
| 6 | Library Eval Report (Section 4.2) | `react-native-pdf` listed as `~6.7.5` | Verify current version. May have updated. **Update if needed.** |
| 7 | Technical Blockers Report | Lists `react-native-quick-crypto` AES-256-GCM but doesn't mention known issue #798 (incorrect key may not throw error on decrypt) | **Add this as a new LOW-severity blocker** if confirmed during POC-4. |
| 8 | Calendar Packages Analysis | Lists `react-native-big-calendar@4.19.0` | Verify actual latest version. **Update if needed.** |

**These will be confirmed/corrected during POC testing and compiled into a "Document Updates" section at the end.**

---

## Phase 1: Setup (2-3 hours)

### Create Expo Dev Build Project

```bash
npx create-expo-app@latest familyos-poc --template blank-typescript
cd familyos-poc
```

### Install ALL dependencies in one batch (single prebuild)

```bash
# Native modules
npx expo install expo-dev-client expo-camera expo-calendar expo-secure-store
npm install react-native-quick-crypto react-native-pdf react-native-blob-util
npm install @react-native-ml-kit/text-recognition
npm install @config-plugins/react-native-pdf @config-plugins/react-native-blob-util

# JS-only
npx expo install react-native-reanimated react-native-gesture-handler react-native-screens react-native-safe-area-context
npm install react-native-paper zustand @shopify/react-native-skia
npm install react-native-calendars react-native-big-calendar victory-native
```

### Configure app.config.ts with all plugins, then build ONCE

```bash
npx expo prebuild --clean
npx expo run:ios    # or eas build
npx expo run:android
```

---

## Phase 2: Run 5 Critical POCs (Day 1-2)

### POC-1: Calendar (expo-calendar + UI packages)

**Goal:** Verify device calendar read/write works AND calendar UI packages render correctly.

**Test A -- expo-calendar (device sync):**
1. Request calendar permissions
2. List all device calendars (Google, iCloud, etc.)
3. Read events for next 7 days
4. Create one event: "Family Dinner 7pm today"
5. Verify it appears in the native calendar app

**Test B -- Calendar UI:**
1. Render `react-native-calendars` Month view with 5 sample events, color-coded dots
2. Render `react-native-big-calendar` Week timeline with 3 overlapping events

**Deliver:**
- 1 screenshot: month view with colored dots
- 1 screenshot: week timeline with overlapping events
- Verdict: Does expo-calendar read/write work? Do UI packages render cleanly?
- **Document note:** Confirm `react-native-calendar-events` should be replaced with `expo-calendar` in Calendar Packages Analysis

**Effort: 2-3 hours**

---

### POC-2: PDF Viewer

**Goal:** Verify `react-native-pdf` opens and renders a PDF in the app.

**Test:**
1. Load a sample PDF (local asset or remote URL)
2. Pinch-to-zoom
3. Scroll through 3+ pages
4. Verify config plugin works with Expo prebuild

**Deliver:**
- 1 screenshot: PDF rendered in app
- Verdict: Works / doesn't work, any issues
- Note actual version installed vs what docs say (`~6.7.5`)

**Effort: 1-2 hours**

---

### POC-3: Camera + OCR

**Goal:** Verify camera captures an image and ML Kit extracts text from it.

**Test:**
1. Open camera, capture a photo of a printed receipt or any text
2. Run `@react-native-ml-kit/text-recognition` on the captured image
3. Check extracted text -- can you see the store name, amounts, date?
4. If ML Kit fails to link: try `rn-mlkit-ocr` as fallback

**Deliver:**
- 1 screenshot: extracted OCR text displayed on screen
- Verdict: Works / accuracy assessment / fallback needed?
- Note: Is on-device OCR enough, or will Gemini need to post-process?

**Effort: 2-3 hours**

---

### POC-4: AES-256 Encryption

**Goal:** Verify `react-native-quick-crypto` can encrypt and decrypt data with AES-256-GCM.

**Test:**
1. Generate a 32-byte key with `randomBytes(32)`
2. Encrypt a string using `createCipheriv('aes-256-gcm', key, iv)`
3. Decrypt it back and verify it matches
4. Store the key in `expo-secure-store`, retrieve it, re-decrypt
5. Test with wrong key -- does `decipher.final()` throw? (known issue #798)

**Deliver:**
- Verdict: Encrypt/decrypt round-trip works?
- Note actual version installed vs docs (`~0.7.5` may be outdated)
- **Document note:** If issue #798 is confirmed, add as new blocker in Technical Blockers Report

**Effort: 1.5-2 hours**

---

### POC-5: Basic WebSocket

**Goal:** Verify native WebSocket connects and sends/receives messages with Zustand.

**Test:**
1. Connect to a WebSocket echo server (or a simple local one)
2. Send a JSON message, receive the echo
3. Update a Zustand store from the WebSocket message
4. Toggle airplane mode, verify reconnection works

**Deliver:**
- Verdict: WebSocket + Zustand works?
- Note any platform-specific issues

**Effort: 1-2 hours**

---

## Phase 3: Compile Results (2-3 hours)

### Deliverables

**1. POC Results Summary (short verdicts):**

| Area | Library Tested | Verdict | Screenshot | Notes |
|---|---|---|---|---|
| Calendar Sync | expo-calendar | GO / NO-GO | [attached] | |
| Calendar UI | react-native-calendars + big-calendar | GO / NO-GO | [attached] | |
| PDF Viewer | react-native-pdf | GO / NO-GO | [attached] | |
| Camera + OCR | expo-camera + ML Kit | GO / NO-GO | [attached] | |
| Encryption | react-native-quick-crypto | GO / NO-GO | n/a | |
| WebSocket | Native WS + Zustand | GO / NO-GO | n/a | |

**2. Updated Blocker Notes:**
- Any new blockers discovered (add to Technical Blockers Report)
- Confirmation/dismissal of existing blocker assumptions
- Issue #798 verification result

**3. Document Corrections Needed:**
Based on the 8 known issues listed above + anything new found during testing, produce a corrections list:
- Which document
- What to change
- Old value -> new value

These corrections will be applied to update the three existing documents so they are fully accurate.

---

## Total Effort

| Phase | Hours |
|---|---|
| Setup (project + install + prebuild) | 2-3h |
| POC-1: Calendar | 2-3h |
| POC-2: PDF Viewer | 1-2h |
| POC-3: Camera + OCR | 2-3h |
| POC-4: Encryption | 1.5-2h |
| POC-5: WebSocket | 1-2h |
| Compile results + doc corrections | 2-3h |
| **Total** | **~12-18 hours (1.5-2 days)** |

---

## Verification Against HOS-13

After completing this plan, all HOS-13 acceptance criteria will be satisfied:

- [x] External calendar sync libraries researched -- **POC-1 confirms expo-calendar**
- [x] Document preview and PDF viewer validated -- **POC-2**
- [x] Camera and OCR libraries tested -- **POC-3**
- [x] Encryption libraries evaluated -- **POC-4**
- [x] Chart/analytics -- **Covered in Library Eval Report (theoretical); victory-native is well-established, skip POC unless time permits**
- [x] Real-time sync assessed -- **POC-5**
- [x] Technical blockers documented -- **Existing report + new findings**
- [x] Recommended packages list with versions -- **Updated with actual tested versions**
