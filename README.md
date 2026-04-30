# SecureDocs — Secure Document Viewer

A full-stack web application for secure document viewing with strong anti-download and anti-copy protections.

## Tech Stack
- **Frontend**: React 18, PDF.js, react-router-dom, react-hot-toast, lucide-react
- **Backend**: Node.js, Express
- **Database**: MongoDB (Mongoose)
- **Auth**: JWT (JSON Web Tokens)

---

## Folder Structure

```
hujat/
├── backend/
│   ├── middleware/
│   │   ├── auth.js          # JWT verification, role guard
│   │   └── upload.js        # Multer secure file upload
│   ├── models/
│   │   ├── User.js          # User schema with bcrypt hashing
│   │   ├── Document.js      # Document schema with access control
│   │   └── ActivityLog.js   # Activity log schema
│   ├── routes/
│   │   ├── auth.js          # Login, register, logout
│   │   ├── documents.js     # Secure file serving
│   │   ├── admin.js         # Admin CRUD
│   │   └── logs.js          # Log viewer
│   ├── utils/
│   │   └── seedAdmin.js     # Auto-create first admin
│   ├── secure_storage/      # Files stored here (auto-created, NOT public)
│   ├── server.js
│   ├── .env.example
│   └── package.json
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── api/
    │   │   └── axios.js         # Axios instance with JWT interceptor
    │   ├── context/
    │   │   └── AuthContext.js   # Auth state & helpers
    │   ├── components/
    │   │   ├── Layout.js        # Sidebar + topbar layout
    │   │   └── Layout.css
    │   ├── pages/
    │   │   ├── LoginPage.js
    │   │   ├── RegisterPage.js
    │   │   ├── UserDashboard.js
    │   │   ├── ViewerPage.js    # Core secure viewer (PDF.js canvas)
    │   │   ├── AdminDashboard.js
    │   │   ├── AdminDocuments.js
    │   │   ├── AdminUsers.js
    │   │   └── AdminLogs.js
    │   ├── App.js
    │   ├── index.js
    │   └── index.css
    └── package.json
```

---

## Installation & Setup

### Prerequisites
- Node.js v18+
- MongoDB (local or Atlas)

### 1. Clone / open the project

### 2. Backend Setup

```bash
cd backend
npm install
```

Copy the example env file and fill in your values:
```bash
copy .env.example .env
```

Edit `.env`:
```
PORT=5000
MONGO_URI=mongodb://localhost:27017/secure_docs
JWT_SECRET=change_this_to_a_long_random_secret_string
JWT_EXPIRES_IN=8h
ADMIN_EMAIL=admin@yourdomain.com
ADMIN_PASSWORD=YourStrongPassword123!
```

Start backend:
```bash
npm run dev
# or for production:
npm start
```

The first run will automatically create the admin user with the credentials from `.env`.

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start
```

The React app runs on `http://localhost:3000` and proxies API calls to `http://localhost:5000`.

---

## Default Admin Credentials

These are set via `.env` before first run:
- **Email**: `admin@example.com` (or whatever you set)
- **Password**: `Admin@123456` (or whatever you set)

> **Change these immediately in production!**

---

## Security Features

| Feature | Implementation |
|---|---|
| JWT Authentication | 8h expiry, server-side validation on every request |
| Password hashing | bcryptjs with 12 salt rounds |
| Account lockout | 5 failed attempts → 15-minute lock |
| Rate limiting | 100 req/15min general, 20 req/15min auth |
| Helmet.js headers | CSP, X-Frame-Options, CORS, etc. |
| File storage | UUID filenames outside public directory |
| No raw file URLs | All files served through authenticated API |
| Canvas rendering | PDF.js renders to canvas — prevents text extraction |
| Watermark | User email drawn onto canvas at render time |
| Right-click blocked | `contextmenu` event prevented |
| Keyboard shortcuts | Ctrl+C/S/U/P/A, F12, DevTools combos blocked |
| Tab blur | Content hidden when user switches tabs |
| DevTools detection | Window size heuristic, activity logged |
| Print protection | CSS `@media print` hides viewer entirely |
| Access control | Per-document user allowlist, server-side enforced |
| Expiration | Documents can auto-expire by date |
| Access revoke | Admin can revoke any user's access instantly |
| Activity logging | All views, copy attempts, suspicious activity logged |

---

## API Endpoints

### Auth
| Method | Route | Access |
|---|---|---|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| GET  | `/api/auth/me` | Authenticated |
| POST | `/api/auth/logout` | Authenticated |

### Documents (User)
| Method | Route | Access |
|---|---|---|
| GET  | `/api/documents` | User |
| GET  | `/api/documents/:id/info` | User (if allowed) |
| GET  | `/api/documents/:id/view` | User (streams file) |
| POST | `/api/documents/:id/log` | User |

### Admin
| Method | Route | Access |
|---|---|---|
| GET    | `/api/admin/users` | Admin |
| PATCH  | `/api/admin/users/:id/toggle` | Admin |
| GET    | `/api/admin/documents` | Admin |
| POST   | `/api/admin/documents/upload` | Admin |
| PATCH  | `/api/admin/documents/:id` | Admin |
| DELETE | `/api/admin/documents/:id` | Admin |
| PATCH  | `/api/admin/documents/:id/revoke/:userId` | Admin |
| GET    | `/api/admin/stats` | Admin |

### Logs
| Method | Route | Access |
|---|---|---|
| GET | `/api/logs` | Admin |
| GET | `/api/logs/my` | User |
