# JellyRequest

A Jellyfin plugin that lets users request media and admins manage those requests through a full lifecycle.

This project is extracted and rewritten from [K3ntas/jellyfin-plugin-ratings](https://github.com/K3ntas/jellyfin-plugin-ratings), which bundles ratings, media requests, and several other features into a single monolithic plugin. JellyRequest isolates the media request functionality into a clean, standalone plugin with a focused codebase.

## Features

- Users submit media requests with title, type, notes, IMDB links
- Full request lifecycle: pending → processing → done / rejected / snoozed
- Monthly request quotas (configurable, or unlimited)
- User ban system with optional expiry
- Automatic cleanup of old rejected requests
- Fully customizable request form (field labels, placeholders, required fields, custom fields)
- Admin configuration page

## Requirements

- Jellyfin 10.11.x
- .NET 9.0

## API Endpoints

### User

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/MediaRequests` | Create a request |
| GET | `/MediaRequests/My` | Your requests |
| GET | `/MediaRequests/Quota` | Monthly quota status |
| PUT | `/MediaRequests/{id}` | Edit a pending request |
| DELETE | `/MediaRequests/{id}` | Delete your request |

### Admin

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/MediaRequests` | All requests |
| POST | `/MediaRequests/{id}/Status` | Change request status |
| POST | `/MediaRequests/{id}/Snooze` | Snooze a request |
| POST | `/MediaRequests/{id}/Unsnooze` | Unsnooze → pending |
| DELETE | `/MediaRequests/Admin/{id}` | Delete any request |
| GET | `/MediaRequests/Bans` | List bans |
| POST | `/MediaRequests/Bans` | Ban a user |
| DELETE | `/MediaRequests/Bans/{banId}` | Remove a ban |

### Public

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/MediaRequests/Config` | Client-facing configuration |

## Installation

1. Build: `dotnet build -c Release`
2. Copy `Jellyfin.Plugin.MediaRequests.dll` to your Jellyfin plugins directory
3. Restart Jellyfin
