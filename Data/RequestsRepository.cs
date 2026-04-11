using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using JellyRequest.Models;
using MediaBrowser.Common.Configuration;
using Microsoft.Extensions.Logging;

namespace JellyRequest.Data;

public class RequestsRepository
{
    private readonly string _dataPath;
    private readonly string _filePath;
    private readonly ILogger<RequestsRepository> _logger;
    private readonly SemaphoreSlim _writeLock = new(1, 1);
    private readonly object _cacheLock = new();
    private Dictionary<Guid, MediaRequest> _requests = new();
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        WriteIndented = true
    };

    public RequestsRepository(IApplicationPaths applicationPaths, ILogger<RequestsRepository> logger)
    {
        _logger = logger;
        _dataPath = Path.Combine(applicationPaths.DataPath, "jellyrequest");
        _filePath = Path.Combine(_dataPath, "requests.json");
        Directory.CreateDirectory(_dataPath);
        LoadData();
    }

    private void LoadData()
    {
        try
        {
            if (File.Exists(_filePath))
            {
                var json = File.ReadAllText(_filePath);
                var list = JsonSerializer.Deserialize<List<MediaRequest>>(json, _jsonOptions) ?? new List<MediaRequest>();
                lock (_cacheLock)
                {
                    _requests = list.ToDictionary(r => r.Id);
                }

                _logger.LogInformation("Loaded {Count} media requests from storage", list.Count);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load media requests data");
            _requests = new Dictionary<Guid, MediaRequest>();
        }
    }

    private async Task SaveDataAsync()
    {
        await _writeLock.WaitAsync().ConfigureAwait(false);
        try
        {
            List<MediaRequest> list;
            lock (_cacheLock)
            {
                list = _requests.Values.ToList();
            }

            var json = JsonSerializer.Serialize(list, _jsonOptions);
            var tempPath = _filePath + ".tmp";
            await File.WriteAllTextAsync(tempPath, json).ConfigureAwait(false);
            File.Move(tempPath, _filePath, overwrite: true);
        }
        finally
        {
            _writeLock.Release();
        }
    }

    public async Task<MediaRequest> AddAsync(MediaRequest request)
    {
        lock (_cacheLock)
        {
            _requests[request.Id] = request;
        }

        await SaveDataAsync().ConfigureAwait(false);
        return request;
    }

    public List<MediaRequest> GetAll()
    {
        lock (_cacheLock)
        {
            return _requests.Values.OrderByDescending(r => r.CreatedAt).ToList();
        }
    }

    public MediaRequest? GetById(Guid id)
    {
        lock (_cacheLock)
        {
            return _requests.GetValueOrDefault(id);
        }
    }

    public List<MediaRequest> GetByUser(Guid userId)
    {
        lock (_cacheLock)
        {
            return _requests.Values
                .Where(r => r.UserId == userId)
                .OrderByDescending(r => r.CreatedAt)
                .ToList();
        }
    }

    public async Task<MediaRequest?> UpdateStatusAsync(Guid id, string status, string? mediaLink, string? rejectionReason)
    {
        MediaRequest? request;
        lock (_cacheLock)
        {
            request = _requests.GetValueOrDefault(id);
            if (request == null)
            {
                return null;
            }

            request.Status = status;

            switch (status)
            {
                case "pending":
                case "processing":
                    request.CompletedAt = null;
                    request.MediaLink = string.Empty;
                    request.RejectionReason = string.Empty;
                    request.SeenByUser = true;
                    break;
                case "done":
                    request.CompletedAt = DateTime.UtcNow;
                    request.MediaLink = mediaLink ?? string.Empty;
                    request.RejectionReason = string.Empty;
                    request.SeenByUser = false;
                    break;
                case "rejected":
                    request.CompletedAt = DateTime.UtcNow;
                    request.RejectionReason = rejectionReason ?? string.Empty;
                    request.MediaLink = string.Empty;
                    request.SeenByUser = true;
                    break;
            }
        }

        await SaveDataAsync().ConfigureAwait(false);
        return request;
    }

    public async Task<MediaRequest?> UpdateAsync(Guid id, MediaRequestDto dto)
    {
        MediaRequest? request;
        lock (_cacheLock)
        {
            request = _requests.GetValueOrDefault(id);
            if (request == null || request.Status != "pending")
            {
                return null;
            }

            request.Title = dto.Title;
            request.Type = dto.Type;
            request.Notes = dto.Notes;
            request.CustomFields = dto.CustomFields;
            request.ImdbCode = dto.ImdbCode;
            request.ImdbLink = dto.ImdbLink;
            request.Year = dto.Year;
        }

        await SaveDataAsync().ConfigureAwait(false);
        return request;
    }

    public async Task<bool> DeleteAsync(Guid id)
    {
        bool removed;
        lock (_cacheLock)
        {
            removed = _requests.Remove(id);
        }

        if (removed)
        {
            await SaveDataAsync().ConfigureAwait(false);
        }

        return removed;
    }

    public async Task<MediaRequest?> SnoozeAsync(Guid id, DateTime snoozedUntil)
    {
        MediaRequest? request;
        lock (_cacheLock)
        {
            request = _requests.GetValueOrDefault(id);
            if (request == null)
            {
                return null;
            }

            request.Status = "snoozed";
            request.SnoozedUntil = snoozedUntil;
        }

        await SaveDataAsync().ConfigureAwait(false);
        return request;
    }

    public async Task<MediaRequest?> UnsnoozeAsync(Guid id)
    {
        MediaRequest? request;
        lock (_cacheLock)
        {
            request = _requests.GetValueOrDefault(id);
            if (request == null)
            {
                return null;
            }

            request.Status = "pending";
            request.SnoozedUntil = null;
        }

        await SaveDataAsync().ConfigureAwait(false);
        return request;
    }

    public int GetPendingCount()
    {
        lock (_cacheLock)
        {
            return _requests.Values.Count(r => r.Status == "pending");
        }
    }

    public int GetUnseenDoneCount(Guid userId)
    {
        lock (_cacheLock)
        {
            return _requests.Values.Count(r => r.UserId == userId && r.Status == "done" && !r.SeenByUser);
        }
    }

    public async Task MarkSeenAsync(Guid userId)
    {
        bool changed;
        lock (_cacheLock)
        {
            changed = false;
            foreach (var request in _requests.Values)
            {
                if (request.UserId == userId && request.Status == "done" && !request.SeenByUser)
                {
                    request.SeenByUser = true;
                    changed = true;
                }
            }
        }

        if (changed)
        {
            await SaveDataAsync().ConfigureAwait(false);
        }
    }

    public int GetUserCountThisMonth(Guid userId)
    {
        var startOfMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        lock (_cacheLock)
        {
            return _requests.Values.Count(r => r.UserId == userId && r.CreatedAt >= startOfMonth);
        }
    }

    public async Task<int> CleanupOldRejectedAsync(int daysOld)
    {
        var cutoff = DateTime.UtcNow.AddDays(-daysOld);
        List<Guid> toRemove;
        lock (_cacheLock)
        {
            toRemove = _requests.Values
                .Where(r => r.Status == "rejected" && r.CompletedAt.HasValue && r.CompletedAt.Value < cutoff)
                .Select(r => r.Id)
                .ToList();

            foreach (var id in toRemove)
            {
                _requests.Remove(id);
            }
        }

        if (toRemove.Count > 0)
        {
            await SaveDataAsync().ConfigureAwait(false);
        }

        return toRemove.Count;
    }
}
