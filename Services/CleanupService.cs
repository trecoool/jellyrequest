using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using JellyRequest.Data;
using MediaBrowser.Model.Tasks;
using Microsoft.Extensions.Logging;

namespace JellyRequest.Services;

public class CleanupService : IScheduledTask
{
    private readonly RequestsRepository _repository;
    private readonly ILogger<CleanupService> _logger;

    public CleanupService(RequestsRepository repository, ILogger<CleanupService> logger)
    {
        _repository = repository;
        _logger = logger;
    }

    public string Name => "Clean up rejected media requests";

    public string Key => "MediaRequestsCleanup";

    public string Description => "Deletes rejected media requests older than the configured number of days.";

    public string Category => "Media Requests";

    public async Task ExecuteAsync(IProgress<double> progress, CancellationToken cancellationToken)
    {
        var config = Plugin.Instance?.Configuration;
        if (config == null || config.AutoDeleteRejectedDays <= 0)
        {
            _logger.LogInformation("Auto-delete is disabled, skipping cleanup");
            return;
        }

        progress.Report(0);
        var count = await _repository.CleanupOldRejectedAsync(config.AutoDeleteRejectedDays).ConfigureAwait(false);
        _logger.LogInformation("Cleaned up {Count} old rejected requests", count);
        progress.Report(100);
    }

    public IEnumerable<TaskTriggerInfo> GetDefaultTriggers()
    {
        return new[]
        {
            new TaskTriggerInfo
            {
                Type = TaskTriggerInfoType.DailyTrigger,
                TimeOfDayTicks = TimeSpan.FromHours(3).Ticks
            }
        };
    }
}
