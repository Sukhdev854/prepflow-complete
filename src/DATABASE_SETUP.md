# PrepFlow - Database Setup Instructions

## Overview
PrepFlow now uses Supabase for user authentication and data persistence, allowing users to access their progress from any device using username/password login.

## IMPORTANT: Email Confirmation Settings

Before creating the database tables, you need to configure email settings in Supabase:

1. **Go to your Supabase project** at https://supabase.com/dashboard
2. **Navigate to Authentication > Providers** (in the left sidebar)
3. **Find Email provider settings**
4. **Disable "Confirm email"** - Turn this OFF to allow instant account creation without email verification
5. **Click "Save"**

This allows users to sign up and start using PrepFlow immediately without having to verify their email address.

## Database Tables Required

To use PrepFlow with cross-device sync, you need to create the following tables in your Supabase database:

### 1. Profiles Table
Stores username mappings for username-based login.

### 2. Student Profiles Table
Stores the student's profile configuration (name, level, subjects, etc.).

### 3. Progress Entries Table
Stores all paper completion records.

## Setup Instructions

1. **Go to your Supabase project** at https://supabase.com/dashboard

2. **Navigate to the SQL Editor** (in the left sidebar)

3. **Run the SQL script** located in `/supabase/schema.sql`
   - Copy the entire contents of the file
   - Paste it into the SQL Editor
   - Click "Run" to execute

4. **Verify the tables were created**
   - Go to "Table Editor" in the sidebar
   - You should see three new tables:
     - `profiles`
     - `student_profiles`
     - `progress_entries`

## Features

### Username/Password Authentication
- Users can sign up with a unique username, email, and password
- Login supports both username OR email + password
- Usernames are case-insensitive and must be 3-20 characters (letters, numbers, underscores only)

### Cross-Device Sync
- All progress and profile data is automatically saved to Supabase
- When you log in from any device, your data is instantly loaded
- Real-time sync ensures you never lose progress

### Security
- Row Level Security (RLS) is enabled on all tables
- Users can only access their own data
- Passwords are securely hashed by Supabase Auth

## Usage

1. **Sign Up**
   - Enter your full name
   - Choose a unique username
   - Provide your email
   - Create a password (minimum 6 characters)

2. **Log In**
   - Enter your username OR email
   - Enter your password
   - Click "Sign In"

3. **Access from Any Device**
   - Simply log in with your username/email and password
   - All your subjects, progress, and settings will be automatically loaded

4. **View Your Username**
   - Go to Settings > Profile & Subjects
   - Your username is displayed at the top with an @ symbol

## Troubleshooting

### "Username already taken" error
- Try a different username - usernames must be unique across all users

### "User not found" error during login
- Make sure you're entering your username correctly (case-insensitive)
- Alternatively, try logging in with your email address

### Data not syncing
- Check your internet connection
- Verify you're logged in (check Settings page for your username)
- Try refreshing the page

## Data Migration from localStorage

If you were previously using PrepFlow without authentication:
- Your old data is still stored in localStorage
- To migrate, you'll need to manually re-enter your profile and progress after signing up
- Alternatively, ask the developer to help with a migration script

## Support

For issues or questions:
- Check the Supabase dashboard for any database errors
- Ensure all three tables exist with proper RLS policies
- Verify your Supabase project credentials are correct in `/utils/supabase/info.tsx`