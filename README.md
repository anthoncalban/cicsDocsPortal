# 📘 CICS Documents Portal

## 📝 Description
The **CICS Documents Portal** is a secure document management system built for students and administrators of the College of Information and Computer Studies (CICS) at NEU. It provides centralized access to academic documents with strict authentication via Google accounts restricted to `@neu.edu.ph`. The portal ensures efficient document search, download, and monitoring, while maintaining role-based access for admins and students.

---

## 🌐 Live Deployment
- **Link:** [CICS Documents Portal](https://cics-docs-portal.vercel.app/)

---

## 📌 Features
- 🔐 **Secure Login**: Google Auth restricted to `@neu.edu.ph` domain.  
- 👩‍🎓 **Student Role**:  
  - First-time entry requires supplying undergraduate program.  
  - Search and download CICS PDF documents.  
- 🛠️ **Admin Role**:  
  - Upload and manage documents.  
  - Block student accounts.  
  - Monitor student activity (logins, downloads).  
  - Generate statistics (daily, weekly, monthly, or custom periods).  
- 📂 **Document Management**: Organized storage and retrieval of academic files.  
- 📊 **Analytics Dashboard**: Track usage trends and student engagement.  
- ⚠️ **Error Handling**: Error boundaries for reliable user experience.  
- 📱 **PWA Installation**:  
  - **Android (Chrome):** Open app → Add to Home Screen → Install  
  - **iOS (Safari):** Open app → Share → Add to Home Screen → Install  

---

## 🏗️ Tech Stack

| **Layer**            | **Technology**                  |
|-----------------------|---------------------------------|
| Frontend (UI)         | React + TypeScript (Vite)       |
| State Management      | React Context API (AuthContext) |
| Authentication        | Firebase Authentication (Google)|
| Database              | Firestore (NoSQL)               |
| File Storage          | Firebase Storage                |
| Hosting               | Firebase Hosting / Vercel       |
| Configuration         | JSON configs + env.example      |
| Styling               | CSS / Tailwind (optional)       |
| Build Tool            | Vite                            |

---

## 🔄 Application Flows

| **Flow**              | **Purpose**                                                                 | **Steps**                                                                 |
|------------------------|-----------------------------------------------------------------------------|---------------------------------------------------------------------------|
| **Student Login**      | Authenticate students via Google restricted to `@neu.edu.ph`.               | 1. Student clicks login → 2. Google Auth → 3. Domain check → 4. Success → 5. First-time program entry. |
| **Document Search**    | Allow students to find academic PDFs.                                       | 1. Enter keyword → 2. Query Firestore → 3. Display results → 4. Download selected file. |
| **Admin Upload**       | Enable admins to upload and manage documents.                              | 1. Login as Admin → 2. Navigate to dashboard → 3. Upload file → 4. Store in Firebase Storage → 5. Metadata saved in Firestore. |
| **Account Blocking**   | Restrict student access when necessary.                                    | 1. Admin selects student → 2. Update Firestore status → 3. Blocked student denied login. |
| **Analytics Monitoring** | Track student activity and generate reports.                              | 1. Admin dashboard → 2. Select time range → 3. Query Firestore logs → 4. Display charts/statistics. |
| **Error Handling**     | Prevent app crashes and provide fallback UI.                               | 1. Component error occurs → 2. ErrorBoundary catches → 3. Display error message → 4. Log error. |

---

## ⚖️ License
**Academic Integrity & Copyright Notice**  
This project was developed for academic purposes at NEU. Unauthorized copying, adaptation, distribution, or commercial use is strictly prohibited.
