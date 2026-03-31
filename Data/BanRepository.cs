using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Jellyfin.Plugin.MediaRequests.Models;
using MediaBrowser.Common.Configuration;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.MediaRequests.Data;

public class BanRepository
{
    private readonly string _filePath;
    private readonly ILogger<BanRepository> _logger;
    private readonly SemaphoreSlim _writeLock = new(1, 1);
    private readonly object _cacheLock = new();
    private Dictionary<Guid, UserBan> _bans = new();
    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        WriteIndented = true
    };

    public BanRepository(IApplicationPaths applicationPaths, ILogger<BanRepository> logger)
    {
        _logger = logger;
        var dataPath = Path.Combine(applicationPaths.DataPath, "media-requests");
        _filePath = Path.Combine(dataPath, "bans.json");
        Directory.CreateDirectory(dataPath);
        LoadData();
    }

    private void LoadData()
    {
        try
        {
            if (File.Exists(_filePath))
            {
                var json = File.ReadAllText(_filePath);
                var list = JsonSerializer.Deserialize<List<UserBan>>(json, _jsonOptions) ?? new List<UserBan>();
                lock (_cacheLock)
                {
                    _bans = list.ToDictionary(b => b.Id);
                }

                _logger.LogInformation("Loaded {Count} bans from storage", list.Count);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to load bans data");
            _bans = new Dictionary<Guid, UserBan>();
        }
    }

    private async Task SaveDataAsync()
    {
        await _writeLock.WaitAsync().ConfigureAwait(false);
        try
        {
            List<UserBan> list;
            lock (_cacheLock)
            {
                list = _bans.Values.ToList();
            }

            var json = JsonSerializer.Serialize(list, _jsonOptions);
            await File.WriteAllTextAsync(_filePath, json).ConfigureAwait(false);
        }
        finally
        {
            _writeLock.Release();
        }
    }

    public async Task<UserBan> AddAsync(UserBan ban)
    {
        lock (_cacheLock)
        {
            _bans[ban.Id] = ban;
        }

        await SaveDataAsync().ConfigureAwait(false);
        return ban;
    }

    public async Task<bool> RemoveAsync(Guid banId)
    {
        bool removed;
        lock (_cacheLock)
        {
            removed = _bans.Remove(banId);
        }

        if (removed)
        {
            await SaveDataAsync().ConfigureAwait(false);
        }

        return removed;
    }

    public UserBan? GetByUser(Guid userId)
    {
        lock (_cacheLock)
        {
            return _bans.Values.FirstOrDefault(b =>
                b.UserId == userId &&
                (!b.ExpiresAt.HasValue || b.ExpiresAt.Value > DateTime.UtcNow));
        }
    }

    public bool IsUserBanned(Guid userId)
    {
        return GetByUser(userId) != null;
    }

    public List<UserBan> GetAll()
    {
        lock (_cacheLock)
        {
            return _bans.Values.ToList();
        }
    }
}
