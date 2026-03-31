using System;

namespace JellyRequest.Models;

public class UserBan
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public string Username { get; set; } = string.Empty;

    public string Reason { get; set; } = string.Empty;

    public DateTime BannedAt { get; set; }

    public DateTime? ExpiresAt { get; set; }
}
