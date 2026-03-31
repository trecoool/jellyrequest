namespace Jellyfin.Plugin.MediaRequests.Models;

public class RequestQuotaInfo
{
    public int CurrentCount { get; set; }

    public int MaxRequests { get; set; }

    public int Remaining { get; set; }

    public bool Unlimited { get; set; }
}
