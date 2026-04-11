(function () {
    'use strict';

    const INIT_TIMEOUT = 2000;
    const BUTTON_RETRY_MAX = 10;
    const BUTTON_RETRY_INTERVAL = 1000;
    const NOTIFY_AUTH_RETRY_DELAY = 250;
    const NOTIFY_AUTH_MAX_ATTEMPTS = 20;

    let config = null;
    let modalOpen = false;
    let stylesInjected = false;
    let isAdmin = false;

    // ── Styles ──────────────────────────────────────────────

    function injectStyles() {
        if (stylesInjected || document.getElementById('jellyrequest-styles')) return;
        const style = document.createElement('style');
        style.id = 'jellyrequest-styles';
        style.textContent = `
            .jellyrequest-btn {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                background: transparent;
                border: 1px solid rgba(255,255,255,0.2);
                color: rgba(255,255,255,0.8);
                padding: 6px 14px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 0.9em;
                margin-left: 8px;
                transition: background 0.2s, color 0.2s;
                white-space: nowrap;
                position: relative;
            }
            .jellyrequest-btn:hover {
                background: rgba(255,255,255,0.1);
                color: #fff;
            }
            .jellyrequest-btn svg {
                width: 18px;
                height: 18px;
                fill: currentColor;
            }
            .jellyrequest-notify {
                position: absolute;
                top: -6px;
                right: -6px;
                background: #e74c3c;
                color: #fff;
                font-size: 0.65em;
                font-weight: 700;
                min-width: 16px;
                height: 16px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0 4px;
                line-height: 1;
            }

            /* Overlay */
            .jellyrequest-overlay {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.7);
                z-index: 10000;
                display: flex;
                align-items: center;
                justify-content: center;
                animation: jellyrequest-fadein 0.2s ease;
            }
            @keyframes jellyrequest-fadein { from { opacity: 0; } to { opacity: 1; } }

            .jellyrequest-panel {
                background: #1c1c1e;
                color: #eee;
                border-radius: 10px;
                width: 90%;
                max-width: 620px;
                max-height: 85vh;
                overflow-y: auto;
                box-shadow: 0 8px 40px rgba(0,0,0,0.6);
                animation: jellyrequest-slidein 0.25s ease;
            }
            @keyframes jellyrequest-slidein { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
            .jellyrequest-panel-header {
                display: flex; align-items: center; justify-content: space-between;
                padding: 16px 20px; border-bottom: 1px solid rgba(255,255,255,0.1);
            }
            .jellyrequest-panel-header h2 { margin: 0; font-size: 1.2em; font-weight: 600; }
            .jellyrequest-close {
                background: none; border: none; color: rgba(255,255,255,0.5);
                font-size: 1.6em; cursor: pointer; padding: 0 4px; line-height: 1;
            }
            .jellyrequest-close:hover { color: #fff; }
            .jellyrequest-panel-body { padding: 20px; }

            /* Tabs */
            .jellyrequest-tabs {
                display: flex; gap: 0;
                border-bottom: 1px solid rgba(255,255,255,0.1); margin-bottom: 16px;
            }
            .jellyrequest-tab {
                flex: 1; padding: 10px 0; text-align: center; cursor: pointer;
                color: rgba(255,255,255,0.5); border-bottom: 2px solid transparent;
                transition: color 0.2s, border-color 0.2s; font-size: 0.9em;
                background: none; border-top: none; border-left: none; border-right: none;
            }
            .jellyrequest-tab.active { color: #fff; border-bottom-color: #00a4dc; }
            .jellyrequest-tab:hover:not(.active) { color: rgba(255,255,255,0.8); }

            /* Form */
            .jellyrequest-form label { display: block; margin-bottom: 4px; font-size: 0.85em; color: rgba(255,255,255,0.7); }
            .jellyrequest-form label .req { color: #e74c3c; margin-left: 2px; }
            .jellyrequest-form input, .jellyrequest-form select, .jellyrequest-form textarea {
                width: 100%; padding: 8px 10px; margin-bottom: 12px;
                border: 1px solid rgba(255,255,255,0.15); border-radius: 4px;
                background: rgba(255,255,255,0.06); color: #eee; font-size: 0.9em;
                font-family: inherit; box-sizing: border-box;
            }
            .jellyrequest-form input:focus, .jellyrequest-form select:focus, .jellyrequest-form textarea:focus {
                outline: none; border-color: #00a4dc;
            }
            .jellyrequest-form textarea { resize: vertical; min-height: 60px; }
            .jellyrequest-form .jellyrequest-desc { color: rgba(255,255,255,0.5); font-size: 0.8em; margin-bottom: 16px; }
            .jellyrequest-submit {
                width: 100%; padding: 10px; background: #00a4dc; color: #fff;
                border: none; border-radius: 4px; cursor: pointer; font-size: 1em; font-weight: 600;
            }
            .jellyrequest-submit:hover { background: #008fbe; }
            .jellyrequest-submit:disabled { opacity: 0.5; cursor: not-allowed; }

            .jellyrequest-msg { padding: 8px 12px; border-radius: 4px; margin-bottom: 12px; font-size: 0.85em; }
            .jellyrequest-msg.success { background: rgba(39,174,96,0.2); color: #27ae60; }
            .jellyrequest-msg.error { background: rgba(231,76,60,0.2); color: #e74c3c; }

            .jellyrequest-quota {
                text-align: center; padding: 8px; margin-bottom: 12px;
                background: rgba(255,255,255,0.04); border-radius: 4px;
                font-size: 0.85em; color: rgba(255,255,255,0.6);
            }

            /* Request list */
            .jellyrequest-list { list-style: none; padding: 0; margin: 0; }
            .jellyrequest-list-item {
                padding: 12px; border: 1px solid rgba(255,255,255,0.08);
                border-radius: 6px; margin-bottom: 8px; background: rgba(255,255,255,0.03);
            }
            .jellyrequest-list-header {
                display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px;
            }
            .jellyrequest-list-title {
                font-weight: 600; font-size: 0.95em; flex: 1; min-width: 0;
                overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
            }
            .jellyrequest-badge {
                display: inline-block; padding: 2px 8px; border-radius: 10px;
                font-size: 0.75em; font-weight: 600; text-transform: uppercase; flex-shrink: 0;
            }
            .jellyrequest-badge.pending { background: rgba(241,196,15,0.2); color: #f1c40f; }
            .jellyrequest-badge.processing { background: rgba(52,152,219,0.2); color: #3498db; }
            .jellyrequest-badge.done { background: rgba(39,174,96,0.2); color: #27ae60; }
            .jellyrequest-badge.rejected { background: rgba(231,76,60,0.2); color: #e74c3c; }
            .jellyrequest-badge.snoozed { background: rgba(149,165,166,0.2); color: #95a5a6; }
            .jellyrequest-list-meta { font-size: 0.8em; color: rgba(255,255,255,0.4); }
            .jellyrequest-list-actions {
                display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap;
            }
            .jellyrequest-list-actions button {
                padding: 4px 10px; border: 1px solid rgba(255,255,255,0.15);
                border-radius: 3px; background: transparent; color: rgba(255,255,255,0.7);
                cursor: pointer; font-size: 0.8em;
            }
            .jellyrequest-list-actions button:hover { background: rgba(255,255,255,0.1); color: #fff; }
            .jellyrequest-list-actions button.danger { border-color: rgba(231,76,60,0.3); color: #e74c3c; }
            .jellyrequest-list-actions button.danger:hover { background: rgba(231,76,60,0.15); }
            .jellyrequest-list-actions button.primary { border-color: rgba(0,164,220,0.3); color: #00a4dc; }
            .jellyrequest-list-actions button.primary:hover { background: rgba(0,164,220,0.15); }
            .jellyrequest-list-actions button.success { border-color: rgba(39,174,96,0.3); color: #27ae60; }
            .jellyrequest-list-actions button.success:hover { background: rgba(39,174,96,0.15); }
            .jellyrequest-list-actions button.warning { border-color: rgba(241,196,15,0.3); color: #f1c40f; }
            .jellyrequest-list-actions button.warning:hover { background: rgba(241,196,15,0.15); }
            .jellyrequest-empty { text-align: center; padding: 24px; color: rgba(255,255,255,0.4); font-size: 0.9em; }

            .jellyrequest-edit-form input, .jellyrequest-edit-form textarea, .jellyrequest-edit-form select {
                width: 100%; padding: 6px 8px; margin-bottom: 6px;
                border: 1px solid rgba(255,255,255,0.15); border-radius: 3px;
                background: rgba(255,255,255,0.06); color: #eee; font-size: 0.85em;
                font-family: inherit; box-sizing: border-box;
            }
            .jellyrequest-edit-form textarea { resize: vertical; min-height: 40px; }
            .jellyrequest-edit-actions { display: flex; gap: 6px; }
            .jellyrequest-edit-actions button { padding: 4px 12px; border-radius: 3px; cursor: pointer; font-size: 0.8em; border: none; }
            .jellyrequest-edit-actions .save-btn { background: #00a4dc; color: #fff; }
            .jellyrequest-edit-actions .cancel-btn { background: rgba(255,255,255,0.1); color: #ccc; }

            .jellyrequest-confirm {
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.5); z-index: 10001;
                display: flex; align-items: center; justify-content: center;
            }
            .jellyrequest-confirm-box { background: #2c2c2e; padding: 24px; border-radius: 8px; text-align: center; max-width: 380px; }
            .jellyrequest-confirm-box p { margin: 0 0 16px; color: #eee; }
            .jellyrequest-confirm-box .confirm-input {
                width: 100%; padding: 8px; margin-bottom: 12px;
                border: 1px solid rgba(255,255,255,0.2); border-radius: 4px;
                background: rgba(255,255,255,0.06); color: #eee; font-size: 0.9em; box-sizing: border-box;
            }
            .jellyrequest-confirm-box button { padding: 8px 20px; margin: 0 6px; border: none; border-radius: 4px; cursor: pointer; font-size: 0.9em; }
            .jellyrequest-confirm-box .confirm-yes { background: #e74c3c; color: #fff; }
            .jellyrequest-confirm-box .confirm-ok { background: #00a4dc; color: #fff; }
            .jellyrequest-confirm-box .confirm-no { background: rgba(255,255,255,0.1); color: #ccc; }

            /* Multi-select filter bar */
            .jellyrequest-filter-bar { display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap; }
            .jellyrequest-filter-bar button {
                padding: 4px 10px; border: 1px solid rgba(255,255,255,0.15);
                border-radius: 12px; background: transparent; color: rgba(255,255,255,0.5);
                cursor: pointer; font-size: 0.8em; transition: all 0.15s; user-select: none;
            }
            .jellyrequest-filter-bar button.active {
                background: rgba(0,164,220,0.2); border-color: #00a4dc; color: #00a4dc;
            }
            .jellyrequest-filter-bar button:hover:not(.active) { color: rgba(255,255,255,0.8); }

            /* Section headers in admin list */
            .jellyrequest-section-header {
                font-size: 0.85em; font-weight: 600; color: rgba(255,255,255,0.5);
                text-transform: uppercase; letter-spacing: 0.05em;
                padding: 8px 0 4px; margin-top: 8px;
                border-top: 1px solid rgba(255,255,255,0.06);
            }
            .jellyrequest-section-header:first-child { margin-top: 0; border-top: none; }

            .jellyrequest-snooze-info { font-size: 0.8em; color: #95a5a6; margin-top: 2px; }
            .jellyrequest-rejection { font-size: 0.8em; color: #e74c3c; margin-top: 2px; }
            .jellyrequest-requester { font-size: 0.8em; color: rgba(255,255,255,0.5); }
            .jellyrequest-details {
                margin-top: 6px; padding-top: 6px;
                border-top: 1px dashed rgba(255,255,255,0.08);
                font-size: 0.8em; color: rgba(255,255,255,0.65);
                display: flex; flex-direction: column; gap: 2px;
            }
            .jellyrequest-detail { word-break: break-word; }
            .jellyrequest-detail-label { color: rgba(255,255,255,0.45); font-weight: 600; }
            .jellyrequest-detail a { color: #00a4dc; text-decoration: none; }
            .jellyrequest-detail a:hover { text-decoration: underline; }
        `;
        document.head.appendChild(style);
        stylesInjected = true;
    }

    // ── API helpers ─────────────────────────────────────────

    function getApiClient() { return window.ApiClient || null; }

    function getAuthHeader() {
        const api = getApiClient();
        if (!api) return null;
        const token = typeof api.accessToken === 'function' ? api.accessToken() : api._serverInfo?.AccessToken;
        const deviceId = typeof api.deviceId === 'function' ? api.deviceId() : api._deviceId;
        const deviceName = typeof api.deviceName === 'function' ? api.deviceName() : api._deviceName || 'JellyRequest';
        const clientName = typeof api.appName === 'function' ? api.appName() : 'JellyRequest';
        const clientVersion = typeof api.appVersion === 'function' ? api.appVersion() : '1.0.0';
        if (!token) return null;
        return `MediaBrowser Client="${clientName}", Device="${deviceName}", DeviceId="${deviceId}", Version="${clientVersion}", Token="${token}"`;
    }

    function getBaseUrl() {
        const api = getApiClient();
        if (!api) return '';
        const addr = typeof api.serverAddress === 'function' ? api.serverAddress() : api._serverAddress || '';
        return addr.replace(/\/$/, '');
    }

    function isAuthenticated() {
        const api = getApiClient();
        if (!api) return false;
        const token = typeof api.accessToken === 'function' ? api.accessToken() : api._serverInfo?.AccessToken;
        return !!token;
    }

    async function apiFetch(path, options = {}) {
        const base = getBaseUrl();
        const auth = getAuthHeader();
        const headers = { ...(options.headers || {}) };
        if (auth) headers['X-Emby-Authorization'] = auth;
        if (options.body && typeof options.body === 'string') headers['Content-Type'] = 'application/json';
        const resp = await fetch(`${base}${path}`, { cache: 'no-store', ...options, headers });
        if (!resp.ok) {
            const errText = await resp.text().catch(() => '');
            throw new Error(errText || `API ${resp.status}`);
        }
        // Auto-refresh the badge after any successful state-changing call.
        // This is the single point that guarantees every action handler benefits
        // — no need to remember to call updateNotificationBadge() in every place.
        // We exclude /Notifications itself (would recurse) and any GET (read-only).
        const method = (options.method || 'GET').toUpperCase();
        if (method !== 'GET' && !path.startsWith('/MediaRequests/Notifications')) {
            // Defer to next tick so the caller's response handler runs first.
            setTimeout(() => updateNotificationBadge(), 0);
        }
        if (resp.status === 204) return null;
        const text = await resp.text();
        return text ? JSON.parse(text) : null;
    }

    async function fetchConfig() { if (config) return config; config = await apiFetch('/MediaRequests/Config'); return config; }
    async function fetchMyRequests() { return apiFetch('/MediaRequests/My'); }
    async function fetchAllRequests() { return apiFetch('/MediaRequests'); }
    async function fetchQuota() { return apiFetch('/MediaRequests/Quota'); }
    async function createRequest(dto) { return apiFetch('/MediaRequests', { method: 'POST', body: JSON.stringify(dto) }); }
    async function deleteRequest(id) { return apiFetch(`/MediaRequests/${id}`, { method: 'DELETE' }); }
    async function adminDeleteRequest(id) { return apiFetch(`/MediaRequests/Admin/${id}`, { method: 'DELETE' }); }
    async function editRequest(id, dto) { return apiFetch(`/MediaRequests/${id}`, { method: 'PUT', body: JSON.stringify(dto) }); }
    async function changeStatus(id, status, mediaLink, rejectionReason) {
        let url = `/MediaRequests/${id}/Status?status=${encodeURIComponent(status)}`;
        if (mediaLink) url += `&mediaLink=${encodeURIComponent(mediaLink)}`;
        if (rejectionReason) url += `&rejectionReason=${encodeURIComponent(rejectionReason)}`;
        return apiFetch(url, { method: 'POST' });
    }
    async function snoozeRequest(id, snoozedUntil, reason) {
        let url = `/MediaRequests/${id}/Snooze?snoozedUntil=${encodeURIComponent(snoozedUntil)}`;
        if (reason) url += `&reason=${encodeURIComponent(reason)}`;
        return apiFetch(url, { method: 'POST' });
    }
    async function unsnoozeRequest(id) { return apiFetch(`/MediaRequests/${id}/Unsnooze`, { method: 'POST' }); }
    async function markSeen() { return apiFetch('/MediaRequests/My/MarkSeen', { method: 'POST' }); }
    // Timestamp query param defeats every cache layer (browser, service worker, proxy).
    // Each call has a unique URL → no cache key collision is possible.
    async function fetchNotifications() { return apiFetch(`/MediaRequests/Notifications?_=${Date.now()}`); }

    async function checkAdmin() {
        try { await apiFetch('/MediaRequests'); return true; } catch { return false; }
    }

    // ── Dialogs ─────────────────────────────────────────────

    function showConfirm(message, confirmText = 'Delete') {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'jellyrequest-confirm';
            overlay.innerHTML = `<div class="jellyrequest-confirm-box"><p>${escapeHtml(message)}</p><button class="confirm-yes">${escapeHtml(confirmText)}</button><button class="confirm-no">Cancel</button></div>`;
            overlay.querySelector('.confirm-yes').addEventListener('click', () => { overlay.remove(); resolve(true); });
            overlay.querySelector('.confirm-no').addEventListener('click', () => { overlay.remove(); resolve(false); });
            overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); resolve(false); } });
            document.body.appendChild(overlay);
        });
    }

    function showPrompt(message, placeholder = '') {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'jellyrequest-confirm';
            overlay.innerHTML = `<div class="jellyrequest-confirm-box"><p>${escapeHtml(message)}</p><input class="confirm-input" type="text" placeholder="${escapeHtml(placeholder)}"><div><button class="confirm-ok">OK</button><button class="confirm-no">Cancel</button></div></div>`;
            const input = overlay.querySelector('.confirm-input');
            overlay.querySelector('.confirm-ok').addEventListener('click', () => { overlay.remove(); resolve(input.value); });
            overlay.querySelector('.confirm-no').addEventListener('click', () => { overlay.remove(); resolve(null); });
            overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); resolve(null); } });
            document.body.appendChild(overlay); input.focus();
        });
    }

    function showDatePrompt(message) {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'jellyrequest-confirm';
            const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 16);
            overlay.innerHTML = `<div class="jellyrequest-confirm-box"><p>${escapeHtml(message)}</p><input class="confirm-input" type="datetime-local" value="${tomorrow}"><div><button class="confirm-ok">Snooze</button><button class="confirm-no">Cancel</button></div></div>`;
            overlay.querySelector('.confirm-ok').addEventListener('click', () => { overlay.remove(); resolve(overlay.querySelector('.confirm-input').value); });
            overlay.querySelector('.confirm-no').addEventListener('click', () => { overlay.remove(); resolve(null); });
            overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); resolve(null); } });
            document.body.appendChild(overlay);
        });
    }

    // Combined snooze dialog: date (required) + optional reason text the
    // user will see alongside the snooze date in their My Requests list.
    function showDateReasonPrompt(message) {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'jellyrequest-confirm';
            const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 16);
            overlay.innerHTML = `<div class="jellyrequest-confirm-box"><p>${escapeHtml(message)}</p><input class="confirm-input jr-sdr-date" type="datetime-local" value="${tomorrow}"><input class="confirm-input jr-sdr-reason" type="text" placeholder="Reason (optional, visible to user)"><div><button class="confirm-ok">Snooze</button><button class="confirm-no">Cancel</button></div></div>`;
            const dateInput = overlay.querySelector('.jr-sdr-date');
            const reasonInput = overlay.querySelector('.jr-sdr-reason');
            overlay.querySelector('.confirm-ok').addEventListener('click', () => {
                const date = dateInput.value;
                if (!date) return;
                const reason = reasonInput.value.trim();
                overlay.remove();
                resolve({ date, reason });
            });
            overlay.querySelector('.confirm-no').addEventListener('click', () => { overlay.remove(); resolve(null); });
            overlay.addEventListener('click', (e) => { if (e.target === overlay) { overlay.remove(); resolve(null); } });
            document.body.appendChild(overlay);
            dateInput.focus();
        });
    }

    function escapeHtml(str) { if (!str) return ''; const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
    function safeUrl(str) { if (!str) return ''; const s = String(str).trim(); return /^https?:\/\//i.test(s) ? s : ''; }
    // "Apr 18th 2026" — short month + ordinal day + year. Ordinal suffix
    // is "th" for 11/12/13 regardless of their ones digit, then st/nd/rd/th by ones.
    function formatLongDate(d) {
        const date = d instanceof Date ? d : new Date(d);
        if (isNaN(date.getTime())) return '';
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const day = date.getDate();
        const suffix = (day >= 11 && day <= 13) ? 'th' : (['th', 'st', 'nd', 'rd'][day % 10] || 'th');
        return `${months[date.getMonth()]} ${day}${suffix} ${date.getFullYear()}`;
    }

    // ── Notification Badge ──────────────────────────────────
    //
    // Event-driven, no polling. The badge refreshes on:
    //   1. Initial page load (auth-aware — waits for ApiClient token)
    //   2. SPA navigation (hashchange — Jellyfin uses hash routing)
    //   3. Tab becoming visible
    //   4. Local mutations (delete, status change, modal close — wired in their handlers)
    //
    // The server is the source of truth for both the count and the user's role.
    // Every fetch has a unique URL (timestamp query param) so caches can't serve
    // stale data.

    async function updateNotificationBadge() {
        const btn = document.querySelector('.jellyrequest-btn');
        if (!btn) return;
        if (!isAuthenticated()) { console.debug('[JR] badge: not authenticated'); return; }

        let result;
        try {
            result = await fetchNotifications();
        } catch (err) {
            console.warn('[JR] badge: fetch failed', err);
            return;
        }
        if (!result) { console.warn('[JR] badge: empty response'); return; }

        // Read both casings defensively in case of any serializer policy difference.
        const adminFlag = result.IsAdmin ?? result.isAdmin;
        const countRaw = result.Count ?? result.count;
        isAdmin = !!adminFlag;
        const count = Number(countRaw) || 0;
        console.debug('[JR] badge: response', { isAdmin, count, raw: result });

        let badge = btn.querySelector('.jellyrequest-notify');
        if (count > 0) {
            if (!badge) {
                badge = document.createElement('span');
                badge.className = 'jellyrequest-notify';
                btn.appendChild(badge);
            }
            badge.textContent = count;
        } else if (badge) {
            badge.remove();
        }
    }

    // Used only for the initial page-load refresh: ApiClient may still be loading
    // its token from storage when this fires. Poll the LOCAL auth flag (no API
    // calls) every 250ms for up to 5 seconds, then update the badge once.
    async function refreshBadgeWhenAuthReady() {
        for (let i = 0; i < NOTIFY_AUTH_MAX_ATTEMPTS; i++) {
            if (isAuthenticated()) return updateNotificationBadge();
            await new Promise(r => setTimeout(r, NOTIFY_AUTH_RETRY_DELAY));
        }
        console.debug('[JR] badge: gave up waiting for auth');
    }

    // Patch history.pushState/replaceState to emit a 'locationchange' event.
    // Jellyfin's view manager uses these for some library/page transitions
    // that don't fire hashchange. This is the standard SPA navigation trick.
    function installHistoryPatch() {
        if (window.__jellyrequestHistoryPatched) return;
        window.__jellyrequestHistoryPatched = true;
        ['pushState', 'replaceState'].forEach(method => {
            const original = history[method];
            history[method] = function () {
                const result = original.apply(this, arguments);
                window.dispatchEvent(new Event('locationchange'));
                return result;
            };
        });
    }

    let badgeEventHooksInstalled = false;
    function startBadgeUpdates() {
        // Refresh on every call so each fresh button injection picks up state.
        refreshBadgeWhenAuthReady();

        if (badgeEventHooksInstalled) return;
        badgeEventHooksInstalled = true;

        installHistoryPatch();

        // SPA navigation — three event sources cover every nav path Jellyfin uses:
        //   hashchange      — hash-routed pages (#!/movies.html?...)
        //   popstate        — back/forward buttons
        //   locationchange  — pushState/replaceState (our monkey-patch above)
        window.addEventListener('hashchange', updateNotificationBadge);
        window.addEventListener('popstate', updateNotificationBadge);
        window.addEventListener('locationchange', updateNotificationBadge);

        // User comes back to the tab from another tab/app.
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden) updateNotificationBadge();
        });

        // Fallback: any click inside the Jellyfin header (library tabs, sidebar
        // toggle, home button, settings) triggers a refresh. This is the safety
        // net for nav paths that bypass the History API entirely. Debounced via
        // a microtask so a flurry of clicks coalesces into one fetch.
        let clickPending = false;
        document.addEventListener('click', (e) => {
            if (clickPending) return;
            if (!e.target.closest('.skinHeader, .mainDrawer, .navMenuOption')) return;
            clickPending = true;
            queueMicrotask(() => { clickPending = false; updateNotificationBadge(); });
        }, true);
    }

    // ── Header Button ───────────────────────────────────────

    function isVideoPlaying() { const v = document.querySelector('video'); return v && !v.paused; }

    function injectHeaderButton(attempt = 0) {
        if (document.querySelector('.jellyrequest-btn')) return;
        const header = document.querySelector('.skinHeader .headerRight') || document.querySelector('.skinHeader') || document.querySelector('.headerTabs');
        if (!header) { if (attempt < BUTTON_RETRY_MAX) setTimeout(() => injectHeaderButton(attempt + 1), BUTTON_RETRY_INTERVAL); return; }

        const btn = document.createElement('button');
        btn.className = 'jellyrequest-btn';
        btn.innerHTML = `<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg> Request`;
        btn.title = 'Request Media';
        btn.addEventListener('click', openModal);

        const headerRight = header.classList.contains('headerRight') ? header : header.querySelector('.headerRight');
        if (headerRight) headerRight.insertBefore(btn, headerRight.firstChild);
        else header.appendChild(btn);

        // Wire up event-driven badge updates after button is injected
        startBadgeUpdates();
    }

    function updateButtonVisibility() {
        const btn = document.querySelector('.jellyrequest-btn');
        if (!btn) return;
        btn.style.display = (!isAuthenticated() || isVideoPlaying()) ? 'none' : '';
    }

    // ── Modal ───────────────────────────────────────────────

    async function openModal() {
        if (modalOpen) return;
        modalOpen = true;
        document.body.style.overflow = 'hidden';

        isAdmin = await checkAdmin();

        // Users with unseen terminal (done/rejected) requests jump straight to "My Requests"
        let userHasUnseen = false;
        if (!isAdmin) {
            try {
                const my = await fetchMyRequests();
                userHasUnseen = !!(my && my.some(r => (r.Status === 'done' || r.Status === 'rejected') && !r.SeenByUser));
            } catch {}
        }

        const defaultTab = isAdmin ? 'admin' : (userHasUnseen ? 'list' : 'form');

        const overlay = document.createElement('div');
        overlay.className = 'jellyrequest-overlay';
        overlay.id = 'jellyrequest-modal';
        overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });

        const panel = document.createElement('div');
        panel.className = 'jellyrequest-panel';

        const tabClass = (id) => `jellyrequest-tab${defaultTab === id ? ' active' : ''}`;
        let tabsHtml = '';
        if (isAdmin) {
            tabsHtml += `<button class="${tabClass('admin')}" data-tab="admin">All Requests</button>`;
            tabsHtml += `<button class="${tabClass('form')}" data-tab="form">New Request</button>`;
            tabsHtml += `<button class="${tabClass('list')}" data-tab="list">My Requests</button>`;
        } else {
            tabsHtml += `<button class="${tabClass('form')}" data-tab="form">New Request</button>`;
            tabsHtml += `<button class="${tabClass('list')}" data-tab="list">My Requests</button>`;
        }

        panel.innerHTML = `
            <div class="jellyrequest-panel-header">
                <h2>Request Media</h2>
                <button class="jellyrequest-close" title="Close">&times;</button>
            </div>
            <div class="jellyrequest-panel-body">
                <div class="jellyrequest-tabs">${tabsHtml}</div>
                <div class="jellyrequest-quota"></div>
                <div id="jellyrequest-tab-form" style="${defaultTab !== 'form' ? 'display:none;' : ''}"></div>
                <div id="jellyrequest-tab-list" style="${defaultTab !== 'list' ? 'display:none;' : ''}"></div>
                ${isAdmin ? `<div id="jellyrequest-tab-admin" style="${defaultTab !== 'admin' ? 'display:none;' : ''}"></div>` : ''}
            </div>
        `;

        overlay.appendChild(panel);
        document.body.appendChild(overlay);

        panel.querySelector('.jellyrequest-close').addEventListener('click', closeModal);

        const allTabIds = ['form', 'list', 'admin'];
        panel.querySelectorAll('.jellyrequest-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                panel.querySelectorAll('.jellyrequest-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const target = tab.dataset.tab;
                allTabIds.forEach(id => { const el = document.getElementById(`jellyrequest-tab-${id}`); if (el) el.style.display = id === target ? '' : 'none'; });
                if (target === 'list') renderRequestsList();
                if (target === 'admin') renderAdminList();
            });
        });

        document.addEventListener('keydown', escapeHandler);
        loadModalContent(defaultTab);
    }

    function closeModal() {
        const overlay = document.getElementById('jellyrequest-modal');
        if (overlay) overlay.remove();
        modalOpen = false;
        document.body.style.overflow = '';
        document.removeEventListener('keydown', escapeHandler);
        updateNotificationBadge();
    }

    function escapeHandler(e) { if (e.key === 'Escape') closeModal(); }

    async function loadModalContent(defaultTab) {
        try {
            const [cfg, quota] = await Promise.all([fetchConfig(), fetchQuota()]);
            renderQuota(quota);
            renderForm(cfg);
            if (defaultTab === 'admin') renderAdminList();
            if (defaultTab === 'list') renderRequestsList();
        } catch (err) {
            const formTab = document.getElementById('jellyrequest-tab-form');
            if (formTab) formTab.innerHTML = `<div class="jellyrequest-msg error">Failed to load: ${escapeHtml(err.message)}</div>`;
        }
    }

    // ── Quota ───────────────────────────────────────────────

    function renderQuota(quota) {
        const el = document.querySelector('.jellyrequest-quota');
        if (!el) return;
        el.textContent = quota.Unlimited ? 'Unlimited requests' : `${quota.CurrentCount}/${quota.MaxRequests} requests this month (${quota.Remaining} remaining)`;
    }

    // ── Form ────────────────────────────────────────────────

    function renderForm(cfg) {
        const container = document.getElementById('jellyrequest-tab-form');
        if (!container) return;
        container.innerHTML = '';
        if (!cfg.EnableRequests) { container.innerHTML = '<div class="jellyrequest-msg error">Requests are currently disabled.</div>'; return; }

        const form = document.createElement('div');
        form.className = 'jellyrequest-form';
        if (cfg.RequestWindowDescription) { const desc = document.createElement('div'); desc.className = 'jellyrequest-desc'; desc.textContent = cfg.RequestWindowDescription; form.appendChild(desc); }

        form.appendChild(makeField('input', 'jr-title', cfg.RequestTitleLabel || 'Title', cfg.RequestTitlePlaceholder || 'Movie or show name...', true));

        if (cfg.RequestTypeEnabled) {
            const group = document.createElement('div');
            const label = document.createElement('label'); label.setAttribute('for', 'jr-type');
            label.innerHTML = (cfg.RequestTypeLabel || 'Type') + (cfg.RequestTypeRequired ? '<span class="req">*</span>' : '');
            group.appendChild(label);
            const select = document.createElement('select'); select.id = 'jr-type';
            ['', 'Movie', 'TV Series', 'Anime', 'Documentary', 'Other'].forEach(opt => { const o = document.createElement('option'); o.value = opt; o.textContent = opt || '-- Select --'; select.appendChild(o); });
            group.appendChild(select); form.appendChild(group);
        }
        if (cfg.RequestImdbCodeEnabled) form.appendChild(makeField('input', 'jr-imdbcode', cfg.RequestImdbCodeLabel || 'IMDB Code', cfg.RequestImdbCodePlaceholder || 'tt1234567', cfg.RequestImdbCodeRequired));
        if (cfg.RequestImdbLinkEnabled) form.appendChild(makeField('input', 'jr-imdblink', cfg.RequestImdbLinkLabel || 'IMDB Link', cfg.RequestImdbLinkPlaceholder || 'https://www.imdb.com/title/tt...', cfg.RequestImdbLinkRequired));
        if (cfg.RequestYearEnabled) {
            const yearGroup = makeField('input', 'jr-year', cfg.RequestYearLabel || 'Year', cfg.RequestYearPlaceholder || '2024', cfg.RequestYearRequired);
            const yearInput = yearGroup.querySelector('input');
            yearInput.maxLength = 4;
            yearInput.inputMode = 'numeric';
            yearInput.pattern = '\\d{4}';
            yearInput.addEventListener('input', () => { yearInput.value = yearInput.value.replace(/\D/g, '').slice(0, 4); });
            form.appendChild(yearGroup);
        }
        if (cfg.RequestNotesEnabled) form.appendChild(makeField('textarea', 'jr-notes', cfg.RequestNotesLabel || 'Notes', cfg.RequestNotesPlaceholder || '', cfg.RequestNotesRequired));

        if (cfg.CustomRequestFields) {
            try { const cf = JSON.parse(cfg.CustomRequestFields); if (Array.isArray(cf)) cf.forEach((f, i) => form.appendChild(makeField(f.type === 'textarea' ? 'textarea' : 'input', `jr-custom-${i}`, f.label || `Custom ${i+1}`, f.placeholder || '', f.required || false))); } catch {}
        }

        const msgArea = document.createElement('div'); msgArea.id = 'jellyrequest-form-msg'; form.appendChild(msgArea);
        const submitBtn = document.createElement('button'); submitBtn.className = 'jellyrequest-submit';
        submitBtn.textContent = cfg.RequestSubmitButtonText || 'Submit Request';
        submitBtn.addEventListener('click', () => handleSubmit(cfg, submitBtn));
        form.appendChild(submitBtn);
        container.appendChild(form);
    }

    function makeField(type, id, labelText, placeholder, required) {
        const group = document.createElement('div');
        const label = document.createElement('label'); label.setAttribute('for', id);
        label.innerHTML = escapeHtml(labelText) + (required ? '<span class="req">*</span>' : '');
        group.appendChild(label);
        const input = document.createElement(type === 'textarea' ? 'textarea' : 'input');
        input.id = id; if (type !== 'textarea') input.type = 'text'; input.placeholder = placeholder;
        group.appendChild(input); return group;
    }

    function showFormMsg(text, type) {
        const el = document.getElementById('jellyrequest-form-msg');
        if (!el) return;
        el.innerHTML = `<div class="jellyrequest-msg ${type}">${escapeHtml(text)}</div>`;
        if (type === 'success') setTimeout(() => { if (el) el.innerHTML = ''; }, 3000);
    }

    async function handleSubmit(cfg, submitBtn) {
        const title = (document.getElementById('jr-title')?.value || '').trim();
        const type = document.getElementById('jr-type')?.value || '';
        const notes = (document.getElementById('jr-notes')?.value || '').trim();
        const imdbCode = (document.getElementById('jr-imdbcode')?.value || '').trim();
        const imdbLink = (document.getElementById('jr-imdblink')?.value || '').trim();
        const year = (document.getElementById('jr-year')?.value || '').trim();

        if (!title) { showFormMsg('Title is required.', 'error'); return; }
        if (cfg.RequestTypeEnabled && cfg.RequestTypeRequired && !type) { showFormMsg('Type is required.', 'error'); return; }
        if (cfg.RequestNotesEnabled && cfg.RequestNotesRequired && !notes) { showFormMsg('Notes are required.', 'error'); return; }
        if (cfg.RequestImdbCodeEnabled && cfg.RequestImdbCodeRequired && !imdbCode) { showFormMsg('IMDB Code is required.', 'error'); return; }
        if (cfg.RequestImdbLinkEnabled && cfg.RequestImdbLinkRequired && !imdbLink) { showFormMsg('IMDB Link is required.', 'error'); return; }
        if (cfg.RequestYearEnabled && cfg.RequestYearRequired && !year) { showFormMsg('Year is required.', 'error'); return; }
        if (imdbCode && !/^tt\d+$/.test(imdbCode)) { showFormMsg('IMDB Code must match format: tt1234567', 'error'); return; }
        if (year && !/^\d{4}$/.test(year)) { showFormMsg('Year must be 4 digits.', 'error'); return; }

        let customFields = null;
        if (cfg.CustomRequestFields) {
            try { const defs = JSON.parse(cfg.CustomRequestFields); if (Array.isArray(defs)) { customFields = {}; for (let i = 0; i < defs.length; i++) { const f = defs[i]; const v = (document.getElementById(`jr-custom-${i}`)?.value || '').trim(); if (f.required && !v) { showFormMsg(`${f.label || 'Custom field'} is required.`, 'error'); return; } if (v) customFields[f.label || `custom_${i}`] = v; } } } catch {}
        }

        const dto = { Title: title };
        if (type) dto.Type = type; if (notes) dto.Notes = notes;
        if (imdbCode) dto.ImdbCode = imdbCode; if (imdbLink) dto.ImdbLink = imdbLink;
        if (year) dto.Year = year;
        if (customFields && Object.keys(customFields).length > 0) dto.CustomFields = JSON.stringify(customFields);

        submitBtn.disabled = true;
        try {
            await createRequest(dto);
            showFormMsg('Request submitted!', 'success');
            ['jr-title', 'jr-type', 'jr-notes', 'jr-imdbcode', 'jr-imdblink', 'jr-year'].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
            try { renderQuota(await fetchQuota()); } catch {}
        } catch (err) { showFormMsg(err.message || 'Failed to submit request.', 'error'); }
        finally { submitBtn.disabled = false; }
    }

    // ── My Requests List ────────────────────────────────────

    async function renderRequestsList() {
        const container = document.getElementById('jellyrequest-tab-list');
        if (!container) return;
        container.innerHTML = '<div class="jellyrequest-empty">Loading...</div>';
        try {
            const requests = await fetchMyRequests();
            container.innerHTML = '';
            if (!requests || requests.length === 0) { container.innerHTML = '<div class="jellyrequest-empty">No requests yet</div>'; return; }
            const list = document.createElement('ul'); list.className = 'jellyrequest-list';
            requests.forEach(req => list.appendChild(buildRequestItem(req, false)));
            container.appendChild(list);
            if (requests.some(r => (r.Status === 'done' || r.Status === 'rejected') && !r.SeenByUser)) {
                markSeen().then(() => updateNotificationBadge()).catch(() => {});
            }
        } catch (err) { container.innerHTML = `<div class="jellyrequest-msg error">Failed to load requests: ${escapeHtml(err.message)}</div>`; }
    }

    // ── Admin: All Requests with multi-select filter ────────

    let activeFilters = new Set(['pending', 'processing', 'snoozed', 'done', 'rejected']);
    const ALL_STATUSES = ['pending', 'processing', 'snoozed', 'done', 'rejected'];

    async function renderAdminList() {
        const container = document.getElementById('jellyrequest-tab-admin');
        if (!container) return;
        container.innerHTML = '<div class="jellyrequest-empty">Loading...</div>';

        try {
            const requests = await fetchAllRequests();
            container.innerHTML = '';

            // Multi-select filter bar
            const filterBar = document.createElement('div');
            filterBar.className = 'jellyrequest-filter-bar';

            ALL_STATUSES.forEach(status => {
                const btn = document.createElement('button');
                const statusRequests = requests ? requests.filter(r => (r.Status || '').toLowerCase() === status) : [];
                btn.textContent = `${status.charAt(0).toUpperCase() + status.slice(1)} (${statusRequests.length})`;
                btn.dataset.filter = status;
                if (activeFilters.has(status)) btn.classList.add('active');

                // Left click: toggle this filter
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    if (activeFilters.has(status)) activeFilters.delete(status);
                    else activeFilters.add(status);
                    // Ensure at least one is active
                    if (activeFilters.size === 0) activeFilters.add(status);
                    renderAdminList();
                });

                // Right click: solo or show all
                btn.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    if (activeFilters.size === 1 && activeFilters.has(status)) {
                        // Already solo'd — show all
                        ALL_STATUSES.forEach(s => activeFilters.add(s));
                    } else {
                        // Solo this one
                        activeFilters.clear();
                        activeFilters.add(status);
                    }
                    renderAdminList();
                });

                filterBar.appendChild(btn);
            });
            container.appendChild(filterBar);

            // Render sections for each active filter
            let hasAny = false;
            ALL_STATUSES.forEach(status => {
                if (!activeFilters.has(status)) return;
                const statusRequests = requests ? requests.filter(r => (r.Status || '').toLowerCase() === status) : [];
                if (statusRequests.length === 0) return;
                hasAny = true;

                const header = document.createElement('div');
                header.className = 'jellyrequest-section-header';
                header.textContent = `${status.charAt(0).toUpperCase() + status.slice(1)} (${statusRequests.length})`;
                container.appendChild(header);

                const list = document.createElement('ul');
                list.className = 'jellyrequest-list';
                statusRequests.forEach(req => list.appendChild(buildRequestItem(req, true)));
                container.appendChild(list);
            });

            if (!hasAny) {
                container.insertAdjacentHTML('beforeend', '<div class="jellyrequest-empty">No requests</div>');
            }
        } catch (err) { container.innerHTML = `<div class="jellyrequest-msg error">Failed to load: ${escapeHtml(err.message)}</div>`; }
    }

    // ── Shared request item builder ─────────────────────────

    function buildRequestItem(req, adminMode) {
        const item = document.createElement('li');
        item.className = 'jellyrequest-list-item';
        item.dataset.id = req.Id;

        const statusClass = (req.Status || 'pending').toLowerCase();
        const date = new Date(req.CreatedAt).toLocaleDateString();
        const typeBadge = req.Type ? ` \u00b7 ${escapeHtml(req.Type)}` : '';
        const requester = adminMode ? ` \u00b7 by ${escapeHtml(req.Username || 'Unknown')}` : '';
        const yearSuffix = req.Year ? ` (${escapeHtml(req.Year)})` : '';

        let extraInfo = '';
        if (req.Status === 'snoozed' && req.SnoozedUntil) {
            const base = `Snoozed until ${formatLongDate(req.SnoozedUntil)}`;
            const reasonPart = req.SnoozeReason ? ` — ${escapeHtml(req.SnoozeReason)}` : '';
            extraInfo += `<div class="jellyrequest-snooze-info">${base}${reasonPart}</div>`;
        }
        if (req.Status === 'rejected' && req.RejectionReason) extraInfo += `<div class="jellyrequest-rejection">Reason: ${escapeHtml(req.RejectionReason)}</div>`;

        // Details block — shows the data the user submitted. Order: Link, IMDB Code, Notes, Custom fields.
        let details = '';
        const detailRows = [];
        if (req.ImdbLink) {
            const href = safeUrl(req.ImdbLink);
            const label = escapeHtml(req.ImdbLink);
            detailRows.push(href
                ? `<div class="jellyrequest-detail"><span class="jellyrequest-detail-label">Link:</span> <a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${label}</a></div>`
                : `<div class="jellyrequest-detail"><span class="jellyrequest-detail-label">Link:</span> ${label}</div>`);
        }
        if (req.ImdbCode) {
            detailRows.push(`<div class="jellyrequest-detail"><span class="jellyrequest-detail-label">IMDB Code:</span> ${escapeHtml(req.ImdbCode)}</div>`);
        }
        if (req.Notes) {
            detailRows.push(`<div class="jellyrequest-detail"><span class="jellyrequest-detail-label">Notes:</span> ${escapeHtml(req.Notes)}</div>`);
        }
        if (req.CustomFields) {
            try {
                const parsed = JSON.parse(req.CustomFields);
                if (parsed && typeof parsed === 'object') {
                    Object.entries(parsed).forEach(([k, v]) => {
                        if (v) detailRows.push(`<div class="jellyrequest-detail"><span class="jellyrequest-detail-label">${escapeHtml(k)}:</span> ${escapeHtml(String(v))}</div>`);
                    });
                }
            } catch {}
        }
        if (detailRows.length > 0) details = `<div class="jellyrequest-details">${detailRows.join('')}</div>`;

        item.innerHTML = `
            <div class="jellyrequest-list-header">
                <span class="jellyrequest-list-title">${escapeHtml(req.Title)}${yearSuffix}</span>
                <span class="jellyrequest-badge ${statusClass}">${escapeHtml(req.Status)}</span>
            </div>
            <div class="jellyrequest-list-meta">${date}${typeBadge}${requester}</div>
            ${details}
            ${extraInfo}
        `;

        const actions = document.createElement('div');
        actions.className = 'jellyrequest-list-actions';

        if (adminMode) {
            if (req.Status !== 'processing') {
                const b = document.createElement('button'); b.className = 'primary'; b.textContent = 'Processing';
                b.addEventListener('click', async () => { try { await changeStatus(req.Id, 'processing'); renderAdminList(); updateNotificationBadge(); } catch (e) { alert(e.message); } });
                actions.appendChild(b);
            }
            if (req.Status !== 'done') {
                const b = document.createElement('button'); b.className = 'success'; b.textContent = 'Done';
                b.addEventListener('click', async () => { const ml = await showPrompt('Media link (optional):', 'https://...'); try { await changeStatus(req.Id, 'done', ml || undefined); renderAdminList(); updateNotificationBadge(); } catch (e) { alert(e.message); } });
                actions.appendChild(b);
            }
            if (req.Status !== 'rejected') {
                const b = document.createElement('button'); b.className = 'danger'; b.textContent = 'Reject';
                b.addEventListener('click', async () => { const r = await showPrompt('Rejection reason (optional):', 'Not available'); try { await changeStatus(req.Id, 'rejected', undefined, r || undefined); renderAdminList(); updateNotificationBadge(); } catch (e) { alert(e.message); } });
                actions.appendChild(b);
            }
            if (req.Status === 'snoozed') {
                const b = document.createElement('button'); b.className = 'warning'; b.textContent = 'Unsnooze';
                b.addEventListener('click', async () => { try { await unsnoozeRequest(req.Id); renderAdminList(); } catch (e) { alert(e.message); } });
                actions.appendChild(b);
            } else if (req.Status === 'pending') {
                const b = document.createElement('button'); b.className = 'warning'; b.textContent = 'Snooze';
                b.addEventListener('click', async () => {
                    const result = await showDateReasonPrompt('Snooze until:');
                    if (!result || !result.date) return;
                    try { await snoozeRequest(req.Id, new Date(result.date).toISOString(), result.reason); renderAdminList(); updateNotificationBadge(); }
                    catch (e) { alert(e.message); }
                });
                actions.appendChild(b);
            }
            if (req.Status !== 'pending') {
                const b = document.createElement('button'); b.textContent = 'Reset to Pending';
                b.addEventListener('click', async () => { try { await changeStatus(req.Id, 'pending'); renderAdminList(); updateNotificationBadge(); } catch (e) { alert(e.message); } });
                actions.appendChild(b);
            }
            const delBtn = document.createElement('button'); delBtn.className = 'danger'; delBtn.textContent = 'Delete';
            delBtn.addEventListener('click', async () => { if (await showConfirm(`Delete "${req.Title}" by ${req.Username}?`)) { try { await adminDeleteRequest(req.Id); renderAdminList(); updateNotificationBadge(); } catch (e) { alert(e.message); } } });
            actions.appendChild(delBtn);
        } else {
            if (req.Status === 'pending') {
                const b = document.createElement('button'); b.textContent = 'Edit';
                b.addEventListener('click', () => startEdit(item, req));
                actions.appendChild(b);
            }
            const delBtn = document.createElement('button'); delBtn.className = 'danger'; delBtn.textContent = 'Delete';
            delBtn.addEventListener('click', async () => {
                if (!await showConfirm(`Delete "${req.Title}"?`)) return;
                try { await deleteRequest(req.Id); renderRequestsList(); updateNotificationBadge(); try { renderQuota(await fetchQuota()); } catch {} } catch (err) { alert('Failed to delete: ' + (err.message || 'Unknown error')); }
            });
            actions.appendChild(delBtn);
        }

        item.appendChild(actions);
        return item;
    }

    // ── Inline Edit ─────────────────────────────────────────

    function startEdit(listItem, req) {
        listItem.innerHTML = '';
        const form = document.createElement('div'); form.className = 'jellyrequest-edit-form';
        form.innerHTML = `<input type="text" id="jr-edit-title" value="${escapeHtml(req.Title)}" placeholder="Title"><textarea id="jr-edit-notes" placeholder="Notes">${escapeHtml(req.Notes || '')}</textarea><div class="jellyrequest-edit-actions"><button class="save-btn">Save</button><button class="cancel-btn">Cancel</button></div>`;
        form.querySelector('.cancel-btn').addEventListener('click', () => renderRequestsList());
        form.querySelector('.save-btn').addEventListener('click', async () => {
            const title = document.getElementById('jr-edit-title')?.value.trim();
            if (!title) { alert('Title is required'); return; }
            const saveBtn = form.querySelector('.save-btn'); saveBtn.disabled = true;
            try { await editRequest(req.Id, { Title: title, Notes: document.getElementById('jr-edit-notes')?.value.trim() || null, Type: req.Type || null, ImdbCode: req.ImdbCode || null, ImdbLink: req.ImdbLink || null, Year: req.Year || null }); await renderRequestsList(); } catch (err) { alert('Failed to save: ' + (err.message || 'Unknown error')); saveBtn.disabled = false; }
        });
        listItem.appendChild(form);
    }

    // ── Init ────────────────────────────────────────────────

    async function init() {
        injectStyles();
        isAdmin = await checkAdmin();
        injectHeaderButton();

        // Debug hook — call from DevTools to inspect the badge pipeline.
        // Example: await window.__jellyrequest.fetchNotifications()
        window.__jellyrequest = { fetchNotifications, updateNotificationBadge, get isAdmin() { return isAdmin; } };

        setInterval(() => {
            updateButtonVisibility();
            if (!document.querySelector('.jellyrequest-btn')) injectHeaderButton();
        }, 2000);
    }

    function waitForApiClient() {
        if (getApiClient()) { init(); return; }
        const start = Date.now();
        const interval = setInterval(() => {
            if (getApiClient() || Date.now() - start > INIT_TIMEOUT) { clearInterval(interval); init(); }
        }, 100);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', waitForApiClient);
    else waitForApiClient();
})();
