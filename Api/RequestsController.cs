using System;
using System.Collections.Generic;
using System.Net.Mime;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Jellyfin.Data;
using Jellyfin.Database.Implementations.Enums;
using JellyRequest.Configuration;
using JellyRequest.Data;
using JellyRequest.Models;
using MediaBrowser.Controller.Library;
using MediaBrowser.Controller.Net;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace JellyRequest.Api;

[ApiController]
[Route("MediaRequests")]
[Produces(MediaTypeNames.Application.Json)]
public class RequestsController : ControllerBase
{
    private readonly RequestsRepository _requestsRepo;
    private readonly BanRepository _banRepo;
    private readonly IUserManager _userManager;
    private readonly IAuthorizationContext _authContext;

    private static readonly Regex ImdbCodeRegex = new(@"^tt\d+$", RegexOptions.Compiled);
    private static readonly Regex YearRegex = new(@"^\d{4}$", RegexOptions.Compiled);
    private static readonly string[] ValidStatuses = { "pending", "done", "rejected" };

    public RequestsController(
        RequestsRepository requestsRepo,
        BanRepository banRepo,
        IUserManager userManager,
        IAuthorizationContext authContext)
    {
        _requestsRepo = requestsRepo;
        _banRepo = banRepo;
        _userManager = userManager;
        _authContext = authContext;
    }

    private PluginConfiguration Config => Plugin.Instance?.Configuration ?? new PluginConfiguration();

    private async Task<AuthorizationInfo> GetAuthInfoAsync()
    {
        return await _authContext.GetAuthorizationInfo(HttpContext).ConfigureAwait(false);
    }

    // === User Endpoints ===

    [HttpPost]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<ActionResult<MediaRequest>> CreateRequest([FromBody] MediaRequestDto dto)
    {
        var config = Config;
        if (!config.EnableRequests)
        {
            return StatusCode(StatusCodes.Status403Forbidden, "Requests are disabled");
        }

        var auth = await GetAuthInfoAsync().ConfigureAwait(false);
        var userId = auth.UserId;
        var isAdmin = auth.User?.HasPermission(PermissionKind.IsAdministrator) ?? false;

        if (isAdmin && !config.EnableAdminRequests)
        {
            return StatusCode(StatusCodes.Status403Forbidden, "Admin requests are disabled");
        }

        if (_banRepo.IsUserBanned(userId))
        {
            return BadRequest("You are banned from making requests");
        }

        if (config.MaxRequestsPerMonth > 0)
        {
            var count = _requestsRepo.GetUserCountThisMonth(userId);
            if (count >= config.MaxRequestsPerMonth)
            {
                return BadRequest($"Monthly request limit reached ({config.MaxRequestsPerMonth})");
            }
        }

        if (string.IsNullOrWhiteSpace(dto.Title))
        {
            return BadRequest("Title is required");
        }

        if (config.RequestTypeRequired && config.RequestTypeEnabled && string.IsNullOrWhiteSpace(dto.Type))
        {
            return BadRequest("Type is required");
        }

        if (config.RequestNotesRequired && config.RequestNotesEnabled && string.IsNullOrWhiteSpace(dto.Notes))
        {
            return BadRequest("Notes are required");
        }

        if (config.RequestImdbCodeRequired && config.RequestImdbCodeEnabled && string.IsNullOrWhiteSpace(dto.ImdbCode))
        {
            return BadRequest("IMDB Code is required");
        }

        if (config.RequestImdbLinkRequired && config.RequestImdbLinkEnabled && string.IsNullOrWhiteSpace(dto.ImdbLink))
        {
            return BadRequest("IMDB Link is required");
        }

        if (config.RequestYearRequired && config.RequestYearEnabled && string.IsNullOrWhiteSpace(dto.Year))
        {
            return BadRequest("Year is required");
        }

        if (!string.IsNullOrWhiteSpace(dto.ImdbCode) && !ImdbCodeRegex.IsMatch(dto.ImdbCode))
        {
            return BadRequest("IMDB Code must match format: tt1234567");
        }

        if (!string.IsNullOrWhiteSpace(dto.Year) && !YearRegex.IsMatch(dto.Year))
        {
            return BadRequest("Year must be 4 digits");
        }

        var user = _userManager.GetUserById(userId);
        var request = new MediaRequest
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Username = user?.Username ?? "Unknown",
            Title = dto.Title,
            Type = dto.Type,
            Notes = dto.Notes,
            CustomFields = dto.CustomFields,
            ImdbCode = dto.ImdbCode,
            ImdbLink = dto.ImdbLink,
            Year = dto.Year,
            Status = "pending",
            CreatedAt = DateTime.UtcNow
        };

