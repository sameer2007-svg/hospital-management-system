# 🏥 MediCare Super Specialty Hospital Management System

A modern, responsive, and full-featured Hospital Management Website & Information Portal built using standard **HTML5**, **CSS3**, and **Vanilla JavaScript (ES6+)** with a relational **MySQL/MariaDB** schema.

---

## 📋 Academic Project Modules & Submission Index

| Module | Title | Format Required | File / Submission Link | Action / How to Access |
| :---: | :--- | :---: | :--- | :--- |
| **Module 1** | **Create Bio-Data using HTML** | 📄 **PDF** | [`module1_biodata.html`](./module1_biodata.html) | Open in Chrome/Edge & click **"Print / Save as PDF"** |
| **Module 2** | **Your Login Page** | 🔗 **Link** | [`module2_login.html`](./module2_login.html) | Direct link to standalone portal login page |
| **Module 3** | **Patient Registration Page** | 📄 **PDF** | [`module3_registration.html`](./module3_registration.html) | Open in Chrome/Edge & click **"Print / Save as PDF"** |
| **Module 4** | **Validation Scripting Page** | 📄 **PDF** | [`module4_validation.html`](./module4_validation.html) | Open in Chrome/Edge & click **"Print / Save as PDF"** |
| **Module 5** | **Database Table Creation** | 🔗 **Link** | [`module5_database.html`](./module5_database.html) & [`module5_database.sql`](./module5_database.sql) | Interactive SQL Schema viewer & downloadable `.sql` DDL |
| **Module 6** | **Overall Final Project (Full Website)** | 🔗 **Link** | [`index.html`](./index.html) | Complete Public Hospital Website + Management Portal |

---

## 🚀 How to Run Locally

### Option 1: Direct Browser Launch
Simply double-click [`index.html`](./index.html) or right-click & select **Open with Google Chrome** / **Microsoft Edge**.

### Option 2: Local Web Server (Recommended)
You can serve the project using any local web server:

```bash
# Using Node.js npx serve
npx serve .

# Or using Python 3
python -m http.server 8080
```
Then visit: `http://localhost:8080` in your web browser.

---

## 🖨️ How to Generate Module PDFs (Modules 1, 3, 4)

1. Open [`module1_biodata.html`](./module1_biodata.html), [`module3_registration.html`](./module3_registration.html), or [`module4_validation.html`](./module4_validation.html) in your browser.
2. Click the blue **"Print / Save as PDF"** button at the top (or press `Ctrl + P`).
3. Under **Destination**, select **"Save as PDF"**.
4. Set **Paper size** to **A4**, and enable **Background graphics**.
5. Click **Save** to export your submission PDF!

---

## 🐙 How to Push to GitHub

To upload this project to GitHub and share links with your teacher/examiner:

1. Create a new repository on [GitHub](https://github.com/new) named `hospital-management-system`.
2. Open terminal in this folder and run:

```bash
git init
git add .
git commit -m "MediCare Hospital Management System - All 6 Modules"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/hospital-management-system.git
git push -u origin main
```

3. Enable **GitHub Pages** (Settings &rarr; Pages &rarr; Source: `main` branch) to get a free live URL:
   `https://YOUR_USERNAME.github.io/hospital-management-system/`

---

## 🌟 Key Features

- **Full Public Hospital Website**: Hero banner, 24x7 emergency contacts, clinical specialties, doctor directory, patient testimonials, and footers.
- **Multi-Step Patient Registration**: Multi-step wizard collecting personal demographics, medical history, emergency contacts, and insurance.
- **Client-Side Validation**:
  - Name fields automatically block digits (`0-9`) on keystroke.
  - Phone and pincode fields block alphabetic characters on keystroke.
  - Inline error feedback with shake animations.
- **Appointment Scheduling**: Filter doctors by department and book available slots.
- **Invoicing & Billing**: Calculates consultation fees, lab tests, room charges, and tax with printable invoices.
- **ACID-Compliant Relational Database**: 6 relational tables with primary keys, foreign keys, and indexes.
