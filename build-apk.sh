#!/bin/bash

# Set JAVA_HOME for Android Studio
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"

# Build APK
eas build --platform android --profile preview --local

# Rename output
if ls build-*.apk 1> /dev/null 2>&1; then
    timestamp=$(date +%Y%m%d-%H%M%S)
    mv build-*.apk "ourjournal-${timestamp}.apk"
    echo "✅ APK created: ourjournal-${timestamp}.apk"
fi
