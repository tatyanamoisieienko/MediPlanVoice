using MediPlanVoice.Core.Entitaeten;
using Microsoft.EntityFrameworkCore;

namespace MediPlanVoice.Infrastructure.Datenzugriff;

public sealed class MediPlanDatenbankkontext(DbContextOptions<MediPlanDatenbankkontext> options) : DbContext(options)
{
    public DbSet<Raum> Raeume => Set<Raum>();

    public DbSet<Medizingeraet> Medizingeraete => Set<Medizingeraet>();

    public DbSet<Buchung> Buchungen => Set<Buchung>();

    public DbSet<BuchungMedizingeraet> BuchungMedizingeraete => Set<BuchungMedizingeraet>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Raum>()
            .Property(raum => raum.Name)
            .HasMaxLength(120)
            .IsRequired();

        modelBuilder.Entity<Raum>()
            .Property(raum => raum.Standort)
            .HasMaxLength(120)
            .IsRequired();

        modelBuilder.Entity<Raum>()
            .ToTable(tabelle => tabelle.HasCheckConstraint("CK_Raeume_Kapazitaet", "\"Kapazitaet\" >= 0"));

        modelBuilder.Entity<Raum>()
            .Property(raum => raum.Aktiv)
            .HasDefaultValue(true);

        modelBuilder.Entity<Raum>().HasData(
            new Raum { Id = 1, Name = "Behandlungsraum 1", Standort = "Hauptgebäude", Kapazitaet = 2, Aktiv = true },
            new Raum { Id = 2, Name = "Untersuchungsraum 1", Standort = "Hauptgebäude", Kapazitaet = 3, Aktiv = true },
            new Raum { Id = 3, Name = "Notfallraum 1", Standort = "Nebengebäude", Kapazitaet = 2, Aktiv = true },
            new Raum { Id = 4, Name = "Behandlungsraum 2", Standort = "Hauptgebäude", Kapazitaet = 2, Aktiv = true },
            new Raum { Id = 5, Name = "Behandlungsraum 3", Standort = "Nebengebäude", Kapazitaet = 2, Aktiv = true },
            new Raum { Id = 6, Name = "Untersuchungsraum 2", Standort = "Hauptgebäude", Kapazitaet = 3, Aktiv = true },
            new Raum { Id = 7, Name = "Untersuchungsraum 3", Standort = "Nebengebäude", Kapazitaet = 3, Aktiv = true },
            new Raum { Id = 8, Name = "Ultraschallraum", Standort = "Hauptgebäude", Kapazitaet = 2, Aktiv = true },
            new Raum { Id = 9, Name = "EKG-Raum", Standort = "Hauptgebäude", Kapazitaet = 2, Aktiv = true },
            new Raum { Id = 10, Name = "Notfallraum 2", Standort = "Nebengebäude", Kapazitaet = 2, Aktiv = true },
            new Raum { Id = 11, Name = "Verbandsraum", Standort = "Nebengebäude", Kapazitaet = 2, Aktiv = true },
            new Raum { Id = 12, Name = "Injektionsraum", Standort = "Hauptgebäude", Kapazitaet = 2, Aktiv = true },
            new Raum { Id = 13, Name = "Infusionsraum", Standort = "Nebengebäude", Kapazitaet = 4, Aktiv = true },
            new Raum { Id = 14, Name = "Laborraum", Standort = "Hauptgebäude", Kapazitaet = 3, Aktiv = true },
            new Raum { Id = 15, Name = "Blutentnahmeraum 1", Standort = "Hauptgebäude", Kapazitaet = 2, Aktiv = true },
            new Raum { Id = 16, Name = "Blutentnahmeraum 2", Standort = "Nebengebäude", Kapazitaet = 2, Aktiv = true },
            new Raum { Id = 17, Name = "Diagnostikraum 1", Standort = "Hauptgebäude", Kapazitaet = 3, Aktiv = true },
            new Raum { Id = 18, Name = "Diagnostikraum 2", Standort = "Nebengebäude", Kapazitaet = 3, Aktiv = true },
            new Raum { Id = 19, Name = "Vorbereitungsraum", Standort = "Hauptgebäude", Kapazitaet = 2, Aktiv = true },
            new Raum { Id = 20, Name = "Nachsorgeraum", Standort = "Nebengebäude", Kapazitaet = 3, Aktiv = true },
            new Raum { Id = 21, Name = "Isolationsraum", Standort = "Nebengebäude", Kapazitaet = 1, Aktiv = true },
            new Raum { Id = 22, Name = "Aufwachraum", Standort = "Hauptgebäude", Kapazitaet = 4, Aktiv = true },
            new Raum { Id = 23, Name = "Funktionsraum", Standort = "Hauptgebäude", Kapazitaet = 3, Aktiv = true },
            new Raum { Id = 24, Name = "Besprechungsraum", Standort = "Nebengebäude", Kapazitaet = 6, Aktiv = true },
            new Raum { Id = 25, Name = "Mehrzweckraum", Standort = "Nebengebäude", Kapazitaet = 6, Aktiv = true });

