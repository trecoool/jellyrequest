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

    public Task ExecuteAsync(IProgress<double> progress, CancellationToken cancellationToken)
    {
        // Commented out — CleanupOldRejectedAsync (delete) is disabled in favor of archive.
        _logger.LogInformation("Cleanup task is disabled (delete replaced by archive)");
        progress.Report(100);
        return Task.CompletedTask;
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
