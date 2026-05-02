# PrepFlow - Local Authentication

## Overview
PrepFlow now uses a simple local authentication system with **username and password only** - no email required, no backend/Supabase needed!

## How It Works

### Sign Up
1. Enter your full name
2. Choose a unique username (3-20 characters: letters, numbers, underscores)
3. Create a password (minimum 6 characters)
4. Click "Create Account"

### Sign In
1. Enter your username
2. Enter your password
3. Click "Sign In"

## Data Storage

All data is stored locally in your browser's localStorage:

- **User accounts**: Stored in `prepflow_users`
- **Session**: Stored in `prepflow_session`
- **Profile data**: Stored per user in `prepflow_profile_{userId}`
- **Progress data**: Stored per user in `prepflow_progress_{userId}`
- **Theme preferences**: Stored in `appTheme`

## Multi-User Support

- Multiple users can sign up on the same device
- Each user has their own isolated data
- Switch between users by logging out and logging in with different credentials
- Data is scoped to each user's ID to prevent conflicts

## Security Note

⚠️ **Important**: This is a local-only authentication system designed for convenience, not production security:

- Passwords are hashed with a simple hash function (not cryptographically secure)
- Data is stored in localStorage (accessible via browser dev tools)
- No server-side validation or encryption
- Best for personal use on your own device

## Features

✅ **Works Offline**: No internet connection required  
✅ **No Backend**: No Supabase or server needed  
✅ **Multi-User**: Support for multiple users on same device  
✅ **Simple**: Just username and password  
✅ **Fast**: Instant signup and login  
✅ **Private**: All data stays on your device  

## Limitations

❌ **No Cross-Device Sync**: Data is stored only on the current device  
❌ **No Password Recovery**: If you forget your password, you cannot recover your account  
❌ **No Real Security**: Passwords are not securely encrypted  
❌ **Browser Dependent**: Clearing browser data will delete all accounts and progress  

## Usage Tips

1. **Remember your username and password** - there's no recovery option
2. **Back up your data** - Export your progress occasionally (future feature)
3. **Use a strong password** - Even though it's local, good habits matter
4. **Don't share devices** - Each user should have their own account

## For Developers

The authentication system is implemented in `/utils/localAuth.ts` with the following functions:

- `signUp(username, password, name)` - Create a new user account
- `signIn(username, password)` - Sign in an existing user
- `signOut()` - Sign out the current user
- `getCurrentSession()` - Get the current session if one exists
- `isSignedIn()` - Check if a user is signed in

All user data is scoped by user ID to prevent conflicts between different users on the same device.
