using System;

namespace JellyRequest.Models;

public class MediaRequest
{
    public Guid Id { get; set; }

    public Guid UserId { get; set; }

    public string Username { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    public string Type { get; set; } = string.Empty;

    public string Notes { get; set; } = string.Empty;

    public string Status { get; set; } = "pending";

    public DateTime CreatedAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    public string MediaLink { get; set; } = string.Empty;

    public string RejectionReason { get; set; } = string.Empty;

    public string CustomFields { get; set; } = string.Empty;

    public string ImdbCode { get; set; } = string.Empty;

    public string ImdbLink { get; set; } = string.Empty;

    public DateTime? SnoozedUntil { get; set; }
}
