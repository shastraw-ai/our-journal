# Our Journal

A cross-platform family journal and task tracking app built with React Native and Expo. Track daily tasks, write journal entries, and visualize progress through analytics dashboards. Supports multiple family members with Google Drive cloud sync. Developed using Claude Code.

## Features

### Daily Journaling
- Rich text editor with formatting support (bold, italic, underline, lists, indentation)
- Separate notes section for each family member
- Date navigation with calendar picker

### Task Tracking
Three flexible task types to fit your needs:
- **Checkbox tasks** - Simple yes/no completion tracking
- **Text input tasks** - Free-form text responses
- **Numeric tasks** - Track quantities with optional units (minutes, glasses, pages, etc.)

### Multi-Member Support
- Add unlimited family members with custom colors
- Organize tasks into sections per member
- Color-coded UI for easy visual identification

### Analytics Dashboard
- **Charts View** - Line charts for completion rates, bar charts for numeric metrics
- **Rewards View** - Visual coin-based reward system tracking completed tasks
- Streak tracking for consecutive days of full completion
- Flexible date ranges (7, 30, 90, 365 days)

### Cloud Sync
- Google Sign-In integration
- Automatic backup to Google Drive
- Local-first architecture (works offline)
- Guest mode for local-only usage

### Additional Features
- Daily push notification reminders with configurable time
- Dark/light mode based on system settings
- Cross-platform support (iOS, Android, Web)

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | React Native 0.81 + Expo 54 |
| Language | TypeScript |
| Navigation | Expo Router (file-based) |
| State Management | Zustand |
| UI Components | React Native Paper (Material Design 3) |
| Charts | React Native Chart Kit |
| Rich Text Editor | React Native Pell Rich Editor |
| Authentication | Google Sign-In |
| Cloud Storage | Google Drive API |
| Local Storage | AsyncStorage + Expo Secure Store |
| Date Utilities | date-fns |

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
├── app/                        # Expo Router screens
│   ├── _layout.tsx             # Root layout with theme & auth
│   ├── index.tsx               # Initial auth redirect
│   ├── auth.tsx                # Authentication screen
│   └── (tabs)/                 # Tab navigation
│       ├── _layout.tsx         # Tab bar configuration
│       ├── index.tsx           # Journal screen
│       ├── dashboard.tsx       # Analytics & rewards
│       └── settings.tsx        # Configuration
├── src/
│   ├── types/                  # TypeScript interfaces
│   │   └── index.ts            # All type definitions
│   ├── stores/                 # Zustand state management
│   │   ├── authStore.ts        # Authentication state
│   │   ├── entriesStore.ts     # Journal entries & tasks
│   │   └── settingsStore.ts    # Family members & config
│   ├── services/               # External integrations
│   │   ├── googleAuth.ts       # Google Sign-In config
│   │   ├── googleDrive.ts      # Google Drive API
│   │   └── storage.ts          # Storage abstraction
│   └── utils/                  # Helper functions
│       └── dateUtils.ts        # Date manipulation
├── assets/                     # App icons and images
├── app.json                    # Expo configuration
├── eas.json                    # EAS Build profiles
└── tsconfig.json               # TypeScript config
```

## Configuration

### Google Cloud Setup (Required for Cloud Sync)

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the **Google Drive API**
3. Configure the **OAuth consent screen**:
   - Add the scope: `https://www.googleapis.com/auth/drive.file`
4. Create **OAuth 2.0 credentials** for each platform:
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

# Build for both platforms
eas build --platform all
```

### Build Profiles

| Profile | Purpose | Output |
|---------|---------|--------|
| `development` | Development client with debugging | Debug build |
| `preview` | Internal testing | APK (Android) / Ad-hoc (iOS) |
| `production` | App store release | AAB (Android) / IPA (iOS) |

## Data Storage

| Data | Local Storage | Cloud Storage |
|------|---------------|---------------|
| Settings | AsyncStorage | `settings.json` |
| Journal Entries | AsyncStorage | `entries/entries_YYYY-MM.json` |
| Auth Tokens | Expo Secure Store | - |

Data is organized in a dedicated `OurJournal` folder in Google Drive. Entries are stored by month for efficient loading and sync.

## Troubleshooting

### Google Sign-In Issues

- **iOS:** Ensure the URL scheme is correctly configured in `app.json`
- **Android:** Verify the SHA-1 fingerprint matches your keystore
- **Web:** Check that authorized redirect URIs are configured

### Sync Not Working

1. Check your internet connection
2. Verify Google Drive API is enabled in Cloud Console
3. Try signing out and back in to refresh tokens

### App Not Starting

```bash
# Clear cache and reinstall
npm start -- --clear
rm -rf node_modules && npm install
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT
