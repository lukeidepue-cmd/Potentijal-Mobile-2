# Free trial not showing on Apple purchase sheet – checklist

If App Store Connect has **"Free for the first week"** set for **Potentijal Pro Yearly** (and "Ready to Submit") but the Apple purchase sheet shows **"Starting [date]"** with no trial and no "You will not be charged" trial text, the product Apple is charging is either different from the one with the offer, or the tester is not eligible.

## 1. Product ID must match in all three places

- **App Store Connect**  
  - Open your app → **Subscriptions** → subscription group → **Potentijal Pro Yearly**.  
  - Note the **Product ID** (e.g. `premium_yearly` or `potentijal_pro_yearly`).  
  - This is the subscription that has the introductory offer "Free for the first week".

- **RevenueCat**  
  - Dashboard → **Products** → find the product linked to your **yearly** package.  
  - Its **Identifier** must be **exactly** the same as the Product ID in App Store Connect (same spelling and case).  
  - Dashboard → **Offerings** → your current offering → **Packages** → the **Annual** package must be linked to that product.

- **App**  
  - The app uses RevenueCat’s **current offering** and the **Annual** package.  
  - In dev, the app logs: `[Purchase] Product IDs – monthly: … annual: … annual has intro offer: true/false`.  
  - Run the app, open the paywall, and check the console:  
    - **annual** should be the same Product ID as in App Store Connect.  
    - **annual has intro offer** should be **true** if the product from RevenueCat has the intro offer.  
  - If **annual has intro offer** is **false**, RevenueCat is returning a product that doesn’t have the introductory offer (wrong product in the offering or product not synced from App Store Connect).

If any of these don’t match, fix the Product ID / product link so the **same** identifier is used everywhere. Then the Apple sheet should show the free trial for that product.

## 2. Sandbox tester eligibility

- Apple allows **one** introductory offer per **subscription group** per Apple ID (in production; sandbox has its own rules but can behave similarly).  
- If the TestFlight/sandbox account (e.g. `lukeidepue@icloud.com`) has **already** started or used a free trial for **any** subscription in the same group (e.g. monthly or yearly in that app), the **yearly** product may no longer show the trial.  
- **What to do:**  
  - Create a **new** sandbox tester in App Store Connect (**Users and Access** → **Sandbox** → **Testers**) and sign in with that account on the device when prompted at purchase.  
  - Try the purchase again. If the sheet then shows the 7-day free trial, the issue was eligibility.

## 3. RevenueCat sync and offering

- RevenueCat caches product data from the stores. After adding or changing an introductory offer in App Store Connect, it can take a short time for RevenueCat to reflect it.  
- In RevenueCat dashboard, confirm the **Annual** package in your **current** offering is linked to the product whose ID matches **Potentijal Pro Yearly** in App Store Connect.  
- If you changed the product or the offering, wait a few minutes and try again, or trigger a new fetch (e.g. restart app, reopen paywall).

## 4. Paywall UI vs Apple sheet

- The paywall now shows **"7-day free trial"** under the yearly price only when the **selected** package’s product has an introductory offer (`introPrice` / `introductoryPrice` from the SDK).  
- If you see **"7-day free trial"** on the paywall but the **Apple sheet** still says "Starting [date]" with no trial, the problem is almost certainly **product ID mismatch** or **tester eligibility**.  
- If you **don’t** see "7-day free trial" on the paywall for yearly, then the product returned by RevenueCat for the annual package doesn’t have an intro offer in the data the app receives — fix the product/offering in RevenueCat and/or App Store Connect so the correct product (with the intro offer) is used.

## Summary

1. Make **Product ID** identical in App Store Connect (Potentijal Pro Yearly), RevenueCat (product linked to annual package), and in the app log.  
2. Try a **new sandbox tester** that has never used a trial in this subscription group.  
3. Confirm RevenueCat **Offering** → **Annual** package → product with intro offer; wait for sync if needed.  
4. Use the paywall **"7-day free trial"** line and the console log **annual has intro offer** to confirm the app is getting the right product before opening the Apple sheet.
