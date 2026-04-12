using MediaBrowser.Model.Plugins;

namespace JellyRequest.Configuration;

public class PluginConfiguration : BasePluginConfiguration
{
    // === Core ===
    public bool ShowInAdminMenu { get; set; } = true;

    public bool EnableRequests { get; set; } = true;

    public bool EnableAdminRequests { get; set; } = false;

    public int MaxRequestsPerMonth { get; set; } = 0;

    public int AutoDeleteRejectedDays { get; set; } = 0;

    // === Form Window ===
    public string RequestWindowTitle { get; set; } = string.Empty;

    public string RequestWindowDescription { get; set; } = string.Empty;

    public string RequestSubmitButtonText { get; set; } = string.Empty;

    // === Title field ===
    public string RequestTitleLabel { get; set; } = string.Empty;

    public string RequestTitlePlaceholder { get; set; } = string.Empty;

    // === Type field ===
    public bool RequestTypeEnabled { get; set; } = true;

    public bool RequestTypeRequired { get; set; } = false;

    public string RequestTypeLabel { get; set; } = string.Empty;

    // === Notes field ===
    public bool RequestNotesEnabled { get; set; } = true;

    public bool RequestNotesRequired { get; set; } = false;

    public string RequestNotesLabel { get; set; } = string.Empty;

    public string RequestNotesPlaceholder { get; set; } = string.Empty;

    // === IMDB Code field ===
    public bool RequestImdbCodeEnabled { get; set; } = true;

    public bool RequestImdbCodeRequired { get; set; } = false;

    public string RequestImdbCodeLabel { get; set; } = string.Empty;

    public string RequestImdbCodePlaceholder { get; set; } = string.Empty;

    // === IMDB Link field ===
    public bool RequestImdbLinkEnabled { get; set; } = true;

    public bool RequestImdbLinkRequired { get; set; } = false;

    public string RequestImdbLinkLabel { get; set; } = string.Empty;

    public string RequestImdbLinkPlaceholder { get; set; } = string.Empty;

    // === Year field ===
    public bool RequestYearEnabled { get; set; } = true;

    public bool RequestYearRequired { get; set; } = false;

    public string RequestYearLabel { get; set; } = string.Empty;

    public string RequestYearPlaceholder { get; set; } = string.Empty;

    // === Custom Fields ===
    public string CustomRequestFields { get; set; } = string.Empty;
}
