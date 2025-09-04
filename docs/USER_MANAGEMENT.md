# User Management Feature

## Overview
The User Management feature provides administrators with the ability to create, read, update, and delete (CRUD) admin users who have access to the admin panel. This feature is separate from candidate management and focuses on managing system administrators.

## Database Schema

### AdminUser Model
```prisma
model AdminUser {
  id           String   @id @default(uuid())
  email        String   @unique
  name         String?
  role         String   @default("admin")
  is_active    Boolean  @default(true)
  created_at   DateTime @default(now())
  updated_at   DateTime @updatedAt
  last_login   DateTime?
  created_by   String?
}
```

### Fields Description
- **id**: Unique identifier (UUID)
- **email**: Unique email address for the admin user
- **name**: Optional display name
- **role**: User role (admin, super_admin)
- **is_active**: Whether the user account is active
- **created_at**: Timestamp when the user was created
- **updated_at**: Timestamp of last update
- **last_login**: Timestamp of user's last login
- **created_by**: Email of the admin who created this user

## Features

### 1. User List View
- Display all admin users in a table format
- Show key information: email, name, role, status, creation date, last login
- Search functionality to filter users by email or name
- Visual indication of inactive users (opacity reduction)

### 2. Create User
- Modal dialog for creating new admin users
- Required fields: Email
- Optional fields: Name, Role
- Email validation
- Duplicate email prevention
- Automatic tracking of who created the user

### 3. Edit User
- Modal dialog for editing existing users
- Update email, name, and role
- Email validation and duplicate prevention
- Cannot change own email to prevent lockout

### 4. Delete User
- Confirmation dialog before deletion
- Prevent self-deletion (users cannot delete their own account)
- Permanent deletion from database

### 5. Toggle Active Status
- Quick toggle button to activate/deactivate users
- Users cannot deactivate their own account
- Visual feedback for status changes

## API Endpoints

### GET /api/admin/users
- Returns list of all admin users
- Requires admin authentication
- Response: Array of AdminUser objects

### POST /api/admin/users
- Creates a new admin user
- Requires admin authentication
- Request body: `{ email, name?, role? }`
- Response: Created AdminUser object

### GET /api/admin/users/[id]
- Returns a specific admin user
- Requires admin authentication
- Response: AdminUser object

### PATCH /api/admin/users/[id]
- Updates an existing admin user
- Requires admin authentication
- Request body: `{ email?, name?, role?, is_active? }`
- Response: Updated AdminUser object

### DELETE /api/admin/users/[id]
- Deletes an admin user
- Requires admin authentication
- Prevents self-deletion
- Response: Success message

## Security Considerations

1. **Authentication**: All endpoints require admin authentication via NextAuth session
2. **Authorization**: Only users with `isAdmin` flag can access these endpoints
3. **Self-Protection**: Users cannot delete or deactivate their own accounts
4. **Email Validation**: Proper email format validation on both frontend and backend
5. **Duplicate Prevention**: Unique constraint on email field prevents duplicates

## User Roles

### Admin
- Standard administrative access
- Can manage candidates and job openings
- Can view and manage other admin users

### Super Admin
- All admin privileges
- Additional system-level permissions (to be defined)

## UI Components

### Users Management Page (/admin/users)
- Located at `/admin/users`
- Accessible via "Users" button in admin dashboard header
- Responsive design with mobile support
- Clean, intuitive interface matching existing admin panel design

### Modal Components
- Create/Edit user modal with form validation
- Error handling and display
- Loading states during API calls
- Success feedback on operations

## Usage

### Adding a New User
1. Navigate to Admin Dashboard
2. Click "Users" button in the header
3. Click "+ Add User" button
4. Fill in the email (required) and optional fields
5. Select appropriate role
6. Click "Create User"

### Editing a User
1. Find the user in the list
2. Click "Edit" button
3. Modify the desired fields
4. Click "Update User"

### Deactivating a User
1. Find the user in the list
2. Click on the status badge (Active/Inactive)
3. User will be toggled between active and inactive states

### Deleting a User
1. Find the user in the list
2. Click "Delete" button
3. Confirm deletion in the dialog
4. User will be permanently removed

## Future Enhancements

1. **Password Management**: Add password reset functionality
2. **Two-Factor Authentication**: Implement 2FA for enhanced security
3. **Activity Logs**: Track user actions and login history
4. **Role Permissions**: Granular permission system for different roles
5. **Bulk Operations**: Select and perform actions on multiple users
6. **Export Functionality**: Export user list to CSV/Excel
7. **Email Notifications**: Send emails for account creation/updates
8. **Session Management**: View and manage active user sessions