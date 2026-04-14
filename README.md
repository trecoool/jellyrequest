# JellyRequest

A Jellyfin plugin that lets users request media and admins manage those requests through a full lifecycle.

This project is extracted and rewritten from [K3ntas/jellyfin-plugin-ratings](https://github.com/K3ntas/jellyfin-plugin-ratings) focusing solely on the request system.

## Features

- Users submit media requests with title, type, notes, IMDB links
- Full request lifecycle: pending → done / rejected / snoozed → archived
- Customizable request form (field labels, placeholders, required fields, custom fields)
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

### Via plugin repository (recommended)

1. In Jellyfin, go to **Dashboard → Plugins → Repositories**.
2. Click **+** and add:
   - **Name**: `JellyRequest`
   - **URL**: `https://raw.githubusercontent.com/trecoool/jellyrequest/master/manifest.json`
3. Open the **Catalog** tab, find **JellyRequest**, and install it.
4. Restart Jellyfin.

### Manual install

1. Download the latest `JellyRequest.zip` from the [Releases](https://github.com/trecoool/jellyrequest/releases) page.
2. Extract `JellyRequest.dll` to `<jellyfin-config>/plugins/JellyRequest/`.
3. Restart Jellyfin.
