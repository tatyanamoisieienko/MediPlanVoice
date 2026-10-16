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
            new Raum { Id = 1, Name = "Behandlungsraum 1", Standort = "Hauptgebaeude", Kapazitaet = 2, Aktiv = true },
            new Raum { Id = 2, Name = "Untersuchungsraum", Standort = "Hauptgebaeude", Kapazitaet = 3, Aktiv = true },
            new Raum { Id = 3, Name = "Notfallraum", Standort = "Nebengebaeude", Kapazitaet = 1, Aktiv = true });

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
            new Medizingeraet { Id = 1, Name = "Ultraschallgeraet", Geraetetyp = "Bildgebung", Standort = "Hauptgebaeude", Aktiv = true },
            new Medizingeraet { Id = 2, Name = "EKG", Geraetetyp = "Diagnostik", Standort = "Hauptgebaeude", Aktiv = true },
            new Medizingeraet { Id = 3, Name = "Patientenmonitor", Geraetetyp = "Ueberwachung", Standort = "Nebengebaeude", Aktiv = true });

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