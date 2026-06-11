# MG Beauty Gallery Spa Booking System

A modern appointment booking and admin management web app for a spa and wellness business.

## Features

- Customer booking flow with service selection, date/time, contact details, terms acceptance, and deposit calculation.
- Configurable admin deposit percentage and cancellation policy.
- Pending-payment appointments until deposit payment is confirmed.
- Mobile Money and card payment records.
- Terms acceptance records with timestamp and policy snapshot.
- Admin dashboard for bookings, deposits, policy updates, approval, rescheduling, cancellation, and CSV export.
- SQL migration included for moving from local JSON storage to a production database.

## Run Locally

```powershell
npm start
```

Open `http://localhost:3000`.

## GitHub Pages Demo

The customer and admin screens can run on GitHub Pages as a static demo. Because GitHub Pages cannot run the Node API, the hosted demo stores test bookings in the browser's localStorage. Use the local Node server or a server host such as Render, Railway, or Vercel for real shared bookings, payments, and notifications.

## Production Notes

The current implementation uses `data/spa-booking.json` so the system works immediately without installing a database. For production, connect the models to PostgreSQL, MySQL, or SQLite using `database/migrations/001_spa_booking_schema.sql`.

Payment gateways and notification providers are represented as transaction and notification records. Connect them to providers such as Paystack, Hubtel, Flutterwave, WhatsApp Cloud API, or an email service before taking live payments.
