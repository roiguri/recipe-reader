# Recipe Box Demo

React demonstration interface for the Recipe Auto-Creation Service.

## Getting Started

### 1. Environment Setup

Copy the example environment file and configure your API settings:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your actual values:

```env
REACT_APP_API_URL=http://localhost:8000
REACT_APP_API_KEY=your_demo_api_key_here
REACT_APP_ENV=development
```

### 2. Start Development Server

```bash
npm start
```

Runs the app in development mode at [http://localhost:3000](http://localhost:3000).

The environment validation will run automatically and ensure all required variables are configured.

## Features

- ✅ **Text Processing**: Working interface that connects to FastAPI backend
- 🚧 **URL Processing**: Coming soon interface 
- 🚧 **Image Processing**: Coming soon interface
- 🚧 **Form Processing**: Coming soon interface

## Tech Stack

- React 18
- Tailwind CSS (via CDN)
- FastAPI backend integration
