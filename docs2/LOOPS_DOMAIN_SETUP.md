# Setting Up Domain Records for Loops

## Do You Need a Domain?

**Yes**, you need to **own a real domain** to send emails through Loops. You cannot use a placeholder domain like `mail.potential.com` if you don't actually own `potential.com`.

---

## Step 1: Purchase a Domain (If You Don't Have One)

If you don't have a domain yet, you'll need to purchase one:

### Recommended Domain Registrars:
- **Namecheap** (cheap, easy to use)
- **Google Domains** (now Squarespace Domains)
- **Cloudflare** (cheap, good DNS management)
- **GoDaddy** (popular, but more expensive)

### What Domain to Buy?
- `potential.com` (if available)
- `potentijal.com` (if you prefer the 'j' spelling)
- `getpotential.com`
- `potentialapp.com`
- Or any variation you like

**Cost**: Usually $10-15/year for a `.com` domain

---

## Step 2: Set Up Your Domain in Loops

1. Go to Loops Dashboard > **Settings** > **Domain** (or **Sending Domain**)
2. Enter your domain: `mail.potential.com` (or whatever subdomain you want)
   - Using a subdomain like `mail.` is recommended
   - This keeps your email separate from your main website
3. Click **"Add Domain"** or **"Verify Domain"**

---

## Step 3: Get DNS Records from Loops

After adding your domain, Loops will show you DNS records you need to add:

### Typical Records Needed:
1. **SPF Record** (TXT record)
   - Example: `v=spf1 include:loops.so ~all`
   - Purpose: Verifies you're authorized to send emails

2. **DKIM Record** (TXT record)
   - Example: `loops._domainkey.potential.com` with a long string value
   - Purpose: Signs your emails to prevent spoofing

3. **MX Record** (optional, for receiving emails)
   - Usually not needed for just sending

4. **CNAME Record** (optional, for tracking)
   - For click/open tracking

---

## Step 4: Add DNS Records to Your Domain

1. **Go to your domain registrar** (where you bought the domain)
2. **Find DNS Management** or **DNS Settings**
3. **Add the records** that Loops provided:

### Example (Namecheap):
1. Go to Namecheap > **Domain List** > Your domain > **Advanced DNS**
2. Click **"Add New Record"**
3. Select **"TXT Record"**
4. Enter the **Host** (usually `@` or `mail`)
5. Enter the **Value** (the SPF/DKIM string from Loops)
6. Click **"Save"**
7. Repeat for all records Loops provided

### Example (Cloudflare):
1. Go to Cloudflare Dashboard > Your domain > **DNS**
2. Click **"Add record"**
3. Select **"TXT"**
4. Enter **Name** and **Content** from Loops
5. Click **"Save"**
6. Repeat for all records

---

## Step 5: Verify Domain in Loops

1. **Wait 5-15 minutes** for DNS records to propagate
2. Go back to Loops Dashboard > **Settings** > **Domain**
3. Click **"Verify Records"** or **"Verify Domain"**
4. Loops will check if the records are set up correctly
5. Once verified, you can start sending emails!

---

## Troubleshooting

### DNS Records Not Verifying?

- **Wait longer**: DNS can take up to 48 hours (usually 5-30 minutes)
- **Check record format**: Make sure you copied the exact values from Loops
- **Check record type**: SPF and DKIM are TXT records, not A or CNAME
- **Check host/subdomain**: Make sure you're adding records to the right subdomain
- **Use DNS checker**: Use a tool like [mxtoolbox.com](https://mxtoolbox.com) to verify records are live

### Can't Find DNS Settings?

- Look for: **DNS Management**, **DNS Settings**, **Advanced DNS**, **DNS Records**
- If using Cloudflare: It's in the **DNS** tab
- If using Namecheap: It's under **Advanced DNS**
- If using GoDaddy: It's under **DNS Management**

### Domain Not Working?

- Make sure you actually own the domain
- Check that the domain is active (not expired)
- Verify you're adding records to the correct domain/subdomain

---

## Alternative: Test Without Domain (Limited)

You **cannot send real emails** without a verified domain, but you can:

1. **Set up the loop structure** (add the "Send email" node)
2. **Design your email template**
3. **Test the workflow** (it just won't send until domain is verified)

**To actually send emails**, you must verify your domain first.

---

## Quick Checklist

- [ ] Purchase domain (if needed)
- [ ] Add domain to Loops Dashboard > Settings > Domain
- [ ] Copy DNS records from Loops
- [ ] Add DNS records to your domain registrar
- [ ] Wait 5-15 minutes for propagation
- [ ] Verify domain in Loops
- [ ] Add "Send email" node to your loop
- [ ] Start the loop!

---

## Cost Estimate

- **Domain**: $10-15/year (one-time purchase)
- **Loops**: Free tier available (check your plan)
- **Total**: ~$10-15/year for domain ownership

---

## Next Steps After Domain Setup

1. ✅ Verify domain in Loops
2. ✅ Add "Send email" node to your loop (the modal mentioned this too!)
3. ✅ Design your welcome email
4. ✅ Start the loop
5. ✅ Test by creating a new account in your app

---

## Need Help?

- **Loops Support**: Check Loops dashboard for support options
- **Domain Registrar Support**: Contact your domain provider
- **DNS Checker**: Use [mxtoolbox.com](https://mxtoolbox.com) to verify records

---

## Summary

**Yes, you need a real domain** to send emails. The process is:
1. Buy domain (if needed) - $10-15/year
2. Add domain to Loops
3. Copy DNS records from Loops
4. Add DNS records to your domain registrar
5. Verify in Loops
6. Start sending!

Once your domain is verified, you can send emails through your loop!

