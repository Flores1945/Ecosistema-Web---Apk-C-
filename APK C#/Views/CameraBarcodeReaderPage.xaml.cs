namespace MiAppAsistencia.Views;

public partial class CameraBarcodeReaderPage : ContentPage
{
    public event Action<string>? OnDetected;

    public CameraBarcodeReaderPage()
    {
        InitializeComponent();
    }

    protected override void OnAppearing()
    {
        base.OnAppearing();
        CodigoQREntry.Focus();
    }

    private async void OnValidarClicked(object? sender, EventArgs e)
    {
        var codigoQR = CodigoQREntry.Text?.Trim();

        if (string.IsNullOrWhiteSpace(codigoQR))
        {
            await this.DisplayAlertAsync("Código requerido", "Escribe el DNI de la credencial del estudiante.", "OK");
            return;
        }

        OnDetected?.Invoke(codigoQR);
    }
}
