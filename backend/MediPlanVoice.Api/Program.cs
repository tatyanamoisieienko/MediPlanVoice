using MediPlanVoice.Infrastructure.Datenzugriff;
using MediPlanVoice.Api.Services;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<MediPlanDatenbankkontext>(options =>
	options.UseSqlite(builder.Configuration.GetConnectionString("MediPlan") ?? "Data Source=mediplanvoice.db"));
builder.Services.AddControllers();
builder.Services.AddScoped<RaumService>();
builder.Services.AddScoped<MedizingeraetService>();
builder.Services.AddScoped<BuchungsService>();
builder.Services.AddScoped<VerfuegbarkeitsService>();
builder.Services.AddScoped<AlternativenService>();
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<IBuchungsInterpretationsService, BuchungsInterpretationsService>();
builder.Services.Configure<SpracherkennungsOptionen>(builder.Configuration.GetSection(SpracherkennungsOptionen.Abschnitt));
builder.Services.AddHttpClient<ISpracherkennungsService, SpracherkennungsService>();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
	app.UseSwagger();
	app.UseSwaggerUI();
}

app.MapControllers();

app.Run();

public partial class Program;
