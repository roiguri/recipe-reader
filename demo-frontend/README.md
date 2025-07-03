# Recipe Box Demo

**Modern React application for AI-powered recipe extraction from text, URLs, and images with secure authentication and multi-language support.**

## 🚀 Live Demo

**Try it now: [https://recipe-reader-demo.netlify.app](https://recipe-reader-demo.netlify.app)**

Experience recipe processing with intelligent AI extraction, real-time rate limiting, and seamless user management.

## ✨ Features

### **Recipe Processing** (3 Types Supported)
- **📝 Text Processing**: Paste recipe text for instant structured extraction
- **🔗 URL Processing**: Extract recipes directly from cooking websites  
- **📸 Image Processing**: Upload recipe images (single/multiple pages) for OCR extraction

### **User Experience**
- **🔐 Secure Authentication**: Google & GitHub OAuth via Supabase
- **🌐 Multi-language**: English/Hebrew with full RTL support
- **⚡ Real-time Updates**: Live quota tracking and recipe management
- **📱 Responsive Design**: Mobile-first Tailwind CSS interface
- **💾 Recipe Management**: Save, edit, search, and export your recipes

### **Security & Performance**
- **🛡️ Secure API Proxy**: No exposed API keys in frontend
- **📊 Rate Limiting**: Server-side enforcement with real-time UI updates
- **👥 Admin Features**: Unlimited access for admin users
- **🔒 JWT Authentication**: Comprehensive session management

## 🛠️ Tech Stack

| Category | Technology |
|----------|------------|
| **Frontend** | React 19, TypeScript, Vite |
| **Styling** | Tailwind CSS 3, Framer Motion |
| **Backend** | Supabase (Auth, Database, Edge Functions) |
| **Internationalization** | React i18next (EN/HE) |
| **Build Tools** | Vite, PostCSS, Environment Validation |

## 🎯 How to Use

1. **Visit the Demo**: [https://recipe-reader-demo.netlify.app](https://recipe-reader-demo.netlify.app)
2. **Sign In**: Use Google or GitHub OAuth (secure authentication)
3. **Choose Input Type**: Text, URL, or Image upload
4. **Process Recipe**: AI extracts structured data with confidence scoring
5. **Save & Manage**: Store recipes in your personal collection

### 🔑 Demo Account
- **Rate Limit**: 5 requests per user
- **Admin Access**: Contact us for unlimited demo access
- **Data Persistence**: Recipes saved to your account

## 🏗️ Architecture

```
Frontend (React/Vite)
    ↓ JWT Authentication
Supabase Edge Function (Secure Proxy)
    ↓ API Key + Rate Limiting
External Recipe API (FastAPI)
    ↓ AI Processing
Structured Recipe Data
```

### **Security Implementation**
- **Zero API Key Exposure**: All keys secured in Edge Functions
- **Server-side Rate Limiting**: 5 requests/user, admin bypass
- **JWT Validation**: Every request authenticated
- **CORS Protection**: Dynamic origin validation

### **Database Schema**
- **`demo_rate_limits`**: User quotas and usage tracking
- **`user_recipes`**: Recipe storage with metadata
- **Real-time subscriptions**: Live UI updates

## 📱 User Interface

### **Processing Flow**
1. **Choose Input Type**: Text, URL, or Image upload
2. **AI Processing**: Intelligent extraction with confidence scoring
3. **Review Results**: Editable recipe with structured data
4. **Save & Manage**: Store in personal recipe collection

### **Admin Features**
- **Unlimited Processing**: No rate limits for admin users
- **Full Access**: All features available without restrictions
- **Admin Detection**: Automatic via JWT `app_metadata.is_admin`

## 🌍 Internationalization

- **Languages**: English (en), Hebrew (he)
- **RTL Support**: Complete right-to-left layout for Hebrew
- **Dynamic Switching**: Real-time language toggle
- **Validation**: Built-in locale consistency checking

## 🔒 Authentication Providers

| Provider | Status | Features |
|----------|--------|----------|
| **Google** | ✅ Active | Primary OAuth provider |
| **GitHub** | ✅ Active | Secondary OAuth option |

## 🔧 For Developers

This is a production demo application. For API integration or custom development:

### **Development Setup**
- See [Recipe API Documentation](../README.md) for backend setup
- Contact us for development access and API keys
- Review [Contributing Guidelines](../contributing.md) for contribution process

### **Technical Implementation**
- **TypeScript**: Mixed JS/TS codebase with gradual migration
- **Error Boundaries**: Comprehensive error handling and recovery
- **Performance**: Lazy loading, code splitting, and optimization
- **Accessibility**: ARIA labels, keyboard navigation, screen reader support

---

**🔗 Related**: [Recipe API Documentation](../README.md) | [Contributing Guidelines](../contributing.md)
