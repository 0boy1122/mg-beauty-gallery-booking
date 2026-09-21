# Pure Touch Massage Booking System

A modern appointment booking and admin management web app for Pure Touch Massage.

## Features

- Customer booking flow with service selection, date/time, contact details, terms acceptance, and deposit calculation.
- Configurable admin deposit percentage and cancellation policy.
- Pending appointments until the 50% Mobile Money screenshot is verified.
- Mobile Money 50% deposit records with customer screenshot proof.
- Terms acceptance records with timestamp and policy snapshot.
- Admin dashboard for bookings, deposits, policy updates, approval, rescheduling, cancellation, and CSV export.
- SQL migration included for moving from local JSON storage to a production database.
- Transactional email workflow for booking requests, admin decisions, cancellations, reschedules, and appointment reminders.

## Run Locally

```powershell
npm start
```

Open `http://localhost:3000`.

## GitHub Pages Demo

The customer site can run on GitHub Pages as a public service catalogue. On GitHub Pages, the booking form and deposit instructions are hidden and customers are directed to call the spa. No online booking or payment proof is submitted from that hosted site. The admin screen is a browser-local demo only. Deploy the Node API on a backend host for real shared bookings, payments, and notifications.

## Production Notes

The current implementation uses `data/spa-booking.json` so the system works immediately without installing a database. For production, connect the models to PostgreSQL, MySQL, or SQLite using `database/migrations/001_spa_booking_schema.sql`.

Payments are recorded as Mobile Money deposit proof uploads. For production, store screenshots in durable object storage and keep using the admin verification workflow before confirming appointments.

## Email Workflow

The Node server sends email through Resend's HTTPS API without exposing the API key to the browser. Configure these environment variables on the server host:

```text
RESEND_API_KEY=re_replace_with_real_key
EMAIL_FROM=Pure Touch Massage <bookings@your-verified-domain.com>
EMAIL_REPLY_TO=owner@example.com
SPA_NOTIFICATION_EMAIL=owner@example.com
PUBLIC_BASE_URL=https://your-booking-site.example.com
```

Email delivery is intentionally non-blocking. A booking remains saved if the provider is unavailable, and the result is recorded in `notifications` as `sent`, `failed`, or `skipped`. The server checks for due appointment reminders every 15 minutes. A reminder check can also be triggered with `POST /api/notifications/reminders`.

GitHub Pages cannot execute this workflow by itself. Deploy the Node server to a backend host and point the customer site to that backend before accepting real bookings.
