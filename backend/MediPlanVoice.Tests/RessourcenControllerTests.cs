using System.Net;
using System.Net.Http.Json;
using MediPlanVoice.Api.Vertraege;
using MediPlanVoice.Infrastructure.Datenzugriff;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace MediPlanVoice.Tests;

public sealed class RessourcenControllerTests
{
    [Fact]
    public async Task Raeume_CRUD_und_Startdaten_Funktionieren()
    {
        using var fabrik = new MediPlanWebApplicationFactory();
        using var client = fabrik.CreateClient();
        await MigriereAsync(fabrik);

        var startraeume = await client.GetFromJsonAsync<List<RaumZurueckgebenVertrag>>("/api/raeume");
        Assert.NotNull(startraeume);
        Assert.Equal(25, startraeume.Count);
        Assert.All(startraeume, raum => Assert.True(raum.Aktiv));

        var anlegen = await client.PostAsJsonAsync("/api/raeume", new RaumAnlegenVertrag { Name = "Raum Alpha", Standort = "Hauptgebaeude", Kapazitaet = 2 });
        Assert.Equal(HttpStatusCode.Created, anlegen.StatusCode);
        var angelegterRaum = await anlegen.Content.ReadFromJsonAsync<RaumZurueckgebenVertrag>();
        Assert.NotNull(angelegterRaum);

        var einzelnerRaum = await client.GetFromJsonAsync<RaumZurueckgebenVertrag>($"/api/raeume/{angelegterRaum.Id}");
        Assert.Equal("Raum Alpha", einzelnerRaum?.Name);

        var aendern = await client.PutAsJsonAsync($"/api/raeume/{angelegterRaum.Id}", new RaumAendernVertrag { Name = "Raum Beta", Standort = "Hauptgebaeude", Kapazitaet = 4 });
        Assert.Equal(HttpStatusCode.OK, aendern.StatusCode);
        var geaenderterRaum = await aendern.Content.ReadFromJsonAsync<RaumZurueckgebenVertrag>();
        Assert.Equal("Raum Beta", geaenderterRaum?.Name);
        Assert.Equal(4, geaenderterRaum?.Kapazitaet);

        var loeschen = await client.DeleteAsync($"/api/raeume/{angelegterRaum.Id}");
        Assert.Equal(HttpStatusCode.NoContent, loeschen.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/raeume/{angelegterRaum.Id}")).StatusCode);
    }

    [Fact]
    public async Task Medizingeraete_CRUD_und_Startdaten_Funktionieren()
    {
        using var fabrik = new MediPlanWebApplicationFactory();
        using var client = fabrik.CreateClient();
        await MigriereAsync(fabrik);

        var startgeraete = await client.GetFromJsonAsync<List<MedizingeraetZurueckgebenVertrag>>("/api/medizingeraete");
        Assert.NotNull(startgeraete);
        Assert.Equal(15, startgeraete.Count);
        Assert.All(startgeraete, geraet => Assert.True(geraet.Aktiv));

        var anlegen = await client.PostAsJsonAsync("/api/medizingeraete", new MedizingeraetAnlegenVertrag
        {
            Name = "Infusionspumpe",
            Geraetetyp = "Infusion",
            Standort = "Hauptgebaeude"
        });
        Assert.Equal(HttpStatusCode.Created, anlegen.StatusCode);
        var angelegtesGeraet = await anlegen.Content.ReadFromJsonAsync<MedizingeraetZurueckgebenVertrag>();
        Assert.NotNull(angelegtesGeraet);

        var einzelnesGeraet = await client.GetFromJsonAsync<MedizingeraetZurueckgebenVertrag>($"/api/medizingeraete/{angelegtesGeraet.Id}");
        Assert.Equal("Infusionspumpe", einzelnesGeraet?.Name);

        var aendern = await client.PutAsJsonAsync($"/api/medizingeraete/{angelegtesGeraet.Id}", new MedizingeraetAendernVertrag
        {
            Name = "Infusionspumpe 2",
            Geraetetyp = "Infusion",
            Standort = "Hauptgebaeude"
        });
        Assert.Equal(HttpStatusCode.OK, aendern.StatusCode);
        var geaendertesGeraet = await aendern.Content.ReadFromJsonAsync<MedizingeraetZurueckgebenVertrag>();
        Assert.Equal("Infusionspumpe 2", geaendertesGeraet?.Name);

        var loeschen = await client.DeleteAsync($"/api/medizingeraete/{angelegtesGeraet.Id}");
        Assert.Equal(HttpStatusCode.NoContent, loeschen.StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync($"/api/medizingeraete/{angelegtesGeraet.Id}")).StatusCode);
    }

    [Fact]
    public async Task UngueltigePflichtfelder_und_NegativeKapazitaet_WerdenAbgelehnt()
    {
        using var fabrik = new MediPlanWebApplicationFactory();
        using var client = fabrik.CreateClient();
        await MigriereAsync(fabrik);

        var leererRaumname = await client.PostAsJsonAsync("/api/raeume", new RaumAnlegenVertrag { Name = " ", Standort = "Hauptgebaeude", Kapazitaet = 1 });
        var negativeKapazitaet = await client.PostAsJsonAsync("/api/raeume", new RaumAnlegenVertrag { Name = "Raum Gamma", Standort = "Hauptgebaeude", Kapazitaet = -1 });
        var leererGeraetename = await client.PostAsJsonAsync("/api/medizingeraete", new MedizingeraetAnlegenVertrag
        {
            Name = " ",
            Geraetetyp = "Diagnostik",
            Standort = "Hauptgebaeude"
        });

        Assert.Equal(HttpStatusCode.BadRequest, leererRaumname.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, negativeKapazitaet.StatusCode);
        Assert.Equal(HttpStatusCode.BadRequest, leererGeraetename.StatusCode);
    }

    private static async Task MigriereAsync(MediPlanWebApplicationFactory fabrik)
    {
        await using var bereich = fabrik.Services.CreateAsyncScope();
        var datenbank = bereich.ServiceProvider.GetRequiredService<MediPlanDatenbankkontext>();
        await datenbank.Database.MigrateAsync();
    }
}