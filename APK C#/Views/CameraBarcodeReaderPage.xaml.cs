namespace MiAppAsistencia.Views
{
    public partial class CameraBarcodeReaderPage : ContentPage
    {
        public event Action<string>? OnDetected;

        public CameraBarcodeReaderPage()
        {
            InitializeComponent();
        }

        private async void OnValidarClicked(object? sender, EventArgs e)
        {
            var codigoQR = CodigoQREntry.Text?.Trim();

            if (!string.IsNullOrWhiteSpace(codigoQR))
            {
                OnDetected?.Invoke(codigoQR);
            }
            else
            {
                await DisplayAlert("Error", "Por favor, ingrese un código QR válido.", "OK");
            }
        }
    }
}