        var result = await _requestsRepo.AddAsync(request).ConfigureAwait(false);

        // Commented out — CleanupOldRejectedAsync depends on DeleteAsync which is disabled.
        // if (config.AutoDeleteRejectedDays > 0)
        // {
        //     await _requestsRepo.CleanupOldRejectedAsync(config.AutoDeleteRejectedDays).ConfigureAwait(false);
        // }

        return Ok(result);
    }

    [HttpGet("My")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<List<MediaRequest>>> GetMyRequests()
    {
        var userId = (await GetAuthInfoAsync().ConfigureAwait(false)).UserId;
        var requests = _requestsRepo.GetByUser(userId);
        var config = Config;

        Response.Headers["X-Request-Count"] = _requestsRepo.GetUserCountThisMonth(userId).ToString();
        Response.Headers["X-Request-Limit"] = config.MaxRequestsPerMonth.ToString();

        return Ok(requests);
    }

    [HttpPost("My/MarkSeen")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<ActionResult> MarkSeen()
    {
        var userId = (await GetAuthInfoAsync().ConfigureAwait(false)).UserId;
        await _requestsRepo.MarkSeenAsync(userId).ConfigureAwait(false);
        return NoContent();
    }

    [HttpGet("Notifications")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<NotificationInfo>> GetNotifications()
    {
        // Defense-in-depth: tell every cache layer (browser, service worker,
        // proxy) that this response must never be served from cache. The
        // frontend also adds a timestamp query param, but headers are belt
        // and suspenders for caches that key on path only.
        Response.Headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0";
        Response.Headers["Pragma"] = "no-cache";
        Response.Headers["Expires"] = "0";

        var auth = await GetAuthInfoAsync().ConfigureAwait(false);
        var userId = auth.UserId;
        var isAdmin = auth.User?.HasPermission(PermissionKind.IsAdministrator) ?? false;

        var count = isAdmin
            ? _requestsRepo.GetPendingCount()
            : _requestsRepo.GetUnseenCount(userId);

        return Ok(new NotificationInfo { Count = count, IsAdmin = isAdmin });
    }

    [HttpGet("Quota")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public async Task<ActionResult<RequestQuotaInfo>> GetQuota()
    {
        var userId = (await GetAuthInfoAsync().ConfigureAwait(false)).UserId;
        var config = Config;
        var currentCount = _requestsRepo.GetUserCountThisMonth(userId);
        var unlimited = config.MaxRequestsPerMonth <= 0;

        return Ok(new RequestQuotaInfo
        {
            CurrentCount = currentCount,
            MaxRequests = config.MaxRequestsPerMonth,
            Remaining = unlimited ? -1 : Math.Max(0, config.MaxRequestsPerMonth - currentCount),
            Unlimited = unlimited
        });
    }

    [HttpPut("{id}")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MediaRequest>> EditRequest([FromRoute] Guid id, [FromBody] MediaRequestDto dto)
    {
        var userId = (await GetAuthInfoAsync().ConfigureAwait(false)).UserId;
        var existing = _requestsRepo.GetById(id);

        if (existing == null)
        {
            return NotFound();
        }

        if (existing.UserId != userId)
        {
            return StatusCode(StatusCodes.Status403Forbidden, "You can only edit your own requests");
        }

        if (existing.Status != "pending")
        {
            return BadRequest("Can only edit pending requests");
        }

        if (string.IsNullOrWhiteSpace(dto.Title))
        {
            return BadRequest("Title is required");
        }

        if (!string.IsNullOrWhiteSpace(dto.ImdbCode) && !ImdbCodeRegex.IsMatch(dto.ImdbCode))
        {
            return BadRequest("IMDB Code must match format: tt1234567");
        }

        if (!string.IsNullOrWhiteSpace(dto.Year) && !YearRegex.IsMatch(dto.Year))
        {
            return BadRequest("Year must be 4 digits");
        }

        var result = await _requestsRepo.UpdateAsync(id, dto).ConfigureAwait(false);
        return result != null ? Ok(result) : BadRequest("Could not update request");
    }

    /* Commented out — replaced by ArchiveOwnRequest. Will probably reuse later.
    [HttpDelete("{id}")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> DeleteOwnRequest([FromRoute] Guid id)
    {
        var userId = (await GetAuthInfoAsync().ConfigureAwait(false)).UserId;

        var existing = _requestsRepo.GetById(id);

        if (existing == null)
        {
            return NotFound();
        }

        if (existing.UserId != userId)
        {
            return StatusCode(StatusCodes.Status403Forbidden, "You can only delete your own requests");
        }

        await _requestsRepo.DeleteAsync(id).ConfigureAwait(false);
        return NoContent();
    }
    */

    [HttpPost("{id}/Archive")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MediaRequest>> ArchiveOwnRequest([FromRoute] Guid id)
    {
        var userId = (await GetAuthInfoAsync().ConfigureAwait(false)).UserId;

        var existing = _requestsRepo.GetById(id);

        if (existing == null)
        {
            return NotFound();
        }

        if (existing.UserId != userId)
        {
            return StatusCode(StatusCodes.Status403Forbidden, "You can only archive your own requests");
        }

        var result = await _requestsRepo.ArchiveAsync(id).ConfigureAwait(false);
        return result != null ? Ok(result) : NotFound();
    }

    // === Admin Endpoints ===

    [HttpGet]
    [Authorize(Policy = "RequiresElevation")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult<List<MediaRequest>> GetAllRequests()
    {
        return Ok(_requestsRepo.GetAll());
    }

    [HttpPost("{id}/Status")]
    [Authorize(Policy = "RequiresElevation")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MediaRequest>> ChangeStatus(
        [FromRoute] Guid id,
        [FromQuery] string status,
        [FromQuery] string? mediaLink = null,
        [FromQuery] string? rejectionReason = null)
    {
        if (Array.IndexOf(ValidStatuses, status) < 0)
        {
            return BadRequest($"Status must be one of: {string.Join(", ", ValidStatuses)}");
        }

        var result = await _requestsRepo.UpdateStatusAsync(id, status, mediaLink, rejectionReason).ConfigureAwait(false);
        return result != null ? Ok(result) : NotFound();
    }

    [HttpPost("{id}/Snooze")]
    [Authorize(Policy = "RequiresElevation")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MediaRequest>> Snooze(
        [FromRoute] Guid id,
        [FromQuery] DateTime snoozedUntil,
        [FromQuery] string? reason = null)
    {
        if (snoozedUntil <= DateTime.UtcNow)
        {
            return BadRequest("Snooze date must be in the future");
        }

        var result = await _requestsRepo.SnoozeAsync(id, snoozedUntil, reason).ConfigureAwait(false);
        return result != null ? Ok(result) : NotFound();
    }

    [HttpPost("{id}/Unsnooze")]
    [Authorize(Policy = "RequiresElevation")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MediaRequest>> Unsnooze([FromRoute] Guid id)
    {
        var result = await _requestsRepo.UnsnoozeAsync(id).ConfigureAwait(false);
        return result != null ? Ok(result) : NotFound();
    }

    [HttpDelete("Admin/{id}")]
    [Authorize(Policy = "RequiresElevation")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> AdminDelete([FromRoute] Guid id)
    {
        var deleted = await _requestsRepo.DeleteAsync(id).ConfigureAwait(false);
        return deleted ? NoContent() : NotFound();
    }

    [HttpPost("Admin/{id}/Archive")]
    [Authorize(Policy = "RequiresElevation")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MediaRequest>> AdminArchive([FromRoute] Guid id)
    {
        var result = await _requestsRepo.ArchiveAsync(id).ConfigureAwait(false);
        return result != null ? Ok(result) : NotFound();
    }

    [HttpPost("Admin/{id}/Unarchive")]
    [Authorize(Policy = "RequiresElevation")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult<MediaRequest>> AdminUnarchive([FromRoute] Guid id)
    {
        var result = await _requestsRepo.UnarchiveAsync(id).ConfigureAwait(false);
        return result != null ? Ok(result) : NotFound();
    }

    [HttpGet("Bans")]
    [Authorize(Policy = "RequiresElevation")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult<List<UserBan>> GetBans()
    {
        return Ok(_banRepo.GetAll());
    }

    [HttpPost("Bans")]
    [Authorize(Policy = "RequiresElevation")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<UserBan>> BanUser(
        [FromQuery] Guid userId,
        [FromQuery] string? reason = null,
        [FromQuery] DateTime? expiresAt = null)
    {
        if (_banRepo.IsUserBanned(userId))
        {
            return BadRequest("User is already banned");
        }

        var user = _userManager.GetUserById(userId);
        var ban = new UserBan
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Username = user?.Username ?? "Unknown",
            Reason = reason ?? string.Empty,
            BannedAt = DateTime.UtcNow,
            ExpiresAt = expiresAt
        };

        var result = await _banRepo.AddAsync(ban).ConfigureAwait(false);
        return Ok(result);
    }

    [HttpDelete("Bans/{banId}")]
    [Authorize(Policy = "RequiresElevation")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<ActionResult> RemoveBan([FromRoute] Guid banId)
    {
        var removed = await _banRepo.RemoveAsync(banId).ConfigureAwait(false);
        return removed ? NoContent() : NotFound();
    }

    // === Public ===

    [HttpGet("Config")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    public ActionResult GetConfig()
    {
        var config = Config;
        return Ok(new
        {
            config.EnableRequests,
            config.MaxRequestsPerMonth,
            config.RequestWindowTitle,
            config.RequestWindowDescription,
            config.RequestSubmitButtonText,
            config.RequestTitleLabel,
            config.RequestTitlePlaceholder,
            config.RequestTypeEnabled,
            config.RequestTypeRequired,
            config.RequestTypeLabel,
            config.RequestNotesEnabled,
            config.RequestNotesRequired,
            config.RequestNotesLabel,
            config.RequestNotesPlaceholder,
            config.RequestImdbCodeEnabled,
            config.RequestImdbCodeRequired,
            config.RequestImdbCodeLabel,
            config.RequestImdbCodePlaceholder,
            config.RequestImdbLinkEnabled,
            config.RequestImdbLinkRequired,
            config.RequestImdbLinkLabel,
            config.RequestImdbLinkPlaceholder,
            config.RequestYearEnabled,
            config.RequestYearRequired,
            config.RequestYearLabel,
            config.RequestYearPlaceholder,
            config.CustomRequestFields
        });
    }

    [HttpGet("jellyrequest.js")]
    [AllowAnonymous]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public ActionResult GetScript()
    {
        var assembly = typeof(RequestsController).Assembly;
        var resourceName = "JellyRequest.Web.jellyrequest.js";
        var stream = assembly.GetManifestResourceStream(resourceName);
        if (stream == null)
        {
            return NotFound();
        }

        return File(stream, "application/javascript");
    }
}
