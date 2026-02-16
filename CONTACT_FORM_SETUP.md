# Contact Form Setup Guide

## Current State & Context (2026-02-16)

### What's Been Done:
✅ **Frontend Changes** (`/web/src/pages/home.tsx`):
- Added `useState` import for form state management
- Converted `ContactSection` from arrow function component to function component with state
- Added form submission handler with loading/success/error states
- Integrated Web3Forms API (requires access key to be added)
- Added form field names (name, email, subject, message) with `required` attributes
- Added visual feedback for submission status

✅ **Backend Changes** (`/api/src/controllers/contact.ts`):
- Created new contact controller with POST `/contact` endpoint
- Implemented input validation (required fields, email format)
- Added 3 email sending options (all commented out, ready to uncomment):
  - Resend (lines 18-42) - Modern email API
  - Nodemailer (lines 44-64) - SMTP-based
  - Console log placeholder (lines 67-68) - Currently active for testing
- Error handling and logging

✅ **Server Registration** (`/api/src/server.ts`):
- Imported contact controller
- Registered contact controller in Fastify server
- CORS already configured to allow frontend requests

### Current Implementation
The contact form at `/#contact` has been updated with email functionality.

**Status:** Ready for deployment once email service is chosen and configured.

**Action Required:** Choose email service option and configure API keys (see options below).

## Option 1: Web3Forms (Easiest - No Backend Required)

### Steps:
1. Get your free access key:
   - Visit https://web3forms.com
   - Enter `demo@inblock.io`
   - Copy the access key from your email

2. Update the form:
   - Open `/web/src/pages/home.tsx`
   - Find line with `'YOUR_WEB3FORMS_ACCESS_KEY'`
   - Replace with your actual key

3. Test:
   - Visit http://localhost:5173/#contact
   - Submit a test message
   - Check demo@inblock.io for the email

### Pros:
- No backend changes needed
- Free (250 emails/month)
- Works immediately
- No email server setup

### Cons:
- Less control over email formatting
- Limited to 250 emails/month on free tier
- Emails sent from Web3Forms domain

---

## Option 2: Backend API with Resend (Production Ready)

### Steps:

1. **Install Resend:**
   ```bash
   cd api
   npm install resend
   ```

2. **Get Resend API Key:**
   - Sign up at https://resend.com
   - Verify your domain (or use test domain for development)
   - Copy your API key

3. **Add to environment variables:**
   ```bash
   # In api/.env
   RESEND_API_KEY=re_your_key_here
   ```

4. **Update the contact controller:**
   - Open `/api/src/controllers/contact.ts`
   - Uncomment the Resend section (lines 18-42)
   - Comment out the console.log placeholder (lines 67-68)

5. **Update frontend to use backend:**
   - Open `/web/src/pages/home.tsx`
   - Replace the fetch URL from:
     ```typescript
     'https://api.web3forms.com/submit'
     ```
   - To your backend:
     ```typescript
     `${process.env.VITE_BACKEND_URL || 'http://localhost:3000'}/contact`
     ```
   - Remove the Web3Forms access_key line

6. **Test:**
   ```bash
   # Start backend
   cd api
   npm run dev

   # Start frontend (in another terminal)
   cd web
   npm run dev

   # Visit http://localhost:5173/#contact and test
   ```

### Pros:
- Full control over email formatting
- Send from your own domain
- Better deliverability
- 3,000 emails/month free
- Better for production

### Cons:
- Requires backend setup
- Need to verify domain for production

---

## Option 3: Backend with Nodemailer (Self-Hosted)

If you want to use your own SMTP server:

1. **Install Nodemailer:**
   ```bash
   cd api
   npm install nodemailer
   npm install -D @types/nodemailer
   ```

2. **Add SMTP credentials to `.env`:**
   ```bash
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=587
   SMTP_SECURE=false
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=your-app-password
   SMTP_FROM=noreply@yourdomain.com
   ```

3. **Update contact controller:**
   - Open `/api/src/controllers/contact.ts`
   - Uncomment the Nodemailer section (lines 44-64)

4. **For Gmail:**
   - Enable 2FA
   - Create an App Password: https://myaccount.google.com/apppasswords
   - Use that as SMTP_PASS

---

## Frontend Code Update (If using Backend)

Replace the `handleSubmit` function in `/web/src/pages/home.tsx`:

```typescript
const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setSubmitStatus('idle');

    const formData = new FormData(e.currentTarget);

    const data = {
        name: formData.get('name'),
        email: formData.get('email'),
        subject: formData.get('subject'),
        message: formData.get('message')
    };

    try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000'}/contact`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });

        const result = await response.json();

        if (result.success) {
            setSubmitStatus('success');
            (e.target as HTMLFormElement).reset();
        } else {
            setSubmitStatus('error');
        }
    } catch (error) {
        console.error('Form submission error:', error);
        setSubmitStatus('error');
    } finally {
        setIsSubmitting(false);
    }
};
```

---

## Recommended Approach

**For Development/Testing:**
- Use Web3Forms (Option 1) - it's the fastest

**For Production:**
- Use Resend (Option 2) - best deliverability and free tier

**For Self-Hosted/Enterprise:**
- Use Nodemailer (Option 3) - full control

---

## Decision Matrix for Boss Review

| Criteria | Web3Forms | Resend | Nodemailer |
|----------|-----------|--------|------------|
| **Setup Time** | 5 minutes | 15 minutes | 30 minutes |
| **Cost (Free Tier)** | 250 emails/month | 3,000 emails/month | Unlimited (SMTP costs) |
| **Sender Email** | Web3Forms domain | @inblock.io | Custom |
| **Deliverability** | Good | Excellent | Depends on SMTP |
| **Control** | Limited | High | Full |
| **Maintenance** | None | Low | Medium |
| **Production Ready** | Yes | Yes (Recommended) | Yes |
| **Backend Changes** | None | Minimal | Minimal |
| **Domain Verification** | Not required | Required for production | Required for SMTP |

### Recommendation Summary:
1. **Quick Launch:** Web3Forms → Simple, works immediately
2. **Best Long-term:** Resend → Professional, scalable, great developer experience
3. **Full Control:** Nodemailer → If you already have SMTP infrastructure

### Next Steps After Decision:
- [ ] Boss chooses email service option
- [ ] Configure API keys/credentials in `.env`
- [ ] Uncomment relevant code in `/api/src/controllers/contact.ts`
- [ ] Update frontend if using backend (Option 2 or 3)
- [ ] Test on staging environment
- [ ] Deploy to production

---

## Troubleshooting

### Web3Forms not working?
- Check access key is correct
- Check browser console for CORS errors
- Verify demo@inblock.io is spelled correctly

### Backend not receiving requests?
- Check backend is running on correct port
- Verify CORS is configured in `/api/src/server.ts`
- Check frontend is pointing to correct backend URL

### Emails not sending (Resend)?
- Verify API key is correct
- Check you've verified your domain
- Check Resend dashboard for logs

### Gmail SMTP not working?
- Enable 2FA
- Use App Password, not regular password
- Check "Less secure apps" setting