        modelBuilder.Entity<Medizingeraet>()
            .Property(geraet => geraet.Name)
            .HasMaxLength(120)
            .IsRequired();

        modelBuilder.Entity<Medizingeraet>()
            .Property(geraet => geraet.Geraetetyp)
            .HasMaxLength(120)
            .IsRequired();

        modelBuilder.Entity<Medizingeraet>()
            .Property(geraet => geraet.Standort)
            .HasMaxLength(120)
            .IsRequired();

        modelBuilder.Entity<Medizingeraet>()
            .Property(geraet => geraet.Aktiv)
            .HasDefaultValue(true);

        modelBuilder.Entity<Medizingeraet>().HasData(
            new Medizingeraet { Id = 1, Name = "Ultraschallgerät", Geraetetyp = "Bildgebung", Standort = "Hauptgebäude", Aktiv = true },
            new Medizingeraet { Id = 2, Name = "EKG", Geraetetyp = "Diagnostik", Standort = "Hauptgebäude", Aktiv = true },
            new Medizingeraet { Id = 3, Name = "Patientenmonitor", Geraetetyp = "Überwachung", Standort = "Nebengebäude", Aktiv = true },
            new Medizingeraet { Id = 4, Name = "Defibrillator", Geraetetyp = "Notfallmedizin", Standort = "Nebengebäude", Aktiv = true },
            new Medizingeraet { Id = 5, Name = "Infusionspumpe", Geraetetyp = "Infusion", Standort = "Hauptgebäude", Aktiv = true },
            new Medizingeraet { Id = 6, Name = "Spritzenpumpe", Geraetetyp = "Infusion", Standort = "Nebengebäude", Aktiv = true },
            new Medizingeraet { Id = 7, Name = "Pulsoximeter", Geraetetyp = "Überwachung", Standort = "Hauptgebäude", Aktiv = true },
            new Medizingeraet { Id = 8, Name = "Blutdruckmonitor", Geraetetyp = "Überwachung", Standort = "Hauptgebäude", Aktiv = true },
            new Medizingeraet { Id = 9, Name = "Beatmungsgerät", Geraetetyp = "Beatmung", Standort = "Nebengebäude", Aktiv = true },
            new Medizingeraet { Id = 10, Name = "Absauggerät", Geraetetyp = "Notfallmedizin", Standort = "Hauptgebäude", Aktiv = true },
            new Medizingeraet { Id = 11, Name = "Blutzuckermessgerät", Geraetetyp = "Messgerät", Standort = "Nebengebäude", Aktiv = true },
            new Medizingeraet { Id = 12, Name = "Spirometer", Geraetetyp = "Diagnostik", Standort = "Hauptgebäude", Aktiv = true },
            new Medizingeraet { Id = 13, Name = "Mobiles Röntgengerät", Geraetetyp = "Bildgebung", Standort = "Nebengebäude", Aktiv = true },
            new Medizingeraet { Id = 14, Name = "Dopplergerät", Geraetetyp = "Diagnostik", Standort = "Nebengebäude", Aktiv = true },
            new Medizingeraet { Id = 15, Name = "EEG-Gerät", Geraetetyp = "Diagnostik", Standort = "Hauptgebäude", Aktiv = true });

        modelBuilder.Entity<Buchung>()
            .Property(buchung => buchung.Titel)
            .HasMaxLength(200)
            .IsRequired();

        modelBuilder.Entity<Buchung>()
            .ToTable(tabelle => tabelle.HasCheckConstraint("CK_Buchungen_BeginnVorEnde", "\"Beginn\" < \"Ende\""));

        modelBuilder.Entity<Buchung>()
            .HasOne(buchung => buchung.Raum)
            .WithMany()
            .HasForeignKey(buchung => buchung.RaumId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<BuchungMedizingeraet>()
            .HasKey(zuordnung => new { zuordnung.BuchungId, zuordnung.MedizingeraetId });

        modelBuilder.Entity<BuchungMedizingeraet>()
            .HasOne(zuordnung => zuordnung.Buchung)
            .WithMany(buchung => buchung.Medizingeraete)
            .HasForeignKey(zuordnung => zuordnung.BuchungId);

        modelBuilder.Entity<BuchungMedizingeraet>()
            .HasOne(zuordnung => zuordnung.Medizingeraet)
            .WithMany()
            .HasForeignKey(zuordnung => zuordnung.MedizingeraetId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}