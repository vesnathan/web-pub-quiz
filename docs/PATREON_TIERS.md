# Patreon Tiers - QuizNight.live

## Overview

Three subscription tiers for supporters of QuizNight.live, offering progressively more features and customization options.

---

## Free Tier (No subscription)

### Limitations

- **3 Sets per 24 Hours** - Non-patrons can only participate in 3 quiz sets within a rolling 24-hour window
- **Standard Ads** - Advertisements shown during gameplay

### Implementation

- Track `setsPlayedToday` in user profile with timestamps
- On room join, check if user has played 3 sets in the last 24 hours
- If limit reached, show upgrade prompt with Patreon link
- Reset rolling window (oldest set drops off after 24 hours)

---

## Tier 1: Supporter ($3/month)

### Benefits

- **Patron Badge** - Exclusive profile badge showing supporter status
- **No set limit**
- **Patron Leaderboard** - Compete on an exclusive supporter-only leaderboard

---

## Tier 2: Champion ($10/month)

### Everything in Tier 1, plus:


- **Ad-Free Experience** - No advertisements during gameplay
- **Private Rooms** - Create invite-only games for friends
- **Custom Quizzes** - Upload and host your own question sets
- **Name in Credits** - Recognition on the About page

