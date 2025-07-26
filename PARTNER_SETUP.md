# Partner Feature Setup Guide

## Overview
The partner feature allows users to link their accounts and share recipes with reactions (like/dislike). This guide will help you set up the feature.

## Database Setup

1. **Apply the partner schema** to your Supabase database:
   - Go to your Supabase dashboard
   - Navigate to SQL Editor
   - Copy the contents of `partner-schema.sql`
   - Run the SQL to create the necessary tables and functions

## How It Works

### For Users

1. **Adding a Partner**:
   - Go to Settings → Partner section
   - Tap "Add Partner"
   - Enter your partner's email address
   - They'll receive an invitation to accept

2. **Accepting Invitations**:
   - Pending invitations appear in Settings → Partner
   - Tap "Accept" to link accounts
   - The Partner tab will appear in navigation

3. **Sharing Recipes**:
   - Open any recipe from your history
   - Tap "Share with [Partner Name]"
   - Add an optional message
   - Your partner will see it in the Partner tab

4. **Reacting to Shared Recipes**:
   - In the Partner tab, see all shared recipes
   - Tap Like 👍 or Dislike 👎 on recipes shared by your partner
   - Your partner can see your reactions

### Features

- **Real-time Updates**: New shares and reactions appear instantly
- **Privacy**: Only linked partners can see shared recipes
- **Simple UI**: Card-based interface with intuitive like/dislike buttons
- **Unlink Anytime**: Users can unlink from Settings

## Technical Details

### New Database Tables
- `partner_requests` - Tracks partnership invitations
- `partnerships` - Stores linked partner relationships  
- `shared_recipes` - Tracks recipes shared between partners
- `recipe_reactions` - Stores like/dislike reactions

### Key Components
- `PartnerSection` in Settings - Manages partner relationships
- `partner.tsx` - Displays shared recipes with reactions
- Updated `_layout.tsx` - Shows Partner tab only when linked
- Updated `detail.tsx` - Adds share functionality to recipes

### Security
- Row Level Security (RLS) ensures users can only:
  - See their own partnerships
  - Share their own recipes
  - React to recipes shared with them
  - View profiles of their partners

## Troubleshooting

### Partner tab not showing?
- Check if partnership exists in database
- Verify real-time subscriptions are working
- Try refreshing the app

### Can't share recipes?
- Ensure recipe exists in database (not just local storage)
- Check if partner relationship is established
- Verify no duplicate shares exist

### Reactions not working?
- Check if recipe was shared TO you (not BY you)
- Verify shared_recipes and recipe_reactions tables have proper data

## Next Steps

The edge function (`accept_partner_request`) is already included in the schema as a PostgreSQL function, so no additional edge function deployment is needed. The feature is ready to use once the database schema is applied!