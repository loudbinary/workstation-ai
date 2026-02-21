# WTF Player App

**Repository**: [github.com/loudbinary/wtf-app](https://github.com/loudbinary/wtf-app)

## Overview

The WTF Player App is a Vue.js-based web application that provides the user interface for viewing live camera feeds, managing tables, and sharing instant replays in the WTF Replay System. It's designed for use by billiard hall staff and players.

## Features

- **Live Table Monitoring**: View all active billiard tables
- **Replay Management**: Browse, play, and share instant replays
- **Real-time Updates**: WebSocket integration for live notifications
- **Social Sharing**: Share replays to social media (with payment)
- **Responsive Design**: Works on desktop and tablet devices
- **Table Controls**: Start/stop recordings, trigger replays
- **Payment Integration**: In-app payment for replay sharing

## Technology Stack

- **Framework**: Vue 3
- **Build Tool**: Vite
- **State Management**: Pinia
- **HTTP Client**: Axios
- **Real-time**: Socket.IO Client
- **Router**: Vue Router
- **Composables**: VueUse

## Installation

```bash
npm install
```

## Configuration

Create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:3000
VITE_PAYMENT_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3000
```

## Usage

### Development Mode
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

### Production Build
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Lint Code
```bash
npm run lint
```

## Application Structure

```
wtf-app/
├── src/
│   ├── main.js                    # Application entry
│   ├── App.vue                    # Root component
│   ├── components/
│   │   └── ShareReplayModal.vue   # Replay sharing modal
│   ├── views/
│   │   ├── TablesListView.vue     # Table list page
│   │   ├── TableView.vue          # Single table view
│   │   └── ReplaysView.vue        # Replays gallery
│   └── stores/
│       ├── api.js                 # API client store
│       ├── websocket.js           # WebSocket store
│       └── toast.js               # Toast notifications
├── index.html
├── vite.config.js
├── Dockerfile
├── package.json
└── README.md
```

## Key Components

### TablesListView
- Displays all billiard tables
- Shows recording status
- Quick access to table cameras
- Real-time status updates

### TableView
- Live camera feed for a single table
- Recording controls
- Recent replays list
- Trigger instant replay button

### ReplaysView
- Gallery of all generated replays
- Filter and search capabilities
- Replay player with controls
- Share functionality

### ShareReplayModal
- Payment integration
- Social media platform selection
- Watermark preview
- Share link generation

## State Management

The app uses Pinia stores for state management:

### API Store (`stores/api.js`)
- Centralized API calls
- Error handling
- Loading states

### WebSocket Store (`stores/websocket.js`)
- Real-time connection management
- Event handling
- Reconnection logic

### Toast Store (`stores/toast.js`)
- User notifications
- Success/error messages
- Auto-dismiss functionality

## WebSocket Events

The app listens to:
- `recording-started` - Recording begins on a table
- `recording-stopped` - Recording stops on a table
- `replay-ready` - New replay is available
- `camera-status` - Camera connection changes
- `error` - Error notifications

## Docker

Build the image:
```bash
docker build -t wtf-player-app .
```

Run the container:
```bash
docker run -p 80:80 wtf-player-app
```

## Development

### Adding New Features
1. Create feature branch
2. Develop component/view
3. Add to router if needed
4. Update store if state management required
5. Test thoroughly
6. Submit pull request

### Component Guidelines
- Use Composition API
- Implement proper prop validation
- Emit events for parent communication
- Use VueUse composables where applicable

### Styling
- Use scoped CSS in components
- Maintain consistent design language
- Ensure responsive design
- Test on multiple screen sizes

## Troubleshooting

### WebSocket Connection Issues
- Check `VITE_WS_URL` in `.env`
- Verify media server is running
- Check browser console for errors

### API Errors
- Verify API URLs in `.env`
- Check network tab for failed requests
- Review server logs

### Build Errors
- Clear `node_modules` and reinstall
- Check Node.js version compatibility
- Verify all dependencies are installed

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

## Related Projects

- [wtf-replay-system](https://github.com/loudbinary/wtf-replay-system) - Main project hub
- [wtf-media](https://github.com/loudbinary/wtf-media) - Media server
- [wtf-camera](https://github.com/loudbinary/wtf-camera) - Camera client
- [wtf-payments](https://github.com/loudbinary/wtf-payments) - Payment service
- [wtf-website](https://github.com/loudbinary/wtf-website) - WordPress site

## License

MIT License

## Support

For issues and questions, please visit the [main project repository](https://github.com/loudbinary/wtf-replay-system).
