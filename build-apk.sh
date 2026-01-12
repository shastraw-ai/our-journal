#!/bin/bash

# Set JAVA_HOME for Android Studio
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"

# Build APK
eas build --platform android --profile preview --local

# Rename output
if ls build-*.apk 1> /dev/null 2>&1; then
    latest_apk=$(ls -t build-*.apk | head -1)
    timestamp=$(date +%Y%m%d-%H%M%S)
    mv "$latest_apk" "ourjournal-${timestamp}.apk"
    echo "✅ APK created: ourjournal-${timestamp}.apk"
fi
