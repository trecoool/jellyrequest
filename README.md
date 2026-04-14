# JellyRequest

A Jellyfin plugin that lets users request media and admins manage those requests through a full lifecycle.

This project is extracted and rewritten from [K3ntas/jellyfin-plugin-ratings](https://github.com/K3ntas/jellyfin-plugin-ratings) focusing solely on the request system.

## Features

- Users submit media requests with title, type, notes, IMDB links
- Full request lifecycle: pending → done / rejected / snoozed → archived
- Customizable request form (field labels, placeholders, required fields, custom fields)
- Admin configuration page

## Screenshots

![New request form](Screenshots/new%20request.png)

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
| POST | `/MediaRequests/{id}/Archive` | Archive your request |

### Admin

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/MediaRequests` | All requests |
| POST | `/MediaRequests/{id}/Status` | Change request status |
| POST | `/MediaRequests/{id}/Snooze` | Snooze a request |
| POST | `/MediaRequests/{id}/Unsnooze` | Unsnooze → pending |
| POST | `/MediaRequests/Admin/{id}/Archive` | Archive a request |
| POST | `/MediaRequests/Admin/{id}/Unarchive` | Restore an archived request |
| DELETE | `/MediaRequests/Admin/{id}` | Permanently delete a request |
| GET | `/MediaRequests/Bans` | List bans |
| POST | `/MediaRequests/Bans` | Ban a user |
| DELETE | `/MediaRequests/Bans/{banId}` | Remove a ban |

### Public

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/MediaRequests/Config` | Client-facing configuration |

## Installation

Build from source and copy the DLL into Jellyfin's plugin folder:

```bash
dotnet build -c Release
```

Copy `bin/Release/net9.0/JellyRequest.dll` to `<jellyfin-config>/plugins/JellyRequest/`, then restart Jellyfin.
