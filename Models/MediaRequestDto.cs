using System.ComponentModel.DataAnnotations;

namespace JellyRequest.Models;

public class MediaRequestDto
{
    [MaxLength(500)]
    public string Title { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Type { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string Notes { get; set; } = string.Empty;

    [MaxLength(5000)]
    public string CustomFields { get; set; } = string.Empty;

    [MaxLength(50)]
    public string ImdbCode { get; set; } = string.Empty;

    [MaxLength(500)]
    public string ImdbLink { get; set; } = string.Empty;

    [MaxLength(4)]
    public string Year { get; set; } = string.Empty;
}
