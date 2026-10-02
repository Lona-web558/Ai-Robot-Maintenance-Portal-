# AI Robot Maintenance Portal

Full-stack robot predictive-maintenance dashboard built with HTML5, CSS3, Bootstrap 5, vanilla JavaScript, Node.js and Express.js.

## Features
- Live simulated robot telemetry
- AI-style maintenance risk recommendations
- Fleet health dashboard
- Temperature, vibration, battery and health monitoring
- Active alerts and acknowledgement
- Maintenance work orders
- Robot maintenance/resume actions
- Historical telemetry chart
- Responsive Bootstrap interface
- REST API

## Run
Requires Node.js 18+.

```bash
npm install
npm start
```
Open http://localhost:3000

Development:
```bash
npm run dev
```

## API
GET /api/dashboard
GET /api/robots/:id
GET /api/robots/:id/history
POST /api/robots/:id/action
POST /api/alerts/:id/ack
POST /api/work-orders
GET /api/health

## AI note
The demo uses transparent rule-based predictive logic for the AI recommendations. It can later be replaced by a trained ML model or inference service.
