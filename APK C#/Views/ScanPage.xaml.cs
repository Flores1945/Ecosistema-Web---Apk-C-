using MiAppAsistencia.Models;
using MiAppAsistencia.Services;

namespace MiAppAsistencia.Views;

public partial class ScanPage : ContentPage
{
    private readonly DataService _dataService = new();

    // Bloqueo temporal: evita registrar dos veces el mismo QR seguidas
    private bool _isProcessing;

    public ScanPage()
    {
        InitializeComponent();
    }

    private void OnBarcodeDetected(object? sender, ZXing.Net.Maui.BarcodeDetectionEventArgs e)
    {
        var codigo = e.Results?.FirstOrDefault()?.Value?.Trim();
        if (string.IsNullOrWhiteSpace(codigo) || _isProcessing)
            return;

        _isProcessing = true;
        _ = MainThread.InvokeOnMainThreadAsync(async () =>
        {
            try
            {
                await ProcesarCodigoAsync(codigo);
            }
            finally
            {
                _isProcessing = false;
            }
        });
    }

    private async Task ProcesarCodigoAsync(string codigoQR)
    {
        EstadoLabel.Text = $"Procesando {codigoQR}...";

        try
        {
            var estudiante = await _dataService.ObtenerEstudiantePorCodigoQR(codigoQR);

            if (estudiante is null)
            {
                EstadoLabel.Text = "Apunta al código QR del estudiante";
                await DisplayAlertAsync("No encontrado",
                    $"Ningún estudiante coincide con el código {codigoQR}.", "OK");
                return;
            }

            if (await _dataService.YaRegistradoHoyAsync(estudiante.Id))
            {
                EstadoLabel.Text = "Apunta al código QR del estudiante";
                await DisplayAlertAsync("Ya registrado",
                    $"{estudiante.Nombre} {estudiante.Apellido} tiene asistencia de hoy.", "OK");
                return;
            }

            var guardado = await _dataService.RegistrarAsistencia(new Asistencia
            {
                EstudianteId = estudiante.Id,
                Fecha = DateTime.Now,
                Estado = "Presente",
                MetodoRegistro = "QR",
                Observaciones = "Registrado por escaneo QR"
            });

            EstadoLabel.Text = "Apunta al código QR del estudiante";

            if (!guardado)
            {
                await DisplayAlertAsync("Ya registrado",
                    $"{estudiante.Nombre} {estudiante.Apellido} tiene asistencia de hoy.", "OK");
                return;
            }

            EstadoLabel.Text = $"Asistencia registrada: {estudiante.Nombre} {estudiante.Apellido}";
            await Task.Delay(1200);
            EstadoLabel.Text = "Apunta al código QR del estudiante";

            await DisplayAlertAsync("Asistencia registrada",
                $"Se registró la asistencia de {estudiante.Nombre} {estudiante.Apellido}.", "OK");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Error en ScanPage: {ex.Message}");
            EstadoLabel.Text = "Apunta al código QR del estudiante";
            await DisplayAlertAsync("Error",
                "No se pudo registrar la asistencia. Revisa tu conexión.", "OK");
        }
    }

    private async void OnManualClicked(object? sender, EventArgs e)
    {
        var paginaManual = new CameraBarcodeReaderPage();
        paginaManual.OnDetected += async (codigo) =>
        {
            await MainThread.InvokeOnMainThreadAsync(async () =>
            {
                await Navigation.PopAsync();
                await ProcesarCodigoAsync(codigo);
            });
        };
        await Navigation.PushAsync(paginaManual);
    }
}
