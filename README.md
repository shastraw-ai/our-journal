# Our Journal

A cross-platform family journal and task tracking app built with React Native and Expo. Track daily tasks, write journal entries, and visualize progress through analytics dashboards. Supports multiple family members with Google Drive cloud sync.

## Features

- **Daily Journaling** - Rich text editor with formatting support (bold, italic, lists)
- **Task Tracking** - Three task types: checkboxes, text input, and numeric values with units
- **Multi-Member Support** - Separate sections and tasks for each family member with custom colors
- **Analytics Dashboard** - Line and bar charts showing completion rates and trends
- **Cloud Sync** - Automatic backup to Google Drive with local-first architecture
- **Guest Mode** - Use locally without signing in
- **Daily Reminders** - Configurable push notifications
- **Dark Mode** - Automatic theme based on system settings

## Tech Stack

- **Framework:** React Native 0.81 + Expo 54
- **Language:** TypeScript
- **Navigation:** Expo Router (file-based routing)
- **State Management:** Zustand
- **UI Components:** React Native Paper (Material Design 3)
- **Charts:** React Native Chart Kit
- **Authentication:** Google Sign-In
- **Cloud Storage:** Google Drive API
- **Local Storage:** AsyncStorage + Expo Secure Store

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (Mac) or Android Emulator

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/our-journal.git
cd our-journal

# Install dependencies
npm install

# Start the development server
npm start
```

### Running the App

```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

## Project Structure

```
our-journal/
├── app/                    # Expo Router screens
│   ├── (tabs)/             # Tab navigation
│   │   ├── index.tsx       # Journal screen
│   │   ├── dashboard.tsx   # Analytics screen
│   │   └── settings.tsx    # Settings screen
│   ├── auth.tsx            # Authentication screen
│   └── _layout.tsx         # Root layout
├── src/
│   ├── types/              # TypeScript interfaces
│   ├── stores/             # Zustand state stores
│   │   ├── authStore.ts    # Authentication state
│   │   ├── entriesStore.ts # Journal entries
│   │   └── settingsStore.ts# App settings
│   ├── services/           # External integrations
│   │   ├── googleAuth.ts   # Google Sign-In
│   │   ├── googleDrive.ts  # Google Drive API
│   │   └── storage.ts      # Storage service
│   └── utils/              # Helper functions
├── assets/                 # Icons and images
├── app.json                # Expo configuration
└── eas.json                # EAS Build configuration
```

## Configuration

### Google Cloud Setup (Optional - for cloud sync)

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Google Drive API
3. Configure OAuth consent screen
4. Create OAuth 2.0 credentials for:
   - Web application
   - iOS application (bundle ID: `ai.shastraw.ourjournal`)
   - Android application (package: `ai.shastraw.ourjournal`)
5. Add client IDs to `app.json`:

```json
{
  "expo": {
    "extra": {
      "googleClientId": {
        "web": "YOUR_WEB_CLIENT_ID",
        "ios": "YOUR_IOS_CLIENT_ID",
        "android": "YOUR_ANDROID_CLIENT_ID"
      }
    }
  }
}
```

## Building for Production

This project uses [EAS Build](https://docs.expo.dev/build/introduction/) for production builds.

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android
```

### Build Profiles

- `development` - Development client with debugging
- `preview` - Internal testing (APK for Android)
- `production` - App store release

## Data Storage

| Data | Local | Cloud |
|------|-------|-------|
| Settings | AsyncStorage | Google Drive (`settings.json`) |
| Entries | AsyncStorage | Google Drive (`entries/entries_YYYY-MM.json`) |
| Auth Tokens | Secure Store | - |

Entries are organized by month and synced to a dedicated `OurJournal` folder in Google Drive.

## License

MIT
