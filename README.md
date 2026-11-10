# HCM Lite — Human Capital Management System

A modern Human Capital Management (HCM) system designed to simplify and manage essential HR operations through a centralized platform.

HCM Lite helps organizations manage employees, track attendance, process leave requests, handle payroll, and provide employees with access to their salary payslips.

## 🚀 Live Demo

- **Frontend:** https://hcm-lite-pi.vercel.app/
- **Backend API:** https://hcm-lite-3nbd.vercel.app/api
- **GitHub Repository:** https://github.com/Sardar-9873/hcm-lite

## ✨ Key Features

### 👥 Employee Management
- Create and manage employee profiles.
- Maintain employee information and employment details.
- Manage employee accounts and roles.
- Support different employment statuses.

### 🔐 Authentication & Authorization
- Secure user authentication using JWT.
- Role-based access control.
- Separate access for Admin, HR, and Employee.
- Protected API routes.

### 📅 Attendance Management
- Employee check-in and check-out.
- Attendance tracking.
- Attendance records and history.
- Camera-based attendance functionality.

### 📝 Leave Management
- Submit leave requests.
- Manage and review employee leave applications.
- Track leave request statuses.
- Calculate unpaid leave deductions for payroll.

### 💰 Payroll Management
- Generate monthly payroll drafts.
- Calculate salary components and deductions.
- Calculate applicable income tax.
- Account for working days, absences, half-days, and unpaid leaves.
- Finalize payroll runs.
- Lock finalized payroll to prevent unauthorized regeneration.

### 📄 Employee Payslips
- Employees can view their own payslips.
- Generate and download payslips in PDF format.
- Restrict access to other employees' payslips.

### 🤖 AI Assistant
- Integrated AI-powered assistant using Google Gemini.
- Helps users interact with HR-related functionality.
- Backend integration for AI requests.

### 📊 Audit Logging
- Maintain records of important system activities.
- Improve accountability and traceability.

## 🛠️ Technology Stack

| Category | Technologies |
|---|---|
| Frontend | Next.js, React |
| Backend | Node.js, Express.js |
| Database | MongoDB |
| ODM | Mongoose |
| Authentication | JSON Web Token (JWT) |
| AI Integration | Google Gemini API |
| API Communication | Axios |
| PDF Generation | PDF generation on backend |
| Deployment | Vercel, Abasthan |

## 👤 User Roles

| Role | Responsibilities |
|---|---|
| Admin | Manage administrative operations and finalize payroll |
| HR | Manage employees and prepare payroll drafts |
| Employee | Access personal dashboard, attendance, leave, and payslips |

## 📁 Project Structure

```text
hcm-lite/
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── admin/
│   │   │   ├── employee/
│   │   │   ├── hr/
│   │   │   ├── login/
│   │   │   └── setup/
│   │   ├── components/
│   │   ├── context/
│   │   └── lib/
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── middleware/
│   │   └── utils/
│   └── package.json
│
└── README.md
```

## ⚙️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Sardar-9873/hcm-lite.git
cd hcm-lite
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Configure your backend environment variables in a `.env` file:

```env
PORT=4000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_api_key
```

Start the backend:

```bash
npm run dev
```

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
```

Create a `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

Start the frontend:

```bash
npm run dev
```

Open your browser:

```text
http://localhost:3000
```

**Note:** Environment variable names should match the configuration used in your project. Never commit API keys, database credentials, or secrets to GitHub.

## 🔒 Security

- JWT-based authentication.
- Role-based route protection.
- Employee-specific payslip authorization.
- Finalized payroll locking.
- Environment-based configuration for sensitive credentials.

## 🎯 Project Objectives

HCM Lite aims to simplify HR operations by bringing employee management, attendance, leave management, payroll processing, and employee self-service into one platform.

The project focuses on practical business logic, secure API development, database management, and real-world application workflows.

## 👨‍💻 Developer

**Sardar M. Sahal Shehzad**

Frontend & Backend Developer

- GitHub: https://github.com/Sardar-9873

---

**Built with dedication, continuous learning, and a focus on solving real-world problems.** 🚀
    
