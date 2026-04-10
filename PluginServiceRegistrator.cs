using JellyRequest.Data;
using MediaBrowser.Controller;
using MediaBrowser.Controller.Plugins;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;

namespace JellyRequest;

public class PluginServiceRegistrator : IPluginServiceRegistrator
{
    public void RegisterServices(IServiceCollection services, IServerApplicationHost appHost)
    {
        services.AddSingleton<RequestsRepository>();
        services.AddSingleton<BanRepository>();
        services.AddSingleton<IStartupFilter, ScriptInjectionStartupFilter>();
        services.AddHostedService<ScriptInjector>();
    }
}
