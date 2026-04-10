using System;
using System.Collections.Generic;
using JellyRequest.Configuration;
using MediaBrowser.Common.Configuration;
using MediaBrowser.Common.Plugins;
using MediaBrowser.Model.Plugins;
using MediaBrowser.Model.Serialization;

namespace JellyRequest;

public class Plugin : BasePlugin<PluginConfiguration>, IHasWebPages
{
    public static Plugin? Instance { get; private set; }

    // Per-startup cache-bust token. Regenerated each time the plugin assembly
    // is loaded (i.e. each Jellyfin restart). Both ScriptInjector and
    // ScriptInjectionMiddleware append this to the jellyrequest.js URL so
    // browsers are forced to re-fetch the script after every DLL deploy.
    public static readonly string CacheBustToken = Guid.NewGuid().ToString("N").Substring(0, 8);

    public Plugin(IApplicationPaths applicationPaths, IXmlSerializer xmlSerializer)
        : base(applicationPaths, xmlSerializer)
    {
        Instance = this;
    }

    public override string Name => "JellyRequest";

    public override Guid Id => Guid.Parse("b7d92e15-3f4a-48c1-a6e5-9d0b8c7f1e23");

    public IEnumerable<PluginPageInfo> GetPages()
    {
        return new[]
        {
            new PluginPageInfo
            {
                Name = Name,
                EmbeddedResourcePath = GetType().Namespace + ".Configuration.configPage.html"
            }
        };
    }
}
